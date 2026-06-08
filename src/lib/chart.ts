import type { HourlyWeather } from "../types";

export type OutdoorWindow = {
  endTime: string;
  startIndex: number;
  startTime: string;
  endIndex: number;
};

export function skyColor(hour: HourlyWeather): string {
  if (!hour.isDay) return "var(--color-sky-night)";
  if (hour.kind === "rain") return "var(--color-sky-rain)";
  if (hour.kind === "cloud") return "var(--color-sky-cloud)";
  if (hour.kind === "partly") return "var(--color-sky-partly)";
  return "var(--color-sky-sun)";
}

export function bestStartTime(hours: HourlyWeather[]): string {
  return bestOutdoorWindow(hours)?.startTime ?? "--:--";
}

export function bestWindowLabel(hours: HourlyWeather[]): string {
  const bestWindow = bestOutdoorWindow(hours);
  if (!bestWindow) return "--:--";

  return `${bestWindow.startTime} - ${bestWindow.endTime}`;
}

export function outdoorSummaryLabel(hours: HourlyWeather[], bestWindow: OutdoorWindow | null): string {
  if (!bestWindow) return "Geen duidelijk buitenmoment";

  const period = dayPeriodLabel(bestWindow.startTime);
  const rainBefore = hours
    .slice(0, bestWindow.startIndex)
    .some(hasMeaningfulRain);
  const rainAfter = hours
    .slice(bestWindow.endIndex + 1)
    .some(hasMeaningfulRain);

  if (rainBefore && rainAfter) return `Tussen buien door - ${period} beste`;
  if (rainBefore) return `Na regen - ${period} beste`;
  if (rainAfter) return `${capitalize(period)} beste - later regen`;

  return `${capitalize(period)} beste buitenmoment`;
}

export function bestOutdoorWindow(hours: HourlyWeather[]): OutdoorWindow | null {
  if (hours.length === 0) return null;

  const bestScore = Math.max(...hours.map((hour) => hour.score));
  const minimumGoodScore = Math.max(7, bestScore - 1);
  const dryLimitMm = 0.2;
  const maxRainProbability = 60;
  const hasNoMeasuredRain = (hour: HourlyWeather) =>
    hour.precipitationMm <= dryLimitMm &&
    hour.kind !== "rain";
  const isDry = (hour: HourlyWeather) =>
    hasNoMeasuredRain(hour) &&
    hour.precipitationProbability <= maxRainProbability;
  const isPracticalOutdoorHour = (hour: HourlyWeather) => {
    const hourOfDay = hourOfDayFor(hour);
    return hourOfDay >= 6 && hourOfDay < 20;
  };
  const feelsBright = (hour: HourlyWeather) =>
    (hour.kind === "sun" || hour.kind === "partly") &&
    hour.radiation >= 80 &&
    isPracticalOutdoorHour(hour);

  const brightWindows = contiguousWindows(hours, (hour) =>
    hour.isDay &&
    hour.score >= 7 &&
    hasNoMeasuredRain(hour) &&
    feelsBright(hour),
  );
  const practicalPreferredWindows = contiguousWindows(hours, (hour) =>
    hour.isDay &&
    hour.score >= 7 &&
    hasNoMeasuredRain(hour) &&
    isPracticalOutdoorHour(hour),
  );
  const preferredWindows = contiguousWindows(hours, (hour) =>
    hour.isDay &&
    hour.score >= minimumGoodScore &&
    isDry(hour),
  );
  const fallbackWindows = contiguousWindows(hours, (hour) => hour.score >= bestScore && hour.kind !== "rain");
  const scoreOnlyWindows = contiguousWindows(hours, (hour) => hour.score >= bestScore);
  const windows = brightWindows.length > 0
    ? brightWindows
    : practicalPreferredWindows.length > 0
      ? practicalPreferredWindows
    : preferredWindows.length > 0
      ? preferredWindows
      : fallbackWindows.length > 0
        ? fallbackWindows
        : scoreOnlyWindows;

  return windows.reduce((best, current) => {
    const bestLength = best.endIndex - best.startIndex;
    const currentLength = current.endIndex - current.startIndex;
    const bestAverage = averageScore(hours, best);
    const currentAverage = averageScore(hours, current);

    if (currentLength > bestLength) return current;
    if (currentLength === bestLength && currentAverage > bestAverage) return current;
    return best;
  }, windows[0]);
}

function contiguousWindows(
  hours: HourlyWeather[],
  predicate: (hour: HourlyWeather) => boolean,
): OutdoorWindow[] {
  const windows: OutdoorWindow[] = [];
  let startIndex: number | null = null;

  for (let index = 0; index < hours.length; index += 1) {
    if (predicate(hours[index])) {
      startIndex ??= index;
      continue;
    }

    if (startIndex !== null) {
      windows.push(windowFromIndexes(hours, startIndex, index - 1));
      startIndex = null;
    }
  }

  if (startIndex !== null) {
    windows.push(windowFromIndexes(hours, startIndex, hours.length - 1));
  }

  return windows;
}

function windowFromIndexes(hours: HourlyWeather[], startIndex: number, endIndex: number): OutdoorWindow {
  return {
    endIndex,
    endTime: endTimeForWindow(hours, endIndex),
    startIndex,
    startTime: hours[startIndex].time,
  };
}

function endTimeForWindow(hours: HourlyWeather[], endIndex: number) {
  const nextHour = hours[endIndex + 1];
  if (nextHour) return nextHour.time;

  const endDate = new Date(hours[endIndex].isoTime);
  const stepMs = inferStepMs(hours.map((hour) => new Date(hour.isoTime).getTime()));
  endDate.setTime(endDate.getTime() + stepMs);

  if (!hours[endIndex].time.includes(":")) return hours[endIndex].time;

  return `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
}

function hourOfDayFor(hour: HourlyWeather) {
  return new Date(hour.isoTime).getHours();
}

function inferStepMs(times: number[]) {
  const diffs = times
    .slice(1)
    .map((time, index) => time - times[index])
    .filter((diff) => diff > 0);

  return Math.min(...diffs, 60 * 60 * 1000);
}

function averageScore(hours: HourlyWeather[], window: OutdoorWindow) {
  const windowHours = hours.slice(window.startIndex, window.endIndex + 1);
  return windowHours.reduce((total, hour) => total + hour.score, 0) / windowHours.length;
}

function hasMeaningfulRain(hour: HourlyWeather) {
  return hour.kind === "rain" || hour.precipitationMm >= 0.2;
}

function dayPeriodLabel(time: string) {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "ochtend";
  if (hour < 18) return "middag";
  return "avond";
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
