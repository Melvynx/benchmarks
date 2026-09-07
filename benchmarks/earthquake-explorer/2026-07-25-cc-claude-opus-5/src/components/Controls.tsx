import type { ColorMode } from '../lib/color'
import { COLOR_MODE_META, rampGradient } from '../lib/color'
import {
  DEPTH_BOUNDS,
  MAG_BOUNDS,
  SORT_LABELS,
  activeFilterCount,
  type Filters,
  type SortKey,
} from '../lib/filters'
import type { FeedLevel, FeedWindow } from '../lib/usgs'
import type { BasemapId } from '../lib/basemaps'
import { BASEMAPS } from '../lib/basemaps'
import type { Projection } from './MapView'
import { DualRange, Section, Segmented, Toggle } from './ui'
import { cx } from '../lib/cx'

const WINDOWS: Array<{ value: FeedWindow; label: string; title: string }> = [
  { value: 'hour', label: '1 h', title: 'Past hour' },
  { value: 'day', label: '24 h', title: 'Past day' },
  { value: 'week', label: '7 d', title: 'Past week' },
  { value: 'month', label: '30 d', title: 'Past 30 days' },
]

const LEVELS: Array<{ value: FeedLevel; label: string; title: string }> = [
  { value: 'all', label: 'All', title: 'Every recorded event' },
  { value: '1.0', label: 'M1+', title: 'Magnitude 1.0 and above' },
  { value: '2.5', label: 'M2.5+', title: 'Magnitude 2.5 and above' },
  { value: '4.5', label: 'M4.5+', title: 'Magnitude 4.5 and above' },
  { value: 'significant', label: 'Major', title: 'Significant events only' },
]

const COLOR_MODES: ColorMode[] = ['magnitude', 'depth', 'recency', 'alert']

export interface ViewOptions {
  colorMode: ColorMode
  basemap: BasemapId
  projection: Projection
  showPlates: boolean
}

interface ControlsProps {
  feedWindow: FeedWindow
  feedLevel: FeedLevel
  onFeedChange: (window: FeedWindow, level: FeedLevel) => void
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  view: ViewOptions
  onViewChange: (view: ViewOptions) => void
  magHistogram: number[]
  onReset: () => void
}

export function Controls({
  feedWindow,
  feedLevel,
  onFeedChange,
  filters,
  onFiltersChange,
  view,
  onViewChange,
  magHistogram,
  onReset,
}: ControlsProps) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onFiltersChange({ ...filters, [key]: value })
  const setView = <K extends keyof ViewOptions>(key: K, value: ViewOptions[K]) =>
    onViewChange({ ...view, [key]: value })

  const activeCount = activeFilterCount(filters)

  return (
    <div>
      <Section title="Data window">
        <div className="space-y-1.5">
          <Segmented
            label="Time window"
            options={WINDOWS}
            value={feedWindow}
            onChange={(w) => onFeedChange(w, feedLevel)}
          />
          <Segmented
            label="Minimum magnitude in feed"
            size="sm"
            options={LEVELS}
            value={feedLevel}
            onChange={(l) => onFeedChange(feedWindow, l)}
          />
        </div>
      </Section>

      <Section title="Colour points by">
        <div className="grid grid-cols-2 gap-1.5">
          {COLOR_MODES.map((mode) => {
            const active = view.colorMode === mode
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setView('colorMode', mode)}
                aria-pressed={active}
                className={cx(
                  'flex flex-col gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors',
                  active
                    ? 'border-accent/45 bg-accent/8'
                    : 'border-line bg-void/50 hover:bg-raised',
                )}
              >
                <span
                  className={cx(
                    'text-[11px] font-medium',
                    active ? 'text-ink' : 'text-ink-faint',
                  )}
                >
                  {COLOR_MODE_META[mode].label}
                </span>
                <span
                  className="h-1.5 w-full rounded-full"
                  style={{
                    background:
                      mode === 'alert'
                        ? 'linear-gradient(90deg,#22c55e,#eab308,#f97316,#ef4444)'
                        : rampGradient(mode),
                    opacity: active ? 1 : 0.55,
                  }}
                  aria-hidden
                />
              </button>
            )
          })}
        </div>
      </Section>

      <Section
        title="Refine"
        action={
          activeCount > 0 ? (
            <button
              type="button"
              onClick={onReset}
              className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-medium text-ink-dim transition-colors hover:bg-hover hover:text-ink"
            >
              Reset {activeCount}
            </button>
          ) : null
        }
      >
        <label className="relative mb-3.5 block">
          <span className="sr-only">Search by place</span>
          <svg
            viewBox="0 0 16 16"
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-faint"
            aria-hidden
          >
            <circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.4 10.4 14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set('query', e.target.value)}
            placeholder="Search a region — Japan, Chile, Alaska…"
            className="w-full rounded-lg border border-line bg-void/60 py-1.5 pr-2.5 pl-8 text-xs placeholder:text-ink-faint focus:border-accent/40"
          />
        </label>

        <div className="space-y-3.5">
          <DualRange
            label="Magnitude"
            min={MAG_BOUNDS[0]}
            max={MAG_BOUNDS[1]}
            step={0.1}
            value={filters.magRange}
            onChange={(v) => set('magRange', v)}
            format={(v) => (v <= MAG_BOUNDS[0] ? 'any' : `M${v.toFixed(1)}`)}
            histogram={magHistogram}
            gradient={rampGradient('magnitude')}
          />

          <DualRange
            label="Depth"
            min={DEPTH_BOUNDS[0]}
            max={DEPTH_BOUNDS[1]}
            step={5}
            value={filters.depthRange}
            onChange={(v) => set('depthRange', v)}
            format={(v) => `${v} km`}
            gradient={rampGradient('depth')}
          />
        </div>

        <div className="mt-3 -ml-1.5 space-y-0.5">
          <Toggle
            checked={filters.onlyFelt}
            onChange={(v) => set('onlyFelt', v)}
            label="Only events people reported feeling"
          />
          <Toggle
            checked={filters.onlyTsunami}
            onChange={(v) => set('onlyTsunami', v)}
            label="Only tsunami-evaluated events"
          />
          <Toggle
            checked={filters.onlyAlerted}
            onChange={(v) => set('onlyAlerted', v)}
            label="Only events with a PAGER alert"
          />
        </div>

        <div className="mt-3">
          <span className="mb-1.5 block text-[11px] font-medium text-ink-faint">
            Event type
          </span>
          <Segmented
            size="sm"
            label="Event type"
            options={[
              { value: 'all', label: 'All' },
              { value: 'earthquake', label: 'Earthquakes' },
              { value: 'other', label: 'Blasts & other' },
            ]}
            value={filters.eventType}
            onChange={(v) => set('eventType', v)}
          />
        </div>
      </Section>

      <Section title="Map">
        <div className="space-y-2.5">
          <div>
            <span className="mb-1.5 block text-[11px] font-medium text-ink-faint">Basemap</span>
            <Segmented
              size="sm"
              label="Basemap"
              options={BASEMAPS.map((b) => ({ value: b.id, label: b.label }))}
              value={view.basemap}
              onChange={(v) => setView('basemap', v)}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-[11px] font-medium text-ink-faint">
              Projection
            </span>
            <Segmented
              size="sm"
              label="Projection"
              options={[
                { value: 'mercator', label: 'Flat' },
                { value: 'globe', label: 'Globe' },
              ]}
              value={view.projection}
              onChange={(v) => setView('projection', v)}
            />
          </div>
          <div className="-ml-1.5">
            <Toggle
              checked={view.showPlates}
              onChange={(v) => setView('showPlates', v)}
              label="Tectonic plate boundaries"
              hint="Most quakes trace the edges of plates"
              swatch="#5eead4"
            />
          </div>
        </div>
      </Section>
    </div>
  )
}

export function SortControl({
  value,
  onChange,
}: {
  value: SortKey
  onChange: (value: SortKey) => void
}) {
  return (
    <label className="flex items-center gap-1">
      <span className="sr-only">Sort events</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="cursor-pointer rounded-md border border-line bg-void/60 py-1 pr-1.5 pl-1.5 text-[10.5px] font-medium text-ink-dim transition-colors hover:bg-hover hover:text-ink"
      >
        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
          <option key={key} value={key} className="bg-surface">
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>
    </label>
  )
}
