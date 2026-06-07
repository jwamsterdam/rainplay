import type { HourlyWeather } from "../types";
import { skyColor } from "../lib/chart";
import { WeatherIcon } from "./WeatherIcons";

type DayChartProps = {
  hours: HourlyWeather[];
};

const CHART_WIDTH = 780;
const CHART_HEIGHT = 500;
const LEFT = 98;
const RIGHT = 58;
const TOP = 162;
const BOTTOM = 64;
const MAX_MM = 3;

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

export function DayChart({ hours }: DayChartProps) {
  if (hours.length === 0) {
    return <div className="loading-panel">Geen uurdata beschikbaar</div>;
  }

  const plotWidth = CHART_WIDTH - LEFT - RIGHT;
  const plotHeight = CHART_HEIGHT - TOP - BOTTOM;
  const slotWidth = plotWidth / hours.length;
  const isDense = hours.length > 8;
  const temperature = temperatureDomain(hours);
  const temperatureY = (value: number) => {
    const normalized = (value - temperature.min) / (temperature.max - temperature.min);
    return TOP + plotHeight - normalized * plotHeight;
  };
  const temperaturePoints = hours
    .map((hour, index) => {
      const x = LEFT + index * slotWidth + slotWidth / 2;
      return `${x},${temperatureY(hour.temperatureC)}`;
    })
    .join(" ");

  return (
    <div className="chart-shell">
      <svg className="chart" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label="Dagbeeld met buitenscore, luchtkleur en regenhoeveelheid">
        <rect width={CHART_WIDTH} height={CHART_HEIGHT} rx="18" fill="#fff" />

        {hours.map((hour, index) => (
          <rect
            fill={skyColor(hour)}
            height={plotHeight + TOP - 24}
            key={`sky-${hour.time}`}
            opacity="0.78"
            width={slotWidth}
            x={LEFT + index * slotWidth}
            y="24"
          />
        ))}

        {hours.map((hour, index) => (
          <line
            key={`slot-${hour.time}`}
            stroke="#dfe6ee"
            strokeWidth="1"
            x1={LEFT + index * slotWidth}
            x2={LEFT + index * slotWidth}
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
            <text className="temperature-axis-label" key={tick} textAnchor="start" x={CHART_WIDTH - RIGHT + 12} y={y + 7}>
              {tick}°
            </text>
          );
        })}

        <polyline className="temperature-line" fill="none" points={temperaturePoints} />
        {hours.map((hour, index) => {
          const x = LEFT + index * slotWidth + slotWidth / 2;
          const showPoint = !isDense || index % 2 === 0 || index === hours.length - 1;

          return showPoint ? (
            <circle className="temperature-point" cx={x} cy={temperatureY(hour.temperatureC)} key={`temp-${hour.isoTime}`} r="3.5" />
          ) : null;
        })}

        <text className="score-label" x="24" y="64">
          Buiten
        </text>

        {hours.map((hour, index) => {
          const x = LEFT + index * slotWidth + slotWidth / 2;
          const barHeight = (hour.precipitationMm / MAX_MM) * plotHeight;
          const y = TOP + plotHeight - barHeight;
          const showDetail = !isDense || index % 2 === 0 || index === hours.length - 1;
          const showScore = !isDense || index % 2 === 0 || index === hours.length - 1;

          return (
            <g key={hour.time}>
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
              {showDetail && (
                <text className="time-label" textAnchor="middle" x={x} y={CHART_HEIGHT - 22}>
                  {hour.time}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
