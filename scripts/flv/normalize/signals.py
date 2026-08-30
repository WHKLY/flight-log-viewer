"""Build a source-aware signal catalog."""

from __future__ import annotations

from typing import Any


def build_signal_catalog(rows: dict[str, list[dict[str, Any]]], field_catalog: dict[str, dict[str, Any]], source_id: str | None) -> dict[str, Any]:
    signals: dict[str, dict[str, Any]] = {}
    for message, message_rows in rows.items():
        fields = field_catalog.get(message, {}).get("columns") or []
        sample = message_rows[0] if message_rows else {}
        field_names = sorted(set(fields) | set(sample.keys()))
        for field in field_names:
            if field == "time_s":
                continue
            values = [row.get(field) for row in message_rows[:50]]
            numeric = any(isinstance(value, int | float) for value in values)
            signals[f"{message}.{field}"] = {
                "id": f"{message}.{field}",
                "message": message,
                "field": field,
                "numeric": numeric,
                "source_id": source_id,
                "status": "direct" if message_rows else "missing",
            }
    return {
        "signals": signals,
        "counts": {"signals": len(signals), "numeric_signals": len([item for item in signals.values() if item["numeric"]])},
    }

