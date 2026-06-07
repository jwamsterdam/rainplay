import { useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type { ForecastLocation } from "../api/openMeteo";
import { geocodeLocation, hasGoogleMapsKey } from "../api/googleMaps";
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
  query: "",
};

export function LocationSelector({ onUseCurrentLocation }: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useAtom(locationMenuOpenAtom);
  const [selectedLocation, setSelectedLocation] = useAtom(selectedLocationAtom);
  const [savedLocations, setSavedLocations] = useAtom(savedLocationsAtom);
  const locationStatus = useAtomValue(locationStatusAtom);
  const setMenuOpen = useSetAtom(locationMenuOpenAtom);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  const addLocation = async () => {
    setFormError(null);

    if (!hasGoogleMapsKey()) {
      setFormError("Google API key ontbreekt.");
      return;
    }

    setIsAddingLocation(true);

    try {
      const location = await geocodeLocation(form.query);

      setSavedLocations((locations) => {
        if (locations.some((savedLocation) => isSameLocation(savedLocation, location))) return locations;
        return [...locations, location];
      });
      setSelectedLocation(location);
      setForm(emptyForm);
      setMenuOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Locatie toevoegen lukte niet.");
    } finally {
      setIsAddingLocation(false);
    }
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

          <form
            className="location-form"
            aria-label="Locatie toevoegen"
            onSubmit={(event) => {
              event.preventDefault();
              void addLocation();
            }}
          >
            <input
              aria-label="Plaats of adres"
              onChange={(event) => setForm({ query: event.target.value })}
              placeholder="Plaats of adres"
              type="text"
              value={form.query}
            />
            {formError ? <p className="location-form-error">{formError}</p> : null}
            <button className="location-add-button" disabled={isAddingLocation} type="submit">
              {isAddingLocation ? "Zoeken..." : "Toevoegen"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function isSameLocation(a: ForecastLocation, b: ForecastLocation) {
  return a.name === b.name && a.latitude === b.latitude && a.longitude === b.longitude;
}
