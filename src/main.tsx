import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppProviders } from "./providers/AppProviders";
import { exposeJotaiDebugStore } from "./state/debug";
import "./design/tokens.css";
import "./styles.css";

// Herlaad de pagina zodra een nieuwe SW het overneemt, zodat de browser altijd
// de nieuwe JS-chunks laadt en er geen "split-versie" ontstaat (oude JS + nieuwe SW).
// Guard: sla over bij de allereerste installatie (geen vorige controller).
if ("serviceWorker" in navigator) {
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) {
      window.location.reload();
    }
    hadController = true;
  });
}

exposeJotaiDebugStore();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
