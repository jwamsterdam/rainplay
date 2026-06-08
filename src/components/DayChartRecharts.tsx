import { useLayoutEffect, useRef, useState } from "react";
import { ComposedChart, XAxis, YAxis, Line, Bar, CartesianGrid, Cell } from "recharts";
import type { HorizonOption, HourlyWeather, WeatherKind } from "../types";

const RAIN_COLOR = "#78b4f8";
const TEMP_COLOR = "#f97316";
const MAX_MM = 3;
const ICON_SIZE = 22;
const ICON_SCALE = ICON_SIZE / 48;

type Props = {
  hours: HourlyWeather[];
  horizon: HorizonOption;
};

// Background tint per interval — keyed off the same isDay/kind that picks the icon
// above it, so the column colour always matches its icon. Night overrides the kind.
const NIGHT_FILL = "rgba(30, 41, 80, 0.16)";
const DAY_FILL: Record<WeatherKind, string> = {
  sun: "rgba(255, 196, 0, 0.14)",
  partly: "rgba(255, 196, 0, 0.07)",
  cloud: "rgba(148, 163, 184, 0.13)",
  rain: "rgba(120, 180, 248, 0.15)",
};

function cellFill(hour: HourlyWeather): string {
  return hour.isDay ? DAY_FILL[hour.kind] : NIGHT_FILL;
}

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

function ToggleButton({ active, color, label, onClick }: { active: boolean; color: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12,
        padding: "2px 10px",
        borderRadius: 12,
        border: `1px solid ${active ? color : "#ccc"}`,
        background: active ? color : "#fff",
        color: active ? "#fff" : "#666",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
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

export function DayChartRecharts({ hours, horizon }: Props) {
  const [showTemp, setShowTemp] = useState(true);
  const [showRain, setShowRain] = useState(true);
  const [showIcons, setShowIcons] = useState(true);
  const [tempMin, tempMax] = tempDomain(hours);

  const kindMap: KindMap = Object.fromEntries(hours.map(h => [h.time, h.kind]));
  const [shellRef, { width, height }] = useElementSize<HTMLDivElement>();

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 6, paddingLeft: 4 }}>
        <ToggleButton active={showTemp} color={TEMP_COLOR} label="Temperatuur" onClick={() => setShowTemp(v => !v)} />
        <ToggleButton active={showRain} color={RAIN_COLOR} label="Neerslag" onClick={() => setShowRain(v => !v)} />
        <ToggleButton active={showIcons} color="#64748b" label="Iconen" onClick={() => setShowIcons(v => !v)} />
      </div>

      <div ref={shellRef} className="chart-shell" style={{ height: "clamp(224px, 31dvh, 276px)" }}>
        {width > 0 && height > 0 && (
          <ComposedChart width={width} height={height} data={hours} margin={{ top: showIcons ? 32 : 16, right: 0, bottom: 8, left: 4 }} barCategoryGap="0%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

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
              />
            )}

            {/* Time labels below */}
            <XAxis
              xAxisId="labels"
              dataKey="time"
              tick={{ fontSize: 12 }}
              tickFormatter={(t: string) => formatTick(t, horizon)}
            />

            {/*
              Dedicated x/y axes for the full-height weather/night tint.
              - Own x-axis: Recharts groups bars by their shared x-axis band, so without
                a separate x-axis the tint bar splits the slot with the rain bar instead
                of filling the whole column. Same dataKey/data keeps it pixel-aligned.
              - Own y-axis (domain 0..1, value 1): makes the bar span the full plot height.
              - width/height 0: a hidden axis still consumes an axis position step equal to
                its size, which would otherwise shove the rain axis off-screen.
            */}
            <XAxis xAxisId="bg" dataKey="time" height={0} hide />
            <YAxis yAxisId="bg" domain={[0, 1]} width={0} hide />
            <YAxis yAxisId="rain" orientation="left" domain={[0, MAX_MM]} tickFormatter={v => `${v}`} tick={{ fontSize: 12 }} width={22} hide={!showRain} tickCount={4} />
            <YAxis yAxisId="temp" orientation="right" domain={[tempMin, tempMax]} tickFormatter={v => `${v}°`} tick={{ fontSize: 12 }} width={30} hide={!showTemp} />

            {/* Weather/night background tint — one full-height cell per interval, behind everything */}
            <Bar
              xAxisId="bg"
              yAxisId="bg"
              dataKey={() => 1}
              isAnimationActive={false}
              legendType="none"
              tooltipType="none"
            >
              {hours.map((h) => (
                <Cell key={h.time} fill={cellFill(h)} />
              ))}
            </Bar>

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
                barSize={18}
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
