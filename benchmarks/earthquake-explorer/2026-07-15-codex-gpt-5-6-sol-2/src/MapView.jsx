import React, { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { formatMagnitude, toGeoJSON } from "./data.js";

const EMPTY_COLLECTION = { type: "FeatureCollection", features: [] };

// MapLibre's style parser currently accepts sRGB colors but not CSS OKLCH.
// Keep the design palette authored in OKLCH, then serialize only at this API boundary.
function oklchToRgba(lightness, chroma, hue, alpha = 1) {
  const radians = (hue * Math.PI) / 180;
  const labA = chroma * Math.cos(radians);
  const labB = chroma * Math.sin(radians);
  const lRoot = lightness + 0.3963377774 * labA + 0.2158037573 * labB;
  const mRoot = lightness - 0.1055613458 * labA - 0.0638541728 * labB;
  const sRoot = lightness - 0.0894841775 * labA - 1.291485548 * labB;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
  const gamma = (value) => value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
  const [red, green, blue] = linear.map((value) => Math.round(Math.min(1, Math.max(0, gamma(value))) * 255));
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const MAP_COLORS = {
  ink: oklchToRgba(0.2, 0.015, 110),
  white: oklchToRgba(1, 0, 0),
  transparent: oklchToRgba(1, 0, 0, 0),
  micro: oklchToRgba(0.61, 0.105, 110),
  light: oklchToRgba(0.72, 0.135, 82),
  moderate: oklchToRgba(0.69, 0.17, 55),
  strong: oklchToRgba(0.58, 0.22, 28),
  major: oklchToRgba(0.49, 0.21, 345),
  unknown: oklchToRgba(0.58, 0.01, 110),
  location: oklchToRgba(0.49, 0.16, 250),
  locationSoft: oklchToRgba(0.5, 0.12, 250, 0.2),
  locationStroke: oklchToRgba(0.45, 0.13, 250, 0.42)
};

const MAGNITUDE_COLOR = [
  "case",
  ["==", ["get", "magnitude"], null],
  MAP_COLORS.unknown,
  [
    "step",
    ["get", "magnitude"],
    MAP_COLORS.micro,
    2,
    MAP_COLORS.light,
    3,
    MAP_COLORS.moderate,
    4.5,
    MAP_COLORS.strong,
    6,
    MAP_COLORS.major
  ]
];

const MAGNITUDE_RADIUS = [
  "interpolate",
  ["linear"],
  ["coalesce", ["get", "magnitude"], -1],
  -1,
  3.2,
  0,
  3.5,
  2,
  5,
  4,
  8,
  6,
  13,
  8,
  19
];

const mapStyle = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors"
    }
  },
  layers: [
    {
      id: "osm-basemap",
      type: "raster",
      source: "osm",
      paint: {
        "raster-saturation": -0.72,
        "raster-contrast": 0.06,
        "raster-brightness-min": 0.06,
        "raster-brightness-max": 0.98
      }
    }
  ]
};

function eventFeature(event) {
  if (!event) return EMPTY_COLLECTION;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [event.longitude, event.latitude] },
        properties: { id: event.id, magnitude: event.magnitude }
      }
    ]
  };
}

function plainBounds(map) {
  const bounds = map.getBounds();
  return {
    west: bounds.getWest(),
    east: bounds.getEast(),
    south: bounds.getSouth(),
    north: bounds.getNorth()
  };
}

function fitEvents(map, events, reducedMotion) {
  if (!events.length) return;
  if (events.length === 1) {
    map.easeTo({
      center: [events[0].longitude, events[0].latitude],
      zoom: 6,
      duration: reducedMotion ? 0 : 650
    });
    return;
  }

  const latitudes = events.map((event) => event.latitude);
  const longitudes = events.map((event) => event.longitude);
  const standardSpan = Math.max(...longitudes) - Math.min(...longitudes);

  if (standardSpan > 300) {
    map.easeTo({ center: [0, 18], zoom: 1.25, duration: reducedMotion ? 0 : 650 });
    return;
  }

  const bounds = new maplibregl.LngLatBounds();
  for (const event of events) bounds.extend([event.longitude, event.latitude]);
  map.fitBounds(bounds, {
    padding: { top: 84, right: 72, bottom: 112, left: 72 },
    maxZoom: 7,
    duration: reducedMotion ? 0 : 700
  });
}

export function MapView({
  events,
  selectedEvent,
  focusRequest,
  onBoundsChange,
  onNotice,
  onSelect
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const eventsRef = useRef(events);
  const eventIndexRef = useRef(new Map());
  const callbacksRef = useRef({ onBoundsChange, onNotice, onSelect });
  const readyRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [zoom, setZoom] = useState(1.35);
  const [mapError, setMapError] = useState(false);

  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    eventsRef.current = events;
    eventIndexRef.current = new Map(events.map((event) => [event.id, event]));
  }, [events]);

  useEffect(() => {
    callbacksRef.current = { onBoundsChange, onNotice, onSelect };
  }, [onBoundsChange, onNotice, onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [0, 18],
      zoom: 1.35,
      minZoom: 1,
      maxZoom: 10,
      attributionControl: false,
      renderWorldCopies: false,
      dragRotate: false,
      pitchWithRotate: false
    });

    mapRef.current = map;
    map.touchZoomRotate.disableRotation();

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 14,
      className: "quake-popup"
    });
    popupRef.current = popup;

    map.on("load", () => {
      map.addSource("earthquakes", {
        type: "geojson",
        data: EMPTY_COLLECTION,
        cluster: false,
        attribution: "USGS"
      });
      map.addLayer({
        id: "earthquake-halo",
        type: "circle",
        source: "earthquakes",
        paint: {
          "circle-radius": ["+", MAGNITUDE_RADIUS, 2.2],
          "circle-color": MAP_COLORS.white,
          "circle-opacity": 0.82
        }
      });
      map.addLayer({
        id: "earthquake-points",
        type: "circle",
        source: "earthquakes",
        layout: {
          "circle-sort-key": ["coalesce", ["get", "magnitude"], -1]
        },
        paint: {
          "circle-radius": MAGNITUDE_RADIUS,
          "circle-color": MAGNITUDE_COLOR,
          "circle-opacity": 0.92,
          "circle-stroke-width": 0.75,
          "circle-stroke-color": MAP_COLORS.ink
        }
      });

      map.addSource("selected-earthquake", { type: "geojson", data: EMPTY_COLLECTION });
      map.addLayer({
        id: "selected-earthquake-ring",
        type: "circle",
        source: "selected-earthquake",
        paint: {
          "circle-radius": ["+", MAGNITUDE_RADIUS, 8],
          "circle-color": MAP_COLORS.transparent,
          "circle-stroke-color": MAP_COLORS.ink,
          "circle-stroke-width": 2.5
        }
      });
      map.addLayer({
        id: "selected-earthquake-core",
        type: "circle",
        source: "selected-earthquake",
        paint: {
          "circle-radius": MAGNITUDE_RADIUS,
          "circle-color": MAGNITUDE_COLOR,
          "circle-stroke-color": MAP_COLORS.white,
          "circle-stroke-width": 2
        }
      });

      map.addSource("user-location", { type: "geojson", data: EMPTY_COLLECTION });
      map.addLayer({
        id: "user-location-halo",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-radius": 12,
          "circle-color": MAP_COLORS.locationSoft,
          "circle-stroke-color": MAP_COLORS.locationStroke,
          "circle-stroke-width": 1
        }
      });
      map.addLayer({
        id: "user-location-core",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-radius": 5,
          "circle-color": MAP_COLORS.location,
          "circle-stroke-color": MAP_COLORS.white,
          "circle-stroke-width": 2
        }
      });

      readyRef.current = true;
      setMapReady(true);
      map.getSource("earthquakes").setData(toGeoJSON(eventsRef.current));
      callbacksRef.current.onBoundsChange?.(plainBounds(map));
    });

    map.on("moveend", () => {
      setZoom(map.getZoom());
      callbacksRef.current.onBoundsChange?.(plainBounds(map));
    });

    map.on("zoom", () => setZoom(map.getZoom()));

    map.on("mousemove", "earthquake-points", (event) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = event.features?.[0];
      const earthquake = feature ? eventIndexRef.current.get(String(feature.properties?.id)) : null;
      if (!earthquake) return;

      const overlapping = map.queryRenderedFeatures(event.point, { layers: ["earthquake-points"] });
      const uniqueCount = new Set(overlapping.map((item) => String(item.properties?.id))).size;
      const suffix = uniqueCount > 1 ? ` · ${uniqueCount} events at this point` : "";
      popup
        .setLngLat([earthquake.longitude, earthquake.latitude])
        .setText(`M ${formatMagnitude(earthquake.magnitude)} · ${earthquake.place}${suffix}`)
        .addTo(map);
    });

    map.on("mouseleave", "earthquake-points", () => {
      map.getCanvas().style.cursor = "";
      popup.remove();
    });

    map.on("click", "earthquake-points", (event) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ["earthquake-points"] });
      const ids = [...new Set(features.map((feature) => String(feature.properties?.id)))].filter((id) => eventIndexRef.current.has(id));
      ids.sort((a, b) => (eventIndexRef.current.get(b)?.magnitude ?? -Infinity) - (eventIndexRef.current.get(a)?.magnitude ?? -Infinity));
      if (ids.length) callbacksRef.current.onSelect?.(ids[0], ids, "map");
    });

    map.on("error", (event) => {
      if (event?.error?.message?.toLocaleLowerCase().includes("webgl")) setMapError(true);
    });

    return () => {
      popup.remove();
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.getSource("earthquakes")?.setData(toGeoJSON(events));
  }, [events, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.getSource("selected-earthquake")?.setData(eventFeature(selectedEvent));
  }, [selectedEvent, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || !focusRequest?.event) return;
    map.easeTo({
      center: [focusRequest.event.longitude, focusRequest.event.latitude],
      zoom: Math.max(map.getZoom(), 4.25),
      duration: reducedMotion ? 0 : 650
    });
  }, [focusRequest, mapReady, reducedMotion]);

  const zoomBy = (amount) => {
    const map = mapRef.current;
    if (!map) return;
    map.easeTo({ zoom: map.getZoom() + amount, duration: reducedMotion ? 0 : 240 });
  };

  const locate = () => {
    const map = mapRef.current;
    if (!navigator.geolocation) {
      onNotice("Location is not available in this browser.", "error");
      return;
    }

    onNotice("Finding your location…", "neutral");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = [position.coords.longitude, position.coords.latitude];
        map?.getSource("user-location")?.setData({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: { type: "Point", coordinates }, properties: {} }]
        });
        map?.easeTo({ center: coordinates, zoom: Math.max(map.getZoom(), 4.5), duration: reducedMotion ? 0 : 650 });
        onNotice("Your approximate location is shown on the map.", "success");
      },
      () => onNotice("Your location could not be accessed. Check browser permission and try again.", "error"),
      { enableHighAccuracy: false, timeout: 9000, maximumAge: 300000 }
    );
  };

  return (
    <div className="map-frame">
      <div
        className="geo-map"
        ref={containerRef}
        tabIndex="0"
        role="application"
        aria-label="Interactive world map. Use arrow keys to pan, plus and minus to zoom. Use the synchronized earthquake list for full keyboard access to events."
      />

      {!mapReady && !mapError ? (
        <div className="map-loading" role="status">
          <span className="map-loading__line" aria-hidden="true"></span>
          <span>Drawing the world map…</span>
        </div>
      ) : null}

      {mapError ? (
        <div className="map-error" role="alert">
          <strong>The map could not start</strong>
          <span>WebGL is required to draw the live map.</span>
        </div>
      ) : null}

      <div className="map-toolbar" aria-label="Map controls">
        <div className="map-toolbar__zoom">
          <button type="button" onClick={() => zoomBy(1)} aria-label="Zoom in">+</button>
          <span aria-hidden="true"></span>
          <button type="button" onClick={() => zoomBy(-1)} aria-label="Zoom out">−</button>
        </div>
        <button type="button" onClick={() => fitEvents(mapRef.current, events, reducedMotion)} aria-label="Fit filtered earthquakes on the map">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></svg>
          <span>Fit events</span>
        </button>
        <button type="button" onClick={locate} aria-label="Show my location">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="7" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          <span>Locate me</span>
        </button>
      </div>

      <div className="map-readout" aria-hidden="true">World map <span>·</span> zoom {zoom.toFixed(1)}</div>

      <section className="legend" aria-label="Earthquake magnitude color legend">
        <div className="legend__heading"><strong>Magnitude</strong><span>Color + size</span></div>
        <div className="legend__scale" aria-hidden="true">
          <i data-band="micro"></i><i data-band="light"></i><i data-band="moderate"></i><i data-band="strong"></i><i data-band="major"></i>
        </div>
        <div className="legend__labels"><span>&lt;2</span><span>2–3</span><span>3–4.5</span><span>4.5–6</span><span>6+</span></div>
      </section>

      <div className="map-attribution">
        Map © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
        <span>·</span>
        Data <a href="https://earthquake.usgs.gov/" target="_blank" rel="noreferrer">USGS</a>
      </div>
    </div>
  );
}
