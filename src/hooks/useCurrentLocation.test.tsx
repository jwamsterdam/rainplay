import { renderHook, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { locationErrorAtom, locationStatusAtom, selectedLocationAtom } from "../state/weatherAtoms";
import { useCurrentLocation } from "./useCurrentLocation";

function makeWrapper() {
  const store = createStore();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }
  return { store, Wrapper };
}

function stubGeolocation(impl: Partial<Geolocation>) {
  Object.defineProperty(globalThis.navigator, "geolocation", {
    value: impl,
    configurable: true,
    writable: true,
  });
}

function successPosition(lat: number, lng: number): GeolocationPosition {
  return { coords: { latitude: lat, longitude: lng, accuracy: 10 } } as GeolocationPosition;
}

beforeEach(() => {
  vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  Object.defineProperty(globalThis.navigator, "geolocation", {
    value: undefined,
    configurable: true,
    writable: true,
  });
});

describe("useCurrentLocation", () => {
  it("sets status to 'unsupported' when geolocation is not available in this browser", async () => {
    // jsdom does not expose navigator.geolocation by default → unsupported path
    const { store, Wrapper } = makeWrapper();
    renderHook(() => useCurrentLocation(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(store.get(locationStatusAtom)).toBe("unsupported");
    });
    expect(store.get(locationErrorAtom)).toMatch(/niet ondersteund/i);
  });

  it("sets status to 'denied' when the user rejects the permission prompt", async () => {
    stubGeolocation({
      getCurrentPosition: vi.fn((_success, error) => {
        error({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError);
      }),
    });
    const { store, Wrapper } = makeWrapper();
    renderHook(() => useCurrentLocation(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(store.get(locationStatusAtom)).toBe("denied");
    });
    expect(store.get(locationErrorAtom)).toMatch(/locatietoegang/i);
  });

  it("sets status to 'error' on other geolocation failures (e.g. position unavailable)", async () => {
    stubGeolocation({
      getCurrentPosition: vi.fn((_success, error) => {
        // code=2 (POSITION_UNAVAILABLE) is not PERMISSION_DENIED
        error({ code: 2, PERMISSION_DENIED: 1 } as GeolocationPositionError);
      }),
    });
    const { store, Wrapper } = makeWrapper();
    renderHook(() => useCurrentLocation(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(store.get(locationStatusAtom)).toBe("error");
    });
    expect(store.get(locationErrorAtom)).toMatch(/lukte niet/i);
  });

  it("sets status to 'ready' and writes GPS coordinates on a successful fix", async () => {
    // VITE_GOOGLE_MAPS_API_KEY is absent in tests → hasGoogleMapsKey() = false → name stays default
    stubGeolocation({
      getCurrentPosition: vi.fn((success) => {
        success(successPosition(52.3676, 4.9041));
      }),
    });
    const { store, Wrapper } = makeWrapper();
    renderHook(() => useCurrentLocation(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(store.get(locationStatusAtom)).toBe("ready");
    });

    const location = store.get(selectedLocationAtom);
    expect(location.latitude).toBe(52.3676);
    expect(location.longitude).toBe(4.9041);
    expect(location.source).toBe("gps");
    expect(location.name).toBe("Huidige locatie");
  });

  it("rounds GPS coordinates to 4 decimal places before writing to the atom", async () => {
    stubGeolocation({
      getCurrentPosition: vi.fn((success) => {
        success(successPosition(52.123456789, 4.987654321));
      }),
    });
    const { store, Wrapper } = makeWrapper();
    renderHook(() => useCurrentLocation(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(store.get(locationStatusAtom)).toBe("ready");
    });

    const location = store.get(selectedLocationAtom);
    expect(location.latitude).toBe(52.1235);
    expect(location.longitude).toBe(4.9877);
  });

  it("does not call geolocation a second time on re-render (mount guard)", async () => {
    const getCurrentPosition = vi.fn((success) => {
      success(successPosition(52, 4));
    });
    stubGeolocation({ getCurrentPosition });
    const { Wrapper } = makeWrapper();
    const { rerender } = renderHook(() => useCurrentLocation(), { wrapper: Wrapper });
    rerender();

    await waitFor(() => {
      expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    });
  });
});
