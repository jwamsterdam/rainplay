import { useLayoutEffect, useRef, useState } from "react";
import { ComposedChart, XAxis, YAxis, Line, Bar, CartesianGrid } from "recharts";
import type { HorizonOption, HourlyWeather, WeatherKind } from "../types";
import { defaultCellColors } from "./SettingsPanel";
import type { CellColors } from "./SettingsPanel";
import { cellFill, interpolateRgba, mixRgba } from "../lib/chart";
import { ToggleButton } from "./ToggleButton";

const RAIN_COLOR = "#78b4f8";
const TEMP_COLOR = "#f97316";
const MAX_MM = 3;
const ICON_SIZE = 22;
const ICON_SCALE = ICON_SIZE / 48;

type Props = {
  hours: HourlyWeather[];
  horizon: HorizonOption;
  cellColors?: CellColors;
  showTemp: boolean;
  showRain: boolean;
  showIcons: boolean;
};

// --- Icon path components (no <svg> wrapper, for use inside Recharts SVG) ---

function SunPaths() {
  return (
    <>
      <circle cx="24" cy="24" r="9" fill="#ffc93c" />
      <g stroke="#ffc93c" strokeLinecap="round" strokeWidth="3">
        <path d="M24 5v6" /><path d="M24 37v6" />
        <path d="M5 24h6" /><path d="M37 24h6" />
        <path d="m10.6 10.6 4.2 4.2" /><path d="m33.2 33.2 4.2 4.2" />
        <path d="m37.4 10.6-4.2 4.2" /><path d="m14.8 33.2-4.2 4.2" />
      </g>
    </>
  );
}

function CloudPaths() {
  return (
    <path
      d="M15 34c-5 0-9-3.8-9-8.5 0-4.3 3.4-7.9 7.8-8.4A13.3 13.3 0 0 1 26.2 9c6.8 0 12.4 5.1 13 11.6 4.2.8 7.4 4.4 7.4 8.7 0 4.9-4.1 8.7-9.2 8.7H15Z"
      fill="#c8d0d8"
    />
  );
}

function RainPaths() {
  return (
    <>
      <CloudPaths />
      <g stroke="#4f9cf4" strokeLinecap="round" strokeWidth="3">
        <path d="m17 37-2 4" /><path d="m26 37-2 4" /><path d="m35 37-2 4" />
      </g>
    </>
  );
}

function PartlyPaths() {
  return (
    <>
      <g transform="translate(5 2) scale(0.7)">
        <SunPaths />
      </g>
      <path
        d="M16 36c-5 0-9-3.6-9-8 0-4.1 3.2-7.5 7.4-7.9A12.7 12.7 0 0 1 26 12c6.5 0 11.7 4.8 12.4 11 4 .8 7 4.1 7 8.2 0 4.6-3.9 8.3-8.8 8.3H16Z"
        fill="#d4d9de"
      />
    </>
  );
}

function iconPaths(kind: WeatherKind) {
  if (kind === "sun") return <SunPaths />;
  if (kind === "partly") return <PartlyPaths />;
  if (kind === "rain") return <RainPaths />;
  return <CloudPaths />;
}

// --- Custom XAxis tick that renders a weather icon ---

type KindMap = Record<string, WeatherKind>;

function WeatherIconTick(props: { x?: number | string; y?: number | string; payload?: { value: string }; kindMap?: KindMap }) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const kind = props.payload && props.kindMap ? props.kindMap[props.payload.value] : undefined;
  if (!kind) return null;

  return (
    <g transform={`translate(${x - ICON_SIZE / 2}, ${y - ICON_SIZE - 2})`}>
      <g transform={`scale(${ICON_SCALE})`}>
        {iconPaths(kind)}
      </g>
    </g>
  );
}

function scoreColor(score: number): string {
  if (score >= 8) return "#93bf00";
  if (score >= 6) return "#f58a1f";
  if (score >= 4) return "#f3b329";
  return "#e15d4f";
}

// --- Score badge custom tick ---

const SCORE_R = 11;
const SCORE_SIZE = SCORE_R * 2 + 4;

function ScoreTick(props: { x?: number | string; y?: number | string; payload?: { value: string }; scoreMap?: Record<string, number> }) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const score = props.payload && props.scoreMap ? props.scoreMap[props.payload.value] : undefined;
  if (score === undefined) return null;

  return (
    <g>
      <circle cx={x} cy={y - SCORE_R - 1} r={SCORE_R} fill={scoreColor(score)} />
      <text
        x={x}
        y={y - SCORE_R - 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#fff"
        fontSize={11}
        fontWeight={700}
      >
        {score}
      </text>
    </g>
  );
}

// --- Helpers ---

function formatTick(t: string, horizon: HorizonOption): string {
  if (horizon === "+2 uur" || horizon === "+6 uur") return t;
  const h = parseInt(t, 10);
  return isNaN(h) ? t : String(h);
}

function tempDomain(hours: HourlyWeather[]): [number, number] {
  const temps = hours.map(h => h.temperatureC);
  const min = Math.floor(Math.min(...temps) / 2) * 2;
  const max = Math.ceil(Math.max(...temps) / 2) * 2;
  return min === max ? [min - 2, max + 2] : [min, max];
}

// --- Gradient background layer ---
// Renders the sky/brightness gradient behind the chart bars.
// Gradient background: each bar renders N_STEPS thin rects that interpolate
// leftColor → midColor → rightColor, simulating a smooth per-cell gradient.
// Uses Bar's `shape` prop so Recharts provides exact x/y/width/height per bar.
// Each cell's edge colours blend with its neighbours for a continuous gradient.

const CHART_MARGIN_LEFT = 4;
const CHART_MARGIN_TOP = 14;
const CHART_MARGIN_BOTTOM = 8;

const N_STEPS = 8;

function makeGradientShape(hours: HourlyWeather[], colors: CellColors) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function GradientBar(props: any) {
    const x = (props.x as number) ?? 0;
    const y = (props.y as number) ?? 0;
    const width = (props.width as number) ?? 0;
    const height = (props.height as number) ?? 0;
    const index = props.index ?? 0;
    if (width <= 0 || height <= 0) return null;
    if (index < 0 || index >= hours.length || hours.length === 0) return null;
    const stepW = width / N_STEPS;
    const leftColor  = index === 0             ? cellFill(hours[0], colors)       : mixRgba(cellFill(hours[index - 1], colors), cellFill(hours[index], colors));
    const midColor   = cellFill(hours[index], colors);
    const rightColor = index === hours.length - 1 ? cellFill(hours[index], colors) : mixRgba(cellFill(hours[index], colors), cellFill(hours[index + 1], colors));
    return (
      <g>
        {Array.from({ length: N_STEPS }, (_, j) => {
          const t = j / (N_STEPS - 1);
          const color = t <= 0.5
            ? interpolateRgba(leftColor, midColor, t * 2)
            : interpolateRgba(midColor, rightColor, (t - 0.5) * 2);
          return <rect key={j} x={x + j * stepW} y={y} width={stepW} height={height} fill={color} />;
        })}
      </g>
    );
  };
}

// Measure the chart shell ourselves and feed ComposedChart explicit pixel sizes.
// Avoids ResponsiveContainer's mount-time measurement race (the "width(-1)" warning
// and occasional collapsed-width render under StrictMode's double render).
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

// --- Main component ---

export function DayChartRecharts({ hours, horizon, cellColors, showTemp, showRain, showIcons }: Props) {
  const [tempMin, tempMax] = tempDomain(hours);
  const colors = cellColors ?? defaultCellColors;

  const kindMap: KindMap = Object.fromEntries(hours.map(h => [h.time, h.kind]));
  const scoreMap: Record<string, number> = Object.fromEntries(hours.map(h => [h.time, h.score]));
  const [shellRef, { width, height }] = useElementSize<HTMLDivElement>();

  return (
    <div style={{ marginTop: 10 }}>
      <div ref={shellRef} className="chart-shell" style={{ height: 280 }}>
        {width > 0 && height > 0 && (
          <ComposedChart width={width} height={height} data={hours} margin={{ top: CHART_MARGIN_TOP, right: 0, bottom: CHART_MARGIN_BOTTOM, left: CHART_MARGIN_LEFT }} barCategoryGap="0%">
            {/* Gradient background — FIRST for correct z-order (SVG paint order).
                shape prop receives exact x/y/width/height per bar from Recharts. */}
            <XAxis xAxisId="bg" dataKey="time" height={0} hide padding={{ left: 0, right: 0 }} />
            <YAxis yAxisId="bg" domain={[0, 1]} width={0} hide />
            <Bar xAxisId="bg" yAxisId="bg" dataKey={() => 1} isAnimationActive={false} legendType="none" shape={makeGradientShape(hours, colors)} />

            <CartesianGrid
              strokeDasharray="4 6"
              stroke="#dce3ea"
              strokeWidth={1}
            />

            {/* Score badges — always visible */}
            <XAxis
              xAxisId="scores"
              dataKey="time"
              orientation="top"
              height={SCORE_SIZE}
              tick={<ScoreTick scoreMap={scoreMap} />}
              axisLine={false}
              tickLine={false}
              interval={0}
              padding={{ left: 0, right: 0 }}
            />

            {/* Icon row above the chart */}
            {showIcons && (
              <XAxis
                xAxisId="icons"
                dataKey="time"
                orientation="top"
                height={ICON_SIZE + 6}
                tick={<WeatherIconTick kindMap={kindMap} />}
                axisLine={false}
                tickLine={false}
                interval={0}
                padding={{ left: 0, right: 0 }}
              />
            )}

            {/* Time labels below */}
            <XAxis
              xAxisId="labels"
              dataKey="time"
              tick={{ fontSize: 12, fill: "#697586" }}
              tickFormatter={(t: string) => formatTick(t, horizon)}
              axisLine={{ stroke: "#dfe6ee", strokeWidth: 1 }}
              tickLine={false}
              padding={{ left: 0, right: 0 }}
            />

            {/*
              Rain and temperature axes.
              - padding {{ left:0, right:0 }} on all XAxes ensures the first tick
                sits on the y-axis edge, not a half-band to the right.
            */}
            <YAxis yAxisId="rain" orientation="left" domain={[0, MAX_MM]} tickFormatter={v => `${v}`} tick={{ fontSize: 12, fill: "#697586" }} width={22} hide={!showRain} tickCount={4} axisLine={false} tickLine={false} />
            <YAxis yAxisId="temp" orientation="right" domain={[tempMin, tempMax]} tickFormatter={v => `${v}°`} tick={{ fontSize: 12, fill: "#ff8a3d" }} width={30} hide={!showTemp} axisLine={false} tickLine={false} />

            {showRain && (
              <Bar
                xAxisId="labels"
                yAxisId="rain"
                dataKey="precipitationMm"
                fill={RAIN_COLOR}
                stroke="rgba(255, 255, 255, 0.95)"
                strokeWidth={2.5}
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
                maxBarSize={18}
              />
            )}
            {showTemp && (
              <Line
                xAxisId="labels"
                yAxisId="temp"
                dataKey="temperatureC"
                stroke={TEMP_COLOR}
                strokeWidth={2}
                dot={{ r: 3, fill: TEMP_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        )}
      </div>
    </div>
  );
}
