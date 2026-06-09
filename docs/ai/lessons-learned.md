# Lessons Learned

## Accepted lessons
These are binding project rules.

### 2026-06-08 - Keep chart state outside visual components
When adding chart interactions, keep visibility/filter state in a parent hook or store. Chart primitives should receive derived props and not own cross-widget state.

### 2026-06-09 - Derived domain logic belongs in lib/api, not in presentation components
Score formulas, best-window calculations, and other decision logic must live in `src/lib/` or `src/api/`, never recomputed inside chart or UI components. A component that re-derives a score creates a silent second source of truth that can diverge from the one driving hero copy and advice text. When a component needs a derived value, pass it as a prop or read it from the normalised data layer.

## Candidate lessons
These are proposals. Do not treat them as binding until accepted.

### Candidate - Prefer component tests for interactive chart toggles
Reason: checkbox-driven chart visibility is user-visible behavior and easy to regress.
Status: pending review.

### Candidate - Do not use SVG <defs> inside Recharts <Customized> sub-trees
SVG `<defs>` nested inside a `<g>` rendered by `<Customized>` is not guaranteed
to be in scope for `url(#id)` fill references — Safari/WebKit silently ignores
such gradient definitions, producing a white/empty fill. When a Recharts
`<Customized>` layer needs a gradient effect, simulate it with N thin
interpolated-colour `<rect>` elements instead (see `GradientBgLayer` in
`DayChartRecharts.tsx` and `interpolateRgba` in `src/lib/chart.ts`).
Status: pending review.

## Rejected or superseded lessons
Keep short notes here when an earlier lesson is no longer valid.