import { useCallback, useEffect, useMemo, useState } from "react";

import { Controls } from "./components/Controls";
import { Detail } from "./components/Detail";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { EventList } from "./components/EventList";
import { Legend } from "./components/Legend";
import { MapView } from "./components/MapView";
import { Timeline } from "./components/Timeline";
import { useEarthquakes, useMediaQuery, useNow } from "./hooks/useEarthquakes";
import { magColor, magInk } from "./lib/color";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  applyFilters,
  sortQuakes,
  summarize,
} from "./lib/filters";
import { formatCount, formatMag } from "./lib/format";
import { REGIONS } from "./lib/map";
import { FEEDS } from "./lib/usgs";
import type {
  BasemapId,
  Bounds,
  ColorMode,
  Filters,
  Quake,
  SortKey,
  WindowId,
} from "./lib/types";

export default function App() {
  const [windowId, setWindowId] = useState<WindowId>("day");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>("recent");
  const [colorMode, setColorMode] = useState<ColorMode>("magnitude");
  const [basemapId, setBasemapId] = useState<BasemapId>("table");
  const [showPlates, setShowPlates] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [flyId, setFlyId] = useState<string | null>(null);
  const [flyNonce, setFlyNonce] = useState(0);
  const [regionId, setRegionId] = useState("world");
  const [regionNonce, setRegionNonce] = useState(0);
  const [origin, setOrigin] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [mapOk, setMapOk] = useState(true);
  const [mobileTab, setMobileTab] = useState<"map" | "list" | "filters">("map");
  const [filtersOpen, setFiltersOpen] = useState(true);

  const { status, error, quakes, meta, refreshing, refresh } = useEarthquakes(windowId);
  const now = useNow();
  const compact = useMediaQuery("(max-width: 960px)");

  const effectiveBounds = filters.viewportOnly ? bounds : null;
  const filtered = useMemo(
    () => applyFilters(quakes, filters, effectiveBounds),
    [quakes, filters, effectiveBounds],
  );
  const sorted = useMemo(
    () => sortQuakes(filtered, sort, origin),
    [filtered, sort, origin],
  );
  const stats = useMemo(() => summarize(filtered), [filtered]);
  const selected = useMemo(
    () => quakes.find((q) => q.id === selectedId) ?? null,
    [quakes, selectedId],
  );
  const extraFilters = activeFilterCount(filters);

  const timelineTo = useMemo(() => {
    const newest = quakes[0]?.time ?? now;
    return Math.max(newest, meta?.generated ?? 0, now - 60_000);
  }, [quakes, meta, now]);
  const timelineFrom = timelineTo - FEEDS[windowId].durationMs;
  const brush = useMemo<[number, number] | null>(
    () =>
      filters.timeFrom !== null && filters.timeTo !== null
        ? [filters.timeFrom, filters.timeTo]
        : null,
    [filters.timeFrom, filters.timeTo],
  );

  const selectAndFly = useCallback((id: string) => {
    setSelectedId(id);
    setFlyId(id);
    setFlyNonce((n) => n + 1);
    if (compact) setMobileTab("map");
  }, [compact]);

  const onRegion = useCallback((id: string) => {
    setRegionId(id);
    setRegionNonce((n) => n + 1);
    if (compact) setMobileTab("map");
  }, [compact]);

  const onLocate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setSort("nearest");
        setRegionId("near");
        setRegionNonce((n) => n + 1);
        setLocating(false);
        if (compact) setMobileTab("map");
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, [compact]);

  const nearRegion = origin
    ? { center: [origin.lon, origin.lat] as [number, number], zoom: 5.4 }
    : null;
  const catalogRegion = REGIONS.find((r) => r.id === regionId) ?? null;
  const flyRegion = regionId === "near" ? nearRegion : catalogRegion;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key !== "j" && e.key !== "k") return;
      if (sorted.length === 0) return;
      const idx = selectedId ? sorted.findIndex((q) => q.id === selectedId) : -1;
      const next =
        e.key === "j"
          ? sorted[Math.min(sorted.length - 1, idx + 1)]
          : sorted[Math.max(0, idx <= 0 ? 0 : idx - 1)];
      if (next) selectAndFly(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sorted, selectedId, selectAndFly]);

  useEffect(() => {
    if (selectedId && quakes.length > 0 && !quakes.some((q) => q.id === selectedId)) {
      setSelectedId(null);
    }
  }, [quakes, selectedId]);

  const onWindow = (id: WindowId) => {
    setWindowId(id);
    setFilters((prev) => ({ ...prev, timeFrom: null, timeTo: null }));
  };

  return (
    <div className="app">
      <a className="skip" href="#events">
        Skip to event list
      </a>

      <header className="mast">
        <div className="mast-title">
          <h1>Cursor Grok 4.6</h1>
          <p className="live">
            <span className={refreshing ? "dot is-spin" : "dot"} />
            USGS live feed
            {meta ? ` · ${formatCount(meta.count)} in source` : ""}
          </p>
        </div>
        <div className="mast-stats" aria-live="polite">
          <Stat label="Showing" value={status === "loading" ? "…" : formatCount(stats.count)} />
          <Stat
            label="Strongest"
            value={stats.strongest ? formatMag(stats.strongest.mag) : "–"}
            swatch={stats.strongest ? magColor(stats.strongest.mag) : undefined}
          />
          <Stat label="Felt" value={formatCount(stats.felt)} />
          <Stat label="Tsunami" value={formatCount(stats.tsunami)} />
        </div>
        <div className="mast-actions">
          <button type="button" className="ghost" onClick={refresh} disabled={refreshing}>
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
          {compact ? (
            <div className="seg">
              <button
                type="button"
                className={mobileTab === "map" ? "seg-btn is-on" : "seg-btn"}
                onClick={() => setMobileTab("map")}
              >
                Map
              </button>
              <button
                type="button"
                className={mobileTab === "list" ? "seg-btn is-on" : "seg-btn"}
                onClick={() => setMobileTab("list")}
              >
                List
              </button>
              <button
                type="button"
                className={mobileTab === "filters" ? "seg-btn is-on" : "seg-btn"}
                onClick={() => setMobileTab("filters")}
              >
                Filters{extraFilters ? ` ${extraFilters}` : ""}
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className={compact ? `stage is-${mobileTab}` : "stage"}>
        <aside className="rail" id="events">
          {!compact ? (
            <button
              type="button"
              className="rail-toggle"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              {filtersOpen ? "Hide filters" : `Filters${extraFilters ? ` · ${extraFilters}` : ""}`}
            </button>
          ) : null}
          {(filtersOpen || compact) && (compact ? mobileTab === "filters" : true) ? (
            <Controls
              windowId={windowId}
              onWindow={onWindow}
              filters={filters}
              onFilters={setFilters}
              basemapId={basemapId}
              onBasemap={setBasemapId}
              showPlates={showPlates}
              onPlates={setShowPlates}
              regionId={regionId}
              onRegion={onRegion}
              onLocate={onLocate}
              locating={locating}
            />
          ) : null}

          {status === "error" ? (
            <div className="banner" role="alert">
              <p>{error ?? "USGS feed is unavailable."}</p>
              <button type="button" className="ghost" onClick={refresh}>
                Try again
              </button>
            </div>
          ) : null}

          {status === "loading" && (!compact || mobileTab === "list") ? <ListSkeleton /> : null}

          {status === "ready" && (!compact || mobileTab === "list") ? (
            <>
              {compact && selected ? (
                <Detail
                  quake={selected}
                  colorMode={colorMode}
                  onClose={() => setSelectedId(null)}
                />
              ) : null}
              <EventList
                quakes={sorted}
                total={sorted.length}
                selectedId={selectedId}
                sort={sort}
                colorMode={colorMode}
                now={now}
                onSort={setSort}
                onSelect={selectAndFly}
              />
            </>
          ) : null}
        </aside>

        <main className="map-wrap">
          {!mapOk ? (
            <div className="banner overlay" role="alert">
              Map failed to load. Check WebGL support.
            </div>
          ) : null}
          <ErrorBoundary
            fallback={
              <div className="banner overlay" role="alert">
                Map failed to load. Check WebGL support.
              </div>
            }
          >
            <MapView
              quakes={filtered}
              selectedId={selectedId}
              colorMode={colorMode}
              basemapId={basemapId}
              showPlates={showPlates}
              flyToId={flyId}
              flyNonce={flyNonce}
              region={flyRegion}
              regionNonce={regionNonce}
              onSelect={setSelectedId}
              onBounds={setBounds}
              onReady={setMapOk}
            />
          </ErrorBoundary>
          <div className="map-float">
            <Legend mode={colorMode} onMode={setColorMode} />
          </div>
          {selected && !compact ? (
            <div className="map-detail">
              <Detail
                quake={selected}
                colorMode={colorMode}
                onClose={() => setSelectedId(null)}
              />
            </div>
          ) : null}
          {selected && compact && mobileTab === "map" ? (
            <MiniCard quake={selected} onOpen={() => setMobileTab("list")} />
          ) : null}
        </main>
      </div>

      <Timeline
        quakes={quakes}
        from={timelineFrom}
        to={timelineTo}
        brush={brush}
        onBrush={(range) =>
          setFilters((prev) => ({
            ...prev,
            timeFrom: range?.[0] ?? null,
            timeTo: range?.[1] ?? null,
          }))
        }
      />
    </div>
  );
}

function Stat({
  label,
  value,
  swatch,
}: {
  label: string;
  value: string;
  swatch?: string;
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">
        {swatch ? <i className="swatch" style={{ background: swatch }} /> : null}
        {value}
      </span>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="skeleton" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="skel-row" />
      ))}
    </div>
  );
}

function MiniCard({ quake, onOpen }: { quake: Quake; onOpen: () => void }) {
  return (
    <button type="button" className="mini-card" onClick={onOpen}>
      <span className="mag-pill" style={{ background: magColor(quake.mag), color: magInk(quake.mag) }}>
        {formatMag(quake.mag)}
      </span>
      <span>{quake.place}</span>
    </button>
  );
}
