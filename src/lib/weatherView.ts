import type { DayOption, ForecastPoint, HorizonOption, HourlyWeather } from "../types";
import { weatherViewSettings } from "../config/weatherSettings";

export function visibleHoursForHorizon(hours: HourlyWeather[], horizon: HorizonOption) {
  if (horizon === "+2 uur") return hours.slice(0, 3);
  if (horizon === "+6 uur") return hours.slice(0, 7);
  return hours;
}

export function visiblePointsForTodayHorizon(
  hourly: HourlyWeather[],
  minutely15: ForecastPoint[],
  horizon: HorizonOption,
) {
  if (horizon === "Hele dag") return visibleHoursForHorizon(hoursForDay(hourly, "Vandaag"), horizon);
  if (minutely15.length === 0) return visibleHoursForHorizon(hoursForDay(hourly, "Vandaag"), horizon);

  const start = niceStartIndex(minutely15);

  if (horizon === "+2 uur") return minutely15.slice(start, start + 8);

  // +6 uur: every 30 min (every other 15-min point)
  return minutely15.slice(start, start + 24).filter((_, i) => i % 2 === 0);
}

function niceStartIndex(points: ForecastPoint[]): number {
  // Return the FIRST :00/:30 point in the data — i.e. the first whole/half hour
  // at or after now (the minutely15 series begins at the current quarter-hour).
  // This is the window's left edge; it is at/after now, so the "nu" marker pins
  // to the left of +2/+6 uur windows (see lib/nowMarker). Fall back to index 0
  // if no :00/:30 point exists.
  const idx = points.findIndex(p => p.time.endsWith(":00") || p.time.endsWith(":30"));
  return idx === -1 ? 0 : idx;
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
  const offset = day === "Vandaag" ? 0 : day === "Morgen" ? 1 : 2;
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
    kind:
      rainyHours >= 3
        ? "rain"
        : sunnyHours >= partlyHours && sunnyHours > 0
          ? "sun"
          : partlyHours > 0
            ? "partly"
            : "cloud",
  };
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
