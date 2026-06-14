export type DayOption = "Vandaag" | "Morgen" | "Overmorgen" | "Week";

export type HorizonOption = "Hele dag" | "+6 uur" | "+2 uur";

export type WeatherKind = "rain" | "cloud" | "partly" | "sun";

export type HourlyWeather = {
  isoTime: string;
  time: string;
  temperatureC: number;
  score: number;
  precipitationMm: number;
  precipitationProbability: number;
  cloudCover: number;
  radiation: number;
  isDay: boolean;
  kind: WeatherKind;
  // Unix timestamp (ms) of sunset for the same calendar day, used for civil
  // twilight falloff. Optional so test fixtures stay lean.
  sunsetMs?: number;
};

export type ForecastPoint = HourlyWeather;
