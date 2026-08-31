"""Flight mode normalization."""

from __future__ import annotations

from typing import Any

from flv.common import finite_number


def time_range_from_rows(rows: dict[str, list[dict[str, Any]]]) -> dict[str, float | None]:
    values = [
        float(row["time_s"])
        for message_rows in rows.values()
        for row in message_rows
        if isinstance(row.get("time_s"), int | float)
    ]
    if not values:
        return {"start_s": None, "end_s": None}
    return {"start_s": min(values), "end_s": max(values)}


def normalized_mode_map(profile: dict[str, Any]) -> dict[int, str]:
    raw_map = profile.get("mode_map") or {}
    normalized: dict[int, str] = {}
    for key, value in raw_map.items():
        number = finite_number(key)
        if number is None:
            continue
        normalized[int(number)] = str(value)
    return normalized


def mode_name(mode_num: int, mode_map: dict[int, str]) -> str:
    return mode_map.get(mode_num, f"MODE_{mode_num}")


def build_mode_domain(mode_rows: list[dict[str, Any]], time_range: dict[str, float | None], profile: dict[str, Any]) -> dict[str, Any]:
    start_s = time_range.get("start_s")
    end_s = time_range.get("end_s")
    mode_map = normalized_mode_map(profile)
    sorted_modes = sorted(mode_rows, key=lambda row: finite_number(row.get("time_s")) or 0.0)
    if start_s is None or end_s is None or not sorted_modes:
        return {
            "mode_map_source": profile.get("id") or "compatibility_profile",
            "mode_map": mode_map,
            "segments": [],
            "focus_ranges": {},
        }

    segments: list[dict[str, Any]] = []
    for index, row in enumerate(sorted_modes):
        mode_num = int(finite_number(row.get("ModeNum", row.get("Mode"))) or -1)
        segment_start = float(start_s) if index == 0 else float(finite_number(row.get("time_s")) or start_s)
        next_time = finite_number(sorted_modes[index + 1].get("time_s")) if index + 1 < len(sorted_modes) else None
        segment_end = float(next_time if next_time is not None else end_s)
        name = mode_name(mode_num, mode_map)
        segments.append(
            {
                "start_s": segment_start,
                "end_s": segment_end,
                "mode_time_s": finite_number(row.get("time_s")),
                "duration_s": max(0.0, segment_end - segment_start),
                "mode": row.get("Mode"),
                "mode_num": mode_num,
                "name": name,
                "reason": row.get("Rsn"),
                "known": mode_num in mode_map,
            }
        )

    focus_ranges: dict[str, list[dict[str, float]]] = {}
    for segment in segments:
        focus_ranges.setdefault(segment["name"], []).append({"start_s": segment["start_s"], "end_s": segment["end_s"]})

    return {
        "mode_map_source": profile.get("id") or "compatibility_profile",
        "mode_map": mode_map,
        "segments": segments,
        "focus_ranges": focus_ranges,
    }
