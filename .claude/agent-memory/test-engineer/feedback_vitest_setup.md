---
name: feedback_vitest_setup
description: Vitest test stack is now configured; key jsdom quirks discovered during DayCarousel testing
metadata:
  type: feedback
---

Vitest + jsdom + @testing-library/react + @testing-library/user-event + @testing-library/jest-dom was installed as devDependencies. vitest.config.ts uses `environment: "jsdom"` and `setupFiles: ["./src/test/setup.ts"]`.

**Why:** Project had no test runner; Vitest was chosen for Vite alignment.

**How to apply:** Tests live in `src/components/` next to their subject file. Use `vi.stubGlobal("ResizeObserver", ...)` for any component that observes element size. Use `vi.mock("./DayChartRecharts", ...)` for chart-heavy dependencies.

See [[feedback_jsdom_scroll_quirks]] for scroll-specific mocking patterns discovered in DayCarousel tests.
