"""Build semantic signal availability from profile roles and decoded signals."""

from __future__ import annotations

from typing import Any


def build_semantic_signal_domain(signal_catalog: dict[str, Any], profile: dict[str, Any]) -> dict[str, Any]:
    signals = signal_catalog.get("signals") or {}
    roles = profile.get("signal_roles") or {}
    semantic: dict[str, dict[str, Any]] = {}

    for role_id, candidates_raw in sorted(roles.items()):
        candidates = [str(candidate) for candidate in candidates_raw]
        available = [candidate for candidate in candidates if candidate in signals]
        preferred = available[0] if available else None
        semantic[role_id] = {
            "id": role_id,
            "profile_id": profile.get("id"),
            "candidates": candidates,
            "available": available,
            "preferred": preferred,
            "missing": [candidate for candidate in candidates if candidate not in signals],
            "numeric": bool(preferred and signals.get(preferred, {}).get("numeric")),
            "status": "direct" if preferred else "missing",
        }

    available_roles = [role for role in semantic.values() if role["status"] == "direct"]
    return {
        "profile_id": profile.get("id"),
        "roles": semantic,
        "counts": {
            "roles": len(semantic),
            "available_roles": len(available_roles),
            "missing_roles": len(semantic) - len(available_roles),
        },
    }
