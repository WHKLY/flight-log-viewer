#!/usr/bin/env python3
"""Build the flight-log-viewer generated dataset."""

from __future__ import annotations

import argparse
from pathlib import Path

from flv.builder import build_dataset


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = PROJECT_ROOT / "data" / "raw" / "qq-2026-08-17"
DEFAULT_OUTPUT = PROJECT_ROOT / "public-data"


def main() -> int:
    parser = argparse.ArgumentParser(description="Build viewer JSON from a local flight dataset.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    result = build_dataset(args.dataset, args.output)
    print(f"Dataset: {result['dataset']['id']}")
    print(f"Output: {args.output}")
    print(f"Files: {result['counts']['files']}")
    print(f"DataFlash messages: {result['counts']['dataflash_records']}")
    print(f"Parameters: {result['counts']['parameters']}")
    print(f"Mission sources: {', '.join(result['counts']['mission_sources']) or 'none'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

