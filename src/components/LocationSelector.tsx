import { useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type { ForecastLocation } from "../api/openMeteo";
import {
  locationMenuOpenAtom,
  locationStatusAtom,
  savedLocationsAtom,
  selectedLocationAtom,
} from "../state/weatherAtoms";
import { LocationArrow } from "./WeatherIcons";

type LocationSelectorProps = {
  onUseCurrentLocation: () => void;
};

const emptyForm = {
  name: "",
  latitude: "",
  longitude: "",
};

export function LocationSelector({ onUseCurrentLocation }: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useAtom(locationMenuOpenAtom);
  const [selectedLocation, setSelectedLocation] = useAtom(selectedLocationAtom);
  const [savedLocations, setSavedLocations] = useAtom(savedLocationsAtom);
  const locationStatus = useAtomValue(locationStatusAtom);
  const setMenuOpen = useSetAtom(locationMenuOpenAtom);
  const [form, setForm] = useState(emptyForm);

  const addLocation = () => {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const name = form.name.trim();

    if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    const location: ForecastLocation = {
      name,
      latitude,
      longitude,
      source: "manual",
      updatedAt: Date.now(),
    };

    setSavedLocations((locations) => [...locations, location]);
    setSelectedLocation(location);
    setForm(emptyForm);
    setMenuOpen(false);
  };

  return (
    <div className="location-selector">
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Locatie kiezen"
        className="location-button"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span>{selectedLocation.name}</span>
        <span className="chevron" aria-hidden="true" />
        <LocationArrow className="location-arrow" />
      </button>

      {isOpen ? (
        <div className="location-menu" role="menu">
          <button
            className="location-menu-item"
            disabled={locationStatus === "locating"}
            onClick={() => {
              onUseCurrentLocation();
              setMenuOpen(false);
            }}
            role="menuitem"
            type="button"
          >
            Gebruik huidige locatie
          </button>

          {savedLocations.map((location) => (
            <button
              className={isSameLocation(location, selectedLocation) ? "location-menu-item active" : "location-menu-item"}
              key={`${location.name}-${location.latitude}-${location.longitude}`}
              onClick={() => {
                setSelectedLocation(location);
                setMenuOpen(false);
              }}
              role="menuitem"
              type="button"
            >
              {location.name}
            </button>
          ))}

          <div className="location-form" aria-label="Locatie toevoegen">
            <input
              aria-label="Locatienaam"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Naam"
              type="text"
              value={form.name}
            />
            <div className="location-form-grid">
              <input
                aria-label="Latitude"
                inputMode="decimal"
                onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
                placeholder="Lat"
                type="text"
                value={form.latitude}
              />
              <input
                aria-label="Longitude"
                inputMode="decimal"
                onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
                placeholder="Lon"
                type="text"
                value={form.longitude}
              />
            </div>
            <button className="location-add-button" onClick={addLocation} type="button">
              Toevoegen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function isSameLocation(a: ForecastLocation, b: ForecastLocation) {
  return a.name === b.name && a.latitude === b.latitude && a.longitude === b.longitude;
}
