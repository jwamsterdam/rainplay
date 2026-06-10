import { describe, it, expect } from "vitest";
import { buildSkyGradientStops, cellFill, mixRgba } from "./chart";
import type { CellColors } from "../components/cellColors";
import type { HourlyWeather, WeatherKind } from "../types";

const colors: CellColors = {
  sun: "rgba(255, 196, 0, 0.24)",
  partly: "rgba(243, 204, 73, 0.15)",
  cloud: "rgba(148, 191, 255, 0.15)",
  rain: "rgba(139, 149, 156, 0.37)",
  night: "rgba(10, 10, 10, 0.72)",
};

function hour(kind: WeatherKind, isDay = true): HourlyWeather {
  return {
    isoTime: "2026-06-10T00:00:00Z",
    time: "00:00",
    temperatureC: 15,
    score: 5,
    precipitationMm: 0,
    precipitationProbability: 0,
    cloudCover: 0,
    radiation: 0,
    isDay,
    kind,
  };
}

describe("buildSkyGradientStops", () => {
  it("returns no stops for empty input", () => {
    expect(buildSkyGradientStops([], colors)).toEqual([]);
  });

  it("spans the full 0..1 range with first/last edges in the cell colours", () => {
    const hours = [hour("sun"), hour("rain")];
    const stops = buildSkyGradientStops(hours, colors);

    expect(stops[0].offset).toBe(0);
    expect(stops[0].color).toBe(cellFill(hours[0], colors));
    expect(stops[stops.length - 1].offset).toBe(1);
    expect(stops[stops.length - 1].color).toBe(cellFill(hours[1], colors));
  });

  it("offsets are non-decreasing and within [0,1]", () => {
    const hours = [hour("sun"), hour("partly"), hour("cloud"), hour("rain")];
    const stops = buildSkyGradientStops(hours, colors);
    for (let i = 0; i < stops.length; i++) {
      expect(stops[i].offset).toBeGreaterThanOrEqual(0);
      expect(stops[i].offset).toBeLessThanOrEqual(1);
      if (i > 0) expect(stops[i].offset).toBeGreaterThanOrEqual(stops[i - 1].offset);
    }
  });

  it("places each cell colour at its band centre", () => {
    const hours = [hour("sun"), hour("rain")];
    const n = hours.length;
    const stops = buildSkyGradientStops(hours, colors);

    const center0 = stops.find((s) => Math.abs(s.offset - 0.5 / n) < 1e-9);
    const center1 = stops.find((s) => Math.abs(s.offset - 1.5 / n) < 1e-9);
    expect(center0?.color).toBe(cellFill(hours[0], colors));
    expect(center1?.color).toBe(cellFill(hours[1], colors));
  });

  it("blends 50/50 at the boundary between two differing cells", () => {
    const hours = [hour("sun"), hour("rain")];
    const stops = buildSkyGradientStops(hours, colors);
    const boundary = stops.find((s) => Math.abs(s.offset - 0.5) < 1e-9);
    expect(boundary?.color).toBe(mixRgba(cellFill(hours[0], colors), cellFill(hours[1], colors)));
  });

  it("collapses a flat run of identical colours into a minimal flat fill", () => {
    // Three identical night cells -> a single flat colour run.
    const hours = [hour("cloud", false), hour("cloud", false), hour("cloud", false)];
    const stops = buildSkyGradientStops(hours, colors);

    // All stops share the night colour, collapsed to just the two bounding edges.
    expect(stops).toHaveLength(2);
    expect(stops[0]).toEqual({ offset: 0, color: colors.night });
    expect(stops[1]).toEqual({ offset: 1, color: colors.night });
  });

  it("produces a valid flat span for a single hour without NaN offsets", () => {
    const hours = [hour("sun")];
    const stops = buildSkyGradientStops(hours, colors);

    // n=1: only edges remain after collapsing the identical centre.
    expect(stops).toHaveLength(2);
    expect(stops[0]).toEqual({ offset: 0, color: cellFill(hours[0], colors) });
    expect(stops[1]).toEqual({ offset: 1, color: cellFill(hours[0], colors) });
    for (const s of stops) expect(Number.isNaN(s.offset)).toBe(false);
  });

  it("keeps the blended boundary for a two-hour transition", () => {
    const hours = [hour("cloud", false), hour("sun")];
    const stops = buildSkyGradientStops(hours, colors);
    const seen = stops.map((s) => s.color);

    expect(stops[0].offset).toBe(0);
    expect(stops[stops.length - 1].offset).toBe(1);
    // The 50/50 boundary blend at offset 0.5 must survive.
    const boundary = stops.find((s) => Math.abs(s.offset - 0.5) < 1e-9);
    expect(boundary?.color).toBe(mixRgba(colors.night, cellFill(hours[1], colors)));
    expect(seen).toContain(colors.night);
    expect(seen).toContain(cellFill(hours[1], colors));
  });

  it("does not drop the transition between two runs of different colours", () => {
    // night,night,sun,sun: the collapse must keep the night/sun blend boundary
    // even though both sides are flat runs of >1 identical cell.
    const hours = [
      hour("cloud", false),
      hour("cloud", false),
      hour("sun"),
      hour("sun"),
    ];
    const stops = buildSkyGradientStops(hours, colors);
    const seen = stops.map((s) => s.color);
    const sun = cellFill(hours[2], colors);
    const blend = mixRgba(colors.night, sun);

    // Edges intact.
    expect(stops[0]).toEqual({ offset: 0, color: colors.night });
    expect(stops[stops.length - 1]).toEqual({ offset: 1, color: sun });
    // The boundary blend sits exactly at the run junction (offset 0.5 for n=4).
    const boundary = stops.find((s) => Math.abs(s.offset - 0.5) < 1e-9);
    expect(boundary?.color).toBe(blend);
    // Neither run is over-collapsed away.
    expect(seen.filter((c) => c === colors.night).length).toBeGreaterThanOrEqual(1);
    expect(seen.filter((c) => c === sun).length).toBeGreaterThanOrEqual(1);
    // Each interior run keeps at most its two bounding stops (no redundant points).
    expect(seen.filter((c) => c === colors.night).length).toBeLessThanOrEqual(2);
    expect(seen.filter((c) => c === sun).length).toBeLessThanOrEqual(2);
  });

  it("emits strictly ordered offsets that start at 0 and end at 1 for a collapsed mixed run", () => {
    const hours = [
      hour("cloud", false),
      hour("cloud", false),
      hour("sun"),
      hour("partly"),
      hour("partly"),
      hour("rain"),
    ];
    const stops = buildSkyGradientStops(hours, colors);

    expect(stops[0].offset).toBe(0);
    expect(stops[stops.length - 1].offset).toBe(1);
    for (let i = 1; i < stops.length; i++) {
      // canvas addColorStop tolerates equal offsets, but they must never go backwards.
      expect(stops[i].offset).toBeGreaterThanOrEqual(stops[i - 1].offset);
      expect(stops[i].offset).toBeGreaterThanOrEqual(0);
      expect(stops[i].offset).toBeLessThanOrEqual(1);
    }
  });

  it("keeps transition stops while collapsing a night run preceding daylight", () => {
    const hours = [
      hour("cloud", false),
      hour("cloud", false),
      hour("sun"),
    ];
    const stops = buildSkyGradientStops(hours, colors);
    const colorsSeen = stops.map((s) => s.color);

    // The flat night run must not emit redundant interior night stops...
    const nightCount = colorsSeen.filter((c) => c === colors.night).length;
    expect(nightCount).toBeLessThanOrEqual(2);
    // ...but the night->sun transition (blend) must still be present.
    const blend = mixRgba(colors.night, cellFill(hours[2], colors));
    expect(colorsSeen).toContain(blend);
    expect(colorsSeen).toContain(cellFill(hours[2], colors));
  });
});
