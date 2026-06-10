# Lessons Learned

## Accepted lessons
These are binding project rules.

### 2026-06-08 - Keep chart state outside visual components
When adding chart interactions, keep visibility/filter state in a parent hook or store. Chart primitives should receive derived props and not own cross-widget state.

### 2026-06-09 - Derived domain logic belongs in lib/api, not in presentation components
Score formulas, best-window calculations, and other decision logic must live in `src/lib/` or `src/api/`, never recomputed inside chart or UI components. A component that re-derives a score creates a silent second source of truth that can diverge from the one driving hero copy and advice text. When a component needs a derived value, pass it as a prop or read it from the normalised data layer.

## Candidate lessons
These are proposals. Do not treat them as binding until accepted.

### Candidate - jsdom scrollend / scrollTo mocking pattern (Vitest + jsdom v29)
`"onscrollend" in window` evalueert naar `true` in Vitest's jsdom-omgeving (v29+). Componenten die op deze vlag branchen gebruiken daardoor `addEventListener("scrollend", ...)` in tests — niet het debounced scroll-fallbackpad. Test files moeten:
1. `new Event("scrollend")` dispatchen — niet `"scroll"` — om het scroll→atom-pad te triggeren.
2. `el.scrollTo = vi.fn()` stubbben op de container vóór een atom-wijziging, want jsdom-div-elementen implementeren `scrollTo` niet.
3. Mount-time `setTimeout(0)`-guards flushen met `act(() => { vi.runAllTimers(); })` vóór gesimuleerde user-swipes, anders staat `isScrollingProgrammatically` nog op `true` en no-opt de handler.
Status: pending review.

### Candidate - Perpetual RAF loops vereisen een manual spy-patroon in Vitest
Wanneer een React-component een zichzelf-herplanende `requestAnimationFrame`-loop draait (bewaakt door een `running` ref), treedt met `vi.useFakeTimers()` + `vi.runAllTimers()` de Vitest infinite-loop guard op (10 000 timers). Het juiste patroon: mock `window.requestAnimationFrame` handmatig zodat callbacks in een queue terechtkomen, en flush exact één generatie per keer met een `flushRaf()`-helper die de queue splicet en elke callback eenmaal aanroept. `vi.runAllTicks()` werkt niet omdat RAF-callbacks macro-tasks zijn, geen microtasks. Zie `src/components/SegmentedControl.test.tsx` (RAF indicator transform describe-blok) voor de referentie-implementatie.
Status: pending review.

### Candidate - CSS scroll-snap: scroll-snap-stop: always verplicht op iOS
Zonder `scroll-snap-stop: always` op de carousel-panelen kan iOS bij een snelle swipe meerdere panelen overslaan. `scroll-snap-stop: always` beperkt elke swipe tot maximaal één panel. Dit is niet zichtbaar in de desktop browser-simulator — testen op een echte iPhone is verplicht voor scroll-snap carousels.
Status: pending review.

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