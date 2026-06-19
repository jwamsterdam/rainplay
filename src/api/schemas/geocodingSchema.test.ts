/**
 * GeocodingResponseSchema / GeocodingResultSchema — unit tests.
 *
 * Tests the schema contracts in isolation. The error-path integration
 * (schema wired into searchLocations) is covered in geocoding.test.ts.
 */

import { describe, it, expect } from "vitest";
import { GeocodingResponseSchema, GeocodingResultSchema } from "./geocodingSchema";

// ---------------------------------------------------------------------------
// Minimal valid result factory
// ---------------------------------------------------------------------------

function makeValidResult() {
  return {
    id: 2756253,
    name: "Haarlem",
    latitude: 52.38739,
    longitude: 4.64592,
    country: "Netherlands",
  };
}

function makeValidResponse() {
  return {
    results: [makeValidResult()],
  };
}

// ---------------------------------------------------------------------------
// GeocodingResponseSchema — happy paths
// ---------------------------------------------------------------------------

describe("GeocodingResponseSchema — valid payloads", () => {
  it("accepts a response with a non-empty results array", () => {
    expect(() => GeocodingResponseSchema.parse(makeValidResponse())).not.toThrow();
  });

  it("accepts a response where results is an empty array", () => {
    expect(() => GeocodingResponseSchema.parse({ results: [] })).not.toThrow();
  });

  it("accepts a response where results is omitted entirely (field is optional)", () => {
    expect(() => GeocodingResponseSchema.parse({})).not.toThrow();
  });

  it("sets results to undefined when the field is absent", () => {
    const result = GeocodingResponseSchema.parse({});

    expect(result.results).toBeUndefined();
  });

  it("accepts multiple results in the array", () => {
    const payload = {
      results: [
        makeValidResult(),
        { id: 99, name: "Amsterdam", latitude: 52.374, longitude: 4.89, country: "Netherlands" },
      ],
    };

    expect(() => GeocodingResponseSchema.parse(payload)).not.toThrow();
  });

  it("strips unknown top-level fields", () => {
    const payload = { ...makeValidResponse(), generationtime_ms: 1.23 };

    const result = GeocodingResponseSchema.parse(payload);

    expect(result).not.toHaveProperty("generationtime_ms");
  });
});

// ---------------------------------------------------------------------------
// GeocodingResponseSchema — type violations
// ---------------------------------------------------------------------------

describe("GeocodingResponseSchema — type violations", () => {
  it("rejects when results is a string instead of an array", () => {
    expect(() =>
      GeocodingResponseSchema.parse({ results: "geen array" }),
    ).toThrow();
  });

  it("rejects when results is a plain object instead of an array", () => {
    expect(() =>
      GeocodingResponseSchema.parse({ results: { id: 1 } }),
    ).toThrow();
  });

  it("rejects when results is a number", () => {
    expect(() =>
      GeocodingResponseSchema.parse({ results: 42 }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// GeocodingResultSchema — happy paths
// ---------------------------------------------------------------------------

describe("GeocodingResultSchema — valid results", () => {
  it("accepts a complete result with all fields", () => {
    expect(() => GeocodingResultSchema.parse(makeValidResult())).not.toThrow();
  });

  it("accepts a result where country is omitted (field is optional)", () => {
    const { country: _omitted, ...resultWithoutCountry } = makeValidResult();

    expect(() => GeocodingResultSchema.parse(resultWithoutCountry)).not.toThrow();
  });

  it("sets country to undefined when omitted", () => {
    const { country: _omitted, ...resultWithoutCountry } = makeValidResult();

    const result = GeocodingResultSchema.parse(resultWithoutCountry);

    expect(result.country).toBeUndefined();
  });

  it("accepts fractional coordinate values", () => {
    const result = GeocodingResultSchema.parse(makeValidResult());

    expect(result.latitude).toBeCloseTo(52.38739);
    expect(result.longitude).toBeCloseTo(4.64592);
  });
});

// ---------------------------------------------------------------------------
// GeocodingResultSchema — required fields missing → must reject
// ---------------------------------------------------------------------------

describe("GeocodingResultSchema — required fields missing", () => {
  it("rejects when id is absent", () => {
    const { id: _omitted, ...withoutId } = makeValidResult();

    expect(() => GeocodingResultSchema.parse(withoutId)).toThrow();
  });

  it("rejects when name is absent", () => {
    const { name: _omitted, ...withoutName } = makeValidResult();

    expect(() => GeocodingResultSchema.parse(withoutName)).toThrow();
  });

  it("rejects when latitude is absent", () => {
    const { latitude: _omitted, ...withoutLat } = makeValidResult();

    expect(() => GeocodingResultSchema.parse(withoutLat)).toThrow();
  });

  it("rejects when longitude is absent", () => {
    const { longitude: _omitted, ...withoutLon } = makeValidResult();

    expect(() => GeocodingResultSchema.parse(withoutLon)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// GeocodingResultSchema — type violations
// ---------------------------------------------------------------------------

describe("GeocodingResultSchema — type violations", () => {
  it("rejects when latitude is a string instead of a number", () => {
    const payload = { ...makeValidResult(), latitude: "52.38739" };

    expect(() => GeocodingResultSchema.parse(payload)).toThrow();
  });

  it("rejects when longitude is a string instead of a number", () => {
    const payload = { ...makeValidResult(), longitude: "4.64592" };

    expect(() => GeocodingResultSchema.parse(payload)).toThrow();
  });

  it("rejects when id is a string instead of a number", () => {
    const payload = { ...makeValidResult(), id: "2756253" };

    expect(() => GeocodingResultSchema.parse(payload)).toThrow();
  });

  it("rejects when name is a number instead of a string", () => {
    const payload = { ...makeValidResult(), name: 42 };

    expect(() => GeocodingResultSchema.parse(payload)).toThrow();
  });

  it("rejects an empty object — all required fields are absent", () => {
    expect(() => GeocodingResultSchema.parse({})).toThrow();
  });

  it("rejects a null payload", () => {
    expect(() => GeocodingResultSchema.parse(null)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Integration: results array containing an invalid entry
// ---------------------------------------------------------------------------

describe("GeocodingResponseSchema — invalid entry inside results array", () => {
  it("rejects the response when a result has latitude as a string", () => {
    const payload = {
      results: [{ ...makeValidResult(), latitude: "52.38739" }],
    };

    expect(() => GeocodingResponseSchema.parse(payload)).toThrow();
  });

  it("rejects the response when a result is missing its id", () => {
    const { id: _omitted, ...noId } = makeValidResult();
    const payload = { results: [noId] };

    expect(() => GeocodingResponseSchema.parse(payload)).toThrow();
  });
});
