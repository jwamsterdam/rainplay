import type { Atom, PrimitiveAtom } from "jotai";
import { appStore } from "./store";
import {
  locationErrorAtom,
  locationMenuOpenAtom,
  locationStatusAtom,
  savedLocationsAtom,
  selectedDayAtom,
  selectedHorizonAtom,
  selectedLocationAtom,
} from "./weatherAtoms";

const debugAtoms = {
  locationErrorAtom,
  locationMenuOpenAtom,
  locationStatusAtom,
  savedLocationsAtom,
  selectedDayAtom,
  selectedHorizonAtom,
  selectedLocationAtom,
};

type DebugAtomKey = keyof typeof debugAtoms;
type RainplayDebugState = NonNullable<Window["rainplayState"]>;

declare global {
  interface Window {
    rp: Window["rainplayState"];
    rainplayState?: {
      atoms: typeof debugAtoms;
      get: (atomKey: DebugAtomKey) => unknown;
      set: (atomKey: DebugAtomKey, value: unknown) => void;
      snapshot: () => Record<DebugAtomKey, unknown>;
      store: typeof appStore;
    };
  }
}

export function exposeJotaiDebugStore() {
  if (!import.meta.env.DEV) return;

  document.documentElement.dataset.rainplayDebug = "enabled";

  const rainplayState: RainplayDebugState = {
    atoms: debugAtoms,
    get: (atomKey) => appStore.get(debugAtoms[atomKey] as Atom<unknown>),
    set: (atomKey, value) => {
      appStore.set(debugAtoms[atomKey] as PrimitiveAtom<unknown>, value);
    },
    snapshot: () => ({
      locationErrorAtom: appStore.get(locationErrorAtom),
      locationMenuOpenAtom: appStore.get(locationMenuOpenAtom),
      locationStatusAtom: appStore.get(locationStatusAtom),
      savedLocationsAtom: appStore.get(savedLocationsAtom),
      selectedDayAtom: appStore.get(selectedDayAtom),
      selectedHorizonAtom: appStore.get(selectedHorizonAtom),
      selectedLocationAtom: appStore.get(selectedLocationAtom),
    }),
    store: appStore,
  };

  window.rainplayState = rainplayState;
  window.rp = rainplayState;
}
