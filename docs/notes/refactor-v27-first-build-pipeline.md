# Refactor v27: First Build Pipeline

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

Implemented direction:

- Recreated backend from the clean zero point using normal paths, without `v2` suffixes.
- Added one build entrypoint: `scripts/flv_build.py`.
- Added a new `scripts/flv/` package organized around input discovery, raw parsers, normalization, and export.
- Generated schema writes to `public-data/` or a caller-selected output directory.
- The first schema includes `dataset.json`, `sources.json`, `signals.json`, `domains/*.json`, and `series/*.json`.

Important finding:

- The current flight2 log reports `ArduPlane V4.5.1 (91d4ca63)` from DataFlash `MSG`.
- Earlier documentation mentioning 4.4.4 should be treated as stale for this specific flight2 log unless another dataset proves otherwise.

Design correction:

- Mission-domain source IDs must also appear in global `sources.json`; domain-local source IDs without registry entries are not acceptable.

