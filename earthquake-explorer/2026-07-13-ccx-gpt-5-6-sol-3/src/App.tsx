import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  Clock3,
  Crosshair,
  Filter,
  Layers3,
  List,
  LocateFixed,
  Map as MapIcon,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  Waves,
  X,
} from 'lucide-react'
import { MapView } from './MapView'
import { Timeline } from './Timeline'
import {
  DEFAULT_FILTERS,
  FEEDS,
  RANGE_LABELS,
  cacheFeed,
  depthBand,
  filterEvents,
  formatDateTime,
  formatDepth,
  formatMagnitude,
  formatRelativeTime,
  formatUtc,
  loadCachedFeed,
  magnitudeLabel,
  parseUrlState,
  percentileContext,
  writeUrlState,
} from './data'
import type { EarthquakeFeature, EarthquakeFeed, FilterState, MapBounds, TimeRange } from './types'

const initialState = parseUrlState()

function updateFilter<K extends keyof FilterState>(filters: FilterState, key: K, value: FilterState[K]): FilterState {
  return { ...filters, [key]: value }
}

function statusCopy(event: EarthquakeFeature) {
  if (event.properties.alert === 'red') return 'Red impact alert issued by USGS models'
  if (event.properties.alert === 'orange') return 'Orange impact alert issued by USGS models'
  if (event.properties.alert === 'yellow') return 'Yellow impact alert issued by USGS models'
  if (event.properties.alert === 'green') return 'Green impact alert issued by USGS models'
  if ((event.properties.mag ?? 0) >= 6) return 'Large magnitude; impact depends on depth, distance, and local conditions'
  if ((event.properties.mag ?? 0) >= 4.5) return 'Notable event in the current activity window'
  return 'Routine event within the current activity window'
}

function TimeTabs({ value, onChange }: { value: TimeRange; onChange: (range: TimeRange) => void }) {
  return (
    <div className="time-tabs" aria-label="Activity period">
      {(Object.keys(RANGE_LABELS) as TimeRange[]).map((range) => (
        <button
          key={range}
          type="button"
          className={value === range ? 'is-active' : ''}
          aria-pressed={value === range}
          onClick={() => onChange(range)}
        >
          {range === 'hour' ? '1H' : range === 'day' ? '24H' : range === 'week' ? '7D' : '30D'}
          <span>{RANGE_LABELS[range]}</span>
        </button>
      ))}
    </div>
  )
}

interface FilterPanelProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  resultCount: number
  totalCount: number
  onClose?: () => void
}

function FilterPanel({ filters, onChange, resultCount, totalCount, onClose }: FilterPanelProps) {
  return (
    <div className="filter-panel">
      <div className="filter-panel-heading">
        <div>
          <p className="eyebrow">Refine the field</p>
          <h2>Filters</h2>
        </div>
        {onClose && <button className="icon-button" type="button" onClick={onClose} aria-label="Close filters"><X /></button>}
      </div>

      <label className="field search-field">
        <span>Place or region</span>
        <div><Search aria-hidden="true" /><input value={filters.query} onChange={(event) => onChange(updateFilter(filters, 'query', event.target.value))} placeholder="Japan, Alaska, ridge…" /></div>
        <small>Searches locations named by USGS in the loaded feed.</small>
      </label>

      <fieldset className="field magnitude-filter">
        <legend>Minimum magnitude <button className="term-help" type="button" title="Magnitude measures energy released at the source. It does not predict damage."><CircleHelp /><span className="sr-only">About magnitude</span></button></legend>
        <div className="magnitude-value">M {filters.minMagnitude.toFixed(1)}+</div>
        <input type="range" min="-1" max="7" step="0.5" value={filters.minMagnitude} onChange={(event) => onChange(updateFilter(filters, 'minMagnitude', Number(event.target.value)))} aria-label={`Minimum magnitude ${filters.minMagnitude.toFixed(1)}`} />
        <div className="range-labels"><span>All</span><span>4.0</span><span>7.0+</span></div>
      </fieldset>

      <fieldset className="field">
        <legend>Depth <button className="term-help" type="button" title="Depth is how far below the surface an earthquake begins. Shallow events often produce stronger surface shaking nearby."><CircleHelp /><span className="sr-only">About depth</span></button></legend>
        <div className="segmented vertical-on-narrow">
          {(['all', 'shallow', 'intermediate', 'deep'] as const).map((depth) => (
            <button type="button" key={depth} aria-pressed={filters.depth === depth} className={filters.depth === depth ? 'is-active' : ''} onClick={() => onChange(updateFilter(filters, 'depth', depth))}>
              {depth === 'all' ? 'Any' : depth === 'shallow' ? '<70 km' : depth === 'intermediate' ? '70–300' : '300+ km'}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="two-fields">
        <label className="field"><span>USGS alert</span><select value={filters.alert} onChange={(event) => onChange(updateFilter(filters, 'alert', event.target.value as FilterState['alert']))}><option value="all">Any alert</option><option value="none">No alert</option><option value="green">Green</option><option value="yellow">Yellow</option><option value="orange">Orange</option><option value="red">Red</option></select></label>
        <label className="field"><span>Tsunami flag</span><select value={filters.tsunami} onChange={(event) => onChange(updateFilter(filters, 'tsunami', event.target.value as FilterState['tsunami']))}><option value="all">Either</option><option value="yes">Flagged</option><option value="no">Not flagged</option></select></label>
      </div>

      <div className="two-fields">
        <label className="field"><span>Review status</span><select value={filters.status} onChange={(event) => onChange(updateFilter(filters, 'status', event.target.value as FilterState['status']))}><option value="all">Any status</option><option value="reviewed">Reviewed</option><option value="automatic">Automatic</option></select></label>
        <label className="field"><span>Geographic area</span><select value={filters.area} onChange={(event) => onChange(updateFilter(filters, 'area', event.target.value as FilterState['area']))}><option value="world">Whole world</option><option value="viewport">Visible map</option></select></label>
      </div>

      <div className="filter-panel-footer">
        <p><strong>{resultCount.toLocaleString()}</strong> of {totalCount.toLocaleString()} events</p>
        <button type="button" className="text-button" onClick={() => onChange({ ...DEFAULT_FILTERS, range: filters.range })}><RotateCcw /> Reset filters</button>
      </div>
    </div>
  )
}

function EventRow({ event, selected, hovered, highlighted, onSelect, onHover }: { event: EarthquakeFeature; selected: boolean; hovered: boolean; highlighted: boolean; onSelect: () => void; onHover: (id: string | null) => void }) {
  const depth = event.geometry.coordinates[2]
  return (
    <li>
      <button
        type="button"
        className={`event-row ${selected ? 'is-selected' : ''} ${hovered ? 'is-hovered' : ''} ${!highlighted ? 'is-muted' : ''}`}
        onClick={onSelect}
        onMouseEnter={() => onHover(event.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(event.id)}
        onBlur={() => onHover(null)}
        aria-current={selected ? 'true' : undefined}
      >
        <span className={`event-mag depth-${depthBand(depth).toLowerCase()}`}><b>{formatMagnitude(event.properties.mag)}</b><small>MAG</small></span>
        <span className="event-copy">
          <strong>{event.properties.place ?? 'Location pending review'}</strong>
          <span><Clock3 /> {formatRelativeTime(event.properties.time)} <i /> {formatDepth(depth)}</span>
          <span className="event-tags">
            {event.properties.alert && <em className={`status-tag alert-${event.properties.alert}`}>{event.properties.alert} alert</em>}
            {event.properties.tsunami === 1 && <em className="status-tag tsunami"><Waves /> tsunami flag</em>}
            {event.properties.status === 'reviewed' && <em className="status-tag reviewed"><ShieldCheck /> reviewed</em>}
          </span>
        </span>
        <span className="event-sig"><small>SIG</small><b>{event.properties.sig}</b></span>
      </button>
    </li>
  )
}

function EventDetail({ event, allEvents, onClose }: { event: EarthquakeFeature; allEvents: EarthquakeFeature[]; onClose: () => void }) {
  const [longitude, latitude, depth] = event.geometry.coordinates
  const descriptionId = `event-detail-${event.id}`
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') onClose()
      if (keyEvent.key !== 'Tab') return
      const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button, a, summary, [tabindex]:not([tabindex="-1"])') ?? [])
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (keyEvent.shiftKey && document.activeElement === first) { keyEvent.preventDefault(); last.focus() }
      else if (!keyEvent.shiftKey && document.activeElement === last) { keyEvent.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <aside ref={panelRef} className="event-detail" role="dialog" aria-modal="true" aria-labelledby={descriptionId}>
      <div className="detail-topline">
        <span>Event record · {event.id}</span>
        <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label="Close event details"><X /></button>
      </div>
      <div className="detail-hero">
        <div className={`detail-magnitude depth-${depthBand(depth).toLowerCase()}`}><small>Magnitude</small><strong>{formatMagnitude(event.properties.mag)}</strong><span>{event.properties.magType?.toUpperCase() ?? 'Type pending'}</span></div>
        <div><p className="eyebrow">{magnitudeLabel(event.properties.mag)}</p><h2 id={descriptionId}>{event.properties.place ?? 'Location pending review'}</h2><p className="detail-context">{percentileContext(event, allEvents)}</p></div>
      </div>

      <div className={`assessment ${event.properties.alert ? `alert-${event.properties.alert}` : ''}`}>
        <AlertTriangle aria-hidden="true" />
        <div><strong>{statusCopy(event)}</strong><p>Magnitude alone does not determine damage. Depth, distance, construction, and local ground conditions also matter.</p></div>
      </div>

      <dl className="detail-grid">
        <div><dt>Local time</dt><dd>{formatDateTime(event.properties.time)}</dd></div>
        <div><dt>Universal time</dt><dd>{formatUtc(event.properties.time)}</dd></div>
        <div><dt>Depth</dt><dd>{formatDepth(depth)} <small>{depthBand(depth)}</small></dd></div>
        <div><dt>Significance</dt><dd>{event.properties.sig} <small>USGS combined measure</small></dd></div>
        <div><dt>Felt reports</dt><dd>{event.properties.felt == null ? 'Not reported' : event.properties.felt.toLocaleString()}</dd></div>
        <div><dt>Review</dt><dd>{event.properties.status === 'reviewed' ? 'Reviewed by an analyst' : 'Automatic solution'}</dd></div>
        <div><dt>Impact alert</dt><dd>{event.properties.alert ? `${event.properties.alert[0].toUpperCase()}${event.properties.alert.slice(1)} PAGER alert` : 'No PAGER alert issued'}</dd></div>
        <div><dt>Tsunami</dt><dd>{event.properties.tsunami === 1 ? 'USGS feed flag present' : 'No flag in USGS feed'}</dd></div>
        <div className="coordinates"><dt>Coordinates</dt><dd>{latitude.toFixed(4)}°, {longitude.toFixed(4)}°</dd></div>
        <div><dt>Last revised</dt><dd>{formatRelativeTime(event.properties.updated)}</dd></div>
      </dl>

      <div className="detail-notes">
        <details><summary>What does “significance” mean?</summary><p>USGS significance combines magnitude with factors such as felt reports, estimated intensity, and alert level. It is useful for ranking attention, not predicting harm.</p></details>
        <details><summary>Data status and safety</summary><p>Earthquake solutions can change as more observations arrive. This observatory is not an emergency alert service. Follow official local authorities for safety information.</p></details>
      </div>

      <a className="primary-link" href={event.properties.url} target="_blank" rel="noreferrer">Open official USGS event page <ArrowUpRight /></a>
    </aside>
  )
}

function ActiveFilters({ filters, onChange }: { filters: FilterState; onChange: (filters: FilterState) => void }) {
  const chips: { key: keyof FilterState; label: string; reset: FilterState[keyof FilterState] }[] = []
  if (filters.minMagnitude !== DEFAULT_FILTERS.minMagnitude) chips.push({ key: 'minMagnitude', label: `M ${filters.minMagnitude.toFixed(1)}+`, reset: DEFAULT_FILTERS.minMagnitude })
  if (filters.depth !== 'all') chips.push({ key: 'depth', label: `${filters.depth} depth`, reset: 'all' })
  if (filters.alert !== 'all') chips.push({ key: 'alert', label: `${filters.alert} alert`, reset: 'all' })
  if (filters.tsunami !== 'all') chips.push({ key: 'tsunami', label: filters.tsunami === 'yes' ? 'Tsunami flagged' : 'No tsunami flag', reset: 'all' })
  if (filters.status !== 'all') chips.push({ key: 'status', label: filters.status, reset: 'all' })
  if (filters.query) chips.push({ key: 'query', label: `“${filters.query}”`, reset: '' })
  if (filters.area !== 'world') chips.push({ key: 'area', label: 'Visible map only', reset: 'world' })
  if (!chips.length) return null
  return <div className="active-filters" aria-label="Active filters">{chips.map((chip) => <button key={chip.key} type="button" onClick={() => onChange({ ...filters, [chip.key]: chip.reset })}>{chip.label}<X /></button>)}<button className="clear-all" type="button" onClick={() => onChange({ ...DEFAULT_FILTERS, range: filters.range })}>Clear all</button></div>
}

export default function App() {
  const [filters, setFilters] = useState<FilterState>(initialState.filters)
  const [feed, setFeed] = useState<EarthquakeFeed | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(initialState.selectedId)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [highlightedIds, setHighlightedIds] = useState<Set<string> | null>(null)
  const [bounds, setBounds] = useState<MapBounds | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(!navigator.onLine)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map')
  const [visibleRows, setVisibleRows] = useState(120)
  const [fitSignal, setFitSignal] = useState(0)
  const [copied, setCopied] = useState(false)
  const [clock, setClock] = useState(Date.now())
  const abortRef = useRef<AbortController | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const filterReturnFocusRef = useRef<HTMLElement | null>(null)
  const filterSheetRef = useRef<HTMLDivElement | null>(null)

  const fetchData = useCallback(async (range: TimeRange, background = false) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    background ? setRefreshing(true) : setLoading(true)
    setError(null)
    try {
      const response = await fetch(FEEDS[range], { signal: controller.signal, cache: 'no-store' })
      if (!response.ok) throw new Error(`USGS returned ${response.status}`)
      const nextFeed = await response.json() as EarthquakeFeed
      if (!Array.isArray(nextFeed.features)) throw new Error('Unexpected USGS response')
      setFeed(nextFeed)
      cacheFeed(range, nextFeed)
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return
      const cached = loadCachedFeed(range)
      if (cached) setFeed(cached)
      setError(cached ? 'Live refresh failed. Showing the most recent saved USGS data.' : 'Live USGS data could not be loaded. Check your connection and try again.')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    setFeed(null)
    setError(null)
    fetchData(filters.range)
    setVisibleRows(120)
    return () => abortRef.current?.abort()
  }, [filters.range, fetchData])

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 30_000)
    const online = () => { setOffline(false); fetchData(filters.range, Boolean(feed)) }
    const offlineHandler = () => setOffline(true)
    window.addEventListener('online', online)
    window.addEventListener('offline', offlineHandler)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offlineHandler)
    }
  }, [feed, filters.range, fetchData])

  useEffect(() => writeUrlState(filters, selectedId), [filters, selectedId])

  useEffect(() => {
    if (!filtersOpen) return
    const sheet = filterSheetRef.current
    const focusable = () => Array.from(sheet?.querySelectorAll<HTMLElement>('button, input, select, [href], [tabindex]:not([tabindex="-1"])') ?? [])
    focusable()[0]?.focus()
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFiltersOpen(false)
      if (event.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', handleDialogKeys)
    return () => {
      window.removeEventListener('keydown', handleDialogKeys)
      window.setTimeout(() => filterReturnFocusRef.current?.focus(), 0)
    }
  }, [filtersOpen])

  const filteredEvents = useMemo(() => filterEvents(feed?.features ?? [], filters, bounds), [feed, filters, bounds])
  const selectedEvent = useMemo(() => (feed?.features ?? []).find((event) => event.id === selectedId) ?? null, [feed, selectedId])
  const strongest = useMemo(() => [...filteredEvents].sort((a, b) => (b.properties.mag ?? -10) - (a.properties.mag ?? -10))[0] ?? null, [filteredEvents])
  const recentCount = filteredEvents.filter((event) => clock - event.properties.time <= 24 * 60 * 60 * 1000).length
  const oldestHalf = filteredEvents.filter((event) => event.properties.time < clock - ({ hour: 30, day: 12 * 60, week: 3.5 * 24 * 60, month: 15 * 24 * 60 }[filters.range]) * 60_000).length
  const newerHalf = filteredEvents.length - oldestHalf
  const trend = oldestHalf === 0 ? null : Math.round(((newerHalf - oldestHalf) / oldestHalf) * 100)
  const activeFilterCount = [filters.minMagnitude !== DEFAULT_FILTERS.minMagnitude, filters.depth !== 'all', filters.alert !== 'all', filters.tsunami !== 'all', filters.status !== 'all', Boolean(filters.query), filters.area !== 'world'].filter(Boolean).length
  const staleMinutes = feed ? Math.max(0, Math.floor((clock - feed.metadata.generated) / 60_000)) : 0
  const isStale = staleMinutes > 30

  const selectEvent = useCallback((event: EarthquakeFeature) => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setSelectedId(event.id)
    setMobileView('map')
  }, [])
  const closeDetail = useCallback(() => {
    setSelectedId(null)
    window.setTimeout(() => returnFocusRef.current?.focus(), 0)
  }, [])
  const updateBounds = useCallback((nextBounds: MapBounds) => setBounds(nextBounds), [])
  const updateHighlight = useCallback((ids: Set<string> | null) => setHighlightedIds(ids), [])

  const share = async () => {
    const shareData = { title: selectedEvent?.properties.title ?? 'Seismic Field', text: selectedEvent ? `${selectedEvent.properties.title} on Seismic Field` : `Explore ${filteredEvents.length} recent earthquakes on Seismic Field`, url: window.location.href }
    try {
      if (navigator.share) await navigator.share(shareData)
      else {
        await navigator.clipboard.writeText(window.location.href)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // Sharing can be dismissed without changing the exploration state.
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Seismic Field home"><span className="brand-mark"><i /><i /><i /></span><span><strong>Seismic Field</strong><small>Live earthquake observatory</small></span></a>
        <TimeTabs value={filters.range} onChange={(range) => setFilters(updateFilter(filters, 'range', range))} />
        <div className="header-actions">
          <button className="header-button" type="button" onClick={() => fetchData(filters.range, Boolean(feed))} disabled={refreshing}><RefreshCw className={refreshing ? 'is-spinning' : ''} /><span>{refreshing ? 'Refreshing' : 'Refresh'}</span></button>
          <button className="header-button" type="button" onClick={share}><Share2 /><span>{copied ? 'Link copied' : 'Share'}</span></button>
        </div>
      </header>

      <div className="data-status" role="status" aria-live="polite">
        <span className={error || offline || isStale ? 'status-dot is-warning' : 'status-dot'} />
        {loading && !feed ? 'Connecting to the USGS live feed…' : error ?? (offline ? `Offline · showing data generated ${formatRelativeTime(feed?.metadata.generated ?? clock, clock)}` : `USGS feed generated ${formatRelativeTime(feed?.metadata.generated ?? clock, clock)}${isStale ? ' · data may be stale' : ''}`)}
        <span>Earthquake records may be revised.</span>
        {(error || offline || isStale) && <button type="button" onClick={() => fetchData(filters.range, Boolean(feed))}>Try live refresh</button>}
      </div>

      <main>
        <section className="observation-header" aria-labelledby="page-title">
          <div className="observation-copy">
            <p className="eyebrow">Global field · {RANGE_LABELS[filters.range]}</p>
            <h1 id="page-title">The ground in motion, <em>right now.</em></h1>
            <p>Explore verified and automatic earthquake records as they arrive. Select any signal to connect its place, time, depth, and significance.</p>
          </div>
          <div className="field-summary" aria-label="Current activity summary">
            <div><small>In view</small><strong>{filteredEvents.length.toLocaleString()}</strong><span>of {(feed?.features.length ?? 0).toLocaleString()} loaded</span></div>
            <div><small>Past 24 hours</small><strong>{recentCount.toLocaleString()}</strong><span>matching events</span></div>
            <div className="strongest-summary"><small>Strongest in view</small>{strongest ? <button type="button" onClick={() => selectEvent(strongest)}><strong>M{formatMagnitude(strongest.properties.mag)}</strong><span>{strongest.properties.place ?? 'Location pending'}</span></button> : <strong>—</strong>}</div>
            <div><small>Activity balance</small><strong>{trend == null ? '—' : `${trend > 0 ? '+' : ''}${trend}%`}</strong><span>newer vs earlier half</span></div>
          </div>
        </section>

        <Timeline events={filteredEvents} range={filters.range} selectedEvent={selectedEvent} onHighlight={updateHighlight} />

        <div className="mobile-view-switch" aria-label="Choose primary view">
          <button type="button" className={mobileView === 'map' ? 'is-active' : ''} onClick={() => setMobileView('map')}><MapIcon /> Map</button>
          <button type="button" className={mobileView === 'list' ? 'is-active' : ''} onClick={() => setMobileView('list')}><List /> Events <span>{filteredEvents.length}</span></button>
        </div>

        <section className="explorer" aria-label="Earthquake explorer">
          <aside className="filters-column">
            <FilterPanel filters={filters} onChange={setFilters} resultCount={filteredEvents.length} totalCount={feed?.features.length ?? 0} />
            <div className="source-note"><ShieldCheck /><p><strong>Public information, not an alert service.</strong> Data comes from the USGS and can change. For urgent guidance, follow local authorities.</p></div>
          </aside>

          <div className={`map-column ${mobileView === 'map' ? 'is-mobile-active' : ''}`}>
            <div className="map-toolbar">
              <button type="button" onClick={() => { filterReturnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setFiltersOpen(true) }}><Filter /> Filters {activeFilterCount > 0 && <span>{activeFilterCount}</span>}</button>
              <button type="button" onClick={() => setFitSignal((value) => value + 1)} disabled={filteredEvents.length === 0}><LocateFixed /> Fit results</button>
              <button type="button" className={filters.area === 'viewport' ? 'is-active' : ''} aria-pressed={filters.area === 'viewport'} onClick={() => setFilters(updateFilter(filters, 'area', filters.area === 'viewport' ? 'world' : 'viewport'))}><Crosshair /> Visible area</button>
            </div>
            {loading && !feed ? <div className="map-loading" aria-label="Loading map data"><div className="contour-loader"><i /><i /><i /></div><strong>Reading the seismic field</strong><span>Connecting to live USGS observations…</span></div> : filteredEvents.length === 0 ? <div className="empty-map"><Layers3 /><h2>No signals match this field</h2><p>These constraints exclude all loaded events. Clear filters or expand the map area to recover the view.</p><button type="button" onClick={() => setFilters({ ...DEFAULT_FILTERS, range: filters.range })}>Reset filters</button></div> : <MapView events={filteredEvents} selectedId={selectedId} highlightedIds={highlightedIds} onSelect={selectEvent} onHover={setHoveredId} hoveredId={hoveredId} onBoundsChange={updateBounds} fitSignal={fitSignal} />}
          </div>

          <section id="event-stream" className={`stream-column ${mobileView === 'list' ? 'is-mobile-active' : ''}`} aria-labelledby="stream-title">
            <div className="stream-heading">
              <div><p className="eyebrow">Synchronized event stream</p><h2 id="stream-title">{filteredEvents.length.toLocaleString()} signals</h2></div>
              <label>Sort <select value={filters.sort} onChange={(event) => setFilters(updateFilter(filters, 'sort', event.target.value as FilterState['sort']))}><option value="significance">Significance</option><option value="magnitude">Magnitude</option><option value="newest">Newest</option><option value="depth">Deepest</option></select></label>
            </div>
            <ActiveFilters filters={filters} onChange={setFilters} />
            {loading && !feed ? <ul className="event-skeleton" aria-label="Loading events">{Array.from({ length: 8 }, (_, index) => <li key={index}><i /><span /><span /></li>)}</ul> : error && !feed ? <div className="stream-empty"><AlertTriangle /><h3>USGS data is unavailable</h3><p>No fictional or sample events are being shown. Retry when your connection is available.</p><button type="button" onClick={() => fetchData(filters.range)}>Retry</button></div> : filteredEvents.length === 0 ? <div className="stream-empty"><Search /><h3>No matching events</h3><p>Try a lower magnitude, a wider depth range, or the whole-world area.</p><button type="button" onClick={() => setFilters({ ...DEFAULT_FILTERS, range: filters.range })}>Reset filters</button></div> : <><ol className="event-list">{filteredEvents.slice(0, visibleRows).map((event) => <EventRow key={event.id} event={event} selected={event.id === selectedId} hovered={event.id === hoveredId} highlighted={!highlightedIds || highlightedIds.has(event.id)} onSelect={() => selectEvent(event)} onHover={setHoveredId} />)}</ol>{visibleRows < filteredEvents.length && <button className="load-more" type="button" onClick={() => setVisibleRows((count) => count + 150)}>Show 150 more <ChevronDown /></button>}</>}
          </section>

          {selectedEvent && <EventDetail event={selectedEvent} allEvents={filteredEvents.length ? filteredEvents : feed?.features ?? []} onClose={closeDetail} />}
        </section>
      </main>

      {filtersOpen && <div className="sheet-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setFiltersOpen(false) }}><div ref={filterSheetRef} className="filter-sheet" role="dialog" aria-modal="true" aria-label="Earthquake filters"><FilterPanel filters={filters} onChange={setFilters} resultCount={filteredEvents.length} totalCount={feed?.features.length ?? 0} onClose={() => setFiltersOpen(false)} /><button className="apply-filters" type="button" onClick={() => setFiltersOpen(false)}>View {filteredEvents.length.toLocaleString()} events</button></div></div>}

      <footer><p>Data: <a href="https://earthquake.usgs.gov/earthquakes/feed/" target="_blank" rel="noreferrer">U.S. Geological Survey <ArrowUpRight /></a> · Basemap: OpenStreetMap contributors</p><p>Seismic Field does not predict earthquakes or guarantee safety.</p></footer>
      <div className="sr-only" aria-live="polite" aria-atomic="true">{selectedEvent ? `Selected ${selectedEvent.properties.title}. ` : ''}{filteredEvents.length.toLocaleString()} earthquakes match the current view.</div>
    </div>
  )
}
