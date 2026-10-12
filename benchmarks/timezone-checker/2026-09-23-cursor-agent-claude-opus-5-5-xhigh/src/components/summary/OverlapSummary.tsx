import { Plus, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { BaseOverlap, CityTimeline, MeetingOverlap } from '../../domain/schedule'
import { baseShareText, localRangeLabel, meetingShareText } from '../../domain/share'
import { formatHours, formatRelativeOffset, formatUtcOffset, type TimeFormat } from '../../domain/time'
import type { Schedule } from '../../hooks/use-schedule'
import { cn } from '../../lib/cn'
import { useUiStore } from '../../state/ui-store'
import { Button } from '../ui/Button'
import { CopyButton } from './CopyButton'
import { RangeBadge } from './RangeBadge'

export function OverlapSummary({ schedule }: { schedule: Schedule }) {
  const { analysis, rows, reference, format } = schedule
  if (!reference) return null
  if (!analysis) return <NeedsAnotherCity referenceName={reference.timeline.city.name} />

  const timelines = rows.map((row) => row.timeline)
  return analysis.mode === 'meeting' ? (
    <MeetingSummary overlap={analysis} timelines={timelines} format={format} />
  ) : (
    <BaseSummary overlap={analysis} reference={reference.timeline} format={format} />
  )
}

function Panel({ tone = 'default', className, children }: { tone?: 'default' | 'warn'; className?: string; children: ReactNode }) {
  return (
    <section
      aria-label="Overlap summary"
      aria-live="polite"
      className={cn(
        'rounded-[1.25rem] border p-5 shadow-(--elev-card) sm:p-6',
        tone === 'warn' ? 'border-warn/45 bg-warn-soft' : 'border-line bg-surface',
        className,
      )}
    >
      {children}
    </section>
  )
}

function TimesIn({ timeline }: { timeline: CityTimeline }) {
  return (
    <p className="text-xs text-ink-3">
      Times in {timeline.city.name} · {formatUtcOffset(timeline.offsetMinutes)}
    </p>
  )
}

const everyCityDetail = (timelines: readonly CityTimeline[], range: MeetingOverlap['ranges'][number], format: TimeFormat) =>
  timelines.map((t) => `${t.city.name}: ${localRangeLabel(t, range, format)}`).join('\n')

function MeetingSummary({
  overlap,
  timelines,
  format,
}: {
  overlap: MeetingOverlap
  timelines: CityTimeline[]
  format: TimeFormat
}) {
  const [reference] = timelines
  if (!reference) return null
  if (overlap.hours === 0) return <NoMeetingOverlap overlap={overlap} timelines={timelines} format={format} />

  return (
    <Panel className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <p className="font-display text-[4rem] leading-[0.8] text-ink tabular-nums">
          {overlap.hours}
          <span className="text-[2.5rem] text-ink-3">h</span>
        </p>
        <div>
          <h2 className="text-[15px] font-semibold text-ink">
            {overlap.hours === 24 ? 'Everyone is awake around the clock' : `${formatHours(overlap.hours)} when everyone’s awake`}
          </h2>
          <TimesIn timeline={reference} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {overlap.ranges.map((range) => (
          <RangeBadge key={range.start} range={range} format={format} detail={everyCityDetail(timelines, range, format)} />
        ))}
        <CopyButton getText={() => meetingShareText(timelines, overlap, format)} />
      </div>
    </Panel>
  )
}

function NoMeetingOverlap({
  overlap,
  timelines,
  format,
}: {
  overlap: MeetingOverlap
  timelines: CityTimeline[]
  format: TimeFormat
}) {
  const { fallback } = overlap
  return (
    <Panel tone="warn">
      <div className="flex gap-3.5">
        <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-warn" />
        <div className="min-w-0 space-y-1">
          <h2 className="text-[15px] font-semibold text-warn-ink">No hour works for everyone</h2>
          <p className="text-sm text-warn-ink/80">
            The awake windows of all {timelines.length} cities never line up. Widen the awake window or drop a city.
          </p>
          {fallback && (
            <div className="flex flex-col gap-2 pt-3">
              <p className="text-xs font-semibold tracking-[0.06em] text-warn-ink/70 uppercase">
                Closest · {fallback.awake} of {fallback.total} awake
              </p>
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {fallback.windows.map((window) => (
                  <li key={window.start} className="flex items-center gap-2 text-sm text-warn-ink/80">
                    <RangeBadge range={window} format={format} tone="muted" detail={everyCityDetail(timelines, window, format)} />
                    <span>{window.asleep.map((city) => city.name).join(', ')} asleep</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}

function BaseSummary({
  overlap,
  reference,
  format,
}: {
  overlap: BaseOverlap
  reference: CityTimeline
  format: TimeFormat
}) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Overlap with {reference.city.name}</h2>
          <TimesIn timeline={reference} />
        </div>
        <CopyButton getText={() => baseShareText(reference, overlap, format)} />
      </div>
      <ul className="mt-4 divide-y divide-line">
        {overlap.pairs.map(({ timeline, ranges, hours }) => (
          <li key={timeline.city.id} className="flex flex-col gap-2.5 py-3 first:pt-1 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 items-center gap-2.5 sm:w-60 sm:shrink-0">
              <span className="truncate font-medium text-ink">{timeline.city.name}</span>
              <span className="font-mono text-xs text-ink-3">{formatRelativeOffset(timeline.diffMinutes)}</span>
              <span
                className={cn(
                  'ml-auto font-mono text-sm font-semibold tabular-nums',
                  hours === 0 ? 'text-warn-ink' : 'text-ink',
                )}
              >
                {hours}h
              </span>
            </div>
            {hours > 0 ? (
              <div className="flex flex-wrap gap-2">
                {ranges.map((range) => (
                  <RangeBadge
                    key={range.start}
                    range={range}
                    format={format}
                    detail={`${reference.city.name}: ${localRangeLabel(reference, range, format)}\n${timeline.city.name}: ${localRangeLabel(timeline, range, format)}`}
                  />
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-2 rounded-full bg-warn-soft px-3 py-1.5 text-sm text-warn-ink inset-ring inset-ring-warn/40 sm:self-start">
                <TriangleAlert aria-hidden className="size-4 text-warn" />
                No overlap with {reference.city.name}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function NeedsAnotherCity({ referenceName }: { referenceName: string }) {
  const openPicker = useUiStore((s) => s.setPickerOpen)
  return (
    <Panel className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Add another city to find overlap</h2>
        <p className="mt-0.5 text-sm text-ink-2">Only {referenceName} is on the board. Overlap needs at least two cities.</p>
      </div>
      <Button variant="secondary" onClick={() => openPicker(true)}>
        <Plus aria-hidden />
        Add city
      </Button>
    </Panel>
  )
}
