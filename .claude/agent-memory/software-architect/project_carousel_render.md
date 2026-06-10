---
name: project-carousel-render
description: All 4 day-chart panels are always mounted; perf depends on memoizing the heavy Recharts leaf, not on atom splitting
metadata:
  type: project
---

The DayCarousel keeps all 4 DayChartRecharts panels mounted at once (required so Recharts can measure each panel's width via CSS scroll-snap). The swipe indicator uses a ref + rAF loop in SegmentedControl, so swiping does NOT re-render React mid-scroll — the expensive work happens once on `scrollend` when `selectedDayAtom` flips and WeatherScreen re-renders.

**Why:** Because DayChartRecharts was NOT `React.memo`'d, a single day-flip (or a TanStack Query focus-refetch) reconciled all 4 heavy Recharts ComposedCharts even though no panel's `hours` actually changed (panel data depends on `hourly`/`horizon`, not selected day).

**How to apply:** For perf work in the chart/carousel area, reach for memoizing the render-heavy leaf (`React.memo` + memoizing `kindMap`/`scoreMap`/`tempDomain` derived props) before considering atom granularity or replacing Recharts. Jotai atoms are already correctly split. Do not propose replacing Recharts unless memoization fails on-device. Related: [[project-sky-gradient]], [[project-dual-score]].
