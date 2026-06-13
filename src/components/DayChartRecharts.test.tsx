/**
 * DayChartRecharts — behavior-oriented tests.
 *
 * The chart shell (`div.chart-shell`) always renders.
 * The Recharts SVG and canvas only render once ResizeObserver fires with a
 * non-zero size — which jsdom never does. Smoke tests therefore assert the
 * shell div, not the SVG. Pure helper exports (scoreColor, formatTick) are
 * tested as unit tests because they carry stable user-visible contracts.
 *
 * The `tempDomain` empty-array crash guard is covered by the empty-hours test:
 * if the guard is absent, useMemo calls Math.min/max spread on [], which
 * propagates Infinity into the YAxis domain prop and can throw in Recharts.
 */

import { render } from "@testing-library/react";
import { describe, it, expect, beforeAll, vi } from "vitest";
import type { HourlyWeather } from "../types";
import { DayChartRecharts, scoreColor, formatTick } from "./DayChartRecharts";

// ---------------------------------------------------------------------------
// Global browser-API stubs required for Recharts + canvas in jsdom
// ---------------------------------------------------------------------------

beforeAll(() => {
  // ResizeObserver — jsdom provides none; useElementSize() calls it.
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);

  // Canvas 2D context — SkyGradientCanvas calls getContext("2d").
  // Cast via any: the overloaded getContext signature is too strict for a partial stub.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (HTMLCanvasElement.prototype as any).getContext = () => ({
    createLinearGradient: () => ({ addColorStop: () => {} }),
    fillRect: () => {},
    clearRect: () => {},
    drawImage: () => {},
    setTransform: () => {},
    fillStyle: "",
  });

  // requestAnimationFrame — makePlotRectProbe calls it to flush layout rect.
  // Invoke synchronously so tests don't need timer control.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});

  // devicePixelRatio — SkyGradientCanvas reads it.
  Object.defineProperty(window, "devicePixelRatio", { value: 1, writable: true });
});

// ---------------------------------------------------------------------------
// Minimal fixture
// ---------------------------------------------------------------------------

function makeHour(overrides: Partial<HourlyWeather> = {}): HourlyWeather {
  return {
    isoTime: "2025-06-13T10:00",
    time: "10:00",
    temperatureC: 18,
    score: 8,
    precipitationMm: 0,
    precipitationProbability: 10,
    cloudCover: 20,
    radiation: 300,
    isDay: true,
    kind: "sun",
    ...overrides,
  };
}

// Shared minimal props
const baseProps = {
  horizon: "Hele dag" as const,
  showTemp: true,
  showRain: true,
  showIcons: true,
  isToday: false,
};

// ---------------------------------------------------------------------------
// Smoke tests — shell always mounts, chart only after ResizeObserver
// ---------------------------------------------------------------------------

describe("DayChartRecharts — smoke tests", () => {
  it("renders the chart shell without crashing with one valid hour", () => {
    const { container } = render(
      <DayChartRecharts hours={[makeHour()]} {...baseProps} />,
    );
    expect(container.querySelector(".chart-shell")).toBeTruthy();
  });

  it("renders the chart shell without crashing with an empty hours array", () => {
    // This exercises the tempDomain empty-array guard. Without the guard,
    // Math.min/max spread on [] produces Infinity/-Infinity, which can throw
    // inside Recharts or produce a React rendering error.
    expect(() => {
      render(<DayChartRecharts hours={[]} {...baseProps} />);
    }).not.toThrow();
  });

  it("renders the chart shell without crashing with many hours", () => {
    const hours = Array.from({ length: 24 }, (_, i) =>
      makeHour({ time: `${String(i).padStart(2, "0")}:00`, temperatureC: 10 + i }),
    );
    expect(() => {
      render(<DayChartRecharts hours={hours} {...baseProps} />);
    }).not.toThrow();
  });

  it("renders the chart shell without crashing when all hours have the same temperature", () => {
    // Triggers the min === max branch in tempDomain → returns [T-2, T+2].
    const hours = [makeHour({ temperatureC: 15 }), makeHour({ temperatureC: 15 })];
    expect(() => {
      render(<DayChartRecharts hours={hours} {...baseProps} />);
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// scoreColor — user-visible score badge colour contract
// ---------------------------------------------------------------------------

describe("scoreColor", () => {
  it("returns green (#93bf00) for score 8 (threshold boundary)", () => {
    expect(scoreColor(8)).toBe("#93bf00");
  });

  it("returns green (#93bf00) for score 10", () => {
    expect(scoreColor(10)).toBe("#93bf00");
  });

  it("returns orange (#f58a1f) for score 7 (6–7 range)", () => {
    expect(scoreColor(7)).toBe("#f58a1f");
  });

  it("returns orange (#f58a1f) for score 6 (threshold boundary)", () => {
    expect(scoreColor(6)).toBe("#f58a1f");
  });

  it("returns yellow (#f3b329) for score 5 (4–5 range)", () => {
    expect(scoreColor(5)).toBe("#f3b329");
  });

  it("returns yellow (#f3b329) for score 4 (threshold boundary)", () => {
    expect(scoreColor(4)).toBe("#f3b329");
  });

  it("returns red (#e15d4f) for score 3", () => {
    expect(scoreColor(3)).toBe("#e15d4f");
  });

  it("returns red (#e15d4f) for score 0 (worst case)", () => {
    expect(scoreColor(0)).toBe("#e15d4f");
  });
});

// ---------------------------------------------------------------------------
// formatTick — x-axis label formatting contract
// ---------------------------------------------------------------------------

describe("formatTick", () => {
  it('formats "08:00" to "8:00" (strips leading zero from hours)', () => {
    expect(formatTick("08:00")).toBe("8:00");
  });

  it('leaves "12:00" unchanged (no leading zero)', () => {
    expect(formatTick("12:00")).toBe("12:00");
  });

  it('formats "00:00" to "0:00"', () => {
    expect(formatTick("00:00")).toBe("0:00");
  });

  it('formats "09:30" to "9:30"', () => {
    expect(formatTick("09:30")).toBe("9:30");
  });

  it('passes through "ma" unchanged (week-view day names have no colon)', () => {
    expect(formatTick("ma")).toBe("ma");
  });

  it('passes through "zo" unchanged', () => {
    expect(formatTick("zo")).toBe("zo");
  });
});
