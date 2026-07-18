import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TIMEFRAMES,
  fetchEarthquakes,
  filterAndSortEvents,
  formatAbsoluteTime,
  formatCoordinate,
  formatDepth,
  formatMagnitude,
  formatUtcTime,
  magnitudeBand,
  timeAgo
} from "./data.js";
import { MapView } from "./MapView.jsx";

const DEFAULT_FILTERS = {
  timeframe: "day",
  minMagnitude: -1,
  depth: "all",
  search: "",
  sort: "newest",
  mapOnly: false
};

const LIST_PAGE_SIZE = 80;

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6v5h-5M4 18v-5h5M18.5 9a7 7 0 0 0-11.9-2.1L4 9m16 6-2.6 2.1A7 7 0 0 1 5.5 15" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function ArrowIcon({ direction = "right" }) {
  return (
    <svg className={`arrow-icon arrow-icon--${direction}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 5h5v5M19 5l-8 8M18 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

function SkeletonList() {
  return Array.from({ length: 6 }, (_, index) => (
    <div className="skeleton-row" key={index} aria-hidden="true">
      <span></span>
      <div><i></i><i></i></div>
    </div>
  ));
}

function MagnitudeBadge({ magnitude, compact = false }) {
  return (
    <span className={`magnitude-badge magnitude-badge--${magnitudeBand(magnitude)}${compact ? " magnitude-badge--compact" : ""}`}>
      <span className="sr-only">Magnitude </span>{formatMagnitude(magnitude)}
    </span>
  );
}

function EventRow({ event, selected, onSelect }) {
  return (
    <button
      className={`event-row${selected ? " event-row--selected" : ""}`}
      type="button"
      aria-current={selected ? "true" : undefined}
      aria-label={`Magnitude ${formatMagnitude(event.magnitude)}, ${event.place}, ${timeAgo(event.time)}, depth ${formatDepth(event.depth)}`}
      onClick={(clickEvent) => onSelect(event.id, clickEvent.currentTarget)}
    >
      <MagnitudeBadge magnitude={event.magnitude} />
      <span className="event-row__body">
        <strong>{event.place}</strong>
        <span>
          <time dateTime={event.time ? new Date(event.time).toISOString() : undefined}>{timeAgo(event.time)}</time>
          <i aria-hidden="true"></i>
          {formatDepth(event.depth)} deep
        </span>
      </span>
      <ArrowIcon />
    </button>
  );
}

function EmptyResults({ onReset }) {
  return (
    <div className="empty-state">
      <span className="empty-state__rings" aria-hidden="true"><i></i><i></i><i></i></span>
      <strong>No earthquakes match these filters</strong>
      <p>Widen the time window, lower the magnitude, or clear the place search.</p>
      <button type="button" onClick={onReset}>Reset filters</button>
    </div>
  );
}

function ErrorResults({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <span aria-hidden="true">!</span>
      <strong>Live data is unavailable</strong>
      <p>{message}</p>
      <button type="button" onClick={onRetry}>Retry USGS connection</button>
    </div>
  );
}

function Fact({ label, children }) {
  return <div className="detail-fact"><dt>{label}</dt><dd>{children}</dd></div>;
}

function DetailDrawer({ event, overlappingEvents, onClose, onCopy, onFocus, onSelectOverlap }) {
  if (!event) return null;
  const overlapIndex = Math.max(0, overlappingEvents.findIndex((item) => item.id === event.id));
  const previous = overlappingEvents[(overlapIndex - 1 + overlappingEvents.length) % overlappingEvents.length];
  const next = overlappingEvents[(overlapIndex + 1) % overlappingEvents.length];

  return (
    <aside className="detail-drawer" aria-labelledby="detail-title">
      <button className="detail-drawer__close" type="button" aria-label="Close earthquake details" onClick={onClose}>
        <CloseIcon />
      </button>

      <div className="detail-drawer__scroll">
        <div className="detail-kicker">
          <span>Earthquake details</span>
          {event.status ? <span className={`status-badge status-badge--${event.status}`}>{event.status}</span> : null}
        </div>

        <div className="detail-hero">
          <MagnitudeBadge magnitude={event.magnitude} compact />
          <div>
            <span className="detail-hero__label">Magnitude</span>
            <strong>{formatMagnitude(event.magnitude)}</strong>
            <span>{event.magnitudeType ? event.magnitudeType.toUpperCase() : "USGS reported"}</span>
          </div>
        </div>

        <h2 id="detail-title" tabIndex="-1">{event.place}</h2>
        <p className="detail-time">
          <time dateTime={event.time ? new Date(event.time).toISOString() : undefined}>{timeAgo(event.time)}</time>
          <span aria-hidden="true">·</span>
          {formatAbsoluteTime(event.time)}
        </p>

        {overlappingEvents.length > 1 ? (
          <div className="overlap-nav" aria-label={`${overlappingEvents.length} earthquakes overlap at this map point`}>
            <button type="button" onClick={() => onSelectOverlap(previous.id)} aria-label="Previous overlapping earthquake"><ArrowIcon direction="left" /></button>
            <span><strong>{overlapIndex + 1}</strong> of {overlappingEvents.length} at this point</span>
            <button type="button" onClick={() => onSelectOverlap(next.id)} aria-label="Next overlapping earthquake"><ArrowIcon /></button>
          </div>
        ) : null}

        <dl className="detail-grid">
          <Fact label="Depth"><strong>{formatDepth(event.depth)}</strong></Fact>
          <Fact label="Felt reports"><strong>{event.felt === null ? "None reported" : event.felt.toLocaleString()}</strong></Fact>
          <Fact label="Latitude">{formatCoordinate(event.latitude, "N", "S")}</Fact>
          <Fact label="Longitude">{formatCoordinate(event.longitude, "E", "W")}</Fact>
          <Fact label="Local display time">{formatAbsoluteTime(event.time)}</Fact>
          <Fact label="Universal time">{formatUtcTime(event.time)}</Fact>
          {event.cdi !== null ? <Fact label="Community intensity">{event.cdi.toFixed(1)} CDI</Fact> : null}
          {event.mmi !== null ? <Fact label="Instrument intensity">{event.mmi.toFixed(1)} MMI</Fact> : null}
          {event.network ? <Fact label="Reporting network">{event.network}</Fact> : null}
          {event.significance !== null ? <Fact label="USGS significance">{event.significance}</Fact> : null}
        </dl>

        {event.tsunami || event.alert ? (
          <div className="event-flags">
            {event.tsunami ? <span className="event-flag event-flag--tsunami">Tsunami flag issued</span> : null}
            {event.alert ? <span className={`event-flag event-flag--${event.alert}`}>{event.alert} alert</span> : null}
          </div>
        ) : null}

        <div className="detail-actions">
          <button type="button" onClick={onFocus}>Center on map</button>
          <button type="button" onClick={onCopy}>Copy coordinates</button>
        </div>

        {event.url ? (
          <a className="usgs-link" href={event.url} target="_blank" rel="noreferrer">
            <span><strong>Open the official USGS event</strong><small>Products, reports, and technical data</small></span>
            <ExternalIcon />
          </a>
        ) : null}
      </div>
    </aside>
  );
}

export default function App() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [events, setEvents] = useState([]);
  const [bounds, setBounds] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [overlapIds, setOverlapIds] = useState([]);
  const [focusRequest, setFocusRequest] = useState(null);
  const [listLimit, setListLimit] = useState(LIST_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stale, setStale] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [source, setSource] = useState("realtime-feed");
  const [toast, setToast] = useState(null);
  const [now, setNow] = useState(Date.now());

  const abortRef = useRef(null);
  const requestSequenceRef = useRef(0);
  const eventsRef = useRef([]);
  const selectedIdRef = useRef(null);
  const loadedTimeframeRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const showNotice = useCallback((message, tone = "neutral") => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ message, tone });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const loadData = useCallback(async (reason = "auto") => {
    const sequence = ++requestSequenceRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const hasExistingData = eventsRef.current.length > 0 && loadedTimeframeRef.current === filters.timeframe;

    if (!hasExistingData && eventsRef.current.length) {
      eventsRef.current = [];
      setEvents([]);
      setSelectedId(null);
      setOverlapIds([]);
    }

    if (hasExistingData) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result = await fetchEarthquakes(filters.timeframe, controller.signal);
      if (sequence !== requestSequenceRef.current) return;

      setEvents(result.events);
      eventsRef.current = result.events;
      loadedTimeframeRef.current = filters.timeframe;
      setGenerated(result.generated);
      setSource(result.source);
      setStale(false);
      const currentSelection = selectedIdRef.current;
      if (!currentSelection || !result.events.some((event) => event.id === currentSelection)) {
        const strongest = result.events.reduce(
          (best, event) => !best || (event.magnitude ?? -Infinity) > (best.magnitude ?? -Infinity) ? event : best,
          null
        );
        setSelectedId(strongest?.id || null);
        setOverlapIds(strongest ? [strongest.id] : []);
      }

      if (reason === "manual") showNotice(`Updated ${result.events.length.toLocaleString()} live earthquakes.`, "success");
    } catch (requestError) {
      if (requestError?.name === "AbortError" || sequence !== requestSequenceRef.current) return;
      const message = requestError?.message || "The USGS feed could not be reached.";
      setError(message);
      setStale(hasExistingData);
      if (hasExistingData) showNotice("The latest refresh failed. Existing map data is still shown.", "error");
    } finally {
      if (sequence === requestSequenceRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [filters.timeframe, showNotice]);

  useEffect(() => {
    loadData("timeframe");
    return () => abortRef.current?.abort();
  }, [loadData]);

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") loadData("auto");
    }, 60000);
    const clockInterval = window.setInterval(() => setNow(Date.now()), 30000);
    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(clockInterval);
    };
  }, [loadData]);

  const filteredEvents = useMemo(
    () => filterAndSortEvents(events, filters, filters.mapOnly ? bounds : null),
    [bounds, events, filters]
  );

  const eventIndex = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const selectedEvent = selectedId ? eventIndex.get(selectedId) || null : null;
  const overlappingEvents = overlapIds.map((id) => eventIndex.get(id)).filter(Boolean);

  useEffect(() => {
    setListLimit(LIST_PAGE_SIZE);
  }, [filters.minMagnitude, filters.depth, filters.search, filters.sort, filters.mapOnly, filters.timeframe]);

  useEffect(() => {
    if (selectedId && !filteredEvents.some((event) => event.id === selectedId)) {
      setSelectedId(null);
      setOverlapIds([]);
    }
  }, [filteredEvents, selectedId]);

  const strongest = useMemo(
    () => filteredEvents.reduce((best, event) => event.magnitude !== null && (!best || event.magnitude > best.magnitude) ? event : best, null),
    [filteredEvents]
  );
  const latest = useMemo(
    () => filteredEvents.reduce((best, event) => !best || (event.time || 0) > (best.time || 0) ? event : best, null),
    [filteredEvents]
  );

  const activeFilterCount = [
    filters.timeframe !== DEFAULT_FILTERS.timeframe,
    filters.minMagnitude !== DEFAULT_FILTERS.minMagnitude,
    filters.depth !== DEFAULT_FILTERS.depth,
    Boolean(filters.search.trim()),
    filters.mapOnly
  ].filter(Boolean).length;

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const handleSelect = useCallback((id, ids = [id], origin = "list") => {
    const event = eventsRef.current.find((candidate) => candidate.id === id);
    if (!event) return;
    setSelectedId(id);
    setOverlapIds(ids.length ? ids : [id]);
    if (origin === "list") setFocusRequest({ event, token: Date.now() });
  }, []);

  const focusSelected = () => {
    if (selectedEvent) setFocusRequest({ event: selectedEvent, token: Date.now() });
  };

  const copyCoordinates = async () => {
    if (!selectedEvent) return;
    const coordinates = `${selectedEvent.latitude.toFixed(5)}, ${selectedEvent.longitude.toFixed(5)}`;
    try {
      await navigator.clipboard.writeText(coordinates);
      showNotice("Coordinates copied to the clipboard.", "success");
    } catch {
      showNotice(`Coordinates: ${coordinates}`, "neutral");
    }
  };

  const visibleRows = filteredEvents.slice(0, listLimit);
  const feedTone = error ? (stale ? "stale" : "error") : loading ? "loading" : "live";
  const feedLabel = error ? (stale ? "Update delayed" : "USGS unavailable") : loading ? "Connecting to USGS" : source === "query-fallback" ? "USGS query fallback" : "Live USGS feed";
  const timeframeLabel = TIMEFRAMES[filters.timeframe].label.toLocaleLowerCase();

  return (
    <>
      <a className="skip-link" href="#event-list">Skip to earthquake list</a>
      <div className="app-shell">
        <header className="topbar">
          <div className="identity">
            <span className="identity__signal" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span>
            </span>
            <div>
              <h1>GPT-5.6 Sol</h1>
              <p>Global seismic activity <span aria-hidden="true">·</span> USGS</p>
            </div>
          </div>

          <div className="topbar__actions">
            <div className={`feed-state feed-state--${feedTone}`} role="status" aria-live="polite">
              <span className="feed-state__dot" aria-hidden="true"></span>
              <span className="feed-state__label">{feedLabel}</span>
              {generated ? <span className="feed-state__time">Updated {timeAgo(generated, now)}</span> : null}
            </div>
            <button className={`refresh-button${refreshing ? " refresh-button--spinning" : ""}`} type="button" onClick={() => loadData("manual")} disabled={loading || refreshing}>
              <RefreshIcon />
              <span>{refreshing ? "Refreshing" : "Refresh"}</span>
            </button>
          </div>
        </header>

        <main className="workspace">
          <aside className="sidebar" aria-label="Earthquake controls and results">
            <section className="summary-strip" aria-label="Current earthquake summary">
              <div><span className="summary-strip__value">{filteredEvents.length.toLocaleString()}</span><span className="summary-strip__label">shown</span></div>
              <span className="summary-strip__divider" aria-hidden="true"></span>
              <div><span className="summary-strip__value">{strongest ? `M ${formatMagnitude(strongest.magnitude)}` : "—"}</span><span className="summary-strip__label">strongest</span></div>
              <span className="summary-strip__divider" aria-hidden="true"></span>
              <div><span className="summary-strip__value">{latest ? timeAgo(latest.time, now) : "—"}</span><span className="summary-strip__label">latest</span></div>
            </section>

            <section className="filters" aria-labelledby="filters-title">
              <div className="section-heading">
                <h2 id="filters-title">Explore activity</h2>
                <button className="text-button" type="button" onClick={resetFilters} disabled={!activeFilterCount}>Reset filters</button>
              </div>

              <form onSubmit={(event) => event.preventDefault()}>
                <fieldset className="filter-group">
                  <legend>Time window</legend>
                  <div className="segmented-control segmented-control--four">
                    {[{ value: "hour", label: "1 hour" }, { value: "day", label: "24 hours" }, { value: "week", label: "7 days" }, { value: "month", label: "30 days" }].map((option) => (
                      <label key={option.value}>
                        <input type="radio" name="timeframe" value={option.value} checked={filters.timeframe === option.value} onChange={() => updateFilter("timeframe", option.value)} />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="filter-group range-group">
                  <div className="label-row">
                    <label htmlFor="magnitude-range">Minimum magnitude</label>
                    <output htmlFor="magnitude-range">{filters.minMagnitude < 0 ? "All" : `M ${filters.minMagnitude.toFixed(1)}+`}</output>
                  </div>
                  <input id="magnitude-range" type="range" min="-1" max="7" step="0.5" value={filters.minMagnitude} onChange={(event) => updateFilter("minMagnitude", Number(event.target.value))} />
                  <div className="range-scale" aria-hidden="true"><span>All</span><span>2</span><span>4</span><span>6+</span></div>
                </div>

                <fieldset className="filter-group">
                  <legend>Depth</legend>
                  <div className="segmented-control">
                    {[{ value: "all", label: "All" }, { value: "shallow", label: "<70 km" }, { value: "intermediate", label: "70–300" }, { value: "deep", label: ">300" }].map((option) => (
                      <label key={option.value}>
                        <input type="radio" name="depth" value={option.value} checked={filters.depth === option.value} onChange={() => updateFilter("depth", option.value)} />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="filter-row">
                  <label className="search-field" htmlFor="place-search">
                    <span>Search places</span>
                    <span className="input-shell"><SearchIcon /><input id="place-search" type="search" autoComplete="off" placeholder="Japan, Alaska, ridge…" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} /></span>
                  </label>
                  <label className="select-field" htmlFor="sort-select">
                    <span>Sort events</span>
                    <select id="sort-select" value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
                      <option value="newest">Newest</option>
                      <option value="strongest">Strongest</option>
                      <option value="shallowest">Shallowest</option>
                    </select>
                  </label>
                </div>

                <label className="toggle-row">
                  <input type="checkbox" checked={filters.mapOnly} onChange={(event) => updateFilter("mapOnly", event.target.checked)} />
                  <span className="toggle" aria-hidden="true"><span></span></span>
                  <span><strong>Only this map area</strong><small>Update results as you pan</small></span>
                </label>
              </form>
            </section>

            <section className="results" aria-labelledby="results-title">
              <div className="section-heading results__heading">
                <div><h2 id="results-title">Recent events</h2><p>{loading && !events.length ? "Waiting for live data" : `${filteredEvents.length.toLocaleString()} of ${events.length.toLocaleString()} events in the ${timeframeLabel}`}</p></div>
                {activeFilterCount ? <span className="filter-count">{activeFilterCount} active</span> : null}
              </div>

              {stale ? <div className="stale-banner" role="status"><span></span>Showing the last successful update</div> : null}

              <div className="event-list" id="event-list" aria-busy={loading && !events.length}>
                {loading && !events.length ? <SkeletonList /> : null}
                {!loading && error && !events.length ? <ErrorResults message={error} onRetry={() => loadData("manual")} /> : null}
                {!loading && !error && events.length && !filteredEvents.length ? <EmptyResults onReset={resetFilters} /> : null}
                {visibleRows.map((event) => <EventRow key={event.id} event={event} selected={selectedId === event.id} onSelect={(id) => handleSelect(id, [id], "list")} />)}
              </div>

              {filteredEvents.length > listLimit ? (
                <button className="load-more" type="button" onClick={() => setListLimit((limit) => limit + LIST_PAGE_SIZE)}>
                  Show {Math.min(LIST_PAGE_SIZE, filteredEvents.length - listLimit)} more events
                </button>
              ) : null}
            </section>
          </aside>

          <section className="map-stage" aria-label="Earthquake map workspace">
            <MapView
              events={filteredEvents}
              selectedEvent={selectedEvent}
              focusRequest={focusRequest}
              onBoundsChange={setBounds}
              onNotice={showNotice}
              onSelect={handleSelect}
            />

            <DetailDrawer
              event={selectedEvent}
              overlappingEvents={overlappingEvents.length ? overlappingEvents : selectedEvent ? [selectedEvent] : []}
              onClose={() => { setSelectedId(null); setOverlapIds([]); }}
              onCopy={copyCoordinates}
              onFocus={focusSelected}
              onSelectOverlap={(id) => handleSelect(id, overlapIds, "overlap")}
            />
          </section>
        </main>
      </div>

      {toast ? <div className={`toast toast--${toast.tone}`} role="status">{toast.message}</div> : null}
    </>
  );
}
