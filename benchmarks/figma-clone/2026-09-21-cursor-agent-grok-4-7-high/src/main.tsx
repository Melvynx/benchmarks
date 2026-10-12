import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Editor } from "./engine/editor";
import { preloadCanvasFonts } from "./engine/text/measure";
import "./index.css";

const editor = new Editor();
preloadCanvasFonts();

const root = document.getElementById("root");
if (!root) throw new Error("Missing root");
createRoot(root).render(
  <StrictMode>
    <App editor={editor} />
  </StrictMode>,
);
