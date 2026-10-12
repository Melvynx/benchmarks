import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/fredoka";
import "./styles.css";
import App from "./App";
import { useGame } from "./game/store";
import * as runtime from "./game/runtime";

if (import.meta.env.DEV) {
  Object.assign(window, { __cowdie: { useGame, runtime } });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
