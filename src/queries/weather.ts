import { useQuery } from "@tanstack/react-query";
import { fetchOpenMeteoForecast, type ForecastLocation } from "../api/openMeteo";

export function useForecastQuery(location: ForecastLocation) {
  return useQuery({
    queryKey: ["forecast", location.latitude, location.longitude],
    queryFn: () => fetchOpenMeteoForecast(location),
  });
}
