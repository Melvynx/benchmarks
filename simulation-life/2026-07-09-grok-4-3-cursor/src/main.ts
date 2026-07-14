import "./style.css";
import { App } from "./ui/app";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("#app missing");
new App(root);
