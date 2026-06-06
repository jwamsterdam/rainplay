import type { DayOption, HorizonOption, HourlyWeather } from "../types";

export function visibleHoursForHorizon(hours: HourlyWeather[], horizon: HorizonOption) {
  if (horizon === "+2 uur") return hours.slice(0, 3);
  if (horizon === "+6 uur") return hours.slice(0, 7);
  return hours;
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

function hoursForDay(hours: HourlyWeather[], day: DayOption) {
  if (day === "Week") return bestDaytimeHours(hours);

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

function bestDaytimeHours(hours: HourlyWeather[]) {
  return hours.filter((hour) => {
    const numericHour = Number(hour.time.slice(0, 2));
    return numericHour >= 8 && numericHour <= 18;
  });
}
