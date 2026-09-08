#!/usr/bin/env python3
"""Build local flight data and serve the viewer on Linux, Windows or Termux."""

from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
import sys
import tempfile


def port_number(value: str) -> int:
    port = int(value)
    if not 0 <= port <= 65535:
        raise argparse.ArgumentTypeError("port must be between 0 and 65535")
    return port


def build_dataset(root: Path, dataset: Path) -> None:
    output = root / "public-data"
    output.mkdir(parents=True, exist_ok=True)
    # Finish all generators before publishing or retiring older mission domains.
    with tempfile.TemporaryDirectory(prefix=".build-", dir=output) as temporary:
        staging = Path(temporary)
        summary = staging / "dataset-summary.json"
        series = staging / "series"
        jobs = [
            ("summarize_dataset.py", ["--dataset", dataset, "--output", summary]),
            ("inspect_logs.py", ["--dataset", dataset, "--output", staging / "log-inspection.json"]),
            ("extract_dataflash_series.py", ["--dataset", dataset, "--output-dir", series]),
            ("build_mission_sources.py", [
                "--summary", summary, "--mission", series / "mission.json",
                "--modes", series / "modes.json", "--output", series / "mission-sources.json",
            ]),
        ]
        for index, (script, arguments) in enumerate(jobs, 1):
            print(f"[{index}/{len(jobs)}] {script}", flush=True)
            subprocess.run(
                [sys.executable, str(root / "scripts" / script), *map(str, arguments)],
                cwd=root, check=True,
            )
        for source in staging.rglob("*.json"):
            destination = output / source.relative_to(staging)
            destination.parent.mkdir(parents=True, exist_ok=True)
            source.replace(destination)
        # This branch generates legacy mission sources, which the viewer uses
        # only when newer domain files from a previous dataset are absent.
        for name in ("mission.json", "current_tasks.json"):
            (output / "domains" / name).unlink(missing_ok=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, help="dataset directory; relative paths use the project root")
    parser.add_argument("--skip-build", action="store_true", help="serve existing public-data without rebuilding")
    parser.add_argument("--port", type=port_number, default=8000, help="server port (default: 8000; 0 selects a free port)")
    parser.add_argument("--host", default="127.0.0.1", help="bind address (default: 127.0.0.1; 0.0.0.0 allows LAN access)")
    args = parser.parse_args(argv)
    if sys.version_info < (3, 11):
        parser.error("Python 3.11 or newer is required")
    root = Path(__file__).resolve().parent
    if not (root / "viewer" / "index.html").is_file():
        parser.error(f"viewer/index.html not found under {root}")
    if not args.skip_build and args.dataset is None:
        parser.error("--dataset is required unless --skip-build is used")
    dataset = None
    if args.dataset is not None:
        dataset = args.dataset.expanduser()
        dataset = (dataset if dataset.is_absolute() else root / dataset).resolve()
        if not dataset.is_dir():
            parser.error(f"dataset directory does not exist: {dataset}")
    if args.skip_build and not (root / "public-data" / "dataset-summary.json").is_file():
        parser.error("no generated dataset found; run with --dataset PATH first")

    handler = partial(SimpleHTTPRequestHandler, directory=str(root))
    try:
        # Reserve the port before spending time rebuilding a dataset.
        with ThreadingHTTPServer((args.host, args.port), handler) as server:
            print(f"Project: {root}", flush=True)
            if args.skip_build:
                print("Using existing public-data (--skip-build).", flush=True)
            else:
                print(f"Dataset: {dataset}", flush=True)
                build_dataset(root, dataset)
            host = "127.0.0.1" if args.host == "0.0.0.0" else args.host
            print(f"Viewer: http://{host}:{server.server_port}/viewer/index.html", flush=True)
            if args.host == "0.0.0.0":
                print(f"LAN: http://<this-computer-LAN-IP>:{server.server_port}/viewer/index.html", flush=True)
            print("Press Ctrl+C to stop.", flush=True)
            server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    except subprocess.CalledProcessError as error:
        print(f"Build failed (exit {error.returncode}); existing viewer data was retained.", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"Error: {error}. Check paths and --host/--port; try --port 0 for a free port.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
