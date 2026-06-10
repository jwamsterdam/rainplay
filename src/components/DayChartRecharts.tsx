import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ComposedChart, XAxis, YAxis, Line, Bar, CartesianGrid, ReferenceLine } from "recharts";
import type { HorizonOption, HourlyWeather, WeatherKind } from "../types";
import { defaultCellColors } from "./SettingsPanel";
import type { CellColors } from "./SettingsPanel";
import { buildSkyGradientStops } from "../lib/chart";
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
  isToday?: boolean;
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

// "08:00" → "8:00", "12:00" → "12:00", "ma" → "ma" (week-view dag-namen)
function formatTick(t: string): string {
  if (!t.includes(":")) return t;
  const [hh = "0", mm = "00"] = t.split(":");
  return `${parseInt(hh, 10)}:${mm}`;
}

// Custom vertical tick for the x-axis
function VerticalTimeTick(props: { x?: number | string; y?: number | string; payload?: { value: string } }) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const label = formatTick(props.payload?.value ?? "");
  return (
    <g transform={`translate(${x},${y + 4})`}>
      <text
        transform="rotate(-90)"
        textAnchor="end"
        fill="#697586"
        fontSize={11}
      >
        {label}
      </text>
    </g>
  );
}

// Find the closest time label in the data to the current wall-clock time
function nearestNowLabel(hours: HourlyWeather[]): string | null {
  if (hours.length === 0) return null;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let best: string | null = null;
  let bestDiff = Infinity;
  for (const h of hours) {
    const [hh = "0", mm = "00"] = h.time.split(":");
    const diff = Math.abs(parseInt(hh, 10) * 60 + parseInt(mm, 10) - nowMin);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = h.time;
    }
  }
  return best;
}

function tempDomain(hours: HourlyWeather[]): [number, number] {
  const temps = hours.map(h => h.temperatureC);
  const min = Math.floor(Math.min(...temps) / 2) * 2;
  const max = Math.ceil(Math.max(...temps) / 2) * 2;
  return min === max ? [min - 2, max + 2] : [min, max];
}

// --- Gradient background layer ---
// Renders the sky/brightness gradient behind the chart bars.
// The whole gradient is painted ONCE on an offscreen-backed <canvas> using a
// single createLinearGradient, so there are no alpha-compounding seams between
// cells (the old approach stacked many semi-transparent rects, which painted
// visible dark stripes at every band boundary).

const CHART_MARGIN_LEFT = 4;
const CHART_MARGIN_TOP = 14;
const CHART_MARGIN_BOTTOM = 8;

type PlotRect = { x: number; y: number; width: number; height: number };

// Invisible probe Bar: its `shape` callback is called once per data point with
// the exact x/y/width/height Recharts laid out. We union those into the full
// plot-area rectangle and hand it to the canvas, so the gradient lines up
// pixel-accurately with the rain bands and the "nu" ReferenceLine.
function makePlotRectProbe(onMeasure: (rect: PlotRect) => void) {
  let minX = Infinity;
  let maxRight = -Infinity;
  let top = 0;
  let bottom = 0;
  let pending: PlotRect | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function ProbeBar(props: any) {
    const x = (props.x as number) ?? 0;
    const y = (props.y as number) ?? 0;
    const width = (props.width as number) ?? 0;
    const height = (props.height as number) ?? 0;
    const index = (props.index as number) ?? 0;
    // First bar of a fresh layout pass — reset accumulators so a shrink in
    // plot width is reflected (not just growth).
    if (index === 0) {
      minX = Infinity;
      maxRight = -Infinity;
    }
    if (width > 0 && height > 0) {
      minX = Math.min(minX, x);
      maxRight = Math.max(maxRight, x + width);
      top = y;
      bottom = y + height;
      const next: PlotRect = { x: minX, y: top, width: maxRight - minX, height: bottom - top };
      if (
        !pending ||
        pending.x !== next.x ||
        pending.y !== next.y ||
        pending.width !== next.width ||
        pending.height !== next.height
      ) {
        pending = next;
        onMeasure(next);
      }
    }
    // Probe only — paint nothing.
    return <g />;
  };
}

// Canvas that paints the sky gradient for the measured plot rect.
function SkyGradientCanvas({ hours, colors, rect }: { hours: HourlyWeather[]; colors: CellColors; rect: PlotRect | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rect || rect.width <= 0 || rect.height <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cssWidth = rect.width;
    const cssHeight = rect.height;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const stops = buildSkyGradientStops(hours, colors);
    if (stops.length === 0) return;

    const gradient = ctx.createLinearGradient(0, 0, cssWidth, 0);
    for (const stop of stops) gradient.addColorStop(stop.offset, stop.color);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cssWidth, cssHeight);
  }, [hours, colors, rect]);

  if (!rect) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: "absolute", left: rect.x, top: rect.y, pointerEvents: "none" }}
    />
  );
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

export function DayChartRecharts({ hours, horizon, cellColors, showTemp, showRain, showIcons, isToday }: Props) {
  const [tempMin, tempMax] = tempDomain(hours);
  const colors = cellColors ?? defaultCellColors;

  const kindMap: KindMap = Object.fromEntries(hours.map(h => [h.time, h.kind]));
  const scoreMap: Record<string, number> = Object.fromEntries(hours.map(h => [h.time, h.score]));
  const [shellRef, { width, height }] = useElementSize<HTMLDivElement>();
  const [plotRect, setPlotRect] = useState<PlotRect | null>(null);

  // Stable probe per render of the bg Bar — collects the plot-area rectangle
  // from Recharts' per-bar layout so the canvas can align to it.
  const plotRectProbe = useMemo(() => makePlotRectProbe(setPlotRect), []);

  const nowLabel = useMemo(
    () => (isToday ? nearestNowLabel(hours) : null),
    // Recalculate when hours change; intentionally NOT on a timer — good enough for a weather app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isToday, hours],
  );

  return (
    <div style={{ marginTop: 10 }}>
      <div ref={shellRef} className="chart-shell" style={{ height: 280 }}>
        {/* Sky gradient painted once on canvas, BEHIND the Recharts SVG. */}
        <SkyGradientCanvas hours={hours} colors={colors} rect={plotRect} />
        {width > 0 && height > 0 && (
          <ComposedChart width={width} height={height} data={hours} margin={{ top: CHART_MARGIN_TOP, right: 0, bottom: CHART_MARGIN_BOTTOM, left: CHART_MARGIN_LEFT }} barCategoryGap="0%" style={{ position: "relative", zIndex: 1 }}>
            {/* Invisible probe Bar — measures the plot-area rectangle so the
                canvas gradient aligns to the rain bands and the "nu" line. */}
            <XAxis xAxisId="bg" dataKey="time" height={0} hide padding={{ left: 0, right: 0 }} />
            <YAxis yAxisId="bg" domain={[0, 1]} width={0} hide />
            <Bar xAxisId="bg" yAxisId="bg" dataKey={() => 1} isAnimationActive={false} legendType="none" shape={plotRectProbe} />

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

            {/* Time labels below — rotated vertical, "8:00" format, one per data point */}
            <XAxis
              xAxisId="labels"
              dataKey="time"
              tick={<VerticalTimeTick />}
              height={36}
              interval={0}
              axisLine={{ stroke: "#dfe6ee", strokeWidth: 1 }}
              tickLine={false}
              padding={{ left: 0, right: 0 }}
            />

            {/* "Nu"-lijn op vandaag */}
            {nowLabel && (
              <ReferenceLine
                xAxisId="labels"
                yAxisId="rain"
                x={nowLabel}
                stroke="rgba(255, 59, 48, 0.75)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                label={{ value: "nu", position: "insideTopRight", fill: "rgba(255, 59, 48, 0.85)", fontSize: 10, fontWeight: 600 }}
              />
            )}

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
