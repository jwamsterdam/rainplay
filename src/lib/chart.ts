import type { HourlyWeather, WeatherKind } from "../types";
import type { CellColors } from "../components/cellColors";

export type OutdoorWindow = {
  endTime: string;
  startIndex: number;
  startTime: string;
  endIndex: number;
};

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

// --- Color helpers for gradient-overlap blend effect ---

export function cellFill(hour: HourlyWeather, colors: CellColors): string {
  if (!hour.isDay) return colors.night;
  return colors[hour.kind as WeatherKind];
}

export function parseRgba(s: string): { r: number; g: number; b: number; a: number } {
  const match = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!match) return { r: 0, g: 0, b: 0, a: 1 };
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1,
  };
}

export function mixRgba(c1: string, c2: string): string {
  const a = parseRgba(c1);
  const b = parseRgba(c2);
  const r = Math.round((a.r + b.r) / 2);
  const g = Math.round((a.g + b.g) / 2);
  const bl = Math.round((a.b + b.b) / 2);
  const alpha = Math.round(((a.a + b.a) / 2) * 100) / 100;
  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

/**
 * Linearly interpolate between two rgba() colour strings.
 * t=0 returns c1, t=1 returns c2.
 * Kept as a public colour helper; the sky gradient now interpolates via the
 * canvas (addColorStop), but this remains available for callers/tests.
 */
export function interpolateRgba(c1: string, c2: string, t: number): string {
  const a = parseRgba(c1);
  const b = parseRgba(c2);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  const alpha = Math.round((a.a + (b.a - a.a) * t) * 100) / 100;
  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

export type BlendPoint = { blendIndex: number; blendColor: string };

export function buildBlendData(hours: HourlyWeather[], colors: CellColors): BlendPoint[] {
  const result: BlendPoint[] = [];
  for (let i = 0; i <= hours.length - 2; i++) {
    result.push({
      blendIndex: i + 0.5,
      blendColor: mixRgba(cellFill(hours[i], colors), cellFill(hours[i + 1], colors)),
    });
  }
  return result;
}

export type GradientStop = { offset: number; color: string };

/**
 * Build the colour stops for the sky/brightness gradient as a single horizontal
 * linear gradient (offsets 0..1), to be painted in one pass on a <canvas>.
 *
 * Visual model (mirrors the previous per-cell rect gradient, but seam-free):
 * - Each hour i occupies the band [i/n, (i+1)/n]; its CENTER (offset (i+0.5)/n)
 *   gets that hour's colour = cellFill(hours[i]).
 * - At the BOUNDARY between hour i and i+1 (offset (i+1)/n) the colour is the
 *   50/50 blend of the two neighbouring cell colours — same as the old edge mix.
 * - The very first edge (offset 0) = first hour's colour; the very last edge
 *   (offset 1) = last hour's colour.
 *
 * Optimisation: consecutive stops sharing an identical colour are collapsed to
 * the minimal set (the first and last of each identical-colour run), so a flat
 * run of equal cells (e.g. night hours) renders as a flat fill rather than many
 * redundant interpolation points.
 */
export function buildSkyGradientStops(hours: HourlyWeather[], colors: CellColors): GradientStop[] {
  const n = hours.length;
  if (n === 0) return [];

  const fills = hours.map((hour) => cellFill(hour, colors));

  // Full center+boundary stop list, left-to-right.
  const raw: GradientStop[] = [];
  raw.push({ offset: 0, color: fills[0] }); // first edge
  for (let i = 0; i < n; i++) {
    raw.push({ offset: (i + 0.5) / n, color: fills[i] }); // band center
    if (i < n - 1) {
      raw.push({ offset: (i + 1) / n, color: mixRgba(fills[i], fills[i + 1]) }); // boundary blend
    }
  }
  raw.push({ offset: 1, color: fills[n - 1] }); // last edge

  // Collapse runs of identical colour: keep only the first and last of each run.
  const collapsed: GradientStop[] = [];
  for (let i = 0; i < raw.length; i++) {
    const isFirst = i === 0;
    const isLast = i === raw.length - 1;
    const samePrev = !isFirst && raw[i - 1].color === raw[i].color;
    const sameNext = !isLast && raw[i + 1].color === raw[i].color;
    // Drop a stop only if it sits in the interior of an identical-colour run.
    if (samePrev && sameNext) continue;
    collapsed.push(raw[i]);
  }

  return collapsed;
}
