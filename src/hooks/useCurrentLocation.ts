import { useCallback, useEffect, useRef } from "react";
import { useSetAtom } from "jotai";
import { hasGoogleMapsKey, reverseGeocodeLocation } from "../api/googleMaps";
import { locationErrorAtom, locationStatusAtom, selectedLocationAtom } from "../state/weatherAtoms";

export function useCurrentLocation() {
  const setLocation = useSetAtom(selectedLocationAtom);
  const setStatus = useSetAtom(locationStatusAtom);
  const setError = useSetAtom(locationErrorAtom);
  const requestedOnMount = useRef(false);

  const refreshLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      setError("Locatie wordt niet ondersteund door deze browser.");
      return;
    }

    setStatus("locating");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = roundCoordinate(position.coords.latitude);
        const longitude = roundCoordinate(position.coords.longitude);
        let name = "Huidige locatie";

        if (hasGoogleMapsKey()) {
          try {
            name = await reverseGeocodeLocation(latitude, longitude);
          } catch {
            name = "Huidige locatie";
          }
        }

        setLocation({
          name,
          latitude,
          longitude,
          source: "gps",
          updatedAt: Date.now(),
        });
        setStatus("ready");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setStatus("denied");
          setError("Geen locatietoegang.");
          return;
        }

        setStatus("error");
        setError("Locatie ophalen lukte niet.");
      },
      {
        enableHighAccuracy: false,
        maximumAge: 1000 * 60 * 20,
        timeout: 1000 * 12,
      },
    );
  }, [setError, setLocation, setStatus]);

  useEffect(() => {
    if (requestedOnMount.current) return;
    requestedOnMount.current = true;
    refreshLocation();
  }, [refreshLocation]);

  return { refreshLocation };
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(4));
}
