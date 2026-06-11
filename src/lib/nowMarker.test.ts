/**
 * nowFraction — behavior-oriented unit tests.
 *
 * THE BUG THIS FILE GUARDS AGAINST
 * --------------------------------
 * The dashed "nu" marker vanished on the "+6 uur" / "+2 uur" Vandaag charts.
 * Those horizon windows begin at the first :00/:30 point AT/AFTER now, so the
 * current wall-clock time sits just BEFORE the first visible point. The old
 * `nowLineX` returned null whenever now fell outside [firstPoint, lastPoint],
 * so the marker disappeared exactly when the window was "the next few hours".
 *
 * `nowFraction` replaces that with the band-centre model the sky gradient uses:
 * point i's centre is at (i + 0.5)/n. The result is a fraction in [0,1],
 * CLAMPED to the edges (pinned left when now precedes the window, right when
 * after), and is null ONLY for a degenerate input (< 2 points). `now` is
 * injected so the math is deterministic.
 *
 * The math is the whole contract, so these tests pin the exact denominators and
 * the +0.5 band-centre offset — that's where an off-by-one or wrong-denominator
 * regression would hide.
 */

import { describe, it, expect } from "vitest";
import { nowFraction } from "./nowMarker";

// Build a points array from "HH:MM" strings (only `time` is read).
function pts(...times: string[]) {
  return times.map((time) => ({ time }));
}

// Deterministic clock at HH:MM on a fixed date (2026-06-11). The date part is
// irrelevant — nowFraction only reads getHours()/getMinutes() — but fixing it
// documents the determinism contract.
function at(hours: number, minutes = 0) {
  return new Date(2026, 5, 11, hours, minutes);
}

describe("nowFraction", () => {
  // -------------------------------------------------------------------------
  // Interior interpolation — exact band-centre fractions
  // -------------------------------------------------------------------------
  describe("interior: now strictly between two points", () => {
    it("maps now == middle point to that point's band centre (1 + 0.5)/3", () => {
      // points 12:00,13:00,14:00 ; now=13:00 is point index 1 exactly.
      // fraction = (1 + 0.5 + 0)/3 = 0.5
      const f = nowFraction(pts("12:00", "13:00", "14:00"), at(13, 0));
      expect(f).toBeCloseTo(0.5, 10);
    });

    it("interpolates halfway between point 0 and point 1: ((0 + 0.5) + 0.5)/3", () => {
      // now=12:30 sits halfway between 12:00 (i=0) and 13:00 (i=1).
      // t = 0.5 → fraction = (0 + 0.5 + 0.5)/3 = 1/3
      const f = nowFraction(pts("12:00", "13:00", "14:00"), at(12, 30));
      expect(f).toBeCloseTo(1 / 3, 10);
    });

    it("interpolates a non-half t correctly: now 15 min into a 60 min band", () => {
      // now=12:15 → t = 15/60 = 0.25 → fraction = (0 + 0.5 + 0.25)/3 = 0.75/3 = 0.25
      const f = nowFraction(pts("12:00", "13:00", "14:00"), at(12, 15));
      expect(f).toBeCloseTo(0.25, 10);
    });
  });

  // -------------------------------------------------------------------------
  // Band-centre semantics at the exact endpoints — NOT 0 and NOT 1.
  // -------------------------------------------------------------------------
  describe("band-centre semantics at endpoints", () => {
    it("now == first point maps to (0 + 0.5)/n, NOT 0", () => {
      // 4 points, now equals the first → 0.5/4 = 0.125 (the band CENTRE).
      const f = nowFraction(pts("06:00", "07:00", "08:00", "09:00"), at(6, 0));
      expect(f).toBeCloseTo(0.5 / 4, 10);
      expect(f).not.toBe(0);
    });

    it("now == last point maps to ((n-1) + 0.5)/n, NOT 1", () => {
      // 4 points, now equals the last → (3 + 0.5)/4 = 3.5/4 = 0.875.
      const f = nowFraction(pts("06:00", "07:00", "08:00", "09:00"), at(9, 0));
      expect(f).toBeCloseTo(3.5 / 4, 10);
      expect(f).not.toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // LEFT clamp — the direct +2/+6 uur regression case.
  // now is BEFORE the first visible point → pin to 0, never null.
  // -------------------------------------------------------------------------
  describe("left clamp: now before the window's first point", () => {
    it("clamps to 0 when now precedes the first point (the +2/+6 uur regression)", () => {
      // Window starts at 09:00 (first :00 at/after now); now=08:46 is just before.
      const points = pts("09:00", "09:15", "09:30", "09:45", "10:00");
      const f = nowFraction(points, at(8, 46));
      expect(f).toBe(0);
    });

    it("returns a non-null number (not null) when now is before the window", () => {
      // This is the heart of the bug: nowLineX returned null here → marker gone.
      const points = pts("09:00", "09:15", "09:30", "09:45");
      const f = nowFraction(points, at(8, 46));
      expect(f).not.toBeNull();
      expect(typeof f).toBe("number");
    });
  });

  // -------------------------------------------------------------------------
  // RIGHT clamp — now after the last point → pin to 1.
  // -------------------------------------------------------------------------
  describe("right clamp: now after the window's last point", () => {
    it("clamps to 1 when now is after the last point", () => {
      const points = pts("09:00", "10:00", "11:00");
      const f = nowFraction(points, at(15, 0));
      expect(f).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Degenerate inputs — fewer than 2 points cannot interpolate → null.
  // -------------------------------------------------------------------------
  describe("degenerate inputs return null", () => {
    it("returns null for 0 points", () => {
      expect(nowFraction([], at(12, 0))).toBeNull();
    });

    it("returns null for exactly 1 point", () => {
      expect(nowFraction(pts("12:00"), at(12, 0))).toBeNull();
    });

    it("returns a number for exactly 2 points (the minimum interpolable set)", () => {
      const f = nowFraction(pts("12:00", "13:00"), at(12, 30));
      expect(f).not.toBeNull();
      // now=12:30 → (0 + 0.5 + 0.5)/2 = 0.5
      expect(f).toBeCloseTo(0.5, 10);
    });
  });

  // -------------------------------------------------------------------------
  // Determinism — same injected clock + points → identical output.
  // -------------------------------------------------------------------------
  describe("determinism", () => {
    it("returns the same fraction for the same inputs across repeated calls", () => {
      const points = pts("08:00", "09:00", "10:00", "11:00");
      const now = at(9, 24);
      const a = nowFraction(points, now);
      const b = nowFraction(points, now);
      expect(a).toBe(b);
      expect(a).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // DIRECT REGRESSION GUARDS — the two windows the bug broke.
  // -------------------------------------------------------------------------
  describe("regression guards: marker WOULD render on the broken windows", () => {
    it('"+2 uur" — 8 fifteen-min points starting just after now → left-pinned 0 (marker renders)', () => {
      // The +2 uur window is minutely15.slice(start, start+8) where start is the
      // first :00/:30 at/after now. now=10:46 → window starts 11:00.
      const window = pts(
        "11:00", "11:15", "11:30", "11:45",
        "12:00", "12:15", "12:30", "12:45",
      );
      const f = nowFraction(window, at(10, 46));
      expect(f).toBe(0); // pinned left — crucially NOT null, so the line draws
    });

    it('"Hele dag" — hourly 0..23 with a midday now → an interior fraction in (0,1)', () => {
      const hourly = pts(
        ...Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`),
      );
      const f = nowFraction(hourly, at(12, 0));
      expect(f).not.toBeNull();
      // now=12:00 == point index 12 → (12 + 0.5)/24 = 12.5/24 ≈ 0.5208
      expect(f).toBeCloseTo(12.5 / 24, 10);
      expect(f! > 0 && f! < 1).toBe(true);
    });
  });
});
