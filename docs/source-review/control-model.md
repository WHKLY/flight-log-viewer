# ArduPlane Plane 4.7 Control Model for Viewer

Date: 2026-08-23

This note records the control model that the viewer should use when explaining logs and parameters. It is based on the four Plane 4.7 PDF documents in `data/raw/qq-2026-08-17/`, extracted text under `docs/source-review/extracted/`, and source inspection of the local ArduPilot checkout at `~/work/projects/ardupilot`.

## Source Documents Reviewed

- `ArduPilot_Plane_4.7_固定翼控制系统总览_PID_TECS_L1_参数与调参指南.pdf`
- `ArduPilot_Plane_4.7_导航航迹制导与任务规划参数源码公式总览.pdf`
- `ArduPilot_Plane_4.7_稳定控制参数与源码公式.pdf`
- `ArduPilot_Plane_4.7_飞行模式控制执行IO与驾驶员飞控权限总览.pdf`

## Core Hierarchy

The viewer should present ArduPlane as a layered control system:

```text
Pilot / Mission
  -> Mode / Mission command selection
  -> L1 lateral guidance or pilot roll intent
  -> TECS longitudinal energy control or pilot throttle/pitch intent
  -> Roll/Pitch attitude outer loops
  -> Roll/Pitch rate PID loops
  -> Yaw coordination / yaw damping path
  -> SRV output: aileron, elevator, rudder, throttle, steering
```

The most important product decision is that charts should be grouped by control layer, not by raw log message name.

## Mode Authority

The documents refine pilot authority by mode:

| Mode | Pilot authority | L1 | TECS | Main interpretation |
| --- | --- | --- | --- | --- |
| MANUAL | Actuator layer | No | No | Pilot directly commands surfaces and throttle. |
| STABILIZE | Surface-mixing layer | No | No | Plane stabilizes roll/pitch toward level, then pilot stick directly mixes into final surfaces. |
| FBWA | Attitude-target layer | No | No | Pilot commands target roll and pitch; throttle is manual. |
| FBWB | Roll target plus vertical/speed intent | No | Yes | Pilot commands roll; pitch/throttle are generated through TECS. |
| AUTO | Mission supervision plus optional stick mixing | Yes for normal fixed-wing legs | Yes for normal fixed-wing legs | Mission provides path/height/speed; L1 and TECS generate targets. |

Important correction: `AUTO = L1 + TECS` is valid only for normal fixed-wing AUTO flight legs. Takeoff, landing, scripting, altitude wait, and QuadPlane VTOL AUTO have special branches.

## L1 Lateral Guidance

For normal fixed-wing waypoint and loiter navigation, Plane uses `AP_L1_Control` through `nav_controller`.

Main source points:

- `ArduPlane/navigation.cpp`: `Plane::navigate()` calls `control_mode->navigate()`.
- `ArduPlane/mode_auto.cpp`: AUTO mission update calls `plane.mission.update()`.
- `libraries/AP_L1_Control/AP_L1_Control.cpp`: `update_waypoint()`, `update_loiter()`, `nav_roll_cd()`.

Key parameters:

- `NAVL1_PERIOD`: main aggressiveness/time-scale parameter. Smaller means more aggressive turns and higher stall risk.
- `NAVL1_DAMPING`: path tracking damping and overshoot behavior.
- `NAVL1_XTRACK_I`: crosstrack integrator for small capture-angle straight legs.
- `NAVL1_LIM_BANK`: loiter-radius/bank capability relation, not a universal hard roll limit.

Viewer implications:

- Show mission leg geometry, current segment, target waypoint, and actual GPS track together.
- Show L1 demand chain: crosstrack error, bearing error, target bearing, lateral acceleration demand if available, demanded roll, actual roll.
- Show roll limits and stall-prevention effects beside L1 demand because `nav_roll_cd` can be constrained before reaching roll control.

## TECS Longitudinal Control

TECS should be explained as energy control, not as a simple altitude PID.

Core idea:

- Potential energy represents height.
- Kinetic energy represents airspeed.
- Throttle primarily controls total energy rate.
- Pitch primarily controls energy balance between height and speed.

Key parameters:

- Time constants and damping: `TECS_TIME_CONST`, `TECS_THR_DAMP`, `TECS_PTCH_DAMP`.
- Integrators: `TECS_INTEG_GAIN`, `TECS_LAND_IGAIN`, `TECS_TKOFF_IGAIN`.
- Limits: `TECS_CLMB_MAX`, `TECS_SINK_MIN`, `TECS_SINK_MAX`, `TECS_VERT_ACC`.
- Weighting: `TECS_SPDWEIGHT`, `TECS_LAND_SPDWGT`.
- Turn compensation: `TECS_RLL2THR`.
- Pitch bounds: `TECS_PITCH_MAX`, `TECS_PITCH_MIN`, plus fallback to `PTCH_LIM_MAX_DEG` and `PTCH_LIM_MIN_DEG`.

Viewer implications:

- Show target altitude, estimated altitude, target speed, estimated/measured airspeed, pitch demand, pitch actual, throttle demand, throttle output.
- Explain `TECS_SPDWEIGHT` as energy allocation: near 0 favors height via pitch, near 2 favors speed via pitch. It is not just a gain multiplier.
- Separate "with airspeed" and "no airspeed" behavior; no-airpeed TECS is degraded and should not be interpreted as full kinetic-energy feedback.
- Show roll-to-throttle compensation during turns by relating bank angle, `TECS_RLL2THR`, airspeed, and throttle demand.

## Roll/Pitch Stabilization

Source points:

- `ArduPlane/Attitude.cpp`: `calc_speed_scaler()`, `stabilize_roll()`, `stabilize_pitch()`.
- `libraries/APM_Control/AP_RollController.cpp`
- `libraries/APM_Control/AP_PitchController.cpp`
- `libraries/APM_Control/AP_FW_Controller.cpp`

The roll/pitch chain is:

```text
target attitude -> attitude outer loop -> target angular rate -> rate PID -> surface output
```

Key parameters:

- Roll outer loop: `RLL2SRV_TCONST`, `RLL2SRV_RMAX`, `RLL2SRV_ANGLE_P`.
- Pitch outer loop: `PTCH2SRV_TCONST`, `PTCH2SRV_RMAX_UP`, `PTCH2SRV_RMAX_DN`, `PTCH2SRV_RLL`, `PTCH2SRV_ANGLE_P`.
- Rate PID: `RLL_RATE_*`, `PTCH_RATE_*`.
- Airspeed scaling: `SCALING_SPEED`, `AIRSPEED_MIN`, `AIRSPEED_MAX`.

Important viewer rule:

`speed_scaler` changes the effective controller behavior with airspeed. PID charts should include airspeed or speed scaler whenever possible.

## Yaw / Rudder

Yaw is parallel to the roll/pitch chain, but normal fixed-wing yaw behavior is not simply "yaw rate PID".

Normal path:

```text
coordinated turn / yaw damping / sideslip control
  -> YAW2SRV_*
  -> plus KFF_RDDRMIX * aileron
  -> plus pilot rudder input
  -> rudder output
```

Direct `YAW_RATE_*` control is only used in specific paths such as guided external yaw or autotune/acrobatic conditions. `YAW_RATE_ENABLE=1` does not automatically make normal FBWA/FBWB/AUTO use direct yaw-rate PID.

Viewer implications:

- Treat `YAW2SRV_*`, `KFF_RDDRMIX`, and pilot rudder as the normal rudder explanation.
- Only show `YAW_RATE_*` as active when logs/mode conditions prove that path is selected.

## Project Design Adjustments After Reading Documents

- Keep the first viewer organized by control layer: Mission/Mode, L1, TECS, Attitude/Rate, Output.
- Avoid claiming AUTO always equals L1 + TECS; label normal fixed-wing AUTO legs separately from takeoff/landing/scripted branches.
- Do not present yaw as symmetrical with roll/pitch PID by default.
- Make parameter panels state "where this parameter acts" and "which log signals validate it".
- Use the `.param` file to highlight only parameters present on the aircraft, then enrich them with source/document metadata.

