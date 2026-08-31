# Refactor V30 - UI Design Specification

Date: 2026-08-31

## Goal

Define the next frontend UI direction before implementation.

This document is a design specification, not an implementation note. It should be reviewed before coding the next UI stage.

## Visual Direction

The UI should feel like an engineering analysis workstation, not a generic dashboard.

Core style:

- Support both `light` and `dark` themes.
- Use a cold color system as the main visual language.
- Use warm colors only for dynamic, live, warning or time-critical values.
- Prefer calm blue, cyan, steel, slate and desaturated teal for static surfaces.
- Reserve amber, orange and red for playback marker, current task, warnings, saturation and active changes.
- Avoid purple as a primary theme color. Purple may be used only for ArduPilot-style navigation demand indicators if needed.
- Use high contrast for graph lines, axis text and active selections.
- Avoid oversized decorative panels; the page is primarily for data inspection.

Suggested theme tokens:

- Background: deep navy/slate in dark mode, ice gray/blue-white in light mode.
- Panel surface: slightly lifted cold-gray cards.
- Primary action: cyan/blue.
- Secondary action: slate/steel.
- Dynamic marker: amber.
- Warning: orange.
- Error: red.
- Navigation demand: aviation magenta or blue, only when semantically needed.

## Overall Layout

The page should use a workstation layout:

- Left sidebar: global controls and dataset/source controls.
- Right workspace: analysis panels.
- Top compact status strip: dataset, firmware, profile, time range, active mode.
- Main workspace: stacked collapsible panels.
- Each panel should have its own header, visibility toggle and local controls.

Default state:

- Left sidebar visible but width-limited.
- All heavy analysis panels collapsed by default except a compact overview/status panel.
- Track panel can be promoted as the first primary workspace panel.
- Inspector hidden by default.
- HUD hidden by default but easy to show inside the Track/3D area.

Responsive rules:

- Tablet landscape is the primary target.
- Desktop should use the same layout with more horizontal space.
- Tablet portrait should stack sidebar above workspace or use an overlay sidebar.
- Touch targets should be large enough for fingers.
- Horizontal scrolling must be available for dense text or tables.
- Vertical scrolling must be available inside long lists.

## Global Controls

Location:

- Left sidebar, first group.

Controls:

- `Reload data`: reload generated JSON without restarting server.
- `Theme`: segmented button with `Light`, `Dark`, and later optional `System`.
- `Font size`: small/normal/large buttons or compact slider.
- `Collapse all`: collapse all right-side panels.
- `Expand important`: open Track, Current Task, and Inspector summary.
- `Reset layout`: restore default panel visibility and local view windows.

Interaction logic:

- Theme changes should apply immediately.
- Font size changes should affect charts, tables, HUD labels and inspector text.
- Collapse state should be kept in frontend state.
- Reset layout should not reload data.

## Dataset And Source Panel

Location:

- Left sidebar.

Purpose:

- Show what files are loaded and what data sources are available.

Content:

- Dataset label.
- Detected firmware.
- Selected compatibility profile.
- Build profile selection mode, for example `auto_version_match` or `manual_override`.
- Selected `.BIN`, `.tlog`, `.param`, `.waypoints`.
- Counts: signals, semantic roles, mission sources, current task events, parameters.

Controls:

- `Route source` dropdown.
- `Current task source` dropdown.
- `Parameter source` dropdown.
- `Show missing sources` toggle.

Interaction logic:

- Route source and current task source must remain independently selectable.
- Do not auto switch current task source when route source changes.
- If a source is missing, show it as disabled only when it is useful for explanation.
- If tlog is incomplete, UI must not prefer it silently.

## Profile Status Panel

Location:

- Left sidebar or top status strip.

Purpose:

- Explain compatibility confidence without adding a frontend profile switch in this stage.

Content:

- Detected firmware family, vehicle, version, git hash.
- Active profile id.
- Profile selection mode.
- Capability badges.
- Compatibility warnings.

Controls:

- `Show profile details`.
- `Copy build command`.

Interaction logic:

- No frontend profile switching for now.
- Manual profile switching remains build-time with `--profile`.
- The UI should clearly distinguish detected firmware from selected interpretation profile.

## Workspace Panel System

Each right-side panel should use a consistent shell:

- Header title.
- Short status tags.
- Collapse/expand button.
- Fullscreen or focus button.
- Local reset button.
- Local settings button if needed.

Panel body rules:

- Charts must support wheel/pinch zoom.
- Charts must support drag pan.
- Y-axis pan should work by dragging the y-axis area.
- Time pan should work by dragging the x-axis or timeline area.
- Reset should restore local chart scale only.
- Global time window changes should not automatically rescale Y.

## Track Panel

Priority:

- First priority panel.

Subregions:

- 2D track view.
- Track-specific timeline between 2D and 3D.
- 3D track view.
- HUD overlay/panel inside or beside 3D view.
- Current task mini-card.

Controls:

- `Show track`: toggle route/flight path visibility.
- `Show waypoints`: toggle waypoint markers and labels.
- `Show current task`: toggle highlighted current mission item.
- `Show full track`: display whole flight path.
- `Show selected window`: display only current track time window.
- `Aircraft marker time`: slider or draggable marker.
- `Playback`: play/pause button.
- `Speed`: playback speed selector, for example `0.25x`, `0.5x`, `1x`, `2x`, `5x`, `10x`.
- `Loop`: toggle loop playback.
- `Camera mode`: dropdown or segmented button.
- `Overhead lock`: toggle that prevents below-horizon viewing.
- `Reset camera`: restore default 3D view.

Camera modes:

- `Free`: user controls camera freely.
- `Fixed line-of-sight follow`: camera keeps a fixed world look vector while following aircraft position.
- `Aircraft-relative follow`: camera vector is fixed relative to aircraft attitude or heading.
- `Track-vector follow`: camera follows the local track direction.
- `Top-down`: overhead map-like view.

Interaction logic:

- Aircraft marker time is independent from displayed track time window.
- Playback moves aircraft marker time.
- Dragging marker time must work while playback is paused.
- Changing selected window must not force aircraft marker time unless marker is outside configured behavior.
- 2D and 3D track views share selected route source and current task source.
- Waypoint list click should highlight that waypoint in 2D/3D.
- Current task should be highlighted with a warm or magenta/blue demand marker depending on semantic meaning.
- Altitude reference lines should be visible in 3D when helpful.
- 3D view should include vertical ground projection lines for flown path.

## HUD Panel

Location:

- Integrated into the Track panel.
- Default hidden.
- When visible, place it near the 3D track view, not as a separate low-priority panel.

Style:

- Aviation-inspired HUD/primary flight display.
- Cold transparent frame.
- Warm dynamic aircraft marker.
- Navigation demand values may use aviation magenta or blue.
- Avoid dense numeric text in the center.

Displayed values:

- Attitude horizon.
- Roll reference.
- Pitch ladder or simplified pitch reference.
- Ground speed.
- Airspeed.
- Altitude.
- Heading.
- Optional target/demand values from semantic signals when available.

Controls:

- `Show HUD`.
- `Compact HUD`.
- `Show demand values`.
- `Reset HUD`.

Interaction logic:

- HUD should follow aircraft marker time.
- HUD should not control time directly.
- Missing semantic fields should hide only the missing sub-element, not the full HUD.
- Values must indicate whether they are measured, demanded, inferred or missing.

## Current Mission Task Panel

Priority:

- Same priority as Track/HUD.

Location:

- Track panel mini-card plus optional detailed panel.

Content:

- Current source.
- Current sequence number.
- Command id and command name.
- Target lat/lon/alt if available.
- Time of event.
- Time since current task became active.
- Route source versus current-task source mismatch warning.

Controls:

- `Current task source` dropdown.
- `Follow current task`: highlight current task in track views.
- `Show task timeline`: expand detailed event list.

Interaction logic:

- Source selection must be manual-first.
- UI should not auto merge DataFlash current task and tlog current task.
- If no event exists before current time, show `not started` or `missing`.
- If current task source has no events, keep track visible but hide current task marker.

## Time Control Panel

Location:

- Global time controls near top of workspace or inside left sidebar.
- Track-specific time controls remain inside Track panel.

Controls:

- Global time window range.
- Current inspect time.
- Reset time window.
- Jump to start/end.
- Jump to next/previous mode change.
- Jump to next/previous current mission task.
- Playback controls can exist globally later, but Track panel owns aircraft playback initially.

Interaction logic:

- Global time window filters charts.
- Global time movement should allow empty ranges beyond data without auto snapping back.
- Y-axis zoom and pan must not be reset by global time dragging.
- Inspect time should drive inspector readout across panels.

## Flight Mode Panel

Content:

- Mode timeline.
- Mode segments.
- Focus ranges for each mode.
- AUTO should be easy to isolate.

Controls:

- `Show mode bands`.
- `Filter mode`: dropdown or chips.
- `Focus AUTO`.
- `Clear mode focus`.

Interaction logic:

- Mode bands should appear as vertical background ranges on charts.
- Mode switch vertical lines should be visible.
- Dark theme colors must remain readable.
- Clicking a mode segment should set the global time window to that segment.

## Plot Panels

Panel groups:

- Attitude.
- Navigation.
- TECS / energy.
- PID / control rate.
- RC input and servo output.
- Motion / acceleration / vibration.
- Custom user plot.

Controls per plot:

- Collapse/expand.
- Reset X.
- Reset Y.
- Reset both.
- Lock Y auto-scale toggle.
- Show zero axis toggle, default on.
- Show mode bands toggle.
- Show mode transition lines toggle.
- Add horizontal reference line by clicking/dragging the y-axis area.
- Add global vertical time line by clicking/dragging the x-axis area or timeline area.
- Remove selected reference line.
- Hide/show individual series.

Interaction logic:

- X-axis can be global time, local time, or mode-aware time display.
- Tooltip should show precise value at mouse/touch point.
- Touch interaction must support pan, pinch zoom and tap inspect.
- Horizontal reference lines are local to the plot.
- Vertical reference lines are global across plots.
- Plot height should be large enough for tablet inspection.
- Dense legends should scroll horizontally instead of truncating labels.

## Custom Plot Panel

Purpose:

- Let the user plot arbitrary decoded signals without code changes.

Controls:

- Signal search.
- Add signal.
- Remove signal.
- Clear all.
- Save local preset.
- Y-axis mode: shared, per-series, normalized.
- Time source: global time window or full data.

Interaction logic:

- Signal search should prefer semantic roles but allow raw message fields.
- Missing/non-numeric fields should be disabled or clearly marked.
- Series colors should remain readable in light and dark themes.

## Parameter Panel

Content:

- Parameter source status.
- Merged, `.param`, DataFlash latest, DataFlash timeline.
- Control-related parameter groups.

Controls:

- Parameter source dropdown.
- Search parameter.
- Show only control parameters.
- Show changed-over-time parameters.
- Compare sources.

Interaction logic:

- Parameter source selection is independent from missing-file detection.
- DataFlash timeline should be used when inspecting a specific time.
- If a parameter changed during flight, the UI should show the time-specific value and latest value separately.

## Inspector Panel

Default:

- Hidden.

Content:

- Inspect time.
- Flight mode at inspect time.
- Current task at inspect time.
- Aircraft state at inspect time.
- Selected signal values.
- Relevant parameters at inspect time.
- Control formula explanation when available.

Controls:

- Show/hide inspector.
- Clear inspect.
- Pin inspect time.
- Collapse each inspector section.
- Copy values.

Interaction logic:

- Inspector should follow clicked chart point when not pinned.
- Clear inspect should remove selected point and hide point-specific highlights.
- Each section must have its own collapse/hide control.
- Long text and tables must support horizontal and vertical scrolling.

## Missing Data Behavior

The UI must remain usable with partial files:

- only `.BIN`
- only `.tlog`
- only `.waypoints`
- only `.param`
- combinations of the above

Rules:

- Do not fail the whole page because one domain is empty.
- Show empty panels as unavailable, not broken.
- Keep source selectors visible when a missing source explains why a panel is empty.
- Prefer explicit `missing` status over silent blank space.

## Implementation Order

Recommended frontend order:

1. Theme tokens and layout shell.
2. Panel shell with collapse/focus/reset controls.
3. Dataset/source/profile sidebar.
4. Track panel placeholder using current backend domains.
5. Current mission task mini-card and timeline.
6. Semantic signal driven chart registry.
7. First real plot group.
8. Inspector shell.
9. HUD redesign.
10. Custom plot panel.

Before implementing this UI stage, confirm:

- exact default open/collapsed panels
- whether Track should be full-width by default
- preferred chart library or canvas strategy
- tablet portrait behavior
- HUD visual detail level
- plot group priority order
