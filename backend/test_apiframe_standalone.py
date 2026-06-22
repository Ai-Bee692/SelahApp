"""
Standalone integration test for the apiframe.ai adapter.

Run this BEFORE wiring the adapter into main.py to confirm:
  1. submit_song() reaches the real API and returns a jobId
  2. poll_song() correctly reads intermediate status strings (log them!)
  3. The final SongResult fields match expected types

Usage (from inside backend/ with venv active):
    set APIFRAME_API_KEY=afk_your_key_here   (Windows)
    python test_apiframe_standalone.py

The script polls for up to 5 minutes (60 x 5s), which covers typical Suno latency.
It prints the raw status on every poll so you can confirm the actual intermediate
status strings the API returns — these need to be verified against what poll_song()
treats as "still pending".
"""

import asyncio
import os
import sys
import json
import httpx

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
                print(f"[test] Loaded environment variables from {env_path}")
            except Exception as e:
                print(f"[test] Failed to load environment from {env_path}: {e}")
            break

load_env_local()

# Must be run from backend/ directory so local module imports resolve
sys.path.insert(0, os.path.dirname(__file__))

from song_provider import SongRequest
from apiframe_adapter import submit_song, poll_song, APIFRAME_BASE_URL, _get_headers, parse_job_id, get_api_keys


TEST_LYRICS = """\
[Verse]
Lord, you are worthy
Worthy of all our praise
Your mercy endures forever
We lift our voice and say

[Chorus]
Hallelujah, hallelujah
You are God above all things
Every nation, every language
Let creation rise and sing
"""

TEST_STYLE = (
    "Uplifting Nigerian gospel choir, moderate tempo, piano and organ with light percussion, "
    "warm female lead vocal, SATB choir harmony on the chorus, call-and-response phrasing"
)


async def run_test():
    keys = get_api_keys()
    if not keys:
        print("ERROR: No APIFrame keys configured in environment or .env.local.")
        sys.exit(1)
    print(f"[test] Found {len(keys)} API keys: {[k[:12] + '...' for k in keys]}")
    print(f"[test] Submitting Suno generation...")

    request = SongRequest(
        lyrics=TEST_LYRICS,
        style_prompt=TEST_STYLE,
        vocal_gender="f",
    )

    try:
        job_id = await submit_song(request)
    except Exception as e:
        print(f"[test] FAILED at submit: {e}")
        sys.exit(1)

    print(f"[test] Job submitted — jobId: {job_id}")
    print(f"[test] Polling every 5s for up to 5 minutes...")

    for attempt in range(60):
        await asyncio.sleep(5)

        # Fetch raw response first so we can log the exact status string
        actual_job_id, api_key = parse_job_id(job_id)
        async with httpx.AsyncClient(timeout=30) as client:
            raw_response = await client.get(
                f"{APIFRAME_BASE_URL}/jobs/{actual_job_id}",
                headers=_get_headers(api_key),
            )
        raw_data = raw_response.json()
        raw_status = raw_data.get("status", "<missing>")

        print(f"  [poll #{attempt + 1}] raw status: {raw_status!r}")

        try:
            result = await poll_song(job_id)
        except RuntimeError as e:
            print(f"[test] FAILED at poll: {e}")
            sys.exit(1)

        if result:
            print("\n[test] SUCCESS — Generation complete!")
            print(f"  audio_url:    {result.audio_url}")
            print(f"  title:        {result.title}")
            print(f"  duration_sec: {result.duration_sec}")
            print(f"  image_url:    {result.image_url}")
            print(f"  job_id:       {result.provider_job_id}")

            # Also check if there's a second track
            async with httpx.AsyncClient(timeout=30) as client:
                raw_response = await client.get(
                    f"{APIFRAME_BASE_URL}/jobs/{actual_job_id}",
                    headers=_get_headers(api_key),
                )
            all_tracks = raw_response.json().get("result", {}).get("tracks", [])
            print(f"\n[test] Total tracks returned: {len(all_tracks)}")
            for i, track in enumerate(all_tracks):
                print(f"  Track {i+1}: {track.get('audioUrl', 'no url')}")
            return

    print("[test] TIMED OUT — Job did not complete within 5 minutes.")
    print("  Check your apiframe.ai dashboard to confirm the job status.")
    sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_test())
