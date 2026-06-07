import type { ForecastPoint, HourlyWeather, WeatherKind } from "../types";

export type ForecastLocation = {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  source: "default" | "gps" | "manual";
  updatedAt?: number;
};

export type Forecast = {
  currentTemperature: number;
  hourly: HourlyWeather[];
  minutely15: ForecastPoint[];
};

type OpenMeteoResponse = {
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
    forecast_minutely_15: "24",
    forecast_days: "7",
    timezone: "auto",
  });

  const response = await fetch(`${FORECAST_URL}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed with status ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoResponse;

  return {
    currentTemperature: Math.round(data.current.temperature_2m),
    hourly: data.hourly.time.map((time, index) => toHourlyWeather(data, index, time)),
    minutely15: data.minutely_15?.time.map((time, index) => toMinutelyWeather(data, index, time)) ?? [],
  };
}

function toHourlyWeather(data: OpenMeteoResponse, index: number, isoTime: string): HourlyWeather {
  const precipitationMm = valueAt(data.hourly.precipitation, index);
  const precipitationProbability = valueAt(data.hourly.precipitation_probability, index);
  const cloudCover = valueAt(data.hourly.cloud_cover, index);
  const radiation = valueAt(data.hourly.shortwave_radiation, index);
  const windSpeed = valueAt(data.hourly.wind_speed_10m, index);
  const windGusts = valueAt(data.hourly.wind_gusts_10m, index);
  const apparentTemperature = valueAt(data.hourly.apparent_temperature, index);
  const temperatureC = valueAt(data.hourly.temperature_2m, index);
  const weatherCode = valueAt(data.hourly.weather_code, index);
  const isDay = valueAt(data.hourly.is_day, index) === 1;

  return {
    isoTime,
    time: formatHour(isoTime),
    temperatureC,
    score: outdoorScore({
      apparentTemperature,
      cloudCover,
      isDay,
      precipitationMm,
      precipitationProbability,
      radiation,
      windGusts,
      windSpeed,
    }),
    precipitationMm,
    precipitationProbability,
    cloudCover,
    radiation,
    kind: weatherKind(weatherCode, precipitationMm, cloudCover, radiation, isDay),
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
  const windSpeed = valueAt(data.hourly.wind_speed_10m, nearestHourlyIndex);
  const windGusts = valueAt(data.hourly.wind_gusts_10m, nearestHourlyIndex);
  const apparentTemperature = valueAt(data.hourly.apparent_temperature, nearestHourlyIndex);
  const temperatureC = valueAt(data.hourly.temperature_2m, nearestHourlyIndex);

  return {
    isoTime,
    time: formatHour(isoTime),
    temperatureC,
    score: outdoorScore({
      apparentTemperature,
      cloudCover,
      isDay,
      precipitationMm,
      precipitationProbability,
      radiation,
      windGusts,
      windSpeed,
    }),
    precipitationMm,
    precipitationProbability,
    cloudCover,
    radiation,
    kind: weatherKind(weatherCode, precipitationMm, cloudCover, radiation, isDay),
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

function outdoorScore(input: {
  apparentTemperature: number;
  cloudCover: number;
  isDay: boolean;
  precipitationMm: number;
  precipitationProbability: number;
  radiation: number;
  windGusts: number;
  windSpeed: number;
}): number {
  let score = 10;

  score -= Math.min(5, input.precipitationMm * 2.2);
  score -= Math.min(2.5, input.precipitationProbability / 35);
  score -= Math.max(0, (input.windSpeed - 18) / 8);
  score -= Math.max(0, (input.windGusts - 32) / 10);

  if (input.apparentTemperature < 8) score -= (8 - input.apparentTemperature) / 3;
  if (input.apparentTemperature > 30) score -= (input.apparentTemperature - 30) / 4;

  score += Math.min(1.4, input.radiation / 650);
  score -= Math.max(0, (input.cloudCover - 70) / 45);
  if (!input.isDay) score -= 2;

  return Math.max(0, Math.min(10, Math.round(score)));
}
