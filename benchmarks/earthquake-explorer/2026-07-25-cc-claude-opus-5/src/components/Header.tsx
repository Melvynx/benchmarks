import { BAND_LABELS, type Stats } from '../lib/filters'
import { magnitudeColor } from '../lib/color'
import * as fmt from '../lib/format'
import { cx } from '../lib/cx'

const BAND_COLORS = [1, 2.5, 3.5, 4.5, 5.5, 7].map(magnitudeColor)

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="px-3.5 first:pl-0">
      <div
        className="tabular text-[15px] leading-none font-semibold"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      <div className="mt-1 text-[9.5px] tracking-[0.06em] text-ink-faint uppercase">
        {label}
      </div>
    </div>
  )
}

interface HeaderProps {
  stats: Stats
  feedTotal: number
  now: number
  updatedAt: number | null
  loading: boolean
  onRefresh: () => void
  onOpenPanel: () => void
}

export function Header({
  stats,
  feedTotal,
  now,
  updatedAt,
  loading,
  onRefresh,
  onOpenPanel,
}: HeaderProps) {
  const bandTotal = stats.bands.reduce((a, b) => a + b, 0) || 1

  return (
    <header className="z-30 flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
      <button
        type="button"
        onClick={onOpenPanel}
        aria-label="Open filters and event list"
        className="grid size-8 shrink-0 place-items-center rounded-lg border border-line text-ink-dim transition-colors hover:bg-hover hover:text-ink lg:hidden"
      >
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
          <path
            d="M2.5 4.5h11M2.5 8h11M2.5 11.5h7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="flex min-w-0 shrink-0 items-center gap-3">
        <h1 className="text-[15px] leading-none font-semibold tracking-tight whitespace-nowrap">
          Opus 5
        </h1>
        <span className="hidden h-4 w-px bg-line sm:block" aria-hidden />
        <p className="hidden text-[11px] whitespace-nowrap text-ink-faint sm:block">
          Live earthquake activity from the USGS feeds
        </p>
      </div>

      <div className="ml-auto flex min-w-0 items-center">
        <div className="hidden items-center divide-x divide-line md:flex">
          <Stat label="Shown" value={fmt.compactNumber(stats.count)} />
          <Stat
            label="Strongest"
            value={stats.maxMag !== null ? `M${fmt.magnitude(stats.maxMag)}` : '—'}
            accent={stats.maxMag !== null ? magnitudeColor(stats.maxMag) : undefined}
          />
          <Stat
            label="Median depth"
            value={stats.medianDepth !== null ? fmt.depth(stats.medianDepth) : '—'}
          />
          <Stat label="Reported felt" value={fmt.compactNumber(stats.feltCount)} />
        </div>

        <div className="mr-3 ml-3.5 hidden w-40 shrink-0 xl:block">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-line">
            {stats.bands.map((count, i) => (
              <span
                key={i}
                title={`M${BAND_LABELS[i]}: ${count}`}
                style={{
                  width: `${(count / bandTotal) * 100}%`,
                  background: BAND_COLORS[i],
                }}
              />
            ))}
          </div>
          <div className="mt-1 text-[9.5px] tracking-[0.06em] text-ink-faint uppercase">
            Magnitude mix · {fmt.compactNumber(feedTotal)} in feed
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh from USGS"
          className="flex shrink-0 items-center gap-2 rounded-lg border border-line bg-void/50 px-2.5 py-1.5 text-[10.5px] font-medium text-ink-dim transition-colors hover:bg-hover hover:text-ink disabled:opacity-60"
        >
          <span
            className={cx(
              'size-1.5 rounded-full',
              loading ? 'animate-live bg-amber-400' : 'animate-live bg-emerald-400',
            )}
            aria-hidden
          />
          <span className="tabular hidden whitespace-nowrap sm:inline">
            {loading
              ? 'Updating…'
              : updatedAt
                ? `Updated ${fmt.timeAgo(updatedAt, now)}`
                : 'Live'}
          </span>
          <svg
            viewBox="0 0 16 16"
            className={cx('size-3.5', loading && 'animate-spin')}
            aria-hidden
          >
            <path
              d="M13.5 8a5.5 5.5 0 1 1-1.7-3.97M13 2v3h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}
