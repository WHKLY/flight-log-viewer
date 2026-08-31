# Refactor V28 - Firmware Compatibility Profiles

Date: 2026-08-31

## Goal

Introduce a firmware compatibility profile system and use ArduPlane 4.7 as the first explicit example.

Raw DataFlash parsing remains FMT-driven and version-neutral. The profile layer is for semantic interpretation:

- flight mode names
- preferred signal roles
- message aliases
- mission extraction strategy names
- parameter alias/deprecation metadata
- control formula source metadata
- declared capabilities

## Design

Profiles are JSON files under `scripts/flv/profiles/`.

The builder detects firmware from DataFlash `MSG`, selects the best profile, and writes the selected profile into `dataset.json`.

Manual profile override is supported by the build CLI:

```bash
python3 scripts/flv_build.py --profile ardupilot-plane-4.7
```

This is required because automatic selection can be wrong when:

- logs are incomplete
- tlog is disconnected or partial
- firmware is custom or backported
- semantic fields are present but version strings are missing

## Initial Profiles

- `ardupilot-generic`
- `ardupilot-plane-generic`
- `ardupilot-plane-4.7`

The 4.7 profile is an explicit example profile. It records the intended semantic locations for track, attitude, TECS, mission and control-related signals without changing the FMT decoder.

## Boundary

- `parsers/dataflash.py`: binary/FMT decode only
- `normalize/firmware.py`: detect firmware string only
- `profiles.py`: load/select profiles
- `normalize/*`: consume selected profile for semantic normalization

## Rollback

Revert the commit for this step to return to the previous hard-coded compatibility dict.
