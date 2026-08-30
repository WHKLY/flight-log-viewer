# Refactor v27: Start Script And Minimal Viewer

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

Decisions:

- Add a one-command startup script for tablet use.
- Default dataset is `data/26.8.26侦察/ZC_20260826_1533_flight2`.
- Default HTTP port is `8000`.
- The script builds `public-data/` with `scripts/flv_build.py`, then starts `python3 -m http.server`.
- The script should not silently kill an occupied port; it should report the conflict.
- Future permission/tool limits should be handled by requesting escalation directly when needed.

Frontend step:

- Recreate `viewer/index.html` as a minimal schema viewer.
- Load only the new generated schema files.
- Show dataset, firmware/profile, source registry, mission sources, parameter source status, mode segments, and signal catalog summary.
- Do not bring back old chart/Track/HUD code yet.

