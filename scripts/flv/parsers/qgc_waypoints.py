"""Parser for QGC WPL 110 waypoint files."""

from __future__ import annotations

from pathlib import Path

from flv.common import command_name


def parse_waypoints_file(path: Path | None) -> list[dict[str, object]]:
    if path is None:
        return []
    waypoints: list[dict[str, object]] = []
    with path.open("r", encoding="utf-8", errors="replace") as handle:
        header = handle.readline().strip()
        if header != "QGC WPL 110":
            raise ValueError(f"{path.name}: unsupported waypoint header {header!r}")
        for raw_line in handle:
            line = raw_line.strip()
            if not line:
                continue
            parts = line.split()
            if len(parts) < 12:
                continue
            index = int(parts[0])
            command = int(float(parts[3]))
            waypoints.append(
                {
                    "index": index,
                    "current": int(parts[1]),
                    "frame": int(parts[2]),
                    "command": command,
                    "command_name": command_name(command),
                    "param1": float(parts[4]),
                    "param2": float(parts[5]),
                    "param3": float(parts[6]),
                    "param4": float(parts[7]),
                    "lat": float(parts[8]),
                    "lon": float(parts[9]),
                    "alt": float(parts[10]),
                    "autocontinue": int(parts[11]),
                }
            )
    return waypoints

