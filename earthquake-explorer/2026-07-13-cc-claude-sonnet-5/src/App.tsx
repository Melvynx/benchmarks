import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useEarthquakes } from "./hooks/useEarthquakes";
import { useNow } from "./hooks/useNow";
import { useUrlFilters, DEFAULT_FILTERS } from "./lib/urlState";
import { applyFilters } from "./lib/filterEvents";
import { getTimeRange } from "./lib/usgs";
import { Header } from "./components/Header";
import { StoryStrip } from "./components/StoryStrip";
import { FilterBar } from "./components/FilterBar";
import { Timeline, type TimeWindow } from "./components/Timeline";
import { MapErrorBoundary } from "./components/MapErrorBoundary";
import { Legend } from "./components/Legend";
import { EventList } from "./components/EventList";
import { EventDetail } from "./components/EventDetail";
import { LoadingSkeleton, ErrorState, EmptyFilteredState, StaleBanner } from "./components/States";

const MapView = lazy(() => import("./components/MapView").then((m) => ({ default: m.MapView })));

type MobileTab = "map" | "list";

function App() {
  const { filters, setFilters, isDefault } = useUrlFilters();
  const feed = useEarthquakes(filters.range);
  const nowMs = useNow();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("map");
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);
  const flyTokenRef = useRef(0);
  const [flyToken, setFlyToken] = useState(0);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const wasDetailActiveRef = useRef(false);

  useEffect(() => {
    setTimeWindow(null);
  }, [filters.range]);

  const filteredEvents = useMemo(() => applyFilters(feed.events, filters), [feed.events, filters]);

  const windowIds = useMemo(() => {
    if (!timeWindow) return null;
    const set = new Set<string>();
    for (const e of filteredEvents) {
      if (e.timeMs >= timeWindow.startMs && e.timeMs < timeWindow.endMs) set.add(e.id);
    }
    return set;
  }, [filteredEvents, timeWindow]);

  const listEvents = useMemo(() => {
    if (!windowIds) return filteredEvents;
    return filteredEvents.filter((e) => windowIds.has(e.id));
  }, [filteredEvents, windowIds]);

  const selectedEvent = useMemo(
    () => (filters.selected ? (feed.events.find((e) => e.id === filters.selected) ?? null) : null),
    [feed.events, filters.selected],
  );

  function selectEvent(id: string) {
    const event = feed.events.find((e) => e.id === id);
    setFilters((prev) => ({ ...prev, selected: id }));
    if (event) {
      setFlyTarget({ lat: event.latitude, lon: event.longitude, zoom: 5 });
      flyTokenRef.current += 1;
      setFlyToken(flyTokenRef.current);
    }
  }

  function closeDetail() {
    setFilters((prev) => ({ ...prev, selected: null }), true);
    setMobileTab("list");
  }

  function resetFilters() {
    setFilters(() => ({ ...DEFAULT_FILTERS, range: filters.range }));
    setTimeWindow(null);
  }

  function focusStrongest(id: string) {
    selectEvent(id);
  }

  const rangeLabel = getTimeRange(filters.range).label;
  const detailActive = Boolean(selectedEvent);
  const backLabel = "Back to list";

  useEffect(() => {
    if (wasDetailActiveRef.current && !detailActive) {
      listHeadingRef.current?.focus();
    }
    wasDetailActiveRef.current = detailActive;
  }, [detailActive]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ink-950 text-ink-100">
      <a
        href="#panel-region"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-ink-950"
      >
        Skip to event list
      </a>

      <Header
        fetchedAtMs={feed.fetchedAtMs}
        isRefreshing={feed.isRefreshing}
        isStale={feed.isStale}
        nowMs={nowMs}
        onRefresh={feed.refresh}
      />

      {feed.status !== "error" && (
        <StoryStrip events={filteredEvents} rangeLabel={rangeLabel} nowMs={nowMs} onFocusStrongest={focusStrongest} />
      )}

      <FilterBar
        filters={filters}
        setFilters={setFilters}
        isDefault={isDefault}
        onReset={resetFilters}
        resultCount={filteredEvents.length}
        totalCount={feed.events.length}
      />

      {feed.isStale && feed.error && <StaleBanner message={feed.error} />}

      {feed.status === "loading" ? (
        <div className="flex-1 min-h-0">
          <LoadingSkeleton />
        </div>
      ) : feed.status === "error" ? (
        <div className="flex-1 min-h-0">
          <ErrorState message={feed.error ?? "Could not load earthquake data."} onRetry={feed.refresh} />
        </div>
      ) : (
        <>
          <div className="border-b border-ink-800 px-3 py-2.5 sm:px-4">
            <Timeline
              events={filteredEvents}
              range={filters.range}
              nowMs={nowMs}
              timeWindow={timeWindow}
              onTimeWindowChange={setTimeWindow}
              hoveredId={hoveredId}
              selectedId={filters.selected}
              onHover={setHoveredId}
            />
          </div>

          <div className="flex min-h-0 items-center gap-1 border-b border-ink-800 px-3 py-1.5 sm:px-4 lg:hidden">
            <div role="tablist" aria-label="View" className="flex rounded-md border border-ink-600 bg-ink-900 p-0.5">
              <button
                role="tab"
                aria-selected={mobileTab === "map"}
                onClick={() => setMobileTab("map")}
                className={`min-h-11 rounded px-4 text-[12.5px] font-medium ${
                  mobileTab === "map" ? "bg-accent text-ink-950" : "text-ink-300"
                }`}
              >
                Map
              </button>
              <button
                role="tab"
                aria-selected={mobileTab === "list"}
                onClick={() => setMobileTab("list")}
                className={`min-h-11 rounded px-4 text-[12.5px] font-medium ${
                  mobileTab === "list" ? "bg-accent text-ink-950" : "text-ink-300"
                }`}
              >
                List
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
            <div
              className={
                mobileTab === "map" && !detailActive
                  ? "flex flex-1 min-h-0 relative lg:flex"
                  : "hidden flex-1 min-h-0 relative lg:flex"
              }
            >
              <MapErrorBoundary>
                <Suspense
                  fallback={
                    <div className="flex h-full w-full items-center justify-center bg-ink-900 text-[12.5px] text-ink-400">
                      Loading map…
                    </div>
                  }
                >
                  <MapView
                    events={filteredEvents}
                    selectedId={filters.selected}
                    hoveredId={hoveredId}
                    windowIds={windowIds}
                    onSelect={selectEvent}
                    onHover={setHoveredId}
                    flyToToken={flyToken}
                    flyToTarget={flyTarget}
                  />
                </Suspense>
              </MapErrorBoundary>
              <Legend />
            </div>

            <div
              id="panel-region"
              className={
                detailActive
                  ? "hidden lg:hidden"
                  : mobileTab === "list"
                    ? "flex w-full flex-1 min-h-0 flex-col lg:flex lg:w-[380px] lg:shrink-0 lg:border-l lg:border-ink-800"
                    : "hidden lg:flex lg:w-[380px] lg:shrink-0 lg:flex-col lg:min-h-0 lg:border-l lg:border-ink-800"
              }
            >
              <div className="flex items-center justify-between border-b border-ink-800 px-4 py-2.5">
                <h2 ref={listHeadingRef} tabIndex={-1} className="text-[12.5px] font-semibold text-ink-100 outline-none">
                  {listEvents.length.toLocaleString()} event{listEvents.length === 1 ? "" : "s"}
                  {timeWindow ? " in selected window" : ""}
                </h2>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {filteredEvents.length === 0 ? (
                  <EmptyFilteredState onReset={resetFilters} />
                ) : (
                  <EventList
                    events={listEvents}
                    selectedId={filters.selected}
                    hoveredId={hoveredId}
                    onSelect={selectEvent}
                    onHover={setHoveredId}
                    nowMs={nowMs}
                    emptyMessage="No events fall inside the selected time window."
                  />
                )}
              </div>
            </div>

            {selectedEvent && (
              <div className="absolute inset-0 z-30 flex flex-col bg-ink-950 lg:static lg:inset-auto lg:z-auto lg:flex lg:w-[380px] lg:shrink-0 lg:border-l lg:border-ink-800">
                <EventDetail event={selectedEvent} nowMs={nowMs} onBack={closeDetail} onClose={closeDetail} backLabel={backLabel} />
              </div>
            )}
          </div>
        </>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-1.5 border-t border-ink-800 px-3 py-1.5 text-[10.5px] text-ink-500 sm:px-4">
        <span>
          Data: <a href="https://earthquake.usgs.gov/" target="_blank" rel="noreferrer" className="underline hover:text-ink-300">U.S. Geological Survey</a>, subject to revision. Not an emergency alert service.
        </span>
        <span>Basemap © OpenStreetMap contributors © CARTO</span>
      </footer>
    </div>
  );
}

export default App;
