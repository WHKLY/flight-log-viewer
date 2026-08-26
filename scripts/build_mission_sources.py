#!/usr/bin/env python3
"""Build mission source candidates for viewer mission-task selection."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SUMMARY = PROJECT_ROOT / "public-data" / "dataset-summary.json"
DEFAULT_MISSION = PROJECT_ROOT / "public-data" / "series" / "mission.json"
DEFAULT_OUTPUT = PROJECT_ROOT / "public-data" / "series" / "mission-sources.json"
DEFAULT_OVERRIDES = PROJECT_ROOT / "project-data" / "mission-overrides.json"

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


def read_json_optional(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def finite_number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number and abs(number) != float("inf") else None


def command_name(command: Any) -> str:
    number = finite_number(command)
    if number is None:
        return "MAV_CMD_UNKNOWN"
    command_id = int(number)
    return MAV_CMD_NAMES.get(command_id, f"MAV_CMD_{command_id}")


def waypoint_item(row: dict[str, Any], source: str) -> dict[str, Any]:
    seq = int(finite_number(row.get("index")) or 0)
    command = int(finite_number(row.get("command")) or 0)
    return {
        "seq": seq,
        "source_seq": seq,
        "command": command,
        "command_name": row.get("command_name") or command_name(command),
        "frame": int(finite_number(row.get("frame")) or 0),
        "current": int(finite_number(row.get("current")) or 0),
        "autocontinue": int(finite_number(row.get("autocontinue")) or 0),
        "params": [
            finite_number(row.get("param1")) or 0.0,
            finite_number(row.get("param2")) or 0.0,
            finite_number(row.get("param3")) or 0.0,
            finite_number(row.get("param4")) or 0.0,
        ],
        "lat": finite_number(row.get("lat")),
        "lon": finite_number(row.get("lon")),
        "alt": finite_number(row.get("alt")),
        "time_s": None,
        "source": source,
    }


def cmd_item(row: dict[str, Any], index: int) -> dict[str, Any]:
    seq = int(finite_number(row.get("CNum")) or index)
    command = int(finite_number(row.get("CId")) or 0)
    return {
        "seq": seq,
        "source_seq": seq,
        "command": command,
        "command_name": command_name(command),
        "frame": None,
        "current": None,
        "autocontinue": None,
        "params": [
            finite_number(row.get("Prm1")) or 0.0,
            finite_number(row.get("Prm2")) or 0.0,
            finite_number(row.get("Prm3")) or 0.0,
            finite_number(row.get("Prm4")) or 0.0,
        ],
        "lat": finite_number(row.get("Lat")),
        "lon": finite_number(row.get("Lng")),
        "alt": finite_number(row.get("Alt")),
        "time_s": finite_number(row.get("time_s")),
        "source": "onboard_cmd",
    }


def dedupe_cmd_items(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    latest_by_seq: dict[int, dict[str, Any]] = {}
    first_order: list[int] = []
    for index, row in enumerate(rows):
        item = cmd_item(row, index)
        seq = item["seq"]
        if seq not in latest_by_seq:
            first_order.append(seq)
        latest_by_seq[seq] = item
    return [latest_by_seq[seq] for seq in first_order]


def source_quality(items: list[dict[str, Any]], kind: str) -> dict[str, Any]:
    timed = [item["time_s"] for item in items if item.get("time_s") is not None]
    located = [item for item in items if item.get("lat") is not None and item.get("lon") is not None]
    return {
        "kind": kind,
        "item_count": len(items),
        "located_count": len(located),
        "has_timing": bool(timed),
        "time_range": {"start_s": min(timed), "end_s": max(timed)} if timed else None,
    }


def build_sources(summary: dict[str, Any], mission: dict[str, Any]) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    waypoints = summary.get("waypoints") or []
    if waypoints:
        items = [waypoint_item(row, "external_wp") for row in waypoints]
        sources.append(
            {
                "id": "external_wp",
                "label": "External waypoint file",
                "source_file": (summary.get("selected_files") or {}).get("waypoints"),
                "trust": "user_supplied_plan",
                "items": items,
                "quality": source_quality(items, "static_route"),
            }
        )

    cmd_rows = ((mission.get("messages") or {}).get("CMD") or [])
    if cmd_rows:
        items = dedupe_cmd_items(cmd_rows)
        sources.append(
            {
                "id": "onboard_cmd",
                "label": "DataFlash CMD accepted mission",
                "source_file": mission.get("source_file"),
                "trust": "flight_controller_log",
                "items": items,
                "quality": source_quality(items, "logged_route"),
                "events": [cmd_item(row, index) for index, row in enumerate(cmd_rows)],
            }
        )

    sources.append(
        {
            "id": "tlog_mission",
            "label": "TLog MAVLink mission",
            "source_file": None,
            "trust": "future_tlog_extract",
            "items": [],
            "quality": source_quality([], "not_extracted_yet"),
            "notes": [
                "Reserved for MISSION_ITEM_INT/MISSION_ITEM reconstruction and MISSION_CURRENT sequence history.",
                "This source can be incomplete when the ground station link is lost; manual overrides must remain available.",
            ],
        }
    )
    return sources


def default_overrides() -> dict[str, Any]:
    return {
        "schema_version": 1,
        "global_source": "auto",
        "rules": [],
        "notes": [
            "Manual rules override automatic mission source selection by time range.",
            "Use source_id values such as external_wp, onboard_cmd, or tlog_mission.",
            "Set seq only when overriding the current mission item; leave seq null to override route source only.",
        ],
        "example_rule": {
            "start_s": 120.0,
            "end_s": 350.0,
            "source_id": "onboard_cmd",
            "seq": 4,
            "label": "GCS link lost; trust onboard CMD",
        },
    }


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--mission", type=Path, default=DEFAULT_MISSION)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--overrides", type=Path, default=DEFAULT_OVERRIDES)
    args = parser.parse_args()

    summary = read_json_optional(args.summary)
    mission = read_json_optional(args.mission)
    sources = build_sources(summary, mission)
    payload = {
        "schema_version": 1,
        "selection_policy": {
            "display_order": ["manual_override", "user_selected_source", "auto_suggested_source", "missing"],
            "default_global_source": "auto",
            "auto_notes": [
                "Auto is only a suggestion and should not hide user-selected source/sequence overrides.",
                "TLog mission data can be incomplete across ground-station link loss.",
            ],
        },
        "sources": sources,
    }
    write_json(args.output, payload)

    if not args.overrides.exists():
        write_json(args.overrides, default_overrides())

    print(f"Wrote {args.output}")
    print(f"Sources: {', '.join(source['id'] for source in sources)}")
    print(f"Override file: {args.overrides}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
