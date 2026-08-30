#!/usr/bin/env python3
"""Build mission source candidates for viewer mission-task selection."""

from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path
from typing import Any, Iterable


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SUMMARY = PROJECT_ROOT / "public-data" / "dataset-summary.json"
DEFAULT_MISSION = PROJECT_ROOT / "public-data" / "series" / "mission.json"
DEFAULT_OUTPUT = PROJECT_ROOT / "public-data" / "series" / "mission-sources.json"
DEFAULT_OVERRIDES = PROJECT_ROOT / "project-data" / "mission-overrides.json"
DEFAULT_MODES = PROJECT_ROOT / "public-data" / "series" / "modes.json"

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


# CRC extras for the mission-related MAVLink common messages decoded here.
# The scanner validates these frames so payload bytes are not mistaken for MAVLink frames.
MAVLINK_CRC_EXTRA = {
    39: 254,  # MISSION_ITEM
    40: 230,  # MISSION_REQUEST
    41: 28,  # MISSION_SET_CURRENT
    42: 28,  # MISSION_CURRENT
    43: 132,  # MISSION_REQUEST_LIST
    44: 221,  # MISSION_COUNT
    45: 232,  # MISSION_CLEAR_ALL
    46: 11,  # MISSION_ITEM_REACHED
    47: 153,  # MISSION_ACK
    51: 196,  # MISSION_REQUEST_INT
    73: 38,  # MISSION_ITEM_INT
}

MAVLINK_MESSAGE_NAMES = {
    39: "MISSION_ITEM",
    40: "MISSION_REQUEST",
    41: "MISSION_SET_CURRENT",
    42: "MISSION_CURRENT",
    43: "MISSION_REQUEST_LIST",
    44: "MISSION_COUNT",
    45: "MISSION_CLEAR_ALL",
    46: "MISSION_ITEM_REACHED",
    47: "MISSION_ACK",
    51: "MISSION_REQUEST_INT",
    73: "MISSION_ITEM_INT",
}


def x25_crc(data: bytes) -> int:
    crc = 0xFFFF
    for byte in data:
        tmp = byte ^ (crc & 0xFF)
        tmp = (tmp ^ (tmp << 4)) & 0xFF
        crc = ((crc >> 8) ^ (tmp << 8) ^ (tmp << 3) ^ (tmp >> 4)) & 0xFFFF
    return crc


def valid_mavlink_crc(data: bytes, offset: int, payload_len: int, msg_id: int, version: int) -> bool:
    extra = MAVLINK_CRC_EXTRA.get(msg_id)
    if extra is None:
        return False
    if version == 1:
        crc_start = offset + 1
        crc_end = offset + 6 + payload_len
    else:
        crc_start = offset + 1
        crc_end = offset + 10 + payload_len
    if crc_end + 2 > len(data):
        return False
    expected = struct.unpack_from("<H", data, crc_end)[0]
    actual = x25_crc(data[crc_start:crc_end] + bytes([extra]))
    return expected == actual


def tlog_timestamp_s(data: bytes, frame_offset: int) -> float | None:
    if frame_offset < 8:
        return None
    value = int.from_bytes(data[frame_offset - 8 : frame_offset], "big")
    if 1_500_000_000_000_000 <= value <= 2_200_000_000_000_000:
        return value / 1_000_000.0
    return None


def iter_mavlink_mission_frames(path: Path) -> Iterable[dict[str, Any]]:
    data = path.read_bytes()
    first_timestamp: float | None = None
    offset = 0
    while offset < len(data):
        marker = data[offset]
        frame: dict[str, Any] | None = None
        if marker == 0xFE and offset + 8 <= len(data):
            payload_len = data[offset + 1]
            frame_len = 6 + payload_len + 2
            if offset + frame_len <= len(data):
                msg_id = data[offset + 5]
                if valid_mavlink_crc(data, offset, payload_len, msg_id, 1):
                    timestamp = tlog_timestamp_s(data, offset)
                    if timestamp is not None and first_timestamp is None:
                        first_timestamp = timestamp
                    frame = {
                        "message_id": msg_id,
                        "name": MAVLINK_MESSAGE_NAMES.get(msg_id, f"MAVLINK_MSG_ID_{msg_id}"),
                        "payload": data[offset + 6 : offset + 6 + payload_len],
                        "payload_len": payload_len,
                        "protocol": "mavlink1",
                        "offset": offset,
                        "tlog_unix_s": timestamp,
                        "tlog_time_s": timestamp - first_timestamp if timestamp is not None and first_timestamp is not None else None,
                    }
        elif marker == 0xFD and offset + 12 <= len(data):
            payload_len = data[offset + 1]
            signature_len = 13 if data[offset + 2] & 0x01 else 0
            frame_len = 10 + payload_len + 2 + signature_len
            if offset + frame_len <= len(data):
                msg_id = data[offset + 7] | (data[offset + 8] << 8) | (data[offset + 9] << 16)
                if valid_mavlink_crc(data, offset, payload_len, msg_id, 2):
                    timestamp = tlog_timestamp_s(data, offset)
                    if timestamp is not None and first_timestamp is None:
                        first_timestamp = timestamp
                    frame = {
                        "message_id": msg_id,
                        "name": MAVLINK_MESSAGE_NAMES.get(msg_id, f"MAVLINK_MSG_ID_{msg_id}"),
                        "payload": data[offset + 10 : offset + 10 + payload_len],
                        "payload_len": payload_len,
                        "protocol": "mavlink2",
                        "offset": offset,
                        "tlog_unix_s": timestamp,
                        "tlog_time_s": timestamp - first_timestamp if timestamp is not None and first_timestamp is not None else None,
                    }
        if frame is not None:
            yield frame
            offset += 6 + frame["payload_len"] + 2 if frame["protocol"] == "mavlink1" else 10 + frame["payload_len"] + 2 + (13 if data[offset + 2] & 0x01 else 0)
            continue
        next_v1 = data.find(b"\xfe", offset + 1)
        next_v2 = data.find(b"\xfd", offset + 1)
        candidates = [candidate for candidate in (next_v1, next_v2) if candidate >= 0]
        offset = min(candidates) if candidates else len(data)


def padded_payload(payload: bytes, size: int) -> bytes:
    return payload + b"\x00" * max(0, size - len(payload))


def tlog_item(frame: dict[str, Any]) -> dict[str, Any] | None:
    payload = frame["payload"]
    msg_id = frame["message_id"]
    if msg_id == 73 and len(payload) >= 4:
        padded = padded_payload(payload, 38)
        param1, param2, param3, param4, x, y, z, seq, command, target_system, target_component, mav_frame, current, autocontinue = struct.unpack_from("<ffffiifHHBBBBB", padded)
        mission_type = padded[37] if len(padded) > 37 else 0
        lat = x * 1.0e-7
        lon = y * 1.0e-7
        source_message = "MISSION_ITEM_INT"
    elif msg_id == 39 and len(payload) >= 4:
        padded = padded_payload(payload, 37)
        param1, param2, param3, param4, lat, lon, z, seq, command, target_system, target_component, mav_frame, current, autocontinue = struct.unpack_from("<fffffffHHBBBBB", padded)
        mission_type = 0
        source_message = "MISSION_ITEM"
    else:
        return None
    return {
        "seq": int(seq),
        "source_seq": int(seq),
        "command": int(command),
        "command_name": command_name(command),
        "frame": int(mav_frame),
        "current": int(current),
        "autocontinue": int(autocontinue),
        "params": [param1, param2, param3, param4],
        "lat": lat,
        "lon": lon,
        "alt": z,
        "time_s": frame.get("time_s"),
        "tlog_time_s": frame.get("tlog_time_s"),
        "tlog_unix_s": frame.get("tlog_unix_s"),
        "target_system": int(target_system),
        "target_component": int(target_component),
        "mission_type": int(mission_type),
        "source": "tlog_mission",
        "source_message": source_message,
    }


def tlog_seq_event(frame: dict[str, Any]) -> dict[str, Any] | None:
    msg_id = frame["message_id"]
    payload = frame["payload"]
    if msg_id not in {41, 42, 46} or not payload:
        return None
    seq = struct.unpack_from("<H", padded_payload(payload, 2))[0]
    event = {
        "seq": int(seq),
        "time_s": frame.get("time_s"),
        "tlog_time_s": frame.get("tlog_time_s"),
        "tlog_unix_s": frame.get("tlog_unix_s"),
        "source": "tlog_mission",
        "source_message": MAVLINK_MESSAGE_NAMES.get(msg_id, f"MAVLINK_MSG_ID_{msg_id}"),
    }
    if msg_id == 42 and len(payload) >= 4:
        event["total"] = struct.unpack_from("<H", padded_payload(payload, 4), 2)[0]
    return event


def tlog_count_event(frame: dict[str, Any]) -> dict[str, Any] | None:
    if frame["message_id"] != 44 or not frame["payload"]:
        return None
    payload = padded_payload(frame["payload"], 2)
    return {
        "count": int(struct.unpack_from("<H", payload)[0]),
        "time_s": frame.get("time_s"),
        "tlog_time_s": frame.get("tlog_time_s"),
        "tlog_unix_s": frame.get("tlog_unix_s"),
        "source_message": "MISSION_COUNT",
    }


def dedupe_latest_by_seq(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    latest: dict[int, dict[str, Any]] = {}
    order: list[int] = []
    for item in items:
        seq = int(item.get("seq") or 0)
        if seq not in latest:
            order.append(seq)
        latest[seq] = item
    return [latest[seq] for seq in sorted(order)]


def first_auto_start(modes: dict[str, Any]) -> float | None:
    for segment in modes.get("segments") or []:
        if segment.get("name") == "AUTO":
            start = finite_number(segment.get("start_s"))
            if start is not None:
                return start
    return None


def infer_tlog_time_offset(events: list[dict[str, Any]], modes: dict[str, Any]) -> tuple[float | None, str]:
    auto_start = first_auto_start(modes)
    first_active = next((event for event in events if finite_number(event.get("tlog_time_s")) is not None and int(event.get("seq") or 0) > 0), None)
    if auto_start is not None and first_active:
        return auto_start - float(first_active["tlog_time_s"]), "first MISSION_CURRENT seq>0 aligned to first AUTO segment start"
    return None, "unaligned tlog-relative time"


def apply_tlog_time_alignment(rows: list[dict[str, Any]], offset: float | None) -> None:
    for row in rows:
        tlog_time = finite_number(row.get("tlog_time_s"))
        aligned = tlog_time + offset if tlog_time is not None and offset is not None else tlog_time
        row["time_s"] = max(0.0, aligned) if aligned is not None else None


def extract_tlog_mission(path: Path | None, modes: dict[str, Any]) -> dict[str, Any] | None:
    if path is None or not path.exists():
        return None
    raw_items: list[dict[str, Any]] = []
    events: list[dict[str, Any]] = []
    count_events: list[dict[str, Any]] = []
    message_counts: dict[str, int] = {}
    for frame in iter_mavlink_mission_frames(path):
        name = frame["name"]
        message_counts[name] = message_counts.get(name, 0) + 1
        item = tlog_item(frame)
        if item:
            raw_items.append(item)
        event = tlog_seq_event(frame)
        if event:
            events.append(event)
        count_event = tlog_count_event(frame)
        if count_event:
            count_events.append(count_event)

    offset, alignment = infer_tlog_time_offset(events, modes)
    apply_tlog_time_alignment(raw_items, offset)
    apply_tlog_time_alignment(events, offset)
    apply_tlog_time_alignment(count_events, offset)
    items = dedupe_latest_by_seq(raw_items)
    observed_count = max((event["count"] for event in count_events), default=None)
    max_seq = max((int(event.get("seq") or 0) for event in events), default=-1)
    expected_count = observed_count if observed_count is not None else max_seq + 1 if max_seq >= 0 else None
    route_complete = expected_count is not None and len(items) >= expected_count
    return {
        "items": items,
        "events": events,
        "counts": count_events,
        "message_counts": dict(sorted(message_counts.items())),
        "alignment": {"offset_s": offset, "method": alignment},
        "quality": source_quality(items, "tlog_route") | {
            "event_count": len(events),
            "mission_count": observed_count,
            "max_current_seq": max_seq if max_seq >= 0 else None,
            "route_complete": route_complete,
            "raw_item_count": len(raw_items),
        },
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
    seq_value = finite_number(row.get("CNum"))
    command_value = finite_number(row.get("CId"))
    seq = int(seq_value) if seq_value is not None else index
    command = int(command_value) if command_value is not None else 0
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


def latest_items_by_seq(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    latest_by_seq: dict[int, dict[str, Any]] = {}
    for index, row in enumerate(rows):
        item = cmd_item(row, index)
        latest_by_seq[item["seq"]] = item
    return [latest_by_seq[seq] for seq in sorted(latest_by_seq)]


def route_complete(items: list[dict[str, Any]], total: int | None) -> bool:
    if total is None or total <= 0:
        return False
    seqs = {int(item["seq"]) for item in items}
    return all(seq in seqs for seq in range(total))


def cmd_route_versions(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: list[list[dict[str, Any]]] = []
    current: list[dict[str, Any]] = []
    for row in rows:
        cnum = int(finite_number(row.get("CNum")) or 0)
        if cnum == 0:
            if current:
                groups.append(current)
            current = [row]
        elif current:
            current.append(row)
    if current:
        groups.append(current)

    versions: list[dict[str, Any]] = []
    for group in groups:
        total = int(finite_number(group[0].get("CTot")) or 0)
        items = latest_items_by_seq(group)
        versions.append(
            {
                "start_s": finite_number(group[0].get("time_s")),
                "end_s": None,
                "total": total or None,
                "complete": route_complete(items, total),
                "items": items,
            }
        )
    versions = [version for version in versions if version["items"]]
    versions.sort(key=lambda version: version.get("start_s") if version.get("start_s") is not None else -1)
    for index, version in enumerate(versions[:-1]):
        version["end_s"] = versions[index + 1].get("start_s")
    return versions


def dedupe_cmd_items(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    versions = cmd_route_versions(rows)
    complete_versions = [version for version in versions if version.get("complete")]
    if complete_versions:
        return complete_versions[-1]["items"]
    if versions:
        return versions[-1]["items"]
    return latest_items_by_seq(rows)


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


def build_sources(summary: dict[str, Any], mission: dict[str, Any], tlog_mission: dict[str, Any] | None = None) -> list[dict[str, Any]]:
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
        versions = cmd_route_versions(cmd_rows)
        items = dedupe_cmd_items(cmd_rows)
        quality = source_quality(items, "logged_route") | {
            "version_count": len(versions),
            "complete_version_count": len([version for version in versions if version.get("complete")]),
            "latest_total": versions[-1].get("total") if versions else None,
            "route_complete": bool(versions and versions[-1].get("complete")),
        }
        sources.append(
            {
                "id": "onboard_cmd",
                "label": "DataFlash CMD accepted mission",
                "source_file": mission.get("source_file"),
                "trust": "flight_controller_log",
                "items": items,
                "versions": versions,
                "quality": quality,
                "events": [cmd_item(row, index) for index, row in enumerate(cmd_rows)],
            }
        )

    tlog_items = tlog_mission.get("items", []) if tlog_mission else []
    tlog_events = tlog_mission.get("events", []) if tlog_mission else []
    tlog_quality = tlog_mission.get("quality") if tlog_mission else source_quality([], "not_extracted")
    sources.append(
        {
            "id": "tlog_mission",
            "label": "TLog MAVLink mission",
            "source_file": tlog_mission.get("source_file") if tlog_mission else None,
            "trust": "ground_station_link_log",
            "items": tlog_items,
            "events": tlog_events,
            "counts": tlog_mission.get("counts", []) if tlog_mission else [],
            "quality": tlog_quality,
            "message_counts": tlog_mission.get("message_counts", {}) if tlog_mission else {},
            "alignment": tlog_mission.get("alignment") if tlog_mission else {"offset_s": None, "method": "not extracted"},
            "notes": [
                "Decoded from CRC-valid MISSION_ITEM_INT/MISSION_ITEM and MISSION_CURRENT frames in the tlog.",
                "This source can be incomplete when the ground station link is lost; manual source and sequence overrides remain available.",
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


def first_existing_dataset_file(summary: dict[str, Any], suffix_key: str) -> Path | None:
    dataset_raw = summary.get("dataset")
    names = (summary.get("selected_files") or {}).get(suffix_key) or []
    if not dataset_raw or not names:
        return None
    dataset = Path(dataset_raw)
    for name in names:
        path = dataset / name
        if path.exists():
            return path
    return None


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--summary", type=Path, default=DEFAULT_SUMMARY)
    parser.add_argument("--mission", type=Path, default=DEFAULT_MISSION)
    parser.add_argument("--modes", type=Path, default=DEFAULT_MODES)
    parser.add_argument("--tlog", type=Path, default=None)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--overrides", type=Path, default=DEFAULT_OVERRIDES)
    args = parser.parse_args()

    summary = read_json_optional(args.summary)
    mission = read_json_optional(args.mission)
    modes = read_json_optional(args.modes)
    tlog_path = args.tlog or first_existing_dataset_file(summary, "tlogs")
    tlog_mission = extract_tlog_mission(tlog_path, modes) if tlog_path else None
    if tlog_mission is not None:
        tlog_mission["source_file"] = tlog_path.name
    sources = build_sources(summary, mission, tlog_mission)
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
