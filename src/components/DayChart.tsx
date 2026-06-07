import type { HorizonOption, HourlyWeather } from "../types";
import { skyColor } from "../lib/chart";
import { WeatherIcon } from "./WeatherIcons";

type DayChartProps = {
  hours: HourlyWeather[];
  horizon: HorizonOption;
};

const CHART_WIDTH = 780;
const CHART_HEIGHT = 500;
const LEFT = 56;
const RIGHT = 42;
const TOP = 162;
const BOTTOM = 64;
const MAX_MM = 3;
const MINUTE = 60 * 1000;

function temperatureDomain(hours: HourlyWeather[]) {
  const temperatures = hours.map((hour) => hour.temperatureC);
  const min = Math.floor(Math.min(...temperatures) / 2) * 2;
  const max = Math.ceil(Math.max(...temperatures) / 2) * 2;

  if (min === max) return { min: min - 2, max: max + 2 };
  return { min, max };
}

function scoreColor(score: number) {
  if (score >= 8) return "var(--color-score-good)";
  if (score >= 6) return "var(--color-score-ok)";
  if (score >= 4) return "var(--color-score-low)";
  return "var(--color-score-bad)";
}

export function DayChart({ hours, horizon }: DayChartProps) {
  if (hours.length === 0) {
    return <div className="loading-panel">Geen uurdata beschikbaar</div>;
  }

  const plotWidth = CHART_WIDTH - LEFT - RIGHT;
  const plotHeight = CHART_HEIGHT - TOP - BOTTOM;
  const isDense = hours.length > 8;
  const times = hours.map((hour) => timestampFor(hour.isoTime));
  const stepMs = inferStepMs(times);
  const axisStart = axisStartFor(times[0], horizon);
  const axisEnd = axisEndFor(axisStart, times[times.length - 1] + stepMs, horizon);
  const axisDuration = Math.max(stepMs, axisEnd - axisStart);
  const xForTime = (timestamp: number) => LEFT + ((timestamp - axisStart) / axisDuration) * plotWidth;
  const slotWidth = plotWidth / hours.length;
  const xForSlotStart = (index: number) => LEFT + index * slotWidth;
  const xForPoint = (index: number) => xForSlotStart(index) + slotWidth / 2;
  const axisLabels = timeAxisLabels(hours, horizon, axisStart, axisEnd);
  const temperature = temperatureDomain(hours);
  const temperatureY = (value: number) => {
    const normalized = (value - temperature.min) / (temperature.max - temperature.min);
    return TOP + plotHeight - normalized * plotHeight;
  };
  const temperaturePoints = hours
    .map((hour, index) => `${xForPoint(index)},${temperatureY(hour.temperatureC)}`)
    .join(" ");

  return (
    <div className="chart-shell">
      <svg className="chart" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label="Dagbeeld met buitenscore, luchtkleur en regenhoeveelheid">
        <rect width={CHART_WIDTH} height={CHART_HEIGHT} rx="18" fill="#fff" />

        {hours.map((hour, index) => (
          <rect
            fill={skyColor(hour)}
            height={plotHeight + TOP - 24}
            key={`sky-${hour.isoTime}`}
            opacity="0.78"
            width={slotWidth}
            x={xForSlotStart(index)}
            y="24"
          />
        ))}

        {hours.map((hour, index) => (
          <line
            key={`slot-${hour.isoTime}`}
            stroke="#dfe6ee"
            strokeWidth="1"
            x1={xForSlotStart(index)}
            x2={xForSlotStart(index)}
            y1="24"
            y2={CHART_HEIGHT - BOTTOM}
          />
        ))}

        <line
          stroke="#cfd7df"
          strokeWidth="1"
          x1={LEFT}
          x2={CHART_WIDTH - RIGHT}
          y1="24"
          y2="24"
        />
        <line
          stroke="#cfd7df"
          strokeWidth="1"
          x1={CHART_WIDTH - RIGHT}
          x2={CHART_WIDTH - RIGHT}
          y1="24"
          y2={CHART_HEIGHT - BOTTOM}
        />

        {[0, 1, 2, 3].map((tick) => {
          const y = TOP + plotHeight - (tick / MAX_MM) * plotHeight;
          return (
            <g key={tick}>
              <line
                stroke={tick === 0 ? "#cfd7df" : "#dce3ea"}
                strokeDasharray={tick === 0 ? undefined : "4 6"}
                strokeWidth="1"
                x1={LEFT}
                x2={CHART_WIDTH - RIGHT}
                y1={y}
                y2={y}
              />
              <text className="axis-label" textAnchor="end" x={LEFT - 18} y={y + 8}>
                {tick === 3 ? "3 mm" : tick}
              </text>
            </g>
          );
        })}

        {[temperature.min, Math.round((temperature.min + temperature.max) / 2), temperature.max].map((tick) => {
          const y = temperatureY(tick);

          return (
            <text className="temperature-axis-label" key={tick} textAnchor="end" x={CHART_WIDTH - 6} y={y + 7}>
              {tick}°
            </text>
          );
        })}

        <polyline className="temperature-line" fill="none" points={temperaturePoints} />
        {hours.map((hour, index) => {
          const x = xForPoint(index);
          const showPoint = shouldShowPoint(index, horizon, isDense);

          return showPoint ? (
            <circle className="temperature-point" cx={x} cy={temperatureY(hour.temperatureC)} key={`temp-${hour.isoTime}`} r="3.5" />
          ) : null;
        })}

        {hours.map((hour, index) => {
          const x = xForPoint(index);
          const barHeight = (hour.precipitationMm / MAX_MM) * plotHeight;
          const y = TOP + plotHeight - barHeight;
          const showDetail = shouldShowPoint(index, horizon, isDense);
          const showScore = shouldShowPoint(index, horizon, isDense);

          return (
            <g key={hour.isoTime}>
              {showScore && (
                <g className="score-badge">
                  <circle cx={x} cy="58" fill={scoreColor(hour.score)} r="22" />
                  <text className="score-badge-text" textAnchor="middle" x={x} y="66">
                    {hour.score}
                  </text>
                </g>
              )}
              {showDetail && (
                <foreignObject height="36" width="36" x={x - 18} y="88">
                  <WeatherIcon className="chart-weather-icon" kind={hour.kind} />
                </foreignObject>
              )}
              {hour.precipitationMm > 0 && (
                <rect
                  className="rain-bar"
                  height={barHeight}
                  rx="8"
                  width="34"
                  x={x - 17}
                  y={y}
                />
              )}
            </g>
          );
        })}

        {axisLabels.map((label) => (
          <text className="time-label" key={`${label.text}-${label.x}`} textAnchor="middle" x={label.x} y={CHART_HEIGHT - 22}>
            {label.text}
          </text>
        ))}
      </svg>
    </div>
  );
}

function shouldShowPoint(_index: number, _horizon: HorizonOption, _isDense: boolean) {
  return true;
}

function timeAxisLabels(
  hours: HourlyWeather[],
  horizon: HorizonOption,
  axisStart: number,
  axisEnd: number,
) {
  if (!hours[0]?.time.includes(":")) {
    const stepMs = inferStepMs(hours.map((hour) => timestampFor(hour.isoTime)));
    return hours.map((hour) => ({
      text: hour.time,
      x: axisPosition(timestampFor(hour.isoTime) + stepMs / 2, axisStart, axisEnd),
    }));
  }

  if (horizon === "+2 uur") return intervalLabels(axisStart, axisEnd, 15 * MINUTE, true);
  if (horizon === "+6 uur") return intervalLabels(axisStart, axisEnd, 60 * MINUTE, true);

  return hours
    .filter((hour) => hour.isoTime.slice(14, 16) === "00")
    .map((hour) => ({
      text: String(Number(hour.isoTime.slice(11, 13))),
      x: axisPosition(timestampFor(hour.isoTime) + inferStepMs(hours.map((item) => timestampFor(item.isoTime))) / 2, axisStart, axisEnd),
    }));
}

function intervalLabels(axisStart: number, axisEnd: number, intervalMs: number, showMinutes: boolean) {
  const labels: Array<{ text: string; x: number }> = [];

  for (let timestamp = axisStart; timestamp <= axisEnd; timestamp += intervalMs) {
    labels.push({
      text: formatAxisTime(timestamp, showMinutes),
      x: axisPosition(timestamp, axisStart, axisEnd),
    });
  }

  return labels;
}

function axisPosition(timestamp: number, axisStart: number, axisEnd: number) {
  return LEFT + ((timestamp - axisStart) / Math.max(1, axisEnd - axisStart)) * (CHART_WIDTH - LEFT - RIGHT);
}

function timestampFor(isoTime: string) {
  return new Date(isoTime).getTime();
}

function inferStepMs(times: number[]) {
  const diffs = times
    .slice(1)
    .map((time, index) => time - times[index])
    .filter((diff) => diff > 0);

  return Math.min(...diffs, 60 * MINUTE);
}

function axisStartFor(firstTime: number, horizon: HorizonOption) {
  if (horizon === "+2 uur" || horizon === "+6 uur") return floorToHour(firstTime);
  return firstTime;
}

function axisEndFor(axisStart: number, endTime: number, horizon: HorizonOption) {
  if (horizon === "+2 uur") return axisStart + 2 * 60 * MINUTE;
  if (horizon === "+6 uur") return axisStart + 6 * 60 * MINUTE;
  return endTime;
}

function floorToHour(timestamp: number) {
  return Math.floor(timestamp / (60 * MINUTE)) * 60 * MINUTE;
}

function formatAxisTime(timestamp: number, showMinutes: boolean) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return showMinutes ? `${hours}:${minutes}` : String(date.getHours());
}
