#!/usr/bin/env python3
"""Build a source-aware parameter domain from .param, DataFlash and tlog files."""

from __future__ import annotations

import argparse
import json
import math
import struct
from pathlib import Path
from typing import Any

try:
    from scripts.extract_dataflash_series import extract_dataflash
    from scripts.mavlink_frames import iter_mavlink_frames
    from scripts.summarize_dataset import parse_param_file, stringify_param_value
except ModuleNotFoundError:  # pragma: no cover - direct script execution.
    from extract_dataflash_series import extract_dataflash
    from mavlink_frames import iter_mavlink_frames
    from summarize_dataset import parse_param_file, stringify_param_value


PARAM_MESSAGE_IDS = {20, 21, 22, 23, 320, 321, 322, 323, 324}
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = PROJECT_ROOT / "data" / "raw" / "qq-2026-08-17"
DEFAULT_OUTPUT = PROJECT_ROOT / "public-data" / "domains" / "parameters.json"


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def relative_name(path: Path, dataset: Path) -> str:
    try:
        return path.relative_to(dataset).as_posix()
    except ValueError:
        return path.name


def decode_name(raw: bytes) -> str:
    return raw.split(b"\0", 1)[0].decode("utf-8", errors="replace").strip()


def source_quality(values: dict[str, str], *, declared: int | None = None, indices: set[int] | None = None) -> dict[str, Any]:
    observed_indices = len(indices or ())
    complete = declared is not None and declared > 0 and observed_indices >= declared
    return {
        "parameter_count": len(values),
        "declared_count": declared,
        "observed_indices": observed_indices or None,
        "complete": complete if declared is not None else None,
    }


def param_file_source(path: Path, dataset: Path) -> dict[str, Any]:
    values = parse_param_file(path)
    source_file = relative_name(path, dataset)
    return {
        "id": f"param_file:{source_file}",
        "kind": "param_file",
        "label": f"参数文件 · {source_file}",
        "source_file": source_file,
        "system_id": None,
        "component_id": None,
        "values": dict(sorted(values.items())),
        "timeline": [],
        "quality": source_quality(values),
    }


def dataflash_source(path: Path, dataset: Path) -> dict[str, Any] | None:
    rows, _metadata = extract_dataflash(path)
    values: dict[str, str] = {}
    timeline: list[dict[str, Any]] = []
    for row in rows.get("PARM", []):
        name = str(row.get("Name", "")).strip()
        if not name or "Value" not in row:
            continue
        value = stringify_param_value(row["Value"])
        values[name] = value
        timeline.append({
            "time_s": finite(row.get("time_s")),
            "name": name,
            "value": value,
            "default": stringify_param_value(row["Default"]) if "Default" in row else None,
        })
    if not values:
        return None
    timeline.sort(key=lambda item: (item["time_s"] if item["time_s"] is not None else -1.0, item["name"]))
    source_file = relative_name(path, dataset)
    return {
        "id": f"dataflash:{source_file}",
        "kind": "dataflash",
        "label": f"DataFlash · {source_file}",
        "source_file": source_file,
        "system_id": None,
        "component_id": None,
        "values": dict(sorted(values.items())),
        "timeline": timeline,
        "quality": source_quality(values) | {"record_count": len(timeline), "time_aligned": True},
    }


def decode_ext_value(raw: bytes, param_type: int) -> str:
    """Decode PARAM_EXT_VALUE, accepting both printable and union-style senders."""
    trimmed = raw.split(b"\0", 1)[0]
    if trimmed and all(byte in b"\t\r\n" or 32 <= byte < 127 for byte in trimmed):
        return trimmed.decode("utf-8", errors="replace").strip()
    formats = {1: "<B", 2: "<b", 3: "<H", 4: "<h", 5: "<I", 6: "<i", 7: "<Q", 8: "<q", 9: "<f", 10: "<d"}
    pattern = formats.get(param_type)
    if pattern and len(raw) >= struct.calcsize(pattern):
        return stringify_param_value(struct.unpack_from(pattern, raw)[0])
    return trimmed.hex()


def classic_param_value(frame: dict[str, Any]) -> dict[str, Any] | None:
    payload = frame["payload"]
    if len(payload) < 24:
        return None
    value, count, index = struct.unpack_from("<fHH", payload)
    name = decode_name(payload[8:24])
    if not name:
        return None
    return {
        "name": name,
        "value": stringify_param_value(value),
        "param_type": payload[24] if len(payload) > 24 else None,
        "count": int(count),
        "index": int(index),
    }


def extended_param_value(frame: dict[str, Any]) -> dict[str, Any] | None:
    payload = frame["payload"]
    if len(payload) < 20:
        return None
    count, index = struct.unpack_from("<HH", payload)
    name = decode_name(payload[4:20])
    if not name:
        return None
    value_bytes = payload[20:148].ljust(128, b"\0")
    param_type = payload[148] if len(payload) > 148 else 0
    return {
        "name": name,
        "value": decode_ext_value(value_bytes, param_type),
        "param_type": int(param_type),
        "count": int(count),
        "index": int(index),
    }


def tlog_sources(path: Path, dataset: Path) -> list[dict[str, Any]]:
    streams: dict[tuple[int, int], dict[str, Any]] = {}
    for frame in iter_mavlink_frames(path, PARAM_MESSAGE_IDS):
        key = (int(frame["system_id"]), int(frame["component_id"]))
        stream = streams.setdefault(key, {
            "values": {}, "timeline": [], "indices": set(), "declared": None, "message_counts": {},
        })
        name = frame["name"]
        stream["message_counts"][name] = stream["message_counts"].get(name, 0) + 1
        record = classic_param_value(frame) if frame["message_id"] == 22 else extended_param_value(frame) if frame["message_id"] == 322 else None
        if record is None:
            continue
        stream["values"][record["name"]] = record["value"]
        if record["index"] < 65535:
            stream["indices"].add(record["index"])
        stream["declared"] = max(stream["declared"] or 0, record["count"])
        stream["timeline"].append({
            "time_s": frame.get("tlog_time_s"),
            "unix_s": frame.get("tlog_unix_s"),
            "name": record["name"],
            "value": record["value"],
            "param_type": record["param_type"],
            "index": record["index"],
            "source_message": name,
        })

    source_file = relative_name(path, dataset)
    sources: list[dict[str, Any]] = []
    for (system_id, component_id), stream in sorted(streams.items()):
        values = stream["values"]
        if not values:
            continue
        sources.append({
            "id": f"tlog:{source_file}:sys{system_id}:comp{component_id}",
            "kind": "tlog",
            "label": f"TLog · {source_file} · SYS {system_id} / COMP {component_id}",
            "source_file": source_file,
            "system_id": system_id,
            "component_id": component_id,
            "values": dict(sorted(values.items())),
            "timeline": stream["timeline"],
            "quality": source_quality(values, declared=stream["declared"], indices=stream["indices"]) | {
                "record_count": len(stream["timeline"]),
                "time_aligned": False,
                "message_counts": dict(sorted(stream["message_counts"].items())),
            },
        })
    return sources


def recommended_source(sources: list[dict[str, Any]]) -> str | None:
    if not sources:
        return None
    priority = {"param_file": 3, "dataflash": 2, "tlog": 1}
    best = max(sources, key=lambda source: (
        priority.get(source["kind"], 0),
        bool(source["quality"].get("complete")),
        int(source["quality"].get("parameter_count") or 0),
    ))
    return str(best["id"])


def build_parameter_domain(dataset: Path) -> dict[str, Any]:
    files = sorted(path for path in dataset.rglob("*") if path.is_file() and path.suffix.lower() in {".param", ".bin", ".tlog"})
    sources: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    for path in files:
        try:
            suffix = path.suffix.lower()
            if suffix == ".param":
                sources.append(param_file_source(path, dataset))
            elif suffix == ".bin":
                source = dataflash_source(path, dataset)
                if source:
                    sources.append(source)
            elif suffix == ".tlog":
                sources.extend(tlog_sources(path, dataset))
        except (OSError, ValueError, struct.error) as error:
            errors.append({"source_file": relative_name(path, dataset), "error": str(error)})
    return {
        "schema_version": 1,
        "dataset": str(dataset),
        "recommended_source_id": recommended_source(sources),
        "sources": sources,
        "counts": {
            "source_files": len(files),
            "sources": len(sources),
            "parameters": sum(len(source["values"]) for source in sources),
            "errors": len(errors),
        },
        "errors": errors,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    dataset = args.dataset.expanduser().resolve()
    if not dataset.is_dir():
        raise SystemExit(f"Dataset directory does not exist: {dataset}")
    domain = build_parameter_domain(dataset)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(domain, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}")
    print(json.dumps(domain["counts"], ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
