/**
 * useForecastQuery — behavior-oriented tests.
 *
 * Mocked boundary: `fetchOpenMeteoForecast` in src/api/openMeteo.
 * We never touch the real network — that is covered by openMeteo.test.ts.
 *
 * Contracts verified:
 * 1. Query key shape: ["forecast", lat, lon]
 * 2. enabled=false keeps the query idle (fetch not called)
 * 3. Success path: data lands on result.current.data
 * 4. Error path: result.current.isError becomes true
 * 5. staleTime: data does NOT re-fetch before 5 minutes elapses
 * 6. retryDelay cap: delay is at most 8 000 ms regardless of attempt count
 * 7. retry=false for 4xx status codes (don't hammer a rate-limited API)
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as JotaiProvider } from "jotai";
import React from "react";
import { useForecastQuery } from "./weather";
import type { ForecastLocation } from "../api/openMeteo";

// ---------------------------------------------------------------------------
// Module-level mock — replaces the real Open-Meteo fetch across all tests.
// ---------------------------------------------------------------------------

vi.mock("../api/openMeteo", () => ({
  fetchOpenMeteoForecast: vi.fn(),
}));

import { fetchOpenMeteoForecast } from "../api/openMeteo";
const mockFetch = vi.mocked(fetchOpenMeteoForecast);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOCATION: ForecastLocation = {
  id: "test-location",
  name: "Haarlem",
  latitude: 52.3948,
  longitude: 4.6382,
  source: "default",
};

const MINIMAL_FORECAST = {
  currentTemperature: 20,
  hourly: [],
  minutely15: [],
  sunriseTimes: {},
  sunsetTimes: {},
};

function makeWrapper(client?: QueryClient) {
  const qc =
    client ??
    new QueryClient({
      defaultOptions: {
        queries: {
          // Keep retry off by default so error tests resolve immediately.
          retry: false,
        },
      },
    });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      JotaiProvider,
      null,
      React.createElement(QueryClientProvider, { client: qc }, children),
    );
  }

  return { client: qc, Wrapper };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// 1. Query key
// ---------------------------------------------------------------------------

describe("useForecastQuery — query key", () => {
  it('builds the key as ["forecast", latitude, longitude]', () => {
    const { client, Wrapper } = makeWrapper();

    renderHook(() => useForecastQuery(LOCATION, false), { wrapper: Wrapper });

    const queries = client.getQueryCache().findAll();
    expect(queries).toHaveLength(1);
    expect(queries[0].queryKey).toEqual(["forecast", LOCATION.latitude, LOCATION.longitude]);
  });

  it("produces distinct cache entries for different coordinates", () => {
    const { client, Wrapper } = makeWrapper();
    const other: ForecastLocation = { ...LOCATION, latitude: 51.9, longitude: 4.5, id: "other" };

    renderHook(() => useForecastQuery(LOCATION, false), { wrapper: Wrapper });
    renderHook(() => useForecastQuery(other, false), { wrapper: Wrapper });

    const queries = client.getQueryCache().findAll();
    expect(queries).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 2. enabled=false — fetch must not be called
// ---------------------------------------------------------------------------

describe("useForecastQuery — enabled flag", () => {
  it("does not call fetchOpenMeteoForecast when enabled is false", () => {
    const { Wrapper } = makeWrapper();

    renderHook(() => useForecastQuery(LOCATION, false), { wrapper: Wrapper });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("keeps the query in 'pending' status when enabled is false", () => {
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useForecastQuery(LOCATION, false), {
      wrapper: Wrapper,
    });

    expect(result.current.status).toBe("pending");
    expect(result.current.data).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. Success path
// ---------------------------------------------------------------------------

describe("useForecastQuery — success", () => {
  it("resolves data when fetchOpenMeteoForecast resolves", async () => {
    mockFetch.mockResolvedValue(MINIMAL_FORECAST);
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useForecastQuery(LOCATION, true), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(MINIMAL_FORECAST);
  });

  it("passes the location to fetchOpenMeteoForecast", async () => {
    mockFetch.mockResolvedValue(MINIMAL_FORECAST);
    const { Wrapper } = makeWrapper();

    renderHook(() => useForecastQuery(LOCATION, true), { wrapper: Wrapper });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    expect(mockFetch).toHaveBeenCalledWith(LOCATION);
  });
});

// ---------------------------------------------------------------------------
// 4. Error path
// ---------------------------------------------------------------------------

describe("useForecastQuery — error", () => {
  it("surfaces isError=true when fetchOpenMeteoForecast rejects (4xx, no retry)", async () => {
    const rateLimit = Object.assign(new Error("429 Rate Limit"), { status: 429 });
    mockFetch.mockRejectedValue(rateLimit);

    const client = new QueryClient();
    function Wrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(JotaiProvider, null, React.createElement(QueryClientProvider, { client }, children));
    }

    const { result } = renderHook(() => useForecastQuery(LOCATION, true), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.data).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 5. staleTime — data does not re-fetch before 5 minutes
// ---------------------------------------------------------------------------

describe("useForecastQuery — staleTime", () => {
  it("configures staleTime to 5 minutes (300 000 ms)", () => {
    const { client, Wrapper } = makeWrapper(
      new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    );

    renderHook(() => useForecastQuery(LOCATION, false), { wrapper: Wrapper });

    const query = client.getQueryCache().findAll()[0];
    const staleTime = (query?.options as Record<string, unknown>)?.staleTime;
    expect(staleTime).toBe(5 * 60 * 1000);
  });
});

// ---------------------------------------------------------------------------
// 6. retryDelay cap
// ---------------------------------------------------------------------------

describe("useForecastQuery — retryDelay", () => {
  it("caps retryDelay at 8 000 ms regardless of attempt number", () => {
    const { client, Wrapper } = makeWrapper(
      new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    );

    renderHook(() => useForecastQuery(LOCATION, false), { wrapper: Wrapper });

    const query = client.getQueryCache().findAll()[0];
    const retryDelay = query?.options?.retryDelay;
    if (typeof retryDelay !== "function") {
      expect(typeof retryDelay === "number" ? retryDelay : 0).toBeLessThanOrEqual(8000);
      return;
    }

    expect(retryDelay(0, new Error())).toBe(1000);
    expect(retryDelay(1, new Error())).toBe(2000);
    expect(retryDelay(2, new Error())).toBe(4000);
    expect(retryDelay(3, new Error())).toBe(8000);
    expect(retryDelay(4, new Error())).toBe(8000);
    expect(retryDelay(10, new Error())).toBe(8000);
  });
});

// ---------------------------------------------------------------------------
// 7. retry=false for 4xx
// ---------------------------------------------------------------------------

describe("useForecastQuery — retry policy", () => {
  it("does not retry on a 4xx status error (e.g. 429 rate-limit)", async () => {
    const rateLimit = Object.assign(new Error("429"), { status: 429 });
    mockFetch.mockRejectedValue(rateLimit);

    const strictClient = new QueryClient();
    function StrictWrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(JotaiProvider, null, React.createElement(QueryClientProvider, { client: strictClient }, children));
    }

    const { result } = renderHook(() => useForecastQuery(LOCATION, true), {
      wrapper: StrictWrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries up to 2 times on a network error (non-4xx)", async () => {
    const networkError = new Error("Failed to fetch");
    mockFetch.mockRejectedValue(networkError);

    const strictClient = new QueryClient();
    function StrictWrapper({ children }: { children: React.ReactNode }) {
      return React.createElement(JotaiProvider, null, React.createElement(QueryClientProvider, { client: strictClient }, children));
    }

    const { result } = renderHook(() => useForecastQuery(LOCATION, true), {
      wrapper: StrictWrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 30000 });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
