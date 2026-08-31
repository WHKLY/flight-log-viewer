# Refactor V31 - UI Config And Left Sidebar Plan

Date: 2026-08-31

## Goal

Plan a configurable UI system and the first concrete frontend area: the left control sidebar.

This is a planning note only. Do not implement the UI in this step.

## Design Principle

Visual style, page dimensions, panel order and common interaction defaults should be editable from configuration files.

The user should be able to adjust the visual result by editing readable config files instead of editing rendering code.

## Proposed UI Folder

Create a top-level folder:

```text
ui/
```

Purpose:

- store human-editable UI configuration
- separate design configuration from runtime viewer code
- keep later frontend code smaller and more data-driven

Proposed structure:

```text
ui/
  README.md
  config/
    app.json
    layout.json
    left-sidebar.json
    panels.json
    typography.json
    interaction.json
  themes/
    light.json
    dark.json
  schema/
    app.schema.json
    layout.schema.json
    left-sidebar.schema.json
    theme.schema.json
```

Runtime code should live under:

```text
viewer/js/
viewer/css/
```

The browser can load config files directly from `ui/` when served from the project root. If later deployment requires all static assets under `viewer/`, add a small copy/build step instead of changing the config format.

## Config Loading Plan

Frontend boot sequence:

1. Load UI config.
2. Load generated flight data from `public-data/`.
3. Normalize config with defaults.
4. Create state from data plus config.
5. Render shell and sidebar.

Failure behavior:

- If a UI config file is missing, use built-in defaults.
- If a config field is invalid, ignore only that field and warn in console.
- The page should still load flight data even if UI config is broken.

## Config Files

### `ui/config/app.json`

Purpose:

- global UI defaults
- default theme
- default font scale
- high-level feature toggles

Example fields:

```json
{
  "defaultTheme": "dark",
  "defaultFontScale": "normal",
  "availableThemes": ["light", "dark"],
  "features": {
    "profileFrontendSwitch": false,
    "customPlots": true,
    "hud": true,
    "inspector": true
  }
}
```

### `ui/config/layout.json`

Purpose:

- page dimensions
- sidebar width limits
- workspace spacing
- panel heights
- responsive breakpoints

Example fields:

```json
{
  "page": {
    "maxWidth": "none",
    "minWorkspaceWidthPx": 720
  },
  "sidebar": {
    "defaultWidthPx": 320,
    "minWidthPx": 240,
    "maxWidthPx": 380,
    "collapsedWidthPx": 56,
    "resizable": true
  },
  "workspace": {
    "gapPx": 12,
    "panelRadiusPx": 14,
    "defaultPanelHeightPx": 360,
    "largePanelHeightPx": 620
  },
  "breakpoints": {
    "tabletPortraitPx": 900,
    "phonePx": 640
  }
}
```

### `ui/config/typography.json`

Purpose:

- font family
- font scale presets
- mono font for data tables

Example fields:

```json
{
  "fontFamily": "Atkinson Hyperlegible, Noto Sans SC, sans-serif",
  "monoFamily": "JetBrains Mono, ui-monospace, monospace",
  "scales": {
    "small": 0.92,
    "normal": 1,
    "large": 1.12
  }
}
```

### `ui/themes/light.json`

Purpose:

- light theme color tokens
- cold primary color system
- warm dynamic/warning colors

Token groups:

- `background`
- `surface`
- `text`
- `border`
- `primary`
- `secondary`
- `dynamic`
- `warning`
- `error`
- `chart`
- `hud`
- `mission`

### `ui/themes/dark.json`

Purpose:

- dark theme color tokens with the same keys as light theme
- should not require JS logic changes

Rules:

- Keep cold tones dominant.
- Preserve chart contrast.
- Warm colors only for active marker, current task, warnings and dynamic values.
- Purple/magenta only for navigation demand semantics, not base theme.

### `ui/config/interaction.json`

Purpose:

- global interaction defaults
- tablet and mouse behavior

Example fields:

```json
{
  "touch": {
    "minTargetPx": 44,
    "enablePinchZoom": true,
    "enableDragPan": true
  },
  "charts": {
    "wheelZoom": true,
    "dragPan": true,
    "axisDrag": true,
    "showZeroAxisDefault": true,
    "showModeLinesDefault": true
  },
  "persistence": {
    "rememberTheme": true,
    "rememberSidebarWidth": true,
    "rememberPanelCollapse": true
  }
}
```

### `ui/config/panels.json`

Purpose:

- define right workspace panel order and default collapse state
- not the focus of this note, but sidebar buttons need to control these panels

Example fields:

```json
{
  "defaultOpen": ["overview"],
  "importantOpen": ["track", "current-task", "inspector-summary"],
  "panels": [
    {"id": "overview", "label": "Overview", "defaultCollapsed": false},
    {"id": "track", "label": "Track", "defaultCollapsed": true},
    {"id": "plots", "label": "Plots", "defaultCollapsed": true}
  ]
}
```

## Left Sidebar Scope

The left sidebar is the first UI area to design.

It should be:

- width-limited
- vertically scrollable
- resizable within config limits
- collapsible to a narrow rail
- readable on tablet
- dense but not cramped
- independent from right panel rendering

## Left Sidebar Layout

Suggested vertical order:

1. App controls
2. Dataset status
3. Source selection
4. Profile status
5. Time controls
6. Panel visibility controls
7. Quick actions
8. Warnings and missing data

Each section should be collapsible. The section order should eventually come from `ui/config/left-sidebar.json`.

## `ui/config/left-sidebar.json`

Purpose:

- define sidebar sections
- define default collapse state
- define button layout
- define status fields shown in each section

Example structure:

```json
{
  "sections": [
    {
      "id": "app-controls",
      "label": "App",
      "defaultCollapsed": false,
      "items": ["reload", "theme", "font-scale", "reset-layout"]
    },
    {
      "id": "dataset",
      "label": "Dataset",
      "defaultCollapsed": false,
      "items": ["dataset-label", "firmware", "profile", "time-range"]
    },
    {
      "id": "sources",
      "label": "Sources",
      "defaultCollapsed": false,
      "items": ["route-source", "current-task-source", "parameter-source"]
    },
    {
      "id": "profile",
      "label": "Profile",
      "defaultCollapsed": true,
      "items": ["profile-confidence", "capabilities", "profile-command"]
    },
    {
      "id": "time",
      "label": "Time",
      "defaultCollapsed": true,
      "items": ["inspect-time", "global-window", "jump-mode", "jump-task"]
    },
    {
      "id": "panels",
      "label": "Panels",
      "defaultCollapsed": true,
      "items": ["collapse-all", "expand-important", "panel-list"]
    },
    {
      "id": "warnings",
      "label": "Warnings",
      "defaultCollapsed": true,
      "items": ["compatibility-warnings", "missing-data"]
    }
  ]
}
```

## Left Sidebar Section Details

### App Controls

Purpose:

- global actions that do not depend on a specific dataset section

Controls:

- `Reload`: reload JSON data without restarting server.
- `Theme`: segmented `Light` / `Dark`.
- `Font`: segmented `Small` / `Normal` / `Large`.
- `Reset Layout`: restore default sidebar width and panel collapse state.

Interaction:

- `Reload` should preserve theme and sidebar width.
- `Theme` applies immediately by swapping CSS variables.
- `Font` applies immediately through a root font scale variable.
- `Reset Layout` should not reset selected data sources.

### Dataset Status

Purpose:

- show what dataset is currently loaded

Fields:

- dataset label
- time range
- selected `.BIN`
- selected `.tlog`
- selected `.param`
- selected `.waypoints`
- counts: signals, semantic roles, current task events, parameters

Buttons:

- `Copy Summary`
- `Show Files`

Interaction:

- Long filenames must scroll horizontally, not truncate to ellipsis.
- `Show Files` expands a compact file list.
- Missing files show neutral `missing` status, not error styling.

### Source Selection

Purpose:

- control route/current task/parameter sources manually

Controls:

- `Route Source` dropdown.
- `Current Task Source` dropdown.
- `Parameter Source` dropdown.
- `Show Missing Sources` toggle.

Interaction:

- Route source and current task source are independent.
- Changing route source does not change current task source.
- Missing sources can be hidden by default.
- Source labels should include trust hints, for example `DataFlash CMD`, `TLog`, `External Waypoints`.
- If current task source has no events, disable it or show `missing`.

### Profile Status

Purpose:

- make firmware/profile compatibility visible but not editable in frontend

Fields:

- detected firmware vehicle/version/hash
- selected profile id
- selection mode
- capability badges
- warnings

Buttons:

- `Copy Build Command`
- `Show Details`

Interaction:

- No profile switch here.
- `Copy Build Command` should produce the CLI command needed to rebuild with the current profile.
- `Show Details` expands raw profile selection metadata.

### Time Controls

Purpose:

- basic global time inspection controls before chart implementation

Controls:

- `Inspect Time` numeric display plus slider.
- `Window Start` and `Window End` controls.
- `Reset Time`.
- `Prev/Next Mode`.
- `Prev/Next Task`.

Interaction:

- Time controls operate on global state.
- They must allow empty regions outside data range if later chart logic supports it.
- Reset time does not reset Y-axis chart ranges.
- Prev/Next task uses `domains/current_tasks.json`.

### Panel Visibility

Purpose:

- manage right workspace without scrolling through the full page

Controls:

- `Collapse All`
- `Expand Important`
- per-panel visibility toggles

Interaction:

- Panel visibility should use configured panel ids from `panels.json`.
- Important means Track, Current Task and Inspector summary by default.
- Visibility state should persist locally if enabled by config.

### Quick Actions

Purpose:

- common analysis shortcuts

Buttons:

- `Focus AUTO`
- `Show Track`
- `Show HUD`
- `Open Inspector`
- `Clear Inspect`

Interaction:

- Quick actions call existing state transitions.
- They should not duplicate full panel controls.
- If a target panel is collapsed, action may expand it.

### Warnings And Missing Data

Purpose:

- make partial-file support explicit

Content:

- compatibility warnings
- missing source statuses
- generic profile warnings
- no-current-task warnings

Interaction:

- Default collapsed unless severity is warning/error.
- Info messages stay visually quiet.
- Errors use warm colors.

## Sidebar Width Behavior

Configured by `layout.json`.

Rules:

- default width should be around `320px`
- minimum around `240px`
- maximum around `380px`
- user can drag right edge to resize
- collapsed rail around `56px`
- rail shows icons or short labels only

Tablet behavior:

- landscape: persistent left sidebar
- portrait: either overlay drawer or top stacked control strip
- final choice should be confirmed before implementation

## Theme Application Plan

Theme JSON should be transformed into CSS variables:

```css
:root {
  --color-bg: ...;
  --color-panel: ...;
  --color-text: ...;
  --color-primary: ...;
  --color-dynamic: ...;
}
```

Runtime logic:

- load selected theme JSON
- validate required tokens
- apply variables to `document.documentElement`
- store selected theme in local storage if enabled

Do not hardcode theme colors inside rendering functions.

## State Plan

Add UI state separate from data state:

```text
state.ui.theme
state.ui.fontScale
state.ui.sidebar.widthPx
state.ui.sidebar.collapsed
state.ui.sidebar.sections[sectionId].collapsed
state.ui.panels[panelId].collapsed
```

Rules:

- data source selection remains in `state.selection`
- UI appearance state remains in `state.ui`
- generated flight data remains read-only after load

## Implementation Order

Recommended implementation sequence:

1. Create `ui/` config files with defaults.
2. Add config loader in `viewer/js/config/`.
3. Add config normalization and fallback defaults.
4. Add theme CSS variable application.
5. Extend frontend state with `state.ui`.
6. Replace current static shell rendering with config-aware sidebar rendering.
7. Implement left sidebar section collapse.
8. Implement theme and font controls.
9. Implement source dropdowns inside the new sidebar.
10. Implement panel visibility controls as state-only placeholders.

## Open Decisions Before Coding

- Use root `ui/` exactly, or place runtime-copy config under `viewer/ui/` for deployment simplicity.
- Confirm default theme: dark or light.
- Confirm tablet portrait behavior: overlay drawer or top stacked controls.
- Confirm whether sidebar icons are needed in collapsed rail.
- Confirm exact font choices.

## Non-Goals For This Step

- no chart rendering redesign
- no 3D/HUD rewrite
- no profile frontend switch
- no formula inspector implementation
- no backend schema changes
