# Refactor V35 - Sidebar Collapse And Workspace Visibility

Date: 2026-08-31

## Goal

Fix two UI behavior issues found during browser testing:

- collapsed left sidebar is too narrow and clips the collapse/expand button
- right workspace does not expand after sidebar collapse
- right workspace content should be hidden by default and controlled from the left sidebar

## Problem

The sidebar collapse class was applied only to `aside#left-sidebar`.

CSS grid columns were still defined on `.app-shell` as:

```css
minmax(var(--sidebar-min-width), var(--sidebar-width)) minmax(0, 1fr)
```

So the grid kept reserving the normal sidebar width even when the aside itself was collapsed.

The collapsed width was also too small relative to sidebar padding and the icon button size.

The right workspace panels also had no `data-panel-id`, so `state.ui.panels` could not control their visibility.

## Fix Plan

- Add a collapsed class to `.app-shell` when the sidebar collapses.
- Use `.app-shell.is-sidebar-collapsed` to change grid columns to `collapsedWidthPx + workspace`.
- Increase default collapsed sidebar width to keep the button visible.
- Reduce collapsed sidebar padding.
- Mark existing right workspace sections with `data-panel-id`.
- Add `.workspace-panel.is-hidden`.
- Set current right workspace panels default collapsed in `ui/config/panels.json`.
- Add render logic that applies `state.ui.panels[panelId].collapsed` to matching workspace panels.

## Boundary

This step does not implement final chart/track/HUD panels.

It only makes current placeholder workspace panels follow the same visibility state that future panels will use.

## Rollback

Revert the commit for this step to restore the previous sidebar collapse and always-visible right workspace behavior.
