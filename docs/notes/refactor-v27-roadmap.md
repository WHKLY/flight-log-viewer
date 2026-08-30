# Refactor v27: Roadmap

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

Decision:

- Refactor should proceed in small phase commits, not one large rewrite.
- First implementation phase should be backend package skeleton, not UI redesign.
- Existing CLI outputs should remain compatible while parser modules are extracted.
- Schema v2 should be generated beside legacy JSON before the frontend switches to it.
- Frontend should then migrate source resolution into `viewer/js/data/`.
- Track/HUD/Inspector/UI redesign should happen only after source resolution is centralized.

Detailed roadmap: `docs/refactor/refactor-roadmap.md`.

