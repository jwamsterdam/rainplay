/**
 * OpenMeteoResponseSchema — unit tests for the Zod validation schema.
 *
 * Tests the schema contract in isolation: which payloads are accepted,
 * which are rejected, and that optional fields are truly optional.
 * The error-path integration (the schema wired into fetchOpenMeteoForecast)
 * is covered separately in openMeteo.test.ts.
 */

import { describe, it, expect } from "vitest";
import { OpenMeteoResponseSchema } from "./openMeteoSchema";

// ---------------------------------------------------------------------------
// Minimal valid payload factory
// ---------------------------------------------------------------------------

function makeValidPayload() {
  return {
    daily: {
      time: ["2026-06-11", "2026-06-12"],
      sunrise: ["2026-06-11T05:21", "2026-06-12T05:20"],
      sunset: ["2026-06-11T22:02", "2026-06-12T22:03"],
    },
    current: {
      temperature_2m: 18.6,
      apparent_temperature: 17.9,
      precipitation: 0,
      rain: 0,
      showers: 0,
      weather_code: 1,
      cloud_cover: 20,
      wind_speed_10m: 8,
      wind_gusts_10m: 14,
    },
    hourly: {
      time: ["2026-06-11T12:00", "2026-06-11T13:00"],
      temperature_2m: [19, 20],
      apparent_temperature: [18, 19],
      precipitation: [0, 0.5],
      precipitation_probability: [5, 60],
      rain: [0, 0.5],
      showers: [0, 0],
      cloud_cover: [10, 90],
      shortwave_radiation: [600, 100],
      sunshine_duration: [3600, 600],
      weather_code: [1, 61],
      wind_speed_10m: [8, 12],
      wind_gusts_10m: [14, 20],
      is_day: [1, 1],
    },
    minutely_15: {
      time: ["2026-06-11T12:00", "2026-06-11T12:15"],
      precipitation: [0, 0.3],
      rain: [0, 0.3],
      showers: [0, 0],
      weather_code: [1, 61],
      cloud_cover: [10, 80],
      shortwave_radiation: [600, 120],
      is_day: [1, 1],
    },
  };
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("OpenMeteoResponseSchema — valid payloads", () => {
  it("accepts a complete, representative Open-Meteo response", () => {
    expect(() => OpenMeteoResponseSchema.parse(makeValidPayload())).not.toThrow();
  });

  it("returns a typed object with the expected top-level keys", () => {
    const result = OpenMeteoResponseSchema.parse(makeValidPayload());

    expect(result).toHaveProperty("daily");
    expect(result).toHaveProperty("current");
    expect(result).toHaveProperty("hourly");
    expect(result).toHaveProperty("minutely_15");
  });

  it("accepts the payload when minutely_15 is omitted (field is optional)", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).minutely_15;

    expect(() => OpenMeteoResponseSchema.parse(payload)).not.toThrow();
  });

  it("sets minutely_15 to undefined when omitted", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).minutely_15;

    const result = OpenMeteoResponseSchema.parse(payload);

    expect(result.minutely_15).toBeUndefined();
  });

  it("strips unknown top-level fields (Zod default strip behaviour)", () => {
    const payload = { ...makeValidPayload(), unknownField: "should be stripped" };

    const result = OpenMeteoResponseSchema.parse(payload);

    expect(result).not.toHaveProperty("unknownField");
  });

  it("accepts hourly.time as an empty array (edge: no forecast data)", () => {
    const payload = makeValidPayload();
    payload.hourly = { ...payload.hourly, time: [] };

    expect(() => OpenMeteoResponseSchema.parse(payload)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Required fields missing → schema must reject
// ---------------------------------------------------------------------------

describe("OpenMeteoResponseSchema — required fields missing", () => {
  it("rejects when hourly.time is absent", () => {
    const payload = makeValidPayload();
    const { time: _omitted, ...hourlyWithoutTime } = payload.hourly;
    (payload as Record<string, unknown>).hourly = hourlyWithoutTime;

    expect(() => OpenMeteoResponseSchema.parse(payload)).toThrow();
  });

  it("rejects when the entire hourly block is missing", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).hourly;

    expect(() => OpenMeteoResponseSchema.parse(payload)).toThrow();
  });

  it("rejects when the current block is missing", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).current;

    expect(() => OpenMeteoResponseSchema.parse(payload)).toThrow();
  });

  it("rejects when the daily block is missing", () => {
    const payload = makeValidPayload();
    delete (payload as Record<string, unknown>).daily;

    expect(() => OpenMeteoResponseSchema.parse(payload)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Wrong types → schema must reject
// ---------------------------------------------------------------------------

describe("OpenMeteoResponseSchema — type violations", () => {
  it("rejects when current.temperature_2m is a string instead of a number", () => {
    const payload = {
      ...makeValidPayload(),
      current: { ...makeValidPayload().current, temperature_2m: "18.6" },
    };

    expect(() => OpenMeteoResponseSchema.parse(payload)).toThrow();
  });

  it("rejects when hourly.precipitation_probability contains a string value", () => {
    const payload = makeValidPayload();
    (payload.hourly as Record<string, unknown>).precipitation_probability = [5, "sixty"];

    expect(() => OpenMeteoResponseSchema.parse(payload)).toThrow();
  });

  it("rejects when minutely_15.is_day is a string array instead of number array", () => {
    const payload = makeValidPayload();
    (payload.minutely_15 as Record<string, unknown>).is_day = ["1", "0"];

    expect(() => OpenMeteoResponseSchema.parse(payload)).toThrow();
  });

  it("rejects when daily.time is a number instead of an array", () => {
    const payload = makeValidPayload();
    (payload.daily as Record<string, unknown>).time = 20260611;

    expect(() => OpenMeteoResponseSchema.parse(payload)).toThrow();
  });

  it("rejects an empty object — all required keys are absent", () => {
    expect(() => OpenMeteoResponseSchema.parse({})).toThrow();
  });

  it("rejects a null payload", () => {
    expect(() => OpenMeteoResponseSchema.parse(null)).toThrow();
  });

  it("rejects a string payload", () => {
    expect(() => OpenMeteoResponseSchema.parse("unexpected string")).toThrow();
  });
});
