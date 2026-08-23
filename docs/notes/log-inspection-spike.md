# Log Inspection Spike

Date: 2026-08-23

## Goal

Confirm which usable fields exist in the sample ArduPilot logs before designing charts, 3D replay, and parameter-effect panels.

This stage is intentionally not a full viewer implementation.

## Scope

- Inspect DataFlash `.BIN` logs.
- Inspect Mission Planner MAVLink `.tlog` logs.
- Keep `.param` and `.waypoints` parsing from the previous summary script.
- Generate `public-data/log-inspection.json`.
- Use the result to decide the first real data model.


## Termux Dependency Note

`pymavlink` is still the preferred long-term parser, but installing it directly on this Termux/Python 3.14 environment currently fails through its `fastcrc` build dependency, which tries to use Rust tooling for the unsupported `aarch64-unknown-linux-android` rustup target.

For this spike, use a no-dependency parser:

- DataFlash: scan binary records, parse `FMT` definitions, count message types, and list fields.
- TLOG: scan MAVLink v1/v2 frames and count message IDs.

This is enough to identify available data groups before deciding whether to patch dependency installation, vendor a parser, use `pkg` packages, or generate logs through an external conversion step.

## Questions to Answer

- Which DataFlash message types exist?
- Which fields exist for position, altitude, attitude, speed, mode, TECS, PID, and servo output?
- Which MAVLink message types exist in the `.tlog`?
- Is `.BIN` enough as the primary source, or does `.tlog` add important data?
- Are timestamps consistent enough for synchronized charts and 3D replay?

## Important Signal Groups

- Track: GPS, POS, latitude, longitude, relative altitude, absolute altitude.
- Attitude: roll, pitch, yaw, rates if available.
- Navigation demand: demanded roll, demanded pitch, target bearing, crosstrack if logged.
- TECS: target altitude, target airspeed, pitch demand, throttle demand, energy flags if available.
- PID: PIDR, PIDP, PIDY and target/actual/error/P/I/D/FF fields if present.
- Output: servo outputs, throttle, aileron, elevator, rudder.
- Mode and events: MODE, MSG, ERR, EV.

## Expected Output

`public-data/log-inspection.json` should contain:

- selected `.BIN` and `.tlog` file names
- message type counts
- field names per type
- first/last timestamps where available
- candidate field mappings for the future viewer

## Commit Boundary

Target commit:

```text
Add log inspection spike
```

