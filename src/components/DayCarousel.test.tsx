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
    vi.runAllTimers();
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
});
