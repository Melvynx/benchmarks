import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { depthClass, formatMagnitude, formatRelativeTime, magnitudeBand } from '../lib/earthquakes'
import type { Earthquake, MapBounds } from '../types/earthquake'

interface EarthquakeMapProps {
  events: Earthquake[]
  selectedId: string | null
  hoveredId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  onBoundsChange: (bounds: MapBounds) => void
  fitNonce: number
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)
}

function markerHtml(event: Earthquake, selected: boolean, hovered: boolean): string {
  const mag = event.magnitude ?? 0
  const size = Math.max(24, Math.min(58, 18 + mag * 6))
  const band = magnitudeBand(event.magnitude)
  const depth = depthClass(event.depth)
  return `<span class="quake-marker quake-marker--${band} quake-marker--${depth}${selected ? ' is-selected' : ''}${hovered ? ' is-hovered' : ''}" style="--marker-size:${size}px" aria-hidden="true"><span>${formatMagnitude(event.magnitude)}</span></span>`
}

export function EarthquakeMap({ events, selectedId, hoveredId, onSelect, onHover, onBoundsChange, fitNonce }: EarthquakeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const markersRef = useRef(new Map<string, L.Marker>())
  const callbacksRef = useRef({ onSelect, onHover, onBoundsChange })
  const lastFitNonceRef = useRef(fitNonce)

  callbacksRef.current = { onSelect, onHover, onBoundsChange }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [18, 0],
      zoom: 2,
      minZoom: 2,
      worldCopyJump: true,
      zoomControl: false,
      preferCanvas: true,
    })
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    const clusters = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      removeOutsideVisibleBounds: true,
      maxClusterRadius: 44,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount()
        return L.divIcon({
          className: 'quake-cluster-wrap',
          html: `<span class="quake-cluster" role="img" aria-label="${count} earthquakes grouped. Zoom to inspect"><span>${count}</span><small>events</small></span>`,
          iconSize: L.point(54, 54),
        })
      },
    })
    clusters.addTo(map)
    const announceBounds = () => {
      const bounds = map.getBounds()
      callbacksRef.current.onBoundsChange({ north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest() })
    }
    map.on('moveend', announceBounds)
    announceBounds()
    mapRef.current = map
    clusterRef.current = clusters
    window.setTimeout(() => map.invalidateSize(), 0)
    return () => {
      map.off('moveend', announceBounds)
      map.remove()
      mapRef.current = null
      clusterRef.current = null
      markersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const cluster = clusterRef.current
    if (!cluster) return
    cluster.clearLayers()
    markersRef.current.clear()
    const markers = events.map((event) => {
      const marker = L.marker([event.latitude, event.longitude], {
        icon: L.divIcon({
          className: 'quake-marker-wrap',
          html: markerHtml(event, event.id === selectedId, event.id === hoveredId),
          iconSize: undefined,
          iconAnchor: undefined,
        }),
        title: `M ${formatMagnitude(event.magnitude)} — ${event.place}`,
        keyboard: true,
        riseOnHover: true,
      })
      marker.bindTooltip(`<strong>M ${formatMagnitude(event.magnitude)}</strong><br>${escapeHtml(event.place)}<br><span>${formatRelativeTime(event.time)} · ${Math.round(event.depth)} km deep</span>`, {
        className: 'quake-tooltip', direction: 'top', offset: [0, -12], opacity: 1,
      })
      marker.on('click', () => callbacksRef.current.onSelect(event.id))
      marker.on('mouseover focus', () => callbacksRef.current.onHover(event.id))
      marker.on('mouseout blur', () => callbacksRef.current.onHover(null))
      markersRef.current.set(event.id, marker)
      return marker
    })
    cluster.addLayers(markers)
  }, [events, selectedId, hoveredId])

  useEffect(() => {
    const map = mapRef.current
    const cluster = clusterRef.current
    if (!map || !cluster || !selectedId) return
    const marker = markersRef.current.get(selectedId)
    if (!marker) return
    cluster.zoomToShowLayer(marker, () => {
      map.panTo(marker.getLatLng(), { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches })
      marker.openTooltip()
    })
  }, [selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || fitNonce === lastFitNonceRef.current) return
    lastFitNonceRef.current = fitNonce
    if (events.length === 0) return
    const bounds = L.latLngBounds(events.map((event) => [event.latitude, event.longitude] as [number, number]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 6 })
  }, [fitNonce, events])

  return (
    <div className="map-shell">
      <div ref={containerRef} className="earthquake-map" aria-label="Interactive map of filtered earthquake events" />
      <div className="map-key" aria-label="Map marker legend">
        <span><i className="key-dot key-dot--minor" /> Under 4</span>
        <span><i className="key-dot key-dot--moderate" /> 4–4.9</span>
        <span><i className="key-dot key-dot--strong" /> 5–5.9</span>
        <span><i className="key-dot key-dot--major" /> 6+</span>
        <span className="map-key__depth">Ring thickness indicates depth</span>
      </div>
    </div>
  )
}
