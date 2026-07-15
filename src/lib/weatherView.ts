import type { DayOption, ForecastPoint, HorizonOption, HourlyWeather, WeatherKind } from "../types";
import { weatherViewSettings } from "../config/weatherSettings";

const DAY_OFFSET: Record<Exclude<DayOption, "Week">, number> = {
  Vandaag: 0,
  Morgen: 1,
  Overmorgen: 2,
};

export function visibleHoursForHorizon(hours: HourlyWeather[], horizon: HorizonOption) {
  if (horizon === "+2 uur") return hours.slice(0, 3);
  if (horizon === "+6 uur") return hours.slice(0, 7);
  return hours;
}

export function visiblePointsForTodayHorizon(
  hourly: HourlyWeather[],
  minutely15: ForecastPoint[],
  horizon: HorizonOption,
  now = new Date(),
) {
  if (horizon === "Hele dag") return visibleHoursForHorizon(hoursForDay(hourly, "Vandaag"), horizon);
  if (minutely15.length === 0) return visibleHoursForHorizon(hoursForDay(hourly, "Vandaag"), horizon);

  const start = niceStartIndex(minutely15, now);

  if (horizon === "+2 uur") return minutely15.slice(start, start + 8);

  // +6 uur: every 30 min (every other 15-min point)
  return minutely15.slice(start, start + 24).filter((_, i) => i % 2 === 0);
}

function niceStartIndex(points: ForecastPoint[], now = new Date()): number {
  // Find the LAST :00/:30 point at or before now so the window always starts
  // in the recent past and the nu-line lands inside the chart rather than
  // pinning to the left edge. Points are time-ordered so we scan forward and
  // keep the highest match. Fall back to index 0 (current quarter-hour) when
  // no :00/:30 falls at or before now — e.g. data starts in a :15/:45 period.
  //
  // Uses isoTime (includes date) for comparison so cross-midnight data
  // (e.g. 23:45 → 00:00 next day) doesn't confuse the :00/:30 minute check.
  const nowMs = now.getTime();
  let last = -1;
  for (let i = 0; i < points.length; i++) {
    const t = points[i].time;
    if (!t.endsWith(":00") && !t.endsWith(":30")) continue;
    if (new Date(points[i].isoTime).getTime() > nowMs) break;
    last = i;
  }
  return last !== -1 ? last : 0;
}

export function visibleHoursForSelection(
  hours: HourlyWeather[],
  day: DayOption,
  horizon: HorizonOption,
) {
  const dayHours = hoursForDay(hours, day);
  if (day !== "Vandaag") return dayHours;

  return visibleHoursForHorizon(dayHours, horizon);
}

export function averageTemperature(hours: HourlyWeather[]): number | undefined {
  if (hours.length === 0) return undefined;
  return Math.round(average(hours.map((hour) => hour.temperatureC)));
}

export function headerDateLabel(hours: HourlyWeather[], day: DayOption) {
  if (day === "Week") return weekRangeLabel(hours);

  const targetDate = dateForDayOption(hours, day);
  if (!targetDate) return "";

  return formatDutchDate(targetDate);
}

function hoursForDay(hours: HourlyWeather[], day: DayOption) {
  if (day === "Week") return weekDaySummaries(hours);

  const targetDate = dateForDayOption(hours, day);
  if (!targetDate) return hours;

  return configuredDayHours(hours.filter((hour) => hour.isoTime.startsWith(targetDate)));
}

function dateForDayOption(hours: HourlyWeather[], day: Exclude<DayOption, "Week">) {
  const firstDate = hours[0]?.isoTime.slice(0, 10);
  if (!firstDate) return undefined;

  const [year, month, dateOfMonth] = firstDate.split("-").map(Number);
  const date = new Date(year, month - 1, dateOfMonth);
  const offset = DAY_OFFSET[day];
  date.setDate(date.getDate() + offset);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function weekRangeLabel(hours: HourlyWeather[]) {
  const firstDate = hours[0]?.isoTime.slice(0, 10);
  const lastDate = hours[hours.length - 1]?.isoTime.slice(0, 10);

  if (!firstDate || !lastDate) return "";

  return `${formatDutchDate(firstDate)} - ${formatDutchDate(lastDate)}`;
}

function formatDutchDate(dateString: string) {
  const [year, month, dateOfMonth] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, dateOfMonth);

  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(date)
    .replace(".", "");
}

function configuredDayHours(hours: HourlyWeather[]) {
  const { endHour, hourStep, startHour } = weatherViewSettings.dayChart;

  return hours.filter((hour) => {
    const numericHour = Number(hour.time.slice(0, 2));
    const inRange = endHour >= 24
      ? numericHour >= startHour && numericHour < 24
      : numericHour >= startHour && numericHour <= endHour;
    const matchesStep = (numericHour - startHour) % hourStep === 0;

    return inRange && matchesStep;
  });
}

function weekDaySummaries(hours: HourlyWeather[]) {
  const groups = new Map<string, HourlyWeather[]>();

  for (const hour of configuredDayHours(hours)) {
    const date = hour.isoTime.slice(0, 10);
    groups.set(date, [...(groups.get(date) ?? []), hour]);
  }

  return [...groups.entries()].slice(0, 7).map(([date, dayHours]) => summarizeDay(date, dayHours));
}

function summarizeDay(date: string, dayHours: HourlyWeather[]): HourlyWeather {
  const bestHour = dayHours.reduce((best, hour) => (hour.score > best.score ? hour : best), dayHours[0]);
  const precipitationSum = dayHours.reduce((total, hour) => total + hour.precipitationMm, 0);
  const averageCloudCover = average(dayHours.map((hour) => hour.cloudCover));
  const averageRadiation = average(dayHours.map((hour) => hour.radiation));
  const daytimeHours = dayHours.filter((hour) => hour.isDay).length;
  const rainyHours = dayHours.filter((hour) => hour.kind === "rain").length;
  const sunnyHours = dayHours.filter((hour) => hour.kind === "sun").length;
  const partlyHours = dayHours.filter((hour) => hour.kind === "partly").length;

  return {
    ...bestHour,
    isoTime: `${date}T12:00`,
    time: formatWeekday(date),
    temperatureC: Math.round(average(dayHours.map((hour) => hour.temperatureC))),
    score: Math.round(average(dayHours.map((hour) => hour.score))),
    precipitationMm: Math.min(3, precipitationSum),
    precipitationProbability: Math.max(...dayHours.map((hour) => hour.precipitationProbability)),
    cloudCover: averageCloudCover,
    radiation: averageRadiation,
    isDay: daytimeHours >= dayHours.length / 2,
    kind: summaryKindFor(rainyHours, sunnyHours, partlyHours),
  };
}

function summaryKindFor(rainyHours: number, sunnyHours: number, partlyHours: number): WeatherKind {
  if (rainyHours >= 3) return "rain";
  if (sunnyHours >= partlyHours && sunnyHours > 0) return "sun";
  if (partlyHours > 0) return "partly";
  return "cloud";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatWeekday(dateString: string) {
  const [year, month, dateOfMonth] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, dateOfMonth);

  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
  })
    .format(date)
    .replace(".", "");
}
