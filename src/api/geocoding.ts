import type { ForecastLocation } from "./openMeteo";

// Free, key-less geocoding via Open-Meteo (same provider as the forecast).
// Returns multiple candidates so the location field can show autocomplete
// suggestions. See https://open-meteo.com/en/docs/geocoding-api

type GeocodingResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
};

type GeocodingResponse = {
  results?: GeocodingResult[];
};

const SEARCH_URL = "https://geocoding-api.open-meteo.com/v1/search";

export const MIN_QUERY_LENGTH = 2;

export async function searchLocations(query: string, signal?: AbortSignal): Promise<ForecastLocation[]> {
  const search = query.trim();
  if (search.length < MIN_QUERY_LENGTH) return [];

  const params = new URLSearchParams({
    name: search,
    count: "6",
    language: "nl",
    format: "json",
  });

  const response = await fetch(`${SEARCH_URL}?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(`Geocoding request failed with status ${response.status}`);
  }

  const data = (await response.json()) as GeocodingResponse;
  if (!data.results) return [];

  return data.results.map((result) => ({
    id: `geo-${result.id}`,
    name: displayName(result),
    latitude: roundCoordinate(result.latitude),
    longitude: roundCoordinate(result.longitude),
    source: "manual" as const,
    updatedAt: Date.now(),
  }));
}

// "Haarlem, Noord-Holland, Nederland" — but kept compact: name + country,
// with the region only when it disambiguates same-named places.
export function displayName(result: GeocodingResult): string {
  const parts = [result.name];
  if (result.admin1 && result.admin1 !== result.name) parts.push(result.admin1);
  if (result.country) parts.push(result.country);
  return parts.join(", ");
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(4));
}
