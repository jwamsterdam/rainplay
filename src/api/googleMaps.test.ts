import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { geocodeLocation, hasGoogleMapsKey, reverseGeocodeLocation } from "./googleMaps";

const LOCALITY_RESPONSE = {
  status: "OK",
  results: [
    {
      formatted_address: "Amsterdam, Noord-Holland, Nederland",
      geometry: { location: { lat: 52.3676, lng: 4.9041 } },
      address_components: [
        { long_name: "Amsterdam", short_name: "Amsterdam", types: ["locality", "political"] },
        { long_name: "Noord-Holland", short_name: "NH", types: ["administrative_area_level_1"] },
      ],
    },
  ],
};

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok, status, json: () => Promise.resolve(body) }),
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "test-api-key");
  mockFetch(LOCALITY_RESPONSE);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("hasGoogleMapsKey", () => {
  it("returns true when a real key is configured", () => {
    expect(hasGoogleMapsKey()).toBe(true);
  });

  it("returns false when the key is the placeholder string", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "zet-je-google-api-key-hier");
    expect(hasGoogleMapsKey()).toBe(false);
  });

  it("returns false when the key is empty", () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    expect(hasGoogleMapsKey()).toBe(false);
  });
});

describe("geocodeLocation", () => {
  it("returns a ForecastLocation with name, coordinates, and source='manual'", async () => {
    const result = await geocodeLocation("Amsterdam");

    expect(result.name).toBe("Amsterdam");
    expect(result.latitude).toBe(52.3676);
    expect(result.longitude).toBe(4.9041);
    expect(result.source).toBe("manual");
  });

  it("rounds coordinates to 4 decimal places", async () => {
    mockFetch({
      status: "OK",
      results: [
        {
          formatted_address: "Test",
          geometry: { location: { lat: 52.123456789, lng: 4.987654321 } },
          address_components: [
            { long_name: "Test", short_name: "T", types: ["locality"] },
          ],
        },
      ],
    });

    const result = await geocodeLocation("test");

    expect(result.latitude).toBe(52.1235);
    expect(result.longitude).toBe(4.9877);
  });

  it("throws when the query is empty or whitespace", async () => {
    await expect(geocodeLocation("  ")).rejects.toThrow("Vul een plaats of adres in.");
  });

  it("throws when no results are returned", async () => {
    mockFetch({ status: "OK", results: [] });

    await expect(geocodeLocation("Nergens")).rejects.toThrow("Locatie niet gevonden.");
  });

  it("throws on non-OK API status with an error_message", async () => {
    mockFetch({ status: "REQUEST_DENIED", error_message: "API key ongeldig.", results: [] });

    await expect(geocodeLocation("test")).rejects.toThrow("API key ongeldig.");
  });

  it("throws on non-OK API status when no error_message is present", async () => {
    mockFetch({ status: "ZERO_RESULTS", results: [] });

    await expect(geocodeLocation("test")).rejects.toThrow("ZERO_RESULTS");
  });

  it("throws when the HTTP response is not ok", async () => {
    mockFetch({}, false, 403);

    await expect(geocodeLocation("test")).rejects.toThrow("403");
  });

  it("throws when no API key is configured", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");

    await expect(geocodeLocation("test")).rejects.toThrow("Google Maps API key ontbreekt.");
  });

  it("falls back to postal_town when no locality component exists", async () => {
    mockFetch({
      status: "OK",
      results: [
        {
          formatted_address: "Oxford, UK",
          geometry: { location: { lat: 51.75, lng: -1.25 } },
          address_components: [
            { long_name: "Oxford", short_name: "Oxford", types: ["postal_town"] },
          ],
        },
      ],
    });

    const result = await geocodeLocation("Oxford");

    expect(result.name).toBe("Oxford");
  });

  it("falls back to administrative_area_level_1 as last named component", async () => {
    mockFetch({
      status: "OK",
      results: [
        {
          formatted_address: "Groningen, Nederland",
          geometry: { location: { lat: 53.2, lng: 6.56 } },
          address_components: [
            { long_name: "Groningen", short_name: "GR", types: ["administrative_area_level_1"] },
          ],
        },
      ],
    });

    const result = await geocodeLocation("Groningen");

    expect(result.name).toBe("Groningen");
  });

  it("falls back to the first segment of formatted_address when no component matches", async () => {
    mockFetch({
      status: "OK",
      results: [
        {
          formatted_address: "Onbekend gebied, Land",
          geometry: { location: { lat: 10, lng: 20 } },
          address_components: [],
        },
      ],
    });

    const result = await geocodeLocation("test");

    expect(result.name).toBe("Onbekend gebied");
  });
});

describe("reverseGeocodeLocation", () => {
  it("returns a place name from coordinates", async () => {
    const name = await reverseGeocodeLocation(52.3676, 4.9041);

    expect(name).toBe("Amsterdam");
  });

  it("throws when no result is returned", async () => {
    mockFetch({ status: "OK", results: [] });

    await expect(reverseGeocodeLocation(0, 0)).rejects.toThrow("Plaatsnaam niet gevonden.");
  });

  it("throws when the HTTP response is not ok", async () => {
    mockFetch({}, false, 500);

    await expect(reverseGeocodeLocation(52, 4)).rejects.toThrow("500");
  });
});
