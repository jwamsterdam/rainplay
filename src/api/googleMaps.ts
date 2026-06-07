import type { ForecastLocation } from "./openMeteo";

type GoogleGeocodeResponse = {
  status: string;
  error_message?: string;
  results: Array<{
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
};

const GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json";

export function hasGoogleMapsKey() {
  return googleMapsKey().length > 0;
}

export async function geocodeLocation(query: string): Promise<ForecastLocation> {
  const search = query.trim();
  if (!search) throw new Error("Vul een plaats of adres in.");

  const data = await fetchGeocode({
    address: search,
    language: "nl",
  });
  const result = data.results[0];

  if (!result) throw new Error("Locatie niet gevonden.");

  return {
    id: `manual-${Date.now()}`,
    name: displayNameFor(result),
    latitude: roundCoordinate(result.geometry.location.lat),
    longitude: roundCoordinate(result.geometry.location.lng),
    source: "manual",
    updatedAt: Date.now(),
  };
}

export async function reverseGeocodeLocation(latitude: number, longitude: number): Promise<string> {
  const data = await fetchGeocode({
    latlng: `${latitude},${longitude}`,
    language: "nl",
  });
  const result = data.results[0];

  if (!result) throw new Error("Plaatsnaam niet gevonden.");

  return displayNameFor(result);
}

async function fetchGeocode(params: Record<string, string>) {
  const key = googleMapsKey();
  if (!key) throw new Error("Google Maps API key ontbreekt.");

  const searchParams = new URLSearchParams({
    ...params,
    key,
  });
  const response = await fetch(`${GEOCODING_URL}?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`Google Geocoding request failed with status ${response.status}`);
  }

  const data = (await response.json()) as GoogleGeocodeResponse;

  if (data.status !== "OK") {
    throw new Error(data.error_message || `Google Geocoding status: ${data.status}`);
  }

  return data;
}

function displayNameFor(result: GoogleGeocodeResponse["results"][number]) {
  const component =
    componentByType(result, "locality") ||
    componentByType(result, "postal_town") ||
    componentByType(result, "administrative_area_level_2") ||
    componentByType(result, "administrative_area_level_1");

  return component?.long_name || result.formatted_address.split(",")[0] || "Nieuwe locatie";
}

function componentByType(result: GoogleGeocodeResponse["results"][number], type: string) {
  return result.address_components.find((component) => component.types.includes(type));
}

function googleMapsKey() {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  return key === "zet-je-google-api-key-hier" ? "" : key;
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(4));
}
