---
name: feedback_canvas_over_stacked_rects
description: For semi-transparent gradient/overlay fills in the chart, paint once on a <canvas> linear gradient instead of stacking many translucent SVG rects, which alpha-compounds into visible seams.
metadata:
  type: feedback
---

When rendering the chart's sky/brightness gradient (or any large translucent fill), paint it ONCE with `ctx.createLinearGradient` + `addColorStop` on a `<canvas>` positioned behind the Recharts SVG — do not stack many semi-transparent `<rect>`s.

**Why:** Stacking translucent rects with overlap (the old `makeGradientShape` used N_STEPS=20 rects with OVERHANG=0.5) causes alpha-compounding: 0.72-over-0.72 paints ~0.92 dark lines at every band boundary, producing visible vertical seams even in a uniform-colour region. A single gradient paint has no overlap, so no seams.

**How to apply:** Keep the colour math as a pure function in `src/lib/chart.ts` (`buildSkyGradientStops(hours, colors)` returns `{offset, color}[]`, collapsing identical-colour runs to the minimal stop set). Align the canvas to the plot area by capturing x/y/width/height from an invisible Recharts probe `<Bar shape={...}>` (don't hardcode margins), render at devicePixelRatio for retina crispness, and put the canvas behind the SVG via DOM order + a positioned wrapper with `z-index: 1` on the chart. Link: [[feedback_raf_over_state]] for the general "do the heavy visual work outside React state" theme.
