import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { MapLayerMouseEvent, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import type { Quake } from "../types";
import { formatDepth, formatLocal, formatMag } from "../lib/quake";

const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#e8e4d8" } },
    {
      id: "basemap",
      type: "raster",
      source: "basemap",
      paint: { "raster-saturation": -0.35, "raster-contrast": -0.05, "raster-opacity": 0.92 },
    },
  ],
};

// Redundant encodings: size + color for magnitude, hollow fill for deep events.
const MAG_COLOR: maplibregl.ExpressionSpecification = [
  "step",
  ["coalesce", ["get", "mag"], -1],
  "#5e695a",
  2.5,
  "#8a6110",
  4.5,
  "#a63e1b",
  6,
  "#8c1d18",
];

const MAG_RADIUS: maplibregl.ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "mag"], 0],
  0,
  2.5,
  2.5,
  4,
  4.5,
  8,
  6,
  14,
  8,
  24,
];

function toGeoJSON(quakes: Quake[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: quakes.map((q) => ({
      type: "Feature",
      id: q.id,
      geometry: { type: "Point", coordinates: [q.lon, q.lat] },
      properties: {
        id: q.id,
        mag: q.mag,
        place: q.place ?? q.title,
        time: q.time,
        depth: q.depth,
        deep: q.depth != null && q.depth >= 300,
        tsunami: q.tsunami,
        alert: q.alert,
      },
    })),
  };
}

type Props = {
  quakes: Quake[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onViewportChange: (bounds: [number, number, number, number]) => void;
  flyTo: { lon: number; lat: number; zoom?: number; token: number } | null;
  reducedMotion: boolean;
};

export function MapView({
  quakes,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onViewportChange,
  flyTo,
  reducedMotion,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const quakesRef = useRef(quakes);
  quakesRef.current = quakes;
  const callbacksRef = useRef({ onSelect, onHover, onViewportChange });
  callbacksRef.current = { onSelect, onHover, onViewportChange };
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);

  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: [20, 12],
        zoom: 1.4,
        minZoom: 0.8,
        attributionControl: { compact: true },
      });
    } catch {
      // No WebGL (old hardware, remote sessions). The list and timeline remain
      // the full-featured non-map path.
      setMapFailed(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.touchZoomRotate.disableRotation();
    map.dragRotate.disable();
    map.keyboard.disable(); // list + timeline provide the keyboard path; avoids trapping focus

    map.on("load", () => {
      map.addSource("quakes", { type: "geojson", data: toGeoJSON(quakesRef.current), promoteId: "id" });

      map.addLayer({
        id: "quake-fill",
        type: "circle",
        source: "quakes",
        paint: {
          "circle-radius": MAG_RADIUS,
          "circle-color": MAG_COLOR,
          "circle-opacity": ["case", ["get", "deep"], 0.18, 0.55],
          "circle-stroke-color": MAG_COLOR,
          "circle-stroke-width": ["case", ["get", "deep"], 1.8, 1],
        },
      });

      map.addLayer({
        id: "quake-hover",
        type: "circle",
        source: "quakes",
        filter: ["==", ["get", "id"], "__none__"],
        paint: {
          "circle-radius": ["+", MAG_RADIUS, 4],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#221d15",
          "circle-stroke-width": 1.5,
        },
      });

      map.addLayer({
        id: "quake-selected",
        type: "circle",
        source: "quakes",
        filter: ["==", ["get", "id"], "__none__"],
        paint: {
          "circle-radius": ["+", MAG_RADIUS, 7],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": "#1f6f6b",
          "circle-stroke-width": 2.5,
        },
      });

      readyRef.current = true;
      const b = map.getBounds();
      callbacksRef.current.onViewportChange([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    });

    const pickFeature = (e: MapLayerMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ["quake-fill"] });
      if (!features.length) return null;
      // With overlapping epicenters, prefer the strongest event under the cursor.
      let best = features[0];
      for (const f of features) {
        if ((Number(f.properties?.mag) || -10) > (Number(best.properties?.mag) || -10)) best = f;
      }
      return best;
    };

    map.on("click", (e) => {
      const feature = pickFeature(e as MapLayerMouseEvent);
      callbacksRef.current.onSelect(feature ? String(feature.properties?.id) : null);
    });

    map.on("mousemove", (e) => {
      const feature = pickFeature(e as MapLayerMouseEvent);
      map.getCanvas().style.cursor = feature ? "pointer" : "";
      const id = feature ? String(feature.properties?.id) : null;
      callbacksRef.current.onHover(id);
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
      if (feature && feature.properties) {
        const p = feature.properties;
        const mag = p.mag == null || p.mag === "null" ? null : Number(p.mag);
        const depth = p.depth == null || p.depth === "null" ? null : Number(p.depth);
        const el = document.createElement("div");
        el.className = "map-tip";
        el.innerHTML = `
          <span class="map-tip-mag">M ${formatMag(mag)}</span>
          <span class="map-tip-place"></span>
          <span class="map-tip-meta">${formatLocal(Number(p.time))}${depth != null ? ` · ${formatDepth(depth)} km deep` : ""}</span>`;
        (el.querySelector(".map-tip-place") as HTMLElement).textContent = String(p.place ?? "");
        hoverPopupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 14,
          maxWidth: "260px",
        })
          .setLngLat(e.lngLat)
          .setDOMContent(el)
          .addTo(map);
      }
    });

    map.on("mouseout", () => {
      callbacksRef.current.onHover(null);
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
    });

    map.on("moveend", () => {
      const b = map.getBounds();
      callbacksRef.current.onViewportChange([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    });

    return () => {
      hoverPopupRef.current?.remove();
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Push data updates into the existing source (no map re-creation on refresh).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource("quakes") as maplibregl.GeoJSONSource | undefined;
      source?.setData(toGeoJSON(quakes));
    };
    if (readyRef.current) apply();
    else map.once("load", apply);
  }, [quakes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.setFilter("quake-selected", ["==", ["get", "id"], selectedId ?? "__none__"]);
  }, [selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.setFilter("quake-hover", [
      "==",
      ["get", "id"],
      hoveredId && hoveredId !== selectedId ? hoveredId : "__none__",
    ]);
  }, [hoveredId, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyTo) return;
    const target = { center: [flyTo.lon, flyTo.lat] as [number, number], zoom: flyTo.zoom ?? Math.max(map.getZoom(), 4) };
    if (reducedMotion) map.jumpTo(target);
    else map.flyTo({ ...target, duration: 900, essential: false });
  }, [flyTo, reducedMotion]);

  if (mapFailed) {
    return (
      <div className="map-canvas map-fallback" role="note">
        <p>
          <strong>The interactive map could not start</strong> (this browser has no WebGL support).
        </p>
        <p>Every event is still available in the event stream and timeline.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="map-canvas"
      role="application"
      aria-label="World map of earthquake epicenters. Every event is also available in the event list."
    />
  );
}
