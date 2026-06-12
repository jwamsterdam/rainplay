/**
 * visiblePointsForTodayHorizon — behavior-oriented tests, focused on the
 * properties that make the "nu" marker render on every Vandaag horizon.
 *
 * THE BUG CONTEXT
 * ---------------
 * The dashed "nu" marker disappeared on the "+6 uur" / "+2 uur" Vandaag charts.
 * The marker's gating logic is `nowFraction` (tested in nowMarker.test.ts), which
 * returns null only for < 2 points. So the integration-level guarantee the chart
 * needs from this module is:
 *
 *   for EACH Vandaag horizon, the visible-point set has length >= 2, and its
 *   window starts at/after `now` (so the marker pins to the left, not vanishes).
 *
 * These tests assert that contract against a realistic hourly + minutely15
 * fixture and a fixed clock — proving "the marker renders on Hele dag / +6 / +2"
 * at the logic level, which is the correct altitude per testing-conventions
 * (no Recharts/canvas/pixel assertions in jsdom).
 */

import { describe, it, expect } from "vitest";
import { visiblePointsForTodayHorizon } from "./weatherView";
import { nowFraction } from "./nowMarker";
import type { ForecastPoint, HorizonOption, HourlyWeather } from "../types";

// Fixed "today" — the module treats hourly[0]'s date as today.
const TODAY = "2026-06-11";
// A representative current time. The minutely15 series begins at the current
// quarter-hour (10:45) the way Open-Meteo returns it; the first :00 is 11:00.
const NOW = new Date(2026, 5, 11, 10, 46);

function makeHour(hh: number): HourlyWeather {
  const time = `${String(hh).padStart(2, "0")}:00`;
  return {
    isoTime: `${TODAY}T${time}`,
    time,
    temperatureC: 18,
    score: 6,
    precipitationMm: 0,
    precipitationProbability: 0,
    cloudCover: 50,
    radiation: 200,
    isDay: hh >= 6 && hh <= 21,
    kind: "partly",
  };
}

// Full 24h hourly series for today.
const HOURLY: HourlyWeather[] = Array.from({ length: 24 }, (_, h) => makeHour(h));

// minutely15 starting at the current quarter-hour (10:45), every 15 min, 4 hours
// of data — enough to feed both the +2 (8 points) and +6 (24-point slice) windows.
function makeMinutePoint(totalMinutes: number): ForecastPoint {
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  const time = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  return { ...makeHour(hh), isoTime: `${TODAY}T${time}`, time };
}

const MINUTELY15: ForecastPoint[] = Array.from({ length: 4 * 4 + 1 }, (_, i) =>
  makeMinutePoint(10 * 60 + 45 + i * 15),
);

const TODAY_HORIZONS: HorizonOption[] = ["Hele dag", "+6 uur", "+2 uur"];

function minutesOf(time: string) {
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

describe("visiblePointsForTodayHorizon", () => {
  // -------------------------------------------------------------------------
  // The integration guarantee: marker renders on ALL three Vandaag horizons.
  // -------------------------------------------------------------------------
  describe("the 'nu' marker is produced for every Vandaag horizon", () => {
    it.each(TODAY_HORIZONS)(
      "horizon %s yields >= 2 points so nowFraction returns a non-null number",
      (horizon) => {
        // Pass NOW so this test is deterministic regardless of wall-clock time.
        const points = visiblePointsForTodayHorizon(HOURLY, MINUTELY15, horizon, NOW);
        expect(points.length).toBeGreaterThanOrEqual(2);

        const f = nowFraction(points, NOW);
        expect(f).not.toBeNull();
        expect(typeof f).toBe("number");
        expect(f! >= 0 && f! <= 1).toBe(true);
      },
    );
  });

  // -------------------------------------------------------------------------
  // The minutely windows now start AT OR BEFORE now so the nu-line always
  // falls inside the visible chart rather than pinning to the left edge.
  // -------------------------------------------------------------------------
  describe("the minutely windows (+2 / +6) start at or before now", () => {
    it("'+2 uur' window starts at the last :00/:30 at-or-before now and nu-line is inside", () => {
      const points = visiblePointsForTodayHorizon(HOURLY, MINUTELY15, "+2 uur", NOW);
      // now=10:46 — MINUTELY15 starts at 10:45 (:45, not :00/:30); no :00/:30
      // exists at or before 10:46 in the data, so niceStartIndex falls back to
      // index 0 (current quarter-hour 10:45).
      expect(points[0].time).toBe("10:45");
      expect(minutesOf(points[0].time)).toBeLessThanOrEqual(
        NOW.getHours() * 60 + NOW.getMinutes(),
      );
      // exactly 8 fifteen-min points
      expect(points).toHaveLength(8);
      // now=10:46 is 1 min after 10:45 → inside the window → fraction > 0.
      const f = nowFraction(points, NOW);
      expect(f).not.toBeNull();
      expect(f!).toBeGreaterThan(0);
      expect(f!).toBeLessThan(0.2);
    });

    it("'+6 uur' window starts at or before now, stepping every 30 min", () => {
      const points = visiblePointsForTodayHorizon(HOURLY, MINUTELY15, "+6 uur", NOW);
      expect(points[0].time).toBe("10:45");
      expect(minutesOf(points[0].time)).toBeLessThanOrEqual(
        NOW.getHours() * 60 + NOW.getMinutes(),
      );
      expect(points.length).toBeGreaterThanOrEqual(2);
      // every-other 15-min point → 30-min cadence (10:45, 11:15, ...).
      expect(points[1].time).toBe("11:15");
      // now=10:46 is inside the first band → fraction > 0 (not clamped to 0).
      const f = nowFraction(points, NOW);
      expect(f).not.toBeNull();
      expect(f!).toBeGreaterThan(0);
      expect(f!).toBeLessThan(0.15);
    });
  });

  // -------------------------------------------------------------------------
  // Fallback: no minutely15 data → fall back to the hourly Vandaag set, which
  // still has >= 2 points so the marker survives.
  // -------------------------------------------------------------------------
  describe("fallback when minutely15 is empty", () => {
    it.each(["+2 uur", "+6 uur"] as HorizonOption[])(
      "horizon %s falls back to hourly points (>= 2) so the marker still renders",
      (horizon) => {
        const points = visiblePointsForTodayHorizon(HOURLY, [], horizon, NOW);
        expect(points.length).toBeGreaterThanOrEqual(2);
        expect(nowFraction(points, NOW)).not.toBeNull();
      },
    );
  });

  // -------------------------------------------------------------------------
  // 'Hele dag' uses the configured hourly day set (step 2 → midday interior).
  // -------------------------------------------------------------------------
  describe("'Hele dag' interior marker", () => {
    it("yields a hourly day set and an interior (non-clamped) fraction for a midday now", () => {
      const points = visiblePointsForTodayHorizon(HOURLY, MINUTELY15, "Hele dag", NOW);
      expect(points.length).toBeGreaterThanOrEqual(2);
      // 10:46 sits inside the day window → interior fraction strictly in (0,1).
      const f = nowFraction(points, NOW);
      expect(f).not.toBeNull();
      expect(f! > 0 && f! < 1).toBe(true);
    });
  });
});
