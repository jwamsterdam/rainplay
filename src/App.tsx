import { useMemo, useState } from "react";
import { DayChart } from "./components/DayChart";
import { SegmentedControl } from "./components/SegmentedControl";
import { LocationArrow } from "./components/WeatherIcons";
import { hourlyWeather } from "./data/mockWeather";
import { bestStartTime } from "./lib/chart";
import type { DayOption, HorizonOption } from "./types";

const dayOptions: DayOption[] = ["Vandaag", "Morgen", "Overmorgen", "Week"];
const horizonOptions: HorizonOption[] = ["Hele dag", "+6 uur", "+2 uur"];

function App() {
  const [day, setDay] = useState<DayOption>("Vandaag");
  const [horizon, setHorizon] = useState<HorizonOption>("+6 uur");

  const visibleHours = useMemo(() => {
    if (horizon === "+2 uur") return hourlyWeather.slice(0, 3);
    if (horizon === "+6 uur") return hourlyWeather.slice(0, 7);
    return hourlyWeather;
  }, [horizon]);

  const bestTime = useMemo(() => bestStartTime(visibleHours), [visibleHours]);

  return (
    <main className="app-shell">
      <section className="weather-hero" aria-label="Huidig weer">
        <button className="location-button" type="button">
          <span>Annecy</span>
          <span className="chevron" aria-hidden="true" />
          <LocationArrow className="location-arrow" />
        </button>

        <div className="hero-copy">
          <p className="eyebrow">{day === "Vandaag" ? "Vandaag" : day}</p>
          <h1>18°</h1>
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

        <DayChart hours={visibleHours} />

        <div className="best-window">
          <span>Beste moment</span>
          <strong>14:00 - 18:00</strong>
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

export default App;
