import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle, ArrowDownUp, ChevronDown, CircleHelp, Clock3, ExternalLink,
  Gauge, Globe2, Info, List, Map as MapIcon, MapPin, Radio, RefreshCw, Search,
  Share2, SlidersHorizontal, TriangleAlert, Waves, X,
} from 'lucide-react';
import { MapView } from './MapView';
import {
  AREAS, DEFAULT_FILTERS, FEEDS, PERIOD_LABELS, eventLocalTime, eventMatches, exactUtcTime,
  formatDepth, formatMagnitude, formatRelative, magnitudeClass, magnitudeLabel,
} from './data';
import type { EarthquakeFeature, EarthquakeFeed, Filters, Period, SortKey, TimeWindow } from './types';

interface SearchResult { display_name: string; lat: string; lon: string; boundingbox: [string, string, string, string] }

const PERIODS: Period[] = ['hour', 'day', 'week', 'month'];
const SORT_LABELS: Record<SortKey, string> = { time: 'Most recent', magnitude: 'Largest magnitude', significance: 'Most significant', depth: 'Deepest first' };

function parseUrlState() {
  const params = new URLSearchParams(window.location.search);
  const period = PERIODS.includes(params.get('period') as Period) ? params.get('period') as Period : 'week';
  const filters: Filters = {
    minMagnitude: Number(params.get('minMag')) || 0,
    maxDepth: Number(params.get('maxDepth')) || 700,
    alert: (['all', 'issued', 'green', 'yellow', 'orange', 'red'].includes(params.get('alert') ?? '') ? params.get('alert') : 'all') as Filters['alert'],
    tsunami: (['all', 'yes', 'no'].includes(params.get('tsunami') ?? '') ? params.get('tsunami') : 'all') as Filters['tsunami'],
    status: (['all', 'reviewed', 'automatic'].includes(params.get('status') ?? '') ? params.get('status') : 'all') as Filters['status'],
    area: AREAS[params.get('area') ?? ''] ? params.get('area')! : 'global',
  };
  const sort = (['time', 'magnitude', 'significance', 'depth'].includes(params.get('sort') ?? '') ? params.get('sort') : 'time') as SortKey;
  const bbox = params.get('bbox')?.split(',').map(Number);
  const customBounds = bbox?.length === 4 && bbox.every(Number.isFinite) ? bbox as [number, number, number, number] : null;
  const from = Number(params.get('from')); const to = Number(params.get('to'));
  const timeWindow = from > 0 && to > from ? { start: from, end: to } : null;
  return { period, filters, sort, selected: params.get('event'), customBounds, timeWindow, place: params.get('place') ?? '' };
}

function updateUrl(period: Period, filters: Filters, sort: SortKey, selectedId: string | null, customBounds: [number, number, number, number] | null, timeWindow: TimeWindow | null, place: string) {
  const params = new URLSearchParams();
  if (period !== 'week') params.set('period', period);
  if (filters.minMagnitude) params.set('minMag', String(filters.minMagnitude));
  if (filters.maxDepth !== 700) params.set('maxDepth', String(filters.maxDepth));
  if (filters.alert !== 'all') params.set('alert', filters.alert);
  if (filters.tsunami !== 'all') params.set('tsunami', filters.tsunami);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.area !== 'global') params.set('area', filters.area);
  if (sort !== 'time') params.set('sort', sort);
  if (selectedId) params.set('event', selectedId);
  if (customBounds) { params.set('bbox', customBounds.join(',')); if (place) params.set('place', place); }
  if (timeWindow) { params.set('from', String(timeWindow.start)); params.set('to', String(timeWindow.end)); }
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
}

function App() {
  const initial = useMemo(parseUrlState, []);
  const [period, setPeriod] = useState<Period>(initial.period);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [feed, setFeed] = useState<EarthquakeFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [selectedId, setSelectedId] = useState<string | null>(initial.selected);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow | null>(initial.timeWindow);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'map' | 'stream'>('map');
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [customBounds, setCustomBounds] = useState<[number, number, number, number] | null>(initial.customBounds);
  const [searchQuery, setSearchQuery] = useState(initial.place);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [copied, setCopied] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const feedRef = useRef<EarthquakeFeed | null>(null);
  const requestSequence = useRef(0);

  const loadData = useCallback(async (background = false) => {
    const requestId = ++requestSequence.current;
    background ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const response = await fetch(FEEDS[period], { headers: { Accept: 'application/geo+json' } });
      if (!response.ok) throw new Error(`USGS returned ${response.status}`);
      const data = await response.json() as EarthquakeFeed;
      if (requestId !== requestSequence.current) return;
      setFeed(data);
      feedRef.current = data;
      setLastFetched(Date.now());
      setAnnouncement(`${data.features.length.toLocaleString()} earthquakes loaded for ${PERIOD_LABELS[period]}.`);
    } catch (reason) {
      if (requestId !== requestSequence.current) return;
      const message = reason instanceof Error ? reason.message : 'The live feed could not be reached.';
      setError(message);
      setAnnouncement(`Live earthquake data could not be refreshed. ${feedRef.current ? 'Existing data remains visible.' : ''}`);
    } finally {
      if (requestId === requestSequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, [period]);

  useEffect(() => { void loadData(false); }, [loadData]);
  useEffect(() => {
    const timer = window.setInterval(() => void loadData(true), 5 * 60_000);
    return () => window.clearInterval(timer);
  }, [loadData]);
  useEffect(() => {
    const online = () => { setOffline(false); setAnnouncement('Connection restored.'); void loadData(true); };
    const off = () => { setOffline(true); setAnnouncement('You are offline. Displayed data may become stale.'); };
    window.addEventListener('online', online); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', off); };
  }, [loadData]);
  useEffect(() => { updateUrl(period, filters, sort, selectedId, customBounds, timeWindow, searchQuery); }, [customBounds, filters, period, searchQuery, selectedId, sort, timeWindow]);
  const previousPeriod = useRef(period);
  useEffect(() => {
    if (previousPeriod.current === period) return;
    previousPeriod.current = period;
    setTimeWindow(null); setCustomBounds(null); setSearchQuery('');
  }, [period]);

  const baseFiltered = useMemo(() => (feed?.features ?? []).filter((event) => eventMatches(event, filters, null, customBounds)), [customBounds, feed, filters]);
  const events = useMemo(() => {
    const result = baseFiltered.filter((event) => !timeWindow || (event.properties.time >= timeWindow.start && event.properties.time < timeWindow.end));
    return [...result].sort((a, b) => {
      if (sort === 'magnitude') return (b.properties.mag ?? -10) - (a.properties.mag ?? -10);
      if (sort === 'significance') return b.properties.sig - a.properties.sig;
      if (sort === 'depth') return b.geometry.coordinates[2] - a.geometry.coordinates[2];
      return b.properties.time - a.properties.time;
    });
  }, [baseFiltered, sort, timeWindow]);

  const selected = useMemo(() => feed?.features.find((event) => event.id === selectedId) ?? null, [feed, selectedId]);
  const strongest = useMemo(() => [...events].sort((a, b) => (b.properties.mag ?? -10) - (a.properties.mag ?? -10))[0] ?? null, [events]);
  const activeFilters = Object.entries(filters).filter(([key, value]) => value !== DEFAULT_FILTERS[key as keyof Filters]).length + (timeWindow ? 1 : 0) + (customBounds ? 1 : 0);
  const stale = Boolean(lastFetched && Date.now() - lastFetched > 10 * 60_000);

  const timeline = useMemo(() => {
    const now = feed?.metadata.generated ?? Date.now();
    const duration = { hour: 3_600_000, day: 86_400_000, week: 604_800_000, month: 2_592_000_000 }[period];
    const binsCount = period === 'hour' ? 24 : period === 'day' ? 24 : period === 'week' ? 28 : 30;
    const start = now - duration;
    const width = duration / binsCount;
    const bins = Array.from({ length: binsCount }, (_, index) => ({ start: start + index * width, end: start + (index + 1) * width, count: 0, maxMag: null as number | null }));
    baseFiltered.forEach((event) => {
      const index = Math.min(binsCount - 1, Math.max(0, Math.floor((event.properties.time - start) / width)));
      if (event.properties.time >= start) {
        bins[index].count += 1;
        bins[index].maxMag = Math.max(bins[index].maxMag ?? -10, event.properties.mag ?? -10);
      }
    });
    return bins;
  }, [baseFiltered, feed, period]);
  const maxBin = Math.max(1, ...timeline.map((bin) => bin.count));

  const handleSelect = useCallback((id: string) => {
    const event = feed?.features.find((item) => item.id === id);
    setSelectedId(id);
    if (event) setFlyTarget([event.geometry.coordinates[0], event.geometry.coordinates[1]]);
    setAnnouncement(`Selected ${event?.properties.title ?? 'earthquake'}.`);
  }, [feed]);
  const handleHover = useCallback((id: string | null) => setHoveredId(id), []);

  useEffect(() => {
    if (!hoveredId) return;
    document.querySelector(`[data-event-id="${CSS.escape(hoveredId)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [hoveredId]);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS); setTimeWindow(null); setCustomBounds(null); setSearchQuery(''); setSearchResults([]);
    setAnnouncement('All filters cleared.');
  };

  const searchPlaces = async (event: FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim().length < 2) return;
    setSearching(true); setSearchError(null);
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('format', 'jsonv2'); url.searchParams.set('limit', '5'); url.searchParams.set('q', searchQuery.trim());
      const response = await fetch(url, { headers: { 'Accept-Language': navigator.language } });
      if (!response.ok) throw new Error('Place search is temporarily unavailable.');
      const results = await response.json() as SearchResult[];
      setSearchResults(results); if (!results.length) setSearchError('No matching place found. Try a broader region.');
    } catch (reason) { setSearchError(reason instanceof Error ? reason.message : 'Place search failed.'); }
    finally { setSearching(false); }
  };

  const chooseSearchResult = (result: SearchResult) => {
    const [south, north, west, east] = result.boundingbox.map(Number);
    setCustomBounds([west, south, east, north]); setFlyTarget([Number(result.lon), Number(result.lat)]);
    setSearchQuery(result.display_name); setSearchResults([]); setFilters((current) => ({ ...current, area: 'global' }));
    setAnnouncement(`Filtering events within ${result.display_name}.`);
  };

  const share = async () => {
    const payload = { title: selected?.properties.title ?? 'Seismic Field', text: 'Live earthquake activity from USGS', url: window.location.href };
    if (navigator.share) await navigator.share(payload).catch(() => undefined);
    else { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#event-stream">Skip to event stream</a>
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><div><strong>Seismic Field</strong><span>Global activity observatory</span></div></div>
        <nav className="period-tabs" aria-label="Time period">
          {PERIODS.map((item) => <button key={item} type="button" aria-pressed={period === item} onClick={() => setPeriod(item)}>{PERIOD_LABELS[item]}</button>)}
        </nav>
        <div className="top-actions">
          <DataStatus offline={offline} stale={stale} error={error} lastFetched={lastFetched} />
          <button type="button" className="icon-button" onClick={() => void loadData(true)} disabled={refreshing} aria-label="Refresh live USGS data"><RefreshCw size={18} className={refreshing ? 'spinning' : ''} /></button>
          <button type="button" className="icon-button" onClick={() => setHelpOpen(true)} aria-label="About this data"><CircleHelp size={18} /></button>
        </div>
      </header>

      {(offline || error || stale) && <StatusBanner offline={offline} stale={stale} error={error} hasData={Boolean(feed)} onRetry={() => void loadData(Boolean(feed))} />}

      <section className="instrument-strip" aria-label="Activity over time">
        <div className="period-summary">
          <span className="live-label"><Radio size={13} /> {offline ? 'OFFLINE' : 'LIVE USGS'}</span>
          <strong>{loading && !feed ? 'Reading seismic feed…' : `${events.length.toLocaleString()} events`}</strong>
          <span>{PERIOD_LABELS[period].toLowerCase()}{activeFilters ? ` · ${activeFilters} constraint${activeFilters === 1 ? '' : 's'}` : ''}</span>
        </div>
        <Timeline bins={timeline} maxBin={maxBin} selectedWindow={timeWindow} selectedTime={selected?.properties.time ?? null} onSelect={(window) => { setTimeWindow((current) => current?.start === window.start ? null : window); setAnnouncement(`${window.start === timeWindow?.start ? 'Cleared' : 'Applied'} timeline interval.`); }} />
        <button type="button" className={`filter-trigger ${activeFilters ? 'active' : ''}`} onClick={() => setFiltersOpen(true)} aria-expanded={filtersOpen}>
          <SlidersHorizontal size={17} /><span>Filters</span>{activeFilters > 0 && <b>{activeFilters}</b>}
        </button>
      </section>

      <div className="mobile-view-tabs" role="tablist" aria-label="Primary view">
        <button role="tab" aria-selected={mobileView === 'map'} onClick={() => setMobileView('map')}><MapIcon size={17} /> Map</button>
        <button role="tab" aria-selected={mobileView === 'stream'} onClick={() => setMobileView('stream')}><List size={17} /> Stream <span>{events.length}</span></button>
      </div>

      <main className="workspace">
        <section className={`map-region ${mobileView !== 'map' ? 'mobile-hidden' : ''}`} aria-label="Geographic overview">
          <MapView events={events} selectedId={selectedId} hoveredId={hoveredId} flyTarget={flyTarget} onSelect={handleSelect} onHover={handleHover} />
          {strongest && <button className="signal-brief" type="button" onClick={() => handleSelect(strongest.id)}>
            <span className={`magnitude-token ${magnitudeClass(strongest.properties.mag)}`}>{formatMagnitude(strongest.properties.mag)}</span>
            <span><small>Strongest in view</small><strong>{strongest.properties.place ?? 'Location being reviewed'}</strong><em>{formatRelative(strongest.properties.time)} · {formatDepth(strongest.geometry.coordinates[2])} deep</em></span>
            <span className="signal-action">Inspect</span>
          </button>}
        </section>

        <section id="event-stream" className={`stream-panel ${mobileView !== 'stream' ? 'mobile-hidden' : ''}`} aria-label="Earthquake event stream">
          <div className="stream-header">
            <div><h1>Event stream</h1><p>{events.length.toLocaleString()} of {(feed?.features.length ?? 0).toLocaleString()} loaded</p></div>
            <label className="sort-control"><ArrowDownUp size={15} /><span className="sr-only">Sort events</span><select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>{Object.entries(SORT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={14} /></label>
          </div>
          {activeFilters > 0 && <div className="filter-summary"><span>{activeFilters} active constraint{activeFilters === 1 ? '' : 's'}</span><button type="button" onClick={resetFilters}>Clear all</button></div>}
          <div className="event-list" ref={listRef}>
            {loading && !feed ? <EventSkeleton /> : events.length ? events.map((event) => (
              <EventRow key={event.id} event={event} selected={event.id === selectedId} highlighted={event.id === hoveredId} onSelect={handleSelect} onHover={handleHover} />
            )) : <EmptyState onReset={resetFilters} />}
          </div>
        </section>
      </main>

      {filtersOpen && <FilterPanel filters={filters} updateFilter={updateFilter} reset={resetFilters} onClose={() => setFiltersOpen(false)} activeCount={activeFilters} searchQuery={searchQuery} setSearchQuery={setSearchQuery} searchPlaces={searchPlaces} searching={searching} searchResults={searchResults} searchError={searchError} chooseResult={chooseSearchResult} customArea={Boolean(customBounds)} clearCustomArea={() => { setCustomBounds(null); setSearchQuery(''); }} />}
      {selected && <EventDetail event={selected} onClose={() => { setSelectedId(null); setAnnouncement('Event details closed.'); }} onShare={() => void share()} copied={copied} />}
      {helpOpen && <AboutDialog onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

function DataStatus({ offline, stale, error, lastFetched }: { offline: boolean; stale: boolean; error: string | null; lastFetched: number | null }) {
  const label = offline ? 'Offline' : error ? 'Refresh failed' : stale ? 'Data may be stale' : lastFetched ? `Updated ${formatRelative(lastFetched)}` : 'Connecting';
  return <span className={`data-status ${offline || stale || error ? 'warn' : ''}`} title={lastFetched ? `Last refreshed ${exactUtcTime(lastFetched)}` : undefined}><i />{label}</span>;
}

function StatusBanner({ offline, stale, error, hasData, onRetry }: { offline: boolean; stale: boolean; error: string | null; hasData: boolean; onRetry: () => void }) {
  return <div className="status-banner" role="alert"><AlertTriangle size={17} /><span><strong>{offline ? 'You are offline.' : error ? 'USGS refresh failed.' : 'Displayed data may be stale.'}</strong> {hasData ? 'The last successful dataset remains available.' : 'Live earthquake data is not available yet.'}</span>{!offline && <button type="button" onClick={onRetry}>Retry now</button>}</div>;
}

function Timeline({ bins, maxBin, selectedWindow, selectedTime, onSelect }: { bins: { start: number; end: number; count: number; maxMag: number | null }[]; maxBin: number; selectedWindow: TimeWindow | null; selectedTime: number | null; onSelect: (window: TimeWindow) => void }) {
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  const busiest = bins.reduce((best, bin) => bin.count > best.count ? bin : best, bins[0] ?? { count: 0, start: 0, end: 0, maxMag: null });
  const midpoint = Math.floor(bins.length / 2);
  const earlierCount = bins.slice(0, midpoint).reduce((sum, bin) => sum + bin.count, 0);
  const recentCount = bins.slice(midpoint).reduce((sum, bin) => sum + bin.count, 0);
  const change = earlierCount === 0 ? null : Math.round(((recentCount - earlierCount) / earlierCount) * 100);
  const trend = total === 0 ? 'No activity in this view' : change === null ? `${recentCount} events in the recent half` : change === 0 ? 'Activity is level between halves' : `Recent half is ${Math.abs(change)}% ${change > 0 ? 'more active' : 'less active'}`;
  return <div className="timeline-wrap">
    <div className="timeline-bars" role="group" aria-label={`Activity timeline. ${total} events. ${trend}. Busiest interval contains ${busiest.count} events.`}>
      {bins.map((bin, index) => {
        const selected = selectedWindow?.start === bin.start;
        const containsEvent = selectedTime !== null && selectedTime >= bin.start && selectedTime < bin.end;
        const height = Math.max(4, (bin.count / maxBin) * 100);
        return <button key={bin.start} type="button" className={`${selected ? 'selected' : ''} ${containsEvent ? 'contains-event' : ''}`} aria-pressed={selected} aria-label={`${bin.count} events from ${exactUtcTime(bin.start)} to ${exactUtcTime(bin.end)}${bin.maxMag !== null ? `, maximum magnitude ${bin.maxMag.toFixed(1)}` : ''}${containsEvent ? ', contains the selected event' : ''}`} title={`${bin.count} events${containsEvent ? ' · selected event' : ''}`} onClick={() => onSelect(bin)}><i style={{ height: `${height}%` }} /><span>{index === 0 ? 'Earlier' : index === bins.length - 1 ? 'Now' : ''}</span></button>;
      })}
    </div>
    <div className="timeline-caption"><span>Earlier</span><strong>{selectedWindow ? `${new Date(selectedWindow.start).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' })} interval selected` : trend}</strong><span>Now</span></div>
  </div>;
}

function EventRow({ event, selected, highlighted, onSelect, onHover }: { event: EarthquakeFeature; selected: boolean; highlighted: boolean; onSelect: (id: string) => void; onHover: (id: string | null) => void }) {
  const p = event.properties;
  return <article data-event-id={event.id} className={`event-row ${selected ? 'selected' : ''} ${highlighted ? 'highlighted' : ''}`}>
    <button type="button" onClick={() => onSelect(event.id)} onMouseEnter={() => onHover(event.id)} onMouseLeave={() => onHover(null)} onFocus={() => onHover(event.id)} onBlur={() => onHover(null)} aria-label={`Magnitude ${formatMagnitude(p.mag)}, ${p.place ?? 'location pending'}, ${formatRelative(p.time)}, depth ${formatDepth(event.geometry.coordinates[2])}`}>
      <span className={`magnitude-token ${magnitudeClass(p.mag)}`}>{formatMagnitude(p.mag)}</span>
      <span className="event-copy"><strong>{p.place ?? 'Location being reviewed'}</strong><span><time dateTime={new Date(p.time).toISOString()}>{formatRelative(p.time)}</time><i />{formatDepth(event.geometry.coordinates[2])} deep</span></span>
      <span className="event-signals">
        {p.alert && <em className={`alert-tag ${p.alert}`}><TriangleAlert size={12} />{p.alert}</em>}
        {Boolean(p.tsunami) && <em className="tsunami-tag"><Waves size={12} />Tsunami flag</em>}
        <small>Sig {p.sig}</small>
      </span>
    </button>
  </article>;
}

function EventSkeleton() { return <div className="skeleton-list" aria-label="Loading live earthquake events">{Array.from({ length: 8 }, (_, index) => <div key={index}><i /><span><b /><b /></span></div>)}</div>; }
function EmptyState({ onReset }: { onReset: () => void }) { return <div className="empty-state"><Gauge size={34} /><h2>No events match</h2><p>The current magnitude, depth, status, area, or time constraints exclude every loaded event.</p><button type="button" onClick={onReset}>Clear all constraints</button></div>; }

interface FilterPanelProps {
  filters: Filters; updateFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void; reset: () => void; onClose: () => void; activeCount: number;
  searchQuery: string; setSearchQuery: (value: string) => void; searchPlaces: (event: FormEvent) => void; searching: boolean; searchResults: SearchResult[]; searchError: string | null; chooseResult: (result: SearchResult) => void; customArea: boolean; clearCustomArea: () => void;
}

function FilterPanel({ filters, updateFilter, reset, onClose, activeCount, searchQuery, setSearchQuery, searchPlaces, searching, searchResults, searchError, chooseResult, customArea, clearCustomArea }: FilterPanelProps) {
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => { document.getElementById('filter-heading')?.focus(); const close = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current(); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);
  return <div className="panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="filter-panel" role="dialog" aria-modal="true" aria-labelledby="filter-heading">
      <div className="panel-heading"><div><span>Refine activity</span><h2 id="filter-heading" tabIndex={-1}>Filters {activeCount > 0 && <small>{activeCount} active</small>}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close filters"><X size={20} /></button></div>
      <div className="filter-content">
        <fieldset><legend>Magnitude</legend><p>Magnitude measures energy released, not expected damage.</p><div className="segmented five">{[0, 2.5, 4.5, 5.5, 6.5].map((value) => <button key={value} type="button" aria-pressed={filters.minMagnitude === value} onClick={() => updateFilter('minMagnitude', value)}>{value === 0 ? 'Any' : `${value}+`}</button>)}</div></fieldset>
        <fieldset><legend>Maximum depth <output>{filters.maxDepth} km</output></legend><p>Depth is distance below the surface. Shallow events often feel sharper nearby.</p><input type="range" min="10" max="700" step="10" value={filters.maxDepth} onChange={(event) => updateFilter('maxDepth', Number(event.target.value))} aria-label="Maximum depth in kilometers" /><div className="range-labels"><span>10 km</span><span>700 km</span></div></fieldset>
        <fieldset><legend>Geographic area</legend><label className="select-field"><Globe2 size={16} /><select value={filters.area} onChange={(event) => { updateFilter('area', event.target.value); clearCustomArea(); }}>{Object.entries(AREAS).map(([value, area]) => <option key={value} value={value}>{area.label}</option>)}</select><ChevronDown size={15} /></label>
          <form className="place-search" onSubmit={searchPlaces}><label htmlFor="place-search">Search a place or region</label><div><Search size={16} /><input id="place-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Japan, Santiago, Alaska…" minLength={2} /><button type="submit" disabled={searching}>{searching ? 'Searching…' : 'Find'}</button></div></form>
          {customArea && <div className="custom-area"><MapPin size={14} /> Map filtered to search bounds <button type="button" onClick={clearCustomArea}>Remove</button></div>}
          {searchError && <p className="field-error" role="alert">{searchError}</p>}
          {searchResults.length > 0 && <ul className="search-results">{searchResults.map((result) => <li key={`${result.lat}-${result.lon}`}><button type="button" onClick={() => chooseResult(result)}>{result.display_name}</button></li>)}</ul>}
        </fieldset>
        <fieldset><legend>Alert level</legend><p>USGS alert levels summarize estimated shaking impact when available.</p><label className="select-field"><TriangleAlert size={16} /><select value={filters.alert} onChange={(event) => updateFilter('alert', event.target.value as Filters['alert'])}><option value="all">Any alert status</option><option value="issued">Alert issued</option><option value="green">Green</option><option value="yellow">Yellow</option><option value="orange">Orange</option><option value="red">Red</option></select><ChevronDown size={15} /></label></fieldset>
        <div className="filter-pair"><fieldset><legend>Tsunami flag</legend><div className="segmented"><button type="button" aria-pressed={filters.tsunami === 'all'} onClick={() => updateFilter('tsunami', 'all')}>Any</button><button type="button" aria-pressed={filters.tsunami === 'yes'} onClick={() => updateFilter('tsunami', 'yes')}>Flagged</button><button type="button" aria-pressed={filters.tsunami === 'no'} onClick={() => updateFilter('tsunami', 'no')}>Not flagged</button></div></fieldset><fieldset><legend>Review status</legend><div className="segmented"><button type="button" aria-pressed={filters.status === 'all'} onClick={() => updateFilter('status', 'all')}>Any</button><button type="button" aria-pressed={filters.status === 'reviewed'} onClick={() => updateFilter('status', 'reviewed')}>Reviewed</button><button type="button" aria-pressed={filters.status === 'automatic'} onClick={() => updateFilter('status', 'automatic')}>Automatic</button></div></fieldset></div>
      </div>
      <div className="panel-footer"><button type="button" className="text-button" onClick={reset} disabled={!activeCount}>Reset all</button><button type="button" className="primary-button" onClick={onClose}>Show matching events</button></div>
    </aside>
  </div>;
}

function EventDetail({ event, onClose, onShare, copied }: { event: EarthquakeFeature; onClose: () => void; onShare: () => void; copied: boolean }) {
  const p = event.properties; const [lng, lat, depth] = event.geometry.coordinates;
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => { document.getElementById('detail-heading')?.focus(); const close = (key: KeyboardEvent) => { if (key.key === 'Escape') closeRef.current(); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [event.id]);
  return <aside className="detail-panel" aria-labelledby="detail-heading">
    <div className="detail-actions"><button type="button" className="icon-button" onClick={onShare} aria-label="Share this event"><Share2 size={18} /></button><span role="status">{copied ? 'Link copied' : ''}</span><button type="button" className="icon-button" onClick={onClose} aria-label="Close event details"><X size={20} /></button></div>
    <div className="detail-hero"><span className={`detail-mag ${magnitudeClass(p.mag)}`}>M {formatMagnitude(p.mag)}</span><p>{magnitudeLabel(p.mag)}</p><h2 id="detail-heading" tabIndex={-1}>{p.place ?? 'Location being reviewed by USGS'}</h2><div className="detail-flags">{p.alert ? <span className={`alert-tag ${p.alert}`}><TriangleAlert size={13} />{p.alert} alert</span> : <span>No impact alert issued</span>}{Boolean(p.tsunami) ? <span className="tsunami-tag"><Waves size={13} />Tsunami flag set</span> : <span>No tsunami flag</span>}</div></div>
    <div className="context-note"><Info size={16} /><p><strong>Magnitude is not a damage forecast.</strong> Effects vary with depth, distance, local geology, construction, and population exposure.</p></div>
    <dl className="detail-grid">
      <div><dt><Clock3 size={14} /> Local time</dt><dd>{eventLocalTime(event)}</dd></div>
      <div><dt>Exact UTC</dt><dd>{exactUtcTime(p.time)}</dd></div>
      <div><dt>Depth</dt><dd>{formatDepth(depth)}</dd><small>Below the surface</small></div>
      <div><dt>Significance</dt><dd>{p.sig}</dd><small>USGS composite ranking</small></div>
      <div><dt>Felt reports</dt><dd>{p.felt?.toLocaleString() ?? 'Not available'}</dd><small>Community responses</small></div>
      <div><dt>Review status</dt><dd className="capitalize">{p.status || 'Unknown'}</dd><small>Values may be revised</small></div>
      <div><dt>Coordinates</dt><dd className="mono">{Math.abs(lat).toFixed(4)}°{lat >= 0 ? 'N' : 'S'}, {Math.abs(lng).toFixed(4)}°{lng >= 0 ? 'E' : 'W'}</dd></div>
      <div><dt>Updated</dt><dd>{formatRelative(p.updated)}</dd><small>{exactUtcTime(p.updated)}</small></div>
    </dl>
    <div className="detail-explain"><h3>How to read this event</h3><p><strong>Depth</strong> describes where rupture began below the surface. <strong>Significance</strong> combines magnitude, felt reports, estimated intensity, and other factors for comparison. <strong>Alert level</strong>, when issued, estimates potential shaking impact.</p></div>
    <div className="authority-note"><AlertTriangle size={16} /><p>This product is for exploration, not emergency alerts. Check official local authorities for safety information. USGS data is preliminary and may be revised.</p></div>
    <a className="usgs-link" href={p.url} target="_blank" rel="noreferrer">Open official USGS event page <ExternalLink size={16} /></a>
  </aside>;
}

function AboutDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => { document.getElementById('about-heading')?.focus(); const close = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current(); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-heading"><button type="button" className="icon-button close-dialog" onClick={onClose} aria-label="Close about dialog"><X size={20} /></button><div className="brand-mark large" aria-hidden="true"><i /><i /><i /></div><h2 id="about-heading" tabIndex={-1}>A field view of a moving planet</h2><p>Seismic Field presents live earthquake observations published by the U.S. Geological Survey. Events may be added, updated, or removed as analysts review incoming measurements.</p><dl><div><dt>Magnitude</dt><dd>Energy released at the source. It does not by itself predict damage.</dd></div><div><dt>Significance</dt><dd>A USGS ranking that combines magnitude, intensity, felt reports, and other factors.</dd></div><div><dt>Alert level</dt><dd>An estimated range of fatalities and economic losses, only available for some events.</dd></div></dl><p className="dialog-caution"><TriangleAlert size={16} /> Earthquakes cannot be predicted by this application. For urgent information, follow official local authorities.</p><a href="https://earthquake.usgs.gov/" target="_blank" rel="noreferrer">Visit the USGS Earthquake Hazards Program <ExternalLink size={15} /></a></section></div>;
}

export default App;
