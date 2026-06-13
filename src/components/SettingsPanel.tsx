import { useEffect, useRef, useState } from "react";
import { ToggleButton } from "./ToggleButton";
import { defaultCellColors } from "./cellColors";
import type { CellColors } from "./cellColors";
import { getColdLaunchSamples, measureCssHeight } from "../lib/coldLaunchViewport";

// Re-export so existing import sites that pulled these from SettingsPanel keep
// working; the source of truth now lives in the lightweight ./cellColors module.
export { defaultCellColors };
export type { CellColors };

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

// --- On-device viewport diagnostic ---
//
// Reads LIVE values off the device once on mount so the user can read them from
// their iPhone and report back. Desktop Chrome hits the device-frame media query
// and can't reproduce the iOS PWA viewport-fill issue, so this is the only way to
// see real innerHeight / svh / lvh / safe-area values from the actual device.
// Probes resolve CSS viewport units by measuring a detached fixed element.

type Diagnostics = {
  version: string;
  innerHeight: number;
  screenHeight: number;
  availHeight: number;
  clientHeight: number;
  visualViewportHeight: number | null;
  dvh: number;
  svh: number;
  lvh: number;
  safeAreaTop: number;
  safeAreaBottom: number;
  displayMode: string;
};

// measureCssHeight (the 1px-fixed-probe trick) lives in lib/coldLaunchViewport so
// it can be shared with the cold-launch capture; re-used here for the live read.

// Distinguish a true installed/home-screen launch from a Safari tab. iOS does
// not always match (display-mode: standalone) for `display: fullscreen`
// manifests, so also check the iOS-only navigator.standalone flag.
function detectDisplayMode(): string {
  const mm = (q: string) => window.matchMedia?.(q).matches ?? false;
  const iosHomeScreen = (window.navigator as { standalone?: boolean }).standalone === true;
  if (mm("(display-mode: fullscreen)")) return iosHomeScreen ? "fullscreen/ios" : "fullscreen";
  if (mm("(display-mode: standalone)") || iosHomeScreen) return "standalone";
  if (mm("(display-mode: minimal-ui)")) return "minimal-ui";
  return "browser";
}

function readDiagnostics(): Diagnostics {
  return {
    version: __APP_VERSION__,
    innerHeight: window.innerHeight,
    screenHeight: window.screen?.height ?? 0,
    availHeight: window.screen?.availHeight ?? 0,
    clientHeight: document.documentElement.clientHeight,
    visualViewportHeight: window.visualViewport
      ? Math.round(window.visualViewport.height)
      : null,
    dvh: measureCssHeight("100dvh"),
    svh: measureCssHeight("100svh"),
    lvh: measureCssHeight("100lvh"),
    safeAreaTop: measureCssHeight("env(safe-area-inset-top)"),
    safeAreaBottom: measureCssHeight("env(safe-area-inset-bottom)"),
    displayMode: detectDisplayMode(),
  };
}

function DiagnosticsBlock() {
  const [diag, setDiag] = useState<Diagnostics | null>(null);

  useEffect(() => {
    setDiag(readDiagnostics());
  }, []);

  if (!diag) return null;

  return (
    <div className="settings-diagnostics" aria-label="Diagnostiek">
      <div className="settings-diagnostics-title">Diagnostiek</div>
      <div>v {diag.version} · {diag.displayMode}</div>
      <div>innerH {diag.innerHeight} · screenH {diag.screenHeight}</div>
      <div>avail {diag.availHeight} · clientH {diag.clientHeight}</div>
      <div>visualVP {diag.visualViewportHeight ?? "—"}</div>
      <div>dvh {diag.dvh} · svh {diag.svh} · lvh {diag.lvh}</div>
      <div>safe-top {diag.safeAreaTop} · safe-bottom {diag.safeAreaBottom}</div>
      <ColdLaunchSamples />
    </div>
  );
}

// Viewport units captured around cold-launch first paint (see
// lib/coldLaunchViewport). Surfaces the iOS dvh transient the live read above
// can't catch, since the panel opens long after launch.
function ColdLaunchSamples() {
  const samples = getColdLaunchSamples();
  if (samples.length === 0) return null;

  return (
    <>
      <div className="settings-diagnostics-title">Cold-launch</div>
      {samples.map((s) => (
        <div key={s.label}>
          {s.label} +{s.t}ms · iH {s.innerHeight} · d {s.dvh} · s {s.svh} · l {s.lvh} · vp {s.visualVP ?? "—"}
        </div>
      ))}
    </>
  );
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
                  style={{
                    position: "absolute",
                    width: 0,
                    height: 0,
                    opacity: 0,
                    overflow: "hidden",
                    pointerEvents: "none",
                  }}
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

        <DiagnosticsBlock />
      </div>
    </div>
  );
}
