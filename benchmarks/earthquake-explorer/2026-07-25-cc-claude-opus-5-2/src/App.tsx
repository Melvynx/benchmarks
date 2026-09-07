import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ControlPanel } from "./components/ControlPanel";
import { DetailPanel } from "./components/DetailPanel";
import { EventList } from "./components/EventList";
import { Header } from "./components/Header";
import { Legend } from "./components/Legend";
import { MapControls } from "./components/MapControls";
import { MapView } from "./components/MapView";
import { SortSelect } from "./components/SortSelect";
import { Timeline } from "./components/Timeline";
import { useEarthquakes, useNow } from "./hooks/useEarthquakes";
import { useMediaQuery } from "./hooks/useMediaQuery";
import type { BasemapId, ProjectionId } from "./lib/basemaps";
import type { ColorMode } from "./lib/color";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  applyFilters,
  sortQuakes,
  summarize,
  type Filters,
  type SortKey,
} from "./lib/filters";
import type { Bounds } from "./lib/geo";
import { feedWindow, type WindowId } from "./lib/usgs";

export default function App() {
  const [windowId, setWindowId] = useState<WindowId>("day");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>("recent");
  const [colorMode, setColorMode] = useState<ColorMode>("magnitude");
  const [basemapId, setBasemapId] = useState<BasemapId>("night");
  const [projection, setProjection] = useState<ProjectionId>("flat");
  const [showPlates, setShowPlates] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [flyToken, setFlyToken] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<"map" | "list">("map");
  const [mapUnsupported, setMapUnsupported] = useState(false);

  const { data, status, error, refreshing, lastLoadedAt, refresh } = useEarthquakes(windowId);
  const now = useNow();
  const isCompact = useMediaQuery("(max-width: 1080px)");

  const quakes = useMemo(() => data?.quakes ?? [], [data]);

  // Bounds change on every pan; only re-filter when the viewport filter is on.
  const effectiveBounds = filters.viewportOnly ? bounds : null;

  const filtered = useMemo(
    () => applyFilters(quakes, filters, effectiveBounds),
    [quakes, filters, effectiveBounds],
  );
  const sorted = useMemo(() => sortQuakes(filtered, sort), [filtered, sort]);
  const stats = useMemo(() => summarize(filtered), [filtered]);

  const selected = useMemo(
    () => quakes.find((quake) => quake.id === selectedId) ?? null,
    [quakes, selectedId],
  );

  /* -------------------------------------------------------------------- */
  /* Selection                                                            */
  /* -------------------------------------------------------------------- */

  const selectFromMap = useCallback((id: string | null) => setSelectedId(id), []);

  const selectAndFly = useCallback((id: string) => {
    setSelectedId(id);
    setFlyToken((token) => token + 1);
  }, []);

  const closeDetail = useCallback(() => setSelectedId(null), []);

  // Escape closes the detail panel, then the mobile drawer.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (drawerOpen) setDrawerOpen(false);
      else setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // A selection that no longer exists after a refresh should not linger.
  useEffect(() => {
    if (selectedId && quakes.length > 0 && !quakes.some((q) => q.id === selectedId)) {
      setSelectedId(null);
    }
  }, [quakes, selectedId]);

  /* -------------------------------------------------------------------- */
  /* Time window / brush                                                  */
  /* -------------------------------------------------------------------- */

  const activeWindow = feedWindow(windowId);

  // The strip always spans the full feed window, anchored to the newest event
  // so a stale feed does not leave a gap at the right edge.
  const timelineTo = useMemo(() => {
    const newest = quakes.length > 0 ? quakes[0].time : now;
    return Math.max(newest, data?.generated ?? 0, now - 60_000);
  }, [quakes, data, now]);
  const timelineFrom = timelineTo - activeWindow.durationMs;

  const brush = useMemo<[number, number] | null>(
    () =>
      filters.timeFrom !== null && filters.timeTo !== null
        ? [filters.timeFrom, filters.timeTo]
        : null,
    [filters.timeFrom, filters.timeTo],
  );

  const setBrush = useCallback((range: [number, number] | null) => {
    setFilters((prev) => ({
      ...prev,
      timeFrom: range?.[0] ?? null,
      timeTo: range?.[1] ?? null,
    }));
  }, []);

  // Switching windows invalidates any brush drawn on the previous one.
  const changeWindow = useCallback((id: WindowId) => {
    setWindowId(id);
    setFilters((prev) => ({ ...prev, timeFrom: null, timeTo: null }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  /* -------------------------------------------------------------------- */
  /* Layout                                                               */
  /* -------------------------------------------------------------------- */

  const sidebarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isCompact) setDrawerOpen(false);
  }, [isCompact]);

  // On a phone, choosing an event should reveal it on the map.
  useEffect(() => {
    if (isCompact && selectedId) setMobilePane("map");
  }, [isCompact, selectedId]);

  // The filter sheet covers the whole content area, so switching tabs while it
  // is open would land you behind it.
  const showPane = useCallback((pane: "map" | "list") => {
    setMobilePane(pane);
    setDrawerOpen(false);
  }, []);

  const controls = (
    <ControlPanel
      windowId={windowId}
      onWindowChange={changeWindow}
      filters={filters}
      onFiltersChange={setFilters}
      colorMode={colorMode}
      onColorModeChange={setColorMode}
      onReset={resetFilters}
      resultCount={filtered.length}
      totalCount={quakes.length}
    />
  );

  const isInitialLoad = status === "loading" && quakes.length === 0;

  return (
    <div className={`app ${isCompact ? "is-compact" : ""}`} data-pane={mobilePane}>
      <Header
        stats={stats}
        status={status}
        refreshing={refreshing}
        lastLoadedAt={lastLoadedAt}
        now={now}
        colorMode={colorMode}
        windowLabel={activeWindow.longLabel}
        onRefresh={refresh}
        onSelect={(quake) => selectAndFly(quake.id)}
        onOpenControls={isCompact ? () => setDrawerOpen(true) : undefined}
        activeFilters={activeFilterCount(filters)}
      />

      {status === "error" && quakes.length === 0 ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : null}

      <main className="layout">
        <div ref={sidebarRef} className={`sidebar ${drawerOpen ? "is-open" : ""}`}>
          <div className="sidebar-scroll">
            {isCompact ? (
              <div className="drawer-head">
                <span>Explore</span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close filters"
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ) : null}
            {controls}
          </div>

          <div className="sidebar-list">
            <div className="sidebar-list-head">
              <h2>Events</h2>
              <span>{sorted.length.toLocaleString()}</span>
              <SortSelect sort={sort} onSortChange={setSort} />
            </div>
            {isInitialLoad ? (
              <ListSkeleton />
            ) : (
              <EventList
                quakes={sorted}
                selectedId={selectedId}
                colorMode={colorMode}
                now={now}
                onSelect={(quake) => selectAndFly(quake.id)}
              />
            )}
          </div>
        </div>

        <div className="stage">
          <div className="stage-map">
            <MapView
              quakes={filtered}
              colorMode={colorMode}
              basemapId={basemapId}
              projection={projection}
              showPlates={showPlates}
              selected={selected}
              now={now}
              flyToken={flyToken}
              onSelect={selectFromMap}
              onBoundsChange={setBounds}
              onUnsupported={() => setMapUnsupported(true)}
            />

            <div className="stage-overlay stage-overlay-left">
              {/* No map to restyle if it never rendered; the legend stays, since
                  the list and detail panel use the same colours. */}
              {mapUnsupported ? null : (
                <MapControls
                  basemapId={basemapId}
                  onBasemapChange={setBasemapId}
                  projection={projection}
                  onProjectionChange={setProjection}
                  showPlates={showPlates}
                  onShowPlatesChange={setShowPlates}
                />
              )}
              <Legend mode={colorMode} />
            </div>

            {isInitialLoad ? (
              <div className="stage-loading">
                <span className="pulse-ring" aria-hidden="true" />
                <p>Reading the USGS feed…</p>
              </div>
            ) : null}

            {selected ? (
              <DetailPanel
                quake={selected}
                allQuakes={quakes}
                colorMode={colorMode}
                now={now}
                onClose={closeDetail}
                onSelect={(quake) => selectAndFly(quake.id)}
                onLocate={() => setFlyToken((token) => token + 1)}
              />
            ) : null}
          </div>

          <Timeline
            quakes={quakes}
            from={timelineFrom}
            to={timelineTo}
            selection={brush}
            onSelectionChange={setBrush}
            now={now}
            windowLabel={activeWindow.longLabel}
          />
        </div>
      </main>

      {isCompact ? (
        <nav className="tabbar" aria-label="View switcher">
          <button
            type="button"
            className={mobilePane === "map" ? "is-active" : ""}
            aria-pressed={mobilePane === "map"}
            onClick={() => showPane("map")}
          >
            Map
          </button>
          <button
            type="button"
            className={mobilePane === "list" ? "is-active" : ""}
            aria-pressed={mobilePane === "list"}
            onClick={() => showPane("list")}
          >
            List <span className="tabbar-count">{sorted.length.toLocaleString()}</span>
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="banner banner-error" role="alert">
      <strong>Could not load the USGS feed.</strong>
      <span>{message ?? "Check your connection and try again."}</span>
      <button type="button" className="btn" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 60}ms` }}>
          <span className="skeleton-badge" />
          <span className="skeleton-lines">
            <span className="skeleton-line" />
            <span className="skeleton-line skeleton-line-short" />
          </span>
        </div>
      ))}
    </div>
  );
}
