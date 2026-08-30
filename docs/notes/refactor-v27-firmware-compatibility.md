# Refactor v27: Firmware Compatibility

Date: 2026-08-30
Branch: `refactor/ui-data-source-architecture`

Decision:

- Firmware compatibility must be part of generated data and source resolution, not only a UI note.
- The parser trusts DataFlash `FMT` and raw log fields first.
- Versioned compatibility profiles should hold mode maps, parameter metadata, and formula metadata.
- Formula explanations need confidence states such as `source-matched`, `nearby-version`, `generic`, `field-missing`, and `unsupported`.
- Mission route source and current-task source remain manually selectable because tlog can be incomplete after link loss.
- Unknown firmware, missing fields, unknown parameters, and mode-map gaps should be non-fatal and visible in generated warnings.

Detailed document: `docs/refactor/firmware-compatibility-plan.md`.

