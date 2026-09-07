import { useEffect, useRef } from "react";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { circleColorExpression } from "../lib/color";
import { BASEMAPS, PLATES_URL } from "../lib/map";
import type { BasemapId, ColorMode, Quake } from "../lib/types";

type Props = {
  quakes: Quake[];
  selectedId: string | null;
  colorMode: ColorMode;
  basemapId: BasemapId;
  showPlates: boolean;
  flyToId: string | null;
  flyNonce: number;
  region: { center: [number, number]; zoom: number } | null;
  regionNonce: number;
  onSelect: (id: string | null) => void;
  onBounds: (bounds: { west: number; south: number; east: number; north: number }) => void;
  onReady: (ok: boolean) => void;
};

function toCollection(quakes: Quake[]) {
  return {
    type: "FeatureCollection" as const,
    features: quakes.map((quake) => ({
      type: "Feature" as const,
      id: quake.id,
      properties: {
        id: quake.id,
        mag: quake.mag ?? -1,
        depth: quake.depth ?? -1,
        place: quake.place,
        time: quake.time,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [quake.lon, quake.lat],
      },
    })),
  };
}

function applyColor(map: MapLibreMap, mode: ColorMode) {
  const expr = circleColorExpression(mode) as maplibregl.ExpressionSpecification;
  if (map.getLayer("quake-glow")) map.setPaintProperty("quake-glow", "circle-color", expr);
  if (map.getLayer("quake-points")) map.setPaintProperty("quake-points", "circle-color", expr);
}

export function MapView({
  quakes,
  selectedId,
  colorMode,
  basemapId,
  showPlates,
  flyToId,
  flyNonce,
  region,
  regionNonce,
  onSelect,
  onBounds,
  onReady,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selectedRef = useRef<string | null>(null);
  const hoverRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  const onBoundsRef = useRef(onBounds);
  const onReadyRef = useRef(onReady);
  const quakesRef = useRef(quakes);
  const colorModeRef = useRef(colorMode);
  onSelectRef.current = onSelect;
  onBoundsRef.current = onBounds;
  onReadyRef.current = onReady;
  quakesRef.current = quakes;
  colorModeRef.current = colorMode;

  useEffect(() => {
    if (!rootRef.current) return;
    let cancelled = false;
    let map: MapLibreMap;
    try {
      map = new maplibregl.Map({
        container: rootRef.current,
        style: BASEMAPS[basemapId].style,
        center: [10, 18],
        zoom: 1.55,
        minZoom: 0.6,
        maxZoom: 12,
        attributionControl: false,
        fadeDuration: 0,
      });
    } catch {
      onReadyRef.current(false);
      return;
    }
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-left",
    );
    map.addControl(
      new maplibregl.ScaleControl({ maxWidth: 110, unit: "metric" }),
      "bottom-left",
    );

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 12,
      className: "quake-tip",
    });

    const emitBounds = () => {
      const b = map.getBounds();
      onBoundsRef.current({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      });
    };

    const addLayers = () => {
      if (cancelled) return;
      if (!map.getSource("quakes")) {
        map.addSource("quakes", {
          type: "geojson",
          data: toCollection(quakesRef.current),
          promoteId: "id",
        });
      }
      if (!map.getLayer("quake-glow")) {
        map.addLayer({
          id: "quake-glow",
          type: "circle",
          source: "quakes",
          paint: {
            "circle-color": circleColorExpression(colorModeRef.current) as maplibregl.ExpressionSpecification,
            "circle-opacity": 0.22,
            "circle-blur": 0.55,
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              1,
              ["+", 6, ["*", ["max", 0, ["get", "mag"]], 1.6]],
              6,
              ["+", 10, ["*", ["max", 0, ["get", "mag"]], 3.2]],
            ],
          },
        });
      }
      if (!map.getLayer("quake-points")) {
        map.addLayer({
          id: "quake-points",
          type: "circle",
          source: "quakes",
          layout: {
            "circle-sort-key": ["get", "mag"],
          },
          paint: {
            "circle-color": circleColorExpression(colorModeRef.current) as maplibregl.ExpressionSpecification,
            "circle-opacity": 0.94,
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              1,
              ["+", 3.2, ["*", ["max", 0, ["get", "mag"]], 1.35]],
              6,
              ["+", 5, ["*", ["max", 0, ["get", "mag"]], 2.6]],
            ],
            "circle-stroke-width": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              3,
              ["boolean", ["feature-state", "hover"], false],
              2.2,
              1.1,
            ],
            "circle-stroke-color": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              "#f4f2ff",
              "rgba(8, 8, 12, 0.72)",
            ],
          },
        });
      }
      if (!map.getSource("plates")) {
        map.addSource("plates", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      }
      if (!map.getLayer("plates")) {
        map.addLayer(
          {
            id: "plates",
            type: "line",
            source: "plates",
            layout: { visibility: "none" },
            paint: {
              "line-color": "#6d5cff",
              "line-opacity": 0.45,
              "line-width": 1.15,
            },
          },
          "quake-glow",
        );
      }
    };

    map.on("load", () => {
      addLayers();
      emitBounds();
      onReadyRef.current(true);
    });
    map.on("error", () => {
      if (!map.isStyleLoaded()) onReadyRef.current(false);
    });
    map.on("moveend", emitBounds);

    map.on("mouseenter", "quake-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "quake-points", () => {
      map.getCanvas().style.cursor = "";
      if (hoverRef.current) {
        try {
          map.setFeatureState({ source: "quakes", id: hoverRef.current }, { hover: false });
        } catch {
          /* source may be mid-swap */
        }
        hoverRef.current = null;
      }
      popup.remove();
    });
    map.on("mousemove", "quake-points", (e) => {
      const feature = e.features?.[0];
      if (!feature || feature.id === undefined) return;
      const id = String(feature.id);
      if (hoverRef.current && hoverRef.current !== id) {
        try {
          map.setFeatureState({ source: "quakes", id: hoverRef.current }, { hover: false });
        } catch {
          /* ignore */
        }
      }
      hoverRef.current = id;
      try {
        map.setFeatureState({ source: "quakes", id }, { hover: true });
      } catch {
        /* ignore */
      }
      const mag = feature.properties?.mag;
      const place = feature.properties?.place ?? "";
      const magLabel = typeof mag === "number" && mag >= 0 ? mag.toFixed(1) : "?";
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div class="tip"><span class="tip-mag">${magLabel}</span><span class="tip-place">${escapeHtml(place)}</span></div>`,
        )
        .addTo(map);
    });
    map.on("click", "quake-points", (e) => {
      const feature = e.features?.[0];
      if (!feature || feature.id === undefined) return;
      e.originalEvent.stopPropagation();
      onSelectRef.current(String(feature.id));
    });
    map.on("click", (e) => {
      const hits = map.queryRenderedFeatures(e.point, { layers: ["quake-points"] });
      if (hits.length === 0) onSelectRef.current(null);
    });

    return () => {
      cancelled = true;
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
    // Recreate only when the basemap style changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemapId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const source = map.getSource("quakes") as GeoJSONSource | undefined;
      if (source) source.setData(toCollection(quakes));
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [quakes, basemapId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => applyColor(map, colorMode);
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [colorMode, basemapId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const prev = selectedRef.current;
    const apply = () => {
      if (prev) {
        try {
          map.setFeatureState({ source: "quakes", id: prev }, { selected: false });
        } catch {
          /* ignore */
        }
      }
      if (selectedId) {
        try {
          map.setFeatureState({ source: "quakes", id: selectedId }, { selected: true });
        } catch {
          /* ignore */
        }
      }
      selectedRef.current = selectedId;
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [selectedId, quakes, basemapId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToId) return;
    const quake = quakes.find((q) => q.id === flyToId);
    if (!quake) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.flyTo({
      center: [quake.lon, quake.lat],
      zoom: Math.max(map.getZoom(), 5.2),
      speed: 1.15,
      essential: true,
      duration: reduced ? 0 : 900,
    });
  }, [flyNonce, flyToId, quakes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !region) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.flyTo({
      center: region.center,
      zoom: region.zoom,
      speed: 0.9,
      essential: true,
      duration: reduced ? 0 : 1100,
    });
  }, [region, regionNonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (!map.getLayer("plates")) return;
      map.setLayoutProperty("plates", "visibility", showPlates ? "visible" : "none");
      if (showPlates) {
        const source = map.getSource("plates") as GeoJSONSource | undefined;
        if (source) {
          fetch(PLATES_URL)
            .then((res) => (res.ok ? res.json() : Promise.reject()))
            .then((data) => {
              if (mapRef.current === map) source.setData(data);
            })
            .catch(() => {
              /* overlay is optional */
            });
        }
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [showPlates, basemapId]);

  return <div ref={rootRef} className="map-root" role="application" aria-label="Earthquake map" />;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
