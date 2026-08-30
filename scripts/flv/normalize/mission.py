"""Mission source normalization."""

from __future__ import annotations

from typing import Any

from flv.common import command_name, finite_number
from flv.parsers.tlog import iter_mavlink_mission_frames, tlog_count_event, tlog_item, tlog_seq_event


def mission_item_from_waypoint(row: dict[str, Any], source_id: str) -> dict[str, Any]:
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
        "source_id": source_id,
        "status": "direct",
    }


def mission_item_from_cmd(row: dict[str, Any], index: int, source_id: str) -> dict[str, Any]:
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
        "source_id": source_id,
        "status": "direct",
    }


def latest_items_by_seq(rows: list[dict[str, Any]], source_id: str) -> list[dict[str, Any]]:
    latest: dict[int, dict[str, Any]] = {}
    for index, row in enumerate(rows):
        item = mission_item_from_cmd(row, index, source_id)
        latest[item["seq"]] = item
    return [latest[seq] for seq in sorted(latest)]


def route_complete(items: list[dict[str, Any]], total: int | None) -> bool:
    if total is None or total <= 0:
        return False
    seqs = {int(item["seq"]) for item in items}
    return all(seq in seqs for seq in range(total))


def cmd_route_versions(rows: list[dict[str, Any]], source_id: str) -> list[dict[str, Any]]:
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
        items = latest_items_by_seq(group, source_id)
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


def source_quality(items: list[dict[str, Any]], kind: str) -> dict[str, Any]:
    timed = [float(item["time_s"]) for item in items if item.get("time_s") is not None]
    located = [item for item in items if item.get("lat") is not None and item.get("lon") is not None]
    return {
        "kind": kind,
        "item_count": len(items),
        "located_count": len(located),
        "has_timing": bool(timed),
        "time_range": {"start_s": min(timed), "end_s": max(timed)} if timed else None,
    }


def build_tlog_mission(path: Any) -> dict[str, Any] | None:
    if path is None:
        return None
    raw_items: list[dict[str, Any]] = []
    events: list[dict[str, Any]] = []
    count_events: list[dict[str, Any]] = []
    message_counts: dict[str, int] = {}
    for frame in iter_mavlink_mission_frames(path):
        message_counts[frame["name"]] = message_counts.get(frame["name"], 0) + 1
        item = tlog_item(frame)
        if item:
            raw_items.append(item)
        event = tlog_seq_event(frame)
        if event:
            events.append(event)
        count = tlog_count_event(frame)
        if count:
            count_events.append(count)

    latest: dict[int, dict[str, Any]] = {}
    for item in raw_items:
        latest[int(item["seq"])] = item
    items = [latest[seq] for seq in sorted(latest)]
    observed_count = max((int(event["count"]) for event in count_events), default=None)
    max_seq = max((int(event.get("seq") or 0) for event in events), default=-1)
    return {
        "source_file": path.name,
        "items": items,
        "events": events,
        "counts": count_events,
        "message_counts": dict(sorted(message_counts.items())),
        "quality": source_quality(items, "tlog_route")
        | {
            "event_count": len(events),
            "mission_count": observed_count,
            "max_current_seq": max_seq if max_seq >= 0 else None,
            "route_complete": observed_count is not None and len(items) >= observed_count,
            "raw_item_count": len(raw_items),
        },
    }


def build_mission_domain(waypoints: list[dict[str, Any]], cmd_rows: list[dict[str, Any]], tlog_path: Any, source_ids: dict[str, str | None]) -> dict[str, Any]:
    sources: list[dict[str, Any]] = []
    external_source_id = source_ids.get("external_waypoints")
    if waypoints and external_source_id:
        items = [mission_item_from_waypoint(row, external_source_id) for row in waypoints]
        sources.append(
            {
                "id": external_source_id,
                "kind": "external_waypoints",
                "label": "External waypoint file",
                "trust": "user_supplied_plan",
                "route_versions": [{"start_s": None, "end_s": None, "complete": True, "items": items}],
                "current_events": [],
                "items": items,
                "quality": source_quality(items, "static_route"),
            }
        )

    onboard_source_id = source_ids.get("onboard_cmd")
    if cmd_rows and onboard_source_id:
        versions = cmd_route_versions(cmd_rows, onboard_source_id)
        complete_versions = [version for version in versions if version.get("complete")]
        items = complete_versions[-1]["items"] if complete_versions else versions[-1]["items"] if versions else latest_items_by_seq(cmd_rows, onboard_source_id)
        sources.append(
            {
                "id": onboard_source_id,
                "kind": "dataflash_cmd",
                "label": "DataFlash CMD accepted mission",
                "trust": "flight_controller_log",
                "route_versions": versions,
                "current_events": [mission_item_from_cmd(row, index, onboard_source_id) for index, row in enumerate(cmd_rows)],
                "items": items,
                "quality": source_quality(items, "logged_route")
                | {
                    "version_count": len(versions),
                    "complete_version_count": len(complete_versions),
                    "latest_total": versions[-1].get("total") if versions else None,
                    "route_complete": bool(versions and versions[-1].get("complete")),
                },
            }
        )

    tlog_source_id = source_ids.get("tlog_mission")
    tlog_mission = build_tlog_mission(tlog_path)
    if tlog_source_id:
        sources.append(
            {
                "id": tlog_source_id,
                "kind": "tlog_mission",
                "label": "TLog MAVLink mission",
                "trust": "ground_station_link_log",
                "route_versions": [{"start_s": None, "end_s": None, "complete": bool(tlog_mission and tlog_mission["items"]), "items": tlog_mission["items"] if tlog_mission else []}],
                "current_events": tlog_mission["events"] if tlog_mission else [],
                "items": tlog_mission["items"] if tlog_mission else [],
                "counts": tlog_mission["counts"] if tlog_mission else [],
                "message_counts": tlog_mission["message_counts"] if tlog_mission else {},
                "quality": tlog_mission["quality"] if tlog_mission else source_quality([], "not_extracted"),
                "notes": ["TLog can be incomplete after ground-station link loss; keep manual source selection available."],
            }
        )

    return {
        "selection_policy": {
            "route_source": "manual_first",
            "current_task_source": "manual_first",
            "auto_is_suggestion_only": True,
        },
        "sources": sources,
    }

