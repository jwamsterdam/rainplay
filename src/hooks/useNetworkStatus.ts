import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { isOfflineAtom } from "../state/weatherAtoms";

export function useNetworkStatus() {
  const setIsOffline = useSetAtom(isOfflineAtom);

  useEffect(() => {
    const setOnline = () => setIsOffline(false);
    const setOffline = () => setIsOffline(true);

    // Sync initial state
    setIsOffline(!navigator.onLine);

    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, [setIsOffline]);
}
