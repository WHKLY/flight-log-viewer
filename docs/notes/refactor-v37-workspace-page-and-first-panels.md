# Refactor V37 - Workspace Page Model And First Panels

Date: 2026-08-31

## User Direction

The viewer should evolve toward one web app with multiple display pages, similar to app sections such as "home", "discover" and "mine".

The current log viewer remains one page/workbench inside that app.

## Future Page Model

Planned top-level pages:

- Log Viewer
- Parameters
- Source Control Mapping

The future Parameters page should focus on parameter search, comparison, timelines and version/source differences.

The future Source Control Mapping page should focus on source-code-derived control formulas, control-chain provenance and parameter influence explanations.

## Current Log Viewer Panel Order

Inside the Log Viewer page, business panels should be grouped in this order:

- External Sources
- Track / Mission
- L1
- TECS
- Inner / Outer Loops
- Custom Plots

## This Step

Implement only:

- `External Sources`
- `Track / Mission`

Do not implement:

- top-level page switching
- L1 panel
- TECS panel
- inner / outer loop panel
- custom plot panel
- separate parameter page
- source-control mapping page

## Panel 1 - External Sources

Purpose:

- show dataset identity
- show selected raw files
- show firmware/profile compatibility
- show source registry
- show signal catalog summary
- show warnings
- show active source selections

This panel replaces the previous separate overview, source-registry and signal-catalog panels for the current refactor stage.

## Panel 2 - Track / Mission

Purpose:

- show mission route source candidates
- show current task source candidates
- show selected route/current-task sources
- show flight mode segments
- show current mission-source quality metadata

This panel replaces the previous separate mission-sources and mode-segments panels for the current refactor stage.

## Boundary

The panel names now reflect domain responsibilities instead of temporary implementation details.

The route/HUD/3D rendering is not restored in this step. It should be rebuilt later inside the `Track / Mission` panel after the data-source and UI structure stabilizes.

## Rollback

Revert this commit to return to the temporary shell panels:

- Overview Status
- Source Registry
- Mission Sources
- Mode Segments
- Parameters
- Signal Catalog
