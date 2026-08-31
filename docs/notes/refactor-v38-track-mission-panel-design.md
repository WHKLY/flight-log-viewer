# Refactor V38 - Track / Mission Panel Detailed Design

Date: 2026-08-31

## Goal

Design the `Track / Mission` panel before implementation.

This panel is first-priority flight understanding UI. It answers:

- What route source is currently shown?
- What current-task source is currently trusted?
- Which AUTO task/waypoint was active at a selected time?
- Where was the aircraft?
- What attitude, altitude, speed and heading did it have?
- How does the selected time relate to flight modes, tasks and path history?

## Design Position

`Track / Mission` belongs to the `Log Viewer` page.

It should be a first-class panel beside later panels:

- External Sources
- Track / Mission
- L1
- TECS
- Inner / Outer Loops
- Custom Plots

It must not own L1/TECS/control-loop formula analysis. It only shows mission/task/track context and provides time selection for other panels.

## Priority

The panel must prioritize:

- mission task understanding
- route/current-task source switching
- time and replay control
- 2D/3D track readability
- HUD readability

Raw source diagnostics should remain visible but secondary.

## Layout

The expanded panel should use a four-zone layout:

- Header Summary
- Source And Task Strip
- Track Viewer
- Timeline And Playback

### Header Summary

Always visible when the panel is expanded.

Content:

- selected route source
- selected current-task source
- selected display time
- current flight mode at selected time
- current mission task at selected time
- data quality tags

Useful tags:

- `AUTO`
- `MANUAL TASK SOURCE`
- `TLOG PARTIAL`
- `ONBOARD CMD`
- `WP FILE`
- `NO CURRENT TASK`
- `NO POSITION`

Interactions:

- click source tag opens source selector area
- click current task jumps/highlights related waypoint/task
- click selected time focuses timeline marker

### Source And Task Strip

This is a compact control strip, not a large diagnostic table.

Controls:

- Route source dropdown
- Current task source dropdown
- Route display mode segmented button
- Current task lock button
- Task list collapse button

Route display mode:

- `Selected source`
- `Compare sources`
- `External only`
- `Onboard only`

Current task source behavior:

- user selection is authoritative
- no automatic switching after user selection
- if selected source is incomplete, show warning but still use it
- if selected source has no event at the selected time, show `No event at time`

Task list:

- grouped by mission source
- each item shows sequence/id, command/type, lat/lon/alt if available, source, event count if available
- clicking a task highlights it in 2D/3D
- double click task sets selected time to nearest event if available
- long press on tablet opens a compact detail drawer

### Track Viewer

Track viewer should contain tabs or split modes:

- `2D`
- `3D`
- `HUD`
- `Split`

Default:

- tablet landscape: Split
- tablet portrait or phone: 2D
- desktop wide: Split

Split layout:

- left: 2D or 3D track
- right: HUD and task card

The HUD should be integrated inside Track / Mission, not a separate workspace panel.

### 2D Track

Purpose:

- precise ground-track and waypoint inspection

Display:

- actual flown path
- selected time aircraft marker
- selected time heading arrow
- route waypoints
- selected/current task highlighted
- optional full track vs selected-window track
- north/east direction indicator
- metric scale bar

Controls:

- wheel or pinch zoom
- drag pan
- double tap/click reset view
- button: `Fit Track`
- button: `Fit Window`
- button: `Fit Route`
- button: `Hide Track`
- button: `Hide Waypoints`
- button: `Equal Scale`

Important behavior:

- latitude and longitude must use equal metric scale
- time-window drag should not force geometry refit
- reset should fit useful data, not zoom to an extreme global extent
- missing waypoint file must not block actual track display
- missing GPS track must not block waypoint-only display

### 3D Track

Purpose:

- spatial understanding of altitude, attitude and mission geometry

Display:

- flown 3D path
- translucent vertical lines from flown path to ground
- selected aircraft model
- selected/current task marker
- route line if available
- ground grid
- north/east/up axes
- altitude scale

Controls:

- mouse left drag or one-finger drag: rotate/pan depending active tool
- mouse wheel or pinch: zoom
- two-finger drag: pan on tablet
- button: `Free Camera`
- button: `Overhead Lock`
- button: `Follow View Vector`
- button: `Follow Aircraft Relative`
- button: `Follow Track Vector`
- button: `Fit 3D`

Camera modes:

- Free Camera: user controls camera completely
- Overhead Lock: camera cannot go below horizon; no underside/ground-up view
- Follow View Vector: camera position follows aircraft, view direction fixed in world frame
- Follow Aircraft Relative: camera remains fixed relative to aircraft body axes
- Follow Track Vector: camera follows the path tangent/ground-track direction

Overhead lock behavior:

- camera constraint should be enforced after every camera update
- compare camera elevation/pitch continuously
- if camera crosses below allowed elevation, clamp camera position/orbit target immediately
- this must work during mouse drag, touch drag, wheel zoom, playback and programmatic follow updates

### HUD

Purpose:

- quick attitude and navigation state inspection at selected time

Placement:

- inside Track / Mission panel
- in Split mode on the right side of 2D/3D track
- hidden by default on narrow screens unless user opens it

Display:

- artificial horizon
- center G1000-like aircraft reference triangle
- roll scale
- pitch ladder
- left speed tape
- right altitude tape
- bottom heading tape
- GPS speed
- airspeed if available
- current altitude
- current heading
- target values in magenta
- final/outer navigation demands in blue

Target value rule:

- magenta means direct control target or immediately consumed demand
- blue means final/outer navigation demand
- waypoint-only desired values must not be shown as magenta unless they are also active controller inputs

Controls:

- button: `HUD`
- button: `Targets`
- button: `Compact`
- button: `Reset HUD`

### Timeline And Playback

The track panel needs its own timeline, separated from global chart timeline.

Timeline rows:

- full flight time
- selected track window
- flight mode segments
- mission task events

Controls:

- range handles for track display window
- marker handle for aircraft/HUD selected time
- mode filter selector
- playback play/pause
- playback speed
- step backward
- step forward
- jump to previous task
- jump to next task
- jump to previous mode
- jump to next mode

Playback behavior:

- playback moves only selected time marker by default
- playback must not automatically refit 2D or 3D view
- optional setting may keep marker inside visible window by panning, not by zooming
- user dragging marker should stop playback or pause temporarily
- selected time may move into empty regions if user drags beyond available data range, but UI should show missing values

Window behavior:

- selected track window controls path segment visibility
- selected time controls aircraft/HUD state
- selected time and selected window are independent
- user can choose `Window` or `Full` path display
- user can choose whether timeline operations are local to Track / Mission or synced to global app time later

## Touch Interaction

Minimum touch target:

- 44 px

Gestures:

- one-finger drag on timeline marker: move selected time
- one-finger drag on range handle: adjust window
- one-finger drag inside 2D track: pan
- pinch inside 2D track: zoom
- two-finger drag inside 3D: pan
- pinch inside 3D: zoom
- one-finger drag inside 3D: rotate in Free Camera mode
- long press waypoint/task: show detail drawer

Avoid:

- tiny hover-only controls
- controls that require keyboard precision
- automatic zoom while panning time
- hiding essential values behind tooltip-only UI

## Mouse And Keyboard Interaction

Mouse:

- hover path point shows time, lat/lon, altitude, mode and task
- click path point sets selected time
- wheel zooms focused viewport
- drag pans 2D
- drag rotates 3D in Free Camera

Keyboard:

- space: play/pause
- left/right: step selected time
- shift + left/right: jump task
- alt + left/right: jump mode
- 0: fit current view

Keyboard support can be added after touch/mouse baseline works.

## Data Requirements

Required optional inputs:

- position series
- attitude series
- GPS speed
- airspeed
- altitude
- heading/yaw
- mode segments
- route source list
- current task source list
- current task events

Compatibility:

- no `.waypoints`: show track only
- no `.tlog`: show DataFlash/onboard mission only if available
- no onboard mission: show tlog/wp mission if available
- no current task events: show route only and `No current task source`
- no attitude: show path and disabled HUD attitude area
- no airspeed: show GPS speed only
- no GPS position: show waypoint/task list only

## State Model

Track-specific state should be explicit:

- `track.routeSource`
- `track.currentTaskSource`
- `track.displayMode`
- `track.pathScope`
- `track.selectedTime`
- `track.window`
- `track.playing`
- `track.playbackSpeed`
- `track.cameraMode`
- `track.overheadLock`
- `track.showTrack`
- `track.showWaypoints`
- `track.showHud`
- `track.showTargets`
- `track.highlightedTask`

Do not reuse ambiguous global fields for track-specific state.

Global time sync can be added later with:

- `track.syncFromGlobal`
- `track.syncToGlobal`

## Implementation Phases

Phase 1:

- restructure Track / Mission panel layout
- source selectors
- summary strip
- task list
- mode list
- placeholder viewer areas

Phase 2:

- 2D track canvas/SVG renderer
- equal metric scale
- pan/zoom/fit
- waypoint highlight
- selected time marker

Phase 3:

- local track timeline
- window handles
- selected time handle
- mode/task rows
- playback baseline

Phase 4:

- 3D renderer
- aircraft model
- camera modes
- overhead lock
- vertical ground projection lines

Phase 5:

- integrated HUD
- speed/altitude/heading tapes
- attitude horizon
- target overlays

## Usability Rules

- The first visible answer should be current task and current mode.
- Source choice must be manual and obvious.
- Track display and aircraft marker time must be independent.
- View transforms must not change unless the user explicitly zooms/fits/pans.
- All important text must scroll instead of ellipsizing.
- Empty/missing data is a valid state, not a fatal page error.
- Every automatic behavior needs a visible toggle.

## Non-Goals For Immediate Next Step

- no L1/TECS formula display
- no control-loop parameter influence display
- no multi-page navigation
- no final visual polish
- no source-code formula inspector

## Rollback

This is a design note only. No runtime rollback is needed.
