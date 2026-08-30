"""Shared constants and helpers."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterable


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

PLANE_MODE_MAP = {
    0: "MANUAL",
    1: "CIRCLE",
    2: "STABILIZE",
    3: "TRAINING",
    4: "ACRO",
    5: "FBWA",
    6: "FBWB",
    7: "CRUISE",
    8: "AUTOTUNE",
    10: "AUTO",
    11: "RTL",
    12: "LOITER",
    13: "TAKEOFF",
    14: "AVOID_ADSB",
    15: "GUIDED",
    16: "INITIALISING",
    17: "QSTABILIZE",
    18: "QHOVER",
    19: "QLOITER",
    20: "QLAND",
    21: "QRTL",
    22: "QAUTOTUNE",
    23: "QACRO",
    24: "THERMAL",
    25: "LOITER_ALT_QLAND",
    26: "AUTOLAND",
}

TARGET_MESSAGES = {
    "POS",
    "GPS",
    "ATT",
    "AHR2",
    "XKQ",
    "CTUN",
    "NTUN",
    "TECS",
    "TEC2",
    "PIDR",
    "PIDP",
    "PIDY",
    "RCOU",
    "RCIN",
    "MODE",
    "MSG",
    "CMD",
    "MAVC",
    "EV",
    "TERR",
    "ORGN",
    "PARM",
    "ARSP",
    "IMU",
    "IMU2",
    "IMU3",
    "ACC",
    "ACC2",
    "ACC3",
    "GYR",
    "GYR2",
    "GYR3",
    "VIBE",
    "RATE",
    "XKF0",
    "XKF1",
    "XKF2",
    "XKF3",
    "XKF4",
    "XKF5",
    "XKFD",
    "XKFM",
    "XKFS",
    "XKT",
    "XKTV",
    "XKV1",
    "XKV2",
    "XKY0",
    "XKY1",
    "NKF0",
    "NKF1",
    "NKF2",
    "NKF3",
    "NKF4",
    "NKF5",
}

SERIES_GROUPS = {
    "track": ["POS", "GPS"],
    "mission": ["CMD", "MAVC", "EV", "TERR", "ORGN"],
    "attitude": ["ATT", "AHR2", "XKQ"],
    "navigation": ["CTUN", "NTUN"],
    "tecs": ["TECS", "TEC2", "ARSP"],
    "pid": ["PIDR", "PIDP", "PIDY"],
    "motion": [
        "IMU",
        "IMU2",
        "IMU3",
        "ACC",
        "ACC2",
        "ACC3",
        "GYR",
        "GYR2",
        "GYR3",
        "VIBE",
        "RATE",
        "XKF0",
        "XKF1",
        "XKF2",
        "XKF3",
        "XKF4",
        "XKF5",
        "XKFD",
        "XKFM",
        "XKFS",
        "XKT",
        "XKTV",
        "XKV1",
        "XKV2",
        "XKY0",
        "XKY1",
        "NKF0",
        "NKF1",
        "NKF2",
        "NKF3",
        "NKF4",
        "NKF5",
    ],
    "io": ["RCOU", "RCIN"],
    "events": ["MODE", "MSG"],
}

CONTROL_PARAM_PREFIXES = (
    "NAVL1_",
    "TECS_",
    "RLL2SRV_",
    "RLL_RATE_",
    "PTCH2SRV_",
    "PTCH_RATE_",
    "YAW2SRV_",
    "YAW_RATE_",
    "KFF_",
    "SCALING_SPEED",
    "AIRSPEED_",
    "ARSPD_",
    "ROLL_LIMIT_DEG",
    "PTCH_LIM_",
    "THR_",
    "STICK_MIXING",
    "STALL_PREVENTION",
    "SERVO",
    "RC",
    "INS_",
    "EK2_",
    "EK3_",
    "AHRS_",
    "VIBE",
    "LOG_REPLAY",
    "LIM_ROLL_CD",
    "TRIM_",
    "KFF_RDDRMIX",
)


def command_name(command: Any) -> str:
    number = finite_number(command)
    if number is None:
        return "MAV_CMD_UNKNOWN"
    command_id = int(number)
    return MAV_CMD_NAMES.get(command_id, f"MAV_CMD_{command_id}")


def finite_number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number and abs(number) != float("inf") else None


def is_control_param(name: str) -> bool:
    return any(name == prefix or name.startswith(prefix) for prefix in CONTROL_PARAM_PREFIXES)


def stable_first(paths: Iterable[Path], suffix: str) -> Path | None:
    candidates = [path for path in paths if path.suffix.lower() == suffix]
    if not candidates:
        return None

    def key(path: Path) -> tuple[int, str]:
        duplicate_marker = 1 if "(" in path.stem and ")" in path.stem else 0
        return duplicate_marker, path.name

    return sorted(candidates, key=key)[0]


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

