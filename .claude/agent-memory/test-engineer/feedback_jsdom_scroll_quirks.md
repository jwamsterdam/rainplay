---
name: feedback_jsdom_scroll_quirks
description: jsdom scroll/scrollend/scrollTo quirks that affect carousel and similar scroll-snap component tests
metadata:
  type: feedback
---

Three jsdom quirks found when testing DayCarousel (scroll-snap carousel component):

1. **`"onscrollend" in window` is TRUE** in Vitest's jsdom (v29). The component branches on this flag to choose `scrollend` vs. debounced `scroll`. Tests must dispatch `new Event("scrollend")`, not `new Event("scroll")`.

2. **`div.scrollTo` is undefined** in jsdom. Components calling `el.scrollTo({...})` will throw. Fix: `container.scrollTo = vi.fn()` before any atom change that triggers the smooth-scroll effect.

3. **`offsetWidth` is always 0** unless overridden with `Object.defineProperty(el, "offsetWidth", { get: () => N })`. Similarly `scrollLeft` must be set with `Object.defineProperty` to make it readable by the component's scroll handler.

**Why:** Discovered during DayCarousel Test 3 failure investigation. Without stubbing scrollTo, atom-change-triggered re-renders threw silently before the test could read atom state.

**How to apply:** For any scroll-snap or programmatic-scroll component test: stub offsetWidth, stub scrollTo as vi.fn(), dispatch "scrollend" not "scroll". Flush the mount-time `isScrollingProgrammatically` guard via `act(() => { vi.runAllTimers(); })` before simulating user swipes.
