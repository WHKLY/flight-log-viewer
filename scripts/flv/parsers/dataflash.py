"""FMT-driven ArduPilot DataFlash decoder."""

from __future__ import annotations

import struct
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


DATAFLASH_HEADER = b"\xa3\x95"

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
    if compiled.size > fmt.length - 3:
        return None
    return CompiledFormat(fmt, compiled, fields)


def decode_payload(compiled: CompiledFormat, payload: bytes) -> dict[str, Any] | None:
    try:
        values = compiled.struct_format.unpack_from(payload)
    except struct.error:
        return None
    row: dict[str, Any] = {}
    for (column, _code, scale), value in zip(compiled.fields, values, strict=False):
        if isinstance(value, bytes):
            row[column] = clean_ascii(value)
        elif scale is not None:
            row[column] = value * scale
        else:
            row[column] = value
    if "TimeUS" in row:
        row["time_s"] = row["TimeUS"] / 1_000_000.0
    return row


def extract_dataflash(path: Path | None, target_messages: Iterable[str]) -> tuple[dict[str, list[dict[str, Any]]], dict[str, Any]]:
    if path is None:
        return defaultdict(list), empty_metadata()

    targets = set(target_messages)
    data = path.read_bytes()
    formats: dict[int, DataFlashFormat] = {
        0x80: DataFlashFormat(0x80, 89, "FMT", "BBnNZ", ["Type", "Length", "Name", "Format", "Columns"])
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
        if active and active.dataflash_format.name in targets:
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
        "target_formats": field_catalog(formats, targets),
    }
    return rows, metadata


def empty_metadata() -> dict[str, Any]:
    return {
        "source_file": None,
        "size_bytes": 0,
        "skipped_regions": 0,
        "formats_seen": 0,
        "target_counts": {},
        "target_formats": {},
    }


def field_catalog(formats: dict[int, DataFlashFormat], targets: set[str]) -> dict[str, dict[str, Any]]:
    return {
        fmt.name: {
            "type_id": fmt.type_id,
            "length": fmt.length,
            "format": fmt.fmt,
            "columns": fmt.columns,
            "source": "dataflash_fmt",
        }
        for fmt in formats.values()
        if fmt.name in targets
    }

