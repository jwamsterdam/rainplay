import { describe, expect, it } from "vitest";
import {
  bestOutdoorWindow,
  bestStartTime,
  bestWindowLabel,
  cellFill,
  firstNonEmpty,
  outdoorSummaryLabel,
  parseRgba,
} from "./chart";
import type { OutdoorWindow } from "./chart";
import type { CellColors } from "../components/cellColors";
import type { HourlyWeather } from "../types";

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

  it("selects the practicalPreferredWindows tier when cloud kind disqualifies bright tier", () => {
    // kind="cloud" fails feelsBright → brightWindows=[]; practical hours (10:00 in [6,20)) → practicalPreferred wins
    const hours = [
      hour("10:00", { kind: "cloud", score: 8, radiation: 40 }),
    ];

    expect(bestOutdoorWindow(hours)?.startTime).toBe("10:00");
  });

  it("selects the preferredWindows tier for an evening hour outside the practical range", () => {
    // hourOfDay=20 fails isPracticalOutdoorHour (< 20 required) → brightWindows=[] and practicalPreferred=[]
    // but isDry and score is good → preferredWindows wins
    const hours = [
      hour("20:00", { isoTime: "2026-06-11T20:00", kind: "sun", score: 9, radiation: 200 }),
    ];

    expect(bestOutdoorWindow(hours)?.startTime).toBe("20:00");
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

describe("firstNonEmpty", () => {
  // bestOutdoorWindow's own final tier (scoreOnlyWindows) can never be empty for a
  // non-empty hours array, so the "all candidates empty" fallback branch is
  // unreachable through that call site — it is tested directly here instead.
  it("returns the first non-empty candidate", () => {
    expect(firstNonEmpty([], [1, 2], [3])).toEqual([1, 2]);
  });

  it("returns an already-non-empty first candidate without inspecting the rest", () => {
    expect(firstNonEmpty([1], [2])).toEqual([1]);
  });

  it("falls back to the last candidate when every candidate is empty", () => {
    expect(firstNonEmpty<number>([], [], [])).toEqual([]);
  });

  it("returns an empty array when called with no candidates at all", () => {
    expect(firstNonEmpty()).toEqual([]);
  });
});

describe("chart color helpers", () => {
  it("uses the night color when radiation is zero", () => {
    expect(cellFill(hour("23:00", { isDay: false, kind: "sun", radiation: 0 }), colors)).toBe(colors.night);
  });

  it("parses rgb and rgba strings with fallback for invalid values", () => {
    expect(parseRgba("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30, a: 1 });
    expect(parseRgba("rgba(10, 20, 30, 0.4)")).toEqual({ r: 10, g: 20, b: 30, a: 0.4 });
    expect(parseRgba("not-a-color")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseRgba("rgb(1,2)")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    expect(parseRgba("rgb(1,2,3,4,5)")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

});
