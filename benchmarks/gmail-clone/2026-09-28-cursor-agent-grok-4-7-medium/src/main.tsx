import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MailProvider } from "./state/mail-context";
import { Shell } from "./App";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "./styles.css";

document.title = "Grok 4.7";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MailProvider>
      <Shell />
    </MailProvider>
  </StrictMode>,
);
