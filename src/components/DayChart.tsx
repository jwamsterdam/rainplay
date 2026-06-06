import type { HourlyWeather } from "../types";
import { skyColor } from "../lib/chart";
import { WeatherIcon } from "./WeatherIcons";

type DayChartProps = {
  hours: HourlyWeather[];
};

const CHART_WIDTH = 760;
const CHART_HEIGHT = 500;
const LEFT = 86;
const RIGHT = 8;
const TOP = 82;
const BOTTOM = 58;
const MAX_MM = 3;

export function DayChart({ hours }: DayChartProps) {
  if (hours.length === 0) {
    return <div className="loading-panel">Geen uurdata beschikbaar</div>;
  }

  const plotWidth = CHART_WIDTH - LEFT - RIGHT;
  const plotHeight = CHART_HEIGHT - TOP - BOTTOM;
  const slotWidth = plotWidth / hours.length;
  const isDense = hours.length > 8;

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

        <text className="score-label" x="22" y="44">
          Score
        </text>

        {hours.map((hour, index) => {
          const x = LEFT + index * slotWidth + slotWidth / 2;
          const barHeight = (hour.precipitationMm / MAX_MM) * plotHeight;
          const y = TOP + plotHeight - barHeight;
          const showDetail = !isDense || index % 2 === 0 || index === hours.length - 1;

          return (
            <g key={hour.time}>
              <text className="score-number" textAnchor="middle" x={x} y="44">
                {hour.score}
              </text>
              {showDetail && (
                <foreignObject height="46" width="46" x={x - 23} y="72">
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
