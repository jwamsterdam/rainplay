# Lessons Learned

## Accepted lessons
These are binding project rules.

### 2026-06-08 - Keep chart state outside visual components
When adding chart interactions, keep visibility/filter state in a parent hook or store. Chart primitives should receive derived props and not own cross-widget state.

### 2026-06-09 - Derived domain logic belongs in lib/api, not in presentation components
Score formulas, best-window calculations, and other decision logic must live in `src/lib/` or `src/api/`, never recomputed inside chart or UI components. A component that re-derives a score creates a silent second source of truth that can diverge from the one driving hero copy and advice text. When a component needs a derived value, pass it as a prop or read it from the normalised data layer.

### 2026-06-13 - iOS 26 PWA screen fill: pin with `position: fixed; inset: 0`, never a height unit
On an iOS 26 standalone PWA, **no height reference is reliable at cold launch** — `vh/svh/dvh/lvh`, CSS `%`, and JS `innerHeight/visualViewport` all read the full physical height (852 on iPhone 15) at first paint and only settle to the usable height (793) after an untriggerable geometry event; the same unit even differs between launches. Any layout sized by a height value flickers between a bottom white bar (content too short) and a clipped attribution (content too tall), 59 px (= `safe-area-inset-top`) apart. This cost ~8 flip-flop iterations.
**Rule:** fill the screen by pinning the content shell with `position: fixed; inset: 0` (no height unit — it tracks 793↔852 instead of fighting it), put the sky on a separate fixed full-screen background (`html` with `background-attachment: fixed`) so it can never clip content, and apply `env(safe-area-inset-*)` **per element** (hero/gear top, decision-sheet bottom) since the fixed shell does not inherit `html` padding. Keep the desktop `@media (min-width: 720px)` override returning `.app-shell` to `position: relative`. The decisive clue was that the settings overlay (already `position: fixed; inset: 0`) always rendered correctly while the height-unit homepage did not. **Never reproduce-and-judge in desktop Chrome** — it hits the device-frame media query and cannot show the bug; use the shipped Settings → "Diagnostiek" cold-launch capture on a real iPhone. Full writeup, including every failed attempt and why: [`docs/architecture/ios-viewport-fill.md`](../architecture/ios-viewport-fill.md).

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

### Candidate - Zod schemas belong at the network boundary, not on internal types
Use Zod only where uncontrolled external data enters the app (`response.json()` in `src/api/`). Internal types derived from that data are already safe and do not benefit from Zod schemas — adding them there creates noise without safety gain. Always catch `ZodError` immediately after `.parse()` and re-throw a plain `Error` with a readable message so the query layer and UI never see Zod internals. Derive TypeScript types with `z.infer<>` to avoid maintaining a parallel handwritten type alongside the schema.
Status: pending review.

### Candidate - Recharts `<Customized>` component props must be memoized
`<Customized component={makeFoo(args)}>` creates a new function reference on every render. Recharts treats a changed `component` prop as a new element and re-mounts the layer. Wrap factory calls in `useMemo` so the reference is stable: `const FooLayer = useMemo(() => makeFoo(args), [args])`. This applies to every `<Customized>` usage, including border layers and the "nu" marker.
Status: pending review.

### Candidate - Do not use SVG <defs> inside Recharts <Customized> sub-trees
SVG `<defs>` nested inside a `<g>` rendered by `<Customized>` is not guaranteed
to be in scope for `url(#id)` fill references — Safari/WebKit silently ignores
such gradient definitions, producing a white/empty fill. When a Recharts
`<Customized>` layer needs a gradient effect, simulate it with N thin
interpolated-colour `<rect>` elements instead (see `GradientBgLayer` in
`DayChartRecharts.tsx` and `interpolateRgba` in `src/lib/chart.ts`).
Status: pending review.

### Candidate - Chart/marker decision logic must be pure, clock-injected, and unit-tested in src/lib
The "nu" marker silently disappeared on the +2/+6 uur Vandaag charts because its
position logic (`nowLineX`) lived inside the presentational chart component and
read the clock directly. It returned null whenever `now` fell outside
`[firstPoint, lastPoint]` — which is exactly the normal case for a window that
starts at the first :00/:30 at/after now. Embedded in the component, that edge
was untestable in jsdom (Recharts/canvas) and shipped unguarded.
Rule: any chart decision logic that depends on time or on point geometry
(marker position, best-window, band math) must be a pure function in `src/lib/`
with `now: Date` injected (never `new Date()` inside), returning a presentation-
agnostic value (e.g. a [0,1] fraction). The component only projects that value
to pixels. Then the clamp/band-centre/off-by-one behaviour is unit-tested at the
right altitude (see `src/lib/nowMarker.ts` + `nowMarker.test.ts`), and an
integration-seam test proves the producing function yields a renderable result
for every horizon without fighting the chart in jsdom
(`src/lib/weatherView.todayHorizon.test.ts`). Watch the clamp boundary: with the
band-centre model a `now` less than half a band before the first point is a small
positive interior fraction, not a hard 0 — assert the renderable contract
(non-null, in range), not an over-specified exact 0.
Status: pending review.

## Rejected or superseded lessons
Keep short notes here when an earlier lesson is no longer valid.