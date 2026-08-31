# Refactor V33 - Sidebar Import Bugfix

Date: 2026-08-31

## Problem

The browser stopped at `Loading UI config...` because `viewer/js/ui/render.mjs` imported `missionSources` from `viewer/js/data/mission.mjs`.

`missionSources` is exported by `viewer/js/data/sources.mjs`, not `mission.mjs`.

Browser error:

```text
Uncaught SyntaxError: The requested module '../data/mission.mjs' does not provide an export named 'missionSources'
```

## Fix

Split the import:

- `currentTaskSourceOptions` and `missionSourceOptions` from `data/mission.mjs`
- `missionSources`, `selectionReadout` and `sourceRegistryList` from `data/sources.mjs`

## Validation

- `node --check viewer/js/ui/render.mjs`
- `node --check viewer/js/app.js`
- `node scripts/check_frontend_data.mjs public-data`
- `git diff --check`
