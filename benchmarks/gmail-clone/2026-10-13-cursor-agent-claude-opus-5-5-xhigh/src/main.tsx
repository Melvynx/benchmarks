import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Tooltip } from "radix-ui";
import "@fontsource/google-sans/latin-400.css";
import "@fontsource/google-sans/latin-500.css";
import "@fontsource/google-sans/latin-700.css";
import "@fontsource/roboto/latin-400.css";
import "@fontsource/roboto/latin-500.css";
import "@fontsource/roboto/latin-700.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Tooltip.Provider delayDuration={500} skipDelayDuration={200}>
      <App />
    </Tooltip.Provider>
  </StrictMode>,
);
