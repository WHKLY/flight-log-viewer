# Refactor v27: Frontend Data Layer

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

Decision:

- Before restoring detailed UI charts, establish the frontend data communication layer.
- Add `viewer/js/data/` modules for loading generated schema, source registry lookup, mission lookup, parameter lookup, and signal catalog lookup.
- Keep `viewer/js/app.js` responsible for the current minimal DOM rendering only.
- Future UI design work should start by asking the user to refine visual/layout requirements before implementation.

Current boundary:

- Data modules should not touch DOM.
- UI should not directly parse file-source semantics from `.BIN`, `.tlog`, `.param`, or `.waypoints`.
- Track, HUD, Inspector, and charts should later consume the same data modules.

