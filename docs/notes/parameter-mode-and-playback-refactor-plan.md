# Parameter Mode And Playback Refactor Plan

Date: 2026-09-22

## Implementation Status

The first usable vertical slice is implemented:

- Shared `PlaybackController` drives Track, every lower chart, Inspector, and HUD from one clock.
- `HudSession` and `viewer/hud.html` provide a same-origin standalone HUD on Windows and Linux browsers without OS-specific code.
- Waypoint tables use intrinsic table width plus explicit horizontal overflow; the collapsed control rail keeps a 40 px expand button.
- `scripts/mavlink_frames.py` is the shared CRC-valid MAVLink 1/2 framing seam used by mission and parameter extraction.
- `scripts/build_parameters.py` enumerates `.param`, `.bin`, and `.tlog` files recursively and publishes independent sources to `public-data/domains/parameters.json`.
- `ParameterModel` owns source selection, control-layer classification, synonym search, and deterministic diagnostics; `ParameterView` owns DOM rendering.
- The tracked Plane 4.7 catalog is derived from the local control guide but has no runtime dependency on that private source path.

Deferred depth, rather than hidden partial behavior: side-by-side source diff, fuzzy typo matching, full units/special-value metadata, and log-event-to-parameter evidence links remain later slices. Current search supports exact text, prefixes, English aliases such as `takeoff`/`tkoff`, descriptions, and control-layer names.

## Goal

Improve the flight-review workflow without turning `viewer/index.html` into a larger monolith. The work adds a dedicated Parameter mode, shared playback controls, a portable HUD popout, and several usability fixes while preserving the local-first static architecture and the existing ArduPlane 4.5/4.7 mission-playback behavior.

## Constraints

- Keep the application static after JSON generation; do not add a runtime backend.
- Keep Windows, Linux, Termux, and tablet browsers on the same implementation.
- Do not add a production dependency unless the standard library and browser platform are insufficient.
- Do not publish raw logs or generated `public-data`.
- Trust DataFlash `FMT` for log fields and show compatibility uncertainty rather than guessing across firmware versions.
- Preserve one playback clock. Every chart control, track marker, Inspector, and HUD must observe the same time.

## Deep Modules And Seams

### App shell

The app shell owns top-level `Review` / `Parameters` navigation and data loading. It does not own chart, HUD, or parameter interpretation implementation.

### Playback controller

The playback controller owns current time, playback range, speed, play/pause state, animation scheduling, and change notification. Track and line-chart controls are adapters at the same seam; they must not create separate animation loops.

### HUD session

The HUD session produces one HUD snapshot for a selected playback time. The embedded canvas and the browser popout are two adapters at the same seam. The popout uses browser messaging only, never OS-specific window commands.

### Parameter domain

The parameter domain normalizes `.param`, DataFlash `PARM`, and MAVLink parameter messages into explicit sources with provenance, completeness, conflicts, and optional timelines. Parameter views and Review key-parameter cards use the same interface.

### Parameter catalog and diagnostics

The catalog records Plane-version metadata, control-layer classification, aliases, descriptions, units, special values, and source references. Diagnostics are deterministic rules with evidence and severity; display ranges alone are not treated as hard runtime limits.

## Delivery Slices

### 1. Shell, shared playback, and immediate UI fixes

- Introduce the top-level view switch while keeping Review as the default.
- Extract shared playback state and scheduling from Track-specific code.
- Add compact play/pause controls to every time-series chart.
- Move the main playback strip next to the Track charts; keep path, mission-source, and camera settings close to the views they affect.
- Make waypoint tables genuinely horizontally scrollable with an intrinsic-width table.
- Redesign the collapsed control rail so its expand affordance remains visible and keyboard accessible.

### 2. Portable HUD popout

- Reuse the existing HUD renderer.
- Add `viewer/hud.html` and a popout adapter opened directly by a user click.
- Synchronize HUD snapshots and playback state with `BroadcastChannel`, with same-origin messaging as a fallback.
- Detect closed/disconnected windows and keep the embedded HUD usable.
- Do not promise browser-independent always-on-top behavior; that requires a separate desktop wrapper.

### 3. Unified parameter extraction

- Generalize the CRC-valid MAVLink frame scanner currently embedded in mission extraction.
- Add adapters for `.param`, DataFlash `PARM`, MAVLink `PARAM_VALUE` / `PARAM_EXT_VALUE`, and parameter-change evidence.
- Treat request messages as completeness evidence, not parameter values.
- Enumerate parameter-bearing files instead of silently choosing and merging the first one.
- Publish `public-data/domains/parameters.json` with source identity, counts, coverage, values, timelines, type information, and conflicts.
- Use BIN time-aware values first for flight review, then complete TLog snapshots, then `.param`; keep merged data an explicit choice.
- Disable time-aware TLog resolution when a reliable alignment anchor is unavailable.

### 4. Catalog, search, and diagnostics

- Curate versioned Plane 4.7 metadata from the control documents into a tracked JSON catalog; the local source-document path is not a runtime dependency.
- Classify parameters by Mission/RTL, L1, TECS, takeoff, landing, attitude/rate, airspeed/envelope, estimator/sensors, and I/O.
- Rank search by exact name, prefix, explicit alias, description/control layer, then typo-tolerant matching.
- Include aliases such as `takeoff -> tkoff` and Chinese control terms.
- Separate definite configuration contradictions from advisory flight-evidence links.
- Preserve special meanings such as `0` and `-1` before applying range rules.

### 5. Parameter mode

- Add a source selector with provenance and completeness.
- Add control-layer navigation, ranked keyword search, and source comparison.
- Add summaries for important parameters, changed values, conflicts, and diagnostics.
- Add parameter details with value, source, record time, unit, explanation, special values, and related parameters.
- Let a parameter link back to the relevant Review layer without duplicating parameter lookup logic.

### 6. Cleanup and verification

- Leave `viewer/index.html` as a document shell and move cohesive implementation into modules and feature-level styles.
- Update architecture and source-compatibility documentation.
- Run Python extraction tests, Node playback/search tests, HTML/JavaScript syntax checks, real 4.5/4.7 flight-data regression, responsive browser checks, and Windows/Linux HUD checks.

## Parameter Source Rules

- A source selector always identifies the concrete file and source kind.
- A merged view shows per-value provenance and conflicts.
- DataFlash and TLog timelines retain raw record time and alignment quality.
- TLog completeness uses declared count/index coverage where available.
- Multiple systems/components are not combined silently.
- Firmware-specific explanations show their documentation version.

## Diagnostic Rules

Initial definite checks should include ordered limits and cross-parameter invariants such as airspeed, throttle, pitch, and servo min/trim/max relationships. Feature-prerequisite and display-range checks remain warnings unless the control documentation defines an actual invalid state.

Log `ERR`, text messages, and TLog status messages may identify a relevant control layer and related parameters, but the UI must describe these as evidence links rather than proven causes.

## Acceptance Criteria

- The waypoint table exposes horizontal scrolling on desktop and touch-width layouts.
- The collapsed control rail always exposes a visible expand button.
- Track playback controls are adjacent to the visualizations they control.
- Every time-series chart can control the same playback clock.
- Embedded and popout HUDs show the same selected-time values.
- Parameter mode can switch among available `.param`, BIN, and TLog sources.
- `tkoff`, `takeoff`, and equivalent Chinese terms return the relevant takeoff parameters.
- Incomplete TLog sources and source conflicts are visible.
- Plane special values are not reported as errors solely for falling outside a display range.
- The ArduPlane 4.7 AUTO mission regression remains `1 -> 10 -> 14`, and older CMD-only logs retain their fallback behavior.

## Commit Plan

1. Extract app shell and shared playback controller.
2. Improve track controls and table overflow.
3. Add portable HUD popout.
4. Build the unified parameter domain from BIN, TLog, and parameter files.
5. Add Parameter mode, catalog search, and diagnostics.

The implementation keeps these boundaries even if the work is committed as fewer repository commits.
