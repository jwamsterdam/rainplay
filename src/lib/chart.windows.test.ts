import { describe, expect, it } from "vitest";
import {
  bestOutdoorWindow,
  bestStartTime,
  bestWindowLabel,
  buildBlendData,
  cellFill,
  interpolateRgba,
  outdoorSummaryLabel,
  parseRgba,
} from "./chart";
import type { OutdoorWindow } from "./chart";
import type { CellColors } from "../components/cellColors";
import type { HourlyWeather, WeatherKind } from "../types";

const colors: CellColors = {
  sun: "rgba(255, 196, 0, 0.24)",
  partly: "rgba(243, 204, 73, 0.15)",
  cloud: "rgba(148, 191, 255, 0.15)",
  rain: "rgba(139, 149, 156, 0.37)",
  night: "rgba(10, 10, 10, 0.6)",
};

function hour(
  time: string,
  overrides: Partial<HourlyWeather> = {},
): HourlyWeather {
  return {
    isoTime: `2026-06-11T${time}`,
    time,
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

describe("bestOutdoorWindow", () => {
  it("returns null and fallback labels for an empty series", () => {
    expect(bestOutdoorWindow([])).toBeNull();
    expect(bestStartTime([])).toBe("--:--");
    expect(bestWindowLabel([])).toBe("--:--");
    expect(outdoorSummaryLabel([], null)).toBe("Geen duidelijk buitenmoment");
  });

  it("prefers the longest bright dry practical window", () => {
    const hours = [
      hour("06:00", { score: 8, kind: "sun", radiation: 300 }),
      hour("07:00", { score: 8, kind: "sun", radiation: 300 }),
      hour("08:00", { score: 6, kind: "cloud", radiation: 40 }),
      hour("09:00", { score: 9, kind: "sun", radiation: 350 }),
    ];

    const best = bestOutdoorWindow(hours);

    expect(best).toEqual({
      startIndex: 0,
      endIndex: 1,
      startTime: "06:00",
      endTime: "08:00",
    });
    expect(bestStartTime(hours)).toBe("06:00");
    expect(bestWindowLabel(hours)).toBe("06:00 - 08:00");
  });

  it("breaks equal-length ties by average score", () => {
    const hours = [
      hour("06:00", { score: 8, kind: "sun" }),
      hour("07:00", { score: 5, kind: "cloud", radiation: 20 }),
      hour("08:00", { score: 9, kind: "sun" }),
    ];

    expect(bestOutdoorWindow(hours)?.startTime).toBe("08:00");
  });

  it("falls back to the highest non-rain score when no dry probability window exists", () => {
    const hours = [
      hour("06:00", { score: 5, precipitationProbability: 90, kind: "cloud" }),
      hour("07:00", { score: 6, precipitationProbability: 90, kind: "cloud" }),
      hour("08:00", { score: 9, precipitationProbability: 90, kind: "rain" }),
    ];

    expect(bestOutdoorWindow(hours)?.startTime).toBe("07:00");
  });

  it("infers an end time for the final point using the observed time step", () => {
    const hours = [
      hour("10:00", { isoTime: "2026-06-11T10:00" }),
      hour("10:30", { isoTime: "2026-06-11T10:30" }),
    ];

    expect(bestOutdoorWindow(hours)?.endTime).toBe("11:00");
  });

  it("keeps non-time labels when a final week summary has no HH:MM label", () => {
    const hours = [
      hour("ma", { isoTime: "2026-06-11T12:00", time: "ma" }),
      hour("di", { isoTime: "2026-06-12T12:00", time: "di" }),
    ];

    expect(bestOutdoorWindow(hours)?.endTime).toBe("di");
  });
});

describe("outdoorSummaryLabel", () => {
  it("describes a window between rainy periods", () => {
    const hours = [
      hour("10:00", { kind: "rain", precipitationMm: 0.4 }),
      hour("14:00", { score: 9, kind: "sun" }),
      hour("18:00", { kind: "rain", precipitationMm: 0.4 }),
    ];
    const best = bestOutdoorWindow(hours);

    expect(outdoorSummaryLabel(hours, best)).toBe("Tussen buien door - middag beste");
  });

  it("describes a dry morning before later rain", () => {
    const hours = [
      hour("09:00", { score: 9, kind: "sun" }),
      hour("12:00", { kind: "rain", precipitationMm: 0.4 }),
    ];
    const best = bestOutdoorWindow(hours);

    expect(outdoorSummaryLabel(hours, best)).toBe("Ochtend beste - later regen");
  });

  it("describes a clear afternoon after morning rain with no following rain", () => {
    const hours = [
      hour("06:00", { kind: "rain", precipitationMm: 0.4 }),
      hour("14:00", { score: 9, kind: "sun" }),
    ];
    const best = bestOutdoorWindow(hours);

    expect(outdoorSummaryLabel(hours, best)).toBe("Na regen - middag beste");
  });

  it("describes a fully clear period with no rain before or after", () => {
    const hours = [hour("09:00", { score: 9, kind: "sun" })];
    const best = bestOutdoorWindow(hours);

    expect(outdoorSummaryLabel(hours, best)).toBe("Ochtend beste buitenmoment");
  });

  it("uses 'avond' period label for windows starting at 18:00 or later", () => {
    const eveningWindow: OutdoorWindow = { startIndex: 0, endIndex: 0, startTime: "19:00", endTime: "20:00" };

    expect(outdoorSummaryLabel([], eveningWindow)).toBe("Avond beste buitenmoment");
  });
});

describe("chart color helpers", () => {
  it("uses the night color for non-daylight cells", () => {
    expect(cellFill(hour("23:00", { isDay: false, kind: "sun" }), colors)).toBe(colors.night);
  });

  it("parses rgb and rgba strings with fallback for invalid values", () => {
    expect(parseRgba("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30, a: 1 });
    expect(parseRgba("rgba(10, 20, 30, 0.4)")).toEqual({ r: 10, g: 20, b: 30, a: 0.4 });
    expect(parseRgba("not-a-color")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it("interpolates rgba channels and alpha", () => {
    expect(interpolateRgba("rgba(0, 0, 0, 0)", "rgba(10, 20, 30, 1)", 0.5)).toBe(
      "rgba(5, 10, 15, 0.5)",
    );
  });

  it("builds blend data between adjacent hours", () => {
    const blendData = buildBlendData([
      hour("10:00", { kind: "sun" }),
      hour("11:00", { kind: "rain" }),
      hour("12:00", { kind: "cloud" }),
    ], colors);

    expect(blendData).toHaveLength(2);
    expect(blendData[0].blendIndex).toBe(0.5);
    expect(blendData[1].blendIndex).toBe(1.5);
  });
});
