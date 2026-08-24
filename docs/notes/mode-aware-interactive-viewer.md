# Mode-aware interactive viewer

Date: 2026-08-23

## Implemented

- The DataFlash extractor now writes `public-data/series/modes.json` from the log's `MODE` and `MSG` records.
- Mode numbers are mapped with the Plane default mode table. Unknown values remain visible as `MODE_<number>` instead of being silently mislabelled.
- The generated manifest records compatibility context: log firmware, schema source, mode-map source, and explanation source.
- The viewer uses a shared time window across time-series charts.
- Time-series charts show absolute time on the bottom axis and flight-mode bands on the top axis.
- Mode buttons focus the full flight, `MANUAL`, `STABILIZE`, or `AUTO` ranges found in the actual log.
- Each time-series chart supports shared-time mouse wheel zoom, shared-time drag pan, checkbox-based curve visibility, hover readout, click-to-lock readout, and double-click unlock.
- Time-series vertical scale is chart-local state. Shared time-axis zoom/pan filters the visible samples but does not automatically rescale the Y axis.
- Dragging inside a time-series chart pans both axes: horizontal movement changes the shared time window, and vertical movement changes that chart's local Y-axis window.
- Time-series charts draw a zero-axis line when `y = 0` is inside the current Y-axis window.
- Mode transition times are drawn as vertical guide lines across every time-series chart.
- Touch interaction is supported: one-finger drag pans, two-finger pinch zooms time/Y on time-series charts and map scale on the track chart.
- User-defined horizontal Y reference lines are created or moved by clicking/dragging on the left Y-axis edge of a time-series chart.
- User-defined vertical time reference lines are created or moved by clicking/dragging on the bottom time-axis edge and appear on every time-series chart.
- Global controls, metrics, mode focus, and reference-line clearing controls live in a narrower left-side vertically scrollable control panel with a hide/show strip.
- Compatibility details are no longer shown as a long default panel; missing-data behavior remains implemented in loading fallbacks.
- Chart layers live in the right-side viewer panel and start collapsed by default to keep the first screen manageable on a tablet.
- Layers can be collapsed to keep the dashboard usable on a tablet screen.
- The waypoint table is shown as a full scrollable table instead of being truncated to the first ten rows; waypoint command buttons highlight the selected waypoint on the track chart.
- The track panel is filtered by the same time window so mode focus changes the visible flight-path segment.
- `Shift + wheel`, `Y +`, `Y -`, and `Reset Y` control each time-series chart's vertical scale; pan is handled by direct drag rather than extra buttons.
- The track panel uses an equal-scale local-meter projection for latitude/longitude geometry, filters invalid or far-off waypoint coordinates, and has independent drag pan, map zoom, and `Reset map` with a clamped default map scale.
- A custom data layer lets the user choose any loaded message and numeric field, then append it as a curve on a shared-time custom chart.

- A Motion / IMU layer now loads inertial and estimator families when present: `IMU`, `IMU2/3`, `ACC*`, `GYR*`, `VIBE`, `RATE`, `XKF*`, and legacy `NKF*`.
- The fixed Motion chart shows direct acceleration (`IMU.AccX/AccY/AccZ`), gyro (`IMU.GyrX/GyrY/GyrZ`), vibration (`VIBE.VibeX/Y/Z`), and EKF velocity (`XKF1.VN/VE/VD`) for the current time/mode window.
- All extracted inertial/EKF numeric fields are also available in the Custom Data layer for ad-hoc plotting without adding more fixed panels.
- Missing generated JSON files no longer block the whole viewer; absent groups fall back to empty data and the compatibility panel lists what is missing.
- `extract_dataflash_series.py` writes empty series and manifest output when no `.BIN` file is present, so waypoint-only or parameter-only packages can still be opened after `summarize_dataset.py` runs.

## Current sample

- Log firmware: `ArduPlane V4.4.4 (16b78382)`.
- Analysis explanation references: Plane 4.7 docs plus local ArduPilot source `master` at `381357f8`.
- Decoding strategy: use DataFlash `FMT` records from the log itself, not hard-coded message layouts.
- Mode sequence in the current sample: `MANUAL -> STABILIZE -> AUTO -> STABILIZE`.
- Current AUTO segment: about `922.669s` to `930.228s`.

## Compatibility rule

The viewer must separate three versions:

- Log firmware version: what actually flew and produced the data.
- Documentation version: what we use for conceptual explanation.
- Local source checkout: what we use for source-level tracing.

When they differ, data parsing should trust the log's own `FMT` schema first. Control interpretation should show its source/version and avoid pretending that a newer source checkout exactly describes an older flown firmware.


## Time Inspector plan

Goal: when the user clicks a time-series chart at time `t`, show a control-chain explanation for that exact time window.

First implementation scope:

- Store the selected inspector time globally so all charts and explanation panels reference the same `t`.
- Show the current flight mode and mode segment at `t` before any formula explanation.
- For each control layer, show source/formula relationship, logged variables, parameter values, and output signals.
- Mark every value as `direct`, `derived`, or `missing`; do not invent internal source variables that are not logged.
- Prioritize these chains: AUTO Mission -> L1 -> NavRoll, NavRoll -> Roll/Rate PID, TECS -> pitch/throttle demand, PID/output -> RCOU/SERVO, IMU/VIBE/EKF -> motion state.
- Expand parameter extraction so `SERVO*`, `RC*`, `INS_*`, `EK3_*`, `AHRS_*`, and related tuning parameters can appear in the inspector.

Design rule: formula cards should state source location and interpretation confidence. If a variable is unavailable in DataFlash, the UI should say `missing` or `estimated`, not present it as a precise source calculation.

## Next direction

The next useful step is the parameter-analysis layer: read `param`, map key parameters to L1, TECS, attitude/rate, and I/O layers, then display relevant parameter values beside the chart where their effects are interpreted.
