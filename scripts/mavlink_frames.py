#!/usr/bin/env python3
"""Small dependency-free MAVLink frame scanner for recorded telemetry logs.

The module deliberately stops at framing, CRC validation and tlog timestamps.
Domain decoders (mission, parameters, and future telemetry domains) own their
payload schemas so this seam stays stable and easy to test.
"""

from __future__ import annotations

import struct
from pathlib import Path
from typing import Any, Iterable, Mapping


MAVLINK_CRC_EXTRA = {
    20: 214,  # PARAM_REQUEST_READ
    21: 159,  # PARAM_REQUEST_LIST
    22: 220,  # PARAM_VALUE
    23: 168,  # PARAM_SET
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
    320: 243,  # PARAM_EXT_REQUEST_READ
    321: 88,  # PARAM_EXT_REQUEST_LIST
    322: 243,  # PARAM_EXT_VALUE
    323: 78,  # PARAM_EXT_SET
    324: 132,  # PARAM_EXT_ACK
}

MAVLINK_MESSAGE_NAMES = {
    20: "PARAM_REQUEST_READ",
    21: "PARAM_REQUEST_LIST",
    22: "PARAM_VALUE",
    23: "PARAM_SET",
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
    320: "PARAM_EXT_REQUEST_READ",
    321: "PARAM_EXT_REQUEST_LIST",
    322: "PARAM_EXT_VALUE",
    323: "PARAM_EXT_SET",
    324: "PARAM_EXT_ACK",
}


def x25_crc(data: bytes) -> int:
    crc = 0xFFFF
    for byte in data:
        tmp = byte ^ (crc & 0xFF)
        tmp = (tmp ^ (tmp << 4)) & 0xFF
        crc = ((crc >> 8) ^ (tmp << 8) ^ (tmp << 3) ^ (tmp >> 4)) & 0xFFFF
    return crc


def valid_mavlink_crc(
    data: bytes,
    offset: int,
    payload_len: int,
    msg_id: int,
    version: int,
    crc_extras: Mapping[int, int] = MAVLINK_CRC_EXTRA,
) -> bool:
    extra = crc_extras.get(msg_id)
    if extra is None:
        return False
    header_len = 6 if version == 1 else 10
    crc_start = offset + 1
    crc_end = offset + header_len + payload_len
    if crc_end + 2 > len(data):
        return False
    expected = struct.unpack_from("<H", data, crc_end)[0]
    actual = x25_crc(data[crc_start:crc_end] + bytes([extra]))
    return expected == actual


def tlog_timestamp_s(data: bytes, frame_offset: int) -> float | None:
    """Return the big-endian microsecond timestamp stored before a tlog frame."""
    if frame_offset < 8:
        return None
    value = int.from_bytes(data[frame_offset - 8 : frame_offset], "big")
    if 1_500_000_000_000_000 <= value <= 2_200_000_000_000_000:
        return value / 1_000_000.0
    return None


def iter_mavlink_frames(
    path: Path,
    allowed_ids: Iterable[int] | None = None,
    *,
    crc_extras: Mapping[int, int] = MAVLINK_CRC_EXTRA,
    message_names: Mapping[int, str] = MAVLINK_MESSAGE_NAMES,
) -> Iterable[dict[str, Any]]:
    """Yield CRC-valid MAVLink 1/2 frames from a raw stream or timestamped tlog."""
    data = path.read_bytes()
    accepted = set(allowed_ids) if allowed_ids is not None else set(crc_extras)
    first_timestamp: float | None = None
    offset = 0
    while offset < len(data):
        marker = data[offset]
        version = 0
        header_len = 0
        signature_len = 0
        payload_len = 0
        msg_id = -1
        if marker == 0xFE and offset + 8 <= len(data):
            version = 1
            header_len = 6
            payload_len = data[offset + 1]
            msg_id = data[offset + 5]
        elif marker == 0xFD and offset + 12 <= len(data):
            version = 2
            header_len = 10
            payload_len = data[offset + 1]
            signature_len = 13 if data[offset + 2] & 0x01 else 0
            msg_id = data[offset + 7] | (data[offset + 8] << 8) | (data[offset + 9] << 16)

        frame_len = header_len + payload_len + 2 + signature_len
        if (
            version
            and msg_id in accepted
            and offset + frame_len <= len(data)
            and valid_mavlink_crc(data, offset, payload_len, msg_id, version, crc_extras)
        ):
            timestamp = tlog_timestamp_s(data, offset)
            if timestamp is not None and first_timestamp is None:
                first_timestamp = timestamp
            system_offset = offset + (3 if version == 1 else 5)
            yield {
                "message_id": msg_id,
                "name": message_names.get(msg_id, f"MAVLINK_MSG_ID_{msg_id}"),
                "payload": data[offset + header_len : offset + header_len + payload_len],
                "payload_len": payload_len,
                "protocol": f"mavlink{version}",
                "offset": offset,
                "sequence": data[system_offset - 1],
                "system_id": data[system_offset],
                "component_id": data[system_offset + 1],
                "tlog_unix_s": timestamp,
                "tlog_time_s": timestamp - first_timestamp if timestamp is not None and first_timestamp is not None else None,
            }
            offset += frame_len
            continue

        next_v1 = data.find(b"\xfe", offset + 1)
        next_v2 = data.find(b"\xfd", offset + 1)
        candidates = [candidate for candidate in (next_v1, next_v2) if candidate >= 0]
        offset = min(candidates) if candidates else len(data)
