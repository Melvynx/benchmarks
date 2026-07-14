import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Brush, Filters, Period, SortKey } from "./types";
import { DEFAULT_FILTERS } from "./types";
import { PERIOD_LABEL, PERIOD_MS, type GeocodeHit } from "./lib/api";
import {
  applyBrush,
  countActiveFilters,
  formatLocal,
  formatMag,
  matchesFilters,
  relativeTime,
  sortQuakes,
  strongestOf,
} from "./lib/quake";
import { readUrlState, writeUrlState } from "./lib/urlState";
import { useFeed, useNow, useOnline } from "./hooks/useFeed";
import { MapView } from "./components/MapView";
import { Timeline } from "./components/Timeline";
import { EventList } from "./components/EventList";
import { EventDetail } from "./components/EventDetail";
import { FilterPanel } from "./components/FilterPanel";
import { SearchBox } from "./components/SearchBox";

const PERIODS: Period[] = ["hour", "day", "week", "month"];
const STALE_AFTER_MS = 20 * 60 * 1000;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export default function App() {
  const initial = useMemo(readUrlState, []);
  const [period, setPeriod] = useState<Period>(initial.period);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [brush, setBrush] = useState<Brush>(initial.brush);
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(countActiveFilters(initial.filters) > 0);
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [mapBounds, setMapBounds] = useState<[number, number, number, number] | null>(null);
  const [flyTo, setFlyTo] = useState<{ lon: number; lat: number; zoom?: number; token: number } | null>(null);

  const feed = useFeed(period);
  const now = useNow(30_000);
  const online = useOnline();
  const reducedMotion = usePrefersReducedMotion();
  const liveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    writeUrlState({ period, filters, sort, brush, selectedId });
  }, [period, filters, sort, brush, selectedId]);

  const quakes = useMemo(() => feed.data?.quakes ?? [], [feed.data]);

  const domain = useMemo<[number, number]>(() => {
    const end = feed.data?.generated ?? feed.data?.fetchedAt ?? now;
    return [end - PERIOD_MS[period], end];
  }, [feed.data, period, now]);

  // Pipeline: period feed → filters → (timeline) → brush → sort → (map, list)
  const filtered = useMemo(
    () => quakes.filter((q) => matchesFilters(q, filters, mapBounds)),
    [quakes, filters, mapBounds],
  );
  const brushed = useMemo(() => applyBrush(filtered, brush), [filtered, brush]);
  const sorted = useMemo(() => sortQuakes(brushed, sort), [brushed, sort]);

  const selected = useMemo(
    () => (selectedId ? quakes.find((q) => q.id === selectedId) ?? null : null),
    [selectedId, quakes],
  );
  const strongest = useMemo(() => strongestOf(brushed), [brushed]);

  // Screen-reader announcements for data/result changes.
  useEffect(() => {
    if (!liveRef.current) return;
    if (feed.loading) liveRef.current.textContent = "Loading earthquake data from USGS…";
    else if (feed.error && !feed.data) liveRef.current.textContent = "Could not load earthquake data.";
    else
      liveRef.current.textContent = `${brushed.length} of ${quakes.length} events shown for ${PERIOD_LABEL[
        period
      ].toLowerCase()}.`;
  }, [brushed.length, quakes.length, feed.loading, feed.error, feed.data, period]);

  const patchFilters = useCallback((patch: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  const resetAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setBrush(null);
  }, []);

  const selectAndReveal = useCallback(
    (id: string | null, reveal: boolean) => {
      setSelectedId(id);
      if (id && reveal) {
        const q = quakes.find((e) => e.id === id);
        if (q) setFlyTo({ lon: q.lon, lat: q.lat, token: Date.now() });
      }
    },
    [quakes],
  );

  const goToPlace = useCallback((hit: GeocodeHit) => {
    setFlyTo({ lon: hit.lon, lat: hit.lat, zoom: hit.bbox ? undefined : 7, token: Date.now() });
    setMobileView("map");
  }, []);

  const handlePeriod = useCallback((p: Period) => {
    setPeriod(p);
    setBrush(null); // a window from another period range would silently empty results
  }, []);

  const activeFilterCount = countActiveFilters(filters);
  const dataAge = feed.data ? now - (feed.data.generated ?? feed.data.fetchedAt) : null;
  const isStale = dataAge != null && dataAge > STALE_AFTER_MS;

  const headline = useMemo(() => {
    if (!feed.data) return null;
    if (brushed.length === 0) return null;
    if (!strongest) return { text: `${brushed.length} events, none with a measured magnitude yet.` };
    return {
      quake: strongest,
      text: `Strongest ${brush ? "in window" : PERIOD_LABEL[period].toLowerCase()}: M ${formatMag(
        strongest.mag,
      )} — ${strongest.place ?? strongest.title}, ${relativeTime(strongest.time, now)}`,
    };
  }, [feed.data, brushed.length, strongest, period, now, brush]);

  return (
    <div className="app">
      <a className="skip-link" href="#event-stream">
        Skip to event stream
      </a>
      <p ref={liveRef} className="sr-only" role="status" aria-live="polite" />

      <header className="topbar">
        <div className="wordmark">
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#211d16" />
            <path
              d="M4 20h5l2-9 3 14 3-18 3 13 2-5h6"
              stroke="#e8d5a8"
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>
            QuakeScope
            <small>live seismic observatory</small>
          </span>
        </div>

        <nav className="periods" aria-label="Time period">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              className={`period-btn ${period === p ? "is-on" : ""}`}
              aria-pressed={period === p}
              onClick={() => handlePeriod(p)}
            >
              {p === "hour" ? "Hour" : p === "day" ? "24 h" : p === "week" ? "7 days" : "30 days"}
            </button>
          ))}
        </nav>

        <div className="topbar-search">
          <SearchBox query={filters.query} onQuery={(q) => patchFilters({ query: q })} onGoTo={goToPlace} />
        </div>

        <div className="status-cluster">
          {!online && <span className="status-pill status-offline">Offline</span>}
          {online && isStale && <span className="status-pill status-stale">Data may be stale</span>}
          <span className="status-updated mono" title={feed.data ? formatLocal(feed.data.fetchedAt) : undefined}>
            {feed.data
              ? `Updated ${relativeTime(feed.data.generated ?? feed.data.fetchedAt, now)}`
              : feed.loading
                ? "Loading…"
                : "No data"}
          </span>
          <button
            type="button"
            className="btn-refresh"
            onClick={feed.refresh}
            disabled={feed.loading || feed.refreshing}
          >
            <span aria-hidden="true" className={feed.refreshing ? "spin" : ""}>↻</span>
            {feed.refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {feed.error && feed.data && (
        <div className="banner banner-warn" role="alert">
          Refresh failed ({feed.error}). Showing data from{" "}
          {relativeTime(feed.data.generated ?? feed.data.fetchedAt, now)}.
          <button type="button" className="btn-ghost" onClick={feed.refresh}>
            Try again
          </button>
        </div>
      )}

      <div className="layout">
        <aside className={`rail ${mobileView === "list" ? "is-mobile-visible" : ""}`}>
          {selected ? (
            <EventDetail
              quake={selected}
              now={now}
              onBack={() => setSelectedId(null)}
              onLocate={() => {
                setFlyTo({ lon: selected.lon, lat: selected.lat, zoom: 5.5, token: Date.now() });
                setMobileView("map");
              }}
            />
          ) : (
            <>
              {headline && (
                <button
                  type="button"
                  className="headline"
                  onClick={() => headline.quake && selectAndReveal(headline.quake.id, true)}
                  disabled={!headline.quake}
                >
                  {headline.text}
                </button>
              )}

              <FilterPanel
                filters={filters}
                onChange={patchFilters}
                sort={sort}
                onSort={setSort}
                activeCount={activeFilterCount}
                onReset={resetAll}
                open={filtersOpen}
                onToggle={() => setFiltersOpen((v) => !v)}
              />

              <p className="result-count" id="event-stream">
                {feed.loading ? (
                  "Loading events…"
                ) : (
                  <>
                    <strong className="mono">{brushed.length.toLocaleString("en-US")}</strong> of{" "}
                    <strong className="mono">{quakes.length.toLocaleString("en-US")}</strong> events
                    {brush ? " in time window" : ""} · {PERIOD_LABEL[period]}
                  </>
                )}
              </p>

              {feed.loading && (
                <div className="skeleton-list" aria-hidden="true">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="skeleton-row">
                      <span className="skeleton-disc" />
                      <span className="skeleton-lines">
                        <span />
                        <span />
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!feed.loading && feed.error && !feed.data && (
                <div className="state-card" role="alert">
                  <h2>USGS data unavailable</h2>
                  <p>{feed.error}</p>
                  <p>Your filters are preserved. Check your connection and try again.</p>
                  <button type="button" className="btn-solid" onClick={feed.refresh}>
                    Retry
                  </button>
                </div>
              )}

              {!feed.loading && feed.data && brushed.length === 0 && (
                <div className="state-card">
                  <h2>No events match</h2>
                  <p>
                    {quakes.length.toLocaleString("en-US")} events were reported in{" "}
                    {PERIOD_LABEL[period].toLowerCase()}, but none match{" "}
                    {activeFilterCount > 0 && brush
                      ? "your filters and time window"
                      : brush
                        ? "your time window"
                        : "your filters"}
                    .
                  </p>
                  <button type="button" className="btn-solid" onClick={resetAll}>
                    Reset filters &amp; window
                  </button>
                </div>
              )}

              {!feed.loading && brushed.length > 0 && (
                <EventList
                  quakes={sorted}
                  selectedId={selectedId}
                  hoveredId={hoveredId}
                  onSelect={(id) => selectAndReveal(id, true)}
                  onHover={setHoveredId}
                  now={now}
                />
              )}

              <footer className="rail-foot">
                Data: <a href="https://earthquake.usgs.gov/" target="_blank" rel="noopener noreferrer">USGS Earthquake Hazards Program</a>.
                Events may be revised or deleted as they are reviewed. This is an exploration tool, not
                an alert service — for warnings, rely on your local authorities.
              </footer>
            </>
          )}
        </aside>

        <main className={`stage ${mobileView === "list" ? "is-mobile-hidden" : ""}`} aria-label="Map and timeline">
          <div className="map-wrap">
            <MapView
              quakes={brushed}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={(id) => selectAndReveal(id, false)}
              onHover={setHoveredId}
              onViewportChange={setMapBounds}
              flyTo={flyTo}
              reducedMotion={reducedMotion}
            />
            {feed.loading && <div className="map-veil">Loading live USGS data…</div>}
            <div className="map-legend" aria-hidden="true">
              <span className="legend-title">Magnitude</span>
              <span className="legend-item"><i className="dot band-minor" />&lt; 2.5</span>
              <span className="legend-item"><i className="dot band-light" />2.5–4.4</span>
              <span className="legend-item"><i className="dot band-moderate" />4.5–5.9</span>
              <span className="legend-item"><i className="dot band-major" />6+</span>
              <span className="legend-item"><i className="dot dot-deep" />deep &gt;300 km</span>
            </div>
          </div>
          <Timeline
            quakes={filtered}
            domain={domain}
            period={period}
            brush={brush}
            onBrush={setBrush}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onSelect={(id) => selectAndReveal(id, true)}
            reducedMotion={reducedMotion}
          />
        </main>
      </div>

      <nav className="mobile-switch" aria-label="View">
        <button
          type="button"
          className={mobileView === "map" ? "is-on" : ""}
          aria-pressed={mobileView === "map"}
          onClick={() => setMobileView("map")}
        >
          Map
        </button>
        <button
          type="button"
          className={mobileView === "list" ? "is-on" : ""}
          aria-pressed={mobileView === "list"}
          onClick={() => setMobileView("list")}
        >
          List{feed.data ? ` (${brushed.length.toLocaleString("en-US")})` : ""}
        </button>
      </nav>
    </div>
  );
}
