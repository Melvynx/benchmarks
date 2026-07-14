import { useEffect, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl';
import { LocateFixed, Minus, Plus } from 'lucide-react';
import type { EarthquakeFeature } from './types';

interface MapViewProps {
  events: EarthquakeFeature[];
  selectedId: string | null;
  hoveredId: string | null;
  flyTarget: [number, number] | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

const SOURCE_ID = 'earthquakes';

export function MapView({ events, selectedId, hoveredId, flyTarget, onSelect, onHover }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const previousState = useRef<{ selected: string | null; hovered: string | null }>({ selected: null, hovered: null });
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [10, 18],
      zoom: 1.35,
      minZoom: 0.6,
      maxZoom: 12,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.on('error', (event) => {
      if (!event.error?.message?.includes('sprite')) setMapError(true);
    });
    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 8,
        clusterRadius: 44,
        promoteId: 'eventId',
      });
      map.addLayer({
        id: 'clusters-halo', type: 'circle', source: SOURCE_ID, filter: ['has', 'point_count'],
        paint: { 'circle-color': 'rgba(13, 24, 20, .7)', 'circle-radius': ['step', ['get', 'point_count'], 20, 25, 25, 100, 31], 'circle-stroke-color': '#76c69c', 'circle-stroke-width': 1.5 },
      });
      map.addLayer({
        id: 'clusters', type: 'symbol', source: SOURCE_ID, filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['Noto Sans Bold'] },
        paint: { 'text-color': '#eef6f1' },
      });
      map.addLayer({
        id: 'quake-rings', type: 'circle', source: SOURCE_ID, filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'mag'], 0], 0, 5, 2.5, 8, 4.5, 13, 7, 22],
          'circle-color': ['case', ['>=', ['coalesce', ['get', 'mag'], 0], 6], '#ed674f', ['>=', ['coalesce', ['get', 'mag'], 0], 4.5], '#e6a34b', '#78c9a0'],
          'circle-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, ['boolean', ['feature-state', 'hover'], false], .95, .72],
          'circle-stroke-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#ffffff', ['boolean', ['feature-state', 'hover'], false], '#ffffff', '#10231b'],
          'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3, ['boolean', ['feature-state', 'hover'], false], 2, 1],
        },
      });
      map.addLayer({
        id: 'quake-centers', type: 'circle', source: SOURCE_ID, filter: ['!', ['has', 'point_count']],
        paint: { 'circle-radius': 2.2, 'circle-color': '#f7faf8', 'circle-opacity': .9 },
      });

      map.on('click', 'clusters-halo', (event) => {
        const feature = map.queryRenderedFeatures(event.point, { layers: ['clusters-halo'] })[0];
        const clusterId = feature?.properties?.cluster_id;
        if (clusterId === undefined) return;
        (map.getSource(SOURCE_ID) as GeoJSONSource).getClusterExpansionZoom(clusterId).then((zoom) => {
          const coordinates = (feature.geometry as { coordinates: [number, number] }).coordinates;
          map.easeTo({ center: coordinates, zoom, duration: 350 });
        }).catch(() => undefined);
      });
      map.on('click', 'quake-rings', (event) => {
        const id = event.features?.[0]?.properties?.eventId as string | undefined;
        if (id) onSelect(id);
      });
      map.on('mousemove', 'quake-rings', (event) => {
        map.getCanvas().style.cursor = 'pointer';
        const id = event.features?.[0]?.properties?.eventId as string | undefined;
        onHover(id ?? null);
      });
      map.on('mouseleave', 'quake-rings', () => {
        map.getCanvas().style.cursor = '';
        onHover(null);
      });
      map.on('mouseenter', 'clusters-halo', () => { map.getCanvas().style.cursor = 'zoom-in'; });
      map.on('mouseleave', 'clusters-halo', () => { map.getCanvas().style.cursor = ''; });
      setReady(true);
    });
    return () => { map.remove(); mapRef.current = null; };
  }, [onHover, onSelect]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const source = mapRef.current.getSource(SOURCE_ID) as GeoJSONSource;
    source.setData({
      type: 'FeatureCollection',
      features: events.map((event) => ({
        type: 'Feature',
        id: event.id,
        geometry: event.geometry,
        properties: { ...event.properties, eventId: event.id },
      })),
    });
  }, [events, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const prev = previousState.current;
    if (prev.selected) map.setFeatureState({ source: SOURCE_ID, id: prev.selected }, { selected: false });
    if (prev.hovered) map.setFeatureState({ source: SOURCE_ID, id: prev.hovered }, { hover: false });
    if (selectedId) map.setFeatureState({ source: SOURCE_ID, id: selectedId }, { selected: true });
    if (hoveredId) map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: true });
    previousState.current = { selected: selectedId, hovered: hoveredId };
  }, [hoveredId, ready, selectedId]);

  useEffect(() => {
    if (flyTarget && mapRef.current) mapRef.current.easeTo({ center: flyTarget, zoom: Math.max(mapRef.current.getZoom(), 9), duration: 650 });
  }, [flyTarget]);

  const zoom = (delta: number) => mapRef.current?.easeTo({ zoom: mapRef.current.getZoom() + delta, duration: 180 });
  const locate = () => {
    if (!navigator.geolocation || !mapRef.current) { setLocationStatus('Location is not available in this browser.'); return; }
    setLocationStatus('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { mapRef.current?.easeTo({ center: [coords.longitude, coords.latitude], zoom: 6, duration: 650 }); setLocationStatus('Map centered on your location.'); },
      () => setLocationStatus('Location permission was not granted.'),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  };

  return (
    <div className="map-shell" aria-label="Interactive earthquake map">
      <div ref={containerRef} className="map-canvas" />
      <div className="map-controls" aria-label="Map controls">
        <button type="button" aria-label="Zoom in" onClick={() => zoom(1)}><Plus size={18} /></button>
        <button type="button" aria-label="Zoom out" onClick={() => zoom(-1)}><Minus size={18} /></button>
        <button type="button" aria-label="Center map on my location" onClick={locate}><LocateFixed size={18} /></button>
      </div>
      <div className="map-legend" aria-label="Map symbol legend">
        <span><i className="legend-dot minor" /> M0–2.4</span>
        <span><i className="legend-dot light" /> M2.5–4.4</span>
        <span><i className="legend-dot strong" /> M4.5–5.9</span>
        <span><i className="legend-dot major" /> M6+</span>
        <span className="legend-note">Circle size shows magnitude</span>
      </div>
      {mapError && <div className="map-error" role="status">Basemap tiles are unavailable. Events remain accessible in the stream.</div>}
      {locationStatus && <div className="sr-only" role="status" aria-live="polite">{locationStatus}</div>}
    </div>
  );
}
