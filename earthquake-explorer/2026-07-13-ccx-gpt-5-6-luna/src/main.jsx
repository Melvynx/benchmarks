import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles.css';

const FEEDS = {
  hour: { label: 'Past hour', shortLabel: '1h', durationMs: 60 * 60 * 1000, path: 'all_hour.geojson' },
  day: { label: 'Past day', shortLabel: '24h', durationMs: 24 * 60 * 60 * 1000, path: 'all_day.geojson' },
  week: { label: 'Past 7 days', shortLabel: '7d', durationMs: 7 * 24 * 60 * 60 * 1000, path: 'all_week.geojson' },
  month: { label: 'Past 30 days', shortLabel: '30d', durationMs: 30 * 24 * 60 * 60 * 1000, path: 'all_month.geojson' },
};

const USGS_FEED_ROOT = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/';
const MAX_DEPTH = 700;
const DEFAULTS = {
  timeframe: 'week',
  minMag: 0,
  maxMag: 10,
  depthMin: 0,
  depthMax: MAX_DEPTH,
  alert: 'all',
  tsunamiOnly: false,
  reviewedOnly: false,
  placeQuery: '',
  sort: 'time',
};

function readInitialState() {
  const params = new URLSearchParams(window.location.search);
  const timeframe = params.get('range');
  const minMag = Number(params.get('minMag'));
  const maxMag = Number(params.get('maxMag'));
  const depthMin = Number(params.get('depthMin'));
  const depthMax = Number(params.get('depthMax'));
  const timelineStart = Number(params.get('from'));
  const timelineEnd = Number(params.get('to'));
  return {
    timeframe: timeframe && FEEDS[timeframe] ? timeframe : DEFAULTS.timeframe,
    minMag: Number.isFinite(minMag) ? Math.max(0, Math.min(10, minMag)) : DEFAULTS.minMag,
    maxMag: Number.isFinite(maxMag) ? Math.max(0, Math.min(10, maxMag)) : DEFAULTS.maxMag,
    depthMin: Number.isFinite(depthMin) ? Math.max(0, Math.min(MAX_DEPTH, depthMin)) : DEFAULTS.depthMin,
    depthMax: Number.isFinite(depthMax) ? Math.max(0, Math.min(MAX_DEPTH, depthMax)) : DEFAULTS.depthMax,
    alert: ['all', 'green', 'yellow', 'orange', 'red', 'unknown'].includes(params.get('alert')) ? params.get('alert') : DEFAULTS.alert,
    tsunamiOnly: params.get('tsunami') === '1',
    reviewedOnly: params.get('reviewed') === '1',
    placeQuery: params.get('place') || DEFAULTS.placeQuery,
    sort: ['time', 'magnitude', 'depth'].includes(params.get('sort')) ? params.get('sort') : DEFAULTS.sort,
    selectedEventId: params.get('event') || '',
    timelineWindow: Number.isFinite(timelineStart) && Number.isFinite(timelineEnd) && timelineEnd > timelineStart ? { start: timelineStart, end: timelineEnd } : null,
  };
}

function normalizeFeature(feature, index) {
  const properties = feature?.properties || {};
  const coordinates = feature?.geometry?.coordinates || [];
  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);
  const rawDepth = coordinates[2];
  const rawTime = properties.time;
  const depth = rawDepth === null || rawDepth === undefined || rawDepth === '' ? NaN : Number(rawDepth);
  const time = rawTime === null || rawTime === undefined || rawTime === '' ? NaN : Number(rawTime);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(time)) return null;
  const rawMagnitude = properties.mag;
  const magnitude = rawMagnitude === null || rawMagnitude === undefined || rawMagnitude === '' ? NaN : Number(rawMagnitude);
  const rawSignificance = properties.sig;
  const rawFelt = properties.felt;
  const significance = rawSignificance === null || rawSignificance === undefined || rawSignificance === '' ? NaN : Number(rawSignificance);
  const felt = rawFelt === null || rawFelt === undefined || rawFelt === '' ? NaN : Number(rawFelt);
  return {
    id: String(properties.code || feature.id || `event-${time}-${index}`),
    magnitude: Number.isFinite(magnitude) ? magnitude : null,
    place: properties.place || 'Location not reported',
    title: properties.title || properties.place || 'Earthquake',
    time,
    updated: Number(properties.updated) || null,
    latitude,
    longitude,
    depth: Number.isFinite(depth) ? depth : null,
    felt: Number.isFinite(felt) ? felt : null,
    significance: Number.isFinite(significance) ? significance : null,
    alert: properties.alert || null,
    tsunami: properties.tsunami === 1 || properties.tsunami === '1',
    status: properties.status || null,
    eventType: properties.type || null,
    url: properties.url || null,
    detail: properties.detail || null,
    network: properties.net || null,
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatMagnitude(value) {
  return Number.isFinite(value) ? value.toFixed(1) : '—';
}

function getMaxMagnitude(eventList) {
  const magnitudes = eventList.map((event) => event.magnitude).filter(Number.isFinite);
  return magnitudes.length ? Math.max(...magnitudes) : null;
}

function formatDepth(value) {
  return Number.isFinite(value) ? `${value.toFixed(value < 10 ? 1 : 0)} km` : 'Depth not reported';
}

function formatRelativeTime(timestamp, now = Date.now()) {
  if (!Number.isFinite(timestamp)) return 'Time not reported';
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatLocalTime(timestamp) {
  if (!Number.isFinite(timestamp)) return 'Time not reported';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function formatUtcTime(timestamp) {
  if (!Number.isFinite(timestamp)) return 'Time not reported';
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(timestamp));
}

function formatAge(timestamp, now = Date.now()) {
  if (!timestamp) return 'Not refreshed yet';
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return 'refreshed just now';
  if (seconds < 3600) return `refreshed ${Math.floor(seconds / 60)}m ago`;
  return `refreshed ${Math.floor(seconds / 3600)}h ago`;
}

function formatWindow(start, end) {
  if (!start || !end) return '';
  const sameDay = new Date(start).toDateString() === new Date(end).toDateString();
  const startText = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(start));
  const endText = new Intl.DateTimeFormat(undefined, sameDay ? { hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(end));
  return `${startText} – ${endText}`;
}

function formatBucketLabel(timestamp, timeframe) {
  const options = timeframe === 'month'
    ? { month: 'short', day: 'numeric' }
    : timeframe === 'week'
      ? { weekday: 'short', hour: 'numeric' }
      : { hour: 'numeric', minute: '2-digit' };
  return new Intl.DateTimeFormat(undefined, options).format(new Date(timestamp));
}

function getAlertLabel(alert) {
  return alert ? `${alert[0].toUpperCase()}${alert.slice(1)} alert` : 'No alert level';
}

function getAlertClass(alert) {
  return alert ? `alert-${alert}` : 'alert-unknown';
}

function colorForMagnitude(magnitude) {
  if (!Number.isFinite(magnitude)) return '#71817e';
  if (magnitude < 2) return '#8ba6a0';
  if (magnitude < 4) return '#bb9860';
  if (magnitude < 5) return '#c46f4d';
  return '#ad4037';
}

function getSignalAssessment(event) {
  if (event.magnitude === null && event.significance === null && event.felt === null) {
    return { label: 'Context incomplete', detail: 'USGS has not reported enough context to classify this event.' };
  }
  if (event.tsunami || event.alert === 'red' || (event.significance ?? 0) >= 600 || (event.magnitude ?? 0) >= 6) {
    return { label: 'Review closely', detail: 'Several reported indicators place this event above ordinary background activity.' };
  }
  if ((event.magnitude ?? 0) >= 4.5 || (event.felt ?? 0) >= 10 || (event.significance ?? 0) >= 300) {
    return { label: 'Notable signal', detail: 'Magnitude, reports, or USGS significance make this one worth a closer look.' };
  }
  return { label: 'Routine background activity', detail: 'A common small event in the current global field; context still matters.' };
}

function App() {
  const initialState = useMemo(() => readInitialState(), []);
  const [timeframe, setTimeframe] = useState(initialState.timeframe);
  const [minMag, setMinMag] = useState(initialState.minMag);
  const [maxMag, setMaxMag] = useState(Math.max(initialState.maxMag, initialState.minMag));
  const [depthMin, setDepthMin] = useState(Math.min(initialState.depthMin, initialState.depthMax));
  const [depthMax, setDepthMax] = useState(Math.max(initialState.depthMax, initialState.depthMin));
  const [alert, setAlert] = useState(initialState.alert);
  const [tsunamiOnly, setTsunamiOnly] = useState(initialState.tsunamiOnly);
  const [reviewedOnly, setReviewedOnly] = useState(initialState.reviewedOnly);
  const [placeQuery, setPlaceQuery] = useState(initialState.placeQuery);
  const [sort, setSort] = useState(initialState.sort);
  const [events, setEvents] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [selectedEventId, setSelectedEventId] = useState(initialState.selectedEventId);
  const [hoveredEventId, setHoveredEventId] = useState('');
  const [timelineWindow, setTimelineWindow] = useState(initialState.timelineWindow);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [streamLimit, setStreamLimit] = useState(160);
  const [shareState, setShareState] = useState('');
  const [geocodeState, setGeocodeState] = useState({ status: 'idle', label: '' });
  const [mapZoom, setMapZoom] = useState(2);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerLayerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const eventsRef = useRef(events);
  const detailRef = useRef(null);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  const loadFeed = useCallback(async (range) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoadState(eventsRef.current.length ? 'refreshing' : 'loading');
    setError('');
    try {
      const response = await fetch(`${USGS_FEED_ROOT}${FEEDS[range].path}?updated=${Date.now()}`, {
        signal: controller.signal,
        headers: { Accept: 'application/geo+json' },
      });
      if (!response.ok) throw new Error(`USGS returned ${response.status}`);
      const payload = await response.json();
      if (!payload || !Array.isArray(payload.features)) throw new Error('Unexpected USGS response');
      const nextEvents = payload.features
        .map(normalizeFeature)
        .filter(Boolean)
        .sort((a, b) => b.time - a.time);
      setEvents(nextEvents);
      setLastUpdated(Date.now());
      setLoadState('ready');
    } catch (requestError) {
      if (requestError?.name === 'AbortError') return;
      setError('The USGS feed could not be reached. The last displayed data is preserved.');
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    loadFeed(timeframe);
    const interval = window.setInterval(() => loadFeed(timeframe), 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [loadFeed, timeframe]);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('range', timeframe);
    if (minMag > DEFAULTS.minMag) params.set('minMag', String(minMag));
    if (maxMag < DEFAULTS.maxMag) params.set('maxMag', String(maxMag));
    if (depthMin > DEFAULTS.depthMin) params.set('depthMin', String(depthMin));
    if (depthMax < DEFAULTS.depthMax) params.set('depthMax', String(depthMax));
    if (alert !== DEFAULTS.alert) params.set('alert', alert);
    if (tsunamiOnly) params.set('tsunami', '1');
    if (reviewedOnly) params.set('reviewed', '1');
    if (placeQuery) params.set('place', placeQuery);
    if (sort !== DEFAULTS.sort) params.set('sort', sort);
    if (selectedEventId) params.set('event', selectedEventId);
    if (timelineWindow) {
      params.set('from', String(timelineWindow.start));
      params.set('to', String(timelineWindow.end));
    }
    const nextSearch = `?${params.toString()}`;
    if (window.location.search !== nextSearch) window.history.replaceState({}, '', `${window.location.pathname}${nextSearch}${window.location.hash}`);
  }, [timeframe, minMag, maxMag, depthMin, depthMax, alert, tsunamiOnly, reviewedOnly, placeQuery, sort, selectedEventId, timelineWindow]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    const placeMatch = !placeQuery || event.place.toLowerCase().includes(placeQuery.trim().toLowerCase());
    const magMatch = event.magnitude === null ? (minMag === DEFAULTS.minMag && maxMag === DEFAULTS.maxMag) : (event.magnitude >= minMag && event.magnitude <= maxMag);
    const depthMatch = event.depth === null ? (depthMin === DEFAULTS.depthMin && depthMax === DEFAULTS.depthMax) : (event.depth >= depthMin && event.depth <= depthMax);
    const alertMatch = alert === 'all' || (alert === 'unknown' ? !event.alert : event.alert === alert);
    const tsunamiMatch = !tsunamiOnly || event.tsunami;
    const reviewedMatch = !reviewedOnly || event.status === 'reviewed';
    return placeMatch && magMatch && depthMatch && alertMatch && tsunamiMatch && reviewedMatch;
  }), [events, placeQuery, minMag, maxMag, depthMin, depthMax, alert, tsunamiOnly, reviewedOnly]);

  const sortedEvents = useMemo(() => [...filteredEvents].sort((a, b) => {
    if (sort === 'magnitude') return (b.magnitude ?? -Infinity) - (a.magnitude ?? -Infinity) || b.time - a.time;
    if (sort === 'depth') return (a.depth ?? Infinity) - (b.depth ?? Infinity) || b.time - a.time;
    return b.time - a.time;
  }), [filteredEvents, sort]);

  const strongestEvent = useMemo(() => [...filteredEvents].sort((a, b) => (b.magnitude ?? -Infinity) - (a.magnitude ?? -Infinity) || b.time - a.time)[0] || null, [filteredEvents]);
  const selectedEvent = useMemo(() => filteredEvents.find((event) => event.id === selectedEventId) || strongestEvent, [filteredEvents, selectedEventId, strongestEvent]);

  useEffect(() => {
    if (!selectedEventId && strongestEvent) setSelectedEventId(strongestEvent.id);
    if (events.length && selectedEventId && !filteredEvents.some((event) => event.id === selectedEventId)) setSelectedEventId(strongestEvent?.id || '');
  }, [events.length, filteredEvents, selectedEventId, strongestEvent]);

  const timelineBuckets = useMemo(() => {
    const range = FEEDS[timeframe];
    const bucketCount = timeframe === 'hour' ? 12 : timeframe === 'day' ? 24 : timeframe === 'week' ? 28 : 30;
    const end = nowTick;
    const start = end - range.durationMs;
    const bucketDuration = range.durationMs / bucketCount;
    return Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = start + index * bucketDuration;
      const bucketEnd = bucketStart + bucketDuration;
      const bucketEvents = filteredEvents.filter((event) => event.time >= bucketStart && event.time < bucketEnd);
      return {
        index,
        start: bucketStart,
        end: bucketEnd,
        events: bucketEvents,
        count: bucketEvents.length,
        maxMagnitude: getMaxMagnitude(bucketEvents),
      };
    });
  }, [filteredEvents, nowTick, timeframe]);

  const selectedBucketIndex = useMemo(() => selectedEvent ? timelineBuckets.findIndex((bucket) => selectedEvent.time >= bucket.start && selectedEvent.time < bucket.end) : -1, [selectedEvent, timelineBuckets]);
  const timelineWindowEvents = timelineWindow ? filteredEvents.filter((event) => event.time >= timelineWindow.start && event.time < timelineWindow.end) : [];
  const maxTimelineCount = Math.max(...timelineBuckets.map((bucket) => bucket.count), 1);

  const depthBuckets = useMemo(() => {
    const bands = [
      { label: 'Shallow', sublabel: '0–20 km', min: 0, max: 20 },
      { label: 'Crustal', sublabel: '20–70 km', min: 20, max: 70 },
      { label: 'Intermediate', sublabel: '70–300 km', min: 70, max: 300 },
      { label: 'Deep', sublabel: '300+ km', min: 300, max: MAX_DEPTH },
    ];
    return bands.map((band) => ({
      ...band,
      count: filteredEvents.filter((event) => event.depth !== null && event.depth >= band.min && (band.max === MAX_DEPTH ? event.depth <= MAX_DEPTH : event.depth < band.max)).length,
    }));
  }, [filteredEvents]);
  const maxDepthCount = Math.max(...depthBuckets.map((band) => band.count), 1);

  const selectEvent = useCallback((event, shouldScroll = true) => {
    setSelectedEventId(event.id);
    if (shouldScroll && window.innerWidth < 980) {
      window.requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }));
    }
  }, []);

  const focusEventOnMap = useCallback((event) => {
    selectEvent(event, false);
    mapInstanceRef.current?.panTo([event.latitude, event.longitude], { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
  }, [selectEvent]);

  const resetFilters = useCallback(() => {
    setMinMag(DEFAULTS.minMag);
    setMaxMag(DEFAULTS.maxMag);
    setDepthMin(DEFAULTS.depthMin);
    setDepthMax(DEFAULTS.depthMax);
    setAlert(DEFAULTS.alert);
    setTsunamiOnly(DEFAULTS.tsunamiOnly);
    setReviewedOnly(DEFAULTS.reviewedOnly);
    setPlaceQuery(DEFAULTS.placeQuery);
    setSort(DEFAULTS.sort);
    setTimelineWindow(null);
    setSelectedEventId('');
    setStreamLimit(160);
  }, []);

  const copyShareLink = useCallback(async () => {
    const url = window.location.href;
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      setShareState('Link copied');
    } catch {
      window.prompt('Copy this observatory link', url);
      setShareState('Link ready to copy');
    }
    window.setTimeout(() => setShareState(''), 2500);
  }, []);

  const geocodePlace = useCallback(async (event) => {
    event?.preventDefault();
    const query = placeQuery.trim();
    if (!query) {
      setGeocodeState({ status: 'idle', label: '' });
      return;
    }
    setGeocodeState({ status: 'loading', label: '' });
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Geocoder unavailable');
      const results = await response.json();
      const result = results?.[0];
      if (!result) throw new Error('Place not found');
      const latitude = Number(result.lat);
      const longitude = Number(result.lon);
      mapInstanceRef.current?.setView([latitude, longitude], Math.max(mapInstanceRef.current.getZoom(), 5), { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches });
      setGeocodeState({ status: 'ready', label: result.display_name });
    } catch {
      setGeocodeState({ status: 'error', label: 'Place not found. Try a country, city, or region.' });
    }
  }, [placeQuery]);

  useEffect(() => {
    if (mapInstanceRef.current || !mapContainerRef.current) return undefined;
    const map = L.map(mapContainerRef.current, {
      center: [18, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 9,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    markerLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    setMapZoom(map.getZoom());
    const handleResize = () => map.invalidateSize();
    const handleZoom = () => setMapZoom(map.getZoom());
    window.addEventListener('resize', handleResize);
    map.on('zoomend', handleZoom);
    window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const clusterSize = mapZoom <= 2 ? 18 : mapZoom <= 3 ? 8 : mapZoom <= 4 ? 4 : mapZoom <= 5 ? 1.5 : 0;
    const groups = new Map();
    filteredEvents.forEach((event) => {
      const key = clusterSize ? `${Math.floor((event.latitude + 90) / clusterSize)}:${Math.floor((event.longitude + 180) / clusterSize)}` : event.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    });

    groups.forEach((group) => {
      if (group.length > 1) {
        const latitude = group.reduce((sum, event) => sum + event.latitude, 0) / group.length;
        const longitude = group.reduce((sum, event) => sum + event.longitude, 0) / group.length;
        const maxMagnitude = getMaxMagnitude(group);
        const inTimeline = !timelineWindow || group.some((event) => event.time >= timelineWindow.start && event.time < timelineWindow.end);
        const icon = L.divIcon({
          className: 'quake-cluster-icon',
          html: `<span class="quake-cluster ${maxMagnitude >= 5 ? 'quake-cluster-large' : ''} ${inTimeline ? '' : 'quake-marker-muted'}"><b>${group.length}</b><small>M${formatMagnitude(maxMagnitude)}</small></span>`,
          iconSize: [56, 56],
          iconAnchor: [28, 28],
        });
        const marker = L.marker([latitude, longitude], { icon, keyboard: true, title: `${group.length} earthquakes in this area` });
        marker.bindTooltip(`${group.length} events · strongest M${formatMagnitude(maxMagnitude)}`, { direction: 'top', offset: [0, -26] });
        const bounds = L.latLngBounds(group.map((event) => [event.latitude, event.longitude]));
        marker.on('click', () => {
          if (bounds.isValid() && bounds.getNorthEast().equals(bounds.getSouthWest())) map.setView([latitude, longitude], Math.min(map.getZoom() + 2, 9));
          else map.fitBounds(bounds.pad(0.18), { maxZoom: Math.min(map.getZoom() + 3, 8) });
        });
        layer.addLayer(marker);
        return;
      }
      const event = group[0];
      const inTimeline = !timelineWindow || (event.time >= timelineWindow.start && event.time < timelineWindow.end);
      const isFocused = event.id === selectedEvent?.id || event.id === hoveredEventId;
      const alertStroke = event.alert === 'red' ? '#9d3030' : event.alert === 'orange' ? '#b56335' : event.alert === 'yellow' ? '#a77b31' : '#203538';
      const marker = L.circleMarker([event.latitude, event.longitude], {
        radius: Math.max(4, 4 + (event.magnitude ?? 0) * 1.4),
        fillColor: colorForMagnitude(event.magnitude),
        color: isFocused ? '#17252a' : alertStroke,
        weight: isFocused ? 3 : event.tsunami ? 3 : 1.5,
        opacity: inTimeline ? 1 : 0.2,
        fillOpacity: inTimeline ? (isFocused ? 0.98 : 0.78) : 0.12,
        dashArray: event.tsunami ? '4 3' : undefined,
      });
      marker.bindTooltip(`M${formatMagnitude(event.magnitude)} · ${event.place} · ${formatDepth(event.depth)}`, { direction: 'top', offset: [0, -8] });
      marker.on('click', () => selectEvent(event, false));
      marker.on('mouseover', () => setHoveredEventId(event.id));
      marker.on('mouseout', () => setHoveredEventId(''));
      marker.on('focus', () => setHoveredEventId(event.id));
      marker.on('blur', () => setHoveredEventId(''));
      if (isFocused) marker.bringToFront();
      layer.addLayer(marker);
    });
  }, [filteredEvents, hoveredEventId, mapZoom, selectEvent, selectedEvent?.id, timelineWindow]);

  const filterChips = [
    minMag > 0 ? { label: `M ≥ ${minMag.toFixed(1)}`, clear: () => setMinMag(0) } : null,
    maxMag < 10 ? { label: `M ≤ ${maxMag.toFixed(1)}`, clear: () => setMaxMag(10) } : null,
    depthMin > 0 || depthMax < MAX_DEPTH ? { label: `${depthMin}–${depthMax === MAX_DEPTH ? '700+' : depthMax} km`, clear: () => { setDepthMin(0); setDepthMax(MAX_DEPTH); } } : null,
    alert !== 'all' ? { label: getAlertLabel(alert), clear: () => setAlert('all') } : null,
    tsunamiOnly ? { label: 'Tsunami flag', clear: () => setTsunamiOnly(false) } : null,
    reviewedOnly ? { label: 'Reviewed origins', clear: () => setReviewedOnly(false) } : null,
    placeQuery ? { label: `Place: ${placeQuery}`, clear: () => { setPlaceQuery(''); setGeocodeState({ status: 'idle', label: '' }); } } : null,
  ].filter(Boolean);

  const eventIsInWindow = (event) => !timelineWindow || (event.time >= timelineWindow.start && event.time < timelineWindow.end);
  const visibleStreamEvents = sortedEvents.slice(0, streamLimit);
  const dataAge = formatAge(lastUpdated, nowTick);
  const isLoading = loadState === 'loading';
  const isRefreshing = loadState === 'refreshing';
  const isStale = Boolean(lastUpdated && nowTick - lastUpdated > 15 * 60 * 1000);
  const selectedAssessment = selectedEvent ? getSignalAssessment(selectedEvent) : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand-lockup" href="#top" aria-label="Seismic Observatory home">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>
            <span className="brand-name">Seismic Observatory</span>
            <span className="brand-caption">A live field guide to a moving planet</span>
          </span>
        </a>
        <nav className="topnav" aria-label="Primary navigation">
          <a href="#activity">Activity</a>
          <a href="#stream">Event stream</a>
          <a href="#method">Method</a>
        </nav>
        <div className="top-actions">
          <span className={`connection-status ${isStale || loadState === 'error' ? 'status-stale' : ''}`}>
            <span className="status-dot" aria-hidden="true" />
            {loadState === 'error' ? 'Stale feed' : isRefreshing ? 'Updating' : 'Live feed'}
          </span>
          <button className="button button-dark button-small" type="button" onClick={() => loadFeed(timeframe)} disabled={isLoading || isRefreshing}>
            <span aria-hidden="true">↻</span> Refresh
          </button>
        </div>
      </header>

      <main id="top">
        <section className="intro-band" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">Global seismic field · {FEEDS[timeframe].label}</p>
            <h1 id="page-title">Read the planet in motion.</h1>
            <p className="intro-copy">A calm, live view of where earthquakes are happening, how deep they are, and which signals deserve a closer look.</p>
          </div>
          <div className="intro-note">
            <span className="eyebrow">Data position</span>
            <strong>{dataAge}</strong>
            <span>USGS real-time GeoJSON · times shown in your local zone and UTC</span>
          </div>
        </section>

        <section className="signal-summary" aria-label="Current earthquake summary">
          <div className="summary-count">
            <span className="summary-label">Observed in window</span>
            <strong>{isLoading && events.length === 0 ? '—' : formatNumber(filteredEvents.length)}</strong>
            <span className="summary-subline">{filteredEvents.length === 1 ? 'earthquake matches' : 'earthquakes match'} current view</span>
          </div>
          <div className="summary-divider" aria-hidden="true" />
          <div className="summary-story">
            <span className="summary-label">Strongest signal in view</span>
            {strongestEvent ? (
              <button className="strongest-link" type="button" onClick={() => selectEvent(strongestEvent)}>
                <span className="magnitude-stamp">M{formatMagnitude(strongestEvent.magnitude)}</span>
                <span><b>{strongestEvent.place}</b><small>{formatRelativeTime(strongestEvent.time, nowTick)} · {formatDepth(strongestEvent.depth)}</small></span>
                <span className="arrow-mark" aria-hidden="true">↗</span>
              </button>
            ) : <span className="summary-empty">No event matches the current constraints.</span>}
          </div>
          <div className="summary-legend">
            <span className="summary-label">Reading the map</span>
            <span><i className="legend-dot legend-small" /> radius = magnitude</span>
            <span><i className="legend-ring" /> ring = alert / tsunami flag</span>
          </div>
        </section>

        <section className="control-deck" aria-label="Explore and filter earthquake data">
          <div className="time-rail">
            <span className="control-label">Time window</span>
            <div className="segmented-control" role="group" aria-label="Choose a time window">
              {Object.entries(FEEDS).map(([key, range]) => (
                <button key={key} type="button" className={timeframe === key ? 'is-active' : ''} aria-pressed={timeframe === key} onClick={() => { setTimeframe(key); setTimelineWindow(null); setStreamLimit(160); }}>
                  <span>{range.label}</span><small>{range.shortLabel}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="control-actions">
            <button className="button button-light" type="button" onClick={copyShareLink}><span aria-hidden="true">⌁</span> Share view</button>
            <button className="button button-quiet" type="button" onClick={resetFilters} disabled={!filterChips.length && !timelineWindow}>Reset all</button>
            {shareState && <span className="action-feedback" role="status">{shareState}</span>}
          </div>

          <div className="filter-grid">
            <fieldset className="filter-group magnitude-filter">
              <legend>Magnitude</legend>
              <div className="range-pair">
                <label><span>At least</span><output>M{minMag.toFixed(1)}</output><input type="range" min="0" max="10" step="0.1" value={minMag} onChange={(event) => setMinMag(Math.min(Number(event.target.value), maxMag))} /></label>
                <label><span>At most</span><output>{maxMag >= 10 ? 'Any' : `M${maxMag.toFixed(1)}`}</output><input type="range" min="0" max="10" step="0.1" value={maxMag} onChange={(event) => setMaxMag(Math.max(Number(event.target.value), minMag))} /></label>
              </div>
            </fieldset>
            <fieldset className="filter-group depth-filter">
              <legend>Depth, kilometers</legend>
              <div className="number-pair">
                <label><span>From</span><input type="number" min="0" max={MAX_DEPTH} value={depthMin} onChange={(event) => setDepthMin(Math.min(MAX_DEPTH, Math.max(0, Number(event.target.value) || 0)))} /></label>
                <span className="number-dash" aria-hidden="true">—</span>
                <label><span>To</span><input type="number" min="0" max={MAX_DEPTH} value={depthMax === MAX_DEPTH ? '' : depthMax} placeholder="700+" onChange={(event) => { const nextDepth = event.target.value === '' ? MAX_DEPTH : Number(event.target.value); setDepthMax(Math.min(MAX_DEPTH, Math.max(depthMin, Number.isFinite(nextDepth) ? nextDepth : MAX_DEPTH))); }} /></label>
              </div>
            </fieldset>
            <label className="select-control"><span>Alert level</span><select value={alert} onChange={(event) => setAlert(event.target.value)}><option value="all">Any alert level</option><option value="green">Green</option><option value="yellow">Yellow</option><option value="orange">Orange</option><option value="red">Red</option><option value="unknown">Not reported</option></select></label>
            <label className="select-control"><span>Sort stream by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="time">Newest first</option><option value="magnitude">Largest first</option><option value="depth">Shallowest first</option></select></label>
            <form className="place-search" onSubmit={geocodePlace}>
              <label htmlFor="place-query">Place or region</label>
              <div className="search-row"><input id="place-query" type="search" value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder="Filter or find a place" /><button type="submit" className="search-button" aria-label="Find place on map">⌕</button></div>
              {geocodeState.status === 'loading' && <small className="field-status">Looking up place…</small>}
              {geocodeState.status === 'ready' && <small className="field-status field-status-good">Map centered on {geocodeState.label}</small>}
              {geocodeState.status === 'error' && <small className="field-status field-status-error">{geocodeState.label}</small>}
            </form>
            <div className="check-control">
              <span className="control-subhead">Signals</span>
              <label><input type="checkbox" checked={tsunamiOnly} onChange={(event) => setTsunamiOnly(event.target.checked)} /> <span>Tsunami flag</span></label>
              <label><input type="checkbox" checked={reviewedOnly} onChange={(event) => setReviewedOnly(event.target.checked)} /> <span>Reviewed origins</span></label>
            </div>
          </div>
          <div className="active-filters" aria-live="polite">
            <span className="active-label">{formatNumber(filteredEvents.length)} of {formatNumber(events.length)} events</span>
            {filterChips.length ? filterChips.map((chip) => <button key={chip.label} type="button" className="filter-chip" onClick={chip.clear}>{chip.label}<span aria-hidden="true">×</span></button>) : <span className="no-filters">All available events shown</span>}
            {timelineWindow && <button className="filter-chip filter-chip-time" type="button" onClick={() => setTimelineWindow(null)}>Timeline · {formatWindow(timelineWindow.start, timelineWindow.end)} ×</button>}
          </div>
        </section>

        <div className="workspace" id="activity">
          <div className="map-column">
            <section className="map-panel" aria-labelledby="map-heading">
              <div className="panel-heading map-heading">
                <div><p className="eyebrow">Geographic field</p><h2 id="map-heading">Where the ground is moving</h2></div>
                <div className="map-heading-actions"><span className="map-zoom">Zoom {mapZoom.toFixed(1)}</span><button type="button" className="icon-button" onClick={() => mapInstanceRef.current?.setView([18, 0], 2)} aria-label="Reset map to world view">◎</button></div>
              </div>
              <div className="map-frame">
                <div ref={mapContainerRef} className="map-container" tabIndex="0" aria-label="Interactive world map of earthquakes. Use the event stream below as a keyboard-accessible alternative." />
                <div className="map-key" aria-label="Map legend">
                  <span><i className="key-swatch key-low" /> smaller magnitude</span>
                  <span><i className="key-swatch key-high" /> larger magnitude</span>
                  <span><i className="key-outline" /> tsunami flag</span>
                </div>
                {(isLoading || isRefreshing) && <div className="map-loading" role="status" aria-live="polite"><span className="loader-line" />{isLoading ? 'Loading live USGS events…' : 'Refreshing without losing your place…'}</div>}
                {error && <div className="map-error" role="alert"><strong>Live update paused</strong><span>{error}</span><button type="button" className="button button-light button-small" onClick={() => loadFeed(timeframe)}>Try again</button></div>}
                {!isLoading && !error && !filteredEvents.length && <div className="map-empty"><span className="empty-glyph" aria-hidden="true">⌁</span><strong>No events match</strong><span>Loosen a filter or reset the view to return to the field.</span><button type="button" className="button button-dark button-small" onClick={resetFilters}>Reset filters</button></div>}
              </div>
              <div className="map-caption"><span>{timelineWindow ? `${formatNumber(timelineWindowEvents.length)} events illuminated in selected time slice` : 'Select a marker, cluster, or event row to follow one signal through every view.'}</span><span className="map-attribution">Basemap © CARTO · Events © USGS</span></div>
            </section>

            <section className="timeline-panel" aria-labelledby="timeline-heading">
              <div className="panel-heading timeline-heading">
                <div><p className="eyebrow">Signature interaction · connected time</p><h2 id="timeline-heading">When the field changed</h2></div>
                <div className="timeline-meta"><span>{timelineWindow ? `${formatNumber(timelineWindowEvents.length)} in slice · local time` : 'Click a band to illuminate its events · local time'}</span>{timelineWindow && <button type="button" className="text-button" onClick={() => setTimelineWindow(null)}>Clear slice</button>}</div>
              </div>
              <div className="timeline-chart-wrap">
                <svg className="timeline-chart" viewBox="0 0 1000 190" role="img" aria-labelledby="timeline-heading timeline-description">
                  <desc id="timeline-description">Activity volume by time bucket. Bar height shows the number of matching earthquakes; the warm cap marks the strongest magnitude in each bucket.</desc>
                  <line x1="42" x2="974" y1="148" y2="148" className="chart-baseline" />
                  <line x1="42" x2="974" y1="96" y2="96" className="chart-gridline" />
                  <line x1="42" x2="974" y1="44" y2="44" className="chart-gridline" />
                  <text x="12" y="151" className="chart-axis-label">0</text>
                  <text x="6" y="99" className="chart-axis-label">{Math.ceil(maxTimelineCount / 2)}</text>
                  <text x="4" y="47" className="chart-axis-label">{maxTimelineCount}</text>
                  {timelineBuckets.map((bucket) => {
                    const x = 46 + bucket.index * (928 / timelineBuckets.length);
                    const barWidth = Math.max(5, 928 / timelineBuckets.length - 4);
                    const height = (bucket.count / maxTimelineCount) * 104;
                    const y = 148 - height;
                    const isSelected = timelineWindow && bucket.start === timelineWindow.start;
                    const isFocused = bucket.index === selectedBucketIndex;
                    return <g key={bucket.start} className="timeline-bar-group">
                      <rect x={x} y="22" width={barWidth} height="126" className={`timeline-hit-area ${isSelected ? 'timeline-hit-selected' : ''}`} tabIndex="0" role="button" aria-label={`${formatBucketLabel(bucket.start, timeframe)}: ${bucket.count} earthquakes, strongest magnitude ${formatMagnitude(bucket.maxMagnitude)}`} onClick={() => setTimelineWindow({ start: bucket.start, end: bucket.end })} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setTimelineWindow({ start: bucket.start, end: bucket.end }); } }} onMouseEnter={() => setActiveTooltip({ index: bucket.index, x: x + barWidth / 2 })} onMouseLeave={() => setActiveTooltip(null)} onFocus={() => setActiveTooltip({ index: bucket.index, x: x + barWidth / 2 })} onBlur={() => setActiveTooltip(null)} />
                      <rect x={x} y={y} width={barWidth} height={Math.max(height, bucket.count ? 3 : 0)} rx="3" className={`timeline-bar ${isSelected ? 'timeline-bar-selected' : ''} ${bucket.count ? '' : 'timeline-bar-empty'}`} />
                      {bucket.count > 0 && <rect x={x} y={Math.max(y, 22)} width={barWidth} height="4" rx="2" className="timeline-cap" />}
                      {isFocused && <line x1={x + barWidth / 2} x2={x + barWidth / 2} y1="16" y2="155" className="timeline-focus-line" />}
                      {(bucket.index === 0 || bucket.index === timelineBuckets.length - 1 || bucket.index === Math.floor(timelineBuckets.length / 2)) && <text x={x + barWidth / 2} y="176" textAnchor="middle" className="chart-x-label">{formatBucketLabel(bucket.start, timeframe)}</text>}
                    </g>;
                  })}
                </svg>
                {activeTooltip && timelineBuckets[activeTooltip.index] && <div className="timeline-tooltip" style={{ left: `${(activeTooltip.x / 1000) * 100}%` }} role="status"><b>{formatBucketLabel(timelineBuckets[activeTooltip.index].start, timeframe)}</b><span>{formatNumber(timelineBuckets[activeTooltip.index].count)} earthquakes · strongest M{formatMagnitude(timelineBuckets[activeTooltip.index].maxMagnitude)}</span></div>}
              </div>
              <div className="timeline-reading"><span className="timeline-reading-key"><i className="timeline-key-volume" /> activity volume</span><span className="timeline-reading-key"><i className="timeline-key-peak" /> highest magnitude in bucket</span><span className="timeline-reading-note">The focused line follows the selected event.</span></div>
            </section>

            <section className="depth-panel" aria-labelledby="depth-heading">
              <div className="panel-heading"><div><p className="eyebrow">Depth distribution</p><h2 id="depth-heading">How far below the surface</h2></div><span className="panel-note">Click a band to filter</span></div>
              <div className="depth-distribution" role="group" aria-label="Earthquake counts by depth band">
                {depthBuckets.map((band) => <button key={band.label} type="button" className={`depth-band ${depthMin === band.min && (band.max === MAX_DEPTH ? depthMax === MAX_DEPTH : depthMax === band.max) ? 'is-active' : ''}`} onClick={() => { setDepthMin(band.min); setDepthMax(band.max); }} aria-label={`${band.label}, ${band.sublabel}, ${band.count} events`}><span className="depth-band-copy"><b>{band.label}</b><small>{band.sublabel}</small></span><span className="depth-track"><i style={{ width: `${Math.max(2, (band.count / maxDepthCount) * 100)}%` }} /></span><strong>{formatNumber(band.count)}</strong></button>)}
              </div>
            </section>

            <section className="stream-panel" id="stream" aria-labelledby="stream-heading">
              <div className="panel-heading stream-heading"><div><p className="eyebrow">Accessible event stream</p><h2 id="stream-heading">Every signal, in order</h2></div><div className="stream-total"><strong>{formatNumber(sortedEvents.length)}</strong><span>matching events</span></div></div>
              {timelineWindow && <div className="stream-context" role="status">Time slice active · matching rows are marked with a warm edge; other rows remain in context.</div>}
              {isLoading && !events.length ? <div className="stream-skeleton" role="status" aria-label="Loading event stream">{Array.from({ length: 5 }, (_, index) => <div className="skeleton-row" key={index}><i /><span><b /><small /></span><em /></div>)}</div> : !visibleStreamEvents.length ? <div className="stream-empty"><strong>No event rows to show.</strong><span>Reset filters to restore the live stream.</span><button type="button" className="button button-light button-small" onClick={resetFilters}>Reset filters</button></div> : <div className="event-list" role="group" aria-label="Earthquake event stream">{visibleStreamEvents.map((event) => {
                const selected = selectedEvent?.id === event.id;
                const inWindow = eventIsInWindow(event);
                return <button key={event.id} type="button" className={`event-row ${selected ? 'is-selected' : ''} ${inWindow ? 'is-in-window' : 'is-out-window'}`} aria-current={selected ? 'true' : undefined} onClick={() => selectEvent(event)} onMouseEnter={() => setHoveredEventId(event.id)} onMouseLeave={() => setHoveredEventId('')} onFocus={() => setHoveredEventId(event.id)} onBlur={() => setHoveredEventId('')}>
                  <span className="event-magnitude">M{formatMagnitude(event.magnitude)}</span>
                  <span className="event-row-main"><strong>{event.place}</strong><span>{formatRelativeTime(event.time, nowTick)} · {formatDepth(event.depth)}</span></span>
                  <span className="event-row-tags">{event.tsunami && <em className="tag tag-tsunami">Tsunami flag</em>}{event.alert && <em className={`tag ${getAlertClass(event.alert)}`}>{event.alert} alert</em>}{event.status === 'reviewed' && <em className="tag tag-reviewed">Reviewed</em>}</span>
                  <span className="event-row-arrow" aria-hidden="true">{selected ? '●' : '→'}</span>
                </button>;
              })}</div>}
              {visibleStreamEvents.length < sortedEvents.length && <button type="button" className="load-more" onClick={() => setStreamLimit((limit) => limit + 160)}>Load 160 more <span>({formatNumber(sortedEvents.length - visibleStreamEvents.length)} remaining)</span></button>}
              <p className="stream-footnote">Map-only insights are repeated here so the complete exploration path works by keyboard and touch.</p>
            </section>
          </div>

          <aside className="inspector" ref={detailRef} aria-labelledby="inspector-heading">
            <div className="inspector-topline"><span className="eyebrow">Focused event dossier</span><span className="dossier-index">{selectedEvent ? '01' : '—'}</span></div>
            {selectedEvent ? <>
              <div className="inspector-title-row"><div><span className="magnitude-hero">M{formatMagnitude(selectedEvent.magnitude)}</span><h2 id="inspector-heading">{selectedEvent.place}</h2></div><span className={`status-seal ${getAlertClass(selectedEvent.alert)}`}><i aria-hidden="true" />{selectedEvent.alert ? selectedEvent.alert : 'No alert'}</span></div>
              <p className="detail-lede">{selectedEvent.title}</p>
              <div className="assessment-strip"><span className="assessment-pip" aria-hidden="true" /><span><strong>{selectedAssessment.label}</strong><small>{selectedAssessment.detail}</small></span></div>
              <div className="detail-actions"><button type="button" className="button button-dark" onClick={() => focusEventOnMap(selectedEvent)}>Focus on map <span aria-hidden="true">↗</span></button>{selectedEvent.url && <a className="button button-light" href={selectedEvent.url} target="_blank" rel="noreferrer">Official USGS page <span aria-hidden="true">↗</span></a>}</div>
              <dl className="detail-grid">
                <div><dt>Local time</dt><dd>{formatLocalTime(selectedEvent.time)}</dd><small>Your device time zone</small></div>
                <div><dt>UTC time</dt><dd>{formatUtcTime(selectedEvent.time)}</dd><small>USGS reference clock</small></div>
                <div><dt>Depth</dt><dd>{formatDepth(selectedEvent.depth)}</dd><small>Below surface</small></div>
                <div><dt>Felt reports</dt><dd>{selectedEvent.felt === null ? 'Not reported' : formatNumber(selectedEvent.felt)}</dd><small>Public reports</small></div>
                <div><dt>Significance</dt><dd>{selectedEvent.significance === null ? 'Not reported' : formatNumber(selectedEvent.significance)}</dd><small>USGS index, not a damage score</small></div>
                <div><dt>Review status</dt><dd>{selectedEvent.status ? `${selectedEvent.status[0].toUpperCase()}${selectedEvent.status.slice(1)}` : 'Not reported'}</dd><small>Origin quality state</small></div>
                <div><dt>Tsunami flag</dt><dd>{selectedEvent.tsunami ? 'Yes' : 'No'}</dd><small>Check official page for updates</small></div>
                <div><dt>Coordinates</dt><dd>{selectedEvent.latitude.toFixed(3)}°, {selectedEvent.longitude.toFixed(3)}°</dd><small>{selectedEvent.network ? `Network ${selectedEvent.network}` : 'USGS network'}</small></div>
              </dl>
              <div className="detail-note"><span className="note-symbol" aria-hidden="true">i</span><p><strong>Read magnitude with context.</strong> Magnitude describes the energy released at the source. It does not predict damage, which depends on depth, distance, ground conditions, and many other factors.</p></div>
              <div className="detail-timestamp"><span>Event updated {selectedEvent.updated ? formatUtcTime(selectedEvent.updated) : 'time not reported'}</span><span>Data source: USGS</span></div>
            </> : <div className="inspector-empty"><span className="empty-glyph" aria-hidden="true">⌁</span><h2 id="inspector-heading">Waiting for the field</h2><p>The event dossier will appear when live USGS data arrives.</p></div>}
          </aside>
        </div>
      </main>

      <footer className="footer" id="method">
        <div><span className="brand-name">Seismic Observatory</span><p>Exploration, not emergency alerting. Earthquake data can be revised as seismic networks review new information.</p></div>
        <div className="footer-method"><span className="eyebrow">Method note</span><p>Events are loaded directly from the free USGS real-time GeoJSON feeds. Basemap © CARTO / OpenStreetMap. For authoritative updates, follow the official USGS event page and local authorities.</p></div>
        <span className="footer-mark" aria-hidden="true">⌁</span>
      </footer>
      <div className="sr-only" role="status" aria-live="polite">{isLoading ? 'Loading earthquake data.' : isRefreshing ? 'Refreshing earthquake data.' : `${formatNumber(filteredEvents.length)} earthquake results shown.`}</div>
    </div>
  );
}

export default App;

createRoot(document.getElementById('root')).render(<App />);
