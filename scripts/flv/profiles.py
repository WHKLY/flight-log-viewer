"""Firmware compatibility profile loading and selection."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


PROFILE_DIR = Path(__file__).resolve().parent / "profiles"
GENERIC_PROFILE_ID = "ardupilot-generic"
PLANE_GENERIC_PROFILE_ID = "ardupilot-plane-generic"


def load_profile(profile_id: str) -> dict[str, Any]:
    path = PROFILE_DIR / f"{profile_id}.json"
    if not path.exists():
        raise ValueError(f"Unknown compatibility profile: {profile_id}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    payload.setdefault("id", profile_id)
    return payload


def available_profiles() -> list[dict[str, Any]]:
    profiles: list[dict[str, Any]] = []
    for path in sorted(PROFILE_DIR.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        profiles.append(
            {
                "id": payload.get("id") or path.stem,
                "label": payload.get("label") or payload.get("id") or path.stem,
                "vehicle": payload.get("vehicle") or "unknown",
                "version_match": payload.get("version_match") or {},
            }
        )
    return profiles


def select_profile(firmware: dict[str, Any], override: str | None = None) -> dict[str, Any]:
    if override:
        profile = load_profile(override)
        return profile | {
            "detected_version": firmware.get("version"),
            "selection": {
                "mode": "manual_override",
                "confidence": "manual",
                "reason": f"Requested by --profile {override}",
            },
        }

    vehicle = firmware.get("vehicle") or "unknown"
    version = str(firmware.get("version") or "")

    best: tuple[int, dict[str, Any] | None] = (-1, None)
    for summary in available_profiles():
        match = summary.get("version_match") or {}
        if match.get("vehicle") and match["vehicle"] != vehicle:
            continue
        prefixes = match.get("prefixes") or []
        for prefix in prefixes:
            if version.startswith(str(prefix)):
                score = len(str(prefix))
                if score > best[0]:
                    best = (score, load_profile(str(summary["id"])))

    if best[1] is not None:
        return best[1] | {
            "detected_version": firmware.get("version"),
            "selection": {
                "mode": "auto_version_match",
                "confidence": "source-matched",
                "reason": f"Detected {vehicle} {version}",
            },
        }

    if vehicle == "Plane":
        profile = load_profile(PLANE_GENERIC_PROFILE_ID)
        confidence = "generic"
        reason = f"No exact Plane profile for version {version or 'unknown'}"
    else:
        profile = load_profile(GENERIC_PROFILE_ID)
        confidence = "generic"
        reason = f"No vehicle-specific profile for {vehicle}"

    return profile | {
        "detected_version": firmware.get("version"),
        "selection": {
            "mode": "auto_fallback",
            "confidence": confidence,
            "reason": reason,
        },
    }


def profile_summary(profile: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": profile.get("id"),
        "label": profile.get("label"),
        "family": profile.get("family"),
        "vehicle": profile.get("vehicle"),
        "detected_version": profile.get("detected_version"),
        "selection": profile.get("selection"),
        "mode_map": profile.get("mode_map", {}),
        "message_aliases": profile.get("message_aliases", {}),
        "signal_roles": profile.get("signal_roles", {}),
        "mission": profile.get("mission", {}),
        "parameters": profile.get("parameters", {}),
        "control": profile.get("control", {}),
        "capabilities": profile.get("capabilities", {}),
    }
