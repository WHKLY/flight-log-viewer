# Refactor V39 - Track / Mission Phase 1 Build

Date: 2026-08-31

## Implemented Scope

Phase 1 builds the `Track / Mission` operational skeleton.

Implemented:

- track-specific state fields
- selected track marker time
- selected track window placeholder state
- route display mode state
- track display mode state
- path scope state
- HUD/task/track/waypoint/target visibility toggles
- highlighted mission task state
- Track / Mission header summary
- manual route source selector
- manual current-task source selector
- mission task list
- current task detail card
- viewer placeholder area
- HUD placeholder area
- local track timeline slider
- flight mode strip
- previous/next task jump
- previous/next mode jump
- click task to highlight and jump to task time

## Deliberate Boundary

The playback button only toggles `track.playing` in this phase.

It does not yet start a timer or advance selected time automatically. Automatic replay belongs to the later timeline/playback phase.

## Reason

The priority is to stabilize task/time/source interaction before adding renderers.

If 2D/3D/HUD rendering is added before this interaction model is stable, later fixes will likely require touching renderer logic and state logic at the same time.

## Known Placeholder Areas

- 2D renderer is not implemented
- 3D renderer is not implemented
- HUD graphics are not implemented
- range handles for local track window are not implemented
- camera mode buttons are not implemented
- fit buttons are present as placeholders only

## Next Phase

Recommended next phase:

- implement 2D track renderer inside the existing viewer placeholder
- preserve equal metric scaling
- draw route waypoints
- draw selected/current task highlight
- draw selected time marker
- keep pan/zoom independent from timeline movement

## Rollback

Revert the Phase 1 implementation commit to return `Track / Mission` to the source/mode list-only panel.
