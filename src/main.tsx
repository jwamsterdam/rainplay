import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppProviders } from "./providers/AppProviders";
import { exposeJotaiDebugStore } from "./state/debug";
import "./design/tokens.css";
import "./styles.css";

exposeJotaiDebugStore();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
