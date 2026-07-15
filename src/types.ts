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

// ForecastPoint intentionally aliases HourlyWeather (NOSONAR typescript:S6564).
// It documents that minutely15 data is Open-Meteo's separate 15-minute-resolution
// forecast stream, distinct from hourly readings, even though the two shapes
// currently match. Do not collapse this into HourlyWeather — the name carries
// domain meaning relied on across DayCarousel, openMeteo normalization, and
// weatherView chart-window logic.
export type ForecastPoint = HourlyWeather; // NOSONAR
