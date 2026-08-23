# Mode-aware interactive viewer

Date: 2026-08-23

## Implemented

- The DataFlash extractor now writes `public-data/series/modes.json` from the log's `MODE` and `MSG` records.
- Mode numbers are mapped with the Plane default mode table. Unknown values remain visible as `MODE_<number>` instead of being silently mislabelled.
- The generated manifest records compatibility context: log firmware, schema source, mode-map source, and explanation source.
- The viewer uses a shared time window across time-series charts.
- Time-series charts show absolute time on the bottom axis and flight-mode bands on the top axis.
- Mode buttons focus the full flight, `MANUAL`, `STABILIZE`, or `AUTO` ranges found in the actual log.
- Each time-series chart supports shared-time mouse wheel zoom, shared-time drag pan, checkbox-based curve visibility, hover readout, click-to-lock readout, and double-click unlock.
- Time-series vertical scale is chart-local state. Shared time-axis zoom/pan filters the visible samples but does not automatically rescale the Y axis.
- `Shift + wheel`, `Y +`, `Y -`, `Y ↑`, `Y ↓`, left-axis drag, and `Reset Y` control each time-series chart's vertical scale and vertical position.
- Layers can be collapsed to keep the dashboard usable on a tablet screen.
- The track panel is filtered by the same time window so mode focus changes the visible flight-path segment.
- The track panel uses an equal-scale local-meter projection for latitude/longitude geometry, filters invalid or far-off waypoint coordinates, and has independent map pan, map zoom, and `Reset map`.

## Current sample

- Log firmware: `ArduPlane V4.4.4 (16b78382)`.
- Analysis explanation references: Plane 4.7 docs plus local ArduPilot source `master` at `381357f8`.
- Decoding strategy: use DataFlash `FMT` records from the log itself, not hard-coded message layouts.
- Mode sequence in the current sample: `MANUAL -> STABILIZE -> AUTO -> STABILIZE`.
- Current AUTO segment: about `922.669s` to `930.228s`.

## Compatibility rule

The viewer must separate three versions:

- Log firmware version: what actually flew and produced the data.
- Documentation version: what we use for conceptual explanation.
- Local source checkout: what we use for source-level tracing.

When they differ, data parsing should trust the log's own `FMT` schema first. Control interpretation should show its source/version and avoid pretending that a newer source checkout exactly describes an older flown firmware.

## Next direction

The next useful step is the parameter-analysis layer: read `param`, map key parameters to L1, TECS, attitude/rate, and I/O layers, then display relevant parameter values beside the chart where their effects are interpreted.

A later UI refinement should add explicit touch gestures for Y-axis scaling on tablets, because `Shift + wheel` is convenient on desktop but not ideal for touch-only use.
