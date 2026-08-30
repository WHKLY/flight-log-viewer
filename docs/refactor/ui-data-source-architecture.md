# UI, Backend Script, and Data Source Refactor Plan

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

## Goal

This refactor is intended to make the project easier to develop and debug after the first usable release. The current viewer already proves the workflow: it can parse ArduPilot Plane logs, decode mission sources, show mode-aware charts, inspect parameters, and replay 2D/3D track/HUD state. The next step is not to add more isolated features, but to reduce coupling.

The requested refactor has three main targets:

- Build a cleaner UI structure so Track, Inspector, charts, data source controls, and global controls can evolve independently.
- Separate frontend and backend scripts more explicitly so parsers, normalizers, generated data, and viewer code have clear ownership.
- Replace scattered source-specific logic with one global source model that every panel uses consistently.

## Current Self-Assessment

### 1. `viewer/index.html` is too coupled

Current state:

- `viewer/index.html` is about 4298 lines.
- It contains CSS, HTML layout templates, global state, data loading, data normalization, mission source selection, parameter source resolution, 2D drawing, 3D projection, HUD drawing hooks, pointer/touch logic, chart scale logic, and custom chart logic in one file.
- Small UI bugs often require reading unrelated parts of the file because event binding, rendering, and state mutation are interleaved.

Main risks:

- Regression risk is high when changing Track controls or Inspector behavior.
- There is no clean place to test pure data decisions such as "which source is active at time t".
- Drawing functions and UI event handlers share global mutable state directly.
- Tablet gesture changes can accidentally affect ordinary chart panning or camera logic.

Refactor direction:

- Keep the app static and dependency-light for Termux.
- Split `viewer/index.html` into a shell plus focused JS modules.
- Move CSS into files grouped by purpose.
- Make data selection and source resolution pure functions wherever possible.

### 2. Backend scripts have useful pieces but unclear layers

Current scripts:

- `scripts/extract_dataflash_series.py`: decodes selected DataFlash messages using log `FMT` records and writes grouped JSON series.
- `scripts/summarize_dataset.py`: summarizes files, parameters, waypoint files, and DataFlash `PARM` values.
- `scripts/build_mission_sources.py`: reconstructs mission source candidates from external waypoint files, DataFlash `CMD`, and tlog MAVLink mission traffic.
- `scripts/inspect_logs.py`: inspection/debug helper.

Current problem:

- The scripts output viewer-oriented JSON directly, but there is no single explicit intermediate schema.
- Similar concepts appear in multiple outputs: selected files, source quality, mission source, parameter source, time ranges, compatibility notes.
- A future parser bug may require changing both a backend script and frontend assumptions because the contract is informal.

Refactor direction:

- Introduce a canonical generated dataset schema.
- Backend pipeline should be:
  1. discover input files
  2. parse raw protocols
  3. normalize into canonical source objects
  4. build indexes/timelines
  5. export viewer JSON
- Keep protocol-specific parsing separate from viewer-specific presentation.

### 3. Data source logic is scattered

Current examples:

- Mission source selection lives in frontend functions such as `missionSources`, `autoMissionSource`, `selectedMissionSource`, `missionVersionAt`, `missionItemsAt`, and local override handling.
- Parameter source selection lives separately in `parameterSourceModes`, `selectedParameterSet`, `dataflashParamAt`, and `resolveParameter`.
- Track waypoint rendering, current mission display, HUD demand display, Inspector, and charts each partly decide which data to use.

Main risk:

- The same time point can appear to use different source assumptions in different panels.
- Manual source override is currently mission-specific, while parameter source override follows a different model.
- Incomplete tlog, onboard mission updates, external waypoint files, and DataFlash `PARM` records need one consistent vocabulary.

Refactor direction:

- Add a global `sources` registry in generated data.
- Add a global `selection` state in the frontend.
- Every panel asks the same resolver: "for domain X at time t, which source and value are active?"

## External Project Research

The following projects and documents are useful references. They should guide the architecture, not be copied blindly.

### PX4 Flight Review / Flight Review Next

Links:

- https://github.com/PX4/flight-review-rs
- https://github.com/PX4/flight_review
- https://gist.github.com/jgoppert/8dafe8bb0f2a7b53adbae9260eb50a3d

Relevant lessons:

- A log viewer benefits from a parse-once, query-many pipeline.
- Separating upload/processing/storage from browser display makes large logs much easier to handle.
- The Flight Review Next direction uses structured columnar data ideas such as Parquet and browser-side query engines such as DuckDB-WASM. This project does not need that complexity now, but the principle is important: do not make the chart code parse source-specific logs.
- Metadata should describe available fields, units, time ranges, and source quality so the UI can be generic.

How this applies here:

- Keep current JSON for Termux simplicity, but organize it like a dataset with manifest, sources, field catalog, time series, and derived indexes.
- Do not require the UI to know that a value came from `.BIN`, `.tlog`, `.waypoints`, or `.param` unless it is showing provenance.

### PlotJuggler

Links:

- https://github.com/facontidavide/PlotJuggler
- https://plotjuggler.io/

Relevant lessons:

- PlotJuggler separates data loading/parsing from visualization.
- It treats time series as named signals that can be plotted flexibly.
- Extensibility comes from clean boundaries: data source, parser, transforms, and visualization are separate concerns.

How this applies here:

- Build a field catalog so charts can be generated from signal IDs, not handwritten per-message assumptions.
- Custom chart and fixed chart layers should use the same signal lookup system.
- Derived values such as airspeed error, roll error, or total acceleration should be registered as derived signals with dependencies and provenance.

### ArduPilot DataFlash Logs

Links:

- https://ardupilot.org/plane/docs/logmessages.html
- https://ardupilot.org/copter/docs/common-downloading-and-analyzing-data-logs-in-mission-planner.html

Relevant lessons:

- DataFlash `FMT` records are the correct source for message structure in a specific log.
- `PARM` records can provide parameter values recorded by the aircraft, but should be treated as time-aware records when multiple values exist.
- Mission-related records such as `CMD` are not the same as the uploaded waypoint file. `CMD` reflects what the autopilot logged while executing.

How this applies here:

- Keep trusting log-local `FMT` for binary decode.
- Preserve raw decoded rows and build normalized views from them.
- Treat parameters as a timeline, not only a final dictionary.

### MAVLink Mission Protocol

Links:

- https://mavlink.io/en/services/mission.html
- https://mavlink.io/en/messages/common.html#MISSION_CURRENT
- https://mavlink.io/en/messages/common.html#MISSION_ITEM_INT

Relevant lessons:

- A mission upload/download stream and current mission execution are related but different.
- `MISSION_ITEM_INT` / `MISSION_ITEM` describe mission items.
- `MISSION_CURRENT` and related events describe current sequence progress.
- Ground-station telemetry logs can be incomplete after link loss, so tlog-derived mission state must remain manually selectable and quality-scored.

How this applies here:

- Do not auto-trust tlog mission data just because it exists.
- Every mission source should expose completeness/quality metadata.
- The UI must allow manual source selection for any time window.

### CesiumJS / three.js Camera Control Patterns

Links:

- https://cesium.com/learn/cesiumjs/ref-doc/ScreenSpaceCameraController.html
- https://threejs.org/docs/#examples/en/controls/OrbitControls

Relevant lessons:

- Camera control should be isolated from drawing and UI state.
- Constraints such as "overhead only" should live in camera-control logic, not be scattered across draw code and event handlers.
- View modes should be explicit state machines: free, fixed line-of-sight, aircraft-relative, track-vector, overhead-locked.

How this applies here:

- The current `viewer/js/track-camera.js` is a good first extraction. The refactor should continue this direction and remove the remaining duplicated camera functions from `index.html`.

## Target Architecture

### Directory Layout

Proposed layout:

```text
scripts/
  flv_build.py                  single build entrypoint
  flv/
    io/discover.py              dataset file discovery
    parsers/dataflash.py         DataFlash FMT decode and raw rows
    parsers/mavlink_tlog.py      MAVLink/tlog frame and mission decode
    parsers/qgc_waypoints.py     QGC WPL parser
    parsers/param_file.py        .param parser
    normalize/sources.py         global source registry
    normalize/series.py          signal catalog and series normalization
    normalize/mission.py         mission versions/events/current-task index
    normalize/parameters.py      parameter sets and time-aware lookup records
    export/viewer_dataset.py     writes public-data JSON
    models.py                   typed dataclasses / schema helpers
viewer/
  index.html                    page shell only
  css/
    base.css
    layout.css
    controls.css
    charts.css
    track.css
    hud.css
  js/
    app.js                      bootstraps data loading and rendering
    state.js                    single frontend state store
    data/
      loader.js                 loads generated JSON
      catalog.js                signal catalog lookup
      sources.js                source resolver and provenance
      mission.js                mission lookup by time
      parameters.js             parameter lookup by time/source
    ui/
      layout.js                 left/right panel rendering
      toolbar.js
      inspector.js
      track-panel.js
      layer-panel.js
    charts/
      line-chart.js
      track-2d.js
      track-3d.js
      scales.js
      gestures.js
    hud/
      pfd.js
      hud-data.js
docs/
  refactor/
    ui-data-source-architecture.md
```

This is a target structure, not a requirement to complete in one commit.

### Generated Data Layout

Proposed top-level generated dataset:

```json
{
  "schema_version": 2,
  "dataset": {
    "id": "ZC_20260826_1533_flight2",
    "label": "ZC 2026-08-26 flight2",
    "time_range": {"start_s": 0.0, "end_s": 1234.5}
  },
  "files": [],
  "sources": {},
  "signals": {},
  "domains": {},
  "compatibility": {},
  "quality": {}
}
```

Recommended split files:

```text
public-data/dataset.json
public-data/sources.json
public-data/signals.json
public-data/domains/modes.json
public-data/domains/mission.json
public-data/domains/parameters.json
public-data/domains/track.json
public-data/domains/control.json
public-data/series/<message-or-signal-group>.json
```

Reason:

- `dataset.json` is the entry point.
- `sources.json` explains where every value can come from.
- `signals.json` lets UI charts query available fields generically.
- Domain files hold domain-specific indexes without forcing every view to load every record at startup.

## Global Source Model

### Source Object

Every input-derived source should be represented as a source object:

```json
{
  "id": "dataflash_bin_00000098",
  "domain": "dataflash",
  "kind": "bin_log",
  "label": "00000098.BIN",
  "file": "00000098.BIN",
  "time_basis": "boot_time_s",
  "available": true,
  "quality": {
    "complete": true,
    "warnings": []
  }
}
```

Examples:

- `dataflash_bin_00000098`
- `tlog_2026_08_26_150806`
- `external_waypoints_0815_wholetest`
- `param_file_ZC_20260826`
- `dataflash_parm_00000098`
- `manual_override_local`

### Source Reference

Every derived value should carry a compact source reference:

```json
{
  "value": 10,
  "source_id": "dataflash_parm_00000098",
  "source_record": "PARM.NAVL1_PERIOD",
  "time_s": 18.42,
  "status": "direct"
}
```

Status vocabulary:

- `direct`: directly decoded from a source record.
- `derived`: computed from direct values.
- `selected`: selected by user preference or manual override.
- `fallback`: used because the preferred source was absent.
- `missing`: unavailable.
- `estimated`: inferred and should not be treated as exact.

### Source Selection State

Frontend source selection should be centralized:

```js
const sourceSelection = {
  mission: {
    mode: "manual",
    sourceId: "onboard_cmd",
    timeRules: []
  },
  parameters: {
    mode: "manual",
    sourceId: "dataflash_parm_00000098",
    timeAware: true
  },
  waypoints: {
    mode: "manual",
    sourceId: "external_waypoints_0815_wholetest"
  },
  track: {
    positionSourceId: "dataflash_bin_00000098",
    attitudeSourceId: "dataflash_bin_00000098"
  }
};
```

No panel should maintain its own incompatible source-selection rules.

## Domain Models

### Mission Domain

Mission needs four separate concepts:

- Mission route source: which list of mission items is displayed.
- Current mission sequence source: which log stream says the aircraft is executing item N.
- Mission version: route may change during flight due to onboard computer updates.
- Manual override: user can choose source and optional sequence for a time range.

Proposed mission domain:

```json
{
  "sources": [
    {
      "source_id": "onboard_cmd",
      "route_versions": [],
      "current_events": [],
      "quality": {}
    },
    {
      "source_id": "tlog_mission",
      "route_versions": [],
      "current_events": [],
      "quality": {}
    },
    {
      "source_id": "external_wp",
      "route_versions": [],
      "current_events": [],
      "quality": {}
    }
  ]
}
```

Required UI behavior:

- User can manually choose route source.
- User can manually choose current-task source.
- If the source has current events, the current waypoint should be highlighted in playback.
- If a route exists without current events, route display still works, but current task is `missing`.
- If only `.BIN` exists, onboard `CMD` should still provide at least the task execution record when available.
- If only `.waypoints` exists, route display should work without pretending there is execution state.

### Parameter Domain

Parameter needs three separate views:

- `.param` file snapshot.
- DataFlash latest snapshot.
- DataFlash time-aware value at selected time.

Proposed parameter domain:

```json
{
  "sets": {
    "param_file": {},
    "dataflash_latest": {},
    "merged": {}
  },
  "timeline": [
    {"time_s": 12.3, "name": "NAVL1_PERIOD", "value": 10, "source_id": "dataflash_parm_00000098"}
  ],
  "selection_modes": ["merged", "param_file", "dataflash_latest", "dataflash_time"]
}
```

Rules:

- `.param` should not silently override DataFlash unless the user selects merged mode.
- DataFlash latest means last value by log order/time, not necessarily launch value.
- DataFlash time-aware means latest record at or before selected time.
- If a parameter changes mid-flight, Inspector should show the value active at the selected time.
- Every displayed parameter should show provenance when details are expanded.

### Signal Domain

Signals should be globally addressable:

```json
{
  "id": "ATT.Roll",
  "group": "attitude",
  "message": "ATT",
  "field": "Roll",
  "unit": "deg",
  "source_id": "dataflash_bin_00000098",
  "time_field": "time_s",
  "status": "direct"
}
```

Derived signal example:

```json
{
  "id": "derived.roll_error",
  "label": "Roll error",
  "unit": "deg",
  "status": "derived",
  "formula": "ATT.DesRoll - ATT.Roll",
  "dependencies": ["ATT.DesRoll", "ATT.Roll"]
}
```

Benefits:

- Fixed charts and custom charts use the same signal catalog.
- Inspector formulas can reference signal IDs instead of duplicating field paths.
- Missing fields are handled once in the catalog/resolver layer.

## Frontend Module Boundaries

### `state.js`

Owns:

- Global time window.
- Selected inspect time.
- Source selections.
- Track playback state.
- UI collapse/visibility flags.

Does not own:

- Drawing implementation.
- Source-specific parsing.
- DOM templates.

### `data/sources.js`

Owns:

- Source registry lookup.
- Manual source selection.
- Time-based source override rules.
- Provenance formatting.

Exports examples:

```js
resolveSource(domain, time)
resolveValue(signalId, time)
resolveMissionRoute(time)
resolveMissionCurrent(time)
resolveParameter(name, time)
```

### `charts/line-chart.js`

Owns:

- Line chart rendering.
- X/Y scale, zoom, pan.
- Mode bands, zero line, time reference lines.
- Hover and click point lookup.

Does not own:

- Which series exist.
- Parameter source selection.
- Mission source selection.

### `charts/track-2d.js` and `charts/track-3d.js`

Own:

- Track drawing only.
- Direction markers, axes, waypoint markers, current target highlight.
- Track-specific gestures.

Depend on:

- A prepared view model:

```js
{
  pathPoints: [],
  waypointPoints: [],
  currentWaypointSeq: 4,
  marker: {time_s: 123.4, position: {}, attitude: {}},
  camera: {}
}
```

They should not query raw mission sources directly.

### `ui/track-panel.js`

Owns:

- Track control layout.
- Path display mode controls.
- Marker/playback controls.
- Source selection controls.
- HUD visibility toggle.

Does not own:

- 3D camera math.
- Mission source inference.
- HUD drawing internals.

## UI Refactor Plan

### Current UI Problems

- Track/Geometry grew organically and now mixes path display, playback, camera, mission source, HUD, and waypoint table.
- Some controls are close to the thing they affect, but the grouping is inconsistent.
- Left sidebar can become dense even with width limits.
- Text-heavy areas need contained scrolling, but too many labels still compete for horizontal space.
- Important first-priority information should be visible together: 3D track, HUD, current mission task, playback marker.

### Proposed UI Structure

Left global control rail:

- Dataset status.
- Global time window.
- Flight mode filter.
- Global parameter source.
- Global mission/route source summary.
- Inspector toggle and clear button.
- Font size.

Right work area:

- Layer accordion list.
- All layers collapsed by default except Track can be optionally remembered.
- Each layer has local controls near its chart.

Track layer:

```text
Track Header
  Source summary: route source, current-task source, parameter source
  Quick toggles: 2D, 3D, HUD, Path, Waypoints

2D Map

Track Timeline Controls
  Path time: global window / full flight
  Marker range: global window / full flight
  Flight mode: all / AUTO / STABILIZE / ...
  Marker slider and play speed

3D + HUD Row
  3D view canvas
  HUD overlay/panel

Mission Task Compact Card
  Current seq, command, source, age, quality

Waypoint Table
  Scrollable, source-aware, click highlights waypoint
```

Inspector:

- Remains global, but should consume the same source resolver as Track/HUD.
- Formula explanation should be collapsible and not dominate normal review.
- Each chain card should show current values, selected parameters, missing/derived/direct status, and optional expanded formula/source notes.

## Backend Refactor Plan

### Phase 1: Freeze Current Output With Tests

Before moving files:

- Add a small schema smoke test for `public-data`.
- Add fixture-based tests using the existing flight2 dataset path when available.
- Verify current behavior:
  - `.BIN` only can extract track, modes, mission `CMD`, and DataFlash `PARM`.
  - `.waypoints` only can show route.
  - `.param` only can show parameter table.
  - `.tlog` partial mission data remains selectable but not blindly trusted.

### Phase 2: Introduce Python Package Modules Without Changing Output

Move logic gradually:

- Copy parser logic into `scripts/flv/parsers/*`.
- Keep old script names as thin CLI wrappers.
- Maintain existing JSON output so the viewer does not change yet.
- Add unit tests around pure functions: parameter parse, tlog frame scan, mission version building, DataFlash FMT decode.

### Phase 3: Add Schema v2 Alongside Existing JSON

Write new files:

- `public-data/dataset.json`
- `public-data/sources.json`
- `public-data/signals.json`
- `public-data/domains/*.json`

Keep old files during transition:

- `dataset-summary.json`
- `series/*.json`
- `series/mission-sources.json`

Reason:

- The UI can migrate one domain at a time.
- If schema v2 has a bug, old viewer code still works.

### Phase 4: Frontend Source Resolver

Create:

- `viewer/js/data/loader.js`
- `viewer/js/data/sources.js`
- `viewer/js/data/mission.js`
- `viewer/js/data/parameters.js`
- `viewer/js/data/catalog.js`

Migrate current functions:

- `selectedMissionSource`
- `missionItemsAt`
- `missionInfoAt`
- `currentNavigationSeq`
- `resolveParameter`
- `dataflashParamAt`
- `parameterMatches`
- `sampleLoggedValue`

Expected result:

- Charts and UI receive view models, not raw global `summary` logic.

### Phase 5: Split UI And Drawing

Extract in this order:

1. Utility functions: `number`, `format`, `dom`, `color`.
2. State store and event dispatcher.
3. Line chart renderer.
4. Track 2D renderer.
5. Track 3D camera and renderer.
6. HUD renderer and HUD data adapter.
7. Inspector renderer.
8. Layer layout renderer.

Reason:

- Extracting pure utilities first reduces diff size.
- Track 3D already has `track-camera.js`; continue from that working seam.
- The largest risk is pointer/touch behavior, so keep gestures in one module.

### Phase 6: Remove Legacy Paths

Only after schema v2 and modular frontend are stable:

- Remove duplicated source selection logic from `index.html`.
- Convert `index.html` into a small shell.
- Keep a compatibility loader for old generated datasets for at least one release.

## Testing Strategy

### Python

Add tests for:

- DataFlash `FMT` format parsing.
- DataFlash message decode with unknown/unwanted messages.
- `PARM` timeline behavior with mid-flight parameter changes.
- `.param` file parsing.
- QGC waypoint parsing.
- MAVLink tlog frame detection and CRC validation.
- Mission source quality scoring.
- Mission current sequence lookup by time.

Suggested commands:

```bash
python3 -m py_compile scripts/*.py
python3 -m pytest
```

If avoiding pytest initially, add script-level smoke tests under `scripts/tests/` using Python `unittest`.

### JavaScript

Keep browser-free tests for pure modules:

- source resolver
- mission lookup
- parameter lookup
- chart scale math
- camera pitch constraints

Suggested commands:

```bash
node --check viewer/js/*.js
node scripts/check_viewer_modules.mjs
```

### Manual Tablet Checks

Minimum manual checks after each UI refactor step:

- Load viewer from `http://127.0.0.1:8000/viewer/index.html`.
- Pin inspector time from a chart.
- Pan/zoom a line chart with touch.
- Pan/zoom 2D Track.
- Rotate/pan/zoom 3D Track.
- Toggle overhead lock.
- Switch mission route source.
- Switch current-task source.
- Switch parameter source.
- Play Track marker at 0.5x and 4x.
- Confirm current waypoint highlight follows playback.

## Migration Rules

These rules should prevent avoidable regressions:

- Do not rewrite everything at once.
- Keep current generated JSON readable until the modular viewer works.
- Every moved function should keep behavior first; cleanup can happen after tests pass.
- Do not introduce npm bundling unless there is a clear benefit. Plain ES modules are enough for now.
- Do not add a heavy 3D engine yet. The current canvas 3D is adequate and easier to debug on Termux/tablet.
- Preserve compatibility with missing files: `.BIN` only, `.waypoints` only, `.param` only, and incomplete `.tlog` should all still load useful partial views.
- Preserve manual source selection as first-class behavior.

## Candidate Milestones

### Milestone A: Documentation and Baseline

Deliverables:

- This refactor plan.
- Current architecture self-assessment.
- No functional code changes.
- Branch created from current `origin/main`.

### Milestone B: Backend Package Skeleton

Deliverables:

- `scripts/flv/` package.
- Old CLI scripts remain.
- Unit tests for parsers and source model.
- Existing public-data output unchanged.

### Milestone C: Schema v2 Export

Deliverables:

- `public-data/dataset.json`
- `public-data/sources.json`
- `public-data/signals.json`
- `public-data/domains/*.json`
- README update explaining old/new generated files.

### Milestone D: Frontend Data Layer

Deliverables:

- `viewer/js/data/*`
- All source/mission/parameter lookup moved out of `index.html`.
- Existing UI remains visually similar.

### Milestone E: UI Module Split

Deliverables:

- `index.html` reduced to shell and imports.
- CSS split by purpose.
- Track panel, Inspector, line charts, 2D/3D track, and HUD have separate modules.

### Milestone F: UI Redesign Pass

Deliverables:

- Cleaner left global controls.
- Track first-priority layout with 3D + HUD + current task.
- Consistent source selectors.
- Reduced redundant text.

## Open Questions

- Should schema v2 optimize for many small JSON files or fewer larger JSON files? Tablet browser request overhead and memory need testing.
- Should generated data include all raw decoded rows, or only selected groups plus signal catalog? Full raw rows improve flexibility but increase load time.
- Should mission route source and current-task source always be separate controls? Technically yes, but UI may need a compact "linked mode" for normal use.
- Should source override rules stay browser-local, or should there be a small local project config file edited by scripts? Browser-local is convenient, file-based is more reproducible.

## Recommended Next Step

Start with Milestone B, not UI redesign. The reason is practical: once backend source objects and resolver tests exist, the UI can be split with lower risk. If UI is redesigned first while source logic remains scattered, the same class of bugs will reappear in a cleaner-looking layout.

