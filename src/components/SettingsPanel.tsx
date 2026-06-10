import { useRef } from "react";
import { ToggleButton } from "./ToggleButton";

export type CellColors = {
  sun: string;
  partly: string;
  cloud: string;
  rain: string;
  night: string;
};

export const defaultCellColors: CellColors = {
  sun: "rgba(255, 196, 0, 0.24)",
  partly: "rgba(243, 204, 73, 0.15)",
  cloud: "rgba(148, 191, 255, 0.15)",
  rain: "rgba(139, 149, 156, 0.37)",
  night: "rgba(255, 255, 255, 0.52)",
};

type ColorKey = keyof CellColors;

type ColorRow = {
  key: ColorKey;
  label: string;
  icon: React.ReactNode;
};

// --- Inline mini-icons (24×24 viewBox) ---

function SunIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="9" fill="#ffc93c" />
      <g stroke="#ffc93c" strokeLinecap="round" strokeWidth="3">
        <path d="M24 5v6" /><path d="M24 37v6" />
        <path d="M5 24h6" /><path d="M37 24h6" />
        <path d="m10.6 10.6 4.2 4.2" /><path d="m33.2 33.2 4.2 4.2" />
        <path d="m37.4 10.6-4.2 4.2" /><path d="m14.8 33.2-4.2 4.2" />
      </g>
    </svg>
  );
}

function PartlyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
      <g transform="translate(4 2) scale(0.7)">
        <circle cx="24" cy="24" r="9" fill="#ffc93c" />
        <g stroke="#ffc93c" strokeLinecap="round" strokeWidth="3">
          <path d="M24 5v6" /><path d="M24 37v6" />
          <path d="M5 24h6" /><path d="M37 24h6" />
        </g>
      </g>
      <path d="M16 36c-5 0-9-3.6-9-8 0-4.1 3.2-7.5 7.4-7.9A12.7 12.7 0 0 1 26 12c6.5 0 11.7 4.8 12.4 11 4 .8 7 4.1 7 8.2 0 4.6-3.9 8.3-8.8 8.3H16Z" fill="#d4d9de" />
    </svg>
  );
}

function CloudIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
      <path d="M15 34c-5 0-9-3.8-9-8.5 0-4.3 3.4-7.9 7.8-8.4A13.3 13.3 0 0 1 26.2 9c6.8 0 12.4 5.1 13 11.6 4.2.8 7.4 4.4 7.4 8.7 0 4.9-4.1 8.7-9.2 8.7H15Z" fill="#c8d0d8" />
    </svg>
  );
}

function RainIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
      <path d="M15 34c-5 0-9-3.8-9-8.5 0-4.3 3.4-7.9 7.8-8.4A13.3 13.3 0 0 1 26.2 9c6.8 0 12.4 5.1 13 11.6 4.2.8 7.4 4.4 7.4 8.7 0 4.9-4.1 8.7-9.2 8.7H15Z" fill="#c8d0d8" />
      <g stroke="#4f9cf4" strokeLinecap="round" strokeWidth="3">
        <path d="m17 37-2 4" /><path d="m26 37-2 4" /><path d="m35 37-2 4" />
      </g>
    </svg>
  );
}

function NightIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
      <path d="M36 26a14 14 0 1 1-14-14c-1.8 3.2-2.6 6.9-2 10.6A14 14 0 0 0 36 26Z" fill="#697586" />
      <circle cx="36" cy="10" r="2" fill="#697586" opacity="0.5" />
      <circle cx="40" cy="18" r="1.5" fill="#697586" opacity="0.4" />
      <circle cx="30" cy="7" r="1" fill="#697586" opacity="0.3" />
    </svg>
  );
}

const COLOR_ROWS: ColorRow[] = [
  { key: "sun",    label: "Zon",             icon: <SunIcon /> },
  { key: "partly", label: "Zon met bewolking", icon: <PartlyIcon /> },
  { key: "cloud",  label: "Bewolkt",          icon: <CloudIcon /> },
  { key: "rain",   label: "Regen",            icon: <RainIcon /> },
  { key: "night",  label: "Nacht",            icon: <NightIcon /> },
];

// --- rgba ↔ hex helpers ---

function rgbaToHex(rgba: string): string {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return "#000000";
  return (
    "#" +
    [m[1], m[2], m[3]]
      .map((v) => Number(v).toString(16).padStart(2, "0"))
      .join("")
  );
}

function extractAlpha(rgba: string): number {
  const m = rgba.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- Component ---

type Props = {
  colors: CellColors;
  onColorsChange: (colors: CellColors) => void;
  showTemp: boolean;
  showRain: boolean;
  showIcons: boolean;
  onShowTempChange: (v: boolean) => void;
  onShowRainChange: (v: boolean) => void;
  onShowIconsChange: (v: boolean) => void;
  onClose: () => void;
};

export function SettingsPanel({ colors, onColorsChange, showTemp, showRain, showIcons, onShowTempChange, onShowRainChange, onShowIconsChange, onClose }: Props) {
  const inputRefs = useRef<Record<ColorKey, HTMLInputElement | null>>({
    sun: null, partly: null, cloud: null, rain: null, night: null,
  });

  function handleSwatchClick(key: ColorKey) {
    inputRefs.current[key]?.click();
  }

  function handleColorChange(key: ColorKey, hex: string) {
    const alpha = extractAlpha(colors[key]);
    onColorsChange({ ...colors, [key]: hexToRgba(hex, alpha) });
  }

  function handleAlphaChange(key: ColorKey, alpha: number) {
    const hex = rgbaToHex(colors[key]);
    onColorsChange({ ...colors, [key]: hexToRgba(hex, alpha) });
  }

  return (
    <div className="settings-overlay">
      <div className="settings-sheet">
        <div className="settings-header">
          <h2 className="settings-title">Grafiekkleuren</h2>
          <button className="settings-close" onClick={onClose} aria-label="Sluiten">×</button>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">Grafiek lagen</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ToggleButton active={showTemp} color="#f97316" label="Temperatuur" onClick={() => onShowTempChange(!showTemp)} />
            <ToggleButton active={showRain} color="#78b4f8" label="Neerslag" onClick={() => onShowRainChange(!showRain)} />
            <ToggleButton active={showIcons} color="#64748b" label="Iconen" onClick={() => onShowIconsChange(!showIcons)} />
          </div>
        </div>

        <p className="settings-hint">Tik op het kleurvlak om de kleur te kiezen. Sleep de schuifregelaar voor de intensiteit.</p>

        <ul className="settings-color-list">
          {COLOR_ROWS.map(({ key, label, icon }) => {
            const rgba = colors[key];
            const hex = rgbaToHex(rgba);
            const alpha = extractAlpha(rgba);

            return (
              <li key={key} className="settings-color-row">
                <span className="settings-color-icon">{icon}</span>
                <span className="settings-color-label">{label}</span>
                <button
                  className="settings-color-swatch"
                  style={{ background: rgba }}
                  onClick={() => handleSwatchClick(key)}
                  aria-label={`Kleur wijzigen voor ${label}`}
                  title={rgba}
                />
                <input
                  ref={(el) => { inputRefs.current[key] = el; }}
                  type="color"
                  value={hex}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  style={{ display: "none" }}
                  aria-hidden="true"
                />
                <div className="settings-alpha-row">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={alpha}
                    onChange={(e) => handleAlphaChange(key, parseFloat(e.target.value))}
                    className="settings-alpha-slider"
                    aria-label={`Intensiteit voor ${label}`}
                  />
                  <span className="settings-alpha-value">{Math.round(alpha * 100)}%</span>
                </div>
                <span className="settings-color-code">{rgba}</span>
              </li>
            );
          })}
        </ul>

        <button className="settings-done" onClick={onClose}>Klaar</button>

        <p className="settings-version">{__APP_VERSION__}</p>
      </div>
    </div>
  );
}
