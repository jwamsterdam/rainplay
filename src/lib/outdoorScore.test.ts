import { describe, expect, it } from "vitest";
import { outdoorScore } from "./outdoorScore";
import type { WeatherKind } from "../types";

function score(overrides: Partial<Parameters<typeof outdoorScore>[0]> = {}) {
  return outdoorScore({
    precipitationMm: 0,
    temperatureC: 18,
    kind: "sun",
    isDay: true,
    ...overrides,
  });
}

describe("outdoorScore", () => {
  it("gives dry bright daytime weather the highest score band", () => {
    expect(score({ kind: "sun" })).toBe(10);
    expect(score({ kind: "partly" })).toBe(9);
    expect(score({ kind: "cloud" })).toBe(8);
  });

  it("prioritizes rain by sharply reducing the score as precipitation increases", () => {
    expect(score({ precipitationMm: 0.1, kind: "rain" })).toBe(6);
    expect(score({ precipitationMm: 0.3, kind: "rain" })).toBe(5);
    expect(score({ precipitationMm: 0.8, kind: "rain" })).toBe(2);
    expect(score({ precipitationMm: 1.5, kind: "rain" })).toBe(0);
    expect(score({ precipitationMm: 3, kind: "rain" })).toBe(0);
  });

  it("keeps darkness as a hard cap even when the weather is otherwise ideal", () => {
    expect(score({ isDay: false, kind: "sun", precipitationMm: 0 })).toBe(6);
    expect(score({ isDay: false, kind: "partly", precipitationMm: 0 })).toBe(6);
  });

  it("treats temperature as a secondary comfort modifier", () => {
    expect(score({ temperatureC: 18 })).toBe(10);
    expect(score({ temperatureC: 12 })).toBe(9);
    expect(score({ temperatureC: 8 })).toBe(8);
    expect(score({ temperatureC: 4 })).toBe(7);
    expect(score({ temperatureC: 0 })).toBe(6);  // below 4°C: penalty = 4
    expect(score({ temperatureC: 28 })).toBe(9);
    expect(score({ temperatureC: 35 })).toBe(6);
  });

  it("keeps the result inside the 0-10 range for every weather kind", () => {
    const kinds: WeatherKind[] = ["sun", "partly", "cloud", "rain"];

    for (const kind of kinds) {
      const value = score({
        kind,
        precipitationMm: kind === "rain" ? 10 : 0,
        temperatureC: kind === "rain" ? -5 : 18,
      });

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(10);
    }
  });
});
