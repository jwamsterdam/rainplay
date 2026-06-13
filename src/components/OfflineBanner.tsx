import { useAtomValue } from "jotai";
import { dataTimestampAtom, isOfflineAtom } from "../state/weatherAtoms";

export function OfflineBanner() {
  const isOffline = useAtomValue(isOfflineAtom);
  const dataTimestamp = useAtomValue(dataTimestampAtom);

  if (!isOffline) return null;

  const timeLabel = dataTimestamp
    ? new Date(dataTimestamp).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      {timeLabel
        ? `Geen verbinding — weerdata van ${timeLabel}`
        : "Geen verbinding"}
    </div>
  );
}
