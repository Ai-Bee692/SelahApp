# 🎵 SelahAI: The AI-Powered Gospel Music Co-Writer

> **Built for Kingdom Hack 3.0 (Track_0E)**

SelahAI is an intelligent web application designed specifically for African worship leaders, choirs, and songwriters. It acts as a collaborative "co-writer," helping users quickly prototype new gospel songs, arrange vocal harmonies, and practice with a live band—all directly in the browser.

## ✨ Key Features

### 1. Culturally-Aware Lyric Generation
Powered by the **Llama-3.3-70b** model via the Groq API, SelahAI generates biblically grounded, structured gospel lyrics (Verse, Chorus, Bridge, Tag). It natively understands African gospel idioms, code-switching (English, Yoruba, Igbo, etc.), and the traditional "Call and Response" dynamics of choir arrangements.

### 2. Live Web Audio Synthesizer (Instant Rehearsal)
No more staring at silent lyrics. SelahAI features a built-in zero-latency audio engine using the HTML5 Web Audio API. 
When a song is generated, you can press **Play** to hear the chord progression instantly.
*   **Genre-Aware Patterns:** Generates different rhythmic patterns based on genre (Amapiano log drums, Afrobeats kicks, Highlife guitars, Traditional Choral organs, and Contemporary piano).
*   **Interactive Controls:** Real-time synchronized lyric highlighting and dynamic BPM adjustment.

### 3. "Cloud-Ready" Stem Mixer Architecture (Phase 2 Demo)
SelahAI is architected for heavy machine learning integration. The UI features a **Choir Desk Stem Mixer** designed to isolate Soprano, Alto, and Tenor voices. 
*   The architecture includes an asynchronous API route (`/api/stems`) designed to communicate with a dedicated **RunPod/Hugging Face GPU Server** running the open-source **ACE-Step** audio foundation model.
*   *Note: For the hackathon MVP, the Cloud API simulates the GPU inference delay to demonstrate the asynchronous UX flow without requiring a live GPU server during the pitch.*

## 🛠️ Technology Stack

*   **Frontend:** Next.js (React), Vanilla CSS (Glassmorphism & Modern Dark UI)
*   **Audio Engine:** Native HTML5 Web Audio API, `useRef` for timing-critical scheduling
*   **AI Integration:** Groq API (Llama 3.3) for sub-second lyric and chord progression generation
*   **Future AI:** Designed for ACE-Step (Audio Generation) via Cloud GPU deployment

## 🚀 Getting Started Locally

First, clone the repository and install the dependencies:

```bash
npm install
```

Create a `.env.local` file in the root directory and add your Groq API key:
```env
GROQ_API_KEY=your_api_key_here
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to use the application.

## 🎤 The Pitch

Many worship leaders struggle to arrange new songs and communicate vocal parts to their choir members during midweek rehearsals. 
SelahAI bridges the gap between inspiration and arrangement. It gives songwriters a culturally intelligent sounding board for lyrics, an instant backing track to test melodies, and the architectural foundation to eventually isolate vocal harmonies for choir members to learn at home.

**SelahAI: Co-write with the Spirit, arrange with AI.**
