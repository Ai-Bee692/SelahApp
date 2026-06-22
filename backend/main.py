import os
import uuid
import asyncio
import logging

def load_env_local():
    possible_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env.local"),
        ".env.local"
    ]
    for env_path in possible_paths:
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            key, val = line.split("=", 1)
                            key = key.strip()
                            val = val.strip()
                            if val.startswith(('"', "'")) and val.endswith(val[0]):
                                val = val[1:-1]
                            os.environ[key] = val
                logging.info(f"Loaded environment variables from {env_path}")
            except Exception as e:
                logging.error(f"Failed to load environment from {env_path}: {e}")
            break

load_env_local()

from concurrent.futures import ThreadPoolExecutor
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict

# Local modules
from music_theory import (
    get_satb_for_chord,
    build_gospel_progression,
    get_bpm_for_genre,
)
from midi_generator import generate_gospel_midi
from song_provider import SongRequest, SongResult
from apiframe_adapter import submit_song, poll_song, get_api_keys
from usage_counter import check_and_increment_usage_counter, get_current_usage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SelahAI Audio Synthesis Service",
    description="Gospel music generation: MIDI backing tracks + AI-composed song via Suno (apiframe.ai).",
    version="3.0.0"
)

# Allow the Next.js frontend to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "outputs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Thread pool kept for the MIDI generation endpoint (CPU-bound, non-async)
_executor = ThreadPoolExecutor(max_workers=4)

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class MelodyRequest(BaseModel):
    chords: List[str]
    genre: str
    bpm: Optional[int] = None
    key: str
    bars_per_chord: Optional[int] = 1

class StemsRequest(BaseModel):
    title: str
    key: str
    genre: str
    chords: List[str]
    lyrics: List[dict]           # [{part: str, line: str}]
    section_structure: Optional[str] = None
    vocal_gender: Optional[str] = None   # "m" or "f"
    emotional_mode: Optional[str] = None
    instrumentation: Optional[str] = None

class StemStatusResponse(BaseModel):
    status: str                  # "queued" | "rendering" | "complete" | "failed"
    task_id: str
    audio_url: Optional[str] = None
    audio_title: Optional[str] = None
    tracks: Optional[List[Dict]] = None   # both Suno tracks when available
    error: Optional[str] = None

# ─── In-memory task store (MVP; replace with Redis in production) ─────────────
_stem_tasks: Dict[str, dict] = {}


def _create_task_record() -> str:
    task_id = str(uuid.uuid4())
    _stem_tasks[task_id] = {"status": "queued", "audio_url": None, "audio_title": None, "tracks": None, "error": None}
    return task_id


def _update_task_status(task_id: str, status: str, **kwargs) -> None:
    if task_id not in _stem_tasks:
        return
    _stem_tasks[task_id]["status"] = status
    for key, value in kwargs.items():
        _stem_tasks[task_id][key] = value


# ─── Style Prompt Builder ─────────────────────────────────────────────────────

# Detailed genre style descriptors — instrumentation, rhythm feel, cultural texture.
# Each descriptor is designed to produce a distinctly different sound from Suno.
_GENRE_STYLE_MAP: Dict[str, str] = {
    "Afrobeats": (
        "Nigerian Afrobeats gospel, live talking drum pattern with conga cross-rhythm, "
        "wah-wah electric guitar chops, Hammond B3 organ stabs, thick bass guitar groove, "
        "uplifting gospel choir, bright percussion shakers and agogo bell, energetic and joyful"
    ),
    "Amapiano": (
        "South African Amapiano gospel, deep resonant log drum bass, lilting grand piano riffs, "
        "syncopated hi-hat patterns, warm Rhodes pads, rich SATB choir harmonies, "
        "laid-back groove with spiritual depth, log drum and piano interplay"
    ),
    "Highlife": (
        "West African Highlife gospel, clean acoustic guitar fingerpicking with electric rhythm guitar, "
        "brass section with trumpet and trombone, percussion ensemble with conga and bongo, "
        "joyful ensemble choir, bright and celebratory feel, West African melodic sensibility"
    ),
    "Contemporary": (
        "Contemporary Christian worship, warm grand piano and Hammond B3 organ with Leslie speaker rotation, "
        "live trap kit with gospel snare snap, walking upright bass, layered SATB choir, "
        "electric guitar with light reverb, polished production, emotionally warm and devotional"
    ),
    "Traditional Choral": (
        "Traditional African choral gospel, pure a cappella SATB choir with no instruments, "
        "slow and deeply reverent, rich four-part harmony, bass voices anchoring the foundation, "
        "soprano voices soaring above, no drums or percussion, sacred and majestic atmosphere"
    ),
    "Call & Response": (
        "Gospel call-and-response, strong lead vocalist answered by full choir, "
        "Hammond organ chord stabs, hand claps on the two and four, shakers and tambourine, "
        "jubilant and celebratory, leader improvises while choir echoes and harmonizes"
    ),
    "Fuji Gospel": (
        "Yoruba Fuji gospel music, talking drum as lead instrument with sakara frame drum, "
        "dense polyrhythmic percussion ensemble, jubilant lead vocalist with melismatic phrases, "
        "call-and-response choir responses in Yoruba, no bass guitar — percussion-driven, "
        "festive and deeply rooted in West African oral praise tradition"
    ),
    "Praise & Worship": (
        "Modern praise and worship in the style of Elevation Worship or Hillsong, "
        "keys-driven with full electric guitar lead, driving live drums with powerful snare, "
        "soaring choir build from whisper to anthem, bass guitar underpinning the low end, "
        "anthemic and emotionally sweeping, builds to a powerful climactic chorus"
    ),
}

CORE_IDENTITY = (
    "Authentic Nigerian-rooted contemporary gospel. Vocals carry the emotional and "
    "theological weight — clear diction, never overproduced to the point of burying "
    "the words. Warmth over polish. Congregational spirit even in solo arrangements. "
    "Rhythmic foundation drawn from highlife and Afrobeat gospel traditions, not "
    "generic Western CCM. The arrangement breathes — space for the lyric to land."
)

EMOTIONAL_MODES = {
    "lament_comfort": (
        "Slow to moderate tempo, sparse piano-led arrangement, gentle strings entering "
        "in the chorus, warm low vocal register, generous space between phrases. "
        "The sound of being held, not fixed — comfort that sits with pain rather than "
        "rushing past it. Builds gently, never explodes."
    ),
    "triumph_declaration": (
        "Driving mid-to-up tempo, full gospel band with horns and organ, layered choir "
        "harmonies entering by the second chorus, confident lead vocal with rhythmic "
        "punch on key declarations. Energy that rises and holds — the sound of a "
        "testimony being shouted, not whispered."
    ),
    "rest_surrender": (
        "Very slow, ambient and sparse, single sustained vocal or duet, minimal "
        "percussion if any, soft pads or solo piano, long held notes, breath audible "
        "in the phrasing. The musical equivalent of stillness — nothing fights for "
        "attention."
    ),
    "wonder_intimacy": (
        "Mid tempo, acoustic guitar or fingerpicked piano as the anchor, soft layered "
        "harmony entering subtly under the lead, warm and close-mic'd vocal tone, "
        "understated rhythm section. Personal and quiet, like a prayer spoken aloud "
        "rather than performed."
    ),
    "joy_celebration": (
        "Up-tempo highlife-gospel groove, syncopated percussion, call-and-response "
        "vocal phrasing between lead and choir, bright guitar or keys riff, "
        "danceable energy throughout. The sound of a congregation on its feet."
    ),
    "defiance_warfare": (
        "Urgent, percussive, militant rhythm, layered chant-like choir repetition, "
        "minor-leaning harmonic tension resolving to declaration, lead vocal cutting "
        "and direct rather than smooth. The sound of standing your ground, not "
        "asking permission."
    ),
}

INSTRUMENTATION_MODIFIERS = {
    "full_band": "Full gospel band arrangement — piano, bass, drums, guitar, with horns or strings where the mode calls for it.",
    "vocal_piano": "Stripped to lead vocal and piano only — no other instrumentation, intimate and exposed.",
    "a_cappella": "A cappella — voices only, choir harmony carrying the full arrangement, no instruments.",
    "instrumental": "Instrumental only, no vocals — the emotional mode carried entirely by the music.",
}


def clean_truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    truncated = text[:max_len]
    last_space = truncated.rfind(" ")
    if last_space != -1:
        truncated = truncated[:last_space]
    return truncated.rstrip(",. ")


def build_style_prompt(
    genre: str,
    key: str,
    chords: List[str],
    emotional_mode: Optional[str] = None,
    instrumentation: Optional[str] = None,
    vocal_register: Optional[str] = None,
    section_structure: Optional[str] = None,
) -> str:
    """
    Constructs the sunoParams.style string (max 1,000 chars) using the emotional modes,
    instrumentation, core identity, and optional genre flavor.
    """
    other_parts = []

    # Get emotional mode description
    mode_desc = EMOTIONAL_MODES.get(emotional_mode) if emotional_mode else None
    if mode_desc:
        other_parts.append(mode_desc)

    # Get instrumentation description
    inst_desc = INSTRUMENTATION_MODIFIERS.get(instrumentation) if instrumentation else None
    if inst_desc:
        other_parts.append(inst_desc)

    # Optional genre flavor (subordinated/appended)
    if genre:
        genre_flavor = _GENRE_STYLE_MAP.get(genre)
        if genre_flavor:
            other_parts.append(genre_flavor)

    # Vocal register
    if vocal_register == "f":
        other_parts.append("warm female lead vocalist with clear tone and expressive phrasing")
    elif vocal_register == "m":
        other_parts.append("powerful male lead vocalist with rich baritone-tenor range")
    elif vocal_register == "mixed":
        other_parts.append("male and female vocalists trading lead phrases, rich blend")

    # Key and chords
    if key:
        other_parts.append(f"key of {key}")
    if chords:
        chord_str = ", ".join(chords[:6])
        other_parts.append(f"chord progression: {chord_str}")

    if section_structure:
        other_parts.append(section_structure)

    other_text = ", ".join(other_parts)

    # Respect Suno's 1000-char cap. Trim CORE_IDENTITY from the start if space is limited.
    max_core_len = 1000 - len(other_text) - 2  # 2 chars for separator (", ")
    if max_core_len <= 0:
        return clean_truncate(other_text, 1000)

    trimmed_core = clean_truncate(CORE_IDENTITY, max_core_len)
    if trimmed_core:
        full_prompt = f"{trimmed_core}, {other_text}"
    else:
        full_prompt = other_text

    return clean_truncate(full_prompt, 1000)


# Maps frontend call-and-response labels to Suno section tag format
_CALL_RESPONSE_TAG_MAP = {
    "(Leader)": "[Leader]",
    "(Choir)":  "[Choir]",
    "(All)":    "[All]",
    "(Solo)":   "[Solo]",
    "(Bridge)": "[Bridge]",
}


def _format_lyrics_for_suno(lyrics: List[dict]) -> str:
    """
    Converts SelahAI's [{part, line}] lyrics structure into Suno's [Section] tagged format.

    Preserves call-and-response markers like (Leader) and (Choir) — these are translated
    into Suno-compatible inline tags. Previously these were stripped, which caused Suno to
    treat all lines uniformly rather than applying antiphonal arrangement.
    """
    if not lyrics:
        return "[Verse]\nHallelujah, praise the Lord\nYour mercy endures forever"

    lines_by_part: Dict[str, List[str]] = {}
    for entry in lyrics:
        part = entry.get("part", "Verse").strip()
        line = entry.get("line", "").strip()
        if not line:
            continue
        # Translate call-and-response markers into Suno section tags
        # rather than stripping them as was done previously
        for frontend_tag, suno_tag in _CALL_RESPONSE_TAG_MAP.items():
            if line.startswith(frontend_tag):
                line = suno_tag + line[len(frontend_tag):]
                break
        lines_by_part.setdefault(part, []).append(line)

    formatted_sections = []
    for part, lines in lines_by_part.items():
        section_tag = f"[{part}]"
        section_body = "\n".join(lines)
        formatted_sections.append(f"{section_tag}\n{section_body}")

    result = "\n\n".join(formatted_sections)
    # Enforce Suno's 5,000-char limit on the lyrics prompt field
    return result[:5000]


# ─── Background Song Generation Task ─────────────────────────────────────────

async def _run_song_generation(request: StemsRequest, task_id: str) -> None:
    """
    Full async pipeline: format lyrics → build style prompt → submit to apiframe.ai
    → poll until complete → save result URL to task record.
    """
    _update_task_status(task_id, "rendering")

    # Gate on monthly usage before spending a credit
    if not check_and_increment_usage_counter():
        usage = get_current_usage()
        _update_task_status(
            task_id, "failed",
            error=f"Monthly generation limit reached ({usage['cap']} generations/month on free tier). "
                  f"Top up credits at https://apiframe.ai/dashboard to continue."
        )
        logger.warning(f"[stems] Task {task_id} rejected — monthly cap reached.")
        return

    lyrics_text = _format_lyrics_for_suno(request.lyrics)
    style_text = build_style_prompt(
        genre=request.genre,
        key=request.key,
        chords=request.chords,
        emotional_mode=request.emotional_mode,
        instrumentation=request.instrumentation,
        vocal_register=request.vocal_gender,
        section_structure=request.section_structure,
    )

    song_request = SongRequest(
        lyrics=lyrics_text,
        style_prompt=style_text,
        vocal_gender=request.vocal_gender,
        instrumental_only=False,
    )

    logger.info(f"[stems] Task {task_id} — submitting to apiframe.ai")
    logger.debug(f"[stems] style_prompt ({len(style_text)} chars): {style_text[:200]}...")

    try:
        job_id = await submit_song(song_request)
    except Exception as exc:
        _update_task_status(task_id, "failed", error=f"Submission failed: {exc}")
        logger.error(f"[stems] Task {task_id} submission error: {exc}")
        return

    logger.info(f"[stems] Task {task_id} — apiframe jobId: {job_id}. Polling...")

    # Poll loop: Suno typically takes 30–120 seconds. 60 × 5s = 5-minute ceiling.
    result: Optional[SongResult] = None
    for attempt in range(60):
        await asyncio.sleep(5)
        try:
            result = await poll_song(job_id)
        except RuntimeError as exc:
            _update_task_status(task_id, "failed", error=str(exc))
            logger.error(f"[stems] Task {task_id} poll error at attempt {attempt + 1}: {exc}")
            return

        if result:
            logger.info(f"[stems] Task {task_id} complete after {(attempt + 1) * 5}s — {result.audio_url}")
            break

    if not result:
        _update_task_status(task_id, "failed", error="Generation timed out after 5 minutes.")
        logger.error(f"[stems] Task {task_id} timed out.")
        return

    _update_task_status(
        task_id,
        "complete",
        audio_url=result.audio_url,
        audio_title=result.title,
        tracks=[{
            "audio_url": result.audio_url,
            "image_url": result.image_url,
            "title": result.title,
            "duration_sec": result.duration_sec,
        }],
    )


# ─── /api/v1/melody — Real MIDI Generation ────────────────────────────────────

@app.post("/api/v1/melody", status_code=201)
async def generate_melody(request: MelodyRequest):
    """
    Generates a gospel MIDI backing track from a chord list.
    Returns download URLs for the MIDI file.
    Runs on CPU via MIDIUtil. No GPU or cloud API required.
    """
    try:
        bpm = request.bpm or get_bpm_for_genre(request.genre)
        task_id = str(uuid.uuid4())
        midi_path = os.path.join(OUTPUT_DIR, f"{task_id}.mid")

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            _executor,
            lambda: generate_gospel_midi(
                chords=request.chords,
                genre=request.genre,
                bpm=bpm,
                bars_per_chord=request.bars_per_chord,
                output_path=midi_path,
            )
        )

        file_size = os.path.getsize(midi_path)
        return {
            "task_id":   task_id,
            "bpm":       bpm,
            "chords":    request.chords,
            "midi_url":  f"/api/v1/downloads/{task_id}.mid",
            "file_size": file_size,
            "status":    "ready",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Melody generation failed: {exc}")


# ─── /api/v1/stems — Async AI Song Generation (apiframe.ai / Suno) ────────────

@app.post("/api/v1/stems", status_code=202)
async def generate_stems(request: StemsRequest, background_tasks: BackgroundTasks):
    """
    Submits an AI song generation job to apiframe.ai (Suno).
    Returns immediately with a task_id. Poll /api/v1/stems/{task_id} for status.
    Typical completion: 30–120 seconds.
    Credit cost: 11 apiframe.ai credits (returns 2 song variants).
    """
    task_id = _create_task_record()
    background_tasks.add_task(_run_song_generation, request, task_id)
    usage = get_current_usage()

    return {
        "status":    "queued",
        "task_id":   task_id,
        "message":   "AI song generation queued. Poll /api/v1/stems/{task_id} for status.",
        "usage":     usage,
    }


@app.get("/api/v1/stems/{task_id}", response_model=StemStatusResponse)
async def get_stem_status(task_id: str):
    """Polls status of a previously submitted song generation task."""
    if task_id not in _stem_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    task = _stem_tasks[task_id]
    return StemStatusResponse(
        status=task["status"],
        task_id=task_id,
        audio_url=task.get("audio_url"),
        audio_title=task.get("audio_title"),
        tracks=task.get("tracks"),
        error=task.get("error"),
    )


# ─── /api/v1/downloads/{file_name} — MIDI File Serving ───────────────────────

@app.get("/api/v1/downloads/{file_name}")
async def download_file(file_name: str):
    """Serves locally generated MIDI files."""
    if ".." in file_name or "/" in file_name or "\\" in file_name:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    file_path = os.path.join(OUTPUT_DIR, file_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found.")

    if file_name.endswith(".mid"):
        media_type = "audio/midi"
    elif file_name.endswith(".wav"):
        media_type = "audio/wav"
    else:
        media_type = "application/octet-stream"

    return FileResponse(file_path, media_type=media_type, filename=file_name)


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    usage = get_current_usage()
    keys = get_api_keys()
    apiframe_key_set = len(keys) > 0 and any(k.startswith("afk_") for k in keys)
    return {
        "status":          "ok",
        "service":         "SelahAI Audio Synthesis Service v3.0",
        "features":        ["midi_generation", "ai_song_suno_apiframe", "gospel_theory"],
        "ai_provider":     "apiframe.ai (Suno)",
        "apiframe_ready":  apiframe_key_set,
        "monthly_usage":   usage,
    }
