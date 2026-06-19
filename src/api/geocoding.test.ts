/**
 * searchLocations — behavior-oriented tests.
 *
 * Boundary mocked: global `fetch`. No real network.
 *
 * Contract tested:
 * - Short queries (< MIN_QUERY_LENGTH) return [] without any fetch call.
 * - Query trimming: whitespace-padded short strings are also short.
 * - HTTP errors throw with a message containing the status.
 * - Empty / missing `results` returns [].
 * - Successful results are normalized to ForecastLocation with rounded
 *   coordinates and source="manual".
 * - An AbortSignal is forwarded to fetch so the caller can cancel in-flight
 *   requests (e.g. the debounced location search input).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { searchLocations, MIN_QUERY_LENGTH } from "./geocoding";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function okResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  } as unknown as Response;
}

function errorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
  } as unknown as Response;
}

/** Minimal representative Open-Meteo geocoding payload. */
function makeGeocodingPayload(overrides: Record<string, unknown> = {}) {
  return {
    results: [
      {
        id: 2756253,
        name: "Haarlem",
        latitude: 52.38739,
        longitude: 4.64592,
        country: "Netherlands",
      },
      {
        id: 12345678,
        name: "Amsterdam",
        latitude: 52.37403,
        longitude: 4.88969,
        country: "Netherlands",
      },
    ],
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Short-circuit: query too short
// ---------------------------------------------------------------------------

describe("searchLocations — short-circuit for short queries", () => {
  it(`returns [] without fetching when query length is less than MIN_QUERY_LENGTH (${MIN_QUERY_LENGTH})`, async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchLocations("a");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("returns [] for an empty string", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await searchLocations("")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("trims whitespace before measuring: a two-space string is below the threshold", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // "  ".trim() === "" — length 0 < MIN_QUERY_LENGTH
    expect(await searchLocations("  ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("trims a query that would be long enough only with leading/trailing spaces", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // " a" trimmed = "a" — length 1 < MIN_QUERY_LENGTH (2)
    expect(await searchLocations(" a")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it(`fetches when the query (after trim) is exactly MIN_QUERY_LENGTH (${MIN_QUERY_LENGTH}) characters`, async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(makeGeocodingPayload())));

    // MIN_QUERY_LENGTH = 2: "Ha" passes.
    await searchLocations("Ha");

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// URL construction
// ---------------------------------------------------------------------------

describe("searchLocations — URL construction", () => {
  it("requests the Open-Meteo geocoding endpoint", async () => {
    const fetchMock = vi.fn(async () => okResponse(makeGeocodingPayload()));
    vi.stubGlobal("fetch", fetchMock);

    await searchLocations("Haarlem");

    const calledUrl = new URL((fetchMock.mock.calls as unknown[][])[0][0] as string);
    expect(calledUrl.origin + calledUrl.pathname).toBe(
      "https://geocoding-api.open-meteo.com/v1/search",
    );
  });

  it("includes the trimmed search query as the `name` parameter", async () => {
    const fetchMock = vi.fn(async () => okResponse(makeGeocodingPayload()));
    vi.stubGlobal("fetch", fetchMock);

    await searchLocations("  Haarlem  ");

    const url = new URL((fetchMock.mock.calls as unknown[][])[0][0] as string);
    expect(url.searchParams.get("name")).toBe("Haarlem");
  });

  it("requests results in Dutch (`language=nl`)", async () => {
    const fetchMock = vi.fn(async () => okResponse(makeGeocodingPayload()));
    vi.stubGlobal("fetch", fetchMock);

    await searchLocations("Amsterdam");

    const url = new URL((fetchMock.mock.calls as unknown[][])[0][0] as string);
    expect(url.searchParams.get("language")).toBe("nl");
  });
});

// ---------------------------------------------------------------------------
// HTTP error handling
// ---------------------------------------------------------------------------

describe("searchLocations — HTTP errors", () => {
  it("rejects with an error message containing the status for a 500 response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => errorResponse(500)));

    await expect(searchLocations("Haarlem")).rejects.toThrow(/500/);
  });

  it("rejects for a 404 response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => errorResponse(404)));

    await expect(searchLocations("Haarlem")).rejects.toThrow(/404/);
  });

  it("propagates a network-level fetch rejection (e.g. offline)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(searchLocations("Haarlem")).rejects.toThrow(/Failed to fetch/);
  });
});

// ---------------------------------------------------------------------------
// Empty / missing results
// ---------------------------------------------------------------------------

describe("searchLocations — empty results", () => {
  it("returns [] when the response has no `results` field", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse({})));

    expect(await searchLocations("Xyzzy")).toEqual([]);
  });

  it("returns [] when `results` is an empty array", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse({ results: [] })));

    expect(await searchLocations("Xyzzy")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Result normalization
// ---------------------------------------------------------------------------

describe("searchLocations — result normalization", () => {
  it("maps results to ForecastLocation shape with source='manual'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(makeGeocodingPayload())));

    const results = await searchLocations("Haarlem");

    expect(results).toHaveLength(2);
    const first = results[0];
    expect(first.name).toBe("Haarlem");
    expect(first.source).toBe("manual");
    expect(first.id).toBe("geo-2756253");
    expect(first.country).toBe("Netherlands");
  });

  it("rounds coordinates to 4 decimal places", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(makeGeocodingPayload())));

    const results = await searchLocations("Haarlem");

    // Raw: 52.38739 → rounded 4dp = 52.3874
    expect(results[0].latitude).toBe(52.3874);
    // Raw: 4.64592 → rounded 4dp = 4.6459
    expect(results[0].longitude).toBe(4.6459);
  });

  it("includes a numeric updatedAt timestamp", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(makeGeocodingPayload())));

    const before = Date.now();
    const results = await searchLocations("Haarlem");
    const after = Date.now();

    expect(results[0].updatedAt).toBeGreaterThanOrEqual(before);
    expect(results[0].updatedAt).toBeLessThanOrEqual(after);
  });

  it("maps the result id as a prefixed string 'geo-{id}'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(makeGeocodingPayload())));

    const results = await searchLocations("Amsterdam");

    expect(results[1].id).toBe("geo-12345678");
  });

  it("carries the country field for dropdown disambiguation", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(makeGeocodingPayload())));

    const results = await searchLocations("Haarlem");

    expect(results[0].country).toBe("Netherlands");
  });

  it("tolerates a result without a country field", async () => {
    const payload = makeGeocodingPayload({
      results: [
        { id: 99, name: "NoCountry", latitude: 10.0, longitude: 20.0 },
      ],
    });
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(payload)));

    const results = await searchLocations("NoCountry");

    expect(results).toHaveLength(1);
    expect(results[0].country).toBeUndefined();
    expect(results[0].name).toBe("NoCountry");
  });
});

// ---------------------------------------------------------------------------
// Zod validation — structural error surfacing
// ---------------------------------------------------------------------------

describe("searchLocations — Zod validation error path", () => {
  it("throws a plain Error with a Dutch message when results is a string instead of an array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => okResponse({ results: "geen array" })),
    );

    await expect(searchLocations("Haarlem")).rejects.toThrow(
      "Geocoding response heeft een onverwachte structuur",
    );
  });

  it("does not leak a ZodError directly — the thrown error is a plain Error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => okResponse({ results: "geen array" })),
    );

    let caughtError: unknown;
    try {
      await searchLocations("Haarlem");
    } catch (e) {
      caughtError = e;
    }

    expect(caughtError).toBeInstanceOf(Error);
    // ZodError has a `.issues` array — a plain Error must not have one.
    expect(caughtError).not.toHaveProperty("issues");
  });

  it("throws the validation error when a result entry is missing a required field (id)", async () => {
    const payloadMissingId = {
      results: [{ name: "Haarlem", latitude: 52.387, longitude: 4.645 }],
    };
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(payloadMissingId)));

    await expect(searchLocations("Haarlem")).rejects.toThrow(
      "Geocoding response heeft een onverwachte structuur",
    );
  });

  it("throws the validation error when latitude in a result is a string", async () => {
    const payloadBadType = {
      results: [{ id: 1, name: "Haarlem", latitude: "52.387", longitude: 4.645 }],
    };
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(payloadBadType)));

    await expect(searchLocations("Haarlem")).rejects.toThrow(
      "Geocoding response heeft een onverwachte structuur",
    );
  });

  it("still succeeds and returns [] when results is absent (optional field — valid schema)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse({})));

    expect(await searchLocations("Haarlem")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// AbortSignal forwarding
// ---------------------------------------------------------------------------

describe("searchLocations — AbortSignal forwarding", () => {
  it("passes the caller-supplied signal to fetch", async () => {
    const fetchMock = vi.fn(async () => okResponse(makeGeocodingPayload()));
    vi.stubGlobal("fetch", fetchMock);

    const controller = new AbortController();
    await searchLocations("Haarlem", controller.signal);

    const passedInit = (fetchMock.mock.calls as unknown[][])[0][1] as RequestInit;
    expect(passedInit?.signal).toBe(controller.signal);
  });

  it("propagates an AbortError when the signal is already aborted before the call", async () => {
    const controller = new AbortController();
    controller.abort();

    // fetch rejects immediately with AbortError when the signal is pre-aborted.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        return okResponse(makeGeocodingPayload());
      }),
    );

    await expect(searchLocations("Haarlem", controller.signal)).rejects.toThrow(
      /Aborted/,
    );
  });

  it("passes no signal when the caller does not supply one", async () => {
    const fetchMock = vi.fn(async () => okResponse(makeGeocodingPayload()));
    vi.stubGlobal("fetch", fetchMock);

    await searchLocations("Haarlem");

    // Called with undefined or an init without signal — fetch must still be called.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const passedInit = (fetchMock.mock.calls as unknown[][])[0][1] as RequestInit | undefined;
    expect(passedInit?.signal).toBeUndefined();
  });
});
