import { atom } from "jotai";
import type { DayOption, HorizonOption } from "../types";

export const dayOptions: DayOption[] = ["Vandaag", "Morgen", "Overmorgen", "Week"];
export const horizonOptions: HorizonOption[] = ["Hele dag", "+6 uur", "+2 uur"];

export const selectedDayAtom = atom<DayOption>("Vandaag");
selectedDayAtom.debugLabel = "selectedDayAtom";

export const selectedHorizonAtom = atom<HorizonOption>("+6 uur");
selectedHorizonAtom.debugLabel = "selectedHorizonAtom";

export const selectedLocationAtom = atom({
  name: "Annecy",
  latitude: 45.8992,
  longitude: 6.1294,
});
selectedLocationAtom.debugLabel = "selectedLocationAtom";
