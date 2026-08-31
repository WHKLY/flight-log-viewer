# Profile Compatibility Boundary

Date: 2026-08-31

## Purpose

This note defines what the current firmware compatibility profile system can and cannot guarantee.

The current implementation has explicit ArduPlane 4.5 and ArduPlane 4.7 family profiles. They are compatibility profiles for semantic mapping and capability declaration. They are not yet complete source-verified formula packs.

## Current Implemented Profiles

- `ardupilot-generic`
- `ardupilot-plane-generic`
- `ardupilot-plane-4.5`
- `ardupilot-plane-4.7`

The active profile is selected by:

- automatic firmware detection from DataFlash `MSG`
- exact version-prefix match, for example `Plane` plus `4.5.` or `4.7.`
- fallback to `ardupilot-plane-generic` for unsupported Plane versions
- fallback to `ardupilot-generic` for unsupported vehicles
- manual override with `python3 scripts/flv_build.py --profile <profile-id>`

## Compatibility Boundary

### Guaranteed By The Current System

- DataFlash raw decoding is still driven by the log's own `FMT` records.
- The decoder does not assume ArduPlane 4.5 or 4.7 binary layouts.
- Firmware family, vehicle, version and git hash are extracted from decoded `MSG` rows when available.
- The selected profile is written to `public-data/dataset.json`.
- Available profiles are written to `public-data/dataset.json`.
- Mode names are resolved from the selected profile's `mode_map`.
- Track and attitude semantic candidates are written from the selected profile into `domains/track.json`.
- Signal semantic roles are written into `signals.json`.
- Mission source policy records that route/current-task selection must remain manual-first.
- CLI manual profile override is available for incomplete logs, custom firmware and cross-version inspection.

### Not Guaranteed Yet

- The ArduPlane 4.5 and 4.7 profiles are not yet complete source-verified formula profiles.
- Profiles do not yet include exact source file, function name and line-level control formula references.
- Parameter aliases and deprecated parameter mappings are currently placeholders.
- Message alias lists are semantic candidates, not proven exhaustive mappings.
- Field names listed in `signal_roles` are candidates; a specific log may not contain all of them.
- Unit normalization is not yet handled by profile rules.
- Sign conventions for all fields are not yet declared by profile rules.
- Mission-current-task extraction still depends on the existing `CMD` and tlog logic; profile currently records strategy but does not replace extraction logic.
- Custom vendor firmware, backports and patched builds are not automatically distinguishable from upstream version strings.
- Copter/Rover profiles are only generic fallbacks, not real vehicle support.

## ArduPlane 4.5 Profile Meaning

`ardupilot-plane-4.5` currently means:

- match detected `Plane` firmware versions beginning with `4.5.`
- use Plane 4.x mode mapping for 4.5-family logs
- expose expected semantic signal roles for track, attitude, TECS, PID and output data
- expose mission source strategy for `CMD`, external waypoint and tlog sources
- declare control interpretation layers
- mark control explanation confidence as `version-family`

It does not yet mean:

- every control equation is bound to exact ArduPlane 4.5 source code
- every parameter affecting each equation is enumerated
- every field has verified units and sign convention
- every mission state transition is decoded from all possible log messages

## ArduPlane 4.7 Profile Meaning

`ardupilot-plane-4.7` currently means:

- match detected `Plane` firmware versions beginning with `4.7.`
- use Plane 4.x mode mapping for 4.7-family logs
- expose expected 4.7-era semantic signal roles
- expose expected mission source strategy
- declare intended control interpretation layers
- mark control explanation confidence as `version-family`

It does not yet mean:

- every control equation is bound to exact ArduPlane 4.7 source code
- every parameter affecting each equation is enumerated
- every field has verified units and sign convention
- every mission state transition is decoded from all possible log messages

## Current Flight2 Result

The current default test log reports:

- firmware: `ArduPlane V4.5.1 (91d4ca63)`
- automatic profile: `ardupilot-plane-4.5`

When manually built with:

```bash
python3 scripts/flv_build.py --profile ardupilot-plane-4.7
```

the generated dataset records:

- real log firmware remains `Plane 4.5.1`
- selected compatibility profile becomes `ardupilot-plane-4.7`
- profile selection mode becomes `manual_override`

This separation is intentional. The log firmware and the explanation profile must remain separate fields.

## Required Next Steps For Stronger Compatibility

1. Add source-backed control formula metadata for each profile.
2. Add parameter alias/deprecation maps from ArduPilot parameter metadata or source review.
3. Add unit and sign metadata for semantic signal roles.
4. Add profile-level mission extraction strategies with explicit supported message fields.
5. Add profile validation tests using real logs from each supported firmware family.
6. Add UI-level manual profile selection so users do not need CLI rebuilds for inspection experiments.

## Safe Interpretation Rule

Only treat a profile as exact when:

- firmware detection matched that profile automatically, or the user deliberately overrode it
- the specific analysis panel declares support for that profile capability
- the needed source fields exist in the log
- the profile has source-backed formula or mapping metadata for that analysis

Otherwise the viewer should label the result as conceptual, inferred or unavailable.
