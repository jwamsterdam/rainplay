import { useMemo } from "react";
import { useAtom, useAtomValue } from "jotai";
import { DayChart } from "../components/DayChart";
import { SegmentedControl } from "../components/SegmentedControl";
import { LocationArrow } from "../components/WeatherIcons";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import { bestStartTime } from "../lib/chart";
import { visibleHoursForSelection } from "../lib/weatherView";
import { useForecastQuery } from "../queries/weather";
import {
  dayOptions,
  horizonOptions,
  locationErrorAtom,
  locationStatusAtom,
  selectedDayAtom,
  selectedHorizonAtom,
  selectedLocationAtom,
} from "../state/weatherAtoms";

export function WeatherScreen() {
  const [day, setDay] = useAtom(selectedDayAtom);
  const [horizon, setHorizon] = useAtom(selectedHorizonAtom);
  const location = useAtomValue(selectedLocationAtom);
  const locationStatus = useAtomValue(locationStatusAtom);
  const locationError = useAtomValue(locationErrorAtom);
  const { refreshLocation } = useCurrentLocation();
  const forecast = useForecastQuery(location);
  const hourly = forecast.data?.hourly ?? [];

  const visibleHours = useMemo(() => {
    return visibleHoursForSelection(hourly, day, horizon);
  }, [day, hourly, horizon]);

  const bestTime = useMemo(() => bestStartTime(visibleHours), [visibleHours]);
  const temperature = forecast.data?.currentTemperature ?? 18;

  return (
    <main className="app-shell">
      <section className="weather-hero" aria-label="Huidig weer">
        <button
          aria-label="Locatie verversen"
          className="location-button"
          disabled={locationStatus === "locating"}
          onClick={refreshLocation}
          type="button"
        >
          <span>{locationStatus === "locating" ? "Locatie ophalen..." : location.name}</span>
          <span className="chevron" aria-hidden="true" />
          <LocationArrow className="location-arrow" />
        </button>
        {locationError ? <p className="location-status">{locationError}</p> : null}

        <div className="hero-copy">
          <p className="eyebrow">{day}</p>
          <h1>{temperature}&deg;</h1>
          <p className="hero-advice">Buiten vanaf {bestTime}</p>
          <p className="hero-subtitle">Ochtend nat - middag bijna droog</p>
        </div>
      </section>

      <section className="decision-sheet" aria-label="Buitenadvies">
        <SegmentedControl label="Dag kiezen" onChange={setDay} options={dayOptions} value={day} />
        <SegmentedControl
          compact
          label="Tijdshorizon kiezen"
          onChange={setHorizon}
          options={horizonOptions}
          value={horizon}
        />

        <div className="chart-heading">
          <h2>Dagbeeld</h2>
          <span>Beste: {bestTime}</span>
        </div>

        {forecast.isError ? (
          <div className="loading-panel">Weerdata niet beschikbaar</div>
        ) : forecast.isLoading ? (
          <div className="loading-panel">Weer laden</div>
        ) : (
          <DayChart hours={visibleHours} />
        )}

        <div className="best-window">
          <span>Beste moment</span>
          <strong>{bestTime === "--:--" ? "--:--" : `${bestTime} - 18:00`}</strong>
        </div>

        <div className="legend" aria-label="Legenda">
          <span>
            <i className="legend-sky" />
            lucht
          </span>
          <span>
            <i className="legend-rain" />
            regen
          </span>
        </div>

        <p className="attribution">Weather data by Open-Meteo</p>
      </section>
    </main>
  );
}
