import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, Clock3, ExternalLink, Filter, LocateFixed, RefreshCw, Search, SlidersHorizontal, Waves, X } from 'lucide-react'
import './styles.css'

type Period = 'hour' | 'day' | 'week' | 'month'
type Feature = { id: string; properties: { mag: number | null; place: string | null; time: number; updated: number; tz?: number | null; url?: string; detail?: string; felt?: number | null; cdi?: number | null; mmi?: number | null; alert?: string | null; status?: string; tsunami?: number; sig?: number; type?: string; title?: string }; geometry: { coordinates: [number, number, number] } }
type Feed = { features: Feature[]; metadata: { generated: number; title?: string } }
type Filters = { minMag: number; maxDepth: number; alert: string; tsunami: boolean; reviewed: boolean; area: string; search: string }
const feeds: Record<Period, string> = { hour: 'all_hour', day: 'all_day', week: 'all_week', month: 'all_month' }
const periodLabels: Record<Period, string> = { hour: 'Past hour', day: 'Past 24 hours', week: 'Past 7 days', month: 'Past 30 days' }
const defaults: Filters = { minMag: 0, maxDepth: 700, alert: 'any', tsunami: false, reviewed: false, area: '', search: '' }
const fmt = new Intl.NumberFormat('en-US')
const mag = (event: Feature) => event.properties.mag ?? 0
const humanMagnitude = (event: Feature) => event.properties.mag == null ? '—' : event.properties.mag.toFixed(1)
const formatTime = (time: number, short = false) => new Intl.DateTimeFormat(undefined, short ? { month: 'short', day: 'numeric', hour: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(time)
const ago = (time: number) => { const m = Math.round((Date.now() - time) / 60000); if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); return h < 48 ? `${h} hr ago` : `${Math.round(h / 24)} days ago` }
const place = (event: Feature) => event.properties.place || 'Location not named'
const severity = (event: Feature) => mag(event) >= 6 ? 'strong' : mag(event) >= 4.5 ? 'notable' : mag(event) >= 3 ? 'moderate' : 'minor'
const observerText = (event: Feature) => { const s = severity(event); return s === 'strong' ? 'Strong event — review official updates.' : s === 'notable' ? 'Notable for this feed. Magnitude does not predict impacts.' : s === 'moderate' ? 'Moderate event; compare depth and local reports.' : 'Common seismic activity; inspect if relevant to your area.' }

function getUrlState() {
  const p = new URLSearchParams(location.search)
  const period = (['hour', 'day', 'week', 'month'].includes(p.get('period') || '') ? p.get('period') : 'week') as Period
  return { period, selected: p.get('event') || '', filters: { minMag: Number(p.get('min') || 0), maxDepth: Number(p.get('depth') || 700), alert: p.get('alert') || 'any', tsunami: p.get('tsunami') === '1', reviewed: p.get('reviewed') === '1', area: p.get('area') || '', search: p.get('q') || '' } }
}
function eventDotRadius(event: Feature) { return Math.max(3, Math.min(17, 3 + mag(event) * 1.8)) }
function coordinate(event: Feature) { const [lon, lat] = event.geometry.coordinates; return { x: ((lon + 180) / 360) * 100, y: ((90 - lat) / 180) * 100 } }

function App() {
  const initial = getUrlState()
  const [period, setPeriod] = useState<Period>(initial.period)
  const [filters, setFilters] = useState<Filters>(initial.filters)
  const [feed, setFeed] = useState<Feed | null>(null)
  const [selectedId, setSelectedId] = useState(initial.selected)
  const [hoveredId, setHoveredId] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<number | null>(null)
  const [sort, setSort] = useState<'time' | 'magnitude'>('time')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const fetchFeed = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true)
    setError('')
    try {
      const r = await fetch(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feeds[period]}.geojson`, { cache: 'no-store' })
      if (!r.ok) throw new Error(`USGS responded ${r.status}`)
      const data = await r.json() as Feed
      setFeed(data); setLastRefresh(Date.now())
    } catch { setError('Live USGS data could not be reached. Your controls and current results have been preserved.') }
    finally { setLoading(false); setRefreshing(false) }
  }, [period])
  useEffect(() => { void fetchFeed() }, [fetchFeed])
  useEffect(() => { const p = new URLSearchParams(); if (period !== 'week') p.set('period', period); if (selectedId) p.set('event', selectedId); if (filters.minMag) p.set('min', String(filters.minMag)); if (filters.maxDepth !== 700) p.set('depth', String(filters.maxDepth)); if (filters.alert !== 'any') p.set('alert', filters.alert); if (filters.tsunami) p.set('tsunami', '1'); if (filters.reviewed) p.set('reviewed', '1'); if (filters.area) p.set('area', filters.area); if (filters.search) p.set('q', filters.search); history.replaceState(null, '', `${location.pathname}${p.toString() ? `?${p}` : ''}`) }, [period, selectedId, filters])
  const events = useMemo(() => (feed?.features || []).filter(e => {
    const p = e.properties, needle = `${place(e)} ${e.geometry.coordinates.join(' ')}`.toLowerCase(), area = filters.area.toLowerCase()
    return mag(e) >= filters.minMag && e.geometry.coordinates[2] <= filters.maxDepth && (filters.alert === 'any' || (p.alert || 'none') === filters.alert) && (!filters.tsunami || p.tsunami === 1) && (!filters.reviewed || p.status === 'reviewed') && (!area || place(e).toLowerCase().includes(area)) && (!filters.search || needle.includes(filters.search.toLowerCase()))
  }).sort((a, b) => sort === 'time' ? b.properties.time - a.properties.time : mag(b) - mag(a)), [feed, filters, sort])
  const selected = (feed?.features || []).find(e => e.id === selectedId) || null
  const strongest = useMemo(() => [...events].sort((a,b) => mag(b)-mag(a))[0], [events])
  const activeCount = [filters.minMag > 0, filters.maxDepth < 700, filters.alert !== 'any', filters.tsunami, filters.reviewed, !!filters.area, !!filters.search].filter(Boolean).length
  const choose = (id: string) => { setSelectedId(id); requestAnimationFrame(() => document.getElementById(`event-${id}`)?.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })) }
  const reset = () => { setFilters(defaults); setSelectedId(''); setHoveredId(''); setFiltersOpen(false) }
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters(f => ({ ...f, [key]: value }))
  const timeline = useMemo(() => { const now = Date.now(), spans: Record<Period, number> = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 }; const bins = 28, span = spans[period]; return Array.from({length: bins}, (_, i) => { const start = now - span + i * span / bins; const data = events.filter(e => e.properties.time >= start && e.properties.time < start + span / bins); return { start, data, high: Math.max(0, ...data.map(mag)) } }) }, [events, period])
  const maxBin = Math.max(...timeline.map(b => b.data.length), 1)

  return <main>
    <header className="topbar">
      <a className="brand" href="/" aria-label="Seismic Field Notes home"><span className="brand-mark"><Waves size={20}/></span><span><b>SEISMIC</b><em>FIELD NOTES</em></span></a>
      <div className="source"><span className="pulse"/> Live public data from <a href="https://earthquake.usgs.gov/" target="_blank">USGS</a><span className="source-sep">·</span>{lastRefresh ? `Updated ${ago(lastRefresh)}` : 'Connecting…'}</div>
      <button className="refresh" onClick={() => void fetchFeed(true)} disabled={refreshing || loading}><RefreshCw size={16} className={refreshing ? 'spin' : ''}/>{refreshing ? 'Refreshing' : 'Refresh'}</button>
    </header>

    <section className="masthead">
      <div><p className="eyebrow">Global seismic observatory</p><h1>Read the ground<br/><i>as it moves.</i></h1></div>
      <div className="periods" aria-label="Time range">{(Object.keys(periodLabels) as Period[]).map(key => <button key={key} className={period === key ? 'active' : ''} onClick={() => { setPeriod(key); setSelectedId('') }}>{periodLabels[key]}</button>)}</div>
      <div className="headline-stat">{strongest ? <><span className={`magnitude ${severity(strongest)}`}>M {humanMagnitude(strongest)}</span><p><b>Strongest in view</b><br/>{place(strongest)}</p></> : <><span className="magnitude">—</span><p>Loading current activity</p></>}</div>
    </section>

    <section className="workspace">
      <div className="controls"><button className="filter-toggle" onClick={() => setFiltersOpen(v=>!v)} aria-expanded={filtersOpen}><SlidersHorizontal size={17}/> Explore filters {activeCount > 0 && <b>{activeCount}</b>}<ChevronDown size={15}/></button><div className="search"><Search size={17}/><input value={filters.search} onChange={e=>update('search', e.target.value)} placeholder="Find a place or coordinate" aria-label="Search places or coordinates"/></div></div>
      {filtersOpen && <FilterPanel filters={filters} update={update} reset={reset}/>} 
      {error && <div className="notice error" role="alert"><AlertTriangle size={18}/><span>{error}</span><button onClick={() => void fetchFeed()}>Try again</button></div>}
      <div className="activity-summary" aria-live="polite"><span>{loading ? 'Loading live observations…' : <><b>{fmt.format(events.length)}</b> events in this view</>}</span>{activeCount > 0 && <button onClick={reset}><X size={14}/> Clear {activeCount} filter{activeCount>1?'s':''}</button>}<span className="key"><i className="key-circle"/> magnitude <i className="key-ring"/> selected</span></div>
      <div className="observatory">
        <section className="map-panel" aria-label="Global earthquake map"><div className="map-label"><span>GLOBAL FIELD VIEW</span><span>Circle area = magnitude</span></div><WorldMap events={events} selectedId={selectedId} hoveredId={hoveredId} choose={choose} hover={setHoveredId}/><div className="map-caption">Each mark is a reported event. Explore the event stream for a keyboard-accessible reading of the same data.</div></section>
        <section className="stream-panel" aria-label="Earthquake event stream"><div className="stream-heading"><span>EVENT STREAM</span><div><button className={sort==='time'?'chosen':''} onClick={()=>setSort('time')}>Newest</button><button className={sort==='magnitude'?'chosen':''} onClick={()=>setSort('magnitude')}>Magnitude</button></div></div><div className="event-list" ref={listRef}>{loading ? <EventSkeleton/> : events.length ? events.map(e=><EventRow key={e.id} event={e} selected={e.id===selectedId} hovered={e.id===hoveredId} onChoose={choose} hover={setHoveredId}/>) : <Empty reset={reset}/>}</div></section>
      </div>
      <Timeline bins={timeline} max={maxBin} selected={selected} choose={choose}/>
    </section>
    {selected && <EventDetail event={selected} close={() => setSelectedId('')}/>} 
    <footer><span>Earthquake data: USGS Earthquake Hazards Program. Data may be revised.</span><span>This is not an emergency alert service. For authoritative information, see the official event page and local authorities.</span></footer>
  </main>
}

function FilterPanel({ filters, update, reset }: { filters: Filters; update: <K extends keyof Filters>(key: K, value: Filters[K]) => void; reset: () => void }) { return <div className="filter-panel"><label>Minimum magnitude <output>M {filters.minMag.toFixed(1)}+</output><input type="range" min="0" max="7" step="0.5" value={filters.minMag} onChange={e=>update('minMag',Number(e.target.value))}/></label><label>Maximum depth <output>{filters.maxDepth} km</output><input type="range" min="10" max="700" step="10" value={filters.maxDepth} onChange={e=>update('maxDepth',Number(e.target.value))}/></label><label>Alert level<select value={filters.alert} onChange={e=>update('alert',e.target.value)}><option value="any">All levels</option><option value="green">Green</option><option value="yellow">Yellow</option><option value="orange">Orange</option><option value="red">Red</option><option value="none">No alert assigned</option></select></label><label>Area name<input value={filters.area} onChange={e=>update('area',e.target.value)} placeholder="e.g. Alaska"/></label><label className="check"><input type="checkbox" checked={filters.tsunami} onChange={e=>update('tsunami',e.target.checked)}/>Tsunami flag only</label><label className="check"><input type="checkbox" checked={filters.reviewed} onChange={e=>update('reviewed',e.target.checked)}/>Reviewed events only</label><button className="reset" onClick={reset}>Reset all</button></div> }
function WorldMap({ events, selectedId, hoveredId, choose, hover }: { events: Feature[]; selectedId: string; hoveredId: string; choose: (id:string)=>void; hover:(id:string)=>void }) { return <div className="world-map"><svg viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${events.length} earthquake locations around the world`}><defs><pattern id="contours" width="52" height="52" patternUnits="userSpaceOnUse"><path d="M0 31 Q13 18 26 31T52 31" fill="none" stroke="currentColor" strokeWidth=".55" opacity=".32"/></pattern><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="1000" height="500" fill="url(#contours)"/><g className="graticule">{[125,250,375].map(y=><path key={y} d={`M0 ${y}H1000`}/>)}{[125,250,375,500,625,750,875].map(x=><path key={x} d={`M${x} 0V500`}/>)}</g><g className="land"><path d="M70 88 L165 55 227 72 252 113 226 143 243 184 216 224 178 239 156 278 128 249 108 203 75 181 48 136Z"/><path d="M258 35 L308 27 344 54 337 88 301 98 279 76Z"/><path d="M255 255 L298 269 327 318 318 398 285 453 263 399 269 344 241 300Z"/><path d="M420 83 L506 54 569 69 617 106 665 119 682 159 651 204 603 207 558 180 520 201 472 178 431 187 398 145Z"/><path d="M489 216 L558 204 605 237 623 313 585 383 535 346 516 292 479 261Z"/><path d="M669 303 L719 325 746 371 706 401 661 375Z"/><path d="M709 91 L778 75 850 112 900 148 884 211 826 217 784 190 739 203 702 166Z"/><path d="M810 276 L882 276 931 319 916 377 861 394 824 357Z"/><path d="M919 415 L951 420 961 444 932 451Z"/></g>{events.map(e=>{ const c=coordinate(e), active=e.id===selectedId || e.id===hoveredId; return <g key={e.id} className={`quake ${severity(e)} ${active?'is-active':''}`} transform={`translate(${c.x*10} ${c.y*5})`} tabIndex={-1} aria-hidden="true" onMouseEnter={()=>hover(e.id)} onMouseLeave={()=>hover('')} onClick={()=>choose(e.id)}><circle className="halo" r={eventDotRadius(e)+7}/><circle r={eventDotRadius(e)}/>{active && <circle className="select-ring" r={eventDotRadius(e)+7}/>}</g>})}</svg></div> }
function EventRow({event, selected, hovered, onChoose, hover}:{event:Feature;selected:boolean;hovered:boolean;onChoose:(id:string)=>void;hover:(id:string)=>void}) { return <button id={`event-${event.id}`} className={`event-row ${selected?'selected':''} ${hovered?'hovered':''}`} onClick={()=>onChoose(event.id)} onMouseEnter={()=>hover(event.id)} onMouseLeave={()=>hover('')}><span className={`row-mag ${severity(event)}`}>M {humanMagnitude(event)}</span><span className="row-place"><b>{place(event)}</b><small>{formatTime(event.properties.time, true)} · {Math.round(event.geometry.coordinates[2])} km deep</small></span><span className="row-meta">{event.properties.alert && <i className={`alert-dot ${event.properties.alert}`}>{event.properties.alert}</i>}<small>{ago(event.properties.time)}</small></span></button> }
function EventSkeleton(){return <>{[1,2,3,4,5,6].map(n=><div className="skeleton-row" key={n}><span/><div><i/><i/></div></div>)}</>}
function Empty({reset}:{reset:()=>void}){return <div className="empty"><Filter size={28}/><h2>No observations match</h2><p>Try widening your magnitude, depth, location, or status constraints.</p><button onClick={reset}>Reset filters</button></div>}
function Timeline({bins,max,selected,choose}:{bins:{start:number;data:Feature[];high:number}[];max:number;selected:Feature|null;choose:(id:string)=>void}){return <section className="timeline" aria-label="Activity timeline"><div className="timeline-intro"><span className="eyebrow">CONNECTED ACTIVITY</span><h2>Follow the tremor through time.</h2><p>Choose an interval to bring its observed events forward on the map and stream.</p></div><div className="bars" role="list" aria-label="Earthquake activity distribution">{bins.map((bin,i)=>{const includes=selected&&bin.data.some(e=>e.id===selected.id);return <button role="listitem" key={bin.start} className={`bar ${includes?'contains-selected':''}`} style={{height:`${Math.max(5,bin.data.length/max*100)}%`}} title={`${formatTime(bin.start, true)}: ${bin.data.length} events`} aria-label={`${formatTime(bin.start, true)}, ${bin.data.length} events${includes?', includes selected event':''}`} onClick={()=>bin.data.length&&choose(bin.data.sort((a,b)=>mag(b)-mag(a))[0].id)}><span>{bin.data.length > 0 && bin.data.length}</span></button>})}</div><div className="timeline-axis"><span>{bins[0] && formatTime(bins[0].start,true)}</span><span>Now</span></div></section>}
function EventDetail({event,close}:{event:Feature;close:()=>void}){const p=event.properties,[lon,lat,depth]=event.geometry.coordinates;return <aside className="detail" aria-label="Selected earthquake details"><div className="detail-top"><span className="eyebrow">SELECTED OBSERVATION</span><button onClick={close} aria-label="Close event details"><X/></button></div><div className="detail-title"><span className={`detail-mag ${severity(event)}`}>M {humanMagnitude(event)}</span><div><h2>{place(event)}</h2><p>{formatTime(p.time)}</p></div></div><p className="assessment"><b>{observerText(event)}</b> {p.tsunami === 1 ? 'USGS has marked a tsunami flag for this event; see the official record.' : ''}</p><dl><div><dt>Depth <span title="How far below the surface the event originated.">?</span></dt><dd>{depth == null ? 'Not reported' : `${Math.round(depth)} km`}</dd></div><div><dt>Significance <span title="USGS measure combining magnitude and other event factors.">?</span></dt><dd>{p.sig == null ? 'Not scored' : fmt.format(p.sig)}</dd></div><div><dt>Felt reports</dt><dd>{p.felt == null ? 'Not reported' : fmt.format(p.felt)}</dd></div><div><dt>Review status</dt><dd>{p.status || 'Not reported'}</dd></div><div><dt>Alert level <span title="USGS impact-alert information, not a prediction.">?</span></dt><dd>{p.alert ? <span className={`alert-badge ${p.alert}`}>{p.alert}</span> : 'None assigned'}</dd></div><div><dt>Tsunami flag</dt><dd>{p.tsunami === 1 ? 'Flagged' : 'Not flagged'}</dd></div></dl><div className="coordinates"><LocateFixed size={16}/><span>{lat.toFixed(3)}°, {lon.toFixed(3)}°</span></div>{p.url && <a className="usgs-link" href={p.url} target="_blank">Open official USGS event page <ExternalLink size={15}/></a>}</aside>}
createRoot(document.getElementById('root')!).render(<App />)
