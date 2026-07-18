import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  filterAndSortEvents,
  formatMagnitude,
  formatUtcTime,
  magnitudeBand,
  normalizeFeed,
  toGeoJSON
} from "../src/data.js";

const [packageJson, html, appSource, mapSource, dataSource] = await Promise.all([
  readFile(new URL("../package.json", import.meta.url), "utf8"),
  readFile(new URL("../index.html", import.meta.url), "utf8"),
  readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
  readFile(new URL("../src/MapView.jsx", import.meta.url), "utf8"),
  readFile(new URL("../src/data.js", import.meta.url), "utf8")
]);

const manifest = JSON.parse(packageJson);
assert.equal(manifest.scripts.dev.includes("9154"), true, "dev script must use port 9154");
assert.equal(manifest.scripts.start.includes("9154"), true, "start script must use port 9154");
assert.match(html, /<title>GPT-5\.6 Sol<\/title>/, "browser title must exactly identify the model");
assert.match(appSource, /<h1>GPT-5\.6 Sol<\/h1>/, "visible title must exactly identify the model");
assert.match(mapSource, /cluster:\s*false/, "earthquake source must explicitly disable clustering");
assert.match(mapSource, /openstreetmap\.org/, "map must include a visible basemap source");
assert.doesNotMatch(mapSource, /"circle-(?:color|stroke-color)":\s*"oklch/, "MapLibre paint colors must be serialized to its supported format");
assert.match(dataSource, /earthquake\.usgs\.gov/, "data loader must use USGS");

const feed = normalizeFeed({
  type: "FeatureCollection",
  metadata: { generated: 1_800_000_000_000, title: "Test feed" },
  features: [
    {
      type: "Feature",
      id: "valid-one",
      geometry: { type: "Point", coordinates: [142.4, 38.1, 24.5] },
      properties: { mag: 5.2, place: "Test coast", time: 1_800_000_000_000, updated: 1, type: "earthquake" }
    },
    {
      type: "Feature",
      id: "non-earthquake",
      geometry: { type: "Point", coordinates: [-120, 35, 1] },
      properties: { mag: 2, place: "Quarry", type: "quarry blast" }
    },
    {
      type: "Feature",
      id: "bad-coordinate",
      geometry: { type: "Point", coordinates: [999, 38, 2] },
      properties: { mag: 3, place: "Invalid", type: "earthquake" }
    }
  ]
});

assert.equal(feed.events.length, 1, "invalid and non-earthquake records should be rejected");
assert.deepEqual(toGeoJSON(feed.events).features[0].geometry.coordinates, [142.4, 38.1], "GeoJSON coordinate order must remain longitude, latitude");
assert.equal(formatMagnitude(5.2), "5.2");
assert.equal(magnitudeBand(5.2), "strong");
assert.match(formatUtcTime(1_800_000_000_000), /UTC|GMT/, "UTC detail time must format without throwing");

const filtered = filterAndSortEvents(feed.events, {
  minMagnitude: 4.5,
  depth: "shallow",
  search: "coast",
  sort: "strongest",
  mapOnly: false
});
assert.equal(filtered.length, 1, "combined filters should retain a matching earthquake");

console.log("Static and data checks passed.");
