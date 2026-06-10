import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Weerquery overschrijft staleTime en refetch-opties zelf.
      // Hier staan veilige app-brede defaults.
      staleTime: 5 * 60 * 1000,   // 5 min
      gcTime: 60 * 60 * 1000,     // 1 uur in memory bewaren
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
