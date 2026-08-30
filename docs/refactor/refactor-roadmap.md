# Refactor Roadmap

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

## Objective

Rebuild the project structure in controlled stages so future features can be added without repeatedly touching one large `viewer/index.html` file or duplicating source-selection logic.

The refactor has three non-negotiable constraints:

- Preserve current viewer behavior while refactoring.
- Keep missing-file compatibility: `.BIN` only, `.tlog` only, `.waypoints` only, `.param` only, and mixed partial datasets must still open useful views.
- Keep manual source selection as first-class behavior because tlog and external waypoint sources can be incomplete or stale.

## Current Baseline

Known baseline:

- Current release line: `v0.1.1` plus later main commits through `e961ad8`.
- Current branch: `refactor/ui-data-source-architecture`.
- Current frontend: static HTML/JS/CSS, no build step.
- Current backend: standalone Python scripts.
- Current parser strategy: DataFlash decode is driven by log-local `FMT`.
- Current UI risk: `viewer/index.html` is about 4298 lines and owns too many responsibilities.

Do not start by redesigning the visual UI. First make data contracts and module boundaries testable.

## Phase 0: Baseline Lock

Goal: freeze current behavior so later refactor regressions are obvious.

Actions:

- Commit the planning documents separately from runtime code.
- Regenerate `public-data` from the known flight2 dataset.
- Save a small generated schema snapshot under ignored temp output for comparison.
- Record current smoke-test commands in README or a test checklist.

Deliverables:

- Planning commit.
- Baseline validation command list.
- No runtime behavior changes.

Validation:

```bash
python3 -m py_compile scripts/extract_dataflash_series.py scripts/inspect_logs.py scripts/summarize_dataset.py scripts/build_mission_sources.py
python3 scripts/summarize_dataset.py --dataset data/26.8.26侦察/ZC_20260826_1533_flight2 --output /tmp/flv-baseline/dataset-summary.json
python3 scripts/extract_dataflash_series.py --dataset data/26.8.26侦察/ZC_20260826_1533_flight2 --output-dir /tmp/flv-baseline/series
python3 scripts/build_mission_sources.py --summary /tmp/flv-baseline/dataset-summary.json --mission /tmp/flv-baseline/series/mission.json --modes /tmp/flv-baseline/series/modes.json --output /tmp/flv-baseline/series/mission-sources.json
git diff --check
```

Rollback point:

- If later phases become unstable, return to the Phase 0 commit.

## Phase 1: Backend Package Skeleton

Goal: create a real Python package boundary while preserving the old CLI scripts.

Actions:

- Add `scripts/flv/` package.
- Move pure parsing logic into modules, but keep existing script filenames as wrappers.
- Do not change generated JSON output yet.

Proposed modules:

```text
scripts/flv/
  __init__.py
  models.py
  io/discover.py
  parsers/dataflash.py
  parsers/param_file.py
  parsers/qgc_waypoints.py
  parsers/mavlink_tlog.py
  normalize/mission.py
  normalize/parameters.py
  normalize/series.py
  export/legacy_json.py
```

First extraction order:

1. `parse_param_file`
2. `parse_waypoints_file`
3. DataFlash `FMT` decode helpers
4. DataFlash row extraction
5. tlog MAVLink frame scan and mission item decode
6. mission source construction helpers

Acceptance criteria:

- Existing commands produce the same effective JSON fields as before.
- Existing viewer still loads without frontend changes.
- Parser functions can be imported without running CLI code.

Validation:

```bash
python3 -m py_compile scripts/*.py scripts/flv/**/*.py
python3 scripts/summarize_dataset.py --dataset data/26.8.26侦察/ZC_20260826_1533_flight2 --output /tmp/flv-phase1/dataset-summary.json
python3 scripts/extract_dataflash_series.py --dataset data/26.8.26侦察/ZC_20260826_1533_flight2 --output-dir /tmp/flv-phase1/series
python3 scripts/build_mission_sources.py --summary /tmp/flv-phase1/dataset-summary.json --mission /tmp/flv-phase1/series/mission.json --modes /tmp/flv-phase1/series/modes.json --output /tmp/flv-phase1/series/mission-sources.json
```

Commit boundary:

- Commit after old CLIs still pass.

## Phase 2: Backend Tests And Fixtures

Goal: make parser behavior testable before changing generated schema.

Actions:

- Add minimal `unittest` tests first. Avoid dependency on pytest until needed.
- Add synthetic small binary/JSON/text fixtures where possible.
- Use real flight2 data only for optional smoke tests because raw logs are not committed.

Test targets:

- `.param` parser handles comma, tab, and whitespace formats.
- QGC waypoint parser handles valid files and rejects bad headers.
- DataFlash `FMT` parser handles field order and length correctly.
- `PARM` timeline returns latest and time-aware values correctly.
- MAVLink tlog parser validates CRC and extracts mission items/events.
- Mission current lookup handles incomplete route/current sources.

Acceptance criteria:

- Tests run without committing raw flight logs.
- At least core parser functions have deterministic tests.

Validation:

```bash
python3 -m unittest discover -s tests
python3 -m py_compile scripts/*.py scripts/flv/**/*.py
```

Commit boundary:

- Commit after tests exist and pass.

## Phase 3: Schema v2 Draft Export

Goal: introduce a canonical generated dataset beside the current legacy JSON.

Actions:

- Add a new build/export path that writes schema v2 files.
- Keep current `dataset-summary.json` and `series/*.json`.
- Do not switch the viewer to schema v2 yet.

New generated files:

```text
public-data/dataset.json
public-data/sources.json
public-data/signals.json
public-data/domains/modes.json
public-data/domains/mission.json
public-data/domains/parameters.json
public-data/domains/track.json
```

Core schema objects:

- `firmware`
- `compatibility_profile`
- `sources`
- `field_catalog`
- `signals`
- `domains`
- `warnings`

Acceptance criteria:

- Schema v2 can be generated from flight2.
- Legacy viewer output remains unchanged.
- Schema includes enough source references for mission, parameters, and logged signals.

Validation:

```bash
python3 scripts/flv_build.py --dataset data/26.8.26侦察/ZC_20260826_1533_flight2 --output /tmp/flv-v2
python3 scripts/check_schema_v2.py /tmp/flv-v2
```

Commit boundary:

- Commit after schema v2 is generated and validated independently.

## Phase 4: Firmware Compatibility Profiles

Goal: make firmware-version handling explicit and data-driven.

Actions:

- Detect firmware from DataFlash `MSG`.
- Export `firmware` metadata.
- Add compatibility profiles for generic Plane and the current known sample version family.
- Move mode maps out of ad-hoc frontend logic into profile data.
- Export a `field_catalog` from DataFlash `FMT`.

Profile files:

```text
project-data/compatibility/
  ardupilot-plane-generic.json
  ardupilot-plane-4.4.json
  ardupilot-plane-4.7.json
```

Acceptance criteria:

- Unknown firmware still loads using generic profile.
- Unknown mode numbers display as `MODE_n`.
- Missing fields are represented as unavailable instead of guessed.
- Formula explanations can carry `source-matched`, `nearby-version`, or `generic` confidence.

Validation:

```bash
python3 -m unittest discover -s tests
python3 scripts/flv_build.py --dataset data/26.8.26侦察/ZC_20260826_1533_flight2 --output /tmp/flv-v2
```

Commit boundary:

- Commit after profile selection and field catalog are generated.

## Phase 5: Frontend Data Layer

Goal: move source and lookup decisions out of `index.html`.

Actions:

- Add plain ES modules under `viewer/js/data/`.
- Keep static serving with `python3 -m http.server 8000`; no bundler yet.
- Load legacy JSON first, then add schema v2 loader when ready.

Proposed modules:

```text
viewer/js/data/loader.js
viewer/js/data/sources.js
viewer/js/data/mission.js
viewer/js/data/parameters.js
viewer/js/data/signals.js
viewer/js/data/compatibility.js
```

Move these responsibilities:

- mission source selection
- route/current-task lookup by time
- waypoint rows at time
- parameter source selection
- time-aware parameter lookup
- signal lookup and missing-field status

Acceptance criteria:

- `index.html` no longer contains source-resolution policy.
- Track, HUD, Inspector, and charts consume the same data resolver.
- Manual source selection still works.

Validation:

```bash
node --check viewer/js/data/*.js
python3 -m http.server 8000
```

Manual checks:

- Mission source switching.
- Parameter source switching.
- Playback current-waypoint highlight.
- Inspector selected time.

Commit boundary:

- Commit after source resolver functions are moved and viewer behavior matches previous baseline.

## Phase 6: Frontend State And Event Boundary

Goal: isolate mutable UI state and prevent draw code from owning app policy.

Actions:

- Add `viewer/js/state.js`.
- Add small event/update helpers.
- Keep state simple; no framework required.
- Move persistent local override storage into one module.

State groups:

- global time range
- inspector time
- source selection
- chart visibility
- chart scales
- track marker/playback
- 3D camera
- UI collapse/font settings

Acceptance criteria:

- Rendering code receives state and view models.
- Event handlers update state through clear functions.
- Local storage keys are centralized.

Commit boundary:

- Commit after state extraction and manual UI checks pass.

## Phase 7: Chart And Gesture Extraction

Goal: separate line chart rendering from Track/HUD and source logic.

Actions:

- Add `viewer/js/charts/scales.js`.
- Add `viewer/js/charts/line-chart.js`.
- Add `viewer/js/charts/gestures.js`.
- Move generic pointer/touch pan/zoom logic out of `index.html`.

Acceptance criteria:

- Shared X time pan still allows empty regions.
- Y pan/zoom remains local per chart.
- Zero line and mode transition lines still draw.
- Time reference and horizontal reference dragging still work.

Manual checks:

- Mouse drag pan.
- Touch drag pan.
- Two-finger pinch.
- Axis-edge reference creation and dragging.
- Collapse/expand chart layer.

Commit boundary:

- Commit after line charts pass desktop and tablet checks.

## Phase 8: Track, Camera, And HUD Extraction

Goal: make the Track layer maintainable.

Actions:

- Move 2D track drawing to `viewer/js/charts/track-2d.js`.
- Move 3D track drawing to `viewer/js/charts/track-3d.js`.
- Keep `viewer/js/track-camera.js`, but remove duplicate camera helpers from `index.html`.
- Move HUD drawing/data split into `viewer/js/hud/pfd.js` and `viewer/js/hud/hud-data.js`.
- Move Track controls into `viewer/js/ui/track-panel.js`.

Acceptance criteria:

- Track control panel is simpler and grouped by task.
- 2D and 3D source display uses the same mission resolver.
- HUD is a hideable panel associated with 3D track.
- Camera modes and overhead lock still work.
- Path/waypoint visibility toggles still work.

Manual checks:

- Free view.
- Fixed line-of-sight follow.
- Aircraft-relative follow.
- Track-vector follow.
- Overhead lock.
- Hide/show path and waypoints.
- Playback with current waypoint highlight.

Commit boundary:

- Commit after Track layer passes manual checks.

## Phase 9: Inspector And Formula Metadata

Goal: make control-source explanations useful but version-safe.

Actions:

- Move Inspector rendering to `viewer/js/ui/inspector.js`.
- Move formula definitions to data/config files or a dedicated module.
- Attach formula confidence from compatibility profiles.
- Keep formula details collapsed by default.

Acceptance criteria:

- Inspector shows selected time, flight mode, mission current task, source selections, direct values, parameters, and confidence.
- Missing fields show as `missing`.
- Version mismatch is visible but not noisy.
- Each control layer remains separate: mission/navigation, L1, attitude/rate, TECS, output, motion.

Commit boundary:

- Commit after Inspector output matches or improves previous behavior.

## Phase 10: UI Redesign Pass

Goal: improve layout after the code is modular enough to safely change it.

Actions:

- Keep left side as global control rail.
- Make Track first-priority: route/current task, 2D, timeline, 3D+HUD.
- Reduce repeated explanatory text.
- Add stronger visual grouping for source selectors.
- Keep all dense text scrollable horizontally and vertically.

Acceptance criteria:

- Tablet display gives more width to charts than controls.
- Important Track information is visible without hunting through long panels.
- Source selectors are globally consistent.
- The UI remains usable with only partial data.

Commit boundary:

- Commit after tablet manual review.

## Phase 11: Legacy Cleanup

Goal: remove duplicated code only after new modules are stable.

Actions:

- Shrink `viewer/index.html` into a shell.
- Remove legacy resolver functions.
- Remove legacy schema fallbacks only after at least one compatibility release.
- Update README and architecture docs.

Acceptance criteria:

- `index.html` contains markup shell and module imports only.
- Runtime logic lives in named modules.
- Generated data contract is documented.
- Release notes explain migration.

Commit boundary:

- Commit after full validation and documentation update.

## Release Strategy

Recommended branch sequence:

```text
refactor/ui-data-source-architecture
  -> phase commits
  -> merge to main after Phase 5 or Phase 8, depending on stability
```

Recommended tags:

- `v0.2.0-alpha.1`: backend package skeleton plus tests.
- `v0.2.0-alpha.2`: schema v2 draft plus compatibility profiles.
- `v0.2.0-beta.1`: frontend data layer and source resolver migrated.
- `v0.2.0`: modular UI stable enough for normal use.

Do not tag a release immediately after a large visual rewrite unless tablet manual checks pass.

## Stop Conditions

Pause and reassess if any of these happen:

- Generated data changes but no test explains why.
- A panel starts using its own source-selection rule again.
- Missing-file compatibility regresses.
- Track/HUD/Inspector disagree about current mission source or selected parameter source.
- `index.html` grows materially during refactor instead of shrinking.

## Immediate Next Step

Commit the planning documents, then begin Phase 1 with parser extraction only. The first implementation target should be backend package skeleton, because it creates stable seams for schema v2 and frontend resolver work.

