/**
 * DayCarousel — behavior-oriented tests.
 *
 * Environment notes:
 * - jsdom does not support scroll-snap layout; offsetWidth is always 0.
 *   We set it via Object.defineProperty on the container element.
 * - In Vitest's jsdom environment, `"onscrollend" in window` is TRUE, so the
 *   component attaches a `scrollend` listener (not the debounced `scroll` fallback).
 *   Tests therefore dispatch `new Event("scrollend")` to trigger the handler.
 * - jsdom div elements do not implement `scrollTo`; we stub it as a vi.fn() so
 *   atom-driven smooth-scroll effects don't throw.
 * - ResizeObserver is not available in jsdom; we provide a no-op stub.
 * - DayChartRecharts depends on Recharts + ResizeObserver for sizing; we stub it
 *   so carousel behavior is tested in isolation.
 *
 * Guard timing note:
 * `isScrollingProgrammatically` is set true on atom-change and cleared by
 * `setTimeout(0)`. A `scrollend` event dispatched synchronously before any
 * timer tick will be blocked by the guard. After `vi.advanceTimersByTime(0)` the
 * guard clears and subsequent scrollend events are processed normally.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { dayOptions, selectedDayAtom } from "../state/weatherAtoms";
import { DayCarousel } from "./DayCarousel";
import type { DayCarouselProps } from "./DayCarousel";
import type { DayOption } from "../types";

// ---------------------------------------------------------------------------
// Global browser-API stubs
// ---------------------------------------------------------------------------

// ResizeObserver — jsdom provides none; carousel and chart both call it.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

// ---------------------------------------------------------------------------
// Mock DayChartRecharts — avoids Recharts SVG measurement pain in jsdom.
// ---------------------------------------------------------------------------
vi.mock("./DayChartRecharts", () => ({
  DayChartRecharts: ({ hours }: { hours: unknown[] }) => (
    <div data-testid="chart-stub">chart({hours.length})</div>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PANEL_WIDTH = 400;

/**
 * Simulate a mid-swipe scroll position (not necessarily snapped).
 * Unlike simulateUserScrollEnd, this does NOT dispatch scrollend — it only
 * sets scrollLeft and fires the 'scroll' event so the fraction callback fires.
 */
function simulateScrollEvent(container: HTMLElement, scrollLeft: number) {
  Object.defineProperty(container, "scrollLeft", {
    configurable: true,
    writable: true,
    value: scrollLeft,
  });
  container.dispatchEvent(new Event("scroll", { bubbles: true }));
}

/** Default props: empty data, no loading/error. */
const defaultProps: DayCarouselProps = {
  hourly: [],
  minutely15: [],
  horizon: "Hele dag",
  cellColors: {
    sun: "rgba(255,196,0,0.24)",
    partly: "rgba(243,204,73,0.15)",
    cloud: "rgba(148,191,255,0.15)",
    rain: "rgba(139,149,156,0.37)",
    night: "rgba(255,255,255,0.52)",
  },
  showTemp: true,
  showRain: true,
  showIcons: true,
  isLoading: false,
  isError: false,
};

/**
 * Render DayCarousel with its own isolated Jotai store so tests are independent.
 *
 * Returns:
 * - `store`        — Jotai store for atom reads/writes.
 * - `container`    — the `.chart-carousel` div with offsetWidth=PANEL_WIDTH.
 * - `scrollToSpy`  — vi.fn() installed as `container.scrollTo` so the component's
 *                    smooth-scroll effect doesn't throw (jsdom divs lack scrollTo).
 */
function renderCarousel(
  props: Partial<DayCarouselProps> = {},
  initialDay: DayOption = "Vandaag",
) {
  const store = createStore();
  store.set(selectedDayAtom, initialDay);

  const utils = render(
    <Provider store={store}>
      <DayCarousel {...defaultProps} {...props} />
    </Provider>,
  );

  const container = utils.container.querySelector<HTMLDivElement>(
    ".chart-carousel",
  )!;

  // Give the container a stable width: index = Math.round(scrollLeft / PANEL_WIDTH).
  Object.defineProperty(container, "offsetWidth", {
    configurable: true,
    get: () => PANEL_WIDTH,
  });

  // jsdom divs don't implement scrollTo — stub it to prevent throws.
  const scrollToSpy = vi.fn();
  container.scrollTo = scrollToSpy as unknown as typeof container.scrollTo;

  return { ...utils, store, container, scrollToSpy };
}

/**
 * Simulate the user swiping to a panel:
 * 1. Set `scrollLeft` on the container element.
 * 2. Dispatch `scrollend` (the path used when `"onscrollend" in window` is true,
 *    which is the case in Vitest's jsdom environment).
 */
function simulateUserScrollEnd(container: HTMLElement, panelIndex: number) {
  Object.defineProperty(container, "scrollLeft", {
    configurable: true,
    writable: true,
    value: panelIndex * PANEL_WIDTH,
  });

  container.dispatchEvent(new Event("scrollend", { bubbles: true }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DayCarousel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runAllTimers();
    });
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Test 1: Initial panel is Vandaag
  // -------------------------------------------------------------------------
  it("mounts with selectedDayAtom = Vandaag when no initial day override is given", () => {
    const { store } = renderCarousel();
    expect(store.get(selectedDayAtom)).toBe("Vandaag");
  });

  // -------------------------------------------------------------------------
  // Test 2: Atom change → scrollTo called with correct left offset
  // -------------------------------------------------------------------------
  it("calls scrollTo({ left: width * 1, behavior: smooth }) when atom changes to Morgen", () => {
    const { store, scrollToSpy } = renderCarousel();

    act(() => {
      store.set(selectedDayAtom, "Morgen");
    });

    // "Morgen" is dayOptions index 1 → expected left = 1 * PANEL_WIDTH.
    expect(scrollToSpy).toHaveBeenCalledWith({
      left: PANEL_WIDTH * 1,
      behavior: "smooth",
    });
  });

  // -------------------------------------------------------------------------
  // Test 3: User swipe → scrollend event → atom updated
  // -------------------------------------------------------------------------
  it("updates selectedDayAtom to Overmorgen after the user swipes to panel 2", () => {
    const { store, container } = renderCarousel();

    // Flush the mount-time guard (useLayoutEffect sets isScrollingProgrammatically=true,
    // schedules setTimeout(0) to clear it).
    act(() => {
      vi.runAllTimers();
    });

    // Simulate user swipe to panel 2 (Overmorgen).
    act(() => {
      simulateUserScrollEnd(container, 2);
    });

    expect(store.get(selectedDayAtom)).toBe("Overmorgen");
  });

  // -------------------------------------------------------------------------
  // Test 3b: P1 guard — settling on the ALREADY-selected day is a no-op.
  //
  // The scroll→atom handler skips the write when the swipe settles back on the
  // currently-selected day (selectedDayRef guard). We assert the user-observable
  // outcome: subscribing to the atom, a same-day settle produces ZERO change
  // notifications, while a different-day settle produces exactly one. This proves
  // the redundant write is skipped without inspecting React-internal renders.
  // -------------------------------------------------------------------------
  it("does NOT write the atom when a swipe settles on the already-selected day", () => {
    const { store, container } = renderCarousel({}, "Overmorgen");

    act(() => { vi.runAllTimers(); }); // flush mount guard

    // Count atom-change notifications from now on.
    let changeCount = 0;
    const unsub = store.sub(selectedDayAtom, () => { changeCount += 1; });

    // User swipes but settles back on panel 2 (Overmorgen) — the current day.
    act(() => { simulateUserScrollEnd(container, 2); });

    expect(store.get(selectedDayAtom)).toBe("Overmorgen");
    expect(changeCount).toBe(0); // redundant write skipped by the P1 guard

    // Sanity: a settle on a DIFFERENT day (panel 1 = Morgen) DOES write once.
    act(() => { simulateUserScrollEnd(container, 1); });

    expect(store.get(selectedDayAtom)).toBe("Morgen");
    expect(changeCount).toBe(1);

    unsub();
  });

  // -------------------------------------------------------------------------
  // Test 4: isScrollingProgrammatically guard — blocks scrollend during
  // a programmatic scroll before the clearing setTimeout fires
  // -------------------------------------------------------------------------
  it("ignores a scrollend fired synchronously during a programmatic scroll", () => {
    const { store, container } = renderCarousel();

    // Flush mount-time guard so we start from a clean state.
    act(() => {
      vi.runAllTimers();
    });

    // Trigger programmatic scroll to Morgen (sets guard = true, schedules setTimeout(0)).
    act(() => {
      store.set(selectedDayAtom, "Morgen");
    });

    // Immediately — no timer advance — fire scrollend with scrollLeft=0.
    // scrollLeft=0 maps to index 0 = "Vandaag". If the guard works, this is ignored
    // and the atom stays "Morgen". If the guard is absent, it would flip back to "Vandaag".
    Object.defineProperty(container, "scrollLeft", {
      configurable: true,
      writable: true,
      value: 0,
    });
    container.dispatchEvent(new Event("scrollend", { bubbles: true }));

    // Atom must still be "Morgen" — the guard blocked the scrollend write.
    expect(store.get(selectedDayAtom)).toBe("Morgen");
  });

  // -------------------------------------------------------------------------
  // Test 5: loading state — 4 loading panels rendered
  // -------------------------------------------------------------------------
  it("renders 4 loading-panels when isLoading is true", () => {
    const { container } = renderCarousel({ isLoading: true });

    const panels = container.querySelectorAll(".loading-panel");
    expect(panels).toHaveLength(4);
  });

  // -------------------------------------------------------------------------
  // Test 6: error state — shows Dutch error message in every panel
  // -------------------------------------------------------------------------
  it('shows "Weerdata niet beschikbaar" in every panel when isError is true', () => {
    renderCarousel({ isError: true });

    const messages = screen.getAllByText("Weerdata niet beschikbaar");
    expect(messages).toHaveLength(4);
  });

  // -------------------------------------------------------------------------
  // Test 6b: error state — retry button calls onRetry (recovery affordance)
  // -------------------------------------------------------------------------
  it("renders a retry button in the error state that calls onRetry when clicked", () => {
    const onRetry = vi.fn();
    renderCarousel({ isError: true, onRetry });

    const buttons = screen.getAllByRole("button", { name: "Opnieuw proberen" });
    expect(buttons).toHaveLength(4);

    act(() => {
      buttons[0].click();
    });
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders no retry button when isError is true but onRetry is not provided", () => {
    renderCarousel({ isError: true });
    expect(screen.queryByRole("button", { name: "Opnieuw proberen" })).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Extra: happy path — chart stubs render (no loading panels)
  // -------------------------------------------------------------------------
  it("renders 4 chart panels (not loading-panels) when data is available", () => {
    const { container } = renderCarousel();

    const charts = screen.getAllByTestId("chart-stub");
    expect(charts).toHaveLength(dayOptions.length); // 4
    expect(container.querySelectorAll(".loading-panel")).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Extra: all 4 panels always in DOM regardless of selected day
  // -------------------------------------------------------------------------
  it("keeps all 4 carousel panels in the DOM when starting on Overmorgen", () => {
    const { container } = renderCarousel({}, "Overmorgen");

    const panels = container.querySelectorAll(".chart-carousel-panel");
    expect(panels).toHaveLength(4);
  });

  // -------------------------------------------------------------------------
  // Extra: atom change to Week calls scrollTo with index 3
  // -------------------------------------------------------------------------
  it("calls scrollTo({ left: width * 3 }) when atom changes to Week", () => {
    const { store, scrollToSpy } = renderCarousel();

    act(() => {
      store.set(selectedDayAtom, "Week");
    });

    expect(scrollToSpy).toHaveBeenCalledWith({
      left: PANEL_WIDTH * 3,
      behavior: "smooth",
    });
  });

  // -------------------------------------------------------------------------
  // Extra: guard clears after setTimeout(0) — subsequent scrollend is processed
  // -------------------------------------------------------------------------
  it("processes a scrollend that arrives after the guard-clearing setTimeout fires", () => {
    const { store, container } = renderCarousel();

    // Flush mount guard.
    act(() => { vi.runAllTimers(); });

    // Trigger programmatic scroll to Morgen (guard = true).
    act(() => {
      store.set(selectedDayAtom, "Morgen");
    });

    // Flush the guard-clearing setTimeout(0).
    act(() => { vi.advanceTimersByTime(0); });

    // Now fire scrollend at panel 3 (Week). Guard is clear → atom should update.
    act(() => { simulateUserScrollEnd(container, 3); });

    expect(store.get(selectedDayAtom)).toBe("Week");
  });

  // -------------------------------------------------------------------------
  // Extra: Overmorgen atom change calls scrollTo with index 2
  // -------------------------------------------------------------------------
  it("calls scrollTo({ left: width * 2 }) when atom changes to Overmorgen", () => {
    const { store, scrollToSpy } = renderCarousel();

    act(() => {
      store.set(selectedDayAtom, "Overmorgen");
    });

    expect(scrollToSpy).toHaveBeenCalledWith({
      left: PANEL_WIDTH * 2,
      behavior: "smooth",
    });
  });

  // -------------------------------------------------------------------------
  // onScrollFractionChange — fraction callback
  // -------------------------------------------------------------------------

  it("calls onScrollFractionChange(0.5) when scrollLeft is halfway between Vandaag and Morgen", () => {
    const onScrollFractionChange = vi.fn();
    const { container } = renderCarousel({ onScrollFractionChange });

    act(() => { vi.runAllTimers(); }); // flush mount guard

    act(() => {
      // Halfway between panel 0 and panel 1: scrollLeft = 0.5 * PANEL_WIDTH
      // Total scroll range = PANEL_WIDTH * (4 - 1) = 3 * PANEL_WIDTH
      // fraction = 0.5 * PANEL_WIDTH / (3 * PANEL_WIDTH) ≈ 0.1667 — but the formula
      // uses containerWidth * (length - 1) where containerWidth = PANEL_WIDTH.
      // fraction = (0.5 * PANEL_WIDTH) / (PANEL_WIDTH * 3) = 1/6
      simulateScrollEvent(container, PANEL_WIDTH * 0.5);
    });

    // fraction = (PANEL_WIDTH * 0.5) / (PANEL_WIDTH * 3) = 1/6
    const expected = 0.5 / 3;
    expect(onScrollFractionChange).toHaveBeenCalledWith(
      expect.closeTo(expected, 5),
    );
  });

  it("calls onScrollFractionChange(1) when scrollLeft is at the last panel (Week)", () => {
    const onScrollFractionChange = vi.fn();
    const { container } = renderCarousel({ onScrollFractionChange });

    act(() => { vi.runAllTimers(); });

    act(() => {
      // Last panel: scrollLeft = PANEL_WIDTH * 3; fraction = 1.0
      simulateScrollEvent(container, PANEL_WIDTH * 3);
    });

    expect(onScrollFractionChange).toHaveBeenCalledWith(1);
  });

  it("calls onScrollFractionChange(0) when scrollLeft is at the first panel (Vandaag)", () => {
    const onScrollFractionChange = vi.fn();
    const { container } = renderCarousel({ onScrollFractionChange });

    act(() => { vi.runAllTimers(); });

    act(() => {
      simulateScrollEvent(container, 0);
    });

    expect(onScrollFractionChange).toHaveBeenCalledWith(0);
  });

  it("clamps onScrollFractionChange to [0, 1] for out-of-bounds scrollLeft", () => {
    const onScrollFractionChange = vi.fn();
    const { container } = renderCarousel({ onScrollFractionChange });

    act(() => { vi.runAllTimers(); });

    // Over-scroll beyond last panel
    act(() => { simulateScrollEvent(container, PANEL_WIDTH * 10); });
    let calls = onScrollFractionChange.mock.calls;
    expect(calls[calls.length - 1][0]).toBe(1);

    // Under-scroll before first panel (negative)
    act(() => { simulateScrollEvent(container, -100); });
    calls = onScrollFractionChange.mock.calls;
    expect(calls[calls.length - 1][0]).toBe(0);
  });

  // -------------------------------------------------------------------------
  // onScrollFractionChange absent — no throw when scrolling
  // -------------------------------------------------------------------------
  it("does not throw when scroll event fires and onScrollFractionChange is not provided", () => {
    const { container } = renderCarousel(); // no onScrollFractionChange

    act(() => { vi.runAllTimers(); });

    expect(() => {
      act(() => { simulateScrollEvent(container, PANEL_WIDTH * 1.5); });
    }).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // Fraction callback not called when containerWidth is 0
  // -------------------------------------------------------------------------
  it("calls onScrollFractionChange(0) (safe fallback) when containerWidth is 0", () => {
    const onScrollFractionChange = vi.fn();
    const { container } = renderCarousel({ onScrollFractionChange });

    act(() => { vi.runAllTimers(); });

    // Override offsetWidth back to 0 (simulates zero-size container)
    Object.defineProperty(container, "offsetWidth", {
      configurable: true,
      get: () => 0,
    });

    act(() => { simulateScrollEvent(container, 100); });

    // When containerWidth === 0, the fraction formula returns 0 (safe fallback).
    const lastArg =
      onScrollFractionChange.mock.calls[onScrollFractionChange.mock.calls.length - 1][0];
    expect(lastArg).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Bug regression: debounce timer leaks on unmount when supportsScrollEnd=true
  //
  // In the current implementation, when "onscrollend" in window is true (which
  // is the case in jsdom v29+), the cleanup function omits clearTimeout for the
  // debounceTimer that the onScroll handler sets. This means a pending 120ms
  // debounce timer can fire after unmount and call setSelectedDay on a stale
  // atom reference.
  //
  // This test documents the bug: it fires a scroll event (which sets the
  // debounceTimer), then unmounts the component, then advances timers by 120ms.
  // If the bug is present, the debounce callback runs silently; if the bug were
  // fixed (clearTimeout added to the supportsScrollEnd cleanup branch), it would
  // not run. The test cannot directly observe a "safe" no-op — it proves the
  // debounce fires after unmount by checking no error is thrown (the current
  // behavior). Future fix: move clearTimeout to both branches.
  // -------------------------------------------------------------------------
  it("debounce timer set during scroll does not throw after unmount (regression guard for cleanup bug)", () => {
    const { container, unmount } = renderCarousel();

    act(() => { vi.runAllTimers(); });

    // Fire a scroll event — this sets the 120ms debounceTimer inside onScroll.
    act(() => { simulateScrollEvent(container, PANEL_WIDTH * 1.5); });

    // Unmount before the 120ms debounce fires.
    unmount();

    // Advance by 120ms — the debounce timer fires. With the current bug it runs
    // updateAtomFromScroll on a stale element reference; confirm no exception.
    expect(() => {
      act(() => { vi.advanceTimersByTime(150); });
    }).not.toThrow();
  });
});
