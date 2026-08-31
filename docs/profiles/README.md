# Firmware Compatibility Profiles

This document explains how to use and customize firmware compatibility profiles.

Profiles are intentionally separate from raw log parsing. DataFlash `.BIN` records are decoded from the log's own `FMT` messages. Profiles only describe how decoded fields should be interpreted.

## Location

Profile files live in:

```text
scripts/flv/profiles/
```

Current profiles:

- `ardupilot-generic`
- `ardupilot-plane-generic`
- `ardupilot-plane-4.5`
- `ardupilot-plane-4.7`

The profile loader is:

```text
scripts/flv/profiles.py
```

## Automatic Selection

The builder reads DataFlash `MSG` rows and detects firmware strings such as:

```text
ArduPlane V4.5.1 (91d4ca63)
```

Selection order:

1. Match vehicle, for example `Plane`.
2. Match version prefix from `version_match.prefixes`.
3. Use the most specific matching prefix.
4. Fall back to `ardupilot-plane-generic` for unsupported Plane versions.
5. Fall back to `ardupilot-generic` for unsupported vehicles.

Example:

```json
"version_match": {
  "vehicle": "Plane",
  "prefixes": ["4.5."]
}
```

This matches `ArduPlane V4.5.1`.

## Manual Override

Manual override is required when logs are incomplete, firmware is custom, or you want to inspect a log through another version-family model.

```bash
python3 scripts/flv_build.py \
  --dataset "data/26.8.26侦察/ZC_20260826_1533_flight2" \
  --output public-data \
  --profile ardupilot-plane-4.7
```

The generated `dataset.json` keeps both values:

- real detected firmware in `firmware`
- selected interpretation profile in `compatibility_profile`

Do not overwrite the detected firmware with the selected profile.

## What Profiles Control

Profiles can define:

- `mode_map`: numeric flight mode to display name
- `message_aliases`: message candidates for semantic groups
- `signal_roles`: preferred fields for semantic values
- `mission`: route/current-task source policy
- `parameters`: aliases, deprecated names and control parameter groups
- `control`: control-layer and formula interpretation metadata
- `capabilities`: features this profile claims to support

## What Profiles Do Not Control

Profiles do not decode DataFlash binary payloads. Binary decoding is handled by:

```text
scripts/flv/parsers/dataflash.py
```

That decoder uses `FMT` records from the log itself. If a field exists in one firmware version but not another, the decoded rows should reflect that without profile changes.

## Minimal Custom Profile

Create a file:

```text
scripts/flv/profiles/your-profile-id.json
```

Use this minimum shape:

```json
{
  "schema_version": 1,
  "id": "your-profile-id",
  "label": "Your Profile",
  "family": "ArduPilot",
  "vehicle": "Plane",
  "version_match": {
    "vehicle": "Plane",
    "prefixes": ["4.5."]
  },
  "mode_map": {
    "0": "MANUAL",
    "10": "AUTO"
  },
  "message_aliases": {},
  "signal_roles": {},
  "mission": {
    "manual_selection_required": true,
    "auto_selection_is_suggestion_only": true
  },
  "parameters": {
    "aliases": {},
    "deprecated": {},
    "control_prefixes": []
  },
  "control": {
    "formula_profile": "your-profile-id",
    "explanation_source": "custom",
    "confidence": "conceptual"
  },
  "capabilities": {
    "mode_mapping": true,
    "semantic_signal_roles": false,
    "control_formula_explanation": false
  }
}
```

## Signal Roles

`signal_roles` maps a semantic role to one or more candidate raw signals.

Example:

```json
"attitude.roll": ["ATT.Roll", "AHR2.Roll", "XKQ.Roll"]
```

The builder writes the reverse mapping to `signals.json`:

```json
"ATT.Roll": {
  "semantic_roles": ["attitude.roll"]
}
```

Rules:

- Use raw decoded message and field names.
- Put the preferred signal first.
- Include fallback fields only when they are semantically equivalent enough for the panel using them.
- Do not use signal roles to hide uncertainty about units or sign convention.

## Mission Policy

Mission profiles should keep route and current-task source selection manual-first.

Reason: tlog can be incomplete after ground-station link loss, while DataFlash `CMD` can reflect onboard accepted mission items. External `.waypoints` can reflect the planned route but not necessarily the final accepted onboard route.

Recommended shape:

```json
"mission": {
  "route_sources": ["dataflash_cmd", "external_waypoints", "tlog_mission"],
  "current_task_sources": ["dataflash_cmd", "tlog_mission"],
  "dataflash_route_message": "CMD",
  "dataflash_current_event_message": "CMD",
  "manual_selection_required": true,
  "auto_selection_is_suggestion_only": true
}
```

## Parameters

Use `parameters.aliases` only for verified renames.

Use `parameters.deprecated` only when the old parameter is known to be removed or replaced in that firmware family.

Use `parameters.control_prefixes` to help panels find control-related parameters, but do not treat prefix matching as a complete formula dependency list.

## Capabilities

Capabilities should be conservative.

Set `control_formula_explanation` to `true` only after the profile has source-backed formula metadata for the analysis panels that use it.

Valid capability examples:

- `mode_mapping`
- `mission_cmd_route`
- `mission_route_versions`
- `tlog_mission_route`
- `dataflash_parameters`
- `parameter_timeline`
- `semantic_signal_roles`
- `control_formula_explanation`

## Validation

After adding or editing a profile, run:

```bash
python3 scripts/flv_build.py \
  --dataset "data/26.8.26侦察/ZC_20260826_1533_flight2" \
  --output public-data
```

Confirm the selected profile:

```bash
python3 -c "import json; p=json.load(open('public-data/dataset.json')); print(p['firmware']); print(p['compatibility_profile']['id'], p['compatibility_profile']['selection'])"
```

Run smoke checks:

```bash
python3 -m py_compile scripts/flv_build.py scripts/flv/builder.py scripts/flv/profiles.py
node scripts/check_frontend_data.mjs public-data
node scripts/check_state_layer.mjs public-data
git diff --check
```

## Interpretation Rule

Treat profile output as exact only when:

- firmware detection matched the profile automatically, or the user deliberately selected it
- the panel declares support for the profile capability
- the required raw fields exist in the log
- the profile contains source-backed mapping or formula metadata for that panel

Otherwise display the result as conceptual, inferred or unavailable.
