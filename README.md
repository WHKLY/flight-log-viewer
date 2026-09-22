# Flight Log Viewer

Offline ArduPilot fixed-wing log viewer and control-parameter analyzer for Linux, Windows, and Termux/tablet use.

The project reads local flight data packages, generates static JSON under `public-data/`, and opens a single-page HTML dashboard in `viewer/index.html`. The current viewer focuses on fixed-wing Plane logs: flight modes, mission state, 2D/3D track review, HUD, L1 navigation, TECS, attitude/rate control, motion/IMU, I/O outputs, and custom field plotting.

## Requirements

Python 3.11 or newer is required. On Linux, install Python with your distribution package manager. On Windows, install Python and enable its launcher or add Python to PATH.

Termux packages used by this project:

```bash
pkg install python git ripgrep
```

Optional but useful:

```bash
pkg install openssh
```

The Python scripts are intentionally dependency-light. `pymavlink` is optional for future work, but the current DataFlash extractor uses the log's own `FMT` records and does not require third-party packages.

## Quick Start

The checkout can live anywhere, including a path containing spaces. The launchers locate the project from their own file location, so the calling directory does not matter.

Linux / Termux:

```bash
bash start.bash --dataset "data/raw/flight 1"
```

Windows (PowerShell or Command Prompt):

```powershell
.\start.cmd --dataset "D:\Flight data\flight 1"
```

The shared Python entry point also works directly (`python` or `py -3` on Windows):

```bash
python3 start.py --dataset "/path/to/flight data/flight 1" --port 8080
python3 start.py --skip-build
```

Relative `--dataset` paths are relative to the project root, not the terminal's current directory. Absolute paths and `~` are supported. `--skip-build` serves the existing generated dataset and does not require `--dataset`.

Options: `--port` defaults to 8000 (`--port 0` selects a free port); `--host` defaults to `127.0.0.1`. Use `--host 0.0.0.0` for LAN access. The launcher prints the actual viewer URL; Ctrl+C stops the server. An occupied port is reported before data generation begins.

A build runs all five generators, including parameter-domain extraction and mission-source reconstruction. Output is staged until all generators succeed. A successful build removes stale `domains/mission.json` and `domains/current_tasks.json` because this branch generates `series/mission-sources.json`; this prevents the viewer from using mission data left by another dataset. `--skip-build` preserves existing domain files.

## Project Layout

```text
data/raw/                 local raw logs and documents; ignored by git
public-data/              generated viewer JSON; ignored by git except .gitkeep
start.py                  shared cross-platform build/server launcher
start.bash / start.cmd    Linux/Termux and Windows entry points
scripts/                  data generators and regression checks
viewer/index.html         static interactive dashboard
docs/project-architecture.md
docs/source-review/       control-model and compatibility notes
docs/notes/               development notes and rollback context
src/flight_log_viewer/    placeholder Python package namespace
```

See `docs/project-architecture.md` for the detailed architecture.

## Generate Viewer Data

From the project root:

```bash
python3 scripts/summarize_dataset.py
python3 scripts/inspect_logs.py
python3 scripts/extract_dataflash_series.py
python3 scripts/build_parameters.py
python3 scripts/build_mission_sources.py
```

Default input dataset:

```text
data/raw/qq-2026-08-17/
```

Generated outputs:

```text
public-data/dataset-summary.json
public-data/log-inspection.json
public-data/series/*.json
public-data/domains/parameters.json
```

These generated JSON files are ignored by git and can be deleted/rebuilt at any time from `data/raw/`.

## Mission Task Sources

Mission source reconstruction is separate from flight mode detection. AUTO says the autopilot has mission authority; mission source/current-item data says which task is being executed. Generate source candidates with:

```bash
python3 scripts/build_mission_sources.py
```

This writes `public-data/series/mission-sources.json` from available external waypoints and DataFlash `CMD` records. Local manual selections belong in `project-data/mission-overrides.json`, which is ignored by git. See `docs/mission-task-sources.md`.

## Open The Viewer

Start a local web server from the project root:

```bash
python3 -m http.server 8000
```

Open this URL on the tablet:

```text
http://127.0.0.1:8000/viewer/index.html
```

If another device on the same network needs access, use the tablet's LAN IP instead of `127.0.0.1` and make sure the network allows local connections.

## Validation

Use this quick release check after changes:

```bash
python3 -m py_compile start.py scripts/extract_dataflash_series.py scripts/inspect_logs.py scripts/summarize_dataset.py scripts/mavlink_frames.py scripts/build_parameters.py scripts/build_mission_sources.py
python3 -m unittest tests.test_mission_pipeline tests.test_parameter_pipeline
python3 scripts/check_launcher.py
node scripts/check_mission_playback.mjs
node scripts/check_parameter_mode.mjs
node scripts/check_hud_session.mjs
python3 -c "from html.parser import HTMLParser; from pathlib import Path; HTMLParser().feed(Path('viewer/index.html').read_text()); print('viewer html ok')"
curl -I http://127.0.0.1:8000/viewer/index.html
git diff --check
git status --short
```

`curl` requires the local server to already be running. The regression checks use temporary data and do not rebuild your current dataset. Node.js is needed only for the viewer regression check, not for normal use. The optional `--sample` argument on `check_mission_playback.mjs` checks the August 26 two-route dataset specifically.

## Current Data And Compatibility Rules

Current sample log firmware: `ArduPlane V4.4.4 (16b78382)`.

Interpretation references: Plane 4.7 documents plus local ArduPilot source `master` at `381357f8`. These versions are not identical, so the viewer follows this rule:

- Parse DataFlash fields from the log's own `FMT` records.
- Treat `CMD` as the onboard route snapshot and prefer `MISE` for runtime current-item events on newer firmware; logs without `MISE` retain the legacy `CMD` event fallback.
- Show missing fields as missing instead of guessing.
- Treat mode, mission, navigation, TECS, stabilization, output, and motion as separate control layers.
- Use `.param` values as aircraft truth, while parameter explanations must state their documentation/source basis.

More detail is in `docs/source-review/version-compatibility.md` and `docs/source-review/control-model.md`.

## Git Release Workflow

Normal local commit:

```bash
git status
git add README.md docs viewer scripts src start.py start.bash start.cmd pyproject.toml data/README.md .gitignore
git commit -m "Describe the change"
```

Current release: `v0.1.2`. See [release notes](docs/releases/v0.1.2.md).

Create an annotated release tag after validation:

```bash
git tag -a v0.1.2 -m "Flight Log Viewer v0.1.2"
```

Add GitHub remote after creating an empty repository:

```bash
git remote add origin git@github.com:YOUR_USER/flight-log-viewer.git
```

Push branch and tags:

```bash
git push -u origin main
git push origin v0.1.2
```

Do not commit local datasets under `data/` or generated JSON under `public-data/` unless deliberately preparing a shareable sample dataset.
