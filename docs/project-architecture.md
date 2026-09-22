# Project Architecture

Date: 2026-09-22

## Purpose

`flight-log-viewer` is a local-first static analysis tool for ArduPilot fixed-wing flight reviews. It converts raw local files into static JSON and renders the result in a tablet-friendly HTML dashboard.

The architecture is deliberately simple:

```text
raw files -> Python extraction scripts -> public-data JSON -> static HTML viewer
```

No backend server is required after JSON generation. `python3 -m http.server` is only used to serve static files to the browser.

## Directory Responsibilities

| Path | Role | Git policy |
| --- | --- | --- |
| `data/raw/` | Local `.BIN`, `.tlog`, `.waypoints`, `.param`, PDFs, and copied field documents. | Ignored. Do not publish flight data by default. |
| `scripts/` | Rebuildable data pipeline. | Tracked. |
| `public-data/` | Generated JSON consumed by the viewer. | Ignored except `.gitkeep`. |
| `viewer/index.html` | Static document shell and feature mounting points. | Tracked. |
| `viewer/js/` | Deep browser modules for mission playback, shared playback, HUD sessions, Review, and Parameter mode. | Tracked. |
| `viewer/data/` | Versioned, portable interpretation catalogs used by the static viewer. | Tracked. |
| `docs/source-review/` | Stable control-model, compatibility, and extraction notes. | Tracked, except generated extracted text. |
| `docs/notes/` | Development notes and rollback context. | Tracked. |
| `src/flight_log_viewer/` | Python package namespace reserved for later refactoring. | Tracked. |

## Data Pipeline

### `scripts/summarize_dataset.py`

Reads the local dataset directory and writes `public-data/dataset-summary.json`.

Main responsibilities:

- List raw files and duplicate groups.
- Select the preferred `.param` and `.waypoints` files.
- Parse aircraft parameters.
- Parse Mission Planner/QGC waypoint files.
- Extract control-relevant parameter subsets.

### `scripts/inspect_logs.py`

Writes `public-data/log-inspection.json`.

Main responsibilities:

- Inspect DataFlash `.BIN` messages without external dependencies.
- Inspect MAVLink `.tlog` frame/message counts.
- Summarize available message families before full extraction.

### `scripts/extract_dataflash_series.py`

Writes `public-data/series/*.json`.

Main responsibilities:

- Decode selected DataFlash messages using the log's embedded `FMT` schema.
- Keep `CMD` route snapshots separate from `MISE` runtime mission-item events, with a `CMD` event fallback for older logs.
- Produce grouped series files for track, mission, attitude, navigation, TECS, PID, motion, I/O, events, and modes.
- Write compatibility metadata such as log firmware, parser source, mode map source, and explanation source.
- Emit empty groups when source data is missing so partial datasets remain viewable.

### `scripts/mavlink_frames.py`

Dependency-free framing seam shared by mission and parameter domains:

- Scans MAVLink 1 and MAVLink 2 streams.
- Validates message CRC extras before decoding payloads.
- Preserves system/component identity and timestamped `.tlog` relative time.
- Does not interpret domain payloads; each domain owns its message schema.

### `scripts/build_parameters.py`

Writes `public-data/domains/parameters.json`.

Main responsibilities:

- Recursively enumerate `.param`, `.bin`, and `.tlog` sources without silently merging systems or files.
- Normalize parameter snapshots and DataFlash timelines behind one source interface.
- Decode MAVLink `PARAM_VALUE` and `PARAM_EXT_VALUE` records.
- Report declared-count/index coverage for TLog source completeness.
- Preserve source file, source kind, system ID, and component ID for explicit switching in the viewer.

## Viewer Layers

The viewer is organized by control layer rather than raw message name:

| Layer | Main data | Purpose |
| --- | --- | --- |
| Flight Mode / Mission | `MODE`, `CMD`, `MISE`, `MAVC`, `MSG` | Identify who has control, reconstruct the route from `CMD`, and follow runtime mission-item changes from `MISE`. |
| Track / Geometry | `POS`, `GPS`, waypoints, `ATT` | 2D equal-scale path, 3D path, aircraft marker, HUD. |
| L1 Navigation | `CTUN`, `NTUN` | Cross-track, bearings, final navigation roll/pitch/heading demands. |
| TECS Energy | `TECS`, `TEC2`, `ARSP` | Speed, altitude, pitch, throttle energy-control behavior. |
| Attitude / Rate | `ATT`, `PIDR`, `PIDP`, `PIDY` | Demanded vs actual attitude and rate-loop evidence. |
| Motion / IMU | `IMU`, `RATE`, `VIBE`, `XKF*`, `NKF*` | Acceleration, gyro, vibration, estimator velocity and motion evidence. |
| I/O Outputs | `RCIN`, `RCOU` | Pilot input and actuator/throttle output values. |
| Custom Data | Any loaded numeric field | Ad-hoc plotting for fields not promoted to fixed panels. |

The Review/Parameter shell, shared playback module, HUD popout, and unified parameter domain are specified in [`docs/notes/parameter-mode-and-playback-refactor-plan.md`](notes/parameter-mode-and-playback-refactor-plan.md).

Parameter mode is split into two browser modules: `ParameterModel` contains source, classification, search, and diagnostic rules; `ParameterView` is the DOM adapter. The Plane 4.7 catalog under `viewer/data/` supplies portable aliases and control-layer metadata.

## Track And HUD Design

The Track layer has three independent time concepts:

- Shared chart window: controls time-series and visible path window.
- Track path mode: can follow the shared window or show the full flight.
- Plane marker time: controls the aircraft marker, 3D model, HUD, and playback.

The HUD uses color semantics:

- Yellow: fixed aircraft reference and current heading pointer.
- Magenta: direct controller demands from `TECS.spdem/hdem` and `ATT.Des*`.
- Blue: final navigation demands from `CTUN.NavRoll/NavPitch` and `NTUN.NavBrg/TBrg`.

The 3D view draws blue semi-transparent drop lines from already-flown path points down to the ground plane to make altitude easier to judge.

## Compatibility Boundary

The project separates these version sources:

- Actual log firmware: from DataFlash `MSG` records.
- Parser schema: from the log's own `FMT` definitions.
- Documentation source: Plane 4.7 documents currently in local raw data.
- Source explanation: local ArduPilot source revision `381357f8`.

Data parsing should trust `FMT` first. Control interpretation should show missing or uncertain values instead of filling gaps with assumptions from a different firmware version.

## Release Boundary

A release should include:

- Source scripts.
- Static viewer.
- Documentation and notes needed to understand current behavior.
- Empty `public-data/` directory marker.

A release should not include:

- Raw logs or copied private field files.
- Generated JSON results.
- Python bytecode caches.
- Extracted text generated from local PDFs unless intentionally reviewed and approved for publication.
