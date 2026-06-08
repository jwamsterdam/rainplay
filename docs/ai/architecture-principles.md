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

## Clean code
- Prefer explicit names over clever compact code.
- Keep side effects isolated.
- Avoid broad rewrites.
- Prefer stable interfaces between components.