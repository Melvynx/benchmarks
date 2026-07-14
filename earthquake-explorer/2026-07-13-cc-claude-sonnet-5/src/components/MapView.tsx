import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import type { EarthquakeEvent } from "../types/earthquake";
import { magnitudeToRadius, depthToColor } from "../lib/scales";
import { createTsunamiIcon } from "../lib/tsunamiIcon";
import { formatMagnitude, formatRelativeTime } from "../lib/format";
import { usePrefersReducedMotion } from "../hooks/useNow";

const SOURCE_ID = "quakes";
const CORE_LAYER = "quakes-core";
const ALERT_LAYER = "quakes-alert-ring";
const SELECTED_LAYER = "quakes-selected-ring";
const TSUNAMI_LAYER = "quakes-tsunami";

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: undefined,
  sources: {
    basemap: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    { id: "basemap", type: "raster", source: "basemap", paint: { "raster-opacity": 1, "raster-brightness-min": 0.05 } },
  ],
};

function toFeatureCollection(events: EarthquakeEvent[], selectedId: string | null, hoveredId: string | null, windowIds: Set<string> | null) {
  return {
    type: "FeatureCollection" as const,
    features: events.map((e) => ({
      type: "Feature" as const,
      id: e.id,
      properties: {
        id: e.id,
        radius: magnitudeToRadius(e.magnitude),
        color: depthToColor(e.depthKm),
        alert: e.alert,
        tsunami: e.tsunami,
        selected: e.id === selectedId,
        hovered: e.id === hoveredId,
        inWindow: windowIds ? windowIds.has(e.id) : true,
        label: `M${formatMagnitude(e.magnitude)} — ${e.place}`,
        magnitude: e.magnitude,
        time: e.timeMs,
      },
      geometry: { type: "Point" as const, coordinates: [e.longitude, e.latitude] },
    })),
  };
}

export interface MapViewProps {
  events: EarthquakeEvent[];
  selectedId: string | null;
  hoveredId: string | null;
  windowIds: Set<string> | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  flyToToken: number;
  flyToTarget: { lat: number; lon: number; zoom?: number } | null;
}

export function MapView({ events, selectedId, hoveredId, windowIds, onSelect, onHover, flyToToken, flyToTarget }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: STYLE,
        center: [10, 20],
        zoom: 1.4,
        minZoom: 0.6,
        maxZoom: 12,
        attributionControl: { compact: true },
      });
    } catch (err) {
      console.error("Map failed to initialize:", err);
      setFailed(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (e) => {
      console.error("Map error:", e.error);
      if (!readyRef.current) setFailed(true);
    });

    popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 14, maxWidth: "240px" });

    map.on("load", () => {
      map.addImage("tsunami-icon", createTsunamiIcon());
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: toFeatureCollection(eventsRef.current, null, null, null),
      });

      map.addLayer({
        id: CORE_LAYER,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": ["get", "radius"],
          "circle-color": ["get", "color"],
          "circle-opacity": ["case", ["get", "inWindow"], 0.85, 0.18],
          "circle-stroke-width": ["case", ["get", "hovered"], 2.5, 1],
          "circle-stroke-color": ["case", ["get", "hovered"], "#f4f5f8", "#0c0d10"],
          "circle-stroke-opacity": ["case", ["get", "inWindow"], 1, 0.25],
        },
      });

      map.addLayer({
        id: ALERT_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!=", ["get", "alert"], null],
        paint: {
          "circle-radius": ["+", ["get", "radius"], 5],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": [
            "match",
            ["get", "alert"],
            "green",
            "#4f9d69",
            "yellow",
            "#d9b02a",
            "orange",
            "#d9791f",
            "red",
            "#c94c3f",
            "#9298ab",
          ],
          "circle-stroke-opacity": ["case", ["get", "inWindow"], 0.95, 0.2],
        },
      });

      map.addLayer({
        id: SELECTED_LAYER,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["get", "selected"], true],
        paint: {
          "circle-radius": ["+", ["get", "radius"], 9],
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#f4f5f8",
        },
      });

      map.addLayer({
        id: TSUNAMI_LAYER,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["==", ["get", "tsunami"], true],
        layout: {
          "icon-image": "tsunami-icon",
          "icon-size": 0.85,
          "icon-offset": [0, -1.4],
          "icon-allow-overlap": true,
        },
        paint: { "icon-opacity": ["case", ["get", "inWindow"], 1, 0.25] },
      });

      readyRef.current = true;

      const onClick = (e: maplibregl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CORE_LAYER] });
        if (features.length > 0 && features[0].properties?.id) {
          onSelect(String(features[0].properties.id));
        }
      };
      const onMove = (e: maplibregl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CORE_LAYER] });
        map.getCanvas().style.cursor = features.length > 0 ? "pointer" : "";
        if (features.length > 0) {
          const f = features[0];
          const id = String(f.properties?.id ?? "");
          onHover(id);
          const coords = (f.geometry as { coordinates: [number, number] }).coordinates.slice() as [number, number];
          const mag = f.properties?.magnitude;
          const label = f.properties?.label ?? "";
          const time = Number(f.properties?.time ?? 0);
          popupRef.current
            ?.setLngLat(coords)
            .setHTML(
              `<div style="font:600 12px/1.3 var(--font-sans,sans-serif);">M${mag ?? "—"}</div><div style="font-size:11.5px;opacity:0.85;margin-top:2px;max-width:200px;">${label}</div><div style="font-size:10.5px;opacity:0.6;margin-top:3px;">${time ? formatRelativeTime(time, Date.now()) : ""}</div>`,
            )
            .addTo(map);
        } else {
          onHover(null);
          popupRef.current?.remove();
        }
      };
      const onLeave = () => {
        onHover(null);
        popupRef.current?.remove();
        map.getCanvas().style.cursor = "";
      };

      map.on("click", onClick);
      map.on("mousemove", onMove);
      map.on("mouseout", onLeave);
    });

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(toFeatureCollection(events, selectedId, hoveredId, windowIds));
  }, [events, selectedId, hoveredId, windowIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToTarget) return;
    map.flyTo({
      center: [flyToTarget.lon, flyToTarget.lat],
      zoom: flyToTarget.zoom ?? Math.max(map.getZoom(), 4),
      duration: reducedMotion ? 0 : 900,
      essential: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyToToken]);

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-ink-900 px-6 text-center">
        <p className="text-[13.5px] text-ink-100">The map could not be displayed in this browser.</p>
        <p className="max-w-xs text-[12px] text-ink-400">
          This can happen when WebGL is unavailable. Use the List view to explore every event with the same filters,
          time range, and detail.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} role="img" aria-label="World map showing earthquake locations. Use the event list for a keyboard-accessible, non-map view of the same data." className="h-full w-full" />
    </div>
  );
}
