"""Build source-specific current mission task timelines."""

from __future__ import annotations

from typing import Any


def normalized_event(event: dict[str, Any], source: dict[str, Any], index: int) -> dict[str, Any]:
    seq = event.get("seq")
    return {
        "time_s": event.get("time_s"),
        "seq": int(seq) if isinstance(seq, int | float) else seq,
        "source_seq": event.get("source_seq", seq),
        "command": event.get("command"),
        "command_name": event.get("command_name"),
        "lat": event.get("lat"),
        "lon": event.get("lon"),
        "alt": event.get("alt"),
        "source_id": source.get("id"),
        "source_kind": source.get("kind"),
        "event_index": index,
        "status": event.get("status") or "direct",
    }


def build_current_task_domain(mission_domain: dict[str, Any]) -> dict[str, Any]:
    sources: list[dict[str, Any]] = []

    for source in mission_domain.get("sources", []):
        events = [
            normalized_event(event, source, index)
            for index, event in enumerate(source.get("current_events") or [])
            if event.get("time_s") is not None
        ]
        events.sort(key=lambda item: float(item["time_s"]))
        sources.append(
            {
                "id": source.get("id"),
                "kind": source.get("kind"),
                "label": source.get("label"),
                "trust": source.get("trust"),
                "events": events,
                "counts": {
                    "events": len(events),
                    "unique_seq": len({event.get("seq") for event in events if event.get("seq") is not None}),
                },
                "time_range": {
                    "start_s": events[0]["time_s"] if events else None,
                    "end_s": events[-1]["time_s"] if events else None,
                },
                "status": "direct" if events else "missing",
            }
        )

    return {
        "selection_policy": mission_domain.get("selection_policy") or {},
        "profile_strategy": mission_domain.get("profile_strategy") or {},
        "sources": sources,
        "counts": {
            "sources": len(sources),
            "sources_with_events": len([source for source in sources if source["status"] == "direct"]),
            "events": sum(source["counts"]["events"] for source in sources),
        },
    }
