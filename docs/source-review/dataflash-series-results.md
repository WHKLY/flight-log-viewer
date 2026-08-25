# DataFlash Series Extraction Results

Date: 2026-08-25

Generated with:

```bash
python3 scripts/extract_dataflash_series.py
```

Generated artifacts, ignored by git:

```text
public-data/series/manifest.json
public-data/series/track.json
public-data/series/mission.json
public-data/series/attitude.json
public-data/series/navigation.json
public-data/series/tecs.json
public-data/series/pid.json
public-data/series/motion.json
public-data/series/io.json
public-data/series/events.json
public-data/series/modes.json
```

## Source

- DataFlash source: first preferred `.BIN` in `data/raw/qq-2026-08-17/`, currently `00000073.BIN` when present.
- Parser: dependency-light DataFlash reader using `FMT` definitions from the log.
- Current sample firmware detected from `MSG`: `ArduPlane V4.4.4 (16b78382)`.

## Extracted Groups

| Group | Messages | Viewer use |
| --- | --- | --- |
| `track` | `POS`, `GPS` | 2D/3D path, speed, position, altitude. |
| `mission` | `CMD`, `MAVC`, `EV`, `TERR`, `ORGN` | Mission task context and events. |
| `attitude` | `ATT`, `AHR2`, `XKQ` | Actual/demanded attitude and orientation evidence. |
| `navigation` | `CTUN`, `NTUN` | L1/navigation demand and cross-track/bearing evidence. |
| `tecs` | `TECS`, `TEC2`, `ARSP` | Energy-control speed/height/pitch/throttle evidence. |
| `pid` | `PIDR`, `PIDP`, `PIDY` | Rate-loop target/actual/error/P/I/D/FF data. |
| `motion` | `IMU*`, `ACC*`, `GYR*`, `VIBE`, `RATE`, `XKF*`, `NKF*` | Acceleration, gyro, vibration, estimator and motion data. |
| `io` | `RCOU`, `RCIN` | Pilot input and actuator/throttle output values. |
| `events` | `MODE`, `MSG` | Mode and text/event context. |
| `modes` | `MODE`, `MSG` | Mapped mode segments and compatibility metadata. |

## Quality Rules

- Decode fields according to the log's embedded `FMT` records.
- Preserve raw message rows where practical and add `time_s` from `TimeUS`.
- If a message family is absent, write an empty group rather than blocking the viewer.
- Unknown Plane mode numbers display as `MODE_<number>` instead of being guessed.
- Generated series are rebuildable and should not be committed by default.

## Viewer Dependencies

The current viewer expects these generated files but tolerates missing files with empty fallbacks:

```text
public-data/dataset-summary.json
public-data/log-inspection.json
public-data/series/*.json
```

A waypoint-only or parameter-only package can still open after `summarize_dataset.py`; missing log-derived panels remain empty or show missing values.
