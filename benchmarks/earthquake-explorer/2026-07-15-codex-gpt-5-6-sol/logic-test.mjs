import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const context = vm.createContext({
  console,
  document: { addEventListener() {} },
  window: { clearTimeout() {}, setTimeout() {} },
  navigator: { onLine: true },
  requestAnimationFrame(callback) { callback(); return 1; },
  cancelAnimationFrame() {},
  Map,
  Date,
  Intl,
  Number,
  String,
  Array,
  Math,
});

const tests = `
function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log("✓ " + message);
}

const fixture = [
  { id: "shallow", geometry: { coordinates: [142.51, 38.22, 24] }, properties: { mag: 6.2, place: "Near Honshu, Japan", time: 300, felt: 280, sig: 780 } },
  { id: "mid", geometry: { coordinates: [-71.4, -32.1, 125] }, properties: { mag: 4.8, place: "Coquimbo, Chile", time: 200, felt: 0, sig: 350 } },
  { id: "deep", geometry: { coordinates: [178.2, -20.5, 510] }, properties: { mag: 5.4, place: "Fiji region", time: 100, felt: 4, sig: 430 } },
];

state.earthquakes = fixture.map(normalizeFeature);
renderStats = () => {};
renderEventList = () => {};
renderMapMarkers = () => {};
closeDetails = () => { state.selectedId = null; };

assert(state.earthquakes.every(Boolean), "valid USGS GeoJSON features normalize");
assert(state.earthquakes[0].latitude === 38.22 && state.earthquakes[0].longitude === 142.51, "longitude and latitude preserve USGS coordinate order");
assert(depthCategory(24) === "shallow" && depthCategory(125) === "intermediate" && depthCategory(510) === "deep", "depth bands classify correctly");
assert(/^#[0-9a-f]{6}$/.test(depthColor(210)), "continuous depth color returns a valid color");
assert(markerRadius(6.2) > markerRadius(4.8), "marker size communicates magnitude");

state.minMagnitude = 5;
state.depth = "all";
state.search = "";
state.feltOnly = false;
state.sort = "magnitude";
applyFilters();
assert(state.filtered.length === 2 && state.filtered[0].id === "shallow", "magnitude filter and magnitude sort work together");

state.minMagnitude = 0;
state.depth = "deep";
state.search = "fiji";
state.feltOnly = true;
applyFilters();
assert(state.filtered.length === 1 && state.filtered[0].id === "deep", "depth, location, and felt filters combine correctly");
`;

vm.runInContext(`${source}\n${tests}`, context, { filename: "app.logic-test.js" });
