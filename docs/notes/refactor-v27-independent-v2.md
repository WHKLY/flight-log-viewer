# Refactor v27: Independent V2 Boundary

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

Decision:

- The refactored version should become independent from the previous implementation.
- Current Phase 1 is conservative and still supports old CLI output; this is useful for comparison but should not define the final v2 boundary.
- Future implementation should create a parallel v2 build path: `scripts/flv_build.py`, `scripts/flv/`, `public-data-v2/`, and `viewer-v2/`.
- V2 must not import old CLI scripts or depend on old `viewer/index.html`.
- Old scripts/viewer can remain as v1 reference and fallback until v2 reaches parity.

Detailed document: `docs/refactor/independent-v2-boundary.md`.

