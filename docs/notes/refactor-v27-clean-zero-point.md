# Refactor v27: Clean Zero Point

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

Decision:

- The clean refactor zero point should remove old backend scripts and old frontend implementation files.
- Backend tracked scripts were already removed in `4f84873 Reset backend scripts for v2 refactor`.
- Frontend tracked implementation files also need to be removed: `viewer/index.html`, `viewer/js/track-camera.js`, and `viewer/js/track-hud.js`.
- Documentation, git history, raw local flight data, README, pyproject, and package namespace can remain.
- New v2 implementation should restart from explicit files such as `scripts/flv_build.py`, `scripts/flv/`, `viewer-v2/`, and `public-data-v2/`.

Reason:

- The previous zero point still retained old frontend runtime code.
- Keeping old frontend runtime code risks accidental reuse and makes the v2 boundary ambiguous.
- Historical recovery remains available through earlier commits, so deleting the tracked implementation files on this branch is acceptable.

