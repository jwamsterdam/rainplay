import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ForecastLocation } from "../api/openMeteo";
import {
  locationMenuOpenAtom,
  locationStatusAtom,
  savedLocationsAtom,
  selectedLocationAtom,
} from "../state/weatherAtoms";
import { LocationSelector } from "./LocationSelector";

vi.mock("../api/geocoding", () => ({
  MIN_QUERY_LENGTH: 2,
  searchLocations: vi.fn(),
}));

import { searchLocations } from "../api/geocoding";
const mockSearch = vi.mocked(searchLocations);

const amsterdam: ForecastLocation = {
  id: "amsterdam",
  name: "Amsterdam",
  latitude: 52.3676,
  longitude: 4.9041,
  source: "manual",
};

function makeWrapper() {
  const store = createStore();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }
  return { store, Wrapper };
}

beforeEach(() => {
  mockSearch.mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("LocationSelector", () => {
  it("shows the selected location name in the toggle button", () => {
    const { Wrapper } = makeWrapper();
    render(<LocationSelector onUseCurrentLocation={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.getByRole("button", { name: "Locatie kiezen" })).toBeInTheDocument();
    expect(screen.getByText("Haarlem")).toBeInTheDocument();
  });

  it("opens the dropdown menu when the location button is clicked", () => {
    const { Wrapper } = makeWrapper();
    render(<LocationSelector onUseCurrentLocation={vi.fn()} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Locatie kiezen" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Plaats zoeken")).toBeInTheDocument();
  });

  it("closes the menu when the location button is clicked again", () => {
    const { store, Wrapper } = makeWrapper();
    store.set(locationMenuOpenAtom, true);
    render(<LocationSelector onUseCurrentLocation={vi.fn()} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Locatie kiezen" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("calls onUseCurrentLocation when GPS button is clicked", async () => {
    const onUseCurrentLocation = vi.fn().mockResolvedValue(undefined);
    const { store, Wrapper } = makeWrapper();
    store.set(locationMenuOpenAtom, true);
    render(<LocationSelector onUseCurrentLocation={onUseCurrentLocation} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("menuitem", { name: /huidige locatie/i }));
    expect(onUseCurrentLocation).toHaveBeenCalledOnce();
  });

  it("disables the GPS button while locating", () => {
    const { store, Wrapper } = makeWrapper();
    store.set(locationMenuOpenAtom, true);
    store.set(locationStatusAtom, "locating");
    render(<LocationSelector onUseCurrentLocation={vi.fn()} />, { wrapper: Wrapper });
    const gpsBtn = screen.getByRole("menuitem", { name: /huidige locatie/i });
    expect(gpsBtn).toBeDisabled();
  });

  it("shows 'Geen plaatsen gevonden.' when search returns empty", async () => {
    mockSearch.mockResolvedValue([]);
    const { store, Wrapper } = makeWrapper();
    store.set(locationMenuOpenAtom, true);
    render(<LocationSelector onUseCurrentLocation={vi.fn()} />, { wrapper: Wrapper });
    fireEvent.change(screen.getByPlaceholderText("Plaats zoeken"), { target: { value: "xyz" } });
    // real timers — debounce is 250ms, waitFor default timeout is 1000ms
    await waitFor(() => expect(screen.getByText("Geen plaatsen gevonden.")).toBeInTheDocument());
  });

  it("shows 'Zoeken lukte niet.' on network failure", async () => {
    mockSearch.mockRejectedValue(new Error("network"));
    const { store, Wrapper } = makeWrapper();
    store.set(locationMenuOpenAtom, true);
    render(<LocationSelector onUseCurrentLocation={vi.fn()} />, { wrapper: Wrapper });
    fireEvent.change(screen.getByPlaceholderText("Plaats zoeken"), { target: { value: "Am" } });
    // real timers — debounce is 250ms, waitFor default timeout is 1000ms
    await waitFor(() => expect(screen.getByText("Zoeken lukte niet.")).toBeInTheDocument());
  });

  it("shows search results in a listbox", async () => {
    mockSearch.mockResolvedValue([amsterdam]);
    const { store, Wrapper } = makeWrapper();
    store.set(locationMenuOpenAtom, true);
    render(<LocationSelector onUseCurrentLocation={vi.fn()} />, { wrapper: Wrapper });
    fireEvent.change(screen.getByPlaceholderText("Plaats zoeken"), { target: { value: "Am" } });
    // real timers — debounce is 250ms, waitFor default timeout is 1000ms
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument());
    expect(screen.getByRole("option", { name: /amsterdam/i })).toBeInTheDocument();
  });

  it("selects a location and closes the menu when a result is clicked", async () => {
    mockSearch.mockResolvedValue([amsterdam]);
    const { store, Wrapper } = makeWrapper();
    store.set(locationMenuOpenAtom, true);
    render(<LocationSelector onUseCurrentLocation={vi.fn()} />, { wrapper: Wrapper });
    fireEvent.change(screen.getByPlaceholderText("Plaats zoeken"), { target: { value: "Am" } });
    // real timers — debounce is 250ms, waitFor default timeout is 1000ms
    await waitFor(() => screen.getByRole("option", { name: /amsterdam/i }));
    fireEvent.click(screen.getByRole("option", { name: /amsterdam/i }));
    expect(store.get(selectedLocationAtom).name).toBe("Amsterdam");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("adds a selected location to the saved list", async () => {
    mockSearch.mockResolvedValue([amsterdam]);
    const { store, Wrapper } = makeWrapper();
    store.set(locationMenuOpenAtom, true);
    render(<LocationSelector onUseCurrentLocation={vi.fn()} />, { wrapper: Wrapper });
    fireEvent.change(screen.getByPlaceholderText("Plaats zoeken"), { target: { value: "Am" } });
    // real timers — debounce is 250ms, waitFor default timeout is 1000ms
    await waitFor(() => screen.getByRole("option", { name: /amsterdam/i }));
    fireEvent.click(screen.getByRole("option", { name: /amsterdam/i }));
    expect(store.get(savedLocationsAtom)).toHaveLength(1);
    expect(store.get(savedLocationsAtom)[0].name).toBe("Amsterdam");
  });

  it("renders saved manual locations with a delete button", () => {
    const { store, Wrapper } = makeWrapper();
    store.set(savedLocationsAtom, [amsterdam]);
    store.set(locationMenuOpenAtom, true);
    render(<LocationSelector onUseCurrentLocation={vi.fn()} />, { wrapper: Wrapper });
    expect(screen.getByRole("menuitem", { name: "Amsterdam" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Amsterdam verwijderen" })).toBeInTheDocument();
  });

  it("removes a saved location when delete is clicked", () => {
    const { store, Wrapper } = makeWrapper();
    store.set(savedLocationsAtom, [amsterdam]);
    store.set(locationMenuOpenAtom, true);
    render(<LocationSelector onUseCurrentLocation={vi.fn()} />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Amsterdam verwijderen" }));
    expect(store.get(savedLocationsAtom)).toHaveLength(0);
  });

  it("does not search when the query is shorter than MIN_QUERY_LENGTH", async () => {
    const { store, Wrapper } = makeWrapper();
    store.set(locationMenuOpenAtom, true);
    render(<LocationSelector onUseCurrentLocation={vi.fn()} />, { wrapper: Wrapper });
    fireEvent.change(screen.getByPlaceholderText("Plaats zoeken"), { target: { value: "A" } });
    // real timers — debounce is 250ms, waitFor default timeout is 1000ms
    expect(mockSearch).not.toHaveBeenCalled();
  });
});
