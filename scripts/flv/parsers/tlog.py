"""Small MAVLink/tlog mission parser."""

from __future__ import annotations

import struct
from pathlib import Path
from typing import Any, Iterable

from flv.common import command_name


MAVLINK_CRC_EXTRA = {
    39: 254,
    40: 230,
    41: 28,
    42: 28,
    43: 132,
    44: 221,
    45: 232,
    46: 11,
    47: 153,
    51: 196,
    73: 38,
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
            if frame["protocol"] == "mavlink1":
                offset += 6 + frame["payload_len"] + 2
            else:
                offset += 10 + frame["payload_len"] + 2 + (13 if data[offset + 2] & 0x01 else 0)
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
        "time_s": frame.get("tlog_time_s"),
        "tlog_time_s": frame.get("tlog_time_s"),
        "tlog_unix_s": frame.get("tlog_unix_s"),
        "target_system": int(target_system),
        "target_component": int(target_component),
        "mission_type": int(mission_type),
        "source": "tlog_mission",
        "source_message": source_message,
    }


def tlog_seq_event(frame: dict[str, Any]) -> dict[str, Any] | None:
    if frame["message_id"] not in {41, 42, 46} or not frame["payload"]:
        return None
    payload = frame["payload"]
    seq = struct.unpack_from("<H", padded_payload(payload, 2))[0]
    event = {
        "seq": int(seq),
        "time_s": frame.get("tlog_time_s"),
        "tlog_time_s": frame.get("tlog_time_s"),
        "tlog_unix_s": frame.get("tlog_unix_s"),
        "source": "tlog_mission",
        "source_message": MAVLINK_MESSAGE_NAMES.get(frame["message_id"], f"MAVLINK_MSG_ID_{frame['message_id']}"),
    }
    if frame["message_id"] == 42 and len(payload) >= 4:
        event["total"] = struct.unpack_from("<H", padded_payload(payload, 4), 2)[0]
    return event


def tlog_count_event(frame: dict[str, Any]) -> dict[str, Any] | None:
    if frame["message_id"] != 44 or not frame["payload"]:
        return None
    payload = padded_payload(frame["payload"], 2)
    return {
        "count": int(struct.unpack_from("<H", payload)[0]),
        "time_s": frame.get("tlog_time_s"),
        "tlog_time_s": frame.get("tlog_time_s"),
        "tlog_unix_s": frame.get("tlog_unix_s"),
        "source_message": "MISSION_COUNT",
    }

