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
- Track HUD now uses a yellow triangular PFD/G1000-like fixed aircraft reference and overlays final navigation demands in blue from `CTUN.NavRoll/NavPitch` and `NTUN.NavBrg/TBrg`, while keeping direct controller demands magenta.
- Track HUD fixed aircraft triangle now places its upper vertex exactly at the HUD center reference point, so the center marker corresponds to the aircraft nose/aim point.
- Track HUD attitude demand cues use aircraft/command direction: actual horizon remains `-Roll`, while magenta direct and blue navigation attitude cues use `+Roll` and positive pitch upward.
- Track 3D view now draws semi-transparent blue drop lines from the flown path up to the current Plane time down to the ground plane, and 3D pitch drag no longer clamps the viewing angle.
- Release documentation pass: README is now the main Termux operation guide, `docs/project-architecture.md` documents source/generated/viewer boundaries, release/tag/push workflow is documented, and the project was regenerated from a clean generated-data state.
- Large log viewer fix: browser-side range, stats, 2D track bounds, 3D bounds, and 3D ground-plane calculations no longer use spread-argument `Math.min/Math.max` on log-sized arrays, preventing `Maximum call stack size exceeded` on large files.
- Track reference overlay update: keep the previously correct 3D aircraft roll/view convention, while adding 2D/3D path time-direction arrows, 2D N/E and north-meter labels, 3D E/N/U plus altitude axes, and Overhead lock to prevent rotating into underside view.
- Track controls were rebuilt into path display, plane marker, playback, and 3D view groups; Overhead lock now uses explicit Lock/Free buttons and clamps pitch below the edge-on point; scrollable value fields no longer use ellipsis truncation.

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

## HUD navigation-demand overlay v11 plan

Goal: distinguish direct controller demands from final navigation demand cues in the Track HUD.

Changes for this pass:

- Change the fixed aircraft reference in the central HUD attitude display to a G1000/PFD-like yellow triangular symbol.
- Add blue final-navigation demand cues from logged navigation outputs, not waypoint-file targets.
- Blue attitude cue sources: `CTUN.NavRoll` and `CTUN.NavPitch`.
- Blue heading cue source: `NTUN.NavBrg`, falling back to `NTUN.TBrg`.
- Keep magenta for direct controller demands: `TECS.spdem/hdem` and `ATT.DesRoll/DesPitch/DesYaw`.

## Track 3D altitude-reference v12 plan

Goal: make altitude changes easier to judge in the 3D Track view.

Changes for this pass:

- Draw semi-transparent blue vertical drop lines from flown 3D path points to the ground plane.
- Treat "flown path" as visible POS samples up to the current Plane time, still respecting full/window and Track flight-mode filters.
- Keep the drop lines visually behind the green path and aircraft marker.
- Remove the 3D rotation pitch clamp so the user can choose steeper overhead or low viewing angles directly.

## Release documentation and clean verification v13 plan

Goal: prepare the first release candidate from a clean generated-data state.

Changes for this pass:

- Review user-facing documentation and update only documents whose instructions or current-state descriptions are stale.
- Add a project architecture document that separates raw data, generated viewer data, scripts, static viewer code, and source-review notes.
- Convert `README.md` into the main operation guide for Termux: install, generate data, serve the viewer, validate, release, and push.
- Delete ignored generated outputs (`public-data` JSON and Python bytecode), then regenerate and validate from raw files.
- Prepare the first release tag after git status is clean.

## Large log browser stack fix v14 plan

Goal: make the viewer tolerate larger generated JSON files without browser `Maximum call stack size exceeded` errors.

Changes for this pass:

- Replace `Math.min(...largeArray)` and `Math.max(...largeArray)` patterns with iterative extent helpers.
- Apply this to full time range, stats summaries, 2D track bounds/default view, 3D bounds, and 3D ground plane height.
- Keep generated data format unchanged so existing scripts and release workflow continue to work.

## Track 2D/3D direction and overhead-lock v15 plan

Goal: remove ambiguity in Track orientation while preserving the existing correct 3D attitude/view convention.

Changes for this pass:

- Preserve the existing 3D aircraft roll display convention after visual re-check; do not change the 3D roll sign.
- Add time-direction arrowheads to the 2D and 3D flown path lines.
- Add 2D map orientation and vertical/north coordinate labels.
- Add 3D E/N/U orientation axes and a vertical altitude axis in the 3D scene.
- Add an `Overhead lock` control: when enabled, 3D pitch is clamped to the overhead side so the view cannot rotate into underside/up-looking perspective.
- Keep 3D Reset on the previous default oblique view; direction labels and arrows carry the orientation context.

## Track control panel and text overflow v16 plan

Goal: make Track controls understandable and make the 3D overhead lock behave visibly.

Changes for this pass:

- Replace the ambiguous single Overhead lock toggle with explicit `Lock overhead` and `Free view` buttons.
- Clamp locked 3D pitch to a small negative margin, not exactly zero, so the view cannot reach edge-on/underside perspective.
- Rebuild Track controls into four groups: path display, plane marker time, playback, and 3D view.
- Remove ellipsis behavior from value fields that already have scrollable overflow; long values should remain readable through horizontal scrolling.
- Preserve the previously correct 3D roll/view convention.

## Track overlay visibility and aircraft camera v17 plan

Goal: make Track review faster when the path/waypoints clutter the scene and add aircraft-centered 3D camera modes.

Changes for this pass:

- Add one-click path/waypoint visibility controls: path, waypoints, and hide/show both.
- Apply visibility consistently to 2D and 3D path/waypoint drawing while keeping the aircraft marker visible.
- Add 3D camera modes: free view, fixed line-of-sight follow, aircraft-relative follow, and track-vector follow.
- In follow modes, center the 3D scene on the current Plane marker; manual 3D drag returns to free view.
- Keep Overhead lock active across camera modes by constraining camera pitch through the same clamp function.

- Track overlay visibility and 3D camera modes: path/waypoint display can be toggled individually or together; 3D camera can switch between free, fixed line-of-sight follow, aircraft-relative follow, and track-vector follow while keeping Overhead lock constraints.

## Track camera controls repair v18 plan

Feedback: Lock overhead is not acting like a toggle, 3D camera mode buttons appear to do nothing, and path/waypoint visibility controls are not obvious in the Track UI.

Changes for this pass:

- Replace the two-button overhead lock control with one toggle button so clicking it can both enable and disable the lock.
- Make 3D camera modes produce obvious camera changes by setting deterministic yaw/pitch presets and then following the plane center where appropriate.
- Keep manual 3D drag/pinch as the escape hatch back to Free view.
- Move path/waypoint visibility buttons into a clearer Track overlays row so they are easier to find.
- Verify with node syntax checking now that nodejs is installed.

- Track camera controls repair: Track controls now render above both track charts, overlay buttons use explicit Chinese labels, overhead limiting is a single toggle that snaps back to the overhead side when enabled, and 3D camera modes switch to deterministic follow views instead of preserving the current view.

## Track camera dataset and decoupling v19 plan

Feedback: camera mode buttons are visible but unusable because `data-track-3d-view-mode` does not map to `dataset.track3dViewMode`; overhead lock can be toggled visually but still does not reliably constrain the actual 3D view. The single `index.html` file is also too coupled.

Changes for this pass:

- Rename the camera mode attribute to `data-track-camera-mode` and read it through `dataset.trackCameraMode`.
- Make overhead lock a projection-level constraint so locked pitch is enforced wherever 3D projection or camera state is applied.
- Extract pure 3D camera helpers into `viewer/js/track-camera.js` and keep the page script responsible for state wiring and drawing only.
- Keep the refactor bounded: do not split renderers yet, but create a stable seam for later Track module extraction.
- Verify with node syntax check plus jsdom click simulation before committing.

- Track camera dataset and decoupling: camera mode buttons now use `data-track-camera-mode`, pure camera math moved to `viewer/js/track-camera.js`, Track controls use delegated click handling, and 3D projection applies the overhead pitch constraint at draw time.

## Track overhead lock pitch clamp v20 plan

Feedback: overhead lock can be toggled but still allows the 3D view to flip past the overhead side because pitch is only clamped on one side.

Changes for this pass:

- Replace one-sided overhead pitch limiting with a bounded pitch interval.
- Keep the current default view direction but prevent dragging beyond the vertical flip region.
- Verify camera math directly with node and re-run jsdom click regression.
- Do not commit until browser behavior is confirmed.

## Mission task source override v21 plan

Goal: show which AUTO mission task the aircraft is executing while allowing manual source/time overrides because tlog coverage can be incomplete during GCS link loss.

Design rules:

- Keep flight mode and mission task separate: AUTO gives control authority; mission source/current item gives the active task target.
- Build multiple route/task sources instead of trusting a single automatic source: external waypoint file, DataFlash CMD/onboard accepted mission, and later tlog MAVLink mission items/current sequence.
- Add a persistent manual override file outside generated data so user decisions survive public-data regeneration.
- Resolve Current Mission Task by time using `manual_override > user_selected_source > auto_suggested_source > missing`.
- Start with data model and extraction seams before large UI changes.

Implementation for this pass:

- Generate `public-data/series/mission-sources.json` with external waypoint and DataFlash CMD mission sources.
- Add `project-data/mission-overrides.json` as editable persistent override config.
- Add docs/schema notes so future tlog mission extraction can plug into the same model.
- Avoid committing generated public-data unless intentionally preparing sample data.

- Mission task source model: added `scripts/build_mission_sources.py`, generated external waypoint/onboard CMD/tlog placeholder mission source candidates, added ignored local `project-data/mission-overrides.json`, and documented manual override priority.

## Mission task UI and override workflow v22 plan

Goal: expose current AUTO mission task in the viewer and allow manual time-point/time-range source selection when automatic source choice is unreliable.

Implementation for this pass:

- Load `public-data/series/mission-sources.json` and optional `project-data/mission-overrides.json` in the viewer.
- Add viewer state for global mission source selection and browser-local manual override rules.
- Show current mission task/source/seq in the Track controls and Inspector.
- Add controls to create an override starting at the current plane marker time or selected inspect time.
- Persist UI-created overrides in localStorage because the current static `python3 -m http.server` viewer cannot write back to Termux files.
- Keep `project-data/mission-overrides.json` as file-based seed/config for later import/export or backend support.

- Mission task UI and override workflow: viewer now loads mission source candidates and optional file overrides, shows Current Mission Task in Track controls and Inspector, supports global source selection, explicit Start/End/Seq local overrides, and uses selected mission source rows for 2D/3D waypoint display.

## Track Geometry main-view refactor v23 plan

Goal: make Track / Geometry prioritize flight state, current mission task, and spatial replay instead of presenting a long control stack. HUD should become a hideable overlay fused into the 3D scene.

Design rules:

- Treat Current Mission Task and HUD as first-priority flight-state information, not secondary side-panel notes.
- Keep the main Track view compact: mission status strip, 2D track, time marker controls, and 3D scene with HUD overlay.
- Move low-frequency controls into collapsible advanced groups: mission override editing, display filters, playback details, 3D camera, and metadata/help.
- Replace the table-like HUD with a cockpit-style canvas overlay: attitude horizon center, GPS/air speed tape left, altitude tape right, heading scale bottom, and mission/source status top.
- Continue bounded refactoring: extract HUD drawing to `viewer/js/track-hud.js` first; leave large chart renderers in `index.html` until this UI layer is stable.

Implementation for this pass:

- Add `viewer/js/track-hud.js` with a `TrackHud.draw(...)` API.
- Render HUD as an overlay canvas inside the 3D chart shell with show/hide control.
- Add a compact mission status strip above Track charts.
- Rebuild Track controls into compact toolbar plus `<details>` advanced groups.
- Keep existing mission source override behavior and 3D camera controls available, but no longer let them dominate the panel height.


Result for this pass:

- Implemented `viewer/js/track-hud.js` as the first extracted Track UI module; `index.html` now samples HUD values and delegates drawing to `TrackHud.draw(...)`.
- Moved HUD from the right-side Track panel into the 3D chart shell as a transparent, hideable canvas overlay.
- Added a compact mission status strip above Track charts for mode, current mission task, source, and override state.
- Rebuilt Track controls as a quick action bar plus collapsible groups for marker/playback, path filters, mission source overrides, and 3D camera.
- Removed the old table-style HUD DOM card and old inline HUD drawing helpers from `index.html`.

## Next direction

The next useful step is source-linked parameter effect inspection: connect selected-time values, logged demands/outputs, and relevant parameters into compact formula/effect cards. This should stay mode-aware and layer-aware so AUTO mission/L1/TECS, stabilization, output, and motion evidence remain separated instead of being mixed into one explanation.
