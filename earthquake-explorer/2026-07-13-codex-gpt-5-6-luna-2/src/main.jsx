import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './styles.css'

const FEEDS = {
  hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson',
}

const PERIODS = [
  { id: 'hour', label: 'Past hour', compact: '1H', duration: 60 * 60 * 1000 },
  { id: 'day', label: 'Past day', compact: '24H', duration: 24 * 60 * 60 * 1000 },
  { id: 'week', label: 'Past 7 days', compact: '7D', duration: 7 * 24 * 60 * 60 * 1000 },
  { id: 'month', label: 'Past 30 days', compact: '30D', duration: 30 * 24 * 60 * 60 * 1000 },
]

const DEFAULT_FILTERS = {
  minMagnitude: 0,
  depth: 'any',
  alert: 'any',
  tsunami: 'any',
  review: 'any',
  query: '',
}

const ICONS = {
  activity: [
    ['path', { d: 'M2 12h4l2-7 4 14 2-7h4' }],
  ],
  alert: [
    ['path', { d: 'M12 3 2.8 20h18.4L12 3Z' }],
    ['path', { d: 'M12 9v4.5M12 17.2h.01' }],
  ],
  arrow: [['path', { d: 'M5 12h13M13 6l6 6-6 6' }]],
  check: [['path', { d: 'm4 12 5 5L20 6' }]],
  chevron: [['path', { d: 'm8 10 4 4 4-4' }]],
  clock: [
    ['circle', { cx: '12', cy: '12', r: '8.5' }],
    ['path', { d: 'M12 7v5l3.2 2' }],
  ],
  close: [['path', { d: 'm6 6 12 12M18 6 6 18' }]],
  copy: [
    ['rect', { x: '8', y: '8', width: '11', height: '11', rx: '1.5' }],
    ['path', { d: 'M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5' }],
  ],
  external: [
    ['path', { d: 'M14 4h6v6M20 4l-9 9' }],
    ['path', { d: 'M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5' }],
  ],
  filter: [
    ['path', { d: 'M3 5h18M6 12h12M9 19h6' }],
  ],
  focus: [
    ['path', { d: 'M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4' }],
    ['circle', { cx: '12', cy: '12', r: '3' }],
  ],
  globe: [
    ['circle', { cx: '12', cy: '12', r: '8.5' }],
    ['path', { d: 'M3.7 9h16.6M3.7 15h16.6M12 3.5c2.2 2.3 3.2 5.2 3.2 8.5s-1 6.2-3.2 8.5c-2.2-2.3-3.2-5.2-3.2-8.5S9.8 5.8 12 3.5Z' }],
  ],
  info: [
    ['circle', { cx: '12', cy: '12', r: '8.5' }],
    ['path', { d: 'M12 11v5M12 8h.01' }],
  ],
  layers: [
    ['path', { d: 'm12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5' }],
  ],
  minus: [['path', { d: 'M5 12h14' }]],
  pin: [
    ['path', { d: 'M12 21s6-5.4 6-11A6 6 0 0 0 6 10c0 5.6 6 11 6 11Z' }],
    ['circle', { cx: '12', cy: '10', r: '2' }],
  ],
  plus: [['path', { d: 'M12 5v14M5 12h14' }]],
  refresh: [
    ['path', { d: 'M20 11a8 8 0 0 0-14.7-3.8L3 10' }],
    ['path', { d: 'M3 5v5h5M4 13a8 8 0 0 0 14.7 3.8L21 14' }],
    ['path', { d: 'M21 19v-5h-5' }],
  ],
  search: [
    ['circle', { cx: '10.8', cy: '10.8', r: '6.2' }],
    ['path', { d: 'm16 16 4.5 4.5' }],
  ],
  share: [
    ['circle', { cx: '18', cy: '5', r: '2' }],
    ['circle', { cx: '6', cy: '12', r: '2' }],
    ['circle', { cx: '18', cy: '19', r: '2' }],
    ['path', { d: 'm8 11 8-5M8 13l8 5' }],
  ],
  sliders: [
    ['path', { d: 'M4 6h7M15 6h5M4 12h3M11 12h9M4 18h9M17 18h3' }],
    ['circle', { cx: '13', cy: '6', r: '2' }],
    ['circle', { cx: '9', cy: '12', r: '2' }],
    ['circle', { cx: '15', cy: '18', r: '2' }],
  ],
  wave: [
    ['path', { d: 'M2 12h3l2-5 3 10 3-12 3 9 2-2h4' }],
  ],
}

function Glyph({ name, size = 16, strokeWidth = 1.7 }) {
  const parts = ICONS[name] ?? ICONS.info
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {parts.map(([type, props], index) => {
        const Element = type
        return <Element key={`${name}-${index}`} {...props} />
      })}
    </svg>
  )
}

function getInitialUrlState() {
  if (typeof window === 'undefined') {
    return { period: 'day', filters: DEFAULT_FILTERS, sort: 'significance', selectedId: null, timelineBin: null }
  }
  const params = new URLSearchParams(window.location.search)
  const period = PERIODS.some((item) => item.id === params.get('period')) ? params.get('period') : 'day'
  const magnitude = Number(params.get('mag'))
  const depth = ['any', 'shallow', 'intermediate', 'deep'].includes(params.get('depth')) ? params.get('depth') : 'any'
  const alert = ['any', 'green', 'yellow', 'orange', 'red'].includes(params.get('alert')) ? params.get('alert') : 'any'
  const tsunami = ['any', 'yes', 'no'].includes(params.get('tsunami')) ? params.get('tsunami') : 'any'
  const review = ['any', 'reviewed', 'automatic'].includes(params.get('review')) ? params.get('review') : 'any'
  const sort = ['significance', 'magnitude', 'newest', 'depth'].includes(params.get('sort')) ? params.get('sort') : 'significance'
  const parsedBin = params.get('bin')
  const timelineBin = parsedBin !== null && Number.isInteger(Number(parsedBin)) ? Math.min(17, Math.max(0, Number(parsedBin))) : null
  return {
    period,
    filters: {
      ...DEFAULT_FILTERS,
      minMagnitude: Number.isFinite(magnitude) ? Math.min(9.9, Math.max(0, magnitude)) : 0,
      depth,
      alert,
      tsunami,
      review,
      query: params.get('q') ?? '',
    },
    sort,
    selectedId: params.get('event') || null,
    timelineBin,
  }
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeEvent(feature) {
  const properties = feature?.properties ?? {}
  const coordinates = feature?.geometry?.coordinates ?? []
  const longitude = numberOrNull(coordinates[0])
  const latitude = numberOrNull(coordinates[1])
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const magnitude = numberOrNull(properties.mag)
  const eventTime = numberOrNull(properties.time)
  const tsunamiValue = numberOrNull(properties.tsunami)
  return {
    id: feature.id || properties.ids || `${latitude}-${longitude}-${eventTime}`,
    magnitude,
    place: properties.place || 'Location not reported',
    time: eventTime,
    updated: numberOrNull(properties.updated),
    latitude,
    longitude,
    depth: numberOrNull(coordinates[2]),
    felt: numberOrNull(properties.felt),
    significance: numberOrNull(properties.sig),
    alert: properties.alert || null,
    tsunami: tsunamiValue === null ? null : tsunamiValue === 1,
    status: properties.status || null,
    eventType: properties.type || null,
    title: properties.title || properties.place || 'Earthquake',
    officialUrl: properties.url || null,
    detailUrl: properties.detail || null,
  }
}

function formatMagnitude(magnitude) {
  return magnitude === null || magnitude === undefined ? '—' : magnitude.toFixed(1)
}

function formatDepth(depth) {
  return depth === null || depth === undefined ? 'Not reported' : `${depth.toFixed(1)} km`
}

function formatCoordinates(event) {
  if (!event) return '—'
  return `${Math.abs(event.latitude).toFixed(3)}° ${event.latitude >= 0 ? 'N' : 'S'} · ${Math.abs(event.longitude).toFixed(3)}° ${event.longitude >= 0 ? 'E' : 'W'}`
}

function formatDateTime(timestamp, options = {}) {
  if (!timestamp) return 'Time not reported'
  const formatterOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }
  if (options.timeZone) formatterOptions.timeZone = options.timeZone
  if (options.timeZoneName !== '') formatterOptions.timeZoneName = options.timeZoneName || 'short'
  return new Intl.DateTimeFormat(undefined, formatterOptions).format(new Date(timestamp))
}

function formatUtc(timestamp) {
  if (!timestamp) return 'Time not reported'
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(timestamp))
}

function formatAge(timestamp, now = Date.now()) {
  if (!timestamp) return 'time unknown'
  const delta = Math.max(0, now - timestamp)
  const minutes = Math.floor(delta / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function formatRelativeTimestamp(timestamp, now = Date.now()) {
  if (!timestamp) return 'Unknown'
  const delta = Math.max(0, now - timestamp)
  const minutes = Math.floor(delta / 60000)
  if (minutes < 1) return 'moments ago'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function alertLabel(alert) {
  if (!alert) return 'Not reported'
  return `${alert[0].toUpperCase()}${alert.slice(1)}`
}

function reviewLabel(status) {
  if (!status) return 'Not reported'
  return status === 'reviewed' ? 'Reviewed' : status === 'automatic' ? 'Automatic' : status
}

function signalReading(event) {
  const significance = event.significance ?? 0
  if (event.alert === 'red' || event.tsunami || significance >= 700) {
    return { label: 'Potentially concerning', tone: 'red', note: 'USGS signal fields suggest a closer look.' }
  }
  if (event.alert === 'orange' || event.alert === 'yellow' || significance >= 400 || (event.magnitude ?? 0) >= 5) {
    return { label: 'Notable', tone: 'orange', note: 'Several signal fields make this event worth inspecting.' }
  }
  return { label: 'Ordinary', tone: 'green', note: 'No elevated USGS signal field is reported for this event.' }
}

function depthMatches(event, depth) {
  if (depth === 'any') return true
  if (event.depth === null) return false
  if (depth === 'shallow') return event.depth < 70
  if (depth === 'intermediate') return event.depth >= 70 && event.depth < 300
  return event.depth >= 300
}

function sortEvents(events, sort) {
  return [...events].sort((a, b) => {
    if (sort === 'magnitude') return (b.magnitude ?? -1) - (a.magnitude ?? -1) || (b.time ?? 0) - (a.time ?? 0)
    if (sort === 'newest') return (b.time ?? 0) - (a.time ?? 0)
    if (sort === 'depth') return (a.depth ?? Number.POSITIVE_INFINITY) - (b.depth ?? Number.POSITIVE_INFINITY)
    return (b.significance ?? -1) - (a.significance ?? -1) || (b.magnitude ?? -1) - (a.magnitude ?? -1) || (b.time ?? 0) - (a.time ?? 0)
  })
}

function magnitudeRadius(magnitude) {
  if (magnitude === null || magnitude === undefined) return 4
  return Math.max(4, Math.min(15, 4 + magnitude * 1.65))
}

function markerColor(event) {
  if (event.alert === 'red') return 'oklch(0.70 0.17 28)'
  if (event.alert === 'orange') return 'oklch(0.76 0.15 52)'
  if (event.tsunami) return 'oklch(0.77 0.11 215)'
  if (event.alert === 'yellow') return 'oklch(0.78 0.14 85)'
  return 'oklch(0.72 0.13 108)'
}

function groupEventsForMap(events, zoom) {
  const cellSize = zoom <= 2 ? 12 : zoom <= 3 ? 8 : zoom <= 4 ? 4 : zoom <= 5 ? 2 : zoom <= 7 ? 0.7 : 0.22
  const groups = new Map()
  events.forEach((event) => {
    const key = `${Math.round(event.latitude / cellSize)}:${Math.round(event.longitude / cellSize)}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(event)
  })
  return [...groups.values()]
}

function MapSurface({ events, selectedId, previewId, focusEventIds, onSelectEvent, onPreviewEvent }) {
  const mapElementRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const [zoom, setZoom] = useState(2)

  useEffect(() => {
    const map = L.map(mapElementRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 11,
      worldCopyJump: true,
      zoomControl: false,
      attributionControl: true,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
      crossOrigin: true,
    }).addTo(map)
    const updateZoom = () => setZoom(map.getZoom())
    map.on('zoomend', updateZoom)
    mapRef.current = map
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => map.invalidateSize()) : null
    observer?.observe(mapElementRef.current)
    return () => {
      observer?.disconnect()
      map.off('zoomend', updateZoom)
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return undefined
    if (layerRef.current) layerRef.current.remove()
    const layer = L.layerGroup().addTo(map)
    layerRef.current = layer
    const limitedEvents = events.slice().sort((a, b) => (b.magnitude ?? -1) - (a.magnitude ?? -1)).slice(0, 900)
    if (selectedId && !limitedEvents.some((event) => event.id === selectedId)) {
      const selected = events.find((event) => event.id === selectedId)
      if (selected) limitedEvents.push(selected)
    }
    const groups = groupEventsForMap(limitedEvents, zoom).flatMap((group) => {
      const selected = group.find((event) => event.id === selectedId)
      if (!selected || group.length === 1) return [group]
      return [[selected], group.filter((event) => event.id !== selectedId)]
    }).filter((group) => group.length)
    groups.forEach((group) => {
      if (group.length > 1) {
        const latitude = group.reduce((sum, event) => sum + event.latitude, 0) / group.length
        const longitude = group.reduce((sum, event) => sum + event.longitude, 0) / group.length
        const bounds = L.latLngBounds(group.map((event) => [event.latitude, event.longitude]))
        const marker = L.marker([latitude, longitude], {
          title: `${group.length} earthquakes in this region. Zoom in to separate them.`,
          keyboard: true,
          icon: L.divIcon({
            className: 'seismic-cluster-wrap',
            html: `<span class="seismic-cluster"><b>${group.length > 999 ? '999+' : group.length}</b><small>events</small></span>`,
            iconSize: [54, 54],
            iconAnchor: [27, 27],
          }),
        })
        const zoomIntoCluster = () => {
          if (bounds.isValid() && bounds.getNorthEast().distanceTo(bounds.getSouthWest()) > 1000) {
            map.fitBounds(bounds.pad(0.35), { maxZoom: Math.min(zoom + 3, 9), animate: true })
          } else {
            map.setView([latitude, longitude], Math.min(zoom + 3, 10), { animate: true })
          }
        }
        marker.on('click keypress', (event) => {
          if (event.type === 'click' || event.originalEvent?.key === 'Enter' || event.originalEvent?.key === ' ') zoomIntoCluster()
        })
        marker.bindTooltip(`${group.length} earthquakes in this region. Zoom in to inspect.`)
        marker.addTo(layer)
        return
      }
      const event = group[0]
      const isSelected = event.id === selectedId
      const isPreview = event.id === previewId
      const isInTimeline = !focusEventIds || focusEventIds.has(event.id) || isSelected
      const marker = L.circleMarker([event.latitude, event.longitude], {
        radius: magnitudeRadius(event.magnitude) + (isSelected ? 3 : isPreview ? 1.5 : 0),
        color: isSelected ? 'oklch(0.95 0.015 105)' : markerColor(event),
        weight: isSelected ? 2.5 : 1.5,
        fillColor: markerColor(event),
        fillOpacity: isInTimeline ? (isSelected || isPreview ? 0.95 : 0.68) : 0.12,
        opacity: isInTimeline ? 1 : 0.28,
      })
      marker.bindTooltip(`${formatMagnitude(event.magnitude)} · ${event.place}`)
      marker.on('click', () => onSelectEvent(event.id))
      marker.on('mouseover', () => onPreviewEvent(event.id))
      marker.on('mouseout', () => onPreviewEvent(null))
      marker.on('focus', () => onPreviewEvent(event.id))
      marker.on('blur', () => onPreviewEvent(null))
      marker.addTo(layer)
    })
    return () => layer.remove()
  }, [events, focusEventIds, onPreviewEvent, onSelectEvent, previewId, selectedId, zoom])

  useEffect(() => {
    const map = mapRef.current
    const selected = events.find((event) => event.id === selectedId)
    if (!map || !selected) return
    const currentZoom = map.getZoom()
    const targetZoom = Math.max(currentZoom, 4)
    map.flyTo([selected.latitude, selected.longitude], targetZoom, { duration: 0.45, easeLinearity: 0.25 })
  }, [events, selectedId])

  const changeZoom = (delta) => {
    const map = mapRef.current
    if (map) map.setZoom(map.getZoom() + delta, { animate: true })
  }

  const resetMap = () => {
    const map = mapRef.current
    if (map) map.setView([20, 0], 2, { animate: true })
  }

  return (
    <div className="map-shell">
      <div ref={mapElementRef} className="map-canvas" role="application" tabIndex="0" aria-label="Interactive world map of recent earthquakes" />
      <div className="map-toolbar" role="group" aria-label="Map controls">
        <button type="button" className="map-control" onClick={() => changeZoom(1)} aria-label="Zoom in"><Glyph name="plus" /></button>
        <button type="button" className="map-control" onClick={() => changeZoom(-1)} aria-label="Zoom out"><Glyph name="minus" /></button>
        <button type="button" className="map-control" onClick={resetMap} aria-label="Reset world view"><Glyph name="globe" /></button>
      </div>
      <div className="map-label" aria-hidden="true">
        <span className="map-label-dot" />
        <span>Live seismic field</span>
      </div>
      <div className="map-legend" aria-label="Map legend">
        <span><i className="legend-dot legend-olive" />Measured activity</span>
        <span><i className="legend-dot legend-blue" />Tsunami flag</span>
        <span><i className="legend-ring" />Selected event</span>
      </div>
      <p className="map-alt-note">Map insight is mirrored in the keyboard-friendly event stream.</p>
    </div>
  )
}

function LoadingShell() {
  return (
    <div className="app-frame">
      <Header status="loading" />
      <main className="loading-main" aria-busy="true" aria-live="polite">
        <div className="skeleton-line skeleton-kicker" />
        <div className="skeleton-line skeleton-heading" />
        <div className="skeleton-line skeleton-copy" />
        <div className="loading-instrument">
          <div className="skeleton-panel skeleton-rail" />
          <div className="skeleton-panel skeleton-map"><div className="skeleton-map-grid" /></div>
          <div className="skeleton-panel skeleton-events"><div className="skeleton-list-lines" /></div>
        </div>
        <p className="loading-caption"><Glyph name="activity" /> Connecting to the USGS live earthquake feed…</p>
      </main>
    </div>
  )
}

function ErrorState({ offline, error, onRetry }) {
  return (
    <div className="app-frame">
      <Header status="error" />
      <main className="error-main">
        <div className="error-mark"><Glyph name={offline ? 'globe' : 'alert'} size={25} /></div>
        <p className="section-kicker">Live feed unavailable</p>
        <h2>{offline ? 'You are offline.' : 'The seismic feed did not respond.'}</h2>
        <p className="error-copy">{offline ? 'Reconnect to load the latest USGS events. No substitute records are shown here.' : 'The existing view was preserved without substitute records. Try the live feed again when the network is available.'}</p>
        {error ? <p className="error-detail" role="status">{error}</p> : null}
        <button type="button" className="button button-primary" onClick={onRetry} disabled={offline}><Glyph name="refresh" />{offline ? 'Reconnect to retry' : 'Retry live feed'}</button>
        <p className="source-note">Source: United States Geological Survey (USGS). Events may be revised after publication.</p>
      </main>
    </div>
  )
}

function Header({ status, lastUpdated, now, onRefresh, onShare, shareStatus }) {
  const isLoading = status === 'loading'
  const isRefreshing = status === 'refreshing'
  const statusLabel = isLoading ? 'Connecting' : isRefreshing ? 'Refreshing' : status === 'error' ? 'Feed issue' : 'Live feed'
  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true"><Glyph name="wave" size={22} strokeWidth={1.45} /></div>
        <div>
          <div className="brand-name">Seismic Observatory</div>
          <div className="brand-subtitle">Global field notes · USGS</div>
        </div>
      </div>
      <div className="topbar-actions">
        <div className={`feed-state feed-state-${status}`} role="status" aria-live="polite">
          <span className="feed-state-dot" />
          <span>{statusLabel}</span>
          {lastUpdated ? <span className="feed-age">· {formatRelativeTimestamp(lastUpdated, now)}</span> : null}
        </div>
        <button type="button" className="button button-quiet" onClick={onRefresh} disabled={isLoading} aria-label={isRefreshing ? 'Refreshing USGS feed' : 'Refresh USGS feed'}><Glyph name="refresh" /> <span className="button-text">Refresh</span></button>
        <button type="button" className="button button-share" onClick={onShare} disabled={isLoading}><Glyph name="share" /><span className="button-text">Share view</span></button>
        {shareStatus ? <span className="share-feedback" role="status">{shareStatus}</span> : null}
      </div>
    </header>
  )
}

function Overview({ events, strongestEvent, priorityEvent, filteredCount, period, now, onSelectEvent }) {
  const periodLabel = PERIODS.find((item) => item.id === period)?.label.toLowerCase() || 'selected period'
  return (
    <section className="overview-block" aria-labelledby="overview-title">
      <div className="overview-copy">
        <p className="section-kicker"><span className="kicker-rule" /> Global activity / {periodLabel}</p>
        <h1 id="overview-title">Earth, in motion.</h1>
        <p className="overview-lede">Read the planet at a glance, then follow one signal through geography, time, and evidence.</p>
        <div className="readout-line" aria-label="Current feed summary">
          <span><b>{filteredCount.toLocaleString()}</b> in view</span>
          <span className="readout-separator">·</span>
          <span>feed window <b>{periodLabel}</b></span>
          {events.length !== filteredCount ? <><span className="readout-separator">·</span><span>{events.length.toLocaleString()} total loaded</span></> : null}
        </div>
      </div>
      <div className="priority-readout">
        <div className="priority-topline"><span className="priority-pulse" /> <span>Signal to start with</span></div>
        {priorityEvent ? (
          <button type="button" className="priority-event" onClick={() => onSelectEvent(priorityEvent.id)} aria-label={`Inspect magnitude ${formatMagnitude(priorityEvent.magnitude)} earthquake at ${priorityEvent.place}`}>
            <span className="priority-magnitude">M <strong>{formatMagnitude(priorityEvent.magnitude)}</strong></span>
            <span className="priority-place">{priorityEvent.place}</span>
            <span className="priority-meta">{priorityEvent.time ? formatAge(priorityEvent.time, now) : 'Time not reported'} <Glyph name="arrow" size={14} /></span>
          </button>
        ) : (
          <div className="priority-empty">No event matches the current filters.</div>
        )}
        {strongestEvent && priorityEvent && strongestEvent.id !== priorityEvent.id ? <p className="priority-footnote">Largest magnitude in view: <button type="button" onClick={() => onSelectEvent(strongestEvent.id)}>M {formatMagnitude(strongestEvent.magnitude)} at {strongestEvent.place}</button></p> : null}
      </div>
    </section>
  )
}

function PeriodNav({ period, onChange }) {
  return (
    <nav className="period-nav" aria-label="Observation period">
      <span className="period-label">Observe</span>
      <div className="period-options">
        {PERIODS.map((item) => (
          <button key={item.id} type="button" className={`period-button ${period === item.id ? 'is-active' : ''}`} aria-pressed={period === item.id} onClick={() => onChange(item.id)}>
            <span className="period-long">{item.label}</span><span className="period-short">{item.compact}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

function FilterRail({ filters, sort, activeFilterCount, resultCount, open, onToggle, onFilterChange, onSortChange, onReset }) {
  const update = (key) => (event) => onFilterChange(key, event.target.value)
  return (
    <aside id="filter-rail" className={`control-rail ${open ? 'is-open' : ''}`} aria-label="Filter and sort controls">
      <div className="rail-heading">
        <div><p className="rail-kicker">Instrument panel</p><h2>Refine the field</h2></div>
        <button type="button" className="mobile-close" onClick={onToggle} aria-label="Close filters"><Glyph name="close" /></button>
      </div>
      <div className="filter-result-line"><span><b>{resultCount.toLocaleString()}</b> results</span><span className="filter-count">{activeFilterCount ? `${activeFilterCount} active` : 'No constraints'}</span></div>
      <div className="filter-stack">
        <div className="filter-field magnitude-filter">
          <div className="field-label-row"><label htmlFor="magnitude">Minimum magnitude</label><output htmlFor="magnitude">M {Number(filters.minMagnitude).toFixed(1)}+</output></div>
          <input id="magnitude" type="range" min="0" max="7" step="0.1" value={filters.minMagnitude} onChange={update('minMagnitude')} />
          <div className="range-caption"><span>All events</span><span>Major signals</span></div>
          <p className="field-help">Magnitude measures released energy. It does not predict damage on its own.</p>
        </div>
        <div className="filter-field">
          <label htmlFor="place-search">Place or region</label>
          <div className="search-input"><Glyph name="search" size={15} /><input id="place-search" type="search" value={filters.query} onChange={update('query')} placeholder="Search loaded locations" /></div>
          <p className="field-help">Matches the human-readable places returned by USGS.</p>
        </div>
        <div className="filter-field">
          <label htmlFor="depth">Depth band</label>
          <select id="depth" value={filters.depth} onChange={update('depth')}>
            <option value="any">Any depth</option>
            <option value="shallow">Shallow · under 70 km</option>
            <option value="intermediate">Intermediate · 70–300 km</option>
            <option value="deep">Deep · 300 km and below</option>
          </select>
          <p className="field-help">Depth is measured from the earth’s surface.</p>
        </div>
        <div className="filter-grid">
          <div className="filter-field"><label htmlFor="alert">Alert level</label><select id="alert" value={filters.alert} onChange={update('alert')}><option value="any">Any alert</option><option value="green">Green</option><option value="yellow">Yellow</option><option value="orange">Orange</option><option value="red">Red</option></select></div>
          <div className="filter-field"><label htmlFor="tsunami">Tsunami flag</label><select id="tsunami" value={filters.tsunami} onChange={update('tsunami')}><option value="any">Any flag</option><option value="yes">Flagged</option><option value="no">Not flagged</option></select></div>
        </div>
        <div className="filter-field"><label htmlFor="review">Review status</label><select id="review" value={filters.review} onChange={update('review')}><option value="any">Any review status</option><option value="reviewed">Reviewed</option><option value="automatic">Automatic</option></select></div>
        <div className="filter-field sort-field"><label htmlFor="sort">Order event stream by</label><select id="sort" value={sort} onChange={(event) => onSortChange(event.target.value)}><option value="significance">USGS significance</option><option value="magnitude">Magnitude</option><option value="newest">Newest first</option><option value="depth">Shallowest first</option></select></div>
      </div>
      <div className="filter-footer"><button type="button" className="button button-reset" onClick={onReset} disabled={!activeFilterCount}><Glyph name="refresh" /> Reset constraints</button><p><Glyph name="info" size={14} /> Filters apply to the loaded USGS feed.</p></div>
    </aside>
  )
}

function DetailCard({ event, now, onClose }) {
  if (!event) return null
  const reading = signalReading(event)
  return (
    <>
      <button type="button" className="detail-backdrop" onClick={onClose} aria-label="Close selected event detail" />
      <section className="detail-card" aria-labelledby="selected-event-title" role="dialog" aria-modal="false">
        <div className="detail-heading">
          <div><p className="rail-kicker">Selected signal</p><h2 id="selected-event-title">Event detail</h2></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close event detail"><Glyph name="close" /></button>
        </div>
        <div className="detail-magnitude"><span>M</span><strong>{formatMagnitude(event.magnitude)}</strong><span className="detail-age">{formatAge(event.time, now)}</span></div>
        <p className="detail-place">{event.place}</p>
        <p className="detail-title">{event.title}</p>
        <div className="detail-status-row">
          <span className={`status-chip status-${reading.tone}`}><i />Reading: {reading.label}</span>
          <span className={`status-chip status-${event.alert || 'unknown'}`}><i />Alert: {alertLabel(event.alert)}</span>
          {event.tsunami === true ? <span className="status-chip status-tsunami"><i />Tsunami flag</span> : event.tsunami === false ? <span className="status-chip status-neutral"><i />No tsunami flag</span> : <span className="status-chip status-unknown"><i />Tsunami: Not reported</span>}
        </div>
        <dl className="detail-grid">
          <div><dt>Local to you</dt><dd>{formatDateTime(event.time)}</dd></div>
          <div><dt>UTC</dt><dd>{formatUtc(event.time)}</dd></div>
          <div><dt>Depth</dt><dd>{formatDepth(event.depth)}</dd></div>
          <div><dt>Significance</dt><dd>{event.significance === null ? 'Not reported' : `${event.significance} / 1000`}</dd></div>
          <div><dt>Felt reports</dt><dd>{event.felt === null ? 'Not reported' : event.felt.toLocaleString()}</dd></div>
          <div><dt>Review status</dt><dd>{reviewLabel(event.status)}</dd></div>
          <div><dt>USGS updated</dt><dd>{formatDateTime(event.updated)}</dd></div>
          <div className="detail-wide"><dt>Coordinates</dt><dd className="mono">{formatCoordinates(event)}</dd></div>
        </dl>
        <p className="detail-note"><Glyph name="info" size={14} /> {reading.note} This is a screening label, not a damage estimate or safety prediction. USGS may revise the event as more analysis arrives.</p>
        {event.officialUrl ? <a className="button button-primary detail-link" href={event.officialUrl} target="_blank" rel="noreferrer"><Glyph name="external" /> Open official USGS event page</a> : <span className="button button-disabled detail-link"><Glyph name="external" /> Official page not reported</span>}
      </section>
    </>
  )
}

function EventRow({ event, selected, previewed, timelineActive, now, onSelect, onPreview }) {
  return (
    <li>
      <button type="button" className={`event-row ${selected ? 'is-selected' : ''} ${previewed ? 'is-previewed' : ''} ${timelineActive ? 'is-timeline-focus' : ''}`} onClick={() => onSelect(event.id)} onMouseEnter={() => onPreview(event.id)} onMouseLeave={() => onPreview(null)} onFocus={() => onPreview(event.id)} onBlur={() => onPreview(null)}>
        <span className={`magnitude-badge magnitude-${event.alert || 'default'}`}><b>{formatMagnitude(event.magnitude)}</b><small>M</small></span>
        <span className="event-row-body"><span className="event-place">{event.place}</span><span className="event-row-meta"><span>{formatAge(event.time, now)}</span><span>·</span><span>{formatDepth(event.depth)}</span>{event.tsunami === true ? <span className="tiny-flag">TSU</span> : null}</span></span>
        <Glyph name="chevron" size={15} />
      </button>
    </li>
  )
}

function EventRail({ events, sortedEvents, selectedEvent, selectedId, previewId, focusEventIds, now, sort, visibleLimit, canReset, onSelect, onPreview, onSortChange, onShowMore, onCloseDetail, onReset }) {
  const orderedEvents = focusEventIds ? [...sortedEvents].sort((a, b) => Number(focusEventIds.has(b.id)) - Number(focusEventIds.has(a.id))) : sortedEvents
  const visibleEvents = orderedEvents.slice(0, visibleLimit)
  return (
    <aside className="event-rail" aria-label="Synchronized event stream">
      {selectedEvent ? <DetailCard event={selectedEvent} now={now} onClose={onCloseDetail} /> : null}
      <div className="rail-heading event-stream-heading"><div><p className="rail-kicker">Signal log</p><h2>Recent events</h2></div><span className="stream-count">{events.length.toLocaleString()}</span></div>
      <div className="stream-controls"><span className="stream-caption">Select an event to pin it to the map.</span><select aria-label="Sort event stream" value={sort} onChange={(event) => onSortChange(event.target.value)}><option value="significance">Priority</option><option value="magnitude">Magnitude</option><option value="newest">Newest</option><option value="depth">Depth</option></select></div>
      {visibleEvents.length ? <ol className="event-list">{visibleEvents.map((event) => <EventRow key={event.id} event={event} selected={event.id === selectedId} previewed={event.id === previewId} timelineActive={Boolean(focusEventIds?.has(event.id))} now={now} onSelect={onSelect} onPreview={onPreview} />)}</ol> : <div className="empty-stream"><div className="empty-icon"><Glyph name="search" /></div><h3>No events match.</h3><p>Remove a constraint or search for a wider region to return to the live field.</p><button type="button" className="button button-reset empty-reset" onClick={onReset} disabled={!canReset}>Reset constraints</button></div>}
      {visibleEvents.length < orderedEvents.length ? <button type="button" className="show-more" onClick={onShowMore}>Show 50 more <span>({orderedEvents.length - visibleEvents.length} remaining)</span></button> : null}
      <p className="stream-footnote">Showing live USGS events with missing values marked as not reported.</p>
    </aside>
  )
}

function Timeline({ bins, period, activeBin, onSelect }) {
  const maxCount = Math.max(1, ...bins.map((bin) => bin.events.length))
  const periodLabel = PERIODS.find((item) => item.id === period)?.label.toLowerCase() || 'selected period'
  const active = activeBin === null ? null : bins[activeBin]
  return (
    <section className="timeline-panel" aria-labelledby="timeline-title">
      <div className="timeline-heading"><div><p className="rail-kicker">Signature view</p><h2 id="timeline-title">The connected timeline</h2></div><p>{active ? `${active.events.length.toLocaleString()} event${active.events.length === 1 ? '' : 's'} · ${active.label}` : `Activity distribution across the ${periodLabel}`}</p></div>
      <div className="timeline-chart" role="list" aria-label={`Earthquake activity distribution for the ${periodLabel}`}>
        {bins.map((bin, index) => {
          const height = bin.events.length ? Math.max(9, (bin.events.length / maxCount) * 100) : 3
          return <button key={bin.start} type="button" role="listitem" className={`timeline-bin ${activeBin === index ? 'is-active' : ''} ${bin.events.length ? '' : 'is-empty'}`} style={{ '--bin-height': `${height}%` }} onClick={() => onSelect(index)} aria-label={`${bin.label}: ${bin.events.length} event${bin.events.length === 1 ? '' : 's'}`} aria-pressed={activeBin === index}><span className="timeline-bar" /><span className="timeline-tick">{index === 0 || index === 9 || index === 17 ? bin.tick : ''}</span></button>
        })}
      </div>
      <div className="timeline-footer"><span><i className="timeline-key timeline-key-active" />Active time window highlights the same events on the map and in the stream.</span><button type="button" className="timeline-clear" onClick={() => onSelect(null)} disabled={activeBin === null}>Clear time focus</button></div>
    </section>
  )
}

function ActiveConstraints({ filters, period, onRemove, onReset }) {
  const chips = []
  if (Number(filters.minMagnitude) > 0) chips.push({ key: 'minMagnitude', label: `M ${Number(filters.minMagnitude).toFixed(1)}+` })
  if (filters.depth !== 'any') chips.push({ key: 'depth', label: `${filters.depth} depth` })
  if (filters.alert !== 'any') chips.push({ key: 'alert', label: `${filters.alert} alert` })
  if (filters.tsunami !== 'any') chips.push({ key: 'tsunami', label: `tsunami ${filters.tsunami}` })
  if (filters.review !== 'any') chips.push({ key: 'review', label: filters.review })
  if (filters.query) chips.push({ key: 'query', label: `place: ${filters.query}` })
  return <div className="constraint-row" aria-label="Active constraints"><span className="constraint-label">View</span><span className="constraint-chip constraint-period">{PERIODS.find((item) => item.id === period)?.label}</span>{chips.map((chip) => <button key={chip.key} type="button" className="constraint-chip" onClick={() => onRemove(chip.key)}>{chip.label}<Glyph name="close" size={12} /></button>)}{chips.length ? <button type="button" className="constraint-reset" onClick={onReset}>Reset all</button> : null}</div>
}

function App() {
  const initial = useMemo(getInitialUrlState, [])
  const [period, setPeriod] = useState(initial.period)
  const [filters, setFilters] = useState(initial.filters)
  const [sort, setSort] = useState(initial.sort)
  const [events, setEvents] = useState([])
  const [selectedId, setSelectedId] = useState(initial.selectedId)
  const [previewId, setPreviewId] = useState(null)
  const [timelineBin, setTimelineBin] = useState(initial.timelineBin)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visibleLimit, setVisibleLimit] = useState(80)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [shareStatus, setShareStatus] = useState('')
  const eventsRef = useRef(events)
  const selectedIdRef = useRef(selectedId)
  const controllerRef = useRef(null)
  const syncInitialTimelineRef = useRef(Boolean(initial.selectedId && initial.timelineBin === null))

  useEffect(() => { eventsRef.current = events }, [events])
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(tick)
  }, [])
  useEffect(() => {
    const handleOnline = () => setOffline(false)
    const handleOffline = () => setOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline) }
  }, [])

  const loadFeed = useCallback(async (range) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const hasExisting = eventsRef.current.length > 0
    setStatus(hasExisting ? 'refreshing' : 'loading')
    setError('')
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setOffline(true)
      setStatus(hasExisting ? 'error' : 'error')
      setError('No network connection is available.')
      return
    }
    try {
      const response = await fetch(FEEDS[range], { signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/geo+json, application/json' } })
      if (!response.ok) throw new Error(`USGS returned HTTP ${response.status}.`)
      const payload = await response.json()
      const normalized = (Array.isArray(payload.features) ? payload.features : []).map(normalizeEvent).filter(Boolean)
      setEvents(normalized)
      eventsRef.current = normalized
      const preservedId = normalized.some((event) => event.id === selectedIdRef.current) ? selectedIdRef.current : null
      setSelectedId(preservedId)
      selectedIdRef.current = preservedId
      const generated = Number(payload.metadata?.generated)
      setLastUpdated(Number.isFinite(generated) ? generated : Date.now())
      setOffline(false)
      setStatus('ready')
    } catch (caughtError) {
      if (caughtError?.name === 'AbortError') return
      setStatus('error')
      setError(caughtError?.message || 'The USGS feed could not be loaded.')
    }
  }, [])

  useEffect(() => {
    loadFeed(period)
    return () => controllerRef.current?.abort()
  }, [loadFeed, period])

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadFeed(period)
    }, 5 * 60 * 1000)
    return () => window.clearInterval(refreshInterval)
  }, [loadFeed, period])

  useEffect(() => {
    const params = new URLSearchParams()
    if (period !== 'day') params.set('period', period)
    if (Number(filters.minMagnitude) > 0) params.set('mag', String(filters.minMagnitude))
    if (filters.depth !== 'any') params.set('depth', filters.depth)
    if (filters.alert !== 'any') params.set('alert', filters.alert)
    if (filters.tsunami !== 'any') params.set('tsunami', filters.tsunami)
    if (filters.review !== 'any') params.set('review', filters.review)
    if (filters.query) params.set('q', filters.query)
    if (sort !== 'significance') params.set('sort', sort)
    if (selectedId) params.set('event', selectedId)
    if (timelineBin !== null) params.set('bin', String(timelineBin))
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }, [filters, period, selectedId, sort, timelineBin])

  const filteredEvents = useMemo(() => events.filter((event) => {
    const minimum = Number(filters.minMagnitude) || 0
    if (event.magnitude !== null && event.magnitude < minimum) return false
    if (event.magnitude === null && minimum > 0) return false
    if (!depthMatches(event, filters.depth)) return false
    if (filters.alert !== 'any' && event.alert !== filters.alert) return false
    if (filters.tsunami === 'yes' && event.tsunami !== true) return false
    if (filters.tsunami === 'no' && event.tsunami !== false) return false
    if (filters.review !== 'any' && event.status !== filters.review) return false
    if (filters.query && !event.place.toLowerCase().includes(filters.query.toLowerCase().trim())) return false
    return true
  }), [events, filters])

  const sortedEvents = useMemo(() => sortEvents(filteredEvents, sort), [filteredEvents, sort])
  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedId) || null, [events, selectedId])
  const mapEvents = useMemo(() => selectedEvent && !filteredEvents.some((event) => event.id === selectedEvent.id) ? [selectedEvent, ...filteredEvents] : filteredEvents, [filteredEvents, selectedEvent])
  const strongestEvent = useMemo(() => filteredEvents.slice().sort((a, b) => (b.magnitude ?? -1) - (a.magnitude ?? -1) || (b.significance ?? -1) - (a.significance ?? -1))[0] || null, [filteredEvents])
  const priorityEvent = useMemo(() => sortEvents(filteredEvents, 'significance')[0] || null, [filteredEvents])
  const activeFilterCount = [Number(filters.minMagnitude) > 0, filters.depth !== 'any', filters.alert !== 'any', filters.tsunami !== 'any', filters.review !== 'any', Boolean(filters.query)].filter(Boolean).length
  const activePeriod = PERIODS.find((item) => item.id === period) || PERIODS[1]
  const bins = useMemo(() => {
    const start = now - activePeriod.duration
    const binDuration = activePeriod.duration / 18
    return Array.from({ length: 18 }, (_, index) => {
      const binStart = start + index * binDuration
      const binEnd = binStart + binDuration
      const bucketEvents = filteredEvents.filter((event) => event.time !== null && event.time >= binStart && (index === 17 ? event.time <= binEnd : event.time < binEnd))
      const tick = new Intl.DateTimeFormat(undefined, activePeriod.duration <= 24 * 60 * 60 * 1000 ? { hour: 'numeric' } : { month: 'short', day: 'numeric' }).format(new Date(binStart))
      return { start: binStart, end: binEnd, events: bucketEvents, label: `${formatDateTime(binStart, { dateStyle: 'medium', timeStyle: 'short', timeZoneName: '' })}–${formatDateTime(binEnd, { dateStyle: 'medium', timeStyle: 'short', timeZoneName: '' })}`, tick }
    })
  }, [activePeriod.duration, filteredEvents, now])
  const activeBinIds = useMemo(() => timelineBin === null ? null : new Set((bins[timelineBin]?.events || []).map((event) => event.id)), [bins, timelineBin])

  useEffect(() => {
    if (!syncInitialTimelineRef.current || !events.length) return
    const matchingBin = selectedId ? bins.findIndex((bin) => bin.events.some((event) => event.id === selectedId)) : -1
    if (matchingBin >= 0) setTimelineBin(matchingBin)
    syncInitialTimelineRef.current = false
  }, [bins, events.length, selectedId])

  useEffect(() => {
    setVisibleLimit(80)
  }, [filters, period, sort])

  const handleSelectEvent = useCallback((id) => {
    const event = eventsRef.current.find((item) => item.id === id)
    setSelectedId(id)
    selectedIdRef.current = id
    setPreviewId(null)
    if (event?.time) {
      const matchingBin = bins.findIndex((bin) => bin.events.some((item) => item.id === id))
      if (matchingBin >= 0) setTimelineBin(matchingBin)
    }
  }, [bins])

  const handleTimelineSelect = (index) => {
    if (index === null) {
      setTimelineBin(null)
      return
    }
    setTimelineBin(index)
    const firstEvent = bins[index]?.events[0]
    if (firstEvent) handleSelectEvent(firstEvent.id)
  }

  const handlePeriodChange = (nextPeriod) => {
    setPeriod(nextPeriod)
    setTimelineBin(null)
    setFiltersOpen(false)
  }

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({ ...current, [key]: key === 'minMagnitude' ? Number(value) : value }))
  }

  const resetFilters = () => setFilters(DEFAULT_FILTERS)
  const removeFilter = (key) => setFilters((current) => ({ ...current, [key]: DEFAULT_FILTERS[key] }))

  const handleShare = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href)
        setShareStatus('View link copied')
      } else {
        setShareStatus('Copy the view URL from your address bar')
      }
    } catch {
      setShareStatus('Copy the view URL from your address bar')
    }
    window.setTimeout(() => setShareStatus(''), 3200)
  }

  if (status === 'loading' && !events.length) return <LoadingShell />
  if (status === 'error' && !events.length) return <ErrorState offline={offline} error={error} onRetry={() => loadFeed(period)} />

  const stale = lastUpdated ? now - lastUpdated > 15 * 60 * 1000 : false
  return (
    <div className="app-frame">
      <Header status={status} lastUpdated={lastUpdated} now={now} onRefresh={() => loadFeed(period)} onShare={handleShare} shareStatus={shareStatus} />
      <main>
        <Overview events={events} strongestEvent={strongestEvent} priorityEvent={priorityEvent} filteredCount={filteredEvents.length} period={period} now={now} onSelectEvent={handleSelectEvent} />
        <div className="control-strip"><PeriodNav period={period} onChange={handlePeriodChange} /><button type="button" className={`filter-toggle ${filtersOpen ? 'is-active' : ''}`} onClick={() => setFiltersOpen((open) => !open)} aria-controls="filter-rail" aria-expanded={filtersOpen}><Glyph name="sliders" /> Filters{activeFilterCount ? <b>{activeFilterCount}</b> : null}</button></div>
        <ActiveConstraints filters={filters} period={period} onRemove={removeFilter} onReset={resetFilters} />
        {status === 'error' && events.length ? <div className="data-banner banner-error" role="alert"><Glyph name="alert" /><span>Refresh failed. Showing the last successful USGS snapshot from {lastUpdated ? formatDateTime(lastUpdated) : 'an unknown time'}.</span><button type="button" onClick={() => loadFeed(period)}>Retry</button></div> : null}
        {offline && events.length ? <div className="data-banner banner-stale" role="status"><Glyph name="globe" /><span>Offline. Showing the last successful snapshot{lastUpdated ? ` from ${formatRelativeTimestamp(lastUpdated, now)}` : ''}.</span></div> : null}
        {stale && !offline && status !== 'error' ? <div className="data-banner banner-stale" role="status"><Glyph name="clock" /><span>This snapshot is {formatRelativeTimestamp(lastUpdated, now)} old. USGS data may be revised.</span><button type="button" onClick={() => loadFeed(period)}>Refresh now</button></div> : null}
        <div className="instrument-layout">
          <FilterRail filters={filters} sort={sort} activeFilterCount={activeFilterCount} resultCount={filteredEvents.length} open={filtersOpen} onToggle={() => setFiltersOpen(false)} onFilterChange={handleFilterChange} onSortChange={setSort} onReset={resetFilters} />
          <section className="map-column" aria-label="Geographic activity">
            {status === 'refreshing' ? <div className="refresh-ribbon" role="status"><Glyph name="refresh" /> Updating from USGS…</div> : null}
            <MapSurface events={mapEvents} selectedId={selectedId} previewId={previewId} focusEventIds={activeBinIds} onSelectEvent={handleSelectEvent} onPreviewEvent={setPreviewId} />
            {activeBinIds && activeBinIds.size === 0 ? <p className="timeline-empty-note">No events landed in this time window. Choose another bin to illuminate activity.</p> : null}
          </section>
          <EventRail events={filteredEvents} sortedEvents={sortedEvents} selectedEvent={selectedEvent} selectedId={selectedId} previewId={previewId} focusEventIds={activeBinIds} now={now} sort={sort} visibleLimit={visibleLimit} canReset={activeFilterCount > 0} onSelect={handleSelectEvent} onPreview={setPreviewId} onSortChange={setSort} onShowMore={() => setVisibleLimit((limit) => limit + 50)} onCloseDetail={() => { setSelectedId(null); selectedIdRef.current = null; setTimelineBin(null) }} onReset={resetFilters} />
        </div>
        <Timeline bins={bins} period={period} activeBin={timelineBin} onSelect={handleTimelineSelect} />
      </main>
      <footer className="app-footer"><span><Glyph name="wave" size={15} /> Data source: <a href="https://earthquake.usgs.gov/" target="_blank" rel="noreferrer">United States Geological Survey (USGS)</a>. Feeds update frequently and may be revised.</span><span>For exploration and public information, not an emergency alert service.</span></footer>
      <div className="sr-only" aria-live="polite">{status === 'refreshing' ? 'Refreshing earthquake data.' : `${filteredEvents.length.toLocaleString()} earthquakes in the current view.`}{selectedEvent ? ` Selected event: ${selectedEvent.place}.` : ''}</div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
