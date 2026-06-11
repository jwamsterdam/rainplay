# ADR: Recharts as Production Chart Dependency

## Status

Accepted with conditions.

## Context

Rainplay's chart is core product functionality. It combines sky and brightness
backgrounds, rain bars, an outdoor-score row, a millimeter y-axis, detailed time
labels, and iPhone-first responsive behavior.

The project preference is custom SVG/CSS unless a charting library is clearly
necessary. We attempted a custom CSS/SVG chart first, but responsiveness and
device compatibility became disproportionately difficult, especially for mobile
Safari/PWA behavior and combined axis/layer rendering.

The current implementation uses Recharts in `DayChartRecharts.tsx`. Vite splits
Recharts into a separate manual chunk. This improves isolation, but it still
adds meaningful production weight and vendor coupling.

## Decision

Recharts is accepted as a production dependency for the first Rainplay PWA
version.

This is a scoped infrastructure decision for the chart layer only. It does not
permit broader adoption of chart or UI libraries without a separate review.

## Rationale

Recharts is justified here because the chart is central to Rainplay's user
decision and because the custom implementation proved costly in areas that are
not the product's unique value: responsive chart layout, axes, mixed visual
series, label placement, and cross-device rendering.

Using Recharts lets the project focus on Rainplay's real domain problems:
weather normalization, outdoor scoring, best-time decisions, calm Dutch copy,
and reliable iPhone-first interaction.

The choice is acceptable because domain logic is not owned by Recharts. Scoring,
weather view-models, marker math, and chart helper logic should remain in pure
modules under `src/lib/` and `src/api/`, with tests.

## Consequences

Accepted costs:

- Additional production JavaScript from the Recharts chunk.
- Vendor coupling in the chart adapter/component layer.
- Possible Safari/WebKit rendering edge cases.
- Limited usefulness of jsdom for full chart-rendering verification.
- Future migration cost if Recharts assumptions leak through the app.

Accepted benefits:

- Faster path to a reliable combined weather decision chart.
- Less custom responsive axis and layout code.
- Lower risk of maintaining a homegrown chart engine too early.
- Better focus on user-facing decision logic and weather interpretation.

## Guardrails

- Keep Recharts isolated to chart rendering components and adapters.
- Do not expose Recharts types, props, or data assumptions from `src/api/`,
  `src/lib/`, `src/queries/`, `src/state/`, or screen-level domain logic.
- Keep chart math in pure helpers under `src/lib/`, covered by focused tests.
- Split large chart components by responsibility instead of letting one
  component own rendering, measurement, glyphs, markers, and domain decisions.
- Do not add another production chart or UI dependency without a separate
  architecture review.
- Track bundle impact when Recharts or chart features change.
- Verify important chart behavior on mobile Safari/PWA when browser compatibility
  is part of the risk.
- Keep fallback, empty, loading, and error states independent from Recharts
  internals.

## Exit Criteria

Reconsider Recharts and plan a migration if any of the following become true:

- Recharts causes repeated mobile Safari/PWA rendering issues that require
  fragile workarounds.
- The Recharts chunk becomes dominant in user-facing performance.
- Chart requirements stabilize enough that custom SVG/canvas primitives become
  simpler than maintaining vendor coupling.
- Recharts blocks accessibility, testing, or iPhone performance goals.
- Recharts assumptions spread outside the chart layer.
- New chart features increasingly require low-level measurement hacks rather
  than ordinary Recharts primitives.

## Follow-ups

- Keep `recharts` as a production dependency for now.
- Move build tooling dependencies to `devDependencies` separately.
- Split `DayChartRecharts.tsx` into smaller chart adapter modules.
- Add or preserve tests for chart data transformations, visibility toggles,
  empty states, disabled series, and marker contracts.
- Record relevant build output or bundle-size changes when chart dependencies
  are changed.
