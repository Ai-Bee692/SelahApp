# SelahAI: Technical Architecture & System Walkthrough

This document outlines the architecture, data flows, system constraints, and file-by-file blueprints of the SelahAI Gospel Music Co-Writer application.

---

## 1. Executive Summary & Constraints

### What Has Been Achieved
- **Full UI Makeover:** Styled after the Suno reference app, featuring responsive mobile navigation drawer, clean dashboard columns, Genre vibe presets, and a collapsible advanced settings drawer.
- **Richer Playback Routing:** Replaced the full-screen modal overlay on the dashboard with a dedicated page-route structure `/song/[id]` mimicking Spotify's rehearsal workspace, while restoring user dashboard tabs via URL parameters.
- **Decoupled Loading Indicators:** Separated local synthesis and AI generation spinner states, introducing an elapsed time counter and progress stage overlay to eliminate confusing dual-spinning buttons.
- **Dynamic Prompt System:** Always prepends a 100% authentic **Nigerian Gospel Core Identity** style DNA. Truncates/reconstructs style prompts at word boundaries (`clean_truncate` / `truncateAtWordBoundary`) to respect Suno's 1,000-character parameter limit and Groq's constraints without word fragments.
- **Emotional Modes & Instrumentation:** Replaced the legacy energy/texture model with **6 Emotional Modes** (e.g. Lament & Comfort, Triumph & Declaration, Rest & Surrender) and **4 Instrumentation Setups** (e.g. Full Band, Vocal & Piano, A Cappella Choir, Instrumental Only).
- **Scripture Translation Prompting:** Enriches Groq lyric generation with a structured translation rule that processes scripture references into first-person testimonies/prayers instead of literal quotes.
- **Production Stems & MIDI Exports:** MIDI generation engine for custom section arrangements, and local browser-based `OfflineAudioContext` WAV backing track synthesis.
- **FastAPI Backend (Python) & apiframe.ai Integration:** A lightweight FastAPI server running locally alongside the Next.js frontend to offload symbolic MIDI creation and orchestrate cloud music generation via Suno (apiframe.ai) with multi-key rotation and usage counters.
- **Offline Shell & Database Caching:** Custom Service Worker shell caching with IndexedDB caching of all generated song metadata, audio tracks, and selected song state.
- **Decoupled Local Synth:** Obsolete local ONNX vocal models (over 230 MB of files including `acoustic.onnx` and `vocoder.onnx`) and draft python codes (`synth_engine.py`, `phonemizer.py`) have been completely removed to clean up the backend space.

---

## 2. High-Level Data Flows

### A. Song Generation & Lyric Translation Flow
```
[User Selects Theme/Scripture, Mode, Setup]
       │
       ▼
[Next.js API: pages/api/generate.js] 
       │ (Enforces input character bounds: Scripture <= 500, Lyrics <= 4000)
       │ (Applies Scripture Translation Rule & rotates Groq API keys)
       ▼
[Groq LLM: Llama-3.3-70b] ──► (Returns structured JSON song structure)
       │
       ▼
[Next.js API Response] ──► [IndexedDB Cache] ──► [UI State Render]
```

### B. Rehearsal Playback & Audio Synthesis Flow
```
[User Clicks Play in Dashboard or Choir Desk]
       │
       ├─► [Web Audio API: useGospelAudio.js]
       │         │
       │         ├─► If Song has AI audio_url: Loads and plays Suno MP3 backing track,
       │         │   suppressing synth oscillators while keeping visual chord prompter synced.
       │         │
       │         └─► If no AI track exists: Synthesizes local Piano, Bass, and Guitar 
       │             oscillators in real-time.
       │
       └─► [Player Prompt Timeline] ──► Highlights active chord box and moves prompter
                                         lyrics index dynamically synced to beat timer.
```

---

## 3. File-by-File Blueprint & Specifications

### A. Python Backend Component (`/backend`)

#### 1. [backend/main.py](file:///c:/Users/ESTHER/Desktop/SelahApp/backend/main.py)
- **Role:** REST API Entrypoint (FastAPI).
- **Functions:**
  - `generate_melody(MelodyRequest)`: Endpoint `/api/v1/melody` generates backing track MIDI files using a background thread pool executor.
  - `generate_stems(StemsRequest)`: Endpoint `/api/v1/stems` initiates background cloud music generation tasks via `apiframe_adapter.py`.
  - `get_stem_status(task_id)`: Checks progress of ongoing background generation tasks.
  - `download_file(file_name)`: Serves synthesized backing tracks directly to the client browser from `backend/outputs`.

#### 2. [backend/apiframe_adapter.py](file:///c:/Users/ESTHER/Desktop/SelahApp/backend/apiframe_adapter.py)
- **Role:** Connection adapter to `apiframe.ai`.
- **Functions:**
  - Submits custom mode prompt payloads (lyrics in `prompt`, generated style in `style`) to `/v2/music/generate`.
  - Handles API key rotation with dynamic usage thresholds.
  - Uses compound `jobId:api_key` formats to ensure polling checks are routed to the key that submitted the request.

#### 3. [backend/midi_generator.py](file:///c:/Users/ESTHER/Desktop/SelahApp/backend/midi_generator.py)
- **Role:** Symbolic MIDI generator.
- **Key Logic:**
  - Instantiates `MIDIFile` tracks for different channels: Piano, Bass, Guitar, and Percussion.
  - Automates drum fills (kick, snare, hihat velocity rolls) on beat 4 of transition bars based on section structure flags.

#### 4. [backend/music_theory.py](file:///c:/Users/ESTHER/Desktop/SelahApp/backend/music_theory.py)
- **Role:** Mathematical Music Theory Resolver.
- **Functions:**
  - Resolves note numbers and transposition steps from string pitch aliases (e.g. `C#4` -> `61`).
  - Contains pitch frequency tables mapping roots to chord harmonics.

---

### B. Frontend Next.js Client Component

#### 1. [lib/useGospelAudio.js](file:///c:/Users/ESTHER/Desktop/SelahApp/lib/useGospelAudio.js)
- **Role:** Web Audio API synthesis engine hook.
- **Key Features:**
  - Schedules hihats, kicks, snares, and log drums via precise `AudioContext` lookahead timers.
  - Integrates `loadBackingTrack` and `clearBackingTrack` to feed cloud MP3 audio buffers into the gain pipeline, muting local synthesizer channels when a backing track is active.
  - Exposes playback hooks: `play`, `pause`, `stop`, `volumes`, and client-side WAV/MIDI file renders.

#### 2. [components/Player.jsx](file:///c:/Users/ESTHER/Desktop/SelahApp/components/Player.jsx)
- **Role:** Choir Desk dashboard and rehearsal UI.
- **Core Elements:**
  - Renders visual chord indicators and prompts lyrics aligned with active chords.
  - Controls vocal and backing track mixers, saves selected version tracks, and persists generated state to the parent via `onUpdateSong`.
  - Implements independent loading states, elapsed time tracking, and stage updates to prevent spinner collision.

#### 3. [pages/song/\[id\].jsx](file:///c:/Users/ESTHER/Desktop/SelahApp/pages/song/%5Bid%5D.jsx)
- **Role:** Dedicated dynamic page route for Choir Desk rehearsal.
- **Details:** Replaces the full-screen modal overlay with a Spotify-like dynamic route, rendering the `Player` component with a dedicated workspace sidebar and responsive navigation layout.

#### 4. [pages/api/generate.js](file:///c:/Users/ESTHER/Desktop/SelahApp/pages/api/generate.js)
- **Role:** LLM lyric/chords generator.
- **Design:**
  - Cleans and bounds input variables using word-boundary truncation (`cleanTheme` <= 100, `cleanScripture` <= 500, `cleanRawSongText` <= 4000).
  - Rotates Groq API keys and calls Llama-3.3-70b-versatile with custom scripture-to-lyrics guidance.

#### 5. [lib/indexedDb.js](file:///c:/Users/ESTHER/Desktop/SelahApp/lib/indexedDb.js)
- **Role:** Offline indexed storage.
- **Logic:**
  - Initializes database (`SelahDB`) storing generated songs locally to ensure persistence during offline use.
