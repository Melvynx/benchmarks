import { readFileSync } from "node:fs";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const js = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

const checks = [
  [html.includes("<title>GPT-5.6 Codex</title>"), "browser title"],
  [html.includes(">GPT-5.6 Codex</h1>"), "visible title"],
  [html.includes("leaflet@1.9.4"), "interactive map library"],
  [js.includes("earthquake.usgs.gov/earthquakes/feed"), "live USGS feed"],
  [js.includes("L.circleMarker"), "individual map points"],
  [!js.toLowerCase().includes("markercluster"), "no marker clustering"],
  [css.includes("@media (max-width: 760px)"), "responsive layout"],
];

const failed = checks.filter(([passes]) => !passes);
for (const [passes, name] of checks) console.log(`${passes ? "✓" : "✗"} ${name}`);
if (failed.length) process.exit(1);
