# Changelog

All notable changes to Rainplay are documented here.

## [Unreleased]

### Added
- **Zod runtime API validation** — Open-Meteo forecast and geocoding responses are now validated at the network boundary via Zod schemas (`src/api/schemas/`). Invalid or structurally unexpected API responses throw a plain, readable `Error` before reaching the query layer. TypeScript types are derived from schemas with `z.infer<>`, eliminating duplicate handwritten type definitions.
- **52 new tests** covering Zod schema happy paths, optional fields, rejected invalid shapes, and the error-path integration between `fetchOpenMeteoForecast`/`searchLocations` and the schema layer.

### Changed
- `src/api/openMeteo.ts` — removed handwritten `OpenMeteoResponse` type; replaced `as Type` cast with `OpenMeteoResponseSchema.parse()` wrapped in try/catch.
- `src/api/geocoding.ts` — removed handwritten `GeocodingResponse` and `GeocodingResult` types; same pattern.

### Fixed
- **Recharts `<Customized>` re-mount on every render** — `makeNowLineLayer` and `makeChartBorderLayer` are now wrapped in `useMemo`, giving Recharts a stable component reference and preventing unnecessary layer teardown/remount on each render cycle.
