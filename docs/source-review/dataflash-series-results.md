# DataFlash Series Extraction Results

Date: 2026-08-23

Generated with:

```bash
python3 scripts/extract_dataflash_series.py
```

Generated artifacts, ignored by git:

```text
public-data/series/manifest.json
public-data/series/track.json
public-data/series/attitude.json
public-data/series/navigation.json
public-data/series/tecs.json
public-data/series/pid.json
public-data/series/io.json
public-data/series/events.json
```

## Source

- DataFlash source: `00000073.BIN`
- Parser: no-dependency DataFlash reader using `FMT` definitions from the log

## Extracted Counts

| Message | Count | Group |
| --- | ---: | --- |
| `POS` | 2149 | track |
| `GPS` | 430 | track |
| `ATT` | 2149 | attitude |
| `AHR2` | 2149 | attitude |
| `XKQ` | 4298 | attitude |
| `CTUN` | 2149 | navigation |
| `NTUN` | 2149 | navigation |
| `TECS` | 76 | tecs |
| `TEC2` | 76 | tecs |
| `ARSP` | 859 | tecs |
| `PIDR` | 2149 | pid |
| `PIDP` | 2149 | pid |
| `PIDY` | 2149 | pid |
| `RCOU` | 2149 | io |
| `RCIN` | 2149 | io |
| `MODE` | 4 | events |
| `MSG` | 6310 | events |

## Quality Check

The first decoded samples are in expected ranges:

- `POS.Lat/Lng` decode to approximately `45.9157, 126.4526`.
- `ATT.Roll/Pitch/Yaw` decode to degrees, with demanded and actual fields present.
- `NTUN` includes distance, target bearing, nav bearing, altitude error, crosstrack error, and target lat/lng.
- `TECS/TEC2` are present but low-rate in this log, with only `76` records each.
- `PIDR/PIDP/PIDY` include target, actual, error, P/I/D/FF and limit fields.
- `RCOU/RCIN` expose channel values for output and pilot input panels.

## Next Step

Use the generated series files to upgrade `viewer/index.html` from a summary page into the first real dashboard:

- 2D track from `track.json`.
- Roll and pitch demanded vs actual from `attitude.json`.
- L1/navigation panel from `navigation.json`.
- TECS panel from `tecs.json`, with a warning that TECS data is lower rate.
- PID and output panels from `pid.json` and `io.json`.
