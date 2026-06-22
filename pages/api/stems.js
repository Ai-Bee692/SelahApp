// pages/api/stems.js
// Proxies AI song generation requests to the SelahAI Python FastAPI backend.
// The Python backend submits lyrics to apiframe.ai (Suno) and polls until complete.
// Returns a full-mix audio URL + both Suno-generated track variants.

const PYTHON_BACKEND_URL = process.env.SELAH_BACKEND_URL || "http://localhost:8000";

// Max time to wait for song generation before giving up (5 minutes)
const GENERATION_POLL_TIMEOUT_MS = 5 * 60 * 1000;
const GENERATION_POLL_INTERVAL_MS = 4000;

export const config = {
  api: {
    responseLimit: false,
    bodyParser: { sizeLimit: "4mb" },
  },
};

/**
 * Polls the Python backend task status until the song is ready or timeout is exceeded.
 * @param {string} taskId
 * @returns {Promise<{audio_url: string, audio_title: string|null, tracks: Array}>}
 */
async function pollTaskUntilComplete(taskId) {
  const statusUrl = `${PYTHON_BACKEND_URL}/api/v1/stems/${taskId}`;
  const deadline = Date.now() + GENERATION_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, GENERATION_POLL_INTERVAL_MS));

    const statusResponse = await fetch(statusUrl);
    if (!statusResponse.ok) {
      throw new Error(`Backend status check failed: HTTP ${statusResponse.status}`);
    }

    const statusData = await statusResponse.json();

    if (statusData.status === "complete") {
      return {
        audio_url:   statusData.audio_url,
        audio_title: statusData.audio_title,
        tracks:      statusData.tracks || [],
      };
    }

    if (statusData.status === "failed") {
      throw new Error(statusData.error || "Song generation failed in backend");
    }

    // status === "queued" | "rendering" — keep polling
    console.log(`[Stems] Task ${taskId} status: ${statusData.status}...`);
  }

  throw new Error(`Song generation timed out after ${GENERATION_POLL_TIMEOUT_MS / 1000}s`);
}

/**
 * Helper to call fetch with a timeout.
 */
async function fetchWithTimeout(url, options, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Builds a gospel I–IV–V–vi chord progression for a given root key
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { lyrics, genre, musicKey, chords, title, section_structure, vocal_gender, emotional_mode, instrumentation } = req.body;

  const resolvedChords = Array.isArray(chords) && chords.length > 0
    ? chords
    : buildGospelChords(musicKey || "G");

  const songTitle = title || "Selah Song";

  console.log(
    `[Stems] Requesting AI song generation — key: ${musicKey}, genre: ${genre}, chords: ${resolvedChords.join(", ")}`
  );

  const flatLyrics = Array.isArray(lyrics) ? lyrics : [];

  try {
    // Submit the generation job to the Python backend
    const submitResponse = await fetchWithTimeout(
      `${PYTHON_BACKEND_URL}/api/v1/stems`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:             songTitle,
          key:               musicKey || "G",
          genre:             genre || "Contemporary",
          chords:            resolvedChords,
          lyrics:            flatLyrics,
          section_structure: section_structure || null,
          vocal_gender:      vocal_gender || null,
          emotional_mode:    emotional_mode || null,
          instrumentation:   instrumentation || null,
        }),
      },
      20000  // 20s timeout for the initial submit call
    );

    if (!submitResponse.ok) {
      const errorBody = await submitResponse.text().catch(() => "(no body)");
      throw new Error(`Backend submit failed: HTTP ${submitResponse.status} — ${errorBody}`);
    }

    const submitData = await submitResponse.json();
    const taskId = submitData.task_id;

    if (!taskId) {
      throw new Error("Backend did not return a task_id");
    }

    console.log(`[Stems] Job accepted by backend — task_id: ${taskId}`);

    // Poll until complete
    const result = await pollTaskUntilComplete(taskId);

    console.log(`[Stems] Song generation complete — audio_url: ${result.audio_url}`);

    return res.status(200).json({
      audio_url:   result.audio_url,
      audio_title: result.audio_title,
      tracks:      result.tracks,
      task_id:     taskId,
      source:      "apiframe_suno",
      // For backwards compatibility with any code that reads `stems`:
      // expose the full mix as a single "full_mix" stem.
      stems: { full_mix: result.audio_url },
    });

  } catch (err) {
    console.error("[Stems] Generation error:", err.message);

    // Signal the frontend to fall back to the local Web Audio synthesizer
    return res.status(503).json({
      error:    "ai_generation_failed",
      message:  err.message,
      fallback: "web_audio",
    });
  }
}
