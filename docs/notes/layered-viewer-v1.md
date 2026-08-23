# Layered Viewer V1

Date: 2026-08-23

## Purpose

The first real viewer page is organized by ArduPlane control layer, not by raw log message type. This keeps analysis aligned with the control model documented in `docs/source-review/control-model.md`.

## Viewer Layers

1. Mission / Events

   Source data: `MODE`, `MSG`, mission waypoints.

   Purpose: segment the flight and annotate mode/event context. This layer does not explain control outputs by itself.

2. Track / Geometry

   Source data: `POS`, `GPS`, mission waypoints.

   Purpose: show actual path and waypoint geometry. This is the geometry input context for L1, not the L1 controller itself.

3. L1 Navigation

   Source data: `CTUN`, `NTUN`.

   Purpose: show demanded roll, actual roll, crosstrack error, distance, target bearing, and navigation bearing. Problems here should be interpreted before blaming attitude PID.

4. TECS Energy

   Source data: `TECS`, `TEC2`, `ARSP`.

   Purpose: show height/speed demand and estimate behavior. TECS data is low-rate in this sample, so the panel should communicate that limitation.

5. Attitude / Rate

   Source data: `ATT`, `PIDR`, `PIDP`, `PIDY`.

   Purpose: show demanded vs actual roll/pitch and rate PID error. Yaw data is shown carefully because normal fixed-wing yaw is not always a direct yaw-rate PID path.

6. I/O Outputs

   Source data: `RCOU`, `RCIN`.

   Purpose: show the actuator/output end of the chain. Channel meanings must later be mapped through `SERVO*_FUNCTION` parameters instead of assuming fixed C1/C2/C3/C4 roles.

## Implementation Notes

- The page remains static HTML with no external JavaScript dependencies.
- Canvas charts are intentionally simple and local-first.
- Generated data comes from `public-data/series/*.json`, which is ignored by git.
- This version is a diagnostic scaffold, not a polished analysis tool.

## Next Improvements

- Decode `SERVO*_FUNCTION` from `.param` and label outputs by real function.
- Add synchronized cursor/hover across charts.
- Add mode shading across time-series charts.
- Add parameter cards beside L1, TECS, and PID panels.
- Add first 3D trajectory replay after attitude and coordinate transforms are stabilized.
