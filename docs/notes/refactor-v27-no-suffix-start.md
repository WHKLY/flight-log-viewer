# Refactor v27: No-Suffix Implementation Start

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

Decision:

- Use normal project paths for the new implementation: `scripts/`, `viewer/`, and `public-data/`.
- Do not create `viewer-v2/` or `public-data-v2/`.
- The old frontend/backend implementation is available only through git history.
- Start with the new backend package and one build entrypoint: `scripts/flv_build.py`.

