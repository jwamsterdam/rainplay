# Architecture Principles

## Component boundaries
Split a component when:
- it owns multiple unrelated responsibilities;
- test setup becomes unnecessarily complex;
- a subpart is reused elsewhere;
- state ownership becomes unclear;
- rendering and data transformation are mixed heavily.

Do not split when:
- the component is still small and cohesive;
- the split creates prop-drilling without reuse;
- the new abstraction hides simple behavior;
- the separation is only aesthetic.

## State ownership
- Keep state at the lowest level that can still coordinate all consumers.
- Shared UI state should live in a parent hook/store, not in leaf visual components.
- Derived data should be computed close to where inputs are known.

## Dependencies
Before adding a library, check:
- can the existing stack solve this cleanly?
- is the library maintained?
- does it fit mobile/Safari/PWA constraints?
- does it increase bundle size or runtime cost significantly?
- is it accessible and testable?
- does it reduce complexity enough to justify adoption?

## API boundary validation
- Validate external API responses at the network boundary with Zod — never use `as Type` casts on `response.json()`.
- Schemas live in `src/api/schemas/`, separate from fetch and normalisation logic, so they are independently testable.
- Only validate at the boundary (Open-Meteo responses). Internal app types (`HourlyWeather`, `ForecastLocation`) do not need Zod — they never receive uncontrolled external input.
- Always wrap `ZodError` before it reaches the query layer. Callers and TanStack Query must receive a plain `Error` with a readable message, never a `ZodError` with internal path/issue structure.
- Derive TypeScript types from schemas with `z.infer<>` — never maintain a parallel handwritten `type` alongside a Zod schema.

## Clean code
- Prefer explicit names over clever compact code.
- Keep side effects isolated.
- Avoid broad rewrites.
- Prefer stable interfaces between components.