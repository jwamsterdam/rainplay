import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppProviders } from "./providers/AppProviders";
import { exposeJotaiDebugStore } from "./state/debug";
import { initAppHeight } from "./lib/appHeight";
import "./design/tokens.css";
import "./styles.css";

exposeJotaiDebugStore();
initAppHeight();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
