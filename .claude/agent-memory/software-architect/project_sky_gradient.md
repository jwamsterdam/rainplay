---
name: project-sky-gradient
description: Architectural decision to render the chart sky gradient via a single offscreen canvas, not stacked translucent SVG rects
metadata:
  type: project
---

The per-hour "sky/brightness" gradient behind the Recharts day chart (`src/components/DayChartRecharts.tsx`) should be rendered as a single offscreen `<canvas>` (`createLinearGradient` + `addColorStop`, DPR-scaled, layered behind the SVG), with stop computation extracted to `src/lib/chart.ts`. The earlier N-stacked-semi-transparent-`<rect>` approach (N_STEPS / OVERHANG / per-rect `interpolateRgba`) was abandoned because it produced visible vertical seams.

**Why:** Stacking translucent `<rect>`s compounds alpha at every shared/overlapping edge (`0.72 over 0.72 ≈ 0.92`), painting dark vertical lines at every band boundary — visible even in the uniform night region where there is no gradient. The OVERHANG=0.5 hack made it worse (guaranteed overlap = guaranteed dark seam). Canvas composites the whole gradient in one premultiplied-alpha pass, so seams are eliminated by construction. Canvas is a native API — no new dependency, satisfies the project dependency policy.

**How to apply:** Don't re-propose tuning the rect-stepping/antialiasing approach. This is distinct from (and complements) the accepted "no SVG `<defs>` inside Recharts `<Customized>`" lesson — canvas is a separate surface not subject to that Safari `url(#id)` scoping bug. The main implementation risk is aligning the canvas with the Recharts plot area (x-axis bands + "nu" reference line); source geometry from Recharts (shape callback) rather than hardcoding margins. Verify seam-free result on a real iPhone, not the desktop simulator. See [[dual-score-divergence]] for the related lib-vs-presentation derived-logic boundary.
