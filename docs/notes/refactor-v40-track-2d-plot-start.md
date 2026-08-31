# Refactor V40 - Track 2D Plot Start

Date: 2026-08-31

## User Requests

Implement the next Track / Mission step:

- make Track View taller
- set default font scale to small
- make all three preset font scales smaller
- color-code mode strip segments
- add a jump/send action for future plot `timeref`
- start drawing track data

## Scope

This phase starts 2D plotting only.

Implemented target:

- load `public-data/series/track.json`
- draw 2D actual path from `POS.Lat`, `POS.Lng`, `POS.time_s`
- draw route waypoints from selected mission route source
- draw current/selected task highlight
- draw selected aircraft time marker from nearest POS point
- use equal metric scale for lat/lon projection
- preserve Track / Mission source and task interactions
- provide `Send Timeref` action for future Custom Plots

## Boundaries

Do not implement yet:

- 2D drag pan
- 2D wheel/pinch zoom
- range handles
- 3D renderer
- real HUD graphics
- automatic playback timer
- Custom Plots panel

## Data Assumption

Track series format:

- `series/track.json`
- `messages.POS[]`
- fields: `Lat`, `Lng`, `Alt`, `time_s`

Fallback:

- if POS is missing, show waypoint-only route view if possible
- if route is missing, show track-only view if possible
- if both are missing, show a no-data placeholder

## Timeref Meaning

`plotTimeref` is a future shared plotting reference time.

This phase only stores the value in state and shows it in Track / Mission. Later Custom Plots should read the same state and draw a vertical reference line.

## Rollback

Revert this commit to return to Track / Mission Phase 1 placeholders.
