# Refactor V32 - UI Config And Left Sidebar Implementation

Date: 2026-08-31

## Goal

Implement the first configurable UI foundation and rebuild the left control sidebar around config files.

## Implemented Scope

- Added top-level `ui/` configuration directory.
- Added editable config files for app defaults, layout, typography, interactions, panels and left sidebar sections.
- Added light and dark theme token files.
- Added frontend config loading with built-in fallback defaults.
- Added theme token application through CSS variables.
- Added UI state for theme, font scale, sidebar collapse, sidebar section collapse and panel collapse placeholders.
- Rebuilt the left sidebar from `ui/config/left-sidebar.json`.
- Preserved the existing right-side workspace as a minimal data/schema view.

## Current Boundary

This step does not implement:

- chart rendering redesign
- 2D/3D track rewrite
- HUD rewrite
- profile frontend switching
- formula inspector
- sidebar width drag resizing
- localStorage persistence

These are planned but intentionally left out to keep this step reviewable.

## Runtime Files

- `viewer/js/config/defaults.mjs`
- `viewer/js/config/loader.mjs`
- `viewer/js/config/theme.mjs`
- `viewer/js/state.mjs`
- `viewer/js/ui/render.mjs`
- `viewer/js/app.js`
- `viewer/css/base.css`
- `viewer/index.html`

## Config Files

- `ui/config/app.json`
- `ui/config/layout.json`
- `ui/config/left-sidebar.json`
- `ui/config/panels.json`
- `ui/config/typography.json`
- `ui/config/interaction.json`
- `ui/themes/light.json`
- `ui/themes/dark.json`

## Rollback

Revert the commit for this step to restore the previous static sidebar and hardcoded style baseline.
