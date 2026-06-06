import type { HourlyWeather } from "../types";

export function skyColor(hour: HourlyWeather): string {
  if (hour.kind === "rain") return "var(--color-sky-rain)";
  if (hour.kind === "cloud") return "var(--color-sky-cloud)";
  if (hour.kind === "partly") return "var(--color-sky-partly)";
  return "var(--color-sky-sun)";
}

export function bestStartTime(hours: HourlyWeather[]): string {
  if (hours.length === 0) return "--:--";

  const best = hours.reduce((currentBest, hour) =>
    hour.score > currentBest.score ? hour : currentBest,
  );

  return best.time;
}
