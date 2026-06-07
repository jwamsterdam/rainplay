import { useEffect, useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { DayChart } from "../components/DayChart";
import { LocationSelector } from "../components/LocationSelector";
import { SegmentedControl } from "../components/SegmentedControl";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import { bestStartTime, bestWindowLabel } from "../lib/chart";
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

export function WeatherScreen() {
  const [day, setDay] = useAtom(selectedDayAtom);
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
  const selectedDateLabel = useMemo(() => headerDateLabel(hourly, day), [day, hourly]);
  const temperature = forecast.data?.currentTemperature ?? 18;

  return (
    <main className="app-shell">
      <section className="weather-hero" aria-label="Huidig weer">
        <LocationSelector onUseCurrentLocation={refreshLocation} />
        {locationError ? <p className="location-status">{locationError}</p> : null}

        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-day">{day}</span>
            {selectedDateLabel ? <span className="eyebrow-date">{selectedDateLabel}</span> : null}
          </p>
          <h1>{temperature}&deg;</h1>
          <p className="hero-advice">Buiten vanaf {bestTime}</p>
          <p className="hero-subtitle">Ochtend nat - middag bijna droog</p>
        </div>
      </section>

      <section className="decision-sheet" aria-label="Buitenadvies">
        <div className="chart-heading">
          <span className="best-pill">
            <span>Beste moment</span>
            <strong>{bestWindow}</strong>
          </span>
        </div>

        {forecast.isError ? (
          <div className="loading-panel">Weerdata niet beschikbaar</div>
        ) : forecast.isLoading ? (
          <div className="loading-panel">Weer laden</div>
        ) : (
          <DayChart hours={visibleHours} />
        )}

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
          />
        </div>

        <p className="attribution">Weather data by Open-Meteo</p>
      </section>
    </main>
  );
}
