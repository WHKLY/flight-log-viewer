# Refactor V41 - Track 2D Interaction

Date: 2026-08-31

## Goal

Make the 2D Track view interactive.

## Scope

Implement:

- mouse drag pan
- one-finger pointer drag pan
- mouse wheel zoom
- two-pointer pinch zoom
- Fit Track reset
- Fit Window reset
- Fit Route reset
- click waypoint in 2D plot to select/highlight task
- click near plotted track to move selected aircraft time

## Technical Route

Use SVG `viewBox` as the interaction transform.

Reason:

- the existing renderer already projects lat/lon into an equal-scale SVG coordinate space
- changing `viewBox` preserves that equal metric scale
- pan/zoom can be stored as viewBox state without recalculating all geometry
- it works with mouse, touch and tablet browsers through Pointer Events

## State

Add `track.view2d`:

- `x`
- `y`
- `width`
- `height`

`null` means fitted default view.

## Interaction Rules

- dragging the plot changes only the 2D viewBox
- wheel/pinch changes only the 2D viewBox
- changing selected time does not refit the plot
- clicking a waypoint selects/highlights the task
- clicking the empty plot after a small pointer movement sets marker time from the nearest rendered track point
- Fit buttons reset viewBox to the fitted defaults for now

## Boundary

This phase does not implement:

- inertial pan
- axis-edge drag
- zoom around exact cursor focal point perfection
- persistent localStorage
- 3D interaction
- HUD graphics

## Rollback

Revert this commit to return to static 2D SVG plot.
