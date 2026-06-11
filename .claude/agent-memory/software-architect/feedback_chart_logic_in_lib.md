---
name: feedback-chart-logic-in-lib
description: Chart decision helpers that return null on out-of-range must be pure, clock-injected, unit-tested, and live in src/lib — not inside the chart component
metadata:
  type: feedback
---

Pure, branch-heavy chart/decision helpers (now-marker position, horizon windows) must live in `src/lib/`, be clock-injected (pass `nowMin`, don't call `new Date()` inside), and be unit-tested — never embedded in the presentational chart component.

**Why:** The "nu" marker (`nowLineX` in DayChartRecharts.tsx) had two data-dependent `return null` branches and zero tests; combined with a comment/impl drift in `niceStartIndex` (weatherView.ts — comment says "round down", code rounds up), the marker silently vanished on the +2/+6 uur Vandaag charts. `weatherView.ts` had no tests at all. This repeats the project's own accepted lesson "Derived domain logic belongs in lib/api, not presentation components" — it keeps getting violated for chart-internal helpers specifically.

**How to apply:** when reviewing chart work, flag any helper that (a) lives inside a chart component, (b) reads the clock internally, or (c) returns null on out-of-range without a unit test for each null branch. Prefer a pure fraction [0,1] contract that the component projects to pixels against the measured plot rect, so the math is jsdom-testable. Related: [[project_carousel_render]].
