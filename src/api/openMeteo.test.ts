/**
 * fetchOpenMeteoForecast — behavior-oriented tests.
 *
 * Boundary mocked: global `fetch`. No real network. The function builds an
 * Open-Meteo URL, throws on a non-OK response, and otherwise normalizes the
 * JSON into the app's Forecast shape.
 *
 * THE BUG THIS FILE GUARDS AGAINST
 * --------------------------------
 * On a flaky / just-woken mobile radio a plain `await fetch(url)` can hang
 * forever (TCP stall): the promise never resolves AND never rejects. TanStack
 * Query then stays `pending` forever, `retry: 1` never fires (retry only
 * happens on rejection), and the UI is stuck on "Weer laden" with no recovery.
 *
 * The "timeout / abort" describe block below encodes the contract the fix
 * satisfies: fetchOpenMeteoForecast gives up after a bounded time and REJECTS,
 * so the query can transition pending → error and the user gets a recoverable
 * state. (These were `.fails` pending the fix; the AbortController + timeout is
 * now implemented, so they assert hard.)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchOpenMeteoForecast, type ForecastLocation } from "./openMeteo";

const LOCATION: ForecastLocation = {
  id: "haarlem-default",
  name: "Haarlem",
  latitude: 52.3948,
  longitude: 4.6382,
  source: "default",
};

/**
 * A representative, minimal-but-complete Open-Meteo payload:
 * - 2 daily entries (sunrise/sunset mapping)
 * - 3 hourly entries
 * - 2 minutely_15 entries
 * Values chosen so normalization is checkable (rounding, kind, formatHour).
 */
function makePayload(overrides: Record<string, unknown> = {}) {
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
      time: ["2026-06-11T12:00", "2026-06-11T13:00", "2026-06-11T14:00"],
      temperature_2m: [19, 20, 21],
      apparent_temperature: [18, 19, 20],
      precipitation: [0, 0.5, 0],
      precipitation_probability: [5, 60, 10],
      rain: [0, 0.5, 0],
      showers: [0, 0, 0],
      cloud_cover: [10, 90, 50],
      shortwave_radiation: [600, 100, 400],
      sunshine_duration: [3600, 600, 1800],
      weather_code: [1, 61, 2],
      wind_speed_10m: [8, 12, 9],
      wind_gusts_10m: [14, 20, 16],
      is_day: [1, 1, 1],
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
    ...overrides,
  };
}

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Success + normalization
// ---------------------------------------------------------------------------
describe("fetchOpenMeteoForecast — success & normalization", () => {
  it("requests the location's coordinates from the Open-Meteo forecast endpoint", async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      okResponse(makePayload()),
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchOpenMeteoForecast(LOCATION);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://api.open-meteo.com/v1/forecast");
    expect(url.searchParams.get("latitude")).toBe("52.3948");
    expect(url.searchParams.get("longitude")).toBe("4.6382");
  });

  it("rounds the current temperature to a whole degree", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(makePayload())));

    const forecast = await fetchOpenMeteoForecast(LOCATION);

    expect(forecast.currentTemperature).toBe(19); // 18.6 → 19
  });

  it("maps every hourly entry, preserving iso time and formatting HH:MM", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(makePayload())));

    const forecast = await fetchOpenMeteoForecast(LOCATION);

    expect(forecast.hourly).toHaveLength(3);
    expect(forecast.hourly[0].isoTime).toBe("2026-06-11T12:00");
    expect(forecast.hourly[0].time).toBe("12:00");
    expect(forecast.hourly[1].time).toBe("13:00");
    expect(forecast.hourly[0].temperatureC).toBe(19);
    expect(forecast.hourly[0].precipitationMm).toBe(0);
    expect(forecast.hourly[1].precipitationMm).toBe(0.5);
    expect(forecast.hourly[1].precipitationProbability).toBe(60);
  });

  it("classifies a rainy hour (weather_code 61 / precip ≥ 0.2) as kind 'rain'", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(makePayload())));

    const forecast = await fetchOpenMeteoForecast(LOCATION);

    // hour index 1: weather_code 61 + 0.5mm precip → rain
    expect(forecast.hourly[1].kind).toBe("rain");
    // hour index 0: code 1, bright (radiation 600), low cloud (10) → sun
    expect(forecast.hourly[0].kind).toBe("sun");
  });

  it("builds sunrise/sunset lookups keyed by date with HH:MM values", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(makePayload())));

    const forecast = await fetchOpenMeteoForecast(LOCATION);

    expect(forecast.sunriseTimes["2026-06-11"]).toBe("05:21");
    expect(forecast.sunsetTimes["2026-06-11"]).toBe("22:02");
    expect(forecast.sunriseTimes["2026-06-12"]).toBe("05:20");
    expect(forecast.sunsetTimes["2026-06-12"]).toBe("22:03");
  });

  it("maps minutely_15 points when present", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(makePayload())));

    const forecast = await fetchOpenMeteoForecast(LOCATION);

    expect(forecast.minutely15).toHaveLength(2);
    expect(forecast.minutely15[0].isoTime).toBe("2026-06-11T12:00");
    expect(forecast.minutely15[1].time).toBe("12:15");
    expect(forecast.minutely15[1].precipitationMm).toBe(0.3);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe("fetchOpenMeteoForecast — edge cases", () => {
  it("returns an empty minutely15 array when the payload omits minutely_15", async () => {
    const payload = makePayload();
    delete (payload as Record<string, unknown>).minutely_15;
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(payload)));

    const forecast = await fetchOpenMeteoForecast(LOCATION);

    expect(forecast.minutely15).toEqual([]);
    // hourly must still be fully populated.
    expect(forecast.hourly).toHaveLength(3);
  });

  it("does not throw and yields no hourly entries when hourly.time is empty", async () => {
    const payload = makePayload({
      hourly: { ...makePayload().hourly, time: [] },
    });
    vi.stubGlobal("fetch", vi.fn(async () => okResponse(payload)));

    const forecast = await fetchOpenMeteoForecast(LOCATION);

    expect(forecast.hourly).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// HTTP error surfacing — must reject so the query reaches its error state
// ---------------------------------------------------------------------------
describe("fetchOpenMeteoForecast — HTTP errors", () => {
  it("rejects when the response is not ok (e.g. 500), including the status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => errorResponse(500)));

    await expect(fetchOpenMeteoForecast(LOCATION)).rejects.toThrow(/500/);
  });

  it("rejects when the response is a 429 rate-limit", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => errorResponse(429)));

    await expect(fetchOpenMeteoForecast(LOCATION)).rejects.toThrow(/429/);
  });

  it("attaches the HTTP status to the thrown error so the query can skip retrying 4xx", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => errorResponse(429)));

    await expect(fetchOpenMeteoForecast(LOCATION)).rejects.toMatchObject({ status: 429 });
  });

  it("propagates a network rejection (fetch itself rejecting)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(fetchOpenMeteoForecast(LOCATION)).rejects.toThrow(/Failed to fetch/);
  });
});

// ---------------------------------------------------------------------------
// TIMEOUT / ABORT CONTRACT
// ---------------------------------------------------------------------------
//
// The production fix bounds the request: fetchOpenMeteoForecast passes an
// AbortSignal to fetch() and aborts after FETCH_TIMEOUT_MS, rejecting (not
// hanging) so TanStack Query transitions pending → error and retry can fire.
// The timer is cleared on settle so a successful request is never aborted late.
//
// The tests below use fake timers + a fetch that respects AbortSignal so they
// are deterministic and do not depend on wall-clock time.
// ---------------------------------------------------------------------------
describe("fetchOpenMeteoForecast — timeout / abort contract", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * A fetch that NEVER resolves on its own, but rejects with an AbortError as
   * soon as the passed AbortSignal fires — i.e. a faithful stand-in for a
   * stalled mobile request that only the client-side timeout can unstick.
   */
  function abortAwareHangingFetch() {
    return vi.fn((_url: string, init?: { signal?: AbortSignal }) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) return; // hangs forever if no signal passed (current bug)
        if (signal.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        signal.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
  }

  it(
    "rejects within a bounded timeout when the request never settles",
    async () => {
      vi.stubGlobal("fetch", abortAwareHangingFetch());

      const promise = fetchOpenMeteoForecast(LOCATION);
      // Attach a rejection handler immediately so an unhandled rejection is not
      // reported between the throw and the assertion.
      const assertion = expect(promise).rejects.toThrow();

      // Advance well past any reasonable client timeout (≤ 12s expected).
      await vi.advanceTimersByTimeAsync(15000);

      await assertion;
    },
  );

  it("passes an AbortSignal to fetch", async () => {
    const fetchMock = abortAwareHangingFetch();
    vi.stubGlobal("fetch", fetchMock);

    void fetchOpenMeteoForecast(LOCATION).catch(() => {});
    await vi.advanceTimersByTimeAsync(0);

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});
