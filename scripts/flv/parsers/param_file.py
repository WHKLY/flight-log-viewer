"""Parser for ArduPilot parameter files."""

from __future__ import annotations

from pathlib import Path


def parse_param_file(path: Path | None) -> dict[str, str]:
    if path is None:
        return {}
    params: dict[str, str] = {}
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if "," in line:
                key, value = line.split(",", 1)
            elif "\t" in line:
                key, value = line.split("\t", 1)
            else:
                parts = line.split(maxsplit=1)
                if len(parts) != 2:
                    continue
                key, value = parts
            params[key.strip()] = value.strip()
    return params

