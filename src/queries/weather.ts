import { useQuery } from "@tanstack/react-query";
import { fetchOpenMeteoForecast, type ForecastLocation } from "../api/openMeteo";

export function useForecastQuery(location: ForecastLocation) {
  return useQuery({
    queryKey: ["forecast", location.latitude, location.longitude],
    queryFn: () => fetchOpenMeteoForecast(location),

    // Data is 5 min vers; daarna triggert een window-focus of reconnect een fetch.
    staleTime: 5 * 60 * 1000,

    // Geen actieve achtergrond-polling — data ververst alleen wanneer de
    // gebruiker terugkomt naar de app of internet herstelt.
    refetchInterval: false,
    refetchIntervalInBackground: false,

    // Herlaad zodra de gebruiker terugkomt naar de app (o.a. na lock-screen).
    refetchOnWindowFocus: true,
    // Herlaad na het herstellen van een internet-verbinding.
    refetchOnReconnect: true,

    // Een afgekapte mobiele verbinding (timeout/abort) wordt automatisch nog
    // 2x opnieuw geprobeerd met oplopende vertraging. Een 4xx (vooral 429
    // rate-limit) wordt NIET opnieuw geprobeerd — dat zou een al-overbelaste
    // API alleen verder hameren — en toont meteen de "Opnieuw proberen"-knop.
    retry: (failureCount, error) => {
      const status = (error as { status?: number }).status;
      if (status !== undefined && status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}
