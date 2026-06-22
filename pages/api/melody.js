// pages/api/melody.js
// Proxies MIDI backing-track generation to the SelahAI Python FastAPI backend.
// Returns a MIDI file URL that the frontend or browser can download directly.

const PYTHON_BACKEND_URL = process.env.SELAH_BACKEND_URL || "http://localhost:8000";

export const config = {
  api: {
    responseLimit: false,
    bodyParser: { sizeLimit: "1mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { chords, genre, musicKey, barsPerChord, input_audio, bpm } = req.body;

  if (input_audio) {
    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(400).json({
        error: "no_replicate_token",
        message: "Replicate API token is missing on the server environment. Please set REPLICATE_API_TOKEN in .env.local to enable cloud AI backing tracks."
      });
    }

    try {
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          version: "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
          input: {
            model_version: "stereo-melody-large",
            prompt: `dynamic gospel track with professional piano, drums, bass, high-fidelity, tempo ${bpm || 72} BPM, style of ${genre || "Contemporary"}`,
            input_audio: input_audio,
            duration: 14,
            continuation: false
          }
        })
      });

      let prediction = await response.json();
      if (!response.ok || prediction.error) {
        throw new Error(prediction.error || "Failed to initiate Replicate prediction");
      }

      const getUrl = prediction.urls.get;
      let attempts = 0;
      const maxAttempts = 25;
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        attempts++;

        const pollRes = await fetch(getUrl, {
          headers: {
            "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
          }
        });
        if (!pollRes.ok) {
          throw new Error(`Polling failed: HTTP ${pollRes.status}`);
        }
        prediction = await pollRes.json();
        if (prediction.status === "succeeded") {
          break;
        }
        if (prediction.status === "failed" || prediction.status === "canceled") {
          throw new Error(`Replicate generation failed/canceled: ${prediction.error || "unknown"}`);
        }
      }

      if (prediction.status !== "succeeded") {
        throw new Error("Prediction timed out on Replicate.");
      }

      return res.status(200).json({
        backing_url: prediction.output
      });

    } catch (err) {
      console.error("[Melody Cloud] Replicate generation error:", err.message);
      return res.status(500).json({
        error: "replicate_failed",
        message: `Cloud AI generation failed: ${err.message}`
      });
    }
  }

  const resolvedChords = Array.isArray(chords) && chords.length > 0
    ? chords
    : buildGospelChords(musicKey || "G");

  try {
    const response = await fetch(`${PYTHON_BACKEND_URL}/api/v1/melody`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chords:         resolvedChords,
        genre:          genre         || "Contemporary",
        key:            musicKey      || "G",
        bars_per_chord: barsPerChord  || 1,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "(no body)");
      throw new Error(`Backend error: HTTP ${response.status} — ${errorBody}`);
    }

    const data = await response.json();

    // Return the MIDI download URL as an absolute URL
    return res.status(200).json({
      midi_url:  `${PYTHON_BACKEND_URL}${data.midi_url}`,
      task_id:   data.task_id,
      bpm:       data.bpm,
      chords:    data.chords,
      status:    data.status,
    });

  } catch (err) {
    console.error("[Melody] Backend error:", err.message);
    return res.status(503).json({
      error:   "backend_unavailable",
      message: `Python backend unreachable: ${err.message}`,
    });
  }
}

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
