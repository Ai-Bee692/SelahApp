// pages/api/stems.js
// Proxies choir stem requests to the SelahAI Python FastAPI backend.
// The Python backend synthesizes all 4 voice parts (soprano/alto/tenor/lead)
// using pure-CPU additive synthesis — no cloud GPU required.

import fs from "fs";
import path from "path";
import crypto from "crypto";

const PYTHON_BACKEND_URL = process.env.SELAH_BACKEND_URL || "http://localhost:8000";
const STEM_POLL_INTERVAL_MS = 3000;
const STEM_POLL_TIMEOUT_MS  = 180000; // 3 minutes max

export const config = {
  api: {
    responseLimit: false,
    bodyParser: { sizeLimit: "4mb" },
  },
};

/**
 * Polls the Python backend task status endpoint until the stems are ready
 * or the timeout is exceeded.
 * @param {string} taskId
 * @returns {Promise<{stems: Record<string, string>}>}
 */
async function pollStemTaskUntilReady(taskId) {
  const statusUrl = `${PYTHON_BACKEND_URL}/api/v1/stems/${taskId}`;
  const deadline = Date.now() + STEM_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, STEM_POLL_INTERVAL_MS));

    const statusResponse = await fetch(statusUrl);
    if (!statusResponse.ok) {
      throw new Error(`Backend status check failed: HTTP ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();

    if (statusData.status === "ready") {
      return statusData.stems;
    }

    if (statusData.status === "error") {
      throw new Error(`Backend synthesis error: ${statusData.error || "unknown"}`);
    }

    // status === "processing" — keep polling
    console.log(`[Stems] Task ${taskId} still processing...`);
  }

  throw new Error(`Stem synthesis timed out after ${STEM_POLL_TIMEOUT_MS / 1000}s`);
}

/**
 * Helper to call fetch with a timeout
 */
async function fetchWithTimeout(url, options, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Helper to call Hugging Face Inference API for Bark
 * @param {string} prompt 
 * @param {string} speakerId 
 * @param {string} apiKey 
 * @returns {Promise<Buffer>}
 */
async function synthesizeVoiceWithHF(prompt, speakerId, apiKey) {
  const url = "https://api-inference.huggingface.co/models/suno/bark";
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        speaker_id: speakerId,
        history_prompt: speakerId,
      }
    }),
  }, 25000); // 25s timeout for voice synthesis

  if (!res.ok) {
    const errText = await res.text().catch(() => "(no body)");
    throw new Error(`HF Bark synthesis failed: HTTP ${res.status} — ${errText}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await res.json();
    if (json.error) {
      throw new Error(`HF Model error: ${json.error}`);
    }
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength < 1000) {
    throw new Error("Returned audio data is too small or invalid");
  }

  return Buffer.from(arrayBuffer);
}


export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { lyrics, genre, musicKey, chords, title } = req.body;

  // ─── Resolve chord list ────────────────────────────────────────────────────
  // Use chords from the request body if present, otherwise build from key
  const resolvedChords = Array.isArray(chords) && chords.length > 0
    ? chords
    : buildGospelChords(musicKey || "G");

  const songTitle = title || "Selah Song";

  console.log(
    `[Stems] Requesting choir synthesis — key: ${musicKey}, genre: ${genre}, chords: ${resolvedChords.join(", ")}`
  );

  const flatLyrics = Array.isArray(lyrics) ? lyrics : [];
  const lines = flatLyrics
    .map(l => l.line)
    .filter(line => line && typeof line === "string" && !line.startsWith("("));
  const joinedLyrics = lines.join(", ").trim() || "Hallelujah, praise the Lord";

  const apiKey = process.env.HUGGINGFACE_API_KEY;
  let stems = null;
  let taskId = null;
  let source = null;

  if (apiKey && apiKey.startsWith("hf_")) {
    console.log(`[Stems] Found Hugging Face API key. Attempting cloud Bark synthesis for: "${joinedLyrics}"`);
    try {
      const stemsDir = path.join(process.cwd(), "public", "stems");
      if (!fs.existsSync(stemsDir)) {
        fs.mkdirSync(stemsDir, { recursive: true });
      }

      taskId = crypto.randomUUID();
      const voices = {
        soprano: {
          prompt: `[music] [singing] [female] ♪ ${joinedLyrics} ♪`,
          speaker_id: "v2/en_speaker_9"
        },
        alto: {
          prompt: `[music] [singing] [female] ♪ ${joinedLyrics} ♪`,
          speaker_id: "v2/en_speaker_5"
        },
        tenor: {
          prompt: `[music] [singing] [male] ♪ ${joinedLyrics} ♪`,
          speaker_id: "v2/en_speaker_6"
        },
        lead: {
          prompt: `[music] [singing] ♪ ${joinedLyrics} ♪`,
          speaker_id: "v2/en_speaker_8"
        }
      };

      const voicePromises = Object.entries(voices).map(async ([voice, cfg]) => {
        console.log(`[Stems] Synthesizing ${voice} voice via HF Bark...`);
        const buffer = await synthesizeVoiceWithHF(cfg.prompt, cfg.speaker_id, apiKey);
        const fileName = `${taskId}_${voice}.wav`;
        fs.writeFileSync(path.join(stemsDir, fileName), buffer);
        return [voice, `/stems/${fileName}`];
      });

      const results = await Promise.all(voicePromises);
      const stemsResult = Object.fromEntries(results);

      stems = stemsResult;
      source = "huggingface";
      console.log(`[Stems] Successfully synthesized all 4 stems via Hugging Face Bark!`);
    } catch (hfErr) {
      console.warn(`[Stems] Hugging Face Bark synthesis failed: ${hfErr.message}. Falling back to Python backend...`);
    }
  }

  // Fallback to python backend if Hugging Face synthesis didn't run or failed
  if (!stems) {
    try {
      // ── Step 1: Submit the synthesis job to the Python backend ────────────────
      const submitResponse = await fetch(`${PYTHON_BACKEND_URL}/api/v1/stems`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:  songTitle,
          key:    musicKey || "G",
          genre:  genre    || "Contemporary",
          chords: resolvedChords,
          lyrics: flatLyrics,
        }),
      });

      if (!submitResponse.ok) {
        const errorBody = await submitResponse.text().catch(() => "(no body)");
        throw new Error(`Backend submit failed: HTTP ${submitResponse.status} — ${errorBody}`);
      }

      const submitData = await submitResponse.json();
      taskId = submitData.task_id;

      if (!taskId) {
        throw new Error("Backend did not return a task_id");
      }

      console.log(`[Stems] Job accepted by Python backend — task_id: ${taskId}`);

      // ── Step 2: Poll until ready ──────────────────────────────────────────────
      const stemRelativeUrls = await pollStemTaskUntilReady(taskId);

      // ── Step 3: Convert relative backend URLs to absolute ─────────────────────
      stems = {};
      for (const [voice, relativeUrl] of Object.entries(stemRelativeUrls)) {
        stems[voice] = `${PYTHON_BACKEND_URL}${relativeUrl}`;
      }
      source = "python_backend";

      console.log(`[Stems] All 4 stems ready from Python backend — task_id: ${taskId}`);

    } catch (err) {
      console.error("[Stems] Backend error:", err.message);

      // ── Fallback: signal the frontend to use its built-in Web Audio synth ─────
      return res.status(503).json({
        error:    "backend_unavailable",
        message:  `Python backend unreachable — ${err.message}. Using local Web Audio synthesis.`,
        fallback: "web_audio",
      });
    }
  }

  return res.status(200).json({ stems, task_id: taskId, source });
}

// Builds a gospel I-IV-V-vi chord progression for a given root key
function buildGospelChords(root) {
  const NOTES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const idx = NOTES.indexOf(root);
  if (idx === -1) return [root, "F", "G", "Am"];
  return [
    NOTES[idx],
    NOTES[(idx + 5) % 12],
    NOTES[(idx + 7) % 12],
    NOTES[(idx + 9) % 12] + "m",
  ];
}

