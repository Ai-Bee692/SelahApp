"""
Monthly generation credit guardrail for apiframe.ai (Suno).

Each Suno generation costs 11 credits. The apiframe.ai free tier provides 50 credits
(~4 full generations). This module tracks usage in a local JSON file and blocks further
calls once the monthly cap is reached, so the app fails gracefully with a clear message
rather than silently hitting a 402 Insufficient Credits error at the API.

The cap is intentionally conservative (FREE_TIER_CAP_GENERATIONS = 4) based on 50 free
credits / 11 credits per generation. Check your actual account balance at
https://apiframe.ai/dashboard after signing up — promotional credits or paid top-ups
may raise this. Update FREE_TIER_CAP_GENERATIONS accordingly.
"""

import json
import os
from datetime import datetime

def get_cap() -> int:
    from apiframe_adapter import get_api_keys
    keys = get_api_keys()
    num_keys = len(keys) if keys else 1
    return 4 * num_keys


COUNTER_FILE = os.path.join(os.path.dirname(__file__), "usage_counter.json")


def _read_counter() -> dict:
    if not os.path.exists(COUNTER_FILE):
        return {"month": "", "count": 0}
    try:
        with open(COUNTER_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {"month": "", "count": 0}


def _write_counter(data: dict) -> None:
    with open(COUNTER_FILE, "w") as f:
        json.dump(data, f, indent=2)


def check_and_increment_usage_counter() -> bool:
    """
    Returns True and increments the counter if under the monthly cap.
    Returns False without incrementing if the cap has been reached.
    Thread-safe under normal single-process FastAPI usage (GIL protects the file read+write).
    """
    current_month = datetime.now().strftime("%Y-%m")
    data = _read_counter()
    cap = get_cap()

    # Reset counter on month change
    if data.get("month") != current_month:
        data = {"month": current_month, "count": 0}

    if data["count"] >= cap:
        return False

    data["count"] += 1
    _write_counter(data)
    return True


def get_current_usage() -> dict:
    """Returns the current month's usage for health/status endpoints."""
    current_month = datetime.now().strftime("%Y-%m")
    data = _read_counter()
    cap = get_cap()
    if data.get("month") != current_month:
        return {"month": current_month, "count": 0, "cap": cap}
    return {
        "month": data["month"],
        "count": data["count"],
        "cap": cap,
        "remaining": max(0, cap - data["count"]),
    }
