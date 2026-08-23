# Version Compatibility Strategy

Date: 2026-08-23

## Problem

This project will analyze logs from different ArduPilot firmware versions. We must avoid assuming that one local source checkout or one PDF document set exactly matches every flight log.

Current known baselines:

- Sample flight log firmware: `ArduPlane V4.4.4 (16b78382)` from `MSG`.
- Provided control documents: `ArduPilot Plane 4.7`.
- Local source checkout: `master`, `381357f8a974547e924b8719b0d99bb3050a9db0`, described as `ArduPilot-4.6.0-beta1-7969-g381357f8a9`.

These are not the same version.

## Design Rule

Every interpretation layer must record which compatibility source it used:

- log-derived firmware version
- DataFlash `FMT` definitions from the log itself
- vehicle type if available
- mode mapping table version
- parameter metadata/source version
- local source revision used for explanation

Parsing should prefer log-embedded definitions over external assumptions.

## DataFlash Compatibility

DataFlash payload decoding should be driven by the log's own `FMT` records. This is already the current extractor behavior.

Benefits:

- Field order can change across versions without breaking selected message decoding.
- Message length comes from the log.
- The parser can report missing fields instead of silently using the wrong schema.

Required follow-up:

- Include `FMT` metadata in `manifest.json`.
- When a viewer panel expects a field, show an unavailable state if the field is missing.

## Flight Mode Compatibility

Plane mode numbers are stable enough for common modes, but they should still live in an explicit mapping table rather than hardcoded UI text.

For Plane logs, initial mapping:

| Number | Name | Notes |
| ---: | --- | --- |
| 0 | MANUAL | actuator layer |
| 1 | CIRCLE | assisted circle |
| 2 | STABILIZE | surface-mixing layer |
| 3 | TRAINING | training mode |
| 4 | ACRO | acro mode |
| 5 | FBWA | fly-by-wire A |
| 6 | FBWB | fly-by-wire B / TECS |
| 7 | CRUISE | cruise |
| 8 | AUTOTUNE | autotune |
| 10 | AUTO | mission mode |
| 11 | RTL | return to launch |
| 12 | LOITER | loiter |
| 13 | TAKEOFF | takeoff mode in newer firmware |
| 14 | AVOID_ADSB | avoid ADS-B |
| 15 | GUIDED | guided |
| 16 | INITIALISING | startup |
| 17-23 | Q* modes | QuadPlane if enabled |
| 24 | THERMAL | soaring if enabled |
| 25 | LOITER_ALT_QLAND | QuadPlane if enabled |
| 26 | AUTOLAND | if enabled |

Compatibility behavior:

- If firmware version is known, record it beside the mapping.
- If a mode number is unknown, display `MODE_<number>` instead of guessing.
- If vehicle type is not Plane, use a separate mapping table.

## Parameter Compatibility

Parameter files are authoritative for values on the aircraft, but parameter meaning can vary by firmware version.

Rules:

- Always display raw parameter value from `.param`.
- Parameter explanation should include source version, such as `Plane 4.7 docs` or `local source master`.
- If explanation version differs from log firmware, show a compatibility warning.
- Do not use Plane 4.7-only parameters to explain a Plane 4.4.4 log without checking presence in `.param` and source history.

## Source Review Compatibility

Source-based explanations should cite the source revision used. The current local checkout is not the same as the sample log firmware. For exact analysis, we may need to add additional ArduPilot source checkouts or references:

```text
~/work/projects/ardupilot-sources/ArduPlane-4.4.4/
~/work/projects/ardupilot-sources/ArduPlane-4.7/
~/work/projects/ardupilot-sources/master/
```

Do not overwrite the existing local `ardupilot` checkout for this. Separate source trees are safer.

## Viewer Compatibility UI

The viewer should show a small compatibility banner:

- Log firmware: from `MSG` if present.
- Parser schema: `DataFlash FMT from log`.
- Mode map: `Plane default mode map`.
- Explanation source: docs/source revision.

If versions differ, the banner should be informational, not blocking.

## Immediate Implementation Tasks

1. Generate `modes.json` from `MODE` rows and map mode numbers to names.
2. Extract firmware text from `MSG`, especially strings like `ArduPlane V4.4.4 (...)`.
3. Add compatibility metadata to generated manifest.
4. Update viewer mode bands to use mapped names and show unknown modes explicitly.
5. Add warning text when explanation source version differs from log firmware.
