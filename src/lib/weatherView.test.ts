import { describe, expect, it } from "vitest";
import {
  headerDateLabel,
  visibleHoursForHorizon,
  visibleHoursForSelection,
  visiblePointsForTodayHorizon,
} from "./weatherView";
import type { ForecastPoint, HourlyWeather } from "../types";

function hour(
  isoTime: string,
  overrides: Partial<HourlyWeather> = {},
): HourlyWeather {
  const time = isoTime.slice(11, 16);
  return {
    isoTime,
    time,
    temperatureC: 18,
    score: 7,
    precipitationMm: 0,
    precipitationProbability: 10,
    cloudCover: 30,
    radiation: 200,
    isDay: true,
    kind: "partly",
    ...overrides,
  };
}

function day(date: string, overrides: Partial<HourlyWeather> = {}) {
  return Array.from({ length: 24 }, (_, index) =>
    hour(`${date}T${String(index).padStart(2, "0")}:00`, {
      isDay: index >= 6 && index <= 21,
      ...overrides,
    }),
  );
}

const hours = [
  ...day("2026-06-11"),
  ...day("2026-06-12", { score: 8, kind: "sun", radiation: 500 }),
  ...day("2026-06-13", { score: 4, kind: "rain", precipitationMm: 0.7 }),
];

describe("visibleHoursForHorizon", () => {
  it("limits short horizons while preserving full-day data", () => {
    expect(visibleHoursForHorizon(hours, "+2 uur")).toHaveLength(3);
    expect(visibleHoursForHorizon(hours, "+6 uur")).toHaveLength(7);
    expect(visibleHoursForHorizon(hours, "Hele dag")).toHaveLength(hours.length);
  });
});

describe("visibleHoursForSelection", () => {
  it("returns stepped hours for today according to the selected horizon", () => {
    const selected = visibleHoursForSelection(hours, "Vandaag", "+6 uur");

    expect(selected).toHaveLength(7);
    expect(selected[0].isoTime).toBe("2026-06-11T00:00");
    expect(selected[1].isoTime).toBe("2026-06-11T02:00");
  });

  it("ignores short horizons for tomorrow and returns the configured day range", () => {
    const selected = visibleHoursForSelection(hours, "Morgen", "+2 uur");

    expect(selected).toHaveLength(12);
    expect(selected[0].isoTime).toBe("2026-06-12T00:00");
    expect(selected[1].isoTime).toBe("2026-06-12T02:00");
  });

  it("summarizes the week into one point per available day", () => {
    const selected = visibleHoursForSelection(hours, "Week", "Hele dag");

    expect(selected).toHaveLength(3);
    expect(selected.map((point) => point.time)).toEqual(["do", "vr", "za"]);
    expect(selected[1].kind).toBe("sun");
    expect(selected[2].kind).toBe("rain");
  });

  it("returns no points when the requested day is missing", () => {
    const todayOnly = day("2026-06-11");

    expect(visibleHoursForSelection(todayOnly, "Overmorgen", "Hele dag")).toEqual([]);
  });
});

describe("visiblePointsForTodayHorizon", () => {
  it("uses hourly today points for the full-day horizon even when minutely data exists", () => {
    const minutely: ForecastPoint[] = [
      hour("2026-06-11T10:15"),
      hour("2026-06-11T10:30"),
    ];

    const selected = visiblePointsForTodayHorizon(hours, minutely, "Hele dag");

    expect(selected[0].time).toBe("00:00");
    expect(selected).toHaveLength(12);
  });

  it("starts minutely horizons at the first half-hour or whole-hour point", () => {
    const minutely: ForecastPoint[] = [
      hour("2026-06-11T10:15"),
      hour("2026-06-11T10:30"),
      hour("2026-06-11T10:45"),
      hour("2026-06-11T11:00"),
      hour("2026-06-11T11:15"),
      hour("2026-06-11T11:30"),
      hour("2026-06-11T11:45"),
      hour("2026-06-11T12:00"),
      hour("2026-06-11T12:15"),
    ];

    expect(visiblePointsForTodayHorizon(hours, minutely, "+2 uur").map((point) => point.time)).toEqual([
      "10:30",
      "10:45",
      "11:00",
      "11:15",
      "11:30",
      "11:45",
      "12:00",
      "12:15",
    ]);
    expect(visiblePointsForTodayHorizon(hours, minutely, "+6 uur").map((point) => point.time)).toEqual([
      "10:30",
      "11:00",
      "11:30",
      "12:00",
    ]);
  });

  it("falls back to index 0 when no minutely point has a neat label", () => {
    const minutely: ForecastPoint[] = [
      hour("2026-06-11T10:15"),
      hour("2026-06-11T10:45"),
    ];

    expect(visiblePointsForTodayHorizon(hours, minutely, "+2 uur")[0].time).toBe("10:15");
  });
});

describe("headerDateLabel", () => {
  it("formats Dutch labels for individual days and week ranges", () => {
    expect(headerDateLabel(hours, "Vandaag")).toContain("do");
    expect(headerDateLabel(hours, "Morgen")).toContain("vr");
    expect(headerDateLabel(hours, "Overmorgen")).toContain("za");
    expect(headerDateLabel(hours, "Week")).toContain(" - ");
  });

  it("returns an empty label for empty data", () => {
    expect(headerDateLabel([], "Vandaag")).toBe("");
    expect(headerDateLabel([], "Week")).toBe("");
  });
});
