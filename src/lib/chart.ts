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

export function bestWindowLabel(hours: HourlyWeather[]): string {
  if (hours.length < 2) {
    return bestStartTime(hours);
  }

  const windowSize = Math.min(2, hours.length);
  let bestIndex = 0;
  let bestAverage = -Infinity;

  for (let index = 0; index <= hours.length - windowSize; index += 1) {
    const window = hours.slice(index, index + windowSize);
    const averageScore = window.reduce((total, hour) => total + hour.score, 0) / window.length;

    if (averageScore > bestAverage) {
      bestAverage = averageScore;
      bestIndex = index;
    }
  }

  const start = hours[bestIndex]?.time ?? bestStartTime(hours);
  const end = hours[bestIndex + windowSize - 1]?.time ?? start;

  if (start === end) return start;

  return `${start} - ${end}`;
}
