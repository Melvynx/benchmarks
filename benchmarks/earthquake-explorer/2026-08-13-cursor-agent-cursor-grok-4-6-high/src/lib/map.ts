import type { Region } from "./types";

export const REGIONS: Region[] = [
  { id: "world", label: "World", center: [10, 18], zoom: 1.55 },
  { id: "ring", label: "Pacific Rim", center: [-165, 20], zoom: 2.1 },
  { id: "alaska", label: "Alaska", center: [-153, 61], zoom: 3.4 },
  { id: "california", label: "California", center: [-119.5, 37.2], zoom: 5.1 },
  { id: "japan", label: "Japan", center: [138.5, 37.5], zoom: 4.4 },
  { id: "indonesia", label: "Indonesia", center: [118, -2.5], zoom: 3.6 },
  { id: "andes", label: "Andes", center: [-72, -22], zoom: 3.2 },
  { id: "mediterranean", label: "Mediterranean", center: [20, 38], zoom: 4.1 },
];

export const BASEMAPS = {
  table: {
    id: "table" as const,
    label: "Survey table",
    style: "https://tiles.openfreemap.org/styles/positron",
  },
  night: {
    id: "night" as const,
    label: "Night watch",
    style: "https://tiles.openfreemap.org/styles/dark",
  },
};

export const PLATES_URL =
  "https://cdn.jsdelivr.net/gh/fraxen/tectonicplates@master/GeoJSON/PB2002_boundaries.json";
