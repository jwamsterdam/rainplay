import type { HorizonOption, HourlyWeather } from "../types";
import type { OutdoorWindow } from "../lib/chart";
import { skyColor } from "../lib/chart";
import { weatherViewSettings } from "../config/weatherSettings";

type AxisLabel = {
  anchor: "start" | "middle" | "end";
  text: string;
  x: number;
};

type DayChartProps = {
  bestWindow: OutdoorWindow | null;
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

export function DayChart({ bestWindow, hours, horizon }: DayChartProps) {
  if (hours.length === 0) {
    return <div className="loading-panel">Geen uurdata beschikbaar</div>;
  }

  const plotWidth = CHART_WIDTH - LEFT - RIGHT;
  const plotHeight = CHART_HEIGHT - TOP - BOTTOM;
  const times = hours.map((hour) => timestampFor(hour.isoTime));
  const stepMs = inferStepMs(times);
  const axisStart = axisStartFor(times[0], horizon);
  const axisEnd = axisEndFor(axisStart, times[times.length - 1] + stepMs, horizon);
  const axisDuration = Math.max(stepMs, axisEnd - axisStart);
  const xForTime = (timestamp: number) => LEFT + ((timestamp - axisStart) / axisDuration) * plotWidth;
  const slotWidth = plotWidth / hours.length;
  const xForSlotStart = (index: number) => LEFT + index * slotWidth;
  const xForPoint = (index: number) => xForSlotStart(index) + slotWidth / 2;
  const bestWindowWidth = bestWindow
    ? Math.max(slotWidth, (bestWindow.endIndex - bestWindow.startIndex) * slotWidth)
    : 0;
  const axisLabels = timeAxisLabels(hours, horizon, axisStart, axisEnd, slotWidth);
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
          return <circle className="temperature-point" cx={x} cy={temperatureY(hour.temperatureC)} key={`temp-${hour.isoTime}`} r="3.5" />;
        })}

        {hours.map((hour, index) => {
          const x = xForPoint(index);
          const barHeight = (hour.precipitationMm / MAX_MM) * plotHeight;
          const y = TOP + plotHeight - barHeight;

          return (
            <g key={hour.isoTime}>
              <g className="score-badge">
                <circle cx={x} cy="58" fill={scoreColor(hour.score)} r="22" />
                <text className="score-badge-text" textAnchor="middle" x={x} y="66">
                  {hour.score}
                </text>
              </g>
              <ChartWeatherIcon kind={hour.kind} x={x} y={106} />
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

        {bestWindow ? (
          <rect
            className="best-window-highlight"
            height="8"
            rx="4"
            width={bestWindowWidth}
            x={xForSlotStart(bestWindow.startIndex)}
            y={CHART_HEIGHT - BOTTOM + 10}
          />
        ) : null}

        {axisLabels.map((label) => (
          <text className="time-label" key={`${label.text}-${label.x}`} textAnchor={label.anchor} x={label.x} y={CHART_HEIGHT - 22}>
            {label.text}
          </text>
        ))}
      </svg>
    </div>
  );
}

function timeAxisLabels(
  hours: HourlyWeather[],
  horizon: HorizonOption,
  axisStart: number,
  axisEnd: number,
  slotWidth: number,
): AxisLabel[] {
  if (!hours[0]?.time.includes(":")) {
    return hours.map((hour, index) => ({
      anchor: "middle",
      text: hour.time,
      x: LEFT + index * slotWidth + slotWidth / 2,
    }));
  }

  if (horizon === "+2 uur") return intervalLabels(axisStart, axisEnd, 15 * MINUTE, true, "bounds", false);
  if (horizon === "+6 uur") return intervalLabels(axisStart, axisEnd, 60 * MINUTE, true, "bounds", false);

  return intervalLabels(axisStart, axisEnd, weatherViewSettings.dayChart.hourStep * 60 * MINUTE, false, "bounds", false);
}

function intervalLabels(
  axisStart: number,
  axisEnd: number,
  intervalMs: number,
  showMinutes: boolean,
  align: "bounds" | "middle",
  includeEnd: boolean,
): AxisLabel[] {
  const labels: AxisLabel[] = [];

  for (let timestamp = axisStart; includeEnd ? timestamp <= axisEnd : timestamp < axisEnd; timestamp += intervalMs) {
    const isFirst = timestamp === axisStart;
    const isLast = timestamp === axisEnd;

    labels.push({
      anchor: align === "bounds" && isFirst ? "start" : align === "bounds" && isLast ? "end" : align === "bounds" ? "start" : "middle",
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
  if (horizon === "Hele dag") return configuredDayStart(firstTime);
  return firstTime;
}

function axisEndFor(axisStart: number, endTime: number, horizon: HorizonOption) {
  if (horizon === "+2 uur") return axisStart + 2 * 60 * MINUTE;
  if (horizon === "+6 uur") return axisStart + 6 * 60 * MINUTE;
  if (horizon === "Hele dag") {
    const { endHour, startHour } = weatherViewSettings.dayChart;
    return axisStart + (endHour - startHour) * 60 * MINUTE;
  }
  return endTime;
}

function floorToHour(timestamp: number) {
  return Math.floor(timestamp / (60 * MINUTE)) * 60 * MINUTE;
}

function configuredDayStart(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(weatherViewSettings.dayChart.startHour, 0, 0, 0);

  return date.getTime();
}

function formatAxisTime(timestamp: number, showMinutes: boolean) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return showMinutes ? `${hours}:${minutes}` : String(date.getHours());
}

function ChartWeatherIcon({ kind, x, y }: { kind: HourlyWeather["kind"]; x: number; y: number }) {
  if (kind === "sun") return <ChartSunIcon x={x} y={y} />;
  if (kind === "partly") return <ChartPartlyIcon x={x} y={y} />;
  if (kind === "rain") return <ChartRainIcon x={x} y={y} />;
  return <ChartCloudIcon x={x} y={y} />;
}

function ChartSunIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="chart-weather-icon" transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="0" r="12" fill="#ffc93c" />
      <g stroke="#ffc93c" strokeLinecap="round" strokeWidth="4">
        <path d="M0 -24v7" />
        <path d="M0 17v7" />
        <path d="M-24 0h7" />
        <path d="M17 0h7" />
        <path d="m-17 -17 5 5" />
        <path d="m12 12 5 5" />
        <path d="m17 -17-5 5" />
        <path d="m-12 12-5 5" />
      </g>
    </g>
  );
}

function ChartCloudIcon({ x, y, scale = 0.78 }: { x: number; y: number; scale?: number }) {
  return (
    <g className="chart-weather-icon" transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M-20 10c-7 0-12-4.8-12-10.8 0-5.5 4.2-10 9.8-10.8A17.2 17.2 0 0 1-4.5-24c8.9 0 16.2 6.2 17.4 14.4C18.8-8.4 23-3.6 23 2.1 23 8.4 17.7 13 11.2 13H-20Z"
        fill="#c8d0d8"
      />
    </g>
  );
}

function ChartRainIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="chart-weather-icon">
      <ChartCloudIcon scale={0.78} x={x} y={y} />
      <g transform={`translate(${x} ${y}) scale(0.78)`} stroke="#4f9cf4" strokeLinecap="round" strokeWidth="4">
        <path d="m-12 18-4 8" />
        <path d="m0 18-4 8" />
        <path d="m12 18-4 8" />
      </g>
    </g>
  );
}

function ChartPartlyIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="chart-weather-icon">
      <g transform={`translate(${x - 10} ${y - 8}) scale(0.72)`}>
        <ChartSunIcon x={0} y={0} />
      </g>
      <g transform={`translate(${x + 2} ${y + 4}) scale(0.68)`}>
        <path
          d="M-20 10c-7 0-12-4.8-12-10.8 0-5.5 4.2-10 9.8-10.8A17.2 17.2 0 0 1-4.5-24c8.9 0 16.2 6.2 17.4 14.4C18.8-8.4 23-3.6 23 2.1 23 8.4 17.7 13 11.2 13H-20Z"
          fill="#d4d9de"
        />
      </g>
    </g>
  );
}
