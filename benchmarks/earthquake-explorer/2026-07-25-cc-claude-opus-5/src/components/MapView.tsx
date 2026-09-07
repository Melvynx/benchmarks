import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Map as MapLibreMap,
  NavigationControl,
  ScaleControl,
  type GeoJSONSource,
  type MapMouseEvent,
} from 'maplibre-gl'
import '../lib/maplibre-worker'
import type { Quake } from '../lib/usgs'
import type { ColorMode } from '../lib/color'
import { colorExpression, colorFor } from '../lib/color'
import { getBasemap, type BasemapId } from '../lib/basemaps'
import {
  LAYER_IDS,
  PLATE_SOURCE,
  PULSE_SOURCE,
  QUAKE_SOURCE,
  hoverLayer,
  plateLayers,
  pulseLayer,
  quakeDotLayer,
  quakeGlowLayer,
  selectLayers,
} from '../lib/layers'
import * as fmt from '../lib/format'

export type Projection = 'mercator' | 'globe'

interface MapViewProps {
  quakes: Quake[]
  selected: Quake | null
  hoveredId: string | null
  colorMode: ColorMode
  now: number
  basemap: BasemapId
  projection: Projection
  showPlates: boolean
  /** Bumped by the parent to request the camera fly to the selected event. */
  focusToken: number
  onSelect: (id: string | null) => void
  onHover: (id: string | null) => void
}

interface Tooltip {
  x: number
  y: number
  quake: Quake
}

type FeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties: Record<string, unknown>
    geometry: { type: 'Point'; coordinates: [number, number] }
  }>
}

function toFeatureCollection(quakes: Quake[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: quakes.map((q) => ({
      type: 'Feature',
      properties: {
        id: q.id,
        mag: q.mag,
        depth: q.depth,
        time: q.time,
        alert: q.alert ?? '',
      },
      geometry: { type: 'Point', coordinates: [q.lon, q.lat] },
    })),
  }
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

export function MapView({
  quakes,
  selected,
  hoveredId,
  colorMode,
  now,
  basemap,
  projection,
  showPlates,
  focusToken,
  onSelect,
  onHover,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  // Imperative handlers read these refs so map listeners never need rebinding.
  const quakesRef = useRef(quakes)
  quakesRef.current = quakes
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onHoverRef = useRef(onHover)
  onHoverRef.current = onHover

  const collection = useMemo(() => toFeatureCollection(quakes), [quakes])

  /** The newest event currently displayed, used for the "live" ping. */
  const newest = useMemo(() => {
    let best: Quake | null = null
    for (const q of quakes) if (!best || q.time > best.time) best = q
    return best
  }, [quakes])

  /** Projection + atmosphere. `setStyle` resets both, so install() reapplies them. */
  const applyProjection = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    try {
      map.setProjection({ type: projection })
      map.setSky(
        projection === 'globe'
          ? {
              'sky-color': '#0a1024',
              'sky-horizon-blend': 0.6,
              'horizon-color': '#2b3a63',
              'horizon-fog-blend': 0.7,
              'fog-color': '#070a13',
              'fog-ground-blend': 0.05,
              'atmosphere-blend': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                1,
                5,
                0.4,
                7,
                0,
              ] as never,
            }
          : { 'atmosphere-blend': 0 },
      )
    } catch {
      // Older renderers without globe support simply stay on mercator.
    }
  }, [projection])

  /** (Re)installs our sources and layers on top of whichever basemap is loaded. */
  const install = useCallback(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    if (map.getSource(QUAKE_SOURCE)) return

    map.addSource(PLATE_SOURCE, {
      type: 'geojson',
      data: '/plate-boundaries.json',
      attribution: 'Plate boundaries: Bird (2003)',
    })
    map.addSource(QUAKE_SOURCE, {
      type: 'geojson',
      data: EMPTY,
      // Clustering is deliberately off: every event stays its own point.
      cluster: false,
      attribution:
        '<a href="https://earthquake.usgs.gov/earthquakes/feed/" target="_blank" rel="noreferrer">USGS earthquake feeds</a>',
    })
    map.addSource(PULSE_SOURCE, { type: 'geojson', data: EMPTY })

    const { dark, imagery } = getBasemap(basemap)
    for (const layer of plateLayers(dark, imagery)) map.addLayer(layer)
    map.addLayer(quakeGlowLayer(colorMode, now))
    map.addLayer(quakeDotLayer(colorMode, now, dark))
    map.addLayer(pulseLayer(dark))
    map.addLayer(hoverLayer(dark))
    for (const layer of selectLayers(dark)) map.addLayer(layer)

    // Restore everything that lives outside the layer definitions, so a
    // basemap switch does not silently drop the data or the highlights.
    ;(map.getSource(QUAKE_SOURCE) as GeoJSONSource | undefined)?.setData(collection as never)
    ;(map.getSource(PULSE_SOURCE) as GeoJSONSource | undefined)?.setData(
      (newest ? toFeatureCollection([newest]) : EMPTY) as never,
    )
    map.setFilter(LAYER_IDS.hover, ['==', ['get', 'id'], hoveredId ?? ''])
    const selectFilter = ['==', ['get', 'id'], selected?.id ?? '']
    map.setFilter(LAYER_IDS.select, selectFilter as never)
    map.setFilter(LAYER_IDS.selectInner, selectFilter as never)
    const visibility = showPlates ? 'visible' : 'none'
    map.setLayoutProperty(LAYER_IDS.plateLine, 'visibility', visibility)
    map.setLayoutProperty(LAYER_IDS.plateGlow, 'visibility', visibility)
    applyProjection()
  }, [
    applyProjection,
    basemap,
    collection,
    colorMode,
    hoveredId,
    newest,
    now,
    selected,
    showPlates,
  ])

  // The `styledata` listener is bound once, so it reads the latest installer here.
  const installRef = useRef(install)
  installRef.current = install

  // --- map creation (once) ---
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let map: MapLibreMap
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: getBasemap(basemap).style,
        center: [12, 18],
        zoom: 1.55,
        minZoom: -1,
        maxZoom: 14,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        hash: false,
      })
    } catch {
      // No usable WebGL context. The list, filters and detail view still work.
      setFailed(true)
      return
    }
    mapRef.current = map

    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new ScaleControl({ maxWidth: 96, unit: 'metric' }), 'bottom-right')
    map.touchZoomRotate.disableRotation()

    const pick = (e: MapMouseEvent) => {
      const features = map.queryRenderedFeatures(
        [
          [e.point.x - 6, e.point.y - 6],
          [e.point.x + 6, e.point.y + 6],
        ],
        { layers: [LAYER_IDS.dot] },
      )
      if (features.length === 0) return null
      // With overlapping points, prefer the strongest event under the cursor.
      let best = features[0]
      for (const f of features) {
        if (Number(f.properties?.mag ?? 0) > Number(best.properties?.mag ?? 0)) best = f
      }
      const id = String(best.properties?.id ?? '')
      return quakesRef.current.find((q) => q.id === id) ?? null
    }

    map.on('click', (e) => {
      const quake = pick(e)
      onSelectRef.current(quake ? quake.id : null)
    })

    map.on('mousemove', (e) => {
      const quake = pick(e)
      map.getCanvas().style.cursor = quake ? 'pointer' : ''
      onHoverRef.current(quake ? quake.id : null)
      setTooltip(quake ? { x: e.point.x, y: e.point.y, quake } : null)
    })

    map.on('mouseout', () => {
      onHoverRef.current(null)
      setTooltip(null)
    })

    map.on('load', () => {
      // Frame the seismically active latitudes so a phone gets the whole world
      // rather than a crop of it, then stop zooming out past that framing.
      map.fitBounds(
        [
          [-179, -60],
          [179, 74],
        ],
        { padding: 6, animate: false },
      )
      map.setMinZoom(Math.min(0.6, map.getZoom() - 0.2))
      setReady(true)
    })
    // Re-add our overlays whenever a new basemap style finishes loading.
    // `styledata` can fire before the style reports itself loaded (and then not
    // again), so `idle` is the backstop that guarantees the overlays come back.
    map.on('styledata', () => installRef.current())
    map.on('idle', () => installRef.current())

    return () => {
      map.remove()
      mapRef.current = null
    }
    // Intentionally mount-only; every prop change is handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (ready) install()
  }, [ready, install])

  // --- data ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const source = map.getSource(QUAKE_SOURCE) as GeoJSONSource | undefined
    source?.setData(collection as never)
  }, [collection, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const source = map.getSource(PULSE_SOURCE) as GeoJSONSource | undefined
    if (!source) return
    source.setData(
      newest
        ? (toFeatureCollection([newest]) as never)
        : (EMPTY as never),
    )
  }, [newest, ready])

  // --- colour mode ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !map.getLayer(LAYER_IDS.dot)) return
    const expr = colorExpression(colorMode, now)
    map.setPaintProperty(LAYER_IDS.dot, 'circle-color', expr as never)
    map.setPaintProperty(LAYER_IDS.glow, 'circle-color', expr as never)
  }, [colorMode, now, ready])

  // --- hover / selection highlight ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !map.getLayer(LAYER_IDS.hover)) return
    map.setFilter(LAYER_IDS.hover, ['==', ['get', 'id'], hoveredId ?? ''])
  }, [hoveredId, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !map.getLayer(LAYER_IDS.select)) return
    const filter = ['==', ['get', 'id'], selected?.id ?? '']
    map.setFilter(LAYER_IDS.select, filter as never)
    map.setFilter(LAYER_IDS.selectInner, filter as never)
  }, [selected, ready])

  // --- plate boundary visibility ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !map.getLayer(LAYER_IDS.plateLine)) return
    const visibility = showPlates ? 'visible' : 'none'
    map.setLayoutProperty(LAYER_IDS.plateLine, 'visibility', visibility)
    map.setLayoutProperty(LAYER_IDS.plateGlow, 'visibility', visibility)
  }, [showPlates, ready])

  // --- basemap ---
  const basemapRef = useRef(basemap)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || basemapRef.current === basemap) return
    basemapRef.current = basemap
    map.setStyle(getBasemap(basemap).style, { diff: false })
  }, [basemap, ready])

  // --- projection ---
  const projectionRef = useRef(projection)
  useEffect(() => {
    if (!ready) return
    applyProjection()
    const map = mapRef.current
    const entered = projectionRef.current !== projection
    projectionRef.current = projection
    // A globe drawn at world-fitting mercator zoom sits tiny in the middle of
    // the viewport, so nudge the camera in far enough for it to fill the frame.
    if (map && entered && projection === 'globe' && map.getZoom() < 2.2) {
      map.easeTo({ zoom: 2.2, duration: 700, essential: true })
    }
  }, [applyProjection, projection, ready])

  // --- camera focus on externally selected events ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !selected || focusToken === 0) return
    map.easeTo({
      center: [selected.lon, selected.lat],
      zoom: Math.max(map.getZoom(), 4.6),
      duration: 900,
      essential: true,
    })
    // Only re-run when the parent explicitly asks for a new focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusToken])

  // --- expanding ring on the newest event ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame = 0
    const start = performance.now()
    const tick = (t: number) => {
      if (map.getLayer(LAYER_IDS.pulse)) {
        const phase = ((t - start) % 2600) / 2600
        map.setPaintProperty(LAYER_IDS.pulse, 'circle-radius', 6 + phase * 34)
        map.setPaintProperty(
          LAYER_IDS.pulse,
          'circle-stroke-opacity',
          Math.max(0, 0.7 * (1 - phase)),
        )
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [ready])

  const tooltipColor = tooltip ? colorFor(colorMode, tooltip.quake, now) : '#fff'

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 max-w-[15rem] rounded-lg border border-line bg-void/92 px-2.5 py-2 shadow-2xl backdrop-blur-md"
          style={{
            left: Math.min(tooltip.x + 14, (containerRef.current?.clientWidth ?? 0) - 250),
            top: Math.max(8, tooltip.y - 58),
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: tooltipColor, boxShadow: `0 0 10px ${tooltipColor}` }}
            />
            <span className="tabular text-sm font-semibold">
              M {fmt.magnitude(tooltip.quake.mag)}
            </span>
            <span className="tabular text-[11px] text-ink-faint">
              {fmt.depth(tooltip.quake.depth)} deep
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink-dim">
            {tooltip.quake.place}
          </p>
          <p className="tabular mt-0.5 text-[10px] text-ink-faint">
            {fmt.timeAgo(tooltip.quake.time, now)}
          </p>
        </div>
      )}

      {!ready && !failed && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-void">
          <div className="flex items-center gap-2.5 text-xs text-ink-faint">
            <span className="size-3 animate-spin rounded-full border-2 border-line border-t-accent" />
            Loading basemap…
          </div>
        </div>
      )}

      {failed && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-void px-6">
          <div className="max-w-xs text-center">
            <p className="text-sm font-semibold text-ink">The map needs WebGL</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-faint">
              This browser could not create a WebGL context, so the globe cannot be drawn.
              Every earthquake is still listed and searchable on the left, with full detail
              on the right.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
