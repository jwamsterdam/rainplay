import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import React from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { locationErrorAtom } from "../state/weatherAtoms";
import { WeatherScreen } from "./WeatherScreen";

// --- Module mocks (hoisted; run before imports are resolved) ---

vi.mock("../hooks/useCurrentLocation", () => ({
  useCurrentLocation: () => ({ refreshLocation: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("../queries/weather", () => ({
  useForecastQuery: vi.fn(),
}));

// LocationSelector calls searchLocations; keep it silent in these tests
vi.mock("../api/geocoding", () => ({
  MIN_QUERY_LENGTH: 2,
  searchLocations: vi.fn().mockResolvedValue([]),
}));

// SettingsPanel is lazy-loaded and reads __APP_VERSION__
beforeAll(() => {
  (globalThis as unknown as Record<string, unknown>).__APP_VERSION__ = "0.0.0-test";
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
  // DayCarousel uses ResizeObserver
  (globalThis as typeof globalThis & { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // DayCarousel draws a canvas sky gradient
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  });
  // DayCarousel calls scrollTo when the selected day changes
  Element.prototype.scrollTo = vi.fn();
  // useCurrentLocation stubs geolocation — keep navigator.geolocation absent
  Object.defineProperty(globalThis.navigator, "geolocation", {
    value: undefined,
    configurable: true,
  });
});

import { useForecastQuery } from "../queries/weather";
const mockForecast = vi.mocked(useForecastQuery);

function loadingForecast() {
  return {
    data: undefined,
    isLoading: true,
    isError: false,
    status: "pending" as const,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useForecastQuery>;
}

function successForecast() {
  return {
    data: {
      hourly: [],
      minutely15: [],
      currentTemperature: 21,
    },
    isLoading: false,
    isError: false,
    status: "success" as const,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useForecastQuery>;
}

function makeWrapper() {
  const store = createStore();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }
  return { store, Wrapper };
}

beforeEach(() => {
  mockForecast.mockReturnValue(loadingForecast());
});

describe("WeatherScreen", () => {
  it("renders the main shell without crashing", () => {
    const { Wrapper } = makeWrapper();
    render(<WeatherScreen />, { wrapper: Wrapper });
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renders the location button in the hero", () => {
    const { Wrapper } = makeWrapper();
    render(<WeatherScreen />, { wrapper: Wrapper });
    expect(screen.getByRole("button", { name: "Locatie kiezen" })).toBeInTheDocument();
  });

  it("renders the day selector with Vandaag, Morgen, Overmorgen, Week", () => {
    const { Wrapper } = makeWrapper();
    render(<WeatherScreen />, { wrapper: Wrapper });
    // SegmentedControl renders <button> elements with role="radio" and aria-checked
    expect(screen.getByRole("radio", { name: "Vandaag" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Morgen" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Week" })).toBeInTheDocument();
  });

  it("renders the gear button", () => {
    const { Wrapper } = makeWrapper();
    render(<WeatherScreen />, { wrapper: Wrapper });
    expect(screen.getByRole("button", { name: "Instellingen openen" })).toBeInTheDocument();
  });

  it("opens the settings panel when gear is clicked", async () => {
    const { Wrapper } = makeWrapper();
    render(<WeatherScreen />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Instellingen openen" }));
    await waitFor(() => expect(screen.getByText("Grafiekkleuren")).toBeInTheDocument());
  });

  it("closes the settings panel when Sluiten is clicked", async () => {
    const { Wrapper } = makeWrapper();
    render(<WeatherScreen />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Instellingen openen" }));
    await waitFor(() => screen.getByRole("button", { name: "Sluiten" }));
    fireEvent.click(screen.getByRole("button", { name: "Sluiten" }));
    await waitFor(() =>
      expect(screen.queryByText("Grafiekkleuren")).not.toBeInTheDocument(),
    );
  });

  it("shows a location error message when locationErrorAtom is set", () => {
    const { store, Wrapper } = makeWrapper();
    store.set(locationErrorAtom, "Geen locatietoegang.");
    render(<WeatherScreen />, { wrapper: Wrapper });
    expect(screen.getByText("Geen locatietoegang.")).toBeInTheDocument();
  });

  it("shows the current temperature from the forecast", () => {
    mockForecast.mockReturnValue(successForecast());
    const { Wrapper } = makeWrapper();
    render(<WeatherScreen />, { wrapper: Wrapper });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("21°");
  });

  it("shows the Open-Meteo attribution", () => {
    const { Wrapper } = makeWrapper();
    render(<WeatherScreen />, { wrapper: Wrapper });
    expect(screen.getByText(/open-meteo/i)).toBeInTheDocument();
  });

  it("disables the horizon selector when Morgen is selected", async () => {
    const { Wrapper } = makeWrapper();
    render(<WeatherScreen />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("radio", { name: "Morgen" }));
    await waitFor(() => {
      const horizonControl = screen.getByRole("radiogroup", {
        name: /tijdshorizon alleen beschikbaar voor vandaag/i,
      });
      expect(horizonControl).toBeInTheDocument();
    });
  });
});
