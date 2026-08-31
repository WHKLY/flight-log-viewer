"""Firmware detection from decoded DataFlash messages."""

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
