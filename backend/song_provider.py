from dataclasses import dataclass
from typing import Optional


@dataclass
class SongRequest:
    lyrics: str                          # Full lyrics with [Verse]/[Chorus] tags — used as prompt when custom_mode=true
    style_prompt: str                    # Genre/mood/instrumentation — goes into sunoParams.style, NOT the top-level prompt
    vocal_gender: Optional[str] = None  # "m" for male, "f" for female
    instrumental_only: bool = False


@dataclass
class SongResult:
    audio_url: str
    provider_job_id: str
    duration_sec: Optional[float] = None
    title: Optional[str] = None
    image_url: Optional[str] = None
