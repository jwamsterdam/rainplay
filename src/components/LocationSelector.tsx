import { useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type { ForecastLocation } from "../api/openMeteo";
import { geocodeLocation, hasGoogleMapsKey } from "../api/googleMaps";
import {
  defaultLocation,
  defaultLocations,
  locationMenuOpenAtom,
  locationStatusAtom,
  savedLocationsAtom,
  selectedLocationAtom,
} from "../state/weatherAtoms";
import { LocationArrow } from "./WeatherIcons";

type LocationSelectorProps = {
  onUseCurrentLocation: () => Promise<void>;
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
  const gpsLocation = selectedLocation.source === "gps" ? selectedLocation : null;

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
        {selectedLocation.source === "gps" ? <LocationArrow className="location-button-gps" /> : null}
        <span className="chevron" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div className="location-menu" role="menu">
          <button
            className={gpsLocation ? "location-menu-current active" : "location-menu-current"}
            disabled={locationStatus === "locating"}
            onClick={async () => {
              try {
                await onUseCurrentLocation();
                setMenuOpen(false);
              } catch {
                // The hook already exposes the user-facing error state.
              }
            }}
            role="menuitem"
            type="button"
          >
            <span>
              <strong>{gpsLocation?.name ?? "Huidige locatie"}</strong>
              <small>{locationStatus === "locating" ? "Locatie ophalen..." : "GPS locatie"}</small>
            </span>
            <LocationArrow className="location-menu-arrow" />
          </button>

          {savedLocations.map((location) => (
            <div className="location-menu-row" key={locationKey(location)}>
              <button
                className={isSameLocation(location, selectedLocation) ? "location-menu-item active" : "location-menu-item"}
                onClick={() => {
                  setSelectedLocation(location);
                  setMenuOpen(false);
                }}
                role="menuitem"
                type="button"
              >
                {location.name}
              </button>
              {canDeleteLocation(location) ? (
                <button
                  aria-label={`${location.name} verwijderen`}
                  className="location-delete-button"
                  onClick={() => {
                    setSavedLocations((locations) => {
                      const nextLocations = locations.filter((savedLocation) => !isSameLocation(savedLocation, location));

                      if (isSameLocation(selectedLocation, location)) {
                        setSelectedLocation(nextLocations[0] ?? defaultLocation);
                      }

                      return nextLocations;
                    });
                  }}
                  type="button"
                >
                  Verwijder
                </button>
              ) : null}
            </div>
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
  if (a.id && b.id) return a.id === b.id;
  return a.name === b.name && a.latitude === b.latitude && a.longitude === b.longitude;
}

function locationKey(location: ForecastLocation) {
  return location.id ?? `${location.name}-${location.latitude}-${location.longitude}`;
}

function canDeleteLocation(location: ForecastLocation) {
  return location.source === "manual";
}
