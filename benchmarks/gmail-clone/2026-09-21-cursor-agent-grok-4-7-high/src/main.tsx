import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MailProvider } from "./store";
import { Shell } from "./shell";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MailProvider>
      <Shell />
    </MailProvider>
  </StrictMode>,
);
