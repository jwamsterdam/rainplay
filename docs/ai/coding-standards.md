# Coding Standards

These standards define how Rainplay code should be written, reviewed, and
evolved. They are intentionally practical: code should be simple to read,
safe to change, and resilient as the app grows from prototype to real PWA.

## Core principles

- Optimize for correctness, clarity, and small safe changes before cleverness.
- Make code read from intent to detail: names should explain what the code is
  for, not just what it mechanically does.
- Keep domain logic independent from presentation and framework details.
- Prefer explicit data shapes and pure functions at boundaries where behavior
  matters.
- Treat every abstraction as a cost. Add one only when it removes real
  duplication, clarifies ownership, or protects a stable boundary.
- Preserve the product direction: iPhone-first, calm, fast, Dutch, and focused
  on outdoor decisions rather than meteorological completeness.

## File and module boundaries

- `src/api/` owns external service integration, request construction, response
  validation, and normalization into app-specific types.
- `src/lib/` owns pure domain logic such as scoring, best-window selection,
  chart math, time-window calculations, and formatting helpers that are not
  React-specific.
- `src/queries/` owns TanStack Query hooks and query-key design. It should not
  contain fetch implementation details beyond calling `src/api/`.
- `src/state/` owns Jotai atoms and store setup for client/UI state.
- `src/providers/` owns app-wide provider wiring and stable provider instances.
- `src/screens/` owns screen composition and high-level user flows.
- `src/components/` owns reusable or screen-local UI components. Components may
  coordinate UI behavior, but must not duplicate domain decisions already owned
  by `src/lib/` or `src/api/`.
- `src/design/` owns design tokens and low-level styling primitives.

When adding a file, choose the layer by responsibility, not by convenience. If a
function is hard to place, that is usually a signal to clarify its inputs,
outputs, or ownership before writing more code.

## Naming

- Use names that encode business meaning: `outdoorScore`, `bestWindow`,
  `precipitationMm`, `apparentTemperatureC`, `windGustKmh`.
- Include units in names for measured values where confusion is plausible:
  `rainMm`, `durationMinutes`, `windSpeedKmh`, `radiationWm2`.
- Avoid vague names such as `data`, `item`, `info`, `value`, or `result` outside
  very small local scopes.
- Avoid abbreviations unless they are common in the domain or API.
- Name booleans as predicates: `isDaylight`, `hasRain`, `canUseGeolocation`.
- Name event handlers after user intent where possible: `handleSelectDay`,
  `handleRetryForecast`.

## TypeScript

- Keep `strict` TypeScript clean. Do not silence type errors with `any`,
  non-null assertions, or broad casts unless the boundary has been checked and
  the reason is documented locally.
- Prefer exact domain types over loose records. Convert external API shapes into
  app-owned types before they reach UI components.
- Use discriminated unions for state that has distinct modes such as loading,
  denied, unavailable, success, or error.
- Keep public function parameters and return values explicit when they are part
  of a module boundary.
- Prefer `unknown` over `any` for untrusted input, then narrow it deliberately.
- Avoid exporting types or functions until another module genuinely needs them.
- Keep nullable values close to the boundary. Normalize missing data into a
  clear fallback, optional field, or explicit state before rendering.

## Functions and domain logic

- Functions should do one coherent thing at one level of abstraction.
- Prefer pure functions for scoring, weather normalization, chart geometry, and
  time-window decisions.
- Inject time into domain logic with a `Date` parameter instead of calling
  `new Date()` inside logic that needs tests.
- Keep formulas named and decomposed enough that a reviewer can understand the
  trade-offs without reverse-engineering arithmetic.
- Do not duplicate decision logic in components. If hero advice, chart markers,
  and summary text depend on the same concept, derive it once in `src/lib/` or
  `src/api/`.
- Make edge cases visible in code: empty hourly ranges, night hours, missing
  probability, bad coordinates, network timeout, and out-of-range forecast
  windows.

## React components

- Components should primarily render data and coordinate local interaction.
- Keep visual components controlled where cross-widget state is involved. Shared
  UI state belongs in a parent hook, Jotai atom, or screen-level composition.
- Do not put server state in component-local state when TanStack Query should own
  it.
- Keep effects small and tied to external systems such as browser APIs,
  subscriptions, timers, or imperative DOM behavior.
- Avoid effects for values that can be derived during render.
- Keep accessibility part of the component contract: meaningful labels,
  keyboard-reachable controls, visible focus, and semantic HTML first.
- Prefer stable, boring component props over highly configurable prop bags.
- Split components when responsibilities, test setup, or state ownership become
  unclear. Do not split only to make files look symmetrical.
- Keep components short enough to understand in one pass. As a guideline, a
  component that grows beyond roughly 150-200 lines should trigger a design
  check: is it mixing layout, state coordination, domain decisions, data
  transformation, and rendering details?
- Prefer extracting cohesive subcomponents, pure helper functions, or custom
  hooks over letting a component become a vertical slice of the whole feature.
- Split by responsibility, not by arbitrary line count. Good split candidates
  are repeated UI regions, independently testable interactions, expensive or
  tricky rendering, browser-effect ownership, and domain-free formatting.
- Avoid hiding complexity by moving tangled code into a child with the same
  broad responsibility. A split is useful only when the new boundary has a clear
  name, clear inputs, and less reason to change.

## State and data fetching

- TanStack Query owns weather/geocoding server state, caching, retries, and
  request lifecycles.
- Jotai owns client/UI state such as selected day, horizon, location choice,
  debug toggles, and presentation preferences.
- Query keys must include every input that changes the fetched data.
- Keep fetchers abortable or timeout-bounded where mobile network behavior can
  otherwise hang the UI.
- Normalize API responses before the UI reads them. Components should not know
  Open-Meteo field names unless they are explicitly rendering raw diagnostics.
- Preserve useful error information for UI copy and debugging, but keep user
  messages calm and actionable.

## Styling and UI code

- Use design tokens from `src/design/tokens.css` for repeated color, spacing,
  radius, shadow, and typography decisions.
- Keep CSS class names semantic and stable. Avoid names based only on current
  visual appearance when the element has a clear role.
- Prefer CSS and SVG primitives over heavy UI libraries for the first version.
- Design for iPhone Safari first: safe areas, touch targets, viewport height
  quirks, reduced motion, and readable type.
- Avoid layout that depends on exact text length. Dutch copy must fit on narrow
  screens without overlap.
- Keep visual density calm. Rainplay should feel like a decision aid, not an
  operations dashboard.

## Charts and visualizations

- Chart code must separate data preparation, geometry decisions, and rendering.
- Chart math belongs in pure helpers with focused tests.
- Components may project normalized chart data to SVG, canvas, or library
  primitives, but must not reimplement weather scoring or best-window logic.
- Avoid pixel-perfect unit tests. Test transformation contracts, visibility,
  empty states, disabled series, tooltip content, and edge cases.
- Any production chart dependency requires an explicit architecture decision
  covering why custom SVG/CSS is insufficient, bundle impact, mobile Safari/PWA
  behavior, accessibility, and testability.

## Dependencies

- Do not add a production dependency until existing platform APIs and current
  project utilities have been considered.
- New dependencies must be maintained, typed, accessible where relevant, and
  compatible with mobile Safari/PWA constraints.
- Consider bundle size and runtime behavior before adding or expanding a
  dependency in the user-facing path.
- Build tooling, test tooling, and type packages belong in `devDependencies`.
- If a dependency is temporary, document the exit criteria or migration path.

## Error handling

- Handle expected failures explicitly: denied geolocation, unavailable
  geolocation, failed forecast fetches, empty search results, malformed API data,
  and offline or slow network states.
- Do not let low-level errors leak directly into user-facing copy.
- Prefer recoverable UI states with retry paths over hard failures.
- Preserve enough technical detail at boundaries for debugging and tests.

## Comments and documentation

- Write code that usually does not need comments.
- Add comments for non-obvious domain choices, browser quirks, formula tuning,
  and dependency trade-offs.
- Do not comment obvious mechanics.
- Keep documentation close to decisions that future reviewers will question.
- When a recurring issue is discovered, propose a lesson in
  `docs/ai/lessons-learned.md` under "Candidate lessons"; do not promote it to
  accepted without explicit approval.

## Testing expectations

- Every meaningful domain helper should have behavior-oriented tests.
- New logic that affects advice, scores, chart visibility, geolocation, or API
  normalization needs tests unless the change is purely cosmetic.
- Prefer tests that describe user-visible behavior or stable data contracts.
- Mock at system boundaries: network, browser APIs, timers, storage, and
  animation frames.
- Do not weaken tests to fit an implementation. If a test is wrong, explain the
  corrected behavior in the change.
- Run the relevant project commands before calling a change done and report
  exactly what was run.

## Change discipline

- Keep diffs focused on the requested behavior.
- Avoid broad rewrites, formatting churn, or opportunistic refactors.
- When touching code with nearby issues, fix only what is needed unless the
  issue directly affects the requested change.
- Preserve user or teammate edits already present in the worktree.
- Prefer one clear improvement over several half-finished improvements.
- A change is complete only when architecture, implementation, and tests all
  agree on the same behavior.
