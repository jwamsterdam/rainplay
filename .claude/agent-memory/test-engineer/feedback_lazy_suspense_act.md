---
name: lazy-suspense-act
description: React.lazy + vi.mock still needs await act(async) to suppress Suspense resolution warnings in Vitest
metadata:
  type: feedback
---

When a component uses `React.lazy()` and `<Suspense>`, `vi.mock()` replaces the dynamic `import()` with a synchronous-resolving factory — but React's lazy machinery still schedules the Suspense resolution as a **microtask**. That microtask fires a state update outside the test's synchronous `act()` boundary, producing:

> "A suspended resource finished loading inside a test, but the event was not wrapped in act(...)"

**Fix:** wrap `render(...)` in `await act(async () => { ... })` inside the render helper, and mark every calling test `async` with `await renderHelper()`.

```typescript
async function renderCarousel(...) {
  let utils!: ReturnType<typeof render>;
  await act(async () => {
    utils = render(<Provider store={store}><MyComponent /></Provider>);
  });
  // post-render DOM setup here
  return { ...utils, ... };
}

it("some test", async () => {
  const { store } = await renderCarousel();
  // ...
});
```

**Why:** `vi.useFakeTimers()` does not stub microtasks/Promises, so `async act` still flushes the Suspense promise queue correctly even under fake timers.

**How to apply:** Any component that uses `React.lazy()` + `<Suspense>` needs this pattern, even if the lazy import is fully mocked. The warning appears on the *first* test that renders such a component if the helper is synchronous.

See also: [[feedback_jsdom_scroll_quirks]], [[feedback_raf_testing]]
