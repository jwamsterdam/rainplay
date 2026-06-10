import { useQuery } from "@tanstack/react-query";
import { fetchOpenMeteoForecast, type ForecastLocation } from "../api/openMeteo";

export function useForecastQuery(location: ForecastLocation) {
  return useQuery({
    queryKey: ["forecast", location.latitude, location.longitude],
    queryFn: () => fetchOpenMeteoForecast(location),

    // Weerdata is na 5 min "oud" — een window-focus daarna triggert een fetch.
    staleTime: 5 * 60 * 1000,

    // Prik elke 10 min een achtergrond-fetch zolang de app open is.
    refetchInterval: 10 * 60 * 1000,
    // Niet pollen als de tab niet zichtbaar is (batterij-vriendelijk op iPhone).
    refetchIntervalInBackground: false,

    // Herlaad zodra de gebruiker terugkomt naar de app (o.a. na lock-screen).
    refetchOnWindowFocus: true,
    // Herlaad na het herstellen van een internet-verbinding.
    refetchOnReconnect: true,
  });
}
