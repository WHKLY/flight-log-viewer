"""Discover input files inside a dataset directory."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from flv.common import stable_first


@dataclass(frozen=True)
class FileSummary:
    name: str
    suffix: str
    size_bytes: int


def duplicate_groups(files: list[Path]) -> dict[str, list[str]]:
    groups: dict[str, list[str]] = {}
    for path in files:
        normalized = path.name.replace("(1)", "")
        groups.setdefault(normalized, []).append(path.name)
    return {key: sorted(names) for key, names in groups.items() if len(names) > 1}


def discover_dataset(dataset: Path) -> dict[str, Any]:
    root = dataset.expanduser().resolve()
    if not root.exists():
        raise FileNotFoundError(f"Dataset directory does not exist: {root}")
    if not root.is_dir():
        raise NotADirectoryError(f"Dataset path is not a directory: {root}")

    files = sorted([path for path in root.iterdir() if path.is_file()], key=lambda item: item.name)
    by_suffix: dict[str, list[Path]] = {}
    for path in files:
        by_suffix.setdefault(path.suffix.lower(), []).append(path)

    selected = {
        "bin": stable_first(files, ".bin"),
        "tlog": stable_first(files, ".tlog"),
        "param": stable_first(files, ".param"),
        "waypoints": stable_first(files, ".waypoints"),
    }
    return {
        "root": root,
        "files": files,
        "file_summaries": [asdict(FileSummary(path.name, path.suffix.lower(), path.stat().st_size)) for path in files],
        "by_suffix": by_suffix,
        "selected": selected,
        "duplicates": duplicate_groups(files),
    }

