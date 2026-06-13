/**
 * useCurrentLocation — reverse-geocoding branch tests.
 *
 * These tests exercise the code path where hasGoogleMapsKey() returns true
 * and reverseGeocodeLocation is called to enrich the GPS fix with a human-
 * readable place name.
 *
 * Separated from useCurrentLocation.test.tsx because that file does NOT mock
 * the googleMaps module (it exercises the no-key path only), and adding a
 * vi.mock there would require restructuring all existing tests. Keeping them
 * in a sibling file preserves the existing suite while adding the missing
 * coverage.
 *
 * Mock boundary: ../api/googleMaps — the geolocation browser API is stubbed
 * via navigator.geolocation, matching the pattern in the base test file.
 */

import { renderHook, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { locationStatusAtom, selectedLocationAtom } from "../state/weatherAtoms";
import { useCurrentLocation } from "./useCurrentLocation";

// ---------------------------------------------------------------------------
// Mock the googleMaps module at the boundary (hoisted before imports resolve).
// ---------------------------------------------------------------------------

vi.mock("../api/googleMaps", () => ({
  hasGoogleMapsKey: vi.fn(),
  reverseGeocodeLocation: vi.fn(),
}));

import { hasGoogleMapsKey, reverseGeocodeLocation } from "../api/googleMaps";
const mockHasKey = vi.mocked(hasGoogleMapsKey);
const mockReverseGeocode = vi.mocked(reverseGeocodeLocation);

// ---------------------------------------------------------------------------
// Helpers (mirrored from the base test file)
// ---------------------------------------------------------------------------

function makeWrapper() {
  const store = createStore();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }
  return { store, Wrapper };
}

function stubGeolocationSuccess(lat: number, lng: number) {
  const position = {
    coords: { latitude: lat, longitude: lng, accuracy: 10 },
  } as GeolocationPosition;

  Object.defineProperty(globalThis.navigator, "geolocation", {
    value: {
      getCurrentPosition: vi.fn((success) => success(position)),
    },
    configurable: true,
    writable: true,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockHasKey.mockReset();
  mockReverseGeocode.mockReset();
});

afterEach(() => {
  Object.defineProperty(globalThis.navigator, "geolocation", {
    value: undefined,
    configurable: true,
    writable: true,
  });
  vi.clearAllMocks();
});

describe("useCurrentLocation — with Google Maps key", () => {
  it("uses reverseGeocodeLocation to set the location name on a successful GPS fix", async () => {
    mockHasKey.mockReturnValue(true);
    mockReverseGeocode.mockResolvedValue("Amsterdam");
    stubGeolocationSuccess(52.3676, 4.9041);

    const { store, Wrapper } = makeWrapper();
    renderHook(() => useCurrentLocation(), { wrapper: Wrapper });

    await waitFor(() => expect(store.get(locationStatusAtom)).toBe("ready"));

    const location = store.get(selectedLocationAtom);
    expect(location.name).toBe("Amsterdam");
    expect(mockReverseGeocode).toHaveBeenCalledTimes(1);
    expect(mockReverseGeocode).toHaveBeenCalledWith(52.3676, 4.9041);
  });

  it('falls back to "Huidige locatie" when reverseGeocodeLocation throws', async () => {
    mockHasKey.mockReturnValue(true);
    mockReverseGeocode.mockRejectedValue(new Error("API error"));
    stubGeolocationSuccess(52.3676, 4.9041);

    const { store, Wrapper } = makeWrapper();
    renderHook(() => useCurrentLocation(), { wrapper: Wrapper });

    await waitFor(() => expect(store.get(locationStatusAtom)).toBe("ready"));

    const location = store.get(selectedLocationAtom);
    expect(location.name).toBe("Huidige locatie");
  });

  it("still sets status to 'ready' even when reverseGeocodeLocation throws", async () => {
    mockHasKey.mockReturnValue(true);
    mockReverseGeocode.mockRejectedValue(new Error("timeout"));
    stubGeolocationSuccess(52.1, 4.5);

    const { store, Wrapper } = makeWrapper();
    renderHook(() => useCurrentLocation(), { wrapper: Wrapper });

    await waitFor(() => expect(store.get(locationStatusAtom)).toBe("ready"));
  });

  it("passes rounded coordinates (4 dp) to reverseGeocodeLocation", async () => {
    mockHasKey.mockReturnValue(true);
    mockReverseGeocode.mockResolvedValue("Utrecht");
    stubGeolocationSuccess(52.123456789, 5.987654321);

    const { store, Wrapper } = makeWrapper();
    renderHook(() => useCurrentLocation(), { wrapper: Wrapper });

    await waitFor(() => expect(store.get(locationStatusAtom)).toBe("ready"));

    expect(mockReverseGeocode).toHaveBeenCalledWith(52.1235, 5.9877);
  });

  it("does not call reverseGeocodeLocation when hasGoogleMapsKey returns false", async () => {
    mockHasKey.mockReturnValue(false);
    stubGeolocationSuccess(52.3676, 4.9041);

    const { store, Wrapper } = makeWrapper();
    renderHook(() => useCurrentLocation(), { wrapper: Wrapper });

    await waitFor(() => expect(store.get(locationStatusAtom)).toBe("ready"));

    expect(mockReverseGeocode).not.toHaveBeenCalled();
    expect(store.get(selectedLocationAtom).name).toBe("Huidige locatie");
  });
});
