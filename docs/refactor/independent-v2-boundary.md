# Independent V2 Boundary

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

## Decision

The refactored version should be independent from the previous viewer implementation.

The current Phase 1 started as a conservative refactor: old CLI scripts remain active and delegate selected parser logic to new `scripts/flv/` modules. That is safe for behavior preservation, but it is not a fully independent v2 architecture.

Going forward, the refactor should use a parallel v2 path:

- New backend entrypoint: `scripts/flv_build.py`
- New backend package: `scripts/flv/`
- New generated data root: `public-data-v2/` or selectable output directory
- New viewer shell: `viewer-v2/index.html` or `viewer/v2/index.html`
- Old viewer and old scripts remain available only for comparison and fallback.

## Independence Rules

V2 code must not depend on old runtime implementation:

- V2 backend should not import `summarize_dataset.py`, `extract_dataflash_series.py`, `build_mission_sources.py`, or `inspect_logs.py`.
- V2 frontend should not depend on functions inside old `viewer/index.html`.
- V2 generated schema should not require legacy `dataset-summary.json` or legacy `series/*.json`.
- V2 can read the same raw input files, but it should build its own source registry, signal catalog, domains, and compatibility metadata.

Allowed temporary relationship:

- Old scripts may import new parser modules while they remain supported.
- Test tools may compare v1 and v2 outputs.
- Documentation may reference old behavior as expected baseline.

## Directory Boundary

Recommended split:

```text
scripts/
  summarize_dataset.py          v1 legacy CLI
  extract_dataflash_series.py    v1 legacy CLI
  build_mission_sources.py       v1 legacy CLI
  inspect_logs.py                v1 helper
  flv_build.py                   v2 CLI
  flv/                           v2 implementation package

viewer/
  index.html                     v1 legacy viewer
  js/track-camera.js             shared only if explicitly made version-neutral
  js/track-hud.js                v1-era module unless moved/copied into v2

viewer-v2/
  index.html                     v2 viewer shell
  css/
  js/

public-data/
  legacy generated output

public-data-v2/
  v2 generated output
```

Alternative:

```text
viewer/v1/
viewer/v2/
```

This is cleaner long term, but requires moving the existing viewer path and updating README/server instructions. The lower-risk option is `viewer-v2/` first.

## Build Boundary

V2 build should run as:

```bash
python3 scripts/flv_build.py --dataset <raw-dataset-dir> --output public-data-v2
```

It should generate:

```text
public-data-v2/dataset.json
public-data-v2/sources.json
public-data-v2/signals.json
public-data-v2/domains/modes.json
public-data-v2/domains/mission.json
public-data-v2/domains/parameters.json
public-data-v2/domains/track.json
public-data-v2/domains/control.json
```

The v2 viewer should load only `public-data-v2/`.

## Migration Impact

This changes the roadmap:

- Do not spend effort making old `index.html` modular unless it is needed as a reference.
- Do not gradually migrate the old viewer into modules as the main path.
- Build v2 in parallel and use v1 for comparison.
- Once v2 reaches parity, v1 can be archived or removed.

The main benefit is architectural cleanliness. The cost is that some UI pieces may need to be copied or reimplemented instead of moved directly.

## Recommended Implementation Route

1. Keep the current commits as planning and early parser extraction.
2. Add `scripts/flv_build.py` as the first true v2 entrypoint.
3. Generate v2 schema independently into `public-data-v2/`.
4. Add `viewer-v2/index.html` as a minimal shell.
5. Implement v2 source resolver and Track-first layout against v2 schema.
6. Use v1 only for visual/behavior comparison.
7. Stop modifying v1 except for critical bug fixes.

## Acceptance Criteria

The refactor version counts as independent when:

- `python3 scripts/flv_build.py` can generate v2 output without running old CLI scripts.
- `viewer-v2/index.html` can load v2 output without loading old `viewer/index.html`.
- Mission, parameter, track, HUD, and inspector source decisions all come from v2 source resolver.
- Deleting generated `public-data/` does not break v2 if `public-data-v2/` exists.
- Deleting `public-data-v2/` does not affect v1.

