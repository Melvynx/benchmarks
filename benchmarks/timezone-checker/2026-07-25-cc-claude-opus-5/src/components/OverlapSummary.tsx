import type { City } from '../data/cities'
import type { Board, HourRange, Mode } from '../lib/overlap'
import { formatHour, type TimeFormat } from '../lib/time'
import { cx } from './cell-style'

function RangeBadge({ range, timeFormat }: { range: HourRange; timeFormat: TimeFormat }) {
  if (range.length === 24) {
    return (
      <span className="rounded-md border border-glow/25 bg-glow-soft px-2 py-1 text-xs font-medium text-glow">
        All day
      </span>
    )
  }
  return (
    <span className="tnum rounded-md border border-glow/25 bg-glow-soft px-2 py-1 text-xs font-medium text-glow">
      {formatHour(range.start, timeFormat)}
      <span className="mx-1 text-glow/50">—</span>
      {formatHour(range.end, timeFormat)}
    </span>
  )
}

function NoOverlap({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-md border border-warn/25 bg-warn/10 px-2 py-1 font-medium text-warn',
        compact ? 'text-xs' : 'text-sm',
      )}
    >
      <span aria-hidden>⚠</span> No overlap
    </span>
  )
}

const hoursLabel = (hours: number) => `${hours} ${hours === 1 ? 'hour' : 'hours'}`

export function OverlapSummary({
  board,
  mode,
  referenceCity,
  timeFormat,
}: {
  board: Board
  mode: Mode
  referenceCity: City
  timeFormat: TimeFormat
}) {
  const anchor = (
    <span className="text-xs text-ink-faint">
      in <span className="text-ink-muted">{referenceCity.name}</span> time
    </span>
  )

  if (mode === 'meeting') {
    const { hours, ranges } = board.meeting
    return (
      <section className="rounded-xl border border-line bg-surface/70 p-4 backdrop-blur-sm sm:p-5">
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
            Everyone awake
          </h2>
          {anchor}
        </header>

        {hours === 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <NoOverlap />
            <p className="text-sm text-ink-muted">
              No hour of the day finds all {board.rows.length} cities awake. Try widening the
              awake window, dropping a city, or switching to Base mode.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-3">
            <p className="text-3xl font-semibold tracking-tight text-glow tnum">
              {hoursLabel(hours)}
            </p>
            <div className="flex flex-wrap gap-2">
              {ranges.map((range) => (
                <RangeBadge key={`${range.start}-${range.end}`} range={range} timeFormat={timeFormat} />
              ))}
            </div>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-line bg-surface/70 p-4 backdrop-blur-sm sm:p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
          Overlap with {referenceCity.name}
        </h2>
        {anchor}
      </header>

      <ul className="divide-y divide-line/70">
        {board.perCity.map((entry) => (
          <li
            key={entry.city.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5 first:pt-0 last:pb-0"
          >
            <span className="text-sm font-medium text-ink">{entry.city.name}</span>
            {entry.hours === 0 ? (
              <NoOverlap compact />
            ) : (
              <span className="flex flex-wrap items-center gap-2">
                <span className="tnum text-sm font-semibold text-glow">
                  {hoursLabel(entry.hours)}
                </span>
                {entry.ranges.map((range) => (
                  <RangeBadge
                    key={`${range.start}-${range.end}`}
                    range={range}
                    timeFormat={timeFormat}
                  />
                ))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
