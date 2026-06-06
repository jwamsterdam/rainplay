# AGENTS.md

This file captures the project intent and working agreements for future Codex sessions.

## Project Summary

Rainplay is an iPhone-first vacation/outdoor weather PWA. It should help the user quickly decide:

- go outside now;
- wait a few hours;
- choose tomorrow or another day.

It is not a full meteorological dashboard. It should feel calm, useful, and Apple-like.

## User Goal

The user currently combines multiple apps:

- Buienalarm for rain amount;
- Apple Weather for simplicity;
- WeatherPro for details.

Rainplay should combine the useful parts into one much simpler app for vacation/outdoor decisions.

The core use case:

> We are on vacation. Should we go outside this morning, wait until the afternoon, or do it tomorrow?

Avoid framing the app around a specific activity. Earlier mockups mentioned cycling, but the final direction is broader: `buiten`, `op pad`, or `beste moment`.

## Chosen Platform

Build as a **React + TypeScript web app / PWA**, not native iOS and not React Native for the first version.

Reason:

- The user does not have an Apple Developer license.
- A PWA can be added to the iPhone Home Screen.
- The app can be shared easily with the user's partner.
- The product is UI/data/decision-logic heavy, not native-feature heavy.

## Design North Star

Use this screenshot as the main visual reference:

![North star design](docs/screenshots/north-star-header-graph.png)

Important design conclusions:

- Top of the screen needs a real weather feeling: sky, clouds, sun, temperature, and advice.
- Bottom of the screen is the practical decision area.
- No bottom tab bar.
- No activity selector.
- Use a location selector/dropdown with default GPS/current location.
- Main selectors:
  - `Vandaag`
  - `Morgen`
  - `Overmorgen`
  - `Week`
- Horizon selectors:
  - `Hele dag`
  - `+6 uur`
  - `+2 uur`
- The graph is the main decision visualization.

## UI Copy Direction

Use Dutch copy. Keep it direct and calm.

Examples:

- `Buiten vanaf 14:00`
- `Wacht tot de middag`
- `Nu goed naar buiten`
- `Morgen beter`
- `Ochtend nat - middag bijna droog`
- `Dagbeeld`
- `Beste moment`
- `Beste: 14:00`
- `Weather data by Open-Meteo`

## Chart Requirements

The chart must be one combined graph:

- background blocks show sky/brightness over time;
- rain bars show precipitation amount in mm;
- score row shows the outdoor score per hour;
- y-axis shows precipitation in millimeters;
- x-axis shows detailed times.

Keep the graph airy:

- very subtle grid lines;
- pale background blocks;
- no heavy card or dashboard feel;
- rain bars in soft iOS blue;
- thin white outline/halo around rain bars.

The sky/brightness background should be derived from:

- cloud cover;
- shortwave radiation;
- sunshine duration;
- daylight;
- weather code if useful.

## Data Source

Use **Open-Meteo** for the first version.

Docs:

- https://open-meteo.com/en/docs
- https://open-meteo.com/en/docs/knmi-api

Reason:

- no API account needed for prototyping;
- worldwide coordinates;
- simple JSON;
- hourly data;
- rain amount and rain probability;
- cloud cover and solar data;
- wind and temperature;
- KNMI models available via Open-Meteo for relevant regions.

Do not start by parsing raw KNMI GRIB/HDF5/NetCDF data unless the user explicitly asks. Direct KNMI Data Platform data is useful but too heavy for the initial PWA.

## Suggested API Fields

Use an Open-Meteo request shaped around these variables.

Current:

- `temperature_2m`
- `apparent_temperature`
- `precipitation`
- `rain`
- `showers`
- `weather_code`
- `cloud_cover`
- `wind_speed_10m`
- `wind_gusts_10m`

Hourly:

- `temperature_2m`
- `apparent_temperature`
- `precipitation`
- `precipitation_probability`
- `rain`
- `showers`
- `cloud_cover`
- `shortwave_radiation`
- `sunshine_duration`
- `weather_code`
- `wind_speed_10m`
- `wind_gusts_10m`
- `is_day`

Daily:

- `weather_code`
- `temperature_2m_max`
- `temperature_2m_min`
- `sunrise`
- `sunset`
- `daylight_duration`
- `sunshine_duration`
- `precipitation_sum`
- `precipitation_probability_max`
- `wind_speed_10m_max`
- `wind_gusts_10m_max`

## Outdoor Score

Expose a simple 0-10 score in the UI, but keep the formula invisible.

Initial formula should consider:

- precipitation amount;
- precipitation probability;
- apparent temperature;
- wind speed;
- wind gusts;
- cloud cover;
- sunshine / shortwave radiation;
- daylight.

The score is a decision aid, not a scientific claim. Tune it for human usefulness.

## Implementation Preferences

Use:

- React;
- TypeScript;
- Vite;
- Jotai for client/UI state;
- TanStack Query for weather API/server state;
- PWA manifest;
- browser geolocation;
- custom SVG/CSS chart unless a charting library becomes clearly necessary.

Keep the initial app small. Avoid adding a design system or heavy chart dependency too early.

Current architecture:

- `src/providers/AppProviders.tsx` provides the explicit Jotai store and QueryClient.
- `src/state/` owns atoms and app-store setup.
- `src/queries/` owns TanStack Query hooks.
- `src/api/` owns Open-Meteo integration and API normalization.
- `src/design/tokens.css` is the design-token layer.
- `src/screens/WeatherScreen.tsx` is the main screen composition.

## Build Order

Recommended first implementation steps:

1. Scaffold React + TypeScript + Vite.
2. Build static UI using mock data matching the north-star screenshot.
3. Add chart rendering with mock hourly data.
4. Add Open-Meteo fetch adapter.
5. Normalize API data into app-specific weather periods.
6. Implement outdoor score.
7. Add geolocation and a fallback/manual location.
8. Add PWA manifest and iPhone Home Screen metadata.
9. Test on desktop and iPhone viewport.

## Non-Goals For The First Version

- Native iOS app.
- React Native app.
- CarPlay app.
- App Store distribution.
- Complex weather maps.
- Weather radar.
- Activity-specific recommendations.
- Multi-page dashboard.

## Current Repo State

At the time this file was created, the repo only had documentation and screenshot references. The app has not been scaffolded yet.
