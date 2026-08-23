#!/usr/bin/env python3
"""Inspect ArduPilot DataFlash BIN and MAVLink tlog files without third-party deps."""

from __future__ import annotations

import argparse
import json
import struct
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = PROJECT_ROOT / "data" / "raw" / "qq-2026-08-17"
DEFAULT_OUTPUT = PROJECT_ROOT / "public-data" / "log-inspection.json"

DATAFLASH_HEADER = b"\xa3\x95"

INTERESTING_DATAFLASH_TYPES = {
    "GPS",
    "GPS2",
    "POS",
    "AHR2",
    "ATT",
    "RATE",
    "IMU",
    "IMU2",
    "BARO",
    "ARSP",
    "MODE",
    "MSG",
    "ERR",
    "EV",
    "NTUN",
    "XKF1",
    "XKF2",
    "XKF3",
    "XKF4",
    "XKQ",
    "TECS",
    "TEC2",
    "PIDR",
    "PIDP",
    "PIDY",
    "RCOU",
    "RCIN",
    "BAT",
    "CTUN",
}

MAVLINK_MESSAGE_NAMES = {
    0: "HEARTBEAT",
    1: "SYS_STATUS",
    2: "SYSTEM_TIME",
    24: "GPS_RAW_INT",
    27: "RAW_IMU",
    29: "SCALED_PRESSURE",
    30: "ATTITUDE",
    31: "ATTITUDE_QUATERNION",
    32: "LOCAL_POSITION_NED",
    33: "GLOBAL_POSITION_INT",
    35: "RC_CHANNELS_RAW",
    36: "SERVO_OUTPUT_RAW",
    42: "MISSION_CURRENT",
    62: "NAV_CONTROLLER_OUTPUT",
    65: "RC_CHANNELS",
    74: "VFR_HUD",
    77: "COMMAND_ACK",
    111: "TIMESYNC",
    116: "SCALED_IMU2",
    125: "POWER_STATUS",
    147: "BATTERY_STATUS",
    152: "MEMINFO",
    163: "AHRS",
    165: "HWSTATUS",
    178: "AHRS2",
    182: "AHRS3",
    193: "EKF_STATUS_REPORT",
    241: "VIBRATION",
    253: "STATUSTEXT",
}


@dataclass(frozen=True)
class DataFlashFormat:
    type_id: int
    length: int
    name: str
    fmt: str
    columns: list[str]


def printable_name(raw: bytes) -> str:
    return raw.split(b"\x00", 1)[0].decode("ascii", errors="replace").strip()


def parse_fmt_payload(payload: bytes) -> DataFlashFormat | None:
    if len(payload) < 86:
        return None
    type_id, length = struct.unpack_from("<BB", payload, 0)
    name = printable_name(payload[2:6])
    fmt = printable_name(payload[6:22])
    columns_raw = payload[22:86].split(b"\x00", 1)[0].decode("ascii", errors="replace")
    columns = [column.strip() for column in columns_raw.split(",") if column.strip()]
    if not name:
        return None
    return DataFlashFormat(type_id=type_id, length=length, name=name, fmt=fmt, columns=columns)


def inspect_dataflash(path: Path) -> dict[str, Any]:
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
    counts: Counter[int] = Counter()
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
        counts[msg_type] += 1
        if msg_type == 0x80:
            parsed = parse_fmt_payload(payload)
            if parsed:
                formats[parsed.type_id] = parsed
        offset = end

    messages = []
    for type_id, count in counts.most_common():
        fmt = formats.get(type_id)
        name = fmt.name if fmt else f"UNKNOWN_{type_id}"
        messages.append(
            {
                "type_id": type_id,
                "name": name,
                "count": count,
                "length": fmt.length if fmt else None,
                "format": fmt.fmt if fmt else None,
                "columns": fmt.columns if fmt else [],
                "interesting": name in INTERESTING_DATAFLASH_TYPES or name.startswith(("PID", "TEC")),
            }
        )

    interesting = {
        item["name"]: item
        for item in messages
        if item["interesting"]
    }

    return {
        "file": path.name,
        "size_bytes": path.stat().st_size,
        "format_count": len(formats),
        "record_count": sum(counts.values()),
        "skipped_regions": skipped_regions,
        "messages": sorted(messages, key=lambda item: (not item["interesting"], item["name"])),
        "interesting_messages": interesting,
    }


def mavlink_v2_msgid(data: bytes, offset: int) -> int:
    return data[offset + 7] | (data[offset + 8] << 8) | (data[offset + 9] << 16)


def inspect_tlog(path: Path) -> dict[str, Any]:
    data = path.read_bytes()
    counts: Counter[int] = Counter()
    protocol_counts: Counter[str] = Counter()
    offset = 0
    skipped_regions = 0

    while offset < len(data):
        marker = data[offset]
        if marker == 0xFE and offset + 8 <= len(data):
            payload_len = data[offset + 1]
            frame_len = 6 + payload_len + 2
            if offset + frame_len <= len(data):
                msg_id = data[offset + 5]
                counts[msg_id] += 1
                protocol_counts["mavlink1"] += 1
                offset += frame_len
                continue
        elif marker == 0xFD and offset + 12 <= len(data):
            payload_len = data[offset + 1]
            incompat_flags = data[offset + 2]
            signature_len = 13 if incompat_flags & 0x01 else 0
            frame_len = 10 + payload_len + 2 + signature_len
            if offset + frame_len <= len(data):
                msg_id = mavlink_v2_msgid(data, offset)
                counts[msg_id] += 1
                protocol_counts["mavlink2"] += 1
                offset += frame_len
                continue
        skipped_regions += 1
        next_v1 = data.find(b"\xfe", offset + 1)
        next_v2 = data.find(b"\xfd", offset + 1)
        candidates = [candidate for candidate in (next_v1, next_v2) if candidate >= 0]
        offset = min(candidates) if candidates else len(data)

    messages = [
        {
            "message_id": msg_id,
            "name": MAVLINK_MESSAGE_NAMES.get(msg_id, f"MAVLINK_MSG_ID_{msg_id}"),
            "count": count,
        }
        for msg_id, count in counts.most_common()
    ]

    return {
        "file": path.name,
        "size_bytes": path.stat().st_size,
        "frame_count": sum(counts.values()),
        "protocol_counts": dict(protocol_counts),
        "skipped_regions": skipped_regions,
        "messages": messages,
    }


def choose_source(files: list[Path], suffix: str) -> Path | None:
    candidates = [path for path in files if path.suffix.lower() == suffix]
    if not candidates:
        return None

    def key(path: Path) -> tuple[int, str]:
        duplicate_marker = 1 if "(" in path.stem and ")" in path.stem else 0
        return duplicate_marker, path.name

    return sorted(candidates, key=key)[0]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    dataset = args.dataset.expanduser().resolve()
    if not dataset.exists():
        raise SystemExit(f"Dataset directory does not exist: {dataset}")

    files = [path for path in dataset.iterdir() if path.is_file()]
    bin_file = choose_source(files, ".bin")
    tlog_file = choose_source(files, ".tlog")

    result: dict[str, Any] = {
        "dataset": str(dataset),
        "selected_files": {
            "bin": bin_file.name if bin_file else None,
            "tlog": tlog_file.name if tlog_file else None,
        },
        "dataflash": inspect_dataflash(bin_file) if bin_file else None,
        "tlog": inspect_tlog(tlog_file) if tlog_file else None,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Wrote {args.output}")
    if result["dataflash"]:
        print(
            "DataFlash:",
            result["dataflash"]["record_count"],
            "records,",
            result["dataflash"]["format_count"],
            "formats",
        )
    if result["tlog"]:
        print("TLOG:", result["tlog"]["frame_count"], "frames")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
