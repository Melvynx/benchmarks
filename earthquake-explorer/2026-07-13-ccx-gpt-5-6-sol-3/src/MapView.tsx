import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import type { EarthquakeFeature, MapBounds } from './types'
import { depthBand, formatMagnitude } from './data'

interface MapViewProps {
  events: EarthquakeFeature[]
  selectedId: string | null
  highlightedIds: Set<string> | null
  onSelect: (event: EarthquakeFeature) => void
  onHover: (id: string | null) => void
  hoveredId: string | null
  onBoundsChange: (bounds: MapBounds) => void
  fitSignal: number
}

function markerSize(magnitude: number | null) {
  const value = Math.max(0, magnitude ?? 0)
  return Math.round(Math.min(54, Math.max(24, 20 + value * 4.2)))
}

function markerClass(event: EarthquakeFeature, selectedId: string | null, hoveredId: string | null, highlightedIds: Set<string> | null) {
  const magnitude = event.properties.mag ?? 0
  const depth = event.geometry.coordinates[2]
  const classes = ['quake-marker', `depth-${depthBand(depth).toLowerCase()}`]
  if (magnitude >= 6) classes.push('magnitude-major')
  else if (magnitude >= 4.5) classes.push('magnitude-notable')
  else classes.push('magnitude-routine')
  if (event.properties.alert) classes.push(`alert-${event.properties.alert}`)
  if (event.properties.tsunami === 1) classes.push('has-tsunami')
  if (event.id === selectedId) classes.push('is-selected')
  if (event.id === hoveredId) classes.push('is-hovered')
  if (highlightedIds && !highlightedIds.has(event.id)) classes.push('is-muted')
  return classes.join(' ')
}

export function MapView({ events, selectedId, highlightedIds, onSelect, onHover, hoveredId, onBoundsChange, fitSignal }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const markerRefs = useRef(new Map<string, L.Marker>())
  const lastFitSignalRef = useRef(0)
  const onBoundsRef = useRef(onBoundsChange)
  onBoundsRef.current = onBoundsChange

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [18, 4],
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
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 1.8,
      maxClusterRadius: 46,
      removeOutsideVisibleBounds: true,
      iconCreateFunction: (group) => {
        const children = group.getAllChildMarkers()
        const maxMagnitude = Math.max(...children.map((marker) => Number(marker.options.title) || 0))
        return L.divIcon({
          html: `<span class="cluster-count">${group.getChildCount()}</span><span class="cluster-mag">M${maxMagnitude.toFixed(1)} max</span>`,
          className: `quake-cluster ${maxMagnitude >= 5 ? 'cluster-notable' : ''}`,
          iconSize: L.point(58, 58),
        })
      },
    })
    map.addLayer(cluster)
    mapRef.current = map
    clusterRef.current = cluster

    const reportBounds = () => {
      const bounds = map.getBounds()
      onBoundsRef.current({ north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest() })
    }
    map.on('moveend', reportBounds)
    reportBounds()

    return () => {
      map.off('moveend', reportBounds)
      map.remove()
      mapRef.current = null
      clusterRef.current = null
    }
  }, [])

  useEffect(() => {
    const cluster = clusterRef.current
    if (!cluster) return
    cluster.clearLayers()
    markerRefs.current.clear()

    events.forEach((event) => {
      const [longitude, latitude] = event.geometry.coordinates
      const size = markerSize(event.properties.mag)
      const icon = L.divIcon({
        html: `<span aria-hidden="true">${formatMagnitude(event.properties.mag)}</span>`,
        className: markerClass(event, selectedId, hoveredId, highlightedIds),
        iconSize: L.point(size, size),
        iconAnchor: L.point(size / 2, size / 2),
      })
      const marker = L.marker([latitude, longitude], {
        icon,
        title: String(event.properties.mag ?? 0),
        alt: `${event.properties.title}, ${event.geometry.coordinates[2]} kilometers deep`,
        keyboard: true,
        riseOnHover: true,
      })
      const tooltip = document.createElement('div')
      const tooltipTitle = document.createElement('strong')
      tooltipTitle.textContent = event.properties.title
      tooltip.append(tooltipTitle, document.createElement('br'), `${event.geometry.coordinates[2].toFixed(1)} km deep`)
      marker.bindTooltip(tooltip, {
        direction: 'top',
        offset: [0, -size / 2],
      })
      marker.on('click', () => onSelect(event))
      marker.on('mouseover', () => onHover(event.id))
      marker.on('focus', () => onHover(event.id))
      marker.on('mouseout', () => onHover(null))
      marker.on('blur', () => onHover(null))
      markerRefs.current.set(event.id, marker)
      cluster.addLayer(marker)
    })
  }, [events, selectedId, hoveredId, highlightedIds, onSelect, onHover])

  useEffect(() => {
    if (!selectedId) return
    const map = mapRef.current
    const marker = markerRefs.current.get(selectedId)
    const cluster = clusterRef.current
    if (!map || !marker || !cluster) return
    cluster.zoomToShowLayer(marker, () => {
      map.panTo(marker.getLatLng(), { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches })
      marker.openTooltip()
    })
  }, [selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || events.length === 0 || fitSignal === 0 || fitSignal === lastFitSignalRef.current) return
    lastFitSignalRef.current = fitSignal
    const bounds = L.latLngBounds(events.map((event) => [event.geometry.coordinates[1], event.geometry.coordinates[0]] as L.LatLngTuple))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 6, animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches })
  }, [fitSignal, events])

  return (
    <div className="map-shell" aria-label="Interactive map of filtered earthquakes">
      <div ref={containerRef} className="map-canvas" />
      <div className="map-key" aria-hidden="true">
        <span><i className="key-shallow" /> Shallow</span>
        <span><i className="key-intermediate" /> Intermediate</span>
        <span><i className="key-deep" /> Deep</span>
        <span className="key-note">Marker size shows magnitude</span>
      </div>
    </div>
  )
}
