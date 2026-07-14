import { useEffect, useMemo, useRef, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import {
  AlertTriangle, ArrowUpRight, CheckCircle2, ChevronDown, Clock3, ExternalLink,
  Filter, Gauge, Globe2, Info, Layers3, List, LocateFixed, Map as MapIcon,
  MapPin, RefreshCw, RotateCcw, Search, Share2, SlidersHorizontal, Waves, X,
} from 'lucide-react'
import type { Earthquake, Filters, TimeRange } from './types'
import { useEarthquakes } from './useEarthquakes'
import {
  activeFilterCount, applyFilters, buildUrl, formatDateTime, formatDepth, formatLocalTime,
  formatMagnitude, formatRelativeTime, magnitudeClass, magnitudeLabel, RANGE_LABELS,
  readUrlFilters, significanceLabel,
} from './utils'

const DEFAULT_FILTERS: Filters = {
  range: 'week', minMagnitude: 0, maxDepth: 700, alert: 'all', tsunamiOnly: false,
  review: 'all', area: 'world', query: '', sort: 'significance',
}

function MapFocus({ event }: { event: Earthquake | null }) {
  const map = useMap()
  useEffect(() => {
    if (event) map.flyTo([event.latitude, event.longitude], Math.max(map.getZoom(), 5), { duration: 0.55 })
  }, [event, map])
  return null
}

function SeismicMap({ events, selected, hovered, onSelect, onHover }: {
  events: Earthquake[]
  selected: Earthquake | null
  hovered: string | null
  onSelect: (event: Earthquake) => void
  onHover: (id: string | null) => void
}) {
  return (
    <div className="map-wrap" aria-label="Interactive map of filtered earthquakes">
      <MapContainer center={[15, 0]} zoom={2} minZoom={2} worldCopyJump className="map-canvas" zoomControl={false}>
        <TileLayer
          attribution='Map tiles © <a href="https://carto.com/attributions">CARTO</a>, data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        />
        <TileLayer
          attribution=""
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          pane="shadowPane"
        />
        {events.map((event) => {
          const magnitude = Math.max(event.magnitude ?? 0, 0)
          const active = selected?.id === event.id || hovered === event.id
          return (
            <CircleMarker
              key={event.id}
              center={[event.latitude, event.longitude]}
              radius={active ? 9 + magnitude * 1.2 : 3.5 + magnitude * 1.05}
              pathOptions={{
                className: `quake-marker marker-${magnitudeClass(event.magnitude)}${active ? ' is-active' : ''}`,
                fillOpacity: active ? 0.95 : 0.72,
                weight: active ? 3 : 1.5,
              }}
              eventHandlers={{
                click: () => onSelect(event),
                mouseover: () => onHover(event.id),
                mouseout: () => onHover(null),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                <strong>{formatMagnitude(event.magnitude)}</strong> · {event.place}<br />
                {formatRelativeTime(event.time)} · {formatDepth(event.depth)}
              </Tooltip>
            </CircleMarker>
          )
        })}
        <MapFocus event={selected} />
      </MapContainer>
      <div className="map-legend" aria-label="Magnitude legend">
        <span><i className="legend-dot minor" />Under 2.5</span>
        <span><i className="legend-dot moderate" />2.5–4.4</span>
        <span><i className="legend-dot strong" />4.5–5.9</span>
        <span><i className="legend-dot major" />6+</span>
        <small>Circle size also shows magnitude</small>
      </div>
      <div className="map-count"><LocateFixed size={14} /> {events.length.toLocaleString()} visible</div>
    </div>
  )
}

function ActivityTimeline({ events, selectedId, range, onSelect }: {
  events: Earthquake[]
  selectedId: string | null
  range: TimeRange
  onSelect: (event: Earthquake) => void
}) {
  const chronological = useMemo(() => [...events].sort((a, b) => a.time - b.time), [events])
  const now = chronological.at(-1)?.time ?? 0
  const duration = { hour: 3_600_000, day: 86_400_000, week: 604_800_000, month: 2_592_000_000 }[range]
  const start = now - duration
  const points = chronological.map((event) => ({
    event,
    x: Math.max(1, Math.min(99, ((event.time - start) / duration) * 100)),
    y: 67 - Math.min(52, Math.max(2, (event.magnitude ?? 0) * 7.5)),
  }))
  const selectedIndex = Math.max(0, chronological.findIndex((event) => event.id === selectedId))
  const peak = events.reduce<Earthquake | null>((best, event) => !best || (event.magnitude ?? -1) > (best.magnitude ?? -1) ? event : best, null)

  return (
    <section className="timeline" aria-labelledby="timeline-title">
      <div className="timeline-heading">
        <div>
          <span className="section-kicker">Connected seismic timeline</span>
          <h2 id="timeline-title">Activity through {RANGE_LABELS[range].toLowerCase()}</h2>
        </div>
        <p>{peak ? `Peak ${formatMagnitude(peak.magnitude)} · ${peak.place}` : 'No events in this view'}</p>
      </div>
      <div className="trace" aria-hidden="true">
        <svg viewBox="0 0 100 72" preserveAspectRatio="none">
          <path className="trace-baseline" d="M0 66H100" />
          <path className="trace-line" d={points.map((point, index) => `${index ? 'L' : 'M'}${point.x},${point.y} L${point.x},66`).join(' ')} />
          {points.map(({ event, x, y }) => (
            <circle key={event.id} cx={x} cy={y} r={event.id === selectedId ? 1.6 : Math.max(.42, Math.min(1.15, (event.magnitude ?? 1) / 5))} className={`trace-point ${event.id === selectedId ? 'selected' : ''}`} />
          ))}
        </svg>
        <span className="timeline-start">{RANGE_LABELS[range]}</span><span className="timeline-end">Now</span>
      </div>
      {chronological.length > 0 && (
        <label className="scrubber-label">
          <span className="sr-only">Scrub through earthquakes in time</span>
          <input
            className="scrubber"
            type="range"
            min={0}
            max={chronological.length - 1}
            value={selectedIndex}
            onChange={(event) => onSelect(chronological[Number(event.target.value)])}
            aria-valuetext={`${formatMagnitude(chronological[selectedIndex]?.magnitude)} ${chronological[selectedIndex]?.place}, ${formatRelativeTime(chronological[selectedIndex]?.time)}`}
          />
        </label>
      )}
      <p className="timeline-accessible">{events.length} events shown. {peak ? `The largest is ${formatMagnitude(peak.magnitude)} near ${peak.place}.` : ''} Use the slider to move through events chronologically; the map and event stream follow your selection.</p>
    </section>
  )
}

function EventRow({ event, selected, hovered, onSelect, onHover }: {
  event: Earthquake; selected: boolean; hovered: boolean
  onSelect: () => void; onHover: (id: string | null) => void
}) {
  return (
    <button
      id={`event-${event.id}`}
      className={`event-row ${selected ? 'selected' : ''} ${hovered ? 'hovered' : ''}`}
      onClick={onSelect}
      onMouseEnter={() => onHover(event.id)}
      onMouseLeave={() => onHover(null)}
      aria-pressed={selected}
    >
      <span className={`mag medallion-${magnitudeClass(event.magnitude)}`}>{formatMagnitude(event.magnitude)}</span>
      <span className="event-copy">
        <strong>{event.place}</strong>
        <span><Clock3 size={13} /> {formatRelativeTime(event.time)} <b>·</b> {formatDepth(event.depth)}</span>
      </span>
      <span className="event-signals">
        {event.tsunami && <span className="signal tsunami" title="Tsunami flag"><Waves size={14} /> Tsunami</span>}
        {event.alert && <span className={`signal alert-${event.alert}`}><AlertTriangle size={13} /> {event.alert}</span>}
        <ArrowUpRight size={17} aria-hidden="true" />
      </span>
    </button>
  )
}

function EventDetail({ event, onClose }: { event: Earthquake; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const close = (keyboardEvent: KeyboardEvent) => keyboardEvent.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [event.id, onClose])

  return (
    <aside className="detail-panel" aria-label={`Details for ${event.title}`}>
      <div className="detail-top">
        <div>
          <span className="section-kicker">Selected event</span>
          <div className="detail-magnitude">{formatMagnitude(event.magnitude)}</div>
        </div>
        <button ref={closeRef} className="icon-button" onClick={onClose} aria-label="Close event details"><X /></button>
      </div>
      <p className={`assessment assessment-${magnitudeClass(event.magnitude)}`}><Gauge size={17} /> {significanceLabel(event)}</p>
      <h2>{event.place}</h2>
      <p className="detail-time"><Clock3 size={16} /> {formatLocalTime(event.time, event.longitude)}<br /><span>{formatDateTime(event.time)}</span></p>
      <div className="detail-grid">
        <div><span>Depth <Info size={12} /></span><strong>{event.depth == null ? 'Unavailable' : `${event.depth.toFixed(1)} km`}</strong><small>Distance below the surface</small></div>
        <div><span>Significance <Info size={12} /></span><strong>{event.significance?.toLocaleString() ?? 'Unavailable'}</strong><small>USGS combined impact indicator</small></div>
        <div><span>Felt reports</span><strong>{event.felt?.toLocaleString() ?? 'None reported'}</strong><small>Public reports received by USGS</small></div>
        <div><span>Review status</span><strong>{event.status === 'reviewed' ? 'Reviewed' : event.status || 'Unavailable'}</strong><small>{event.status === 'reviewed' ? 'Checked by a seismologist' : 'May still be revised'}</small></div>
      </div>
      <div className="coordinates"><MapPin size={16} /><span>{Math.abs(event.latitude).toFixed(3)}° {event.latitude >= 0 ? 'N' : 'S'}, {Math.abs(event.longitude).toFixed(3)}° {event.longitude >= 0 ? 'E' : 'W'}</span></div>
      <div className="detail-flags">
        <span className={event.alert ? `alert-${event.alert}` : ''}><AlertTriangle size={15} /> Alert: {event.alert || 'none issued'}</span>
        <span><Waves size={15} /> Tsunami flag: {event.tsunami ? 'yes' : 'no'}</span>
      </div>
      <div className="magnitude-note">
        <strong>{magnitudeLabel(event.magnitude)}</strong>
        <p>Magnitude measures energy released, not expected damage. Effects also depend on depth, distance, building conditions, and local geology.</p>
      </div>
      <a className="usgs-link" href={event.url} target="_blank" rel="noreferrer">Open official USGS event page <ExternalLink size={16} /></a>
      <p className="authority-note">For safety information, follow local authorities. This observatory does not predict earthquakes or provide emergency alerts.</p>
    </aside>
  )
}

function LoadingView() {
  return <div className="loading-shell" role="status"><div className="skeleton map-skeleton" /><div className="skeleton-lines">{Array.from({ length: 7 }).map((_, i) => <div className="skeleton" key={i} />)}</div><span className="sr-only">Loading live USGS earthquake data</span></div>
}

export default function App() {
  const initial = useMemo(() => readUrlFilters(), [])
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS, ...initial })
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId || null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map')
  const [shareStatus, setShareStatus] = useState('')
  const [clock, setClock] = useState(() => Date.now())
  const searchRef = useRef<HTMLInputElement>(null)
  const { events, generatedAt, fetchedAt, loading, refreshing, error, refresh } = useEarthquakes(filters.range)
  const filtered = useMemo(() => applyFilters(events, filters), [events, filters])
  const selected = events.find((event) => event.id === selectedId) || null
  const strongest = filtered.reduce<Earthquake | null>((best, event) => !best || (event.magnitude ?? -1) > (best.magnitude ?? -1) ? event : best, null)
  const filtersCount = activeFilterCount(filters)
  const isStale = Boolean(fetchedAt && clock - fetchedAt > 15 * 60_000)
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((current) => ({ ...current, [key]: value }))
  const selectEvent = (event: Earthquake) => {
    setSelectedId(event.id)
    window.requestAnimationFrame(() => document.getElementById(`event-${event.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
  }

  useEffect(() => {
    window.history.replaceState(null, '', buildUrl(filters, selectedId))
  }, [filters, selectedId])

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 60_000)
    const focusSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key === '/' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('keydown', focusSearch)
    }
  }, [])

  useEffect(() => {
    const onPopState = () => {
      const state = readUrlFilters()
      setFilters({ ...DEFAULT_FILTERS, ...state })
      setSelectedId(state.selectedId || null)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const resetFilters = () => setFilters((current) => ({ ...DEFAULT_FILTERS, range: current.range }))
  const share = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setShareStatus('Link copied')
    } catch {
      setShareStatus('Copy this page URL to share')
    }
    window.setTimeout(() => setShareStatus(''), 2500)
  }

  return (
    <div className="app-shell">
      <a href="#event-stream" className="skip-link">Skip to event stream</a>
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><span /><span /><span /></span><div><strong>Faultline</strong><small>Global seismic observatory</small></div></div>
        <nav className="range-tabs" aria-label="Time period">
          {(Object.keys(RANGE_LABELS) as TimeRange[]).map((range) => <button key={range} className={filters.range === range ? 'active' : ''} onClick={() => updateFilter('range', range)} aria-pressed={filters.range === range}>{RANGE_LABELS[range]}</button>)}
        </nav>
        <div className="top-actions">
          <div className={`live-status ${error || isStale ? 'stale' : ''}`}><i /> <span>{error ? 'Connection issue' : isStale ? 'Data may be stale' : 'Live USGS feed'}</span></div>
          <button className="icon-button" onClick={() => void refresh()} disabled={refreshing} aria-label="Refresh earthquake data"><RefreshCw className={refreshing ? 'spin' : ''} /></button>
          <button className="icon-button" onClick={() => void share()} aria-label="Copy shareable link"><Share2 /></button>
        </div>
      </header>

      <main>
        <section className="overview-head">
          <div className="headline">
            <span className="section-kicker">{RANGE_LABELS[filters.range]} · updated {generatedAt ? formatRelativeTime(generatedAt) : 'now'}</span>
            <h1>{strongest ? <><em>{formatMagnitude(strongest.magnitude)}</em> near {strongest.place}</> : 'Global earthquake activity'}</h1>
            <p>{strongest ? `${magnitudeLabel(strongest.magnitude)} · ${formatRelativeTime(strongest.time)} · ${formatDepth(strongest.depth)}` : 'Explore live seismic activity reported by the USGS.'}</p>
          </div>
          <div className="overview-summary" aria-label="Current result summary">
            <div><strong>{filtered.length.toLocaleString()}</strong><span>events shown</span></div>
            <div><strong>{filtered.filter((event) => (event.magnitude ?? 0) >= 4.5).length.toLocaleString()}</strong><span>M4.5 or greater</span></div>
            <div><strong>{filtered.filter((event) => event.depth != null && event.depth < 70).length.toLocaleString()}</strong><span>shallow events</span></div>
          </div>
        </section>

        <section className="control-deck" aria-label="Explore controls">
          <label className="search-box"><Search size={18} /><span className="sr-only">Search event locations</span><input ref={searchRef} value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} placeholder="Find a place in loaded events…" /><kbd>/</kbd></label>
          <button className={`filter-button ${filtersCount ? 'has-filters' : ''}`} onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen}><SlidersHorizontal size={17} /> Filters {filtersCount > 0 && <b>{filtersCount}</b>} <ChevronDown size={15} /></button>
          <label className="sort-control"><span>Sort</span><select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value as Filters['sort'])}><option value="significance">Most significant</option><option value="newest">Newest first</option><option value="magnitude">Highest magnitude</option><option value="depth">Shallowest first</option></select></label>
          {filtersCount > 0 && <button className="reset-button" onClick={resetFilters}><RotateCcw size={15} /> Reset</button>}
        </section>

        {filtersOpen && <section className="filter-panel" aria-label="Earthquake filters">
          <label>Minimum magnitude <output>{filters.minMagnitude.toFixed(1)}</output><input type="range" min="0" max="7" step="0.5" value={filters.minMagnitude} onChange={(e) => updateFilter('minMagnitude', Number(e.target.value))} /></label>
          <label>Maximum depth <output>{filters.maxDepth} km</output><input type="range" min="10" max="700" step="10" value={filters.maxDepth} onChange={(e) => updateFilter('maxDepth', Number(e.target.value))} /></label>
          <label>Geographic area<select value={filters.area} onChange={(e) => updateFilter('area', e.target.value as Filters['area'])}><option value="world">Worldwide</option><option value="ring-of-fire">Pacific Ring of Fire</option><option value="americas">Americas</option><option value="asia-pacific">Asia–Pacific</option><option value="europe-africa">Europe & Africa</option></select></label>
          <label>Alert level<select value={filters.alert} onChange={(e) => updateFilter('alert', e.target.value as Filters['alert'])}><option value="all">Any alert level</option><option value="green">Green</option><option value="yellow">Yellow</option><option value="orange">Orange</option><option value="red">Red</option></select></label>
          <label>Review status<select value={filters.review} onChange={(e) => updateFilter('review', e.target.value as Filters['review'])}><option value="all">Any status</option><option value="reviewed">Reviewed</option><option value="automatic">Automatic</option></select></label>
          <label className="check-control"><input type="checkbox" checked={filters.tsunamiOnly} onChange={(e) => updateFilter('tsunamiOnly', e.target.checked)} /><span><Waves size={16} /> Tsunami-flagged only</span></label>
        </section>}

        <div className="mobile-view-tabs" role="group" aria-label="Choose view"><button className={mobileView === 'map' ? 'active' : ''} onClick={() => setMobileView('map')}><MapIcon size={17} /> Map</button><button className={mobileView === 'list' ? 'active' : ''} onClick={() => setMobileView('list')}><List size={17} /> Events</button></div>

        {loading && !events.length ? <LoadingView /> : error && !events.length ? (
          <section className="error-state" role="alert"><AlertTriangle /><h2>Live data is unavailable</h2><p>{error}. Filters and view settings are preserved.</p><button onClick={() => void refresh()}><RefreshCw size={16} /> Try again</button></section>
        ) : (
          <div className={`workspace mobile-${mobileView}`}>
            <section className="map-panel" aria-label="Earthquake map">
              {error && <div className="data-banner" role="status"><AlertTriangle size={15} /> Refresh failed. Showing the last available data. <button onClick={() => void refresh()}>Retry</button></div>}
              {isStale && !error && <div className="data-banner" role="status"><Clock3 size={15} /> Displayed data was fetched {fetchedAt ? formatRelativeTime(fetchedAt) : 'earlier'} and may be stale.</div>}
              <SeismicMap events={filtered} selected={selected} hovered={hoveredId} onSelect={selectEvent} onHover={setHoveredId} />
            </section>
            <section className="stream-panel" id="event-stream" aria-labelledby="stream-title">
              <div className="stream-head"><div><span className="section-kicker">Event stream</span><h2 id="stream-title">{filtered.length.toLocaleString()} matching events</h2></div><Filter size={18} /></div>
              <div className="stream-body" aria-live="polite">
                {filtered.length ? filtered.map((event) => <EventRow key={event.id} event={event} selected={event.id === selectedId} hovered={event.id === hoveredId} onSelect={() => selectEvent(event)} onHover={setHoveredId} />) : <div className="empty-state"><Layers3 /><h3>No events match these constraints</h3><p>Try widening the magnitude or depth range, changing the area, or clearing the place search.</p><button onClick={resetFilters}><RotateCcw size={16} /> Reset filters</button></div>}
              </div>
            </section>
            {selected && <EventDetail event={selected} onClose={() => setSelectedId(null)} />}
          </div>
        )}

        {!loading && events.length > 0 && <ActivityTimeline events={filtered} selectedId={selectedId} range={filters.range} onSelect={selectEvent} />}
      </main>

      <footer><div><Globe2 size={16} /> Data: <a href="https://earthquake.usgs.gov/" target="_blank" rel="noreferrer">U.S. Geological Survey</a>. Reports are preliminary and may be revised.</div><div><CheckCircle2 size={15} /> Not an emergency alert service · <a href="https://www.usgs.gov/programs/earthquake-hazards" target="_blank" rel="noreferrer">About earthquake hazards</a></div></footer>
      <div className="sr-only" aria-live="polite">{refreshing ? 'Refreshing earthquake data' : shareStatus || (error ? `Data error: ${error}` : `${filtered.length} earthquake results`)}</div>
    </div>
  )
}
