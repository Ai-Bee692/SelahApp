# SelahAI: Architecture & Cloud Integration Handoff

**To:** Backend Development Team  
**Subject:** System Architecture, AI Integration, and Cloud Strategy

This document details the architectural decisions made for the SelahAI Kingdom Hack 3.0 MVP, specifically regarding our AI text generation, local audio synthesis, and our strategy for heavy GPU machine learning models (ACE-Step).

---

## 1. System Overview
SelahAI currently operates on a Next.js (React) stack. The application relies on two primary AI workflows:
1. **Lyric & Chord Generation:** Powered by a lightweight REST API call to Groq (Llama-3.3-70b).
2. **Audio Generation:** Split into two phases—a local Web Audio API for instant rehearsal, and a Cloud-hosted ACE-Step model for final stem separation.

---

## 2. Text Generation (Groq / Llama 3)
We are using `llama-3.3-70b-versatile` via the Groq API for lyric and chord generation. 
*   **Why Groq?** We initially attempted to use Google Gemini, but encountered API version deprecations and quota limitations. Groq was chosen for its near-instantaneous inference speed, which is critical for a fast UX.
*   **Implementation:** Located in `pages/api/generate.js`. It uses strict prompt engineering to force the LLM to return a predefined JSON schema (Verse, Chorus, Bridge, Tag) along with a mathematically correct 1-4-5-6 chord progression based on the user's selected musical key.

---

## 3. Audio Architecture: Why We Rejected Local ACE-Step
ACE-Step is a powerful, open-source audio foundation model that can generate distinct vocal stems (Soprano, Alto, Tenor). However, we explicitly decided **against** running it locally within the Next.js environment for the MVP.

**The Constraints (Why not local?):**
1. **Hardware Limitations:** ACE-Step requires downloading a 10GB+ weight file and running heavy Python inference. Running this on a standard laptop CPU would take 15–30 minutes per song and risk thermal throttling ("melting the CPU") or out-of-memory (OOM) crashes during the live pitch.
2. **Language Barrier:** Our stack is Node.js/React. ACE-Step requires PyTorch/Python.

**The Solution:**
For the live MVP, we built a zero-latency **Web Audio API Engine** (`lib/useGospelAudio.js`) that synthesizes piano chords and percussion locally in the browser based on the Groq-generated chords. This ensures the app always produces sound instantly for the demo without any backend overhead.

---

## 4. Phase 2: The ACE-Step Cloud Architecture
To achieve the "True and True" AI choir voices, we are adopting a **Microservices Cloud API Architecture**. The heavy lifting will be offloaded to a dedicated GPU server (e.g., RunPod, Hugging Face Endpoints, or AWS EC2).

### How the Cloud Integration Works
1.  **Dedicated GPU Node:** ACE-Step will be wrapped in a FastAPI (Python) server and deployed to a Cloud GPU provider.
2.  **Frontend Request:** The Next.js app sends the lyrics to our backend.
3.  **Backend Proxy:** Our Next.js API acts as a secure proxy, forwarding the payload to the Cloud GPU endpoint.
4.  **Response:** The Cloud GPU processes the audio in ~10-30 seconds and returns URLs to the generated `.mp3` or `.wav` stems.

### The Current "Mockup" Implementation
Because we did not rent a GPU server for the hackathon (to save time and money), we have built a **perfect simulation** of this cloud architecture to show the judges.

**Backend Mock (`pages/api/stems.js`):**
```javascript
// This simulates the network latency and GPU processing time
await new Promise(resolve => setTimeout(resolve, 10000));

// It then returns URLs exactly as a cloud server would
return res.status(200).json({
  stems: {
    soprano: "/stems/soprano.mp3",
    alto: "/stems/alto.mp3",
    tenor: "/stems/tenor.mp3"
  }
});
```

**Frontend Mock (`components/Player.jsx`):**
The frontend is unaware this is a mockup. It handles the asynchronous state perfectly:
1. User clicks "Generate ACE-Step Cloud Stems".
2. UI state `isGeneratingStems` is set to true.
3. The button disables and shows a spinning loader: *"Communicating with Cloud GPU..."*
4. After 10 seconds, the frontend receives the URLs from the API and loads them into HTML5 `<audio>` tags in the Stem Mixer.

### Backend Team Action Items (Post-Hackathon)
To make this real after the hackathon, the backend team simply needs to:
1. Provision a RunPod Serverless endpoint or an AWS EC2 instance.
2. Deploy the ACE-Step Python API to that instance.
3. Open `pages/api/stems.js`, delete the `setTimeout` mockup, and replace it with a standard `fetch('https://your-runpod-url.com/generate')`.
