# Testing Conventions

## General
- Test behavior, not implementation details.
- Prefer tests that fail for real user-visible regressions.
- Keep tests readable; a future developer should understand the scenario quickly.
- Do not delete or weaken tests without explaining why the previous assertion was wrong.

## React components
- Test visible output and user interaction.
- Prefer accessible queries where possible.
- Test loading, empty, error, and success states when relevant.
- For checkbox/toggle-driven UI, verify both initial state and changed state.

## Hooks and state
- Test pure state transitions separately when logic is complex.
- Keep async effects isolated and mock network boundaries, not internal functions.

## Charts and visual UI
- Do not assert pixel-perfect chart output unless using a visual regression tool.
- Test data transformation, legend/checkbox visibility, tooltip content, empty data, and disabled series behavior.
- For responsive behavior, test container state and fallback behavior rather than exact browser layout unless using E2E/visual tests.

## Mocks
- Mock at the boundary: network, browser APIs, timers, storage.
- Avoid over-mocking the component under test.

## Required commands
Use the project’s package manager. Typical commands:
- typecheck
- lint
- test
- build

The agent must report which commands were run and their result.