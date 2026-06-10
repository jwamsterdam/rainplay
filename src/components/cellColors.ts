// Shared cell-colour types and defaults.
//
// Lives in its own tiny module (not in SettingsPanel) so the eager chart code
// (DayChartRecharts) and WeatherScreen can import `defaultCellColors`/`CellColors`
// without pulling the heavy, lazily-loaded SettingsPanel component into the main
// bundle chunk.

export type CellColors = {
  sun: string;
  partly: string;
  cloud: string;
  rain: string;
  night: string;
};

export const defaultCellColors: CellColors = {
  sun: "rgba(255, 196, 0, 0.24)",
  partly: "rgba(243, 204, 73, 0.15)",
  cloud: "rgba(148, 191, 255, 0.15)",
  rain: "rgba(139, 149, 156, 0.37)",
  night: "rgba(10, 10, 10, 0.6)",
};
