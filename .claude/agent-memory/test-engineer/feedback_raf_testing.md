---
name: feedback_raf_testing
description: How to test React components that use a perpetual requestAnimationFrame loop without hitting the infinite-timer guard
metadata:
  type: feedback
---

When a component runs a perpetual `requestAnimationFrame` loop (always re-schedules itself via `running` flag + `cancelAnimationFrame` on cleanup), `vi.runAllTimers()` will abort with "Aborting after running 10000 timers, assuming an infinite loop!" — even in afterEach.

**Correct pattern:** Mock `requestAnimationFrame` globally before render, queue callbacks manually, and invoke them one generation at a time.

```ts
let pendingCallbacks: Array<FrameRequestCallback> = [];

beforeEach(() => {
  pendingCallbacks = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    pendingCallbacks.push(cb);
    return pendingCallbacks.length;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  pendingCallbacks = [];
});

function flushRaf() {
  const batch = pendingCallbacks.splice(0); // take current queue, clear it
  batch.forEach((cb) => cb(performance.now()));
}
```

Then in tests: render, mutate the ref, call `act(() => { flushRaf(); })`, assert DOM state.

**Why:** Discovered when writing SegmentedControl RAF indicator transform tests. `vi.runAllTicks()` does not execute RAF callbacks (those are macrotasks, not microtasks). `vi.runAllTimers()` hits the infinite loop guard because the component's tick() always re-schedules.

**How to apply:** Any component that uses a `requestAnimationFrame` loop (e.g. SegmentedControl indicator, animation drivers) should be tested with this pattern. Do NOT use `vi.useFakeTimers()` for RAF-loop components — use the manual spy approach instead.

See [[feedback_jsdom_scroll_quirks]] for related scroll event patterns.
