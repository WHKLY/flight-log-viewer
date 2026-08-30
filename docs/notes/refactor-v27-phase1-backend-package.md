# Refactor v27: Phase 1 Backend Package Start

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

Decision:

- Start backend refactor by adding `scripts/flv/` modules while preserving current CLI scripts and generated JSON format.
- First extraction target is low-risk pure parsing code: MAV command names, finite-number helper, `.param`, QGC waypoint files, and FMT-driven DataFlash decode.
- Do not delete old script-local helper code in the first pass unless required; make CLI behavior call the new module seams first, then clean duplication after validation.

