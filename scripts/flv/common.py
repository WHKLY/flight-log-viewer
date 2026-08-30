"""Shared MAVLink and numeric helpers used by build scripts."""

from __future__ import annotations

from typing import Any


MAV_CMD_NAMES = {
    16: "NAV_WAYPOINT",
    17: "NAV_LOITER_UNLIM",
    18: "NAV_LOITER_TURNS",
    19: "NAV_LOITER_TIME",
    20: "NAV_RETURN_TO_LAUNCH",
    21: "NAV_LAND",
    22: "NAV_TAKEOFF",
    82: "NAV_SPLINE_WAYPOINT",
    177: "DO_JUMP",
    178: "DO_CHANGE_SPEED",
    183: "DO_SET_SERVO",
    184: "DO_REPEAT_SERVO",
    189: "CONDITION_DISTANCE",
    201: "DO_SET_ROI",
    206: "DO_SET_CAM_TRIGG_DIST",
    600: "DO_SET_RESUME_REPEAT_DIST",
}


def finite_number(value: Any) -> float | None:
    """Return a finite float or None for empty/non-numeric values."""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number and abs(number) != float("inf") else None


def command_name(command: Any) -> str:
    """Resolve a MAV_CMD number to a stable display name."""
    number = finite_number(command)
    if number is None:
        return "MAV_CMD_UNKNOWN"
    command_id = int(number)
    return MAV_CMD_NAMES.get(command_id, f"MAV_CMD_{command_id}")

