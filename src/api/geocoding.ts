import type { ForecastLocation } from "./openMeteo";
import { GeocodingResponseSchema, type GeocodingResponse } from "./schemas/geocodingSchema";

// Free, key-less geocoding via Open-Meteo (same provider as the forecast).
// Returns multiple candidates so the location field can show autocomplete
// suggestions. See https://open-meteo.com/en/docs/geocoding-api

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

  let data: GeocodingResponse;
  try {
    data = GeocodingResponseSchema.parse(await response.json());
  } catch {
    throw new Error("Geocoding response heeft een onverwachte structuur");
  }
  if (!data.results) return [];

  return data.results.map((result) => ({
    id: `geo-${result.id}`,
    // Place name only — the header shows this verbatim. Country is kept
    // separately so the search dropdown can show "Place, Country" without
    // province/state noise.
    name: result.name,
    country: result.country,
    latitude: roundCoordinate(result.latitude),
    longitude: roundCoordinate(result.longitude),
    source: "manual" as const,
    updatedAt: Date.now(),
  }));
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(4));
}
