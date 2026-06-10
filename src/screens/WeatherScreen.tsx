import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { DayCarousel } from "../components/DayCarousel";
import { LocationSelector } from "../components/LocationSelector";
import { SegmentedControl } from "../components/SegmentedControl";
import { SettingsPanel, defaultCellColors } from "../components/SettingsPanel";
import type { CellColors } from "../components/SettingsPanel";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import { bestOutdoorWindow, bestStartTime, bestWindowLabel, outdoorSummaryLabel } from "../lib/chart";
import { headerDateLabel, visibleHoursForSelection, visiblePointsForTodayHorizon } from "../lib/weatherView";
import { useForecastQuery } from "../queries/weather";
import {
  dayOptions,
  horizonOptions,
  locationErrorAtom,
  selectedDayAtom,
  selectedHorizonAtom,
  selectedLocationAtom,
} from "../state/weatherAtoms";

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

export function WeatherScreen() {
  const [day, setDay] = useAtom(selectedDayAtom);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cellColors, setCellColors] = useState<CellColors>(defaultCellColors);
  const [showTemp, setShowTemp] = useState(true);
  const [showRain, setShowRain] = useState(true);
  const [showIcons, setShowIcons] = useState(true);
  const [horizon, setHorizon] = useAtom(selectedHorizonAtom);
  const location = useAtomValue(selectedLocationAtom);
  const locationError = useAtomValue(locationErrorAtom);
  const { refreshLocation } = useCurrentLocation();
  const forecast = useForecastQuery(location);
  const hourly = forecast.data?.hourly ?? [];
  const minutely15 = forecast.data?.minutely15 ?? [];
  const showHorizonSelector = day === "Vandaag";

  useEffect(() => {
    if (day !== "Vandaag" && horizon !== "Hele dag") {
      setHorizon("Hele dag");
    }
  }, [day, horizon, setHorizon]);

  const visibleHours = useMemo(() => {
    if (day === "Vandaag") return visiblePointsForTodayHorizon(hourly, minutely15, horizon);
    return visibleHoursForSelection(hourly, day, horizon);
  }, [day, hourly, horizon, minutely15]);

  const bestTime = useMemo(() => bestStartTime(visibleHours), [visibleHours]);
  const bestWindow = useMemo(() => bestWindowLabel(visibleHours), [visibleHours]);
  const bestOutdoorSpan = useMemo(() => bestOutdoorWindow(visibleHours), [visibleHours]);
  const outdoorSummary = useMemo(() => outdoorSummaryLabel(visibleHours, bestOutdoorSpan), [bestOutdoorSpan, visibleHours]);
  const selectedDateLabel = useMemo(() => headerDateLabel(hourly, day), [day, hourly]);
  const temperature = forecast.data?.currentTemperature ?? 18;

  // Scroll-fraction ref: written by DayCarousel on every scroll frame,
  // read by SegmentedControl's RAF loop. Never triggers React re-renders.
  const scrollFractionRef = useRef<number>(0);
  const handleScrollFraction = useCallback((fraction: number) => {
    scrollFractionRef.current = fraction;
  }, []);

  return (
    <main className="app-shell">
      <section className="weather-hero" aria-label="Huidig weer">
        <LocationSelector onUseCurrentLocation={refreshLocation} />
        {locationError ? <p className="location-status">{locationError}</p> : null}
        <button
          className="settings-gear-button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Instellingen openen"
        >
          <GearIcon />
        </button>

        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-day">{day}</span>
            {selectedDateLabel ? <span className="eyebrow-date">{selectedDateLabel}</span> : null}
          </p>
          <h1>{temperature}&deg;</h1>
          <p className="hero-advice">Buiten vanaf {bestTime}</p>
          <p className="hero-subtitle">{outdoorSummary}</p>
        </div>
      </section>

      <section className="decision-sheet" aria-label="Buitenadvies">
        <div className="chart-heading">
          <span className="best-pill">
            <span>Beste moment</span>
            <strong>{bestWindow}</strong>
          </span>
        </div>

        <DayCarousel
          hourly={hourly}
          minutely15={minutely15}
          horizon={horizon}
          cellColors={cellColors}
          showTemp={showTemp}
          showRain={showRain}
          showIcons={showIcons}
          isLoading={forecast.isLoading}
          isError={forecast.isError}
          onScrollFractionChange={handleScrollFraction}
        />

        <div className="control-stack">
          <SegmentedControl
            compact
            disabled={!showHorizonSelector}
            label={showHorizonSelector ? "Tijdshorizon kiezen" : "Tijdshorizon alleen beschikbaar voor vandaag"}
            onChange={setHorizon}
            options={horizonOptions}
            value={horizon}
          />
          <SegmentedControl
            displayLabels={{ Overmorgen: "Overm." }}
            label="Dag kiezen"
            onChange={setDay}
            options={dayOptions}
            value={day}
            scrollFractionRef={scrollFractionRef}
          />
        </div>

        <p className="attribution">Weather data by Open-Meteo</p>
      </section>

      {settingsOpen && (
        <SettingsPanel
          colors={cellColors}
          onColorsChange={setCellColors}
          showTemp={showTemp}
          showRain={showRain}
          showIcons={showIcons}
          onShowTempChange={setShowTemp}
          onShowRainChange={setShowRain}
          onShowIconsChange={setShowIcons}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </main>
  );
}
