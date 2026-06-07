import type { DayOption, ForecastPoint, HorizonOption, HourlyWeather } from "../types";

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

  const detailedPoints = minutely15.length > 0 ? minutely15 : hourly;
  const limit = horizon === "+2 uur" ? 8 : 24;
  const points = detailedPoints.slice(0, limit);

  if (minutely15.length === 0) return visibleHoursForHorizon(hoursForDay(hourly, "Vandaag"), horizon);
  if (horizon === "+6 uur") return points.filter((_, index) => index % 2 === 0);

  return points;
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

  return bestDaytimeHours(hours.filter((hour) => hour.isoTime.startsWith(targetDate)));
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

function bestDaytimeHours(hours: HourlyWeather[]) {
  return hours.filter((hour) => {
    const numericHour = Number(hour.time.slice(0, 2));
    return numericHour >= 8 && numericHour <= 18;
  });
}

function weekDaySummaries(hours: HourlyWeather[]) {
  const groups = new Map<string, HourlyWeather[]>();

  for (const hour of bestDaytimeHours(hours)) {
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
  const rainyHours = dayHours.filter((hour) => hour.kind === "rain").length;
  const sunnyHours = dayHours.filter((hour) => hour.kind === "sun").length;
  const partlyHours = dayHours.filter((hour) => hour.kind === "partly").length;

  return {
    ...bestHour,
    isoTime: `${date}T12:00`,
    time: formatWeekday(date),
    score: Math.round(average(dayHours.map((hour) => hour.score))),
    precipitationMm: Math.min(3, precipitationSum),
    precipitationProbability: Math.max(...dayHours.map((hour) => hour.precipitationProbability)),
    cloudCover: averageCloudCover,
    radiation: averageRadiation,
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
