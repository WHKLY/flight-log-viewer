"""Firmware detection and compatibility profile selection."""

from __future__ import annotations

import re
from typing import Any


FIRMWARE_PATTERN = re.compile(r"\b(ArduPlane|ArduCopter|ArduRover)\s+V?([0-9]+(?:\.[0-9]+){1,3})(?:\s+\(([^)]+)\))?")


def detect_firmware(msg_rows: list[dict[str, Any]]) -> dict[str, Any]:
    raw_messages: list[str] = []
    for row in msg_rows:
        message = str(row.get("Message", ""))
        if "Ardu" not in message:
            continue
        raw_messages.append(message)
        match = FIRMWARE_PATTERN.search(message)
        if not match:
            continue
        vehicle = {"ArduPlane": "Plane", "ArduCopter": "Copter", "ArduRover": "Rover"}.get(match.group(1), "unknown")
        return {
            "family": "ArduPilot",
            "vehicle": vehicle,
            "version": match.group(2),
            "git_hash": match.group(3),
            "raw_messages": raw_messages,
            "detected_from": ["DataFlash MSG"],
            "confidence": "high",
        }
    return {
        "family": "ArduPilot",
        "vehicle": "unknown",
        "version": None,
        "git_hash": None,
        "raw_messages": raw_messages,
        "detected_from": [],
        "confidence": "missing",
    }


def compatibility_profile(firmware: dict[str, Any]) -> dict[str, Any]:
    vehicle = firmware.get("vehicle") or "unknown"
    version = str(firmware.get("version") or "")
    if vehicle == "Plane" and version.startswith("4.4."):
        profile_id = "ardupilot-plane-4.4"
        confidence = "source-matched"
    elif vehicle == "Plane":
        profile_id = "ardupilot-plane-generic"
        confidence = "generic"
    else:
        profile_id = "ardupilot-generic"
        confidence = "generic"
    return {
        "id": profile_id,
        "family": firmware.get("family"),
        "vehicle": vehicle,
        "detected_version": firmware.get("version"),
        "mode_map": "plane_default_4.x" if vehicle == "Plane" else "generic",
        "parameter_metadata": "raw_values_first",
        "control_formulas": "profile_required",
        "confidence": confidence,
    }

