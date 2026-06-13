import { useCallback, useEffect, useRef } from "react";
import { useAtom, useSetAtom } from "jotai";
import { hasGoogleMapsKey, reverseGeocodeLocation } from "../api/googleMaps";
import { locationErrorAtom, locationStatusAtom, selectedLocationAtom } from "../state/weatherAtoms";

export function useCurrentLocation() {
  const [currentLocation, setLocation] = useAtom(selectedLocationAtom);
  const setStatus = useSetAtom(locationStatusAtom);
  const setError = useSetAtom(locationErrorAtom);
  const requestedOnMount = useRef(false);

  const refreshLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      setError("Locatie wordt niet ondersteund door deze browser.");
      return Promise.reject(new Error("Locatie wordt niet ondersteund door deze browser."));
    }

    setStatus("locating");
    setError(null);

    return new Promise<void>((resolve, reject) => {
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
            id: "gps",
            name,
            latitude,
            longitude,
            source: "gps",
            updatedAt: Date.now(),
          });
          setStatus("ready");
          resolve();
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setStatus("denied");
            setError("Geen locatietoegang.");
            reject(new Error("Geen locatietoegang."));
            return;
          }

          setStatus("error");
          setError("Locatie ophalen lukte niet.");
          reject(new Error("Locatie ophalen lukte niet."));
        },
        {
          enableHighAccuracy: false,
          maximumAge: 1000 * 60 * 20,
          timeout: 1000 * 12,
        },
      );
    });
  }, [setError, setLocation, setStatus]);

  useEffect(() => {
    if (requestedOnMount.current) return;
    requestedOnMount.current = true;
    // Skip automatic GPS when the user already has a persisted location stored.
    // The user can trigger GPS manually via refreshLocation (exposed via the UI).
    if (currentLocation.source !== "default") return;
    refreshLocation().catch(() => {});
  }, [currentLocation.source, refreshLocation]);

  return { refreshLocation };
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(4));
}
