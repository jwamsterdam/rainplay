/**
 * SegmentedControl — behavior-oriented tests.
 *
 * Tests cover:
 * - Correct rendering without scrollFractionRef (horizon-selector mode):
 *   no .segment-indicator, no .segmented--with-indicator class.
 * - Correct rendering with scrollFractionRef (day-selector mode):
 *   .segment-indicator present, .segmented--with-indicator class applied.
 * - Active segment has class "segment active" for both modes.
 * - onChange called with correct value on button click.
 * - Disabled state: onClick does not call onChange, aria-disabled is set.
 * - Accessibility: group role and aria-label present, buttons have aria-pressed.
 * - displayLabels: custom display label rendered, aria-label still uses raw option value.
 * - scrollFractionRef mode: indicator div is aria-hidden.
 * - RAF loop: indicator style.transform is driven from the ref value (tested via
 *   direct ref mutation + RAF flush).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useRef } from "react";
import { SegmentedControl } from "./SegmentedControl";
import { dayOptions, horizonOptions } from "../state/weatherAtoms";

// ---------------------------------------------------------------------------
// Helper: render SegmentedControl with controlled props
// ---------------------------------------------------------------------------

type RenderOptions = {
  options?: readonly string[];
  value?: string;
  onChange?: (v: string) => void;
  scrollFractionRef?: React.RefObject<number>;
  compact?: boolean;
  disabled?: boolean;
  displayLabels?: Partial<Record<string, string>>;
};

function renderControl(overrides: RenderOptions = {}) {
  const {
    options = dayOptions,
    value = "Vandaag",
    onChange = vi.fn(),
    ...rest
  } = overrides;

  const utils = render(
    <SegmentedControl
      label="Test selector"
      options={options as readonly string[] as any}
      value={value as any}
      onChange={onChange as any}
      {...rest}
    />,
  );

  return { ...utils, onChange };
}

/**
 * Wrapper component that holds a live scrollFractionRef for RAF tests.
 * Exposes the ref via a callback so the test can mutate it.
 */
function IndicatorTestWrapper({
  onRef,
}: {
  onRef: (ref: React.RefObject<number>) => void;
}) {
  const ref = useRef<number>(0);
  onRef(ref);
  return (
    <SegmentedControl
      label="Dag kiezen"
      options={dayOptions}
      value="Vandaag"
      onChange={() => undefined}
      scrollFractionRef={ref}
    />
  );
}

// ---------------------------------------------------------------------------
// Tests: rendering without scrollFractionRef (horizon-selector mode)
// ---------------------------------------------------------------------------

describe("SegmentedControl — without scrollFractionRef (horizon mode)", () => {
  it("does NOT render a .segment-indicator element", () => {
    const { container } = renderControl({ options: horizonOptions, value: "Hele dag" });
    expect(container.querySelector(".segment-indicator")).toBeNull();
  });

  it("does NOT have the segmented--with-indicator class", () => {
    const { container } = renderControl({ options: horizonOptions, value: "Hele dag" });
    const group = container.querySelector("[role='group']");
    expect(group).not.toBeNull();
    expect(group!.classList.contains("segmented--with-indicator")).toBe(false);
  });

  it("renders all horizon option buttons", () => {
    renderControl({ options: horizonOptions, value: "Hele dag" });
    for (const opt of horizonOptions) {
      expect(screen.getByRole("button", { name: opt })).toBeTruthy();
    }
  });

  it("marks the active option with aria-pressed=true", () => {
    renderControl({ options: horizonOptions, value: "+6 uur" });
    const activeBtn = screen.getByRole("button", { name: "+6 uur" });
    expect(activeBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("marks inactive options with aria-pressed=false", () => {
    renderControl({ options: horizonOptions, value: "Hele dag" });
    const btn = screen.getByRole("button", { name: "+2 uur" });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onChange with the clicked option", () => {
    const onChange = vi.fn();
    renderControl({ options: horizonOptions, value: "Hele dag", onChange });
    fireEvent.click(screen.getByRole("button", { name: "+6 uur" }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("+6 uur");
  });

  it("does NOT call onChange when disabled", () => {
    const onChange = vi.fn();
    renderControl({ options: horizonOptions, value: "Hele dag", onChange, disabled: true });
    fireEvent.click(screen.getByRole("button", { name: "+6 uur" }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("sets aria-disabled when disabled", () => {
    const { container } = renderControl({ options: horizonOptions, value: "Hele dag", disabled: true });
    const group = container.querySelector("[role='group']");
    expect(group!.getAttribute("aria-disabled")).toBe("true");
  });
});

// ---------------------------------------------------------------------------
// Tests: rendering with scrollFractionRef (day-selector mode)
// ---------------------------------------------------------------------------

describe("SegmentedControl — with scrollFractionRef (day-selector mode)", () => {
  it("renders a .segment-indicator element", () => {
    const ref = { current: 0 } as React.RefObject<number>;
    const { container } = renderControl({ scrollFractionRef: ref });
    expect(container.querySelector(".segment-indicator")).not.toBeNull();
  });

  it("has the segmented--with-indicator class on the root element", () => {
    const ref = { current: 0 } as React.RefObject<number>;
    const { container } = renderControl({ scrollFractionRef: ref });
    const group = container.querySelector("[role='group']");
    expect(group!.classList.contains("segmented--with-indicator")).toBe(true);
  });

  it("indicator div is aria-hidden", () => {
    const ref = { current: 0 } as React.RefObject<number>;
    const { container } = renderControl({ scrollFractionRef: ref });
    const indicator = container.querySelector(".segment-indicator");
    expect(indicator!.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders all 4 day option buttons", () => {
    const ref = { current: 0 } as React.RefObject<number>;
    renderControl({ scrollFractionRef: ref });
    for (const opt of dayOptions) {
      expect(screen.getByRole("button", { name: opt })).toBeTruthy();
    }
  });

  it("active segment has class 'segment active'", () => {
    const ref = { current: 0 } as React.RefObject<number>;
    const { container } = renderControl({ value: "Morgen", scrollFractionRef: ref });
    // Find the button for Morgen and check its className
    const morgenBtn = container.querySelector("button[aria-label='Morgen']");
    expect(morgenBtn).not.toBeNull();
    expect(morgenBtn!.className).toBe("segment active");
  });

  it("inactive segments do NOT have class 'active'", () => {
    const ref = { current: 0 } as React.RefObject<number>;
    const { container } = renderControl({ value: "Vandaag", scrollFractionRef: ref });
    const morgenBtn = container.querySelector("button[aria-label='Morgen']");
    expect(morgenBtn!.className).toBe("segment");
  });

  it("active button has aria-pressed=true", () => {
    const ref = { current: 0 } as React.RefObject<number>;
    renderControl({ value: "Overmorgen", scrollFractionRef: ref });
    const btn = screen.getByRole("button", { name: "Overmorgen" });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onChange when a segment button is clicked", () => {
    const onChange = vi.fn();
    const ref = { current: 0 } as React.RefObject<number>;
    renderControl({ scrollFractionRef: ref, onChange });
    fireEvent.click(screen.getByRole("button", { name: "Week" }));
    expect(onChange).toHaveBeenCalledWith("Week");
  });

  it("indicator is present even when disabled", () => {
    const ref = { current: 0 } as React.RefObject<number>;
    const { container } = renderControl({ scrollFractionRef: ref, disabled: true });
    expect(container.querySelector(".segment-indicator")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: displayLabels
// ---------------------------------------------------------------------------

describe("SegmentedControl — displayLabels", () => {
  it("renders the custom display label in button text", () => {
    renderControl({
      displayLabels: { Overmorgen: "Overm." } as any,
    });
    // The visible text is the custom label
    expect(screen.getByText("Overm.")).toBeTruthy();
  });

  it("uses the raw option value as aria-label, not the display label", () => {
    renderControl({
      displayLabels: { Overmorgen: "Overm." } as any,
    });
    // aria-label must still be "Overmorgen" for screen-reader correctness
    expect(screen.getByRole("button", { name: "Overmorgen" })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Tests: accessibility structure
// ---------------------------------------------------------------------------

describe("SegmentedControl — accessibility", () => {
  it("has role=group on the root element", () => {
    const { container } = renderControl();
    const group = container.querySelector("[role='group']");
    expect(group).not.toBeNull();
  });

  it("has the aria-label on the group element", () => {
    const { container } = renderControl();
    const group = container.querySelector("[role='group']");
    expect(group!.getAttribute("aria-label")).toBe("Test selector");
  });

  it("aria-disabled is false (string) when not disabled", () => {
    const { container } = renderControl();
    const group = container.querySelector("[role='group']");
    // aria-disabled={false} renders as the string "false"
    expect(group!.getAttribute("aria-disabled")).toBe("false");
  });
});

// ---------------------------------------------------------------------------
// Tests: compact modifier class
// ---------------------------------------------------------------------------

describe("SegmentedControl — compact mode", () => {
  it("adds segmented-compact class when compact=true", () => {
    const { container } = renderControl({ options: horizonOptions, value: "Hele dag", compact: true });
    const group = container.querySelector("[role='group']");
    expect(group!.classList.contains("segmented-compact")).toBe(true);
  });

  it("does NOT add segmented-compact class when compact=false (default)", () => {
    const { container } = renderControl();
    const group = container.querySelector("[role='group']");
    expect(group!.classList.contains("segmented-compact")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: RAF-driven indicator transform
//
// The RAF loop in SegmentedControl is perpetually self-rescheduling while the
// component is mounted. This means vi.runAllTimers() will hit the infinite-loop
// guard (10 000 timers). Instead, we stub requestAnimationFrame globally to
// capture the callback and invoke it exactly once per test, then restore.
//
// Pattern:
//   1. Replace window.requestAnimationFrame with a synchronous stub that fires
//      the callback immediately and sets running=false via cancelAnimationFrame.
//   2. Render the component — the useEffect fires the first RAF, which runs the
//      tick() callback synchronously, mutates the indicator, then tries to
//      re-schedule. cancelAnimationFrame is a no-op stub; `running` stays true
//      but the second tick is never actually invoked because our stub does not
//      loop.
//   3. Read indicator.style.transform and assert.
//
// In practice the simplest correct approach is: provide a spy that runs the
// callback once synchronously, so the first tick (which sets the transform)
// executes during render, and the perpetual re-schedule is captured but not
// invoked again.
// ---------------------------------------------------------------------------

describe("SegmentedControl — RAF indicator transform", () => {
  let rafSpy: ReturnType<typeof vi.spyOn>;
  let pendingCallbacks: Array<FrameRequestCallback> = [];

  beforeEach(() => {
    pendingCallbacks = [];
    // Replace RAF with a stub that queues callbacks; we invoke them manually.
    rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      pendingCallbacks.push(cb);
      return pendingCallbacks.length; // fake handle
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    pendingCallbacks = [];
  });

  /** Flush one RAF generation: invoke all currently queued callbacks (not new ones they enqueue). */
  function flushRaf() {
    const batch = pendingCallbacks.splice(0);
    batch.forEach((cb) => cb(performance.now()));
  }

  it("sets indicator transform to translateX(0%) when fraction ref is 0", () => {
    let capturedRef: React.RefObject<number> | null = null;

    const { container } = render(
      <IndicatorTestWrapper onRef={(r) => { capturedRef = r; }} />,
    );

    // The useEffect queued one RAF. Flush it — tick() runs with fraction=0.
    act(() => { flushRaf(); });

    const indicator = container.querySelector<HTMLElement>(".segment-indicator");
    expect(indicator).not.toBeNull();
    // fraction=0, N=4: translateX(0 * 3 * 100%) = translateX(0%)
    expect(indicator!.style.transform).toBe("translateX(0%)");
  });

  it("sets indicator transform to translateX(100%) when fraction ref is 1/3 (Morgen)", () => {
    let capturedRef: React.RefObject<number> | null = null;

    const { container } = render(
      <IndicatorTestWrapper onRef={(r) => { capturedRef = r; }} />,
    );

    act(() => {
      // First tick: fraction=0, sets transform.
      flushRaf();
    });

    // Mutate ref to Morgen position (index 1 of 4 → fraction = 1/3).
    act(() => {
      if (capturedRef) (capturedRef as React.MutableRefObject<number>).current = 1 / 3;
      // Flush the re-scheduled tick.
      flushRaf();
    });

    const indicator = container.querySelector<HTMLElement>(".segment-indicator");
    // translateX((1/3) * 3 * 100%) = translateX(100%)
    expect(indicator!.style.transform).toBe("translateX(100%)");
  });

  it("sets indicator transform to translateX(300%) when fraction ref is 1 (Week)", () => {
    let capturedRef: React.RefObject<number> | null = null;

    const { container } = render(
      <IndicatorTestWrapper onRef={(r) => { capturedRef = r; }} />,
    );

    act(() => { flushRaf(); });

    act(() => {
      if (capturedRef) (capturedRef as React.MutableRefObject<number>).current = 1;
      flushRaf();
    });

    const indicator = container.querySelector<HTMLElement>(".segment-indicator");
    // translateX(1 * 3 * 100%) = translateX(300%)
    expect(indicator!.style.transform).toBe("translateX(300%)");
  });

  it("does NOT update transform when fraction ref value has not changed (lastFraction guard)", () => {
    let capturedRef: React.RefObject<number> | null = null;

    const { container } = render(
      <IndicatorTestWrapper onRef={(r) => { capturedRef = r; }} />,
    );

    act(() => { flushRaf(); }); // First tick: sets transform for fraction=0

    const indicator = container.querySelector<HTMLElement>(".segment-indicator");
    // Manually clear the transform to detect whether the next tick writes it again.
    indicator!.style.transform = "";

    // Flush another tick — fraction is still 0 (unchanged), lastFraction is 0 too.
    // The guard `fraction !== lastFraction` is false → transform must NOT be rewritten.
    act(() => { flushRaf(); });

    expect(indicator!.style.transform).toBe("");
  });
});
