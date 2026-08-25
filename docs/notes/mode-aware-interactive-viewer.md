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
- The Track layer now includes a lightweight 3D Flight Path canvas using POS altitude and nearest ATT attitude; it supports drag rotation, wheel/pinch zoom, Reset 3D, shared time-window filtering, waypoint highlighting, and a simple nose/right/up attitude triad.
- The Track layer now has local time controls: path display can switch between the shared window and full flight, while the aircraft marker uses an independent selected time. The 3D view now supports pan on desktop and tablet, and the displayed roll sign is corrected.
- Track time controls now sit between the 2D and 3D track canvases, include a Track-specific flight-mode filter, allow the aircraft marker slider to use either the current window or full flight, and the 3D marker is drawn as a simple aircraft model instead of only a triad.
- Track playback controls now advance the independent Plane time marker with selectable speed. The 3D aircraft model is smaller and uses line-only wings/body without the translucent green surface fill.
- Track playback polish: the Track control panel now uses theme-aware background color, and Plane time drag/playback updates the global Inspector time so status cards follow the selected aircraft marker time.
- Track HUD: the right-side Track panel now shows marker-time attitude, altitude, GPS ground speed, ARSP airspeed, heading, flight mode, GPS status, and sample ages. The 3D aircraft model is reduced by another 50 percent.
- Track HUD now has a hide/show toggle and renders a graphical attitude indicator with sky/ground horizon, pitch ladder, roll pointer, heading cue, and missing-attitude state. Numeric speed/altitude/mode readouts remain below the graphical HUD.
- Track HUD placement now follows the 3D view note and appears before the waypoint table, so it is visually aligned with the 3D track area rather than the top of the right-side panel.
- Track HUD now uses a PFD-style layout: speed tape on the left, altitude tape on the right, heading tape at the bottom, central attitude horizon, and no separate numeric roll/pitch readout. The HUD block is placed after the waypoint table.
- Track HUD now overlays logged direct demanded values in magenta: `TECS.spdem` on speed, `TECS.hdem` on altitude, `ATT.DesYaw` on heading, and `ATT.DesRoll/DesPitch` as a central attitude command cue. Waypoint-file targets are not used for these HUD demand markers.

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


## Mission execution inspector plan

Goal: at any selected time `t`, show what mission/autopilot task the aircraft was executing, not only the flight mode.

First implementation scope:

- Extract DataFlash `CMD` records into a `mission` series group. `CMD.CNum` and `CMD.CId` are the first trusted source for current mission command/waypoint execution.
- Also extract `MAVC` and `EV` into the same group for later command/event interpretation, but do not over-interpret them in the first UI pass.
- In Time Inspector, show the latest `CMD` record at or before selected time `t`, including command number, MAV_CMD name, command parameters, target lat/lon/alt, and sample age.
- Cross-reference the waypoint file by command number when available, so the UI can show both logged execution (`CMD`) and planned waypoint-file metadata.
- If no `CMD` record exists, show `missing` and do not infer an exact active mission item from position alone. Later versions may add an explicit `estimated nearest leg` field.

Design rule: mission command execution and flight mode are separate. `AUTO` tells who has authority; `CMD` tells which mission item/task is being executed.


## UI simplification plan

Goal: keep the tablet UI operational first. The viewer should not read like documentation during normal log inspection.

Changes for this pass:

- Time Inspector defaults to compact status cards: selected time, mode, mission command, values, and key parameters.
- Long formula/source explanations are removed from the default view; detailed source notes should be available only on demand in later iterations.
- Add a clear-inspect action that removes the global inspect line and clears pinned readouts.
- Keep controls in the left panel, charts on the right, and make the left panel readable as a control surface rather than a text article.
- Prefer short labels and small value rows over paragraphs. Missing data should be visible through status badges, not long explanatory text.


## Inspector and font controls plan

Goal: make the left control panel adjustable while inspecting dense logs on a tablet.

Changes for this pass:

- Add an Inspector hide/show toggle that keeps selected inspect time and chart marker state intact.
- Add a global font-size control cycling through compact, normal, and large UI text sizes.
- Keep both controls in the left global toolbar so they are available without opening chart layers.
- Font scaling should update layout and canvases immediately after switching.


## Text scrolling and inspector item collapse plan

Goal: keep dense text readable without forcing the whole tablet layout to expand.

Changes for this pass:

- Each Inspector control-chain card gets its own hide/show toggle independent of the overall Inspector toggle.
- Chain collapse state is preserved while selecting new inspect times.
- Text-heavy UI containers use horizontal and vertical overflow scrolling where content can exceed the available area.
- Tables and small value labels prefer contained scrolling over pushing chart widths or panel widths wider.


## Parameter panel v1 and sidebar width plan

Goal: start layer-specific parameter analysis without letting the left control panel steal chart width.

Changes for this pass:

- Clamp the expanded left control panel to a narrower fixed range and force child content to scroll inside it instead of widening the grid.
- Add a lightweight parameter map in the viewer for L1, TECS, attitude/rate, I/O, and motion layers.
- Render compact parameter cards in layer side panels using current `.param` values from `dataset-summary.json`.
- Keep long parameter names and values horizontally scrollable inside cards.

## 3D flight path viewer plan

Goal: add a tablet-friendly 3D view of the aircraft path without introducing a heavy dependency in the first pass.

Changes for this pass:

- Add a 3D Flight Path canvas in the Track layer, sharing the same global time window as the 2D track and charts.
- Reuse existing POS latitude/longitude projection and altitude fields to build local-meter `x/y/z` points.
- Use ATT `Roll/Pitch/Yaw` near the current inspect time, or the visible segment end when no inspect time is selected, to draw a simple aircraft attitude triad.
- Support direct drag rotation, wheel/pinch zoom, and reset view for tablet operation.
- Keep this as a lightweight Canvas projection first; later versions may replace the aircraft marker with a richer WebGL model if the interaction and data mapping prove useful.

## Track timeline and 3D interaction v2 plan

Goal: separate path display time from aircraft marker time and make 3D navigation usable on both tablet and desktop.

Changes for this pass:

- Add Track-layer local controls for path display mode: current shared time window or whole-flight path.
- Add an independent aircraft marker time slider so the airplane pose can be inspected at a specific time without changing the displayed path segment.
- Apply the path display mode consistently to both 2D track and 3D track.
- Correct the roll sign used by the simple aircraft attitude triad.
- Add 3D pan: desktop Shift-drag/right-drag pans, normal drag rotates, wheel zooms; tablet two-finger gesture pans and zooms together.

## Track timeline and aircraft model v3 plan

Goal: make the Track layer controls physically close to the 2D/3D views and separate path time, marker time, and flight-mode filtering.

Changes for this pass:

- Move Track time controls between the 2D track and 3D track canvases.
- Add a Track-specific flight-mode filter that applies to the displayed path and the aircraft marker slider range without changing the global shared timeline.
- Add a marker time scope selector so the aircraft time slider can operate over the current global window or the whole loaded flight.
- Replace the simple 3D attitude triad with a small stylized aircraft model while keeping colored nose/right/up cues for debugging attitude direction.

## Track playback and aircraft marker v4 plan

Goal: make aircraft position review faster without making the 3D marker visually dominate the path.

Changes for this pass:

- Reduce the 3D aircraft model scale and remove the translucent green wing/body fill.
- Add Track playback controls that advance only the independent Plane time marker, not the global shared chart timeline.
- Add playback speed choices so replay can run slower or faster while respecting the current marker slider bounds.
- Stop playback automatically at the end of the selected marker range.

## Track playback polish v5 plan

Goal: fix the playback-control regressions without changing the larger Track design.

Changes for this pass:

- Use theme-aware panel colors for Track controls so dark mode does not show a white control block.
- Keep Plane time useful for inspection: dragging the marker slider and playback both update the global inspector time so status cards follow the aircraft marker.
- Avoid changing the global shared chart time range while doing this; only the inspect marker and Track aircraft marker move.

## Track HUD v6 plan

Goal: make the selected aircraft marker time readable as flight instruments beside the Track view.

Changes for this pass:

- Reduce the 3D aircraft model size by another 50 percent.
- Add a Track-side HUD panel that follows Plane time and shows attitude, altitude, GPS ground speed, ARSP airspeed, heading, flight mode, and current marker time.
- Source HUD values from nearest logged `ATT`, `POS`, and `GPS` records; show missing values explicitly instead of estimating unavailable fields.
- Keep HUD on the Track right-side information panel so it does not compete with the 2D/3D canvases.

## Graphical Track HUD v7 plan

Goal: make the Track HUD look like a flight attitude indicator instead of only numeric cards.

Changes for this pass:

- Add a show/hide toggle for the Track HUD in the right-side Track panel.
- Render a small canvas attitude indicator with sky/ground, horizon line, pitch ladder, roll pointer, and heading cue based on nearest `ATT` sample at Plane time.
- Keep compact numeric readouts beside/below the graphical HUD for altitude, GPS ground speed, ARSP airspeed, heading, mode, and sample ages.
- If attitude is missing, show a clear missing-state canvas rather than drawing a misleading horizon.

## Track HUD placement v8 plan

Goal: align the Track HUD visually with the 3D track area instead of the top of the right-side Track panel.

Changes for this pass:

- Move the HUD block below Track bounds and the 3D view note, before the waypoint table.
- Keep the existing show/hide behavior and HUD data refresh unchanged.

## Track PFD-style HUD v9 plan

Goal: make the graphical HUD follow the common PFD/HUD scan layout more closely.

Changes for this pass:

- Move the HUD block after the waypoint table.
- Draw speed on the left side of the HUD graphic, altitude on the right, and heading along the bottom.
- Keep the attitude horizon in the center but remove separate numeric roll/pitch readouts.
- Keep both GPS ground speed and ARSP airspeed visible, with airspeed primary when available and GPS speed as a secondary speed cue.

## HUD demanded-value overlay v10 plan

Goal: show autopilot/controller demanded values in magenta on the Track HUD, following aviation display convention.

Changes for this pass:

- Use only logged direct demand/control fields, not waypoint-file targets.
- Speed target source: `TECS.spdem` when available.
- Altitude target source: `TECS.hdem` when available.
- Attitude target source: `ATT.DesRoll`, `ATT.DesPitch`, and `ATT.DesYaw` when available.
- Draw these target cues in magenta on the speed tape, altitude tape, heading tape, and central attitude display.

## Next direction

The next useful step is source-linked parameter effect inspection: connect selected-time values, logged demands/outputs, and relevant parameters into compact formula/effect cards. This should stay mode-aware and layer-aware so AUTO mission/L1/TECS, stabilization, output, and motion evidence remain separated instead of being mixed into one explanation.
