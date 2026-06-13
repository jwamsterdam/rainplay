import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { ForecastLocation } from "../api/openMeteo";
import type { DayOption, HorizonOption } from "../types";

export const dayOptions: DayOption[] = ["Vandaag", "Morgen", "Overmorgen", "Week"];
export const horizonOptions: HorizonOption[] = ["Hele dag", "+6 uur", "+2 uur"];

export const defaultLocations: ForecastLocation[] = [];

export const defaultLocation: ForecastLocation = {
  id: "haarlem-default",
  name: "Haarlem",
  latitude: 52.3948,
  longitude: 4.6382,
  source: "default",
};

export const selectedDayAtom = atom<DayOption>("Vandaag");
selectedDayAtom.debugLabel = "selectedDayAtom";

export const selectedHorizonAtom = atom<HorizonOption>("Hele dag");
selectedHorizonAtom.debugLabel = "selectedHorizonAtom";

export const selectedLocationAtom = atomWithStorage<ForecastLocation>(
  "rainplay.selectedLocation",
  defaultLocation,
);
selectedLocationAtom.debugLabel = "selectedLocationAtom";

export const savedLocationsAtom = atom<ForecastLocation[]>(defaultLocations);
savedLocationsAtom.debugLabel = "savedLocationsAtom";

export const locationMenuOpenAtom = atom(false);
locationMenuOpenAtom.debugLabel = "locationMenuOpenAtom";

export type LocationStatus = "idle" | "locating" | "ready" | "denied" | "unsupported" | "error";

export const locationStatusAtom = atom<LocationStatus>("idle");
locationStatusAtom.debugLabel = "locationStatusAtom";

export const locationErrorAtom = atom<string | null>(null);
locationErrorAtom.debugLabel = "locationErrorAtom";
