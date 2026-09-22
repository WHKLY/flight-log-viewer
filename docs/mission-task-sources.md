# Mission Task Sources

The viewer must separate flight-mode authority from mission-task identity. `AUTO` means the aircraft is under mission control, but it does not by itself identify the active waypoint or mission command.

## Source Types

- `external_wp`: mission items parsed from the external Mission Planner/QGC `.waypoints` file. This is useful for planned-route comparison, but it may be stale when an onboard computer rewrites the mission in flight.
- `onboard_cmd`: the accepted onboard route is reconstructed from DataFlash `CMD` records. On newer firmware, runtime current-item changes come from `MISE`; older logs without `MISE` keep the legacy `CMD` event fallback. Keeping route definition and execution events separate prevents a startup route snapshot from being mistaken for a sequence of task transitions.
- `tlog_mission`: reserved for MAVLink `.tlog` mission reconstruction from `MISSION_ITEM_INT`/`MISSION_ITEM` plus current-item history from `MISSION_CURRENT`/`MISSION_ITEM_REACHED`. This can be incomplete when the ground station link drops.

## Selection Priority

Runtime display should resolve the current mission task by this priority:

```text
manual_override > user_selected_source > auto_suggested_source > missing
```

Automatic selection is only a suggestion. It must never hide a user-selected source or a time-range override.

## Override File

Persistent manual choices are stored in:

```text
project-data/mission-overrides.json
```

The file is ignored by git so reviewer decisions survive regenerated `public-data/` without being committed accidentally. Start from `project-data/mission-overrides.example.json`.

A rule has this shape:

```json
{
  "start_s": 120.0,
  "end_s": 350.0,
  "source_id": "onboard_cmd",
  "seq": 4,
  "label": "GCS link lost; trust onboard CMD"
}
```

`seq` may be `null` when only route-source selection is being overridden.

## Generated Model

`python3 scripts/build_mission_sources.py` writes:

```text
public-data/series/mission-sources.json
```

That generated file contains schema version, selection policy notes, and all available mission source candidates. It is ignored with other generated `public-data/series/` files.
