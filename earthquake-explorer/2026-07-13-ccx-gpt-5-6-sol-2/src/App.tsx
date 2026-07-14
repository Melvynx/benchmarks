import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { AlertCircle, Check, ChevronDown, Crosshair, Filter, Globe2, LocateFixed, Menu, RefreshCw, RotateCcw, Search, Share2, SlidersHorizontal, WifiOff, X } from 'lucide-react'
import { EarthquakeMap } from './components/EarthquakeMap'
import { EventDetail } from './components/EventDetail'
import { EventStream } from './components/EventStream'
import { SeismicTimeline } from './components/SeismicTimeline'
import { useEarthquakeData } from './hooks/useEarthquakeData'
import {
  AREA_LABELS,
  DEFAULT_FILTERS,
  RANGE_LABELS,
  filterAndSort,
  filterCount,
  filtersFromUrl,
  formatMagnitude,
  formatRelativeTime,
  magnitudeLabel,
  significanceLabel,
  writeUrlState,
} from './lib/earthquakes'
import type { AlertLevel, FilterState, GeoArea, MapBounds, SortMode, TimeRange } from './types/earthquake'
import './styles.css'

const initialUrlState = filtersFromUrl()
const RANGE_OPTIONS: TimeRange[] = ['hour', 'day', 'week', 'month']
const ALERT_OPTIONS: { value: AlertLevel; label: string }[] = [
  { value: 'green', label: 'Green' }, { value: 'yellow', label: 'Yellow' },
  { value: 'orange', label: 'Orange' }, { value: 'red', label: 'Red' }, { value: 'none', label: 'None' },
]
const AREA_OPTIONS: GeoArea[] = ['world', 'americas', 'pacific', 'asia', 'europe', 'africa', 'oceania', 'viewport']
const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'significance', label: 'Most significant' },
  { value: 'newest', label: 'Newest first' },
  { value: 'magnitude', label: 'Highest magnitude' },
  { value: 'depth', label: 'Deepest first' },
  { value: 'felt', label: 'Most felt reports' },
]

function LoadingSkeleton() {
  return (
    <div className="loading-state" aria-label="Loading live USGS earthquake data" role="status">
      <div className="loading-state__map"><span className="loading-ripple" /><span className="loading-ripple loading-ripple--two" /></div>
      <div className="loading-state__copy">
        <p className="eyebrow">Connecting to USGS</p>
        <h2>Reading the latest global activity</h2>
        <p>Preparing map positions, magnitudes, depths, and event times.</p>
        <div className="loading-lines"><i /><i /><i /></div>
      </div>
    </div>
  )
}

function FilterPanel({ filters, setFilters, onReset, count, onClose }: {
  filters: FilterState
  setFilters: Dispatch<SetStateAction<FilterState>>
  onReset: () => void
  count: number
  onClose: () => void
}) {
  const toggleAlert = (alert: AlertLevel) => setFilters((current) => ({
    ...current,
    alerts: current.alerts.includes(alert) ? current.alerts.filter((item) => item !== alert) : [...current.alerts, alert],
  }))
  return (
    <div className="filter-panel" aria-label="Advanced earthquake filters">
      <header className="filter-panel__header">
        <div><p className="eyebrow">Refine the field</p><h2>Filters</h2></div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close filters" autoFocus><X size={20} /></button>
      </header>
      <div className="filter-panel__body">
        <fieldset className="filter-group">
          <legend>Minimum magnitude <strong>{filters.minMagnitude.toFixed(1)}+</strong></legend>
          <input type="range" min="0" max="7" step="0.5" value={filters.minMagnitude} aria-label="Minimum earthquake magnitude" aria-valuetext={`Magnitude ${filters.minMagnitude.toFixed(1)} or greater`} onChange={(event) => setFilters((current) => ({ ...current, minMagnitude: Number(event.target.value) }))} />
          <div className="range-labels"><span>All</span><span>4 notable</span><span>7 major</span></div>
          <p>Magnitude measures energy released. It does not by itself predict damage.</p>
        </fieldset>
        <fieldset className="filter-group">
          <legend>Maximum depth <strong>{filters.maxDepth >= 700 ? 'Any' : `${filters.maxDepth} km`}</strong></legend>
          <input type="range" min="10" max="700" step="10" value={filters.maxDepth} aria-label="Maximum earthquake depth" aria-valuetext={filters.maxDepth >= 700 ? 'Any depth' : `${filters.maxDepth} kilometers or shallower`} onChange={(event) => setFilters((current) => ({ ...current, maxDepth: Number(event.target.value) }))} />
          <div className="range-labels"><span>Shallow</span><span>300 km</span><span>Any depth</span></div>
          <p>Shallow earthquakes often produce stronger surface shaking nearby.</p>
        </fieldset>
        <fieldset className="filter-group">
          <legend>Alert level</legend>
          <p>USGS alert levels estimate potential impact after an event.</p>
          <div className="chip-grid">
            {ALERT_OPTIONS.map(({ value, label }) => <button key={value} type="button" className={`filter-chip alert-${value}${filters.alerts.includes(value) ? ' is-active' : ''}`} aria-pressed={filters.alerts.includes(value)} onClick={() => toggleAlert(value)}>{filters.alerts.includes(value) && <Check size={14} />} {label}</button>)}
          </div>
        </fieldset>
        <fieldset className="filter-group">
          <legend>Review status</legend>
          <div className="segmented segmented--wide">
            {(['all', 'reviewed', 'automatic'] as const).map((status) => <button key={status} type="button" className={filters.reviewStatus === status ? 'is-active' : ''} aria-pressed={filters.reviewStatus === status} onClick={() => setFilters((current) => ({ ...current, reviewStatus: status }))}>{status === 'all' ? 'Any' : status[0].toUpperCase() + status.slice(1)}</button>)}
          </div>
        </fieldset>
        <label className="switch-row">
          <span><strong>Tsunami flag only</strong><small>Events marked by USGS as tsunami-related</small></span>
          <input type="checkbox" checked={filters.tsunamiOnly} onChange={(event) => setFilters((current) => ({ ...current, tsunamiOnly: event.target.checked }))} />
          <i aria-hidden="true" />
        </label>
      </div>
      <footer className="filter-panel__footer">
        <button className="button button--ghost" type="button" onClick={onReset} disabled={count === 0}><RotateCcw size={17} /> Reset all</button>
        <button className="button button--primary" type="button" onClick={onClose}>Show results</button>
      </footer>
    </div>
  )
}

export default function App() {
  const [filters, setFilters] = useState<FilterState>(initialUrlState.filters)
  const [selectedId, setSelectedId] = useState<string | null>(initialUrlState.selectedId)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [bounds, setBounds] = useState<MapBounds | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'map' | 'stream'>('map')
  const [fitNonce, setFitNonce] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [now, setNow] = useState(() => Date.now())
  const { events, generatedAt, receivedAt, loading, refreshing, error, refresh } = useEarthquakeData(filters.timeRange)
  const filteredEvents = useMemo(() => filterAndSort(events, filters, bounds), [events, filters, bounds])
  const selected = selectedId ? events.find((event) => event.id === selectedId) ?? null : null
  const strongest = useMemo(() => filteredEvents.reduce<(typeof filteredEvents)[number] | null>((best, event) => !best || (event.magnitude ?? -1) > (best.magnitude ?? -1) ? event : best, null), [filteredEvents])
  const activeCount = filterCount(filters)
  const isOffline = !online
  const dataAge = receivedAt ? now - receivedAt : 0
  const isStale = dataAge > 15 * 60_000

  useEffect(() => writeUrlState(filters, selectedId), [filters, selectedId])
  useEffect(() => {
    const markOnline = () => setOnline(true)
    const markOffline = () => setOnline(false)
    const clock = window.setInterval(() => setNow(Date.now()), 60_000)
    window.addEventListener('online', markOnline)
    window.addEventListener('offline', markOffline)
    return () => {
      window.clearInterval(clock)
      window.removeEventListener('online', markOnline)
      window.removeEventListener('offline', markOffline)
    }
  }, [])
  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(timeout)
  }, [toast])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (filtersOpen) setFiltersOpen(false)
        else if (selectedId) setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [filtersOpen, selectedId])

  const resetFilters = () => setFilters((current) => ({ ...DEFAULT_FILTERS, timeRange: current.timeRange }))
  const selectEvent = (id: string) => {
    setSelectedId(id)
    if (window.innerWidth < 760) setMobileView('map')
  }
  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share && window.innerWidth < 760) {
        await navigator.share({ title: selected ? selected.title : 'Tectonic earthquake view', url })
        setToast('Share sheet opened')
        return
      }
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url)
      else {
        const field = document.createElement('textarea')
        field.value = url
        field.style.position = 'fixed'
        field.style.opacity = '0'
        document.body.appendChild(field)
        field.select()
        document.execCommand('copy')
        field.remove()
      }
      setToast('Link copied to clipboard')
    } catch (shareError) {
      if ((shareError as DOMException)?.name !== 'AbortError') setToast('Copy this page address to share the view')
    }
  }

  return (
    <div className={`app${selected ? ' has-detail' : ''}`}>
      <a className="skip-link" href="#event-stream">Skip to event stream</a>
      <header className="topbar">
        <a href="/" className="brand" aria-label="Tectonic earthquake observatory home">
          <span className="brand__mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>TECTONIC</strong><small>LIVE EARTH OBSERVATORY</small></span>
        </a>
        <div className="topbar__status" role="status" aria-live="polite">
          <span className={`live-indicator${error ? ' is-error' : refreshing ? ' is-refreshing' : ''}`} />
          <span>{error ? 'Live connection interrupted' : refreshing ? 'Refreshing USGS data' : `USGS · updated ${generatedAt ? formatRelativeTime(generatedAt) : 'pending'}`}</span>
        </div>
        <div className="topbar__actions">
          <button className="button button--quiet" type="button" onClick={() => void share()}><Share2 size={17} /><span>Share view</span></button>
          <button className="button button--quiet" type="button" onClick={() => void refresh()} disabled={refreshing} aria-label={refreshing ? 'Refreshing earthquake data' : 'Refresh earthquake data'}><RefreshCw className={refreshing ? 'spin' : ''} size={17} /><span>Refresh</span></button>
          <button className="icon-button mobile-menu" type="button" onClick={() => setFiltersOpen(true)} aria-label="Open filters"><Menu size={20} /></button>
        </div>
      </header>

      <main>
        <section className="command-deck" aria-labelledby="overview-title">
          <div className="command-deck__story">
            <p className="eyebrow">Global field report · {RANGE_LABELS[filters.timeRange]}</p>
            <h1 id="overview-title">Earth in motion, <span>as it happens.</span></h1>
            {strongest ? (
              <button className="lead-event" type="button" onClick={() => selectEvent(strongest.id)}>
                <span className={`lead-event__mag magnitude-${strongest.magnitude !== null && strongest.magnitude >= 6 ? 'major' : strongest.magnitude !== null && strongest.magnitude >= 5 ? 'strong' : strongest.magnitude !== null && strongest.magnitude >= 4 ? 'moderate' : 'minor'}`}>{formatMagnitude(strongest.magnitude)}</span>
                <span><small>Strongest in view · {magnitudeLabel(strongest.magnitude)}</small><strong>{strongest.place}</strong><em>{formatRelativeTime(strongest.time)} · {significanceLabel(strongest.significance)}</em></span>
                <ChevronDown size={18} aria-hidden="true" />
              </button>
            ) : <p className="command-deck__empty-lead">No event currently matches every active constraint.</p>}
          </div>
          <div className="command-deck__metrics" aria-label="Current activity summary">
            <div><span>Matching</span><strong>{filteredEvents.length.toLocaleString()}</strong><small>of {events.length.toLocaleString()} loaded</small></div>
            <div><span>Magnitude 4+</span><strong>{filteredEvents.filter((event) => (event.magnitude ?? 0) >= 4).length.toLocaleString()}</strong><small>notable energy release</small></div>
            <div><span>Shallow</span><strong>{filteredEvents.filter((event) => event.depth <= 70).length.toLocaleString()}</strong><small>70 km deep or less</small></div>
          </div>
        </section>

        <section className="controls" aria-label="Earthquake search and controls">
          <div className="segmented time-selector" aria-label="Time range">
            {RANGE_OPTIONS.map((range) => <button key={range} type="button" className={filters.timeRange === range ? 'is-active' : ''} aria-pressed={filters.timeRange === range} onClick={() => setFilters((current) => ({ ...current, timeRange: range }))}>{RANGE_LABELS[range]}</button>)}
          </div>
          <label className="search-field">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Search loaded places or regions</span>
            <input type="search" value={filters.query} placeholder="Search loaded places or regions" onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} />
            {filters.query && <button type="button" onClick={() => setFilters((current) => ({ ...current, query: '' }))} aria-label="Clear place search"><X size={15} /></button>}
          </label>
          <label className="select-field"><Globe2 size={17} aria-hidden="true" /><span className="sr-only">Geographic area</span><select value={filters.area} onChange={(event) => setFilters((current) => ({ ...current, area: event.target.value as GeoArea }))}>{AREA_OPTIONS.map((area) => <option key={area} value={area}>{AREA_LABELS[area]}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></label>
          <label className="select-field sort-field"><span className="sr-only">Sort earthquake events</span><select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as SortMode }))}>{SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></label>
          <button className={`button button--filter${activeCount ? ' is-active' : ''}`} type="button" onClick={() => setFiltersOpen(true)} aria-expanded={filtersOpen}><SlidersHorizontal size={17} /> Filters {activeCount > 0 && <span>{activeCount}</span>}</button>
          {activeCount > 0 && <button className="button button--reset" type="button" onClick={resetFilters}><RotateCcw size={16} /> Reset</button>}
        </section>
        {activeCount > 0 && (
          <div className="active-filters" aria-label="Active filters">
            <span>Active field</span>
            {filters.minMagnitude !== DEFAULT_FILTERS.minMagnitude && <button type="button" onClick={() => setFilters((current) => ({ ...current, minMagnitude: DEFAULT_FILTERS.minMagnitude }))}>M {filters.minMagnitude.toFixed(1)}+ <X size={12} /></button>}
            {filters.maxDepth !== DEFAULT_FILTERS.maxDepth && <button type="button" onClick={() => setFilters((current) => ({ ...current, maxDepth: DEFAULT_FILTERS.maxDepth }))}>≤ {filters.maxDepth} km <X size={12} /></button>}
            {filters.alerts.length > 0 && <button type="button" onClick={() => setFilters((current) => ({ ...current, alerts: [] }))}>{filters.alerts.join(', ')} alerts <X size={12} /></button>}
            {filters.tsunamiOnly && <button type="button" onClick={() => setFilters((current) => ({ ...current, tsunamiOnly: false }))}>Tsunami flag <X size={12} /></button>}
            {filters.reviewStatus !== 'all' && <button type="button" onClick={() => setFilters((current) => ({ ...current, reviewStatus: 'all' }))}>{filters.reviewStatus} <X size={12} /></button>}
            {filters.area !== 'world' && <button type="button" onClick={() => setFilters((current) => ({ ...current, area: 'world' }))}>{AREA_LABELS[filters.area]} <X size={12} /></button>}
            {filters.query.trim() && <button type="button" onClick={() => setFilters((current) => ({ ...current, query: '' }))}>“{filters.query.trim()}” <X size={12} /></button>}
          </div>
        )}

        {(error || isOffline || isStale) && events.length > 0 && (
          <div className={`data-banner${error ? ' data-banner--error' : ''}`} role="status">
            {isOffline ? <WifiOff size={18} /> : error ? <AlertCircle size={18} /> : <RefreshCw size={18} />}
            <div><strong>{isOffline ? 'You are offline' : error ? 'Live refresh failed' : 'Displayed data may be stale'}</strong><span>Showing preserved USGS data received {receivedAt ? formatRelativeTime(receivedAt) : 'earlier'}. Filters and selection remain available.</span></div>
            <button type="button" onClick={() => void refresh()}>Retry</button>
          </div>
        )}

        {loading ? <LoadingSkeleton /> : error && events.length === 0 ? (
          <div className="fatal-state" role="alert">
            <AlertCircle size={30} />
            <p className="eyebrow">USGS connection unavailable</p>
            <h2>Live earthquake data could not be reached</h2>
            <p>{error} No fictional data has been substituted. Check your connection, then try again.</p>
            <button className="button button--primary" type="button" onClick={() => void refresh()}><RefreshCw size={17} /> Retry live data</button>
          </div>
        ) : (
          <>
            <div className="mobile-view-switcher segmented" aria-label="Mobile content view">
              <button type="button" className={mobileView === 'map' ? 'is-active' : ''} onClick={() => setMobileView('map')}>Map</button>
              <button type="button" className={mobileView === 'stream' ? 'is-active' : ''} onClick={() => setMobileView('stream')}>Event stream</button>
            </div>
            <section className={`atlas ${mobileView === 'stream' ? 'show-stream' : 'show-map'}`} aria-label="Synchronized earthquake map and event stream">
              <div className="atlas__map">
                <EarthquakeMap events={filteredEvents} selectedId={selectedId} hoveredId={hoveredId} onSelect={selectEvent} onHover={setHoveredId} onBoundsChange={setBounds} fitNonce={fitNonce} />
                <div className="map-toolbar">
                  <button type="button" onClick={() => setFitNonce((value) => value + 1)}><Crosshair size={16} /> Fit events</button>
                  <button type="button" onClick={() => setFilters((current) => ({ ...current, area: current.area === 'viewport' ? 'world' : 'viewport' }))} className={filters.area === 'viewport' ? 'is-active' : ''} aria-pressed={filters.area === 'viewport'}><LocateFixed size={16} /> {filters.area === 'viewport' ? 'Following map' : 'Filter to map'}</button>
                </div>
              </div>
              <div className="atlas__stream" id="event-stream">
                {filteredEvents.length > 0 ? <EventStream events={filteredEvents} selectedId={selectedId} hoveredId={hoveredId} onSelect={selectEvent} onHover={setHoveredId} /> : (
                  <div className="empty-state">
                    <Filter size={28} />
                    <p className="eyebrow">No events in this field</p>
                    <h2>Your filters leave no earthquakes to show</h2>
                    <p>Try lowering the minimum magnitude, increasing depth, choosing a wider area, or clearing the place search.</p>
                    <button className="button button--primary" type="button" onClick={resetFilters}><RotateCcw size={17} /> Reset filters</button>
                  </div>
                )}
              </div>
            </section>
            <SeismicTimeline events={filteredEvents} selectedId={selectedId} hoveredId={hoveredId} onSelect={selectEvent} onHover={setHoveredId} />
          </>
        )}
      </main>

      {selected && <EventDetail event={selected} onClose={() => setSelectedId(null)} onShare={() => void share()} />}
      {filtersOpen && <div className="filter-overlay" role="dialog" aria-modal="true" aria-label="Earthquake filters" onMouseDown={(event) => { if (event.target === event.currentTarget) setFiltersOpen(false) }}><FilterPanel filters={filters} setFilters={setFilters} onReset={resetFilters} count={activeCount} onClose={() => setFiltersOpen(false)} /></div>}
      {toast && <div className="toast" role="status"><Check size={16} /> {toast}</div>}
      <div className="sr-only" aria-live="polite">{refreshing ? 'Refreshing earthquake data.' : `${filteredEvents.length} earthquake events match the current filters.`}{selected ? ` Selected magnitude ${formatMagnitude(selected.magnitude)} near ${selected.place}.` : ''}</div>
      <footer className="site-footer"><span>Live data: <a href="https://earthquake.usgs.gov/" target="_blank" rel="noreferrer">U.S. Geological Survey</a></span><span>Data is preliminary and may be revised. This product does not predict earthquakes or guarantee safety.</span></footer>
    </div>
  )
}
