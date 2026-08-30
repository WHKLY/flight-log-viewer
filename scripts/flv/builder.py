"""Top-level dataset builder."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from flv.common import SERIES_GROUPS, TARGET_MESSAGES, write_json
from flv.io.discover import discover_dataset
from flv.normalize.firmware import compatibility_profile, detect_firmware
from flv.normalize.mission import build_mission_domain
from flv.normalize.modes import build_mode_domain, time_range_from_rows
from flv.normalize.parameters import build_parameter_domain
from flv.normalize.signals import build_signal_catalog
from flv.parsers.dataflash import extract_dataflash
from flv.parsers.param_file import parse_param_file
from flv.parsers.qgc_waypoints import parse_waypoints_file


def source_id(kind: str, path: Path | None) -> str | None:
    if path is None:
        return None
    safe = "".join(ch if ch.isalnum() else "_" for ch in path.stem).strip("_").lower()
    return f"{kind}_{safe}" if safe else kind


def source_registry(discovery: dict[str, Any], selected: dict[str, Path | None]) -> dict[str, Any]:
    sources: dict[str, dict[str, Any]] = {}
    definitions = [
        ("dataflash", "bin_log", selected.get("bin")),
        ("onboard_cmd", "dataflash_cmd", selected.get("bin")),
        ("tlog_mission", "tlog", selected.get("tlog")),
        ("param_file", "param_file", selected.get("param")),
        ("external_waypoints", "waypoint_file", selected.get("waypoints")),
    ]
    for kind, source_kind, path in definitions:
        sid = source_id(kind, path)
        if sid is None:
            continue
        sources[sid] = {
            "id": sid,
            "kind": source_kind,
            "file": path.name,
            "available": True,
            "status": "direct",
        }
    if selected.get("bin"):
        sid = source_id("dataflash_params", selected.get("bin"))
        sources[sid] = {
            "id": sid,
            "kind": "dataflash_parm",
            "file": selected["bin"].name,
            "available": True,
            "status": "direct",
        }
    sources["parameter_merged"] = {
        "id": "parameter_merged",
        "kind": "parameter_merge",
        "file": None,
        "available": bool(selected.get("bin") or selected.get("param")),
        "status": "derived",
    }
    return {
        "schema_version": 1,
        "dataset_root": str(discovery["root"]),
        "sources": sources,
        "manual_selection": {
            "mission_route": "manual_first",
            "mission_current": "manual_first",
            "parameters": "manual_first",
        },
    }


def selected_files_payload(discovery: dict[str, Any], selected: dict[str, Path | None]) -> dict[str, Any]:
    by_suffix = discovery["by_suffix"]
    return {
        "bin": selected["bin"].name if selected["bin"] else None,
        "tlog": selected["tlog"].name if selected["tlog"] else None,
        "param": selected["param"].name if selected["param"] else None,
        "waypoints": selected["waypoints"].name if selected["waypoints"] else None,
        "bin_logs": [path.name for path in by_suffix.get(".bin", [])],
        "tlogs": [path.name for path in by_suffix.get(".tlog", [])],
        "rlogs": [path.name for path in by_suffix.get(".rlog", [])],
    }


def build_dataset(dataset: Path, output: Path) -> dict[str, Any]:
    discovery = discover_dataset(dataset)
    selected = discovery["selected"]
    output = output.expanduser().resolve()

    rows, dataflash_meta = extract_dataflash(selected["bin"], TARGET_MESSAGES)
    firmware = detect_firmware(rows.get("MSG", []))
    profile = compatibility_profile(firmware)
    time_range = time_range_from_rows(rows)
    mode_domain = build_mode_domain(rows.get("MODE", []), time_range, str(firmware.get("vehicle") or "unknown"))
    file_params = parse_param_file(selected["param"])
    waypoints = parse_waypoints_file(selected["waypoints"])
    registry = source_registry(discovery, selected)
    source_ids = {
        "dataflash": source_id("dataflash", selected["bin"]),
        "dataflash_params": source_id("dataflash_params", selected["bin"]),
        "param_file": source_id("param_file", selected["param"]),
        "external_waypoints": source_id("external_waypoints", selected["waypoints"]),
        "onboard_cmd": source_id("onboard_cmd", selected["bin"]),
        "tlog_mission": source_id("tlog_mission", selected["tlog"]),
    }
    parameter_domain = build_parameter_domain(file_params, rows.get("PARM", []), source_ids)
    mission_domain = build_mission_domain(waypoints, rows.get("CMD", []), selected["tlog"], source_ids)
    signals = build_signal_catalog(rows, dataflash_meta["target_formats"], source_ids["dataflash"])

    output.mkdir(parents=True, exist_ok=True)
    (output / "domains").mkdir(parents=True, exist_ok=True)
    (output / "series").mkdir(parents=True, exist_ok=True)

    for group_name, message_names in SERIES_GROUPS.items():
        write_json(
            output / "series" / f"{group_name}.json",
            {
                "schema_version": 1,
                "source_id": source_ids["dataflash"],
                "messages": {name: rows.get(name, []) for name in message_names},
            },
        )

    write_json(output / "sources.json", registry)
    write_json(output / "signals.json", {"schema_version": 1, **signals})
    write_json(output / "domains" / "modes.json", {"schema_version": 1, **mode_domain})
    write_json(output / "domains" / "mission.json", {"schema_version": 1, **mission_domain})
    write_json(output / "domains" / "parameters.json", {"schema_version": 1, **parameter_domain})
    write_json(output / "domains" / "track.json", {"schema_version": 1, "source_id": source_ids["dataflash"], "position_messages": ["POS", "GPS"], "attitude_messages": ["ATT", "AHR2", "XKQ"]})
    write_json(output / "domains" / "control.json", {"schema_version": 1, "source": "profile_required", "layers": ["mission", "navigation", "l1", "attitude_rate", "tecs", "output", "motion"]})

    counts = {
        "files": len(discovery["files"]),
        "dataflash_records": sum(dataflash_meta["target_counts"].values()),
        "parameters": parameter_domain["counts"]["merged"],
        "dataflash_parameter_records": parameter_domain["counts"]["dataflash_records"],
        "mission_sources": [source["id"] for source in mission_domain["sources"]],
        "signals": signals["counts"]["signals"],
        "numeric_signals": signals["counts"]["numeric_signals"],
    }
    dataset_payload = {
        "schema_version": 1,
        "dataset": {
            "id": discovery["root"].name,
            "label": discovery["root"].name,
            "root": str(discovery["root"]),
            "time_range": time_range,
        },
        "files": discovery["file_summaries"],
        "selected_files": selected_files_payload(discovery, selected),
        "duplicate_groups": discovery["duplicates"],
        "firmware": firmware,
        "compatibility_profile": profile,
        "dataflash": dataflash_meta,
        "counts": counts,
        "outputs": {
            "sources": "sources.json",
            "signals": "signals.json",
            "domains": "domains",
            "series": "series",
        },
        "warnings": compatibility_warnings(firmware, profile, selected),
    }
    write_json(output / "dataset.json", dataset_payload)
    return dataset_payload


def compatibility_warnings(firmware: dict[str, Any], profile: dict[str, Any], selected: dict[str, Path | None]) -> list[dict[str, str]]:
    warnings: list[dict[str, str]] = []
    if firmware.get("confidence") != "high":
        warnings.append({"code": "firmware_unknown", "severity": "info", "message": "Firmware was not detected from DataFlash MSG records."})
    if profile.get("confidence") != "source-matched":
        warnings.append({"code": "generic_profile", "severity": "info", "message": "Using a generic compatibility profile; formulas must be treated as conceptual."})
    if selected.get("tlog") is None:
        warnings.append({"code": "tlog_missing", "severity": "info", "message": "No tlog selected; tlog mission route/current events are unavailable."})
    if selected.get("param") is None:
        warnings.append({"code": "param_file_missing", "severity": "info", "message": "No .param file selected; parameters are sourced from DataFlash PARM when available."})
    return warnings

