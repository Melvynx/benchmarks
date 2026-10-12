import { useEffect, useRef, useState } from 'react';
import maplibregl, { type ExpressionSpecification, type FilterSpecification, type GeoJSONSource, type PaddingOptions } from 'maplibre-gl';
import { magColorExpression } from './magnitude';
import { REGIONS } from './regions';
import type { Quake } from './types';

const STYLE = 'https://tiles.openfreemap.org/styles/dark';
const RECENT_MS = 3 * 60 * 60 * 1000;

type PointCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: string;
    properties: { eid: string; mag: number; time: number; depth: number };
    geometry: { type: 'Point'; coordinates: [number, number] };
  }>;
};

const EMPTY: PointCollection = { type: 'FeatureCollection', features: [] };

const RADIUS: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['get', 'mag'],
  0,
  6,
  2,
  7,
  4,
  12,
  5,
  16,
  6,
  22,
  7,
  30,
  8,
  38,
];

type QuakeMapProps = {
  quakes: Quake[];
  selected: Quake | null;
  hoverId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  viewToken: number;
  viewCenter: [number, number];
  viewZoom: number;
  frameToken: number;
};

function toCollection(quakes: Quake[]): PointCollection {
  return {
    type: 'FeatureCollection',
    features: quakes.map((quake) => ({
      type: 'Feature',
      id: quake.id,
      properties: {
        eid: quake.id,
        mag: quake.mag,
        time: quake.time,
        depth: quake.depth,
      },
      geometry: {
        type: 'Point',
        coordinates: [quake.lon, quake.lat],
      },
    })),
  };
}

function asGeo(source: unknown): GeoJSONSource | null {
  if (source && typeof source === 'object' && 'type' in source && source.type === 'geojson' && 'setData' in source) {
    return source as GeoJSONSource;
  }
  return null;
}

function frameQuakes(map: maplibregl.Map, quakes: Quake[]) {
  if (quakes.length === 0) return;
  let west = 180;
  let east = -180;
  let south = 90;
  let north = -90;
  for (const quake of quakes) {
    west = Math.min(west, quake.lon);
    east = Math.max(east, quake.lon);
    south = Math.min(south, quake.lat);
    north = Math.max(north, quake.lat);
  }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const global = east - west > 120 || north - south > 70 || quakes.length > 400;
  if (global) {
    move(map, REGIONS[0].center, REGIONS[0].zoom);
    return;
  }
  const camera = {
    padding: { top: 56, right: 48, bottom: 150, left: 28 },
    maxZoom: 5.5,
    duration: reduce ? 0 : 1100,
  };
  map.fitBounds(
    [
      [west, south],
      [east, north],
    ],
    camera,
  );
}

function move(map: maplibregl.Map, center: [number, number], zoom: number, padding?: PaddingOptions) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const camera = padding ? { center, zoom, padding } : { center, zoom };
  if (reduce) map.jumpTo(camera);
  else map.flyTo({ ...camera, duration: 1300, essential: true });
}

export function QuakeMap({
  quakes,
  selected,
  hoverId,
  onSelect,
  onHover,
  viewToken,
  viewCenter,
  viewZoom,
  frameToken,
}: QuakeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [mapFailed, setMapFailed] = useState<string | null>(null);
  const quakesRef = useRef(quakes);
  const selectedRef = useRef(selected);
  const hoverRef = useRef(hoverId);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const appliedHover = useRef<string | null>(null);
  const viewRef = useRef({ center: viewCenter, zoom: viewZoom });
  const flownRef = useRef<string | null>(null);
  const framedRef = useRef(0);

  quakesRef.current = quakes;
  selectedRef.current = selected;
  hoverRef.current = hoverId;
  onSelectRef.current = onSelect;
  onHoverRef.current = onHover;
  viewRef.current = { center: viewCenter, zoom: viewZoom };

  const syncRef = useRef<(map: maplibregl.Map) => void>(() => {});
  syncRef.current = (map) => {
    const quakeSource = asGeo(map.getSource('quakes'));
    const selectedSource = asGeo(map.getSource('selected'));
    if (!quakeSource || !selectedSource) return;
    const sorted = [...quakesRef.current].sort((a, b) => a.mag - b.mag);
    quakeSource.setData(toCollection(sorted));
    const current = selectedRef.current;
    selectedSource.setData(current ? toCollection([current]) : EMPTY);
    const recent: FilterSpecification = ['>=', ['get', 'time'], Date.now() - RECENT_MS];
    if (map.getLayer('recent-halo')) map.setFilter('recent-halo', recent);

    const next = hoverRef.current;
    const prev = appliedHover.current;
    if (prev && prev !== next) {
      try {
        map.removeFeatureState({ source: 'quakes', id: prev });
      } catch {
        /* The feature may have left the source. */
      }
    }
    if (next) {
      try {
        map.setFeatureState({ source: 'quakes', id: next }, { hover: true });
      } catch {
        /* Hover can arrive before the point is in the source. */
      }
    }
    appliedHover.current = next;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let alive = true;
    let frame = 0;
    const world = REGIONS[0];
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
      container,
      style: STYLE,
      center: world.center,
      zoom: world.zoom,
      minZoom: 0.8,
      maxZoom: 14,
      attributionControl: false,
      renderWorldCopies: false,
      fadeDuration: 0,
      });
    } catch (err) {
      setMapFailed(err instanceof Error ? err.message : 'The map failed to start.');
      return;
    }
    mapRef.current = map;

    let interacted = false;
    const mark = () => {
      interacted = true;
    };
    map.on('dragstart', mark);
    map.on('zoomstart', mark);

    const pick = (event: maplibregl.MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const raw = feature?.properties?.eid ?? feature?.id;
      if (raw === undefined || raw === null) return;
      onSelectRef.current(String(raw));
    };
    const enter = (event: maplibregl.MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = 'pointer';
      const feature = event.features?.[0];
      const raw = feature?.properties?.eid ?? feature?.id;
      if (raw === undefined || raw === null) return;
      onHoverRef.current(String(raw));
    };
    const leave = () => {
      map.getCanvas().style.cursor = '';
      onHoverRef.current(null);
    };

    map.on('load', () => {
      if (!alive) return;
      map.setProjection({ type: 'globe' });
      map.setSky({
        'sky-color': '#07141c',
        'horizon-color': '#1d4e68',
        'fog-color': '#07141c',
        'sky-horizon-blend': 0.5,
        'horizon-fog-blend': 0.12,
        'atmosphere-blend': 0.8,
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false, showCompass: true }), 'top-right');
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-left');
      map.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-right');
      if (!interacted) map.jumpTo({ center: world.center, zoom: world.zoom });

      map.addSource('quakes', { type: 'geojson', data: EMPTY, promoteId: 'eid' });
      map.addSource('selected', { type: 'geojson', data: EMPTY });

      map.addLayer({
        id: 'recent-halo',
        type: 'circle',
        source: 'quakes',
        filter: ['>=', ['get', 'time'], Date.now() - RECENT_MS],
        paint: {
          'circle-radius': ['+', RADIUS, 7],
          'circle-color': 'transparent',
          'circle-stroke-color': magColorExpression(),
          'circle-stroke-width': 1.6,
          'circle-stroke-opacity': 0.75,
        },
      });
      map.addLayer({
        id: 'quakes',
        type: 'circle',
        source: 'quakes',
        layout: { 'circle-sort-key': ['get', 'mag'] },
        paint: {
          'circle-radius': ['+', RADIUS, ['case', ['boolean', ['feature-state', 'hover'], false], 3, 0]],
          'circle-color': magColorExpression(),
          'circle-opacity': 0.94,
          'circle-stroke-color': ['case', ['>=', ['get', 'mag'], 7], '#e24b4b', '#041018'],
          'circle-stroke-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            2.5,
            ['>=', ['get', 'mag'], 7],
            2,
            1,
          ],
        },
      });
      map.addLayer({
        id: 'selected-ring',
        type: 'circle',
        source: 'selected',
        paint: {
          'circle-radius': ['+', RADIUS, 9],
          'circle-color': 'transparent',
          'circle-stroke-color': '#f4efe4',
          'circle-stroke-width': 2,
        },
      });

      map.on('click', 'quakes', pick);
      map.on('click', 'recent-halo', pick);
      map.on('mouseenter', 'quakes', enter);
      map.on('mouseenter', 'recent-halo', enter);
      map.on('mouseleave', 'quakes', leave);
      map.on('mouseleave', 'recent-halo', leave);

      syncRef.current(map);
      setReady(true);

      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduce) {
        const tick = (time: number) => {
          if (!mapRef.current) return;
          const wave = 0.28 + 0.55 * (0.5 + 0.5 * Math.sin(time / 380));
          map.setPaintProperty('recent-halo', 'circle-stroke-opacity', wave);
          frame = window.requestAnimationFrame(tick);
        };
        frame = window.requestAnimationFrame(tick);
      }
    });

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container);

    return () => {
      alive = false;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    syncRef.current(map);
  }, [quakes, selected, hoverId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || viewToken === 0) return;
    const { center, zoom } = viewRef.current;
    move(map, center, zoom);
  }, [ready, viewToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || frameToken === 0 || framedRef.current === frameToken) return;
    if (quakesRef.current.length === 0) return;
    framedRef.current = frameToken;
    try {
      frameQuakes(map, quakesRef.current);
    } catch {
      /* Keep the current camera if the globe rejects this frame. */
    }
  }, [ready, frameToken, quakes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    if (!selected) {
      flownRef.current = null;
      return;
    }
    if (flownRef.current === selected.id) return;
    flownRef.current = selected.id;
    const wide = window.matchMedia('(min-width: 901px)').matches;
    move(map, [selected.lon, selected.lat], Math.max(map.getZoom(), 4.2), wide
      ? { top: 48, right: 380, bottom: 110, left: 24 }
      : { top: 56, right: 16, bottom: 48, left: 16 });
  }, [ready, selected]);

  return (
    <>
      <div ref={containerRef} className="map" />
      {mapFailed ? <p className="map-failed">{mapFailed}</p> : null}
    </>
  );
}
