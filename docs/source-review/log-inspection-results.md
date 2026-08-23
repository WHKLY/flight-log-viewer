# Log Inspection Results

Date: 2026-08-23

Generated with:

```bash
python3 scripts/inspect_logs.py
```

Generated artifact, ignored by git:

```text
public-data/log-inspection.json
```

## Selected Files

- DataFlash: `00000073.BIN`
- TLOG: `2026-08-17 09-43-00.tlog`

The script correctly prefers the original files over `(1)` duplicate downloads.

## Summary

- DataFlash records scanned: `101662`
- DataFlash format definitions: `179`
- TLOG MAVLink frames scanned: `210125`

## Important DataFlash Messages Found

| Message | Count | Key fields | Viewer use |
| --- | ---: | --- | --- |
| `POS` | 2149 | `TimeUS, Lat, Lng, Alt, RelHomeAlt, RelOriginAlt` | Primary position/altitude track. |
| `GPS` | 430 | `TimeUS, Status, NSats, HDop, Lat, Lng, Alt, Spd, GCrs` | GPS quality and lower-rate track validation. |
| `ATT` | 2149 | `TimeUS, DesRoll, Roll, DesPitch, Pitch, DesYaw, Yaw` | Roll/pitch/yaw demanded vs actual. |
| `CTUN` | 2149 | `NavRoll, Roll, NavPitch, Pitch, ThO, RdrOut, ThD, As, SAs` | Control tuning overview and demanded values. |
| `NTUN` | 2149 | `Dist, TBrg, NavBrg, AltE, XT, XTi, AsE, TLat, TLng` | L1/navigation tracking panel. |
| `TECS` | 76 | `h, dh, hin, hdem, dhdem, spdem, sp, dsp, th, ph` | TECS height/speed/pitch/throttle panel. |
| `TEC2` | 76 | `PEW, EBD, EBE, EBDD, EBDE, EBDDT, Imin, Imax, I` | TECS energy balance detail. |
| `PIDR` | 2149 | `Tar, Act, Err, P, I, D, FF, Dmod, SRate, Limit` | Roll rate PID panel. |
| `PIDP` | 2149 | `Tar, Act, Err, P, I, D, FF, Dmod, SRate, Limit` | Pitch rate PID panel. |
| `PIDY` | 2149 | `Tar, Act, Err, P, I, D, FF, Dmod, SRate, Limit` | Yaw rate PID presence; must still check active path before interpretation. |
| `RCOU` | 2149 | `C1..C11` | Servo/output panel. |
| `RCIN` | 2149 | `C1..C11` | Pilot input panel. |
| `MODE` | 4 | `Mode, ModeNum, Rsn` | Flight mode segmentation. |
| `MSG` | 6310 | `Message` | Event/status annotation. |
| `ARSP` | 859 | `Airspeed, DiffPress, Temp, Offset` | Airspeed and speed-scaling context. |
| `AHR2` | 2149 | `Roll, Pitch, Yaw, Alt, Lat, Lng, Q1..Q4` | Candidate attitude/3D replay validation. |
| `XKQ` | 4298 | `Q1, Q2, Q3, Q4` | Quaternion source candidate for 3D replay. |

## Important TLOG MAVLink Messages Found

Top useful message IDs include:

- `ATTITUDE` (`30`): 8406 frames
- `GLOBAL_POSITION_INT` (`33`): 4297 frames
- `SERVO_OUTPUT_RAW` (`36`): 4288 frames
- `RC_CHANNELS` (`65`): 4283 frames
- `GPS_RAW_INT` (`24`): 4253 frames
- `VFR_HUD` (`74`): 8523 frames
- `MISSION_CURRENT` (`42`): 4391 frames
- `STATUSTEXT` (`253`): 16355 frames
- `EKF_STATUS_REPORT` (`193`): 4321 frames

The TLOG scanner currently counts MAVLink v1/v2 frames by frame structure only. It does not validate CRC and does not decode payload fields yet. Use it as availability evidence, not as authoritative parsed telemetry.

## Interpretation

The `.BIN` file is enough to be the first primary data source. It contains the main groups needed for the first usable viewer:

- 2D/3D track: `POS`, `GPS`, `AHR2`, `XKQ`
- Attitude demanded vs actual: `ATT`, `CTUN`
- L1/navigation: `NTUN`, `CTUN`
- TECS: `TECS`, `TEC2`, `CTUN`, `ARSP`
- PID: `PIDR`, `PIDP`, `PIDY`
- Inputs/outputs: `RCIN`, `RCOU`
- Segmentation/annotation: `MODE`, `MSG`, `EV`

The next implementation step should decode selected DataFlash record payloads into time-series JSON, starting with `POS`, `ATT`, `CTUN`, `NTUN`, `TECS`, `PIDR`, `PIDP`, `RCOU`, and `MODE`.

## Dependency Decision

`pymavlink` installation failed on this device because its `fastcrc` dependency needs Rust tooling for `aarch64-unknown-linux-android`. For now, continue with the no-dependency DataFlash reader and only revisit `pymavlink` if we need full MAVLink payload decoding.
