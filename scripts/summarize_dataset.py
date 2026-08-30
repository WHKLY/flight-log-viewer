#!/usr/bin/env python3
"""Create a small JSON summary for the first flight-log-viewer data package."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable

try:
    from extract_dataflash_series import extract_dataflash
except ImportError:  # pragma: no cover - keeps the script usable if copied standalone.
    extract_dataflash = None


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = PROJECT_ROOT / "data" / "raw" / "qq-2026-08-17"
DEFAULT_OUTPUT = PROJECT_ROOT / "public-data" / "dataset-summary.json"

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


@dataclass(frozen=True)
class FileSummary:
    name: str
    suffix: str
    size_bytes: int


def parse_param_file(path: Path) -> dict[str, str]:
    params: dict[str, str] = {}
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if "," in line:
                key, value = line.split(",", 1)
            elif "\t" in line:
                key, value = line.split("\t", 1)
            else:
                parts = line.split(maxsplit=1)
                if len(parts) != 2:
                    continue
                key, value = parts
            params[key.strip()] = value.strip()
    return params


def stringify_param_value(value: Any) -> str:
    if isinstance(value, float):
        return f"{value:.9g}"
    return str(value)


def parse_dataflash_params(path: Path | None) -> tuple[dict[str, str], list[dict[str, object]]]:
    if path is None or extract_dataflash is None:
        return {}, []
    try:
        rows, _metadata = extract_dataflash(path)
    except (OSError, ValueError):
        return {}, []
    params: dict[str, str] = {}
    timeline: list[dict[str, object]] = []
    for row in rows.get("PARM", []):
        name = str(row.get("Name", "")).strip()
        if not name or "Value" not in row:
            continue
        value = stringify_param_value(row["Value"])
        params[name] = value
        timeline.append(
            {
                "time_s": row.get("time_s"),
                "name": name,
                "value": value,
                "default": stringify_param_value(row["Default"]) if "Default" in row else None,
            }
        )
    timeline.sort(key=lambda item: (float(item["time_s"]) if isinstance(item.get("time_s"), int | float) else -1.0, str(item.get("name", ""))))
    return params, timeline


def is_control_param(name: str) -> bool:
    return any(name == prefix or name.startswith(prefix) for prefix in CONTROL_PARAM_PREFIXES)


def control_subset(params: dict[str, str]) -> dict[str, str]:
    return {key: params[key] for key in sorted(params) if is_control_param(key)}


def parse_waypoints_file(path: Path) -> list[dict[str, object]]:
    waypoints: list[dict[str, object]] = []
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        first = handle.readline().strip()
        if first != "QGC WPL 110":
            raise ValueError(f"{path.name}: unsupported waypoint header {first!r}")

        for raw_line in handle:
            line = raw_line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) < 12:
                continue
            index = int(parts[0])
            command = int(float(parts[3]))
            waypoint = {
                "index": index,
                "current": int(parts[1]),
                "frame": int(parts[2]),
                "command": command,
                "command_name": MAV_CMD_NAMES.get(command, f"MAV_CMD_{command}"),
                "param1": float(parts[4]),
                "param2": float(parts[5]),
                "param3": float(parts[6]),
                "param4": float(parts[7]),
                "lat": float(parts[8]),
                "lon": float(parts[9]),
                "alt": float(parts[10]),
                "autocontinue": int(parts[11]),
            }
            waypoints.append(waypoint)
    return waypoints


def find_first(paths: Iterable[Path], suffix: str) -> Path | None:
    def stable_source_key(path: Path) -> tuple[int, str]:
        duplicate_marker = 1 if "(" in path.stem and ")" in path.stem else 0
        return duplicate_marker, path.name

    for path in sorted(paths, key=stable_source_key):
        if path.suffix.lower() == suffix:
            return path
    return None


def duplicate_groups(files: Iterable[Path]) -> dict[str, list[str]]:
    groups: dict[str, list[str]] = {}
    for path in files:
        normalized = path.name.replace("(1)", "")
        groups.setdefault(normalized, []).append(path.name)
    return {key: sorted(names) for key, names in groups.items() if len(names) > 1}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    dataset = args.dataset.expanduser().resolve()
    if not dataset.exists():
        raise SystemExit(f"Dataset directory does not exist: {dataset}")

    files = [path for path in dataset.iterdir() if path.is_file()]
    file_summaries = [
        FileSummary(name=path.name, suffix=path.suffix.lower(), size_bytes=path.stat().st_size)
        for path in sorted(files)
    ]

    param_path = find_first(files, ".param")
    waypoint_path = find_first(files, ".waypoints")
    bin_path = find_first(files, ".bin")

    file_params = parse_param_file(param_path) if param_path else {}
    bin_params, bin_param_timeline = parse_dataflash_params(bin_path)
    params = {**bin_params, **file_params}
    control_params = control_subset(params)
    file_control_params = control_subset(file_params)
    bin_control_params = control_subset(bin_params)

    waypoints = parse_waypoints_file(waypoint_path) if waypoint_path else []

    summary = {
        "dataset": str(dataset),
        "files": [asdict(item) for item in file_summaries],
        "counts": {
            "files": len(file_summaries),
            "parameters": len(params),
            "file_parameters": len(file_params),
            "dataflash_parameters": len(bin_params),
            "dataflash_parameter_records": len(bin_param_timeline),
            "control_parameters": len(control_params),
            "waypoints": len(waypoints),
        },
        "selected_files": {
            "param": param_path.name if param_path else None,
            "waypoints": waypoint_path.name if waypoint_path else None,
            "bin_logs": [path.name for path in sorted(files) if path.suffix.lower() == ".bin"],
            "tlogs": [path.name for path in sorted(files) if path.suffix.lower() == ".tlog"],
            "rlogs": [path.name for path in sorted(files) if path.suffix.lower() == ".rlog"],
        },
        "duplicate_groups": duplicate_groups(files),
        "parameter_sources": {
            "param_file": param_path.name if param_path else None,
            "dataflash_bin": bin_path.name if bin_path and bin_params else None,
            "available": {
                "merged": bool(params),
                "param_file": bool(file_params),
                "dataflash_latest": bool(bin_params),
                "dataflash_time": bool(bin_param_timeline),
            },
            "precedence": ".param values override DataFlash PARM values with the same name only in merged/auto mode",
        },
        "parameter_sets": {
            "merged": {"label": "Merged: .param over DataFlash", "params": params, "control_params": control_params},
            "param_file": {"label": ".param file", "params": file_params, "control_params": file_control_params},
            "dataflash_latest": {"label": "DataFlash PARM latest", "params": bin_params, "control_params": bin_control_params},
        },
        "dataflash_param_timeline": bin_param_timeline,
        "control_params": control_params,
        "waypoints": waypoints,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}")
    print(json.dumps(summary["counts"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

