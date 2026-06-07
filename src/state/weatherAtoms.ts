import { atom } from "jotai";
import type { ForecastLocation } from "../api/openMeteo";
import type { DayOption, HorizonOption } from "../types";

export const dayOptions: DayOption[] = ["Vandaag", "Morgen", "Overmorgen", "Week"];
export const horizonOptions: HorizonOption[] = ["Hele dag", "+6 uur", "+2 uur"];

export const selectedDayAtom = atom<DayOption>("Vandaag");
selectedDayAtom.debugLabel = "selectedDayAtom";

export const selectedHorizonAtom = atom<HorizonOption>("Hele dag");
selectedHorizonAtom.debugLabel = "selectedHorizonAtom";

export const selectedLocationAtom = atom<ForecastLocation>({
  name: "Haarlem",
  latitude: 52.3948,
  longitude: 4.6382,
  source: "default",
});
selectedLocationAtom.debugLabel = "selectedLocationAtom";

export type LocationStatus = "idle" | "locating" | "ready" | "denied" | "unsupported" | "error";

export const locationStatusAtom = atom<LocationStatus>("idle");
locationStatusAtom.debugLabel = "locationStatusAtom";

export const locationErrorAtom = atom<string | null>(null);
locationErrorAtom.debugLabel = "locationErrorAtom";
