# Firmware Version Compatibility Plan

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

## Goal

Firmware compatibility must be part of the data architecture, not a loose UI warning. The viewer will face logs from different ArduPilot Plane versions, different local source checkouts, incomplete tlogs, external waypoint files, and onboard-computer-generated routes. The solution is to separate raw log truth, versioned interpretation, and UI fallback behavior.

## Core Principle

The system must separate four layers:

- Firmware that generated the log.
- Schema embedded in the log.
- Source/documentation version used to explain control behavior.
- Fallback or missing-data behavior used by the UI.

Parsing should trust the log first. Explanations can use ArduPilot docs/source, but they must carry version/confidence metadata and must not override fields that are absent from the actual log.

## Firmware Metadata

Every generated dataset should include firmware metadata:

```json
{
  "firmware": {
    "family": "ArduPilot",
    "vehicle": "Plane",
    "version": "4.4.4",
    "git_hash": "16b78382",
    "raw_messages": ["ArduPlane V4.4.4 (16b78382)"],
    "detected_from": ["MSG"],
    "confidence": "high"
  }
}
```

If detection fails, the object still exists:

```json
{
  "firmware": {
    "family": "ArduPilot",
    "vehicle": "unknown",
    "version": null,
    "git_hash": null,
    "raw_messages": [],
    "detected_from": [],
    "confidence": "missing"
  }
}
```

This lets the UI and inspector behave deterministically even for unknown versions.

## Compatibility Profiles

Introduce versioned compatibility profiles:

```text
project-data/compatibility/
  ardupilot-plane-generic.json
  ardupilot-plane-4.4.json
  ardupilot-plane-4.7.json
```

Example:

```json
{
  "id": "ardupilot-plane-4.4",
  "family": "ArduPilot",
  "vehicle": "Plane",
  "version_range": "4.4.x",
  "mode_map": "plane_default_4.x",
  "parameter_metadata": "plane_4.4_or_nearest",
  "control_formulas": "plane_4.4",
  "fallback_profile": "ardupilot-plane-generic"
}
```

Rules:

- Exact firmware profile wins.
- Same major/minor profile is acceptable.
- Generic profile is used only when no closer profile exists.
- The selected profile must be written into generated data.
- Profile mismatch must create warnings, not block the viewer.

## DataFlash Compatibility

DataFlash decoding must stay `FMT` driven:

- Message layouts come from the log's own `FMT` records.
- Field names come from the log.
- Message lengths come from the log.
- Unknown or unsupported messages are skipped or retained as metadata, not decoded with guessed layouts.

Generated field catalog:

```json
{
  "messages": {
    "ATT": {
      "present": true,
      "source": "dataflash_fmt",
      "fields": ["TimeUS", "DesRoll", "Roll", "DesPitch", "Pitch", "Yaw"]
    }
  }
}
```

UI rule:

- If a panel expects a field that is absent in this catalog, the resolver returns `missing`.
- The chart should not crash and should not invent a replacement field silently.

## Flight Mode Compatibility

Mode maps should live in profiles, not inside drawing/UI logic.

Example:

```json
{
  "mode_maps": {
    "plane_default_4.x": {
      "0": "MANUAL",
      "2": "STABILIZE",
      "10": "AUTO"
    }
  }
}
```

Rules:

- Store raw mode number and resolved label.
- If mode is unknown, display `MODE_n`.
- If vehicle is not Plane or cannot be detected, use the generic profile and avoid Plane-specific assumptions.

## Parameter Compatibility

Parameter values and parameter meanings are different data:

- Values come from `.param` or DataFlash `PARM`.
- Meanings come from versioned metadata.
- Inspector calculations should only use parameters actually present in the selected parameter source.

Parameter metadata example:

```json
{
  "NAVL1_PERIOD": {
    "vehicle": ["Plane"],
    "versions": {
      "4.4": {"label": "L1 period", "unit": "s"},
      "4.7": {"label": "L1 period", "unit": "s"}
    }
  }
}
```

Rules:

- Raw unknown parameters remain visible.
- Missing metadata should not hide parameter values.
- If metadata is from a different firmware version, mark it as `version_mismatch`.
- DataFlash `PARM` must remain time-aware because parameters can change during a log.

## Control Formula Compatibility

Control formulas should have explicit version and confidence metadata.

Example:

```json
{
  "id": "plane_l1_navroll",
  "vehicle": "Plane",
  "version_range": "4.4.x",
  "source_reference": "ArduPlane 4.4.x AP_L1_Control / Plane navigation path",
  "inputs": ["NTUN.NavRoll", "NTUN.XTrack", "GPS.Spd"],
  "parameters": ["NAVL1_PERIOD", "NAVL1_DAMPING"],
  "confidence": "source-matched"
}
```

Confidence values:

- `source-matched`: explanation matches detected firmware/profile.
- `nearby-version`: explanation uses nearby source/docs.
- `generic`: concept-level explanation only.
- `field-missing`: required logged fields are absent.
- `unsupported`: no safe explanation is available.

UI rule:

- Formula cards should show confidence compactly.
- The viewer should avoid presenting nearby-version formulas as exact runtime source behavior.

## Mission Compatibility

Mission compatibility must separate route, current task, and source completeness:

- External `.waypoints` is planned route data, not execution truth.
- DataFlash `CMD` is onboard execution evidence when present.
- tlog `MISSION_ITEM(_INT)` is mission communication data, not guaranteed complete after telemetry loss.
- tlog `MISSION_CURRENT` can indicate current sequence only while telemetry is present.
- Onboard-computer route updates should be represented as source versions with `start_s` and `end_s`.

Required UI behavior:

- Route source can be selected manually.
- Current-task source can be selected manually.
- Automatic suggestion can exist, but must never be the only path.
- Each selected source should expose quality/completeness warnings.

## Generated Warning Model

Version mismatches and missing fields should be generated as structured warnings:

```json
{
  "warnings": [
    {
      "code": "formula_version_mismatch",
      "severity": "info",
      "message": "L1 explanation uses Plane 4.7 docs for Plane 4.4.4 log"
    }
  ]
}
```

Rules:

- Corrupt files can be fatal.
- Unknown fields, unknown modes, missing params, and formula version mismatches should be non-fatal.
- The viewer should still open partial datasets.

## Implementation Order

1. Detect firmware from DataFlash `MSG` and write a `firmware` object.
2. Add compatibility profile selection and write the chosen profile into generated data.
3. Move Plane mode maps into profile data.
4. Export a DataFlash field catalog from `FMT`.
5. Add versioned parameter metadata.
6. Add versioned formula metadata for L1, TECS, attitude/rate, and output layers.
7. Make Inspector display formula confidence and version mismatch status.
8. Add tests for unknown firmware, unknown fields, unknown mode number, and mid-flight parameter change.

## Relationship To Main Refactor

This plan extends `docs/refactor/ui-data-source-architecture.md`.

The global source resolver should consume firmware/profile metadata when resolving:

- flight mode labels
- available fields
- parameter values and metadata
- mission source confidence
- control formula confidence

This avoids putting version checks directly inside UI panels.

