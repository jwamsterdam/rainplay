import type { ForecastPoint, HourlyWeather, WeatherKind } from "../types";
import { outdoorScore } from "../lib/outdoorScore";

export type ForecastLocation = {
  id?: string;
  name: string;
  // Country name, used only to disambiguate in the search dropdown — never shown
  // in the header (which shows the place name alone).
  country?: string;
  latitude: number;
  longitude: number;
  source: "default" | "gps" | "manual";
  updatedAt?: number;
};

export type Forecast = {
  currentTemperature: number;
  hourly: HourlyWeather[];
  minutely15: ForecastPoint[];
  // date string (YYYY-MM-DD) → time string (HH:MM)
  sunriseTimes: Record<string, string>;
  sunsetTimes: Record<string, string>;
};

type OpenMeteoResponse = {
  daily: {
    time: string[];
    sunrise: string[];
    sunset: string[];
  };
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    precipitation: number;
    rain: number;
    showers: number;
    weather_code: number;
    cloud_cover: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation: number[];
    precipitation_probability: number[];
    rain: number[];
    showers: number[];
    cloud_cover: number[];
    shortwave_radiation: number[];
    sunshine_duration: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    is_day: number[];
  };
  minutely_15?: {
    time: string[];
    precipitation: number[];
    rain: number[];
    showers: number[];
    weather_code: number[];
    cloud_cover: number[];
    shortwave_radiation: number[];
    is_day: number[];
  };
};

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// Abort a stalled request after this long so the query rejects instead of
// hanging forever in "loading". ~10s is generous for a mobile radio yet still
// surfaces a real outage reasonably fast.
const FETCH_TIMEOUT_MS = 10_000;

export async function fetchOpenMeteoForecast(location: ForecastLocation): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "precipitation",
      "rain",
      "showers",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
      "wind_gusts_10m",
    ].join(","),
    hourly: [
      "temperature_2m",
      "apparent_temperature",
      "precipitation",
      "precipitation_probability",
      "rain",
      "showers",
      "cloud_cover",
      "shortwave_radiation",
      "sunshine_duration",
      "weather_code",
      "wind_speed_10m",
      "wind_gusts_10m",
      "is_day",
    ].join(","),
    minutely_15: [
      "precipitation",
      "rain",
      "showers",
      "weather_code",
      "cloud_cover",
      "shortwave_radiation",
      "is_day",
    ].join(","),
    daily: "sunrise,sunset",
    forecast_minutely_15: "24",
    forecast_days: "7",
    timezone: "auto",
  });

  // Bound the request: a plain fetch with no timeout can hang forever on a
  // flaky/just-woken mobile radio (the promise never settles), which leaves the
  // forecast query stuck in "loading" with no recovery. Abort after a timeout so
  // it REJECTS and the query can reach an error state (and retry).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${FORECAST_URL}?${params.toString()}`, { signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Open-Meteo request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    // Attach the HTTP status so the query layer can decide NOT to retry 4xx
    // (e.g. 429 rate-limit) — retrying a rate-limited request only adds load.
    const error = new Error(`Open-Meteo request failed with status ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  const data = (await response.json()) as OpenMeteoResponse;

  const sunriseTimes: Record<string, string> = {};
  const sunsetTimes: Record<string, string> = {};
  data.daily.time.forEach((date, i) => {
    sunriseTimes[date] = formatHour(data.daily.sunrise[i]);
    sunsetTimes[date] = formatHour(data.daily.sunset[i]);
  });

  return {
    currentTemperature: Math.round(data.current.temperature_2m),
    hourly: data.hourly.time.map((time, index) => toHourlyWeather(data, index, time)),
    minutely15: data.minutely_15?.time.map((time, index) => toMinutelyWeather(data, index, time)) ?? [],
    sunriseTimes,
    sunsetTimes,
  };
}

function toHourlyWeather(data: OpenMeteoResponse, index: number, isoTime: string): HourlyWeather {
  const precipitationMm = valueAt(data.hourly.precipitation, index);
  const precipitationProbability = valueAt(data.hourly.precipitation_probability, index);
  const cloudCover = valueAt(data.hourly.cloud_cover, index);
  const radiation = valueAt(data.hourly.shortwave_radiation, index);
  const temperatureC = valueAt(data.hourly.temperature_2m, index);
  const weatherCode = valueAt(data.hourly.weather_code, index);
  const isDay = valueAt(data.hourly.is_day, index) === 1;
  const kind = weatherKind(weatherCode, precipitationMm, cloudCover, radiation, isDay);

  return {
    isoTime,
    time: formatHour(isoTime),
    temperatureC,
    score: outdoorScore({ precipitationMm, temperatureC, kind, isDay }),
    precipitationMm,
    precipitationProbability,
    cloudCover,
    radiation,
    isDay,
    kind,
  };
}

function toMinutelyWeather(data: OpenMeteoResponse, index: number, isoTime: string): ForecastPoint {
  const nearestHourlyIndex = nearestHourlyIndexFor(data.hourly.time, isoTime);
  const precipitationMm = valueAt(data.minutely_15?.precipitation ?? [], index);
  const cloudCover = valueAt(data.minutely_15?.cloud_cover ?? [], index);
  const radiation = valueAt(data.minutely_15?.shortwave_radiation ?? [], index);
  const weatherCode = valueAt(data.minutely_15?.weather_code ?? [], index);
  const isDay = valueAt(data.minutely_15?.is_day ?? [], index) === 1;
  const precipitationProbability = valueAt(data.hourly.precipitation_probability, nearestHourlyIndex);
  const temperatureC = valueAt(data.hourly.temperature_2m, nearestHourlyIndex);
  const kind = weatherKind(weatherCode, precipitationMm, cloudCover, radiation, isDay);

  return {
    isoTime,
    time: formatHour(isoTime),
    temperatureC,
    score: outdoorScore({ precipitationMm, temperatureC, kind, isDay }),
    precipitationMm,
    precipitationProbability,
    cloudCover,
    radiation,
    isDay,
    kind,
  };
}

function nearestHourlyIndexFor(hourlyTimes: string[], isoTime: string): number {
  const target = new Date(isoTime).getTime();
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  hourlyTimes.forEach((hourlyTime, index) => {
    const distance = Math.abs(new Date(hourlyTime).getTime() - target);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function valueAt(values: number[], index: number): number {
  return Number.isFinite(values[index]) ? values[index] : 0;
}

function formatHour(isoTime: string): string {
  const [, time = ""] = isoTime.split("T");
  return time.slice(0, 5);
}

function weatherKind(
  weatherCode: number,
  precipitationMm: number,
  cloudCover: number,
  radiation: number,
  isDay: boolean,
): WeatherKind {
  if (precipitationMm >= 0.2 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weatherCode)) {
    return "rain";
  }

  if (!isDay || radiation < 80) return "cloud";
  if (cloudCover < 28) return "sun";
  if (cloudCover < 72) return "partly";
  return "cloud";
}
