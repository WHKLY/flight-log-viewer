# Viewer Feedback: Flight Mode and Interaction

Date: 2026-08-23

## User Feedback

The first layered viewer is useful, but the next version needs stronger flight-mode-centered interaction and better chart inspection controls.

## Requirements

1. Flight mode is a first-class analysis dimension.

   The viewer must show both:

   - whole-flight information
   - per-flight-mode information

   `AUTO` is the most important mode for fixed-wing mission analysis, so the UI should make it easy to focus on AUTO segments.

2. Charts must support free zooming.

   Static canvas plots are not enough. The user needs to inspect small time ranges precisely.

3. Curves and panels need visibility controls.

   The viewer should allow:

   - hiding/showing individual curves
   - collapsing sections or panels
   - focusing on one control layer without losing overall context

4. The x-axis should show both time and flight mode.

   Absolute/log time is still needed, but flight mode segmentation is equally important. The preferred representation is one shared horizontal axis with:

   - numeric/log time scale
   - flight mode bands or labels aligned to time

5. Hover/click inspection is required.

   Moving the pointer or clicking a point should show precise values:

   - time
   - active flight mode
   - series name
   - exact value
   - possibly nearby values from other visible series

## Design Implications

- The next dashboard should keep the existing control-layer sections, but add a global flight-mode timeline above them.
- Each layer chart should share the same selected time range.
- Mode bands should appear behind or above charts, not replace the time axis.
- AUTO should be selectable as a quick filter/focus mode.
- The interaction model should be built before adding more charts, otherwise the UI will become hard to inspect.

## Suggested Implementation Direction

Do not hand-roll advanced interaction on raw Canvas long term. For the next version, consider either:

- a lightweight custom SVG/Canvas interaction layer for zoom, mode bands, and tooltips, or
- adding a proven plotting library such as Plotly.js or Apache ECharts.

For this project, Plotly.js is likely the fastest path because it already supports zoom, pan, legend toggles, hover, click, multiple axes, and synchronized relayout events.

## Next Technical Step

Before changing the viewer, improve generated data:

- Convert `MODE` log rows into mode segments with start/end times.
- Resolve mode numbers/names where possible.
- Generate `public-data/series/modes.json` or include mode segments in `manifest.json`.
- Add helper metadata for AUTO ranges.

Then update viewer interaction around this mode timeline.

## Correction: Mode Mapping

The sample log reports firmware text `ArduPlane V4.4.4 (16b78382)`. Local source inspection confirms Plane mode numbers include:

- `0`: `MANUAL`
- `2`: `STABILIZE`
- `5`: `FBWA` / `FLY_BY_WIRE_A`
- `10`: `AUTO`

Therefore this sample mode sequence should be interpreted as:

```text
760.769s  MANUAL
784.069s  STABILIZE
922.669s  AUTO
930.228s  STABILIZE
```

Earlier notes that described `ModeNum=2` as `FBWA` were incorrect.
