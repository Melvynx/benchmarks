import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Header } from './components/Header'
import { Controls, SortControl, type ViewOptions } from './components/Controls'
import { QuakeList } from './components/QuakeList'
import { DetailPanel } from './components/DetailPanel'
import { Legend } from './components/Legend'
import { Timeline } from './components/Timeline'
import { MapView } from './components/MapView'

import { useNow, useQuakes } from './hooks/useQuakes'
import {
  DEFAULT_FILTERS,
  MAG_BOUNDS,
  applyFilters,
  buildHistogram,
  computeStats,
  type Filters,
} from './lib/filters'
import type { FeedLevel, FeedWindow } from './lib/usgs'
import * as fmt from './lib/format'
import { cx } from './lib/cx'

const WINDOW_MS: Record<FeedWindow, number> = {
  hour: 3600_000,
  day: 24 * 3600_000,
  week: 7 * 24 * 3600_000,
  month: 30 * 24 * 3600_000,
}

const WINDOW_LABEL: Record<FeedWindow, string> = {
  hour: 'past hour',
  day: 'past 24 hours',
  week: 'past 7 days',
  month: 'past 30 days',
}

const MAG_BINS = 44

export default function App() {
  const [feedWindow, setFeedWindow] = useState<FeedWindow>('week')
  const [feedLevel, setFeedLevel] = useState<FeedLevel>('all')
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [view, setView] = useState<ViewOptions>({
    colorMode: 'magnitude',
    basemap: 'dark',
    projection: 'mercator',
    showPlates: true,
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focusToken, setFocusToken] = useState(0)
  const [panelOpen, setPanelOpen] = useState(false)

  const { quakes, loading, error, updatedAt, refresh } = useQuakes(feedLevel, feedWindow)
  const now = useNow()

  /** Only used for the recency ramp, so colours do not shift on every tick. */
  const colorNow = useMemo(() => updatedAt ?? now, [updatedAt, now])

  const filtered = useMemo(() => applyFilters(quakes, filters), [quakes, filters])
  const stats = useMemo(() => computeStats(filtered), [filtered])

  const selected = useMemo(
    () => quakes.find((q) => q.id === selectedId) ?? null,
    [quakes, selectedId],
  )

  // The timeline spans the whole loaded window, anchored to the last refresh.
  const domain = useMemo((): [number, number] => {
    const end = Math.max(updatedAt ?? now, quakes[0]?.time ?? 0)
    return [end - WINDOW_MS[feedWindow], end]
  }, [feedWindow, now, quakes, updatedAt])

  /** Timeline shape ignores the brush so the unselected context stays visible. */
  const timelineBins = useMemo(() => {
    const withoutTime = applyFilters(quakes, { ...filters, timeRange: null })
    return buildHistogram(withoutTime, domain, feedWindow === 'hour' ? 30 : 72)
  }, [quakes, filters, domain, feedWindow])

  const magHistogram = useMemo(() => {
    const bins = new Array<number>(MAG_BINS).fill(0)
    const [lo, hi] = MAG_BOUNDS
    for (const q of quakes) {
      const i = Math.min(MAG_BINS - 1, Math.max(0, Math.floor(((q.mag - lo) / (hi - lo)) * MAG_BINS)))
      bins[i]++
    }
    return bins
  }, [quakes])

  const selectFromList = useCallback((id: string) => {
    setSelectedId(id)
    setFocusToken((t) => t + 1)
    setPanelOpen(false)
  }, [])

  const handleFeedChange = useCallback((window: FeedWindow, level: FeedLevel) => {
    setFeedWindow(window)
    setFeedLevel(level)
    // A different window makes any brushed time range meaningless.
    setFilters((f) => ({ ...f, timeRange: null }))
  }, [])

  // Keyboard: step through results, Escape closes the detail panel.
  const filteredRef = useRef(filtered)
  filteredRef.current = filtered
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

      if (e.key === 'Escape') {
        setSelectedId(null)
        setPanelOpen(false)
        return
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return

      const list = filteredRef.current
      if (list.length === 0) return
      e.preventDefault()
      setSelectedId((current) => {
        const index = current ? list.findIndex((q) => q.id === current) : -1
        const next =
          index === -1
            ? 0
            : Math.min(list.length - 1, Math.max(0, index + (e.key === 'ArrowDown' ? 1 : -1)))
        setFocusToken((t) => t + 1)
        return list[next].id
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const resultLabel = `${fmt.compactNumber(filtered.length)} of ${fmt.compactNumber(quakes.length)} events`

  return (
    <div className="flex h-full flex-col overflow-hidden bg-void">
      <Header
        stats={stats}
        feedTotal={quakes.length}
        now={now}
        updatedAt={updatedAt}
        loading={loading}
        onRefresh={refresh}
        onOpenPanel={() => setPanelOpen(true)}
      />

      <div className="relative flex min-h-0 flex-1">
        {/* Left rail: controls above, results below. */}
        <aside
          className={cx(
            'absolute inset-y-0 left-0 z-40 flex w-[min(22rem,88vw)] flex-col border-r border-line bg-surface transition-transform duration-300 lg:relative lg:z-auto lg:w-[21.5rem] lg:translate-x-0',
            panelOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
          )}
        >
          <div className="scroll-slim max-h-[min(58vh,30rem)] shrink-0 overflow-y-auto overscroll-contain">
            <Controls
              feedWindow={feedWindow}
              feedLevel={feedLevel}
              onFeedChange={handleFeedChange}
              filters={filters}
              onFiltersChange={setFilters}
              view={view}
              onViewChange={setView}
              magHistogram={magHistogram}
              onReset={() => setFilters(DEFAULT_FILTERS)}
            />
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 border-y border-line bg-void/40 px-4 py-2">
            <span className="tabular truncate text-[11px] font-medium text-ink-dim">
              {loading && quakes.length === 0 ? 'Loading feed…' : resultLabel}
            </span>
            <SortControl
              value={filters.sort}
              onChange={(sort) => setFilters((f) => ({ ...f, sort }))}
            />
          </div>

          {error ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="text-xs font-medium text-rose-400">Feed unavailable</span>
              <span className="text-[11px] text-ink-faint">{error}</span>
              <button
                type="button"
                onClick={refresh}
                className="mt-1 rounded-lg border border-line px-3 py-1.5 text-[11px] font-medium text-ink-dim hover:bg-hover hover:text-ink"
              >
                Try again
              </button>
            </div>
          ) : loading && quakes.length === 0 ? (
            <ul className="flex-1 space-y-px p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <li
                  key={i}
                  className="h-12 animate-pulse rounded-lg bg-raised"
                  style={{ animationDelay: `${i * 60}ms`, opacity: 1 - i * 0.1 }}
                />
              ))}
            </ul>
          ) : (
            <QuakeList
              quakes={filtered}
              selectedId={selectedId}
              hoveredId={hoveredId}
              colorMode={view.colorMode}
              now={colorNow}
              onSelect={selectFromList}
              onHover={setHoveredId}
            />
          )}

          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="shrink-0 border-t border-line py-2 text-[11px] font-medium text-ink-faint lg:hidden"
          >
            Close
          </button>
        </aside>

        {panelOpen && (
          <button
            type="button"
            aria-label="Close panel"
            onClick={() => setPanelOpen(false)}
            className="absolute inset-0 z-30 bg-void/60 backdrop-blur-[2px] lg:hidden"
          />
        )}

        {/* Map column */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <MapView
              quakes={filtered}
              selected={selected}
              hoveredId={hoveredId}
              colorMode={view.colorMode}
              now={colorNow}
              basemap={view.basemap}
              projection={view.projection}
              showPlates={view.showPlates}
              focusToken={focusToken}
              onSelect={(id) => setSelectedId(id)}
              onHover={setHoveredId}
            />

            <div className="pointer-events-none absolute inset-0 z-10 p-3">
              <div className="pointer-events-auto absolute top-3 left-3">
                <Legend mode={view.colorMode} />
              </div>

              {stats.count === 0 && !loading && (
                <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-lg border border-line bg-void/90 px-3 py-2 text-[11px] text-ink-dim shadow-xl">
                  Nothing matches these filters
                </div>
              )}

              {quakes.length > 0 && (
                <div className="pointer-events-none absolute top-3 right-3 rounded-lg border border-line bg-void/85 px-2.5 py-1.5 text-right shadow-xl backdrop-blur-md">
                  <div className="tabular text-[11px] font-semibold text-ink">
                    {fmt.compactNumber(stats.count)} events plotted
                  </div>
                  <div className="text-[10px] text-ink-faint">
                    {WINDOW_LABEL[feedWindow]} · every event shown individually
                  </div>
                </div>
              )}
            </div>
          </div>

          <Timeline
            bins={timelineBins}
            domain={domain}
            selection={filters.timeRange}
            onSelect={(timeRange) => setFilters((f) => ({ ...f, timeRange }))}
            totalLabel={resultLabel}
          />
        </main>

        {/* Detail: a real column on wide screens, an overlay below that. */}
        {selected && (
          <aside className="absolute inset-y-0 right-0 z-30 w-[min(23rem,92vw)] border-l border-line shadow-2xl xl:relative xl:z-auto xl:w-[23rem] xl:shadow-none">
            <DetailPanel
              quake={selected}
              all={quakes}
              colorMode={view.colorMode}
              now={colorNow}
              onClose={() => setSelectedId(null)}
              onSelect={selectFromList}
            />
          </aside>
        )}
      </div>
    </div>
  )
}
