# Refactor v27: Frontend State Layer

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

Decision:

- Add a centralized frontend state module before restoring charts or Track/HUD.
- State owns loaded data, source selection, global time range, inspect time, Track playback marker, and UI collapse/font settings.
- UI modules should mutate state through small state functions rather than scattered object writes.

Current scope:

- Wire source and parameter selections through `viewer/js/state.mjs`.
- Keep visual layout unchanged.
- Add a Node smoke test for data attachment, selection mutation, time-window handling, marker clamping, and inspect-time update.

