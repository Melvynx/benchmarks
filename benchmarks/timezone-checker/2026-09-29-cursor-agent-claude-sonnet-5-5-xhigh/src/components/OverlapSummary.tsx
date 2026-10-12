import { CalendarCheck, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatHours, formatRange, formatUtcOffset, isFullDay } from '../lib/format'
import type { GridRow, HourRange, OverlapEntry, OverlapSummary as Summary } from '../lib/overlap'
import type { TimeFormat } from '../lib/types'

interface OverlapSummaryProps {
  summary: Summary
  reference: GridRow
  cityCount: number
  format: TimeFormat
}

function RangeBadges({ ranges, format }: { ranges: HourRange[]; format: TimeFormat }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {ranges.map((range) => (
        <li
          key={range.start}
          data-testid="overlap-range"
          className="rounded-full bg-overlap-soft px-3 py-1 text-sm font-semibold tabular-nums text-overlap-soft-ink ring-1 ring-inset ring-overlap/60"
        >
          {isFullDay(range) ? 'All day' : formatRange(range, format)}
        </li>
      ))}
    </ul>
  )
}

function Warning({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <p
      role="status"
      data-testid="overlap-warning"
      className={`inline-flex items-start gap-2 rounded-xl border border-warn-line bg-warn text-warn-ink ${
        compact ? 'px-3 py-1.5 text-sm font-semibold' : 'px-4 py-3 text-sm'
      }`}
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

function MeetingSummary({
  entry,
  cityCount,
  format,
}: {
  entry: OverlapEntry
  cityCount: number
  format: TimeFormat
}) {
  if (entry.hours === 0) {
    return (
      <Warning>
        <strong className="font-semibold">No overlap.</strong> There is no hour when all {cityCount} cities
        are awake at once. Try widening the awake window or removing a city.
      </Warning>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-overlap text-overlap-ink">
          <CalendarCheck className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-2xl font-bold leading-none tracking-tight" data-testid="overlap-count">
            {formatHours(entry.hours)}
          </p>
          <p className="mt-1 text-sm text-ink-2">everyone is awake</p>
        </div>
      </div>
      <RangeBadges ranges={entry.ranges} format={format} />
    </div>
  )
}

function BaseSummary({
  entries,
  reference,
  format,
}: {
  entries: Extract<Summary, { mode: 'base' }>['entries']
  reference: GridRow
  format: TimeFormat
}) {
  return (
    <ul className="divide-y divide-line">
      {entries.map((entry) => (
        <li
          key={entry.city.id}
          data-testid="overlap-line"
          className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4"
        >
          <div className="flex items-baseline justify-between gap-3 sm:w-56 sm:shrink-0">
            <span className="truncate font-semibold">{entry.city.name}</span>
            <span className="text-sm tabular-nums text-ink-2" data-testid="overlap-count">
              {formatHours(entry.hours)}
            </span>
          </div>
          {entry.hours === 0 ? (
            <Warning compact>No overlap with {reference.city.name}</Warning>
          ) : (
            <RangeBadges ranges={entry.ranges} format={format} />
          )}
        </li>
      ))}
    </ul>
  )
}

export function OverlapSummary({ summary, reference, cityCount, format }: OverlapSummaryProps) {
  const heading =
    summary.mode === 'meeting'
      ? `Common hours for all ${cityCount} cities`
      : `Overlap with ${reference.city.name} (base)`

  return (
    <section
      aria-label="Overlap summary"
      aria-live="polite"
      className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-2">{heading}</h2>
        <p className="text-xs text-ink-3">
          Times in {reference.city.name} ({formatUtcOffset(reference.offsetMinutes)})
        </p>
      </div>

      {summary.mode === 'meeting' ? (
        <MeetingSummary entry={summary} cityCount={cityCount} format={format} />
      ) : (
        <BaseSummary entries={summary.entries} reference={reference} format={format} />
      )}
    </section>
  )
}
