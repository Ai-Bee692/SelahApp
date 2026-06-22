"""
apiframe.ai adapter for Suno music generation.

Built against the verified apiframe.ai /v2 API:
  - Submit:  POST https://api.apiframe.ai/v2/music/generate
  - Poll:    GET  https://api.apiframe.ai/v2/jobs/:id
  - Auth:    X-API-Key header (key starts with "afk_")

Credit cost: 11 credits per generation (returns 2 tracks).
"""

import httpx
import asyncio
import logging
import os

from song_provider import SongRequest, SongResult

logger = logging.getLogger(__name__)

APIFRAME_BASE_URL = "https://api.apiframe.ai/v2"

# Key is read at call time so the module can be imported without the env var set,
# which lets test scripts inject their own key.
def get_api_keys() -> list[str]:
    keys = []
    # Primary API key (may contain comma-separated keys)
    api_key_str = os.environ.get("APIFRAME_API_KEY", "")
    if api_key_str:
        keys.extend([k.strip() for k in api_key_str.split(",") if k.strip()])
    
    # Collect and sort any numbered API keys (e.g., APIFRAME_API_KEY2, APIFRAME_API_KEY3)
    numbered_keys = []
    for key, val in os.environ.items():
        if key.startswith("APIFRAME_API_KEY"):
            suffix = key[len("APIFRAME_API_KEY"):]
            if suffix.isdigit():
                numbered_keys.append((int(suffix), val))
    
    numbered_keys.sort(key=lambda x: x[0])
    for _, val in numbered_keys:
        if val:
            keys.extend([k.strip() for k in val.split(",") if k.strip()])
            
    return keys


def parse_job_id(compound_job_id: str) -> tuple[str, str]:
    if ":" in compound_job_id:
        actual_job_id, api_key = compound_job_id.split(":", 1)
        return actual_job_id, api_key
    keys = get_api_keys()
    assert keys, "No APIFrame API keys configured in environment."
    return compound_job_id, keys[0]


def _get_headers(api_key: str = "") -> dict:
    if not api_key:
        keys = get_api_keys()
        assert keys, (
            "APIFRAME_API_KEY must be set — "
            "obtain yours from https://apiframe.ai/dashboard"
        )
        api_key = keys[0]
    
    assert api_key.startswith("afk_"), (
        f"API Key '{api_key[:10]}...' is invalid. APIFrame keys must start with 'afk_'"
    )
    return {
        "X-API-Key": api_key,
        "Content-Type": "application/json",
    }


async def submit_song(request: SongRequest) -> str:
    """
    Submits a Suno generation job. Returns the compound jobId string (jobId:api_key) to pass to poll_song().

    SelahAI always uses custom_mode=True because lyrics come pre-written by Groq.
    In custom_mode:
      - The top-level "prompt" field holds the LYRICS (up to 5,000 chars).
      - sunoParams.style holds the genre/instrumentation description (up to 1,000 chars).
    These two fields must NOT be swapped — mixing them up is the most common integration bug
    and causes silent quality degradation (Suno treats style text as lyrics and vice versa).
    """
    assert request.lyrics, "lyrics must not be empty"
    assert len(request.lyrics) <= 5000, f"lyrics too long: {len(request.lyrics)} chars (max 5000)"
    assert len(request.style_prompt) <= 1000, f"style_prompt too long: {len(request.style_prompt)} chars (max 1000)"

    payload = {
        "prompt": request.lyrics,        # lyrics go in top-level prompt when custom_mode=true
        "model": "suno",
        "sunoParams": {
            "custom_mode": True,
            "model_version": "V4_5PLUS",  # confirmed valid; V5/V5_5 also available if your account tier supports them
            "style": request.style_prompt,
            "instrumental": request.instrumental_only,
        },
    }

    if request.vocal_gender in ("m", "f"):
        payload["sunoParams"]["vocal_gender"] = request.vocal_gender

    keys = get_api_keys()
    assert keys, "APIFRAME_API_KEY must be set and contain at least one valid key."

    last_error = None
    for api_key in keys:
        logger.info(f"[apiframe] Submitting Suno generation job using key {api_key[:12]}...")
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    f"{APIFRAME_BASE_URL}/music/generate",
                    headers=_get_headers(api_key),
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                job_id: str = data["jobId"]
                logger.info(f"[apiframe] Job accepted — jobId: {job_id}, status: {data.get('status')}")
                # Return compound job ID containing the key that worked for submission
                return f"{job_id}:{api_key}"
        except Exception as exc:
            logger.warning(f"[apiframe] Submission failed for key {api_key[:12]}: {exc}")
            last_error = exc

    raise RuntimeError(f"All APIFrame keys failed for submission. Last error: {last_error}")


async def poll_song(job_id: str) -> SongResult | None:
    """
    Polls a single job. Returns None while still processing, SongResult when COMPLETED.
    Raises RuntimeError on FAILED.

    Status strings QUEUED, PROCESSING, IN_PROGRESS are treated as "still pending".
    Log the raw status on your first real integration run to confirm — the exact
    intermediate strings were not fully enumerated in the excerpt seen during build.
    COMPLETED and FAILED are confirmed correct.

    Returns the FIRST of the 2 generated tracks. Use get_both_tracks() if you want
    to present both options to the user (free, already included in the 11-credit cost).
    """
    actual_job_id, api_key = parse_job_id(job_id)
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"{APIFRAME_BASE_URL}/jobs/{actual_job_id}",
            headers=_get_headers(api_key),
        )
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise RuntimeError(
                f"apiframe poll failed HTTP {exc.response.status_code}: {exc.response.text}"
            ) from exc

        data = response.json()
        status: str = data.get("status", "")

        logger.debug(f"[apiframe] Job {actual_job_id} status: {status}")

        if status == "FAILED":
            raise RuntimeError(f"apiframe job {actual_job_id} failed: {data}")

        if status == "COMPLETED":
            tracks = data.get("result", {}).get("tracks", [])
            if not tracks:
                raise RuntimeError(f"apiframe job {actual_job_id} completed but returned no tracks: {data}")
            track = tracks[0]
            return SongResult(
                audio_url=track["audioUrl"],
                provider_job_id=job_id,
                duration_sec=track.get("duration"),
                title=track.get("title"),
                image_url=track.get("imageUrl"),
            )

        # Any other status (QUEUED, PROCESSING, IN_PROGRESS, etc.) — still pending
        return None


async def get_both_tracks(job_id: str) -> list[SongResult]:
    """
    Suno returns 2 tracks per generation at no extra cost.
    Use this to let the user pick between the two versions
    rather than silently discarding one.
    Returns an empty list if the job is not yet COMPLETED.
    """
    actual_job_id, api_key = parse_job_id(job_id)
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            f"{APIFRAME_BASE_URL}/jobs/{actual_job_id}",
            headers=_get_headers(api_key),
        )
        response.raise_for_status()
        data = response.json()

        if data.get("status") != "COMPLETED":
            return []

        tracks = data.get("result", {}).get("tracks", [])
        return [
            SongResult(
                audio_url=track["audioUrl"],
                provider_job_id=job_id,
                duration_sec=track.get("duration"),
                title=track.get("title"),
                image_url=track.get("imageUrl"),
            )
            for track in tracks
        ]


async def get_stems(job_id: str, track_id: str) -> dict | None:
    """
    Splits a COMPLETED track into separate vocals and instrumental files.
    This is a follow-up action — a SEPARATE billed operation (11 additional credits).

    NOT YET IMPLEMENTED — the exact request body for this follow-up action
    was referenced at /docs/actions/suno/stems but was not included in the
    documentation excerpt available during build.

    Pull that specific page from apiframe.ai/docs before implementing this function.
    Until then, callers that invoke this will get a clear error rather than silent failure.
    """
    raise NotImplementedError(
        "get_stems() not yet implemented. Pull the full request schema from "
        "https://apiframe.ai/docs/actions/suno/stems and implement before use. "
        "Expected return: {'vocals_url': str, 'instrumental_url': str}"
    )
