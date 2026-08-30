# Refactor v27: UI, Backend, and Global Source Architecture

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

Goal: start a new refactor branch for cleaner long-term development before adding more feature patches.

Current assessment:

- `viewer/index.html` is too large and mixes layout, state, source selection, chart drawing, Track/HUD rendering, camera behavior, and touch handling.
- Backend scripts work, but parser, normalizer, and viewer-export responsibilities are not clearly separated.
- Mission source, parameter source, waypoint display source, and current-task source use separate frontend logic; these should be unified under one global source registry and resolver.

Plan:

- Use branch `refactor/ui-data-source-architecture`.
- First write a detailed refactor document under `docs/refactor/` instead of changing runtime code.
- Preserve the current release behavior while introducing backend package modules, schema v2 generated data, and frontend ES modules in staged milestones.
- Treat manual source selection as first-class because tlog data can be incomplete after telemetry link loss.
- Keep missing-file compatibility as a hard requirement: `.BIN` only, `.waypoints` only, `.param` only, and incomplete `.tlog` should all still load useful partial views.

Detailed document: `docs/refactor/ui-data-source-architecture.md`.

