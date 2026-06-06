import type { HourlyWeather } from "../types";

export function skyColor(hour: HourlyWeather): string {
  if (hour.kind === "rain") return "#f1f5f9";
  if (hour.kind === "cloud") return "#f5f8fb";
  if (hour.kind === "partly") return "#eef8ff";
  return "#fff7dc";
}

export function bestStartTime(hours: HourlyWeather[]): string {
  const best = hours.reduce((currentBest, hour) =>
    hour.score > currentBest.score ? hour : currentBest,
  );

  return best.time;
}
