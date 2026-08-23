#!/usr/bin/env python3
"""Extract selected ArduPilot DataFlash messages into viewer-friendly JSON series."""

from __future__ import annotations

import argparse
import json
import struct
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = PROJECT_ROOT / "data" / "raw" / "qq-2026-08-17"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "public-data" / "series"
DATAFLASH_HEADER = b"\xa3\x95"

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
    "ARSP",
}

SERIES_GROUPS = {
    "track": ["POS", "GPS"],
    "attitude": ["ATT", "AHR2", "XKQ"],
    "navigation": ["CTUN", "NTUN"],
    "tecs": ["TECS", "TEC2", "ARSP"],
    "pid": ["PIDR", "PIDP", "PIDY"],
    "io": ["RCOU", "RCIN"],
    "events": ["MODE", "MSG"],
}

# DataFlash FMT codes used by the selected Plane logs. Scales follow ArduPilot's
# conventional encoded units: L is latitude/longitude, c/C/e/E are centi-units.
FORMAT_CODES: dict[str, tuple[str, int, float | None]] = {
    "b": ("b", 1, None),
    "B": ("B", 1, None),
    "h": ("h", 2, None),
    "H": ("H", 2, None),
    "i": ("i", 4, None),
    "I": ("I", 4, None),
    "q": ("q", 8, None),
    "Q": ("Q", 8, None),
    "f": ("f", 4, None),
    "d": ("d", 8, None),
    "c": ("h", 2, 0.01),
    "C": ("H", 2, 0.01),
    "e": ("i", 4, 0.01),
    "E": ("I", 4, 0.01),
    "L": ("i", 4, 1.0e-7),
    "M": ("B", 1, None),
    "n": ("4s", 4, None),
    "N": ("16s", 16, None),
    "Z": ("64s", 64, None),
}


@dataclass(frozen=True)
class DataFlashFormat:
    type_id: int
    length: int
    name: str
    fmt: str
    columns: list[str]


@dataclass(frozen=True)
class CompiledFormat:
    dataflash_format: DataFlashFormat
    struct_format: struct.Struct
    fields: list[tuple[str, str, float | None]]


def clean_ascii(raw: bytes) -> str:
    return raw.split(b"\x00", 1)[0].decode("utf-8", errors="replace").strip()


def parse_fmt_payload(payload: bytes) -> DataFlashFormat | None:
    if len(payload) < 86:
        return None
    type_id, length = struct.unpack_from("<BB", payload, 0)
    name = clean_ascii(payload[2:6])
    fmt = clean_ascii(payload[6:22])
    columns_raw = payload[22:86].split(b"\x00", 1)[0].decode("ascii", errors="replace")
    columns = [column.strip() for column in columns_raw.split(",") if column.strip()]
    if not name:
        return None
    return DataFlashFormat(type_id=type_id, length=length, name=name, fmt=fmt, columns=columns)


def compile_format(fmt: DataFlashFormat) -> CompiledFormat | None:
    pieces: list[str] = []
    fields: list[tuple[str, str, float | None]] = []
    for index, code in enumerate(fmt.fmt):
        if code not in FORMAT_CODES:
            return None
        struct_code, _size, scale = FORMAT_CODES[code]
        pieces.append(struct_code)
        column = fmt.columns[index] if index < len(fmt.columns) else f"field_{index}"
        fields.append((column, code, scale))
    try:
        compiled = struct.Struct("<" + "".join(pieces))
    except struct.error:
        return None
    expected_payload_len = fmt.length - 3
    if compiled.size > expected_payload_len:
        return None
    return CompiledFormat(fmt, compiled, fields)


def decode_payload(compiled: CompiledFormat, payload: bytes) -> dict[str, Any] | None:
    try:
        values = compiled.struct_format.unpack_from(payload)
    except struct.error:
        return None

    row: dict[str, Any] = {}
    for (column, code, scale), value in zip(compiled.fields, values, strict=False):
        if isinstance(value, bytes):
            row[column] = clean_ascii(value)
        elif scale is not None:
            row[column] = value * scale
        else:
            row[column] = value
    if "TimeUS" in row:
        row["time_s"] = row["TimeUS"] / 1_000_000.0
    return row


def choose_source(files: Iterable[Path], suffix: str) -> Path | None:
    candidates = [path for path in files if path.suffix.lower() == suffix]
    if not candidates:
        return None

    def key(path: Path) -> tuple[int, str]:
        duplicate_marker = 1 if "(" in path.stem and ")" in path.stem else 0
        return duplicate_marker, path.name

    return sorted(candidates, key=key)[0]


def extract_dataflash(path: Path) -> tuple[dict[str, list[dict[str, Any]]], dict[str, Any]]:
    data = path.read_bytes()
    formats: dict[int, DataFlashFormat] = {
        0x80: DataFlashFormat(
            type_id=0x80,
            length=89,
            name="FMT",
            fmt="BBnNZ",
            columns=["Type", "Length", "Name", "Format", "Columns"],
        )
    }
    compiled: dict[int, CompiledFormat] = {}
    rows: dict[str, list[dict[str, Any]]] = defaultdict(list)
    counts: dict[str, int] = defaultdict(int)
    skipped_regions = 0
    offset = 0

    while offset + 3 <= len(data):
        header_at = data.find(DATAFLASH_HEADER, offset)
        if header_at < 0 or header_at + 3 > len(data):
            break
        if header_at != offset:
            skipped_regions += 1
        msg_type = data[header_at + 2]
        fmt = formats.get(msg_type)
        if fmt is None or fmt.length < 3:
            offset = header_at + 1
            continue
        end = header_at + fmt.length
        if end > len(data):
            break
        payload = data[header_at + 3 : end]

        if msg_type == 0x80:
            parsed = parse_fmt_payload(payload)
            if parsed:
                formats[parsed.type_id] = parsed
                maybe_compiled = compile_format(parsed)
                if maybe_compiled:
                    compiled[parsed.type_id] = maybe_compiled

        active = compiled.get(msg_type)
        if active and active.dataflash_format.name in TARGET_MESSAGES:
            row = decode_payload(active, payload)
            if row is not None:
                rows[active.dataflash_format.name].append(row)
                counts[active.dataflash_format.name] += 1
        offset = end

    metadata = {
        "source_file": path.name,
        "size_bytes": path.stat().st_size,
        "skipped_regions": skipped_regions,
        "formats_seen": len(formats),
        "target_counts": dict(sorted(counts.items())),
        "target_formats": {
            fmt.name: {
                "type_id": fmt.type_id,
                "length": fmt.length,
                "format": fmt.fmt,
                "columns": fmt.columns,
            }
            for fmt in formats.values()
            if fmt.name in TARGET_MESSAGES
        },
    }
    return rows, metadata


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()

    dataset = args.dataset.expanduser().resolve()
    files = [path for path in dataset.iterdir() if path.is_file()]
    bin_file = choose_source(files, ".bin")
    if bin_file is None:
        raise SystemExit(f"No .BIN file found in {dataset}")

    rows, metadata = extract_dataflash(bin_file)
    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "source": metadata,
        "groups": {},
    }
    for group_name, message_names in SERIES_GROUPS.items():
        group_payload = {
            "source_file": bin_file.name,
            "messages": {name: rows.get(name, []) for name in message_names},
        }
        relative_path = f"series/{group_name}.json"
        write_json(output_dir / f"{group_name}.json", group_payload)
        manifest["groups"][group_name] = {
            "path": f"public-data/{relative_path}",
            "messages": {name: len(rows.get(name, [])) for name in message_names},
        }

    write_json(output_dir / "manifest.json", manifest)
    print(f"Source: {bin_file.name}")
    print(json.dumps(metadata["target_counts"], ensure_ascii=False, indent=2))
    print(f"Wrote {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
