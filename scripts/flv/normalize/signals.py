"""Build a source-aware signal catalog."""

from __future__ import annotations

from typing import Any


def profile_role_index(profile: dict[str, Any] | None) -> dict[str, list[str]]:
    index: dict[str, list[str]] = {}
    for role, signal_ids in (profile or {}).get("signal_roles", {}).items():
        for signal_id in signal_ids:
            index.setdefault(str(signal_id), []).append(str(role))
    return index


def build_signal_catalog(rows: dict[str, list[dict[str, Any]]], field_catalog: dict[str, dict[str, Any]], source_id: str | None, profile: dict[str, Any] | None = None) -> dict[str, Any]:
    signals: dict[str, dict[str, Any]] = {}
    role_index = profile_role_index(profile)
    for message, message_rows in rows.items():
        fields = field_catalog.get(message, {}).get("columns") or []
        sample = message_rows[0] if message_rows else {}
        field_names = sorted(set(fields) | set(sample.keys()))
        for field in field_names:
            if field == "time_s":
                continue
            signal_id = f"{message}.{field}"
            values = [row.get(field) for row in message_rows[:50]]
            numeric = any(isinstance(value, int | float) for value in values)
            signals[signal_id] = {
                "id": signal_id,
                "message": message,
                "field": field,
                "numeric": numeric,
                "source_id": source_id,
                "semantic_roles": role_index.get(signal_id, []),
                "status": "direct" if message_rows else "missing",
            }
    return {
        "signals": signals,
        "role_index": role_index,
        "profile_id": (profile or {}).get("id"),
        "counts": {
            "signals": len(signals),
            "numeric_signals": len([item for item in signals.values() if item["numeric"]]),
            "semantic_roles": len(role_index),
        },
    }
