import type { StyleSpecification } from "maplibre-gl";

export type BasemapId = "night" | "day" | "satellite";
export type ProjectionId = "globe" | "flat";

export interface Basemap {
  id: BasemapId;
  label: string;
  /** A URL for vector styles, or an inline spec for the raster one. */
  style: string | StyleSpecification;
  /** Tint used for the plate-boundary overlay so it reads on this basemap. */
  plateColor: string;
  /** Stroke around each earthquake dot, so points stay legible on any ground. */
  haloColor: string;
  /** Panel/label colour used by map-anchored chrome over this basemap. */
  scheme: "dark" | "light";
}

const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a> contributors, <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">© CARTO</a>';

const satelliteStyle: StyleSpecification = {
  version: 8,
  sources: {
    imagery: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution:
        'Imagery © <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a>, Maxar, Earthstar Geographics',
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#05070b" } },
    { id: "imagery", type: "raster", source: "imagery", paint: { "raster-opacity": 0.92 } },
  ],
};

export const BASEMAPS: Basemap[] = [
  {
    id: "night",
    label: "Night",
    style: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`,
    plateColor: "#3d5a80",
    haloColor: "rgba(6,8,12,0.85)",
    scheme: "dark",
  },
  {
    id: "day",
    label: "Day",
    style: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`,
    plateColor: "#64748b",
    // Dark, not light: the dot ramp runs cyan → yellow, which needs a dark
    // outline to hold its own against a near-white basemap.
    haloColor: "rgba(15,23,42,0.55)",
    scheme: "light",
  },
  {
    id: "satellite",
    label: "Satellite",
    style: satelliteStyle,
    plateColor: "#7dd3fc",
    haloColor: "rgba(4,6,10,0.8)",
    scheme: "dark",
  },
];

export function basemap(id: BasemapId): Basemap {
  return BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0];
}

export const BASE_ATTRIBUTION = OSM_ATTRIBUTION;

export const USGS_ATTRIBUTION =
  'Earthquakes: <a href="https://earthquake.usgs.gov/earthquakes/feed/" target="_blank" rel="noreferrer">USGS</a> · Plates: <a href="https://github.com/fraxen/tectonicplates" target="_blank" rel="noreferrer">Bird (2003)</a>';
