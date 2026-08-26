# Flight Log Viewer

Offline ArduPilot fixed-wing log viewer and control-parameter analyzer for Termux/tablet use.

The project reads local flight data packages, generates static JSON under `public-data/`, and opens a single-page HTML dashboard in `viewer/index.html`. The current viewer focuses on fixed-wing Plane logs: flight modes, mission state, 2D/3D track review, HUD, L1 navigation, TECS, attitude/rate control, motion/IMU, I/O outputs, and custom field plotting.

## Requirements

Termux packages used by this project:

```bash
pkg install python git ripgrep
```

Optional but useful:

```bash
pkg install openssh
```

The Python scripts are intentionally dependency-light. `pymavlink` is optional for future work, but the current DataFlash extractor uses the log's own `FMT` records and does not require third-party packages.

## Project Layout

```text
data/raw/                 local raw logs and documents; ignored by git
public-data/              generated viewer JSON; ignored by git except .gitkeep
scripts/                  dataset summary, log inspection, DataFlash extraction
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
cd ~/work/projects/python/flight-log-viewer
python3 scripts/summarize_dataset.py
python3 scripts/inspect_logs.py
python3 scripts/extract_dataflash_series.py
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
cd ~/work/projects/python/flight-log-viewer
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
python3 -m py_compile scripts/extract_dataflash_series.py scripts/inspect_logs.py scripts/summarize_dataset.py
python3 scripts/summarize_dataset.py
python3 scripts/inspect_logs.py
python3 scripts/extract_dataflash_series.py
python3 scripts/build_mission_sources.py
python3 -c "from html.parser import HTMLParser; from pathlib import Path; HTMLParser().feed(Path('viewer/index.html').read_text()); print('viewer html ok')"
curl -I http://127.0.0.1:8000/viewer/index.html
git diff --check
git status --short
```

`curl` requires the local server to already be running.

## Current Data And Compatibility Rules

Current sample log firmware: `ArduPlane V4.4.4 (16b78382)`.

Interpretation references: Plane 4.7 documents plus local ArduPilot source `master` at `381357f8`. These versions are not identical, so the viewer follows this rule:

- Parse DataFlash fields from the log's own `FMT` records.
- Show missing fields as missing instead of guessing.
- Treat mode, mission, navigation, TECS, stabilization, output, and motion as separate control layers.
- Use `.param` values as aircraft truth, while parameter explanations must state their documentation/source basis.

More detail is in `docs/source-review/version-compatibility.md` and `docs/source-review/control-model.md`.

## Git Release Workflow

Normal local commit:

```bash
git status
git add README.md docs viewer scripts src pyproject.toml data/README.md .gitignore
git commit -m "Describe the change"
```

First release tag:

```bash
git tag -a v0.1.0 -m "First tablet flight log viewer release"
```

Add GitHub remote after creating an empty repository:

```bash
git remote add origin git@github.com:YOUR_USER/flight-log-viewer.git
```

Push branch and tags:

```bash
git push -u origin main
git push origin v0.1.0
```

Do not commit `data/raw/`, generated `public-data/*.json`, or `public-data/series/*.json` unless deliberately preparing a shareable sample dataset.
