import { useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import type { ForecastLocation } from "../api/openMeteo";
import { MIN_QUERY_LENGTH, searchLocations } from "../api/geocoding";
import {
  defaultLocation,
  locationMenuOpenAtom,
  locationStatusAtom,
  savedLocationsAtom,
  selectedLocationAtom,
} from "../state/weatherAtoms";
import { LocationArrow } from "./WeatherIcons";

type LocationSelectorProps = {
  onUseCurrentLocation: () => Promise<void>;
};

const SEARCH_DEBOUNCE_MS = 250;

export function LocationSelector({ onUseCurrentLocation }: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useAtom(locationMenuOpenAtom);
  const [selectedLocation, setSelectedLocation] = useAtom(selectedLocationAtom);
  const [savedLocations, setSavedLocations] = useAtom(savedLocationsAtom);
  const locationStatus = useAtomValue(locationStatusAtom);
  const setMenuOpen = useSetAtom(locationMenuOpenAtom);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ForecastLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const gpsLocation = selectedLocation.source === "gps" ? selectedLocation : null;

  // Debounced autocomplete: fetch suggestions as the user types, cancelling any
  // in-flight request so only the latest query's results land.
  useEffect(() => {
    const search = query.trim();
    if (search.length < MIN_QUERY_LENGTH) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);
    setSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const results = await searchLocations(search, controller.signal);
        setSuggestions(results);
        setSearchError(results.length === 0 ? "Geen plaatsen gevonden." : null);
      } catch {
        if (controller.signal.aborted) return;
        setSearchError("Zoeken lukte niet.");
        setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const chooseLocation = (location: ForecastLocation) => {
    setSavedLocations((locations) => {
      if (locations.some((savedLocation) => isSameLocation(savedLocation, location))) return locations;
      return [...locations, location];
    });
    setSelectedLocation(location);
    setQuery("");
    setSuggestions([]);
    setSearchError(null);
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
            aria-label="Locatie zoeken"
            onSubmit={(event) => {
              event.preventDefault();
              if (suggestions[0]) chooseLocation(suggestions[0]);
            }}
          >
            <input
              aria-label="Plaats zoeken"
              autoComplete="off"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Plaats zoeken"
              type="text"
              value={query}
            />
            {isSearching ? <p className="location-form-hint">Zoeken...</p> : null}
            {searchError ? <p className="location-form-error">{searchError}</p> : null}
            {suggestions.length > 0 ? (
              <ul className="location-suggestions" role="listbox" aria-label="Zoekresultaten">
                {suggestions.map((suggestion) => (
                  <li key={locationKey(suggestion)}>
                    <button
                      className="location-suggestion"
                      onClick={() => chooseLocation(suggestion)}
                      role="option"
                      aria-selected={false}
                      type="button"
                    >
                      <span className="location-suggestion-name">{suggestion.name}</span>
                      {suggestion.country ? (
                        <span className="location-suggestion-country">{suggestion.country}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
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
