import { useMemo } from 'react'
import type { ScheduleRow } from '../hooks/use-schedule'
import { clockParts, formatUtcOffset, type TimeFormat } from '../domain/time'

interface AppHeaderProps {
  reference: ScheduleRow | null
  now: Date
  format: TimeFormat
}

export function AppHeader({ reference, now, format }: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-[3.5rem] leading-[0.9] tracking-[-0.015em] text-ink sm:text-7xl">
          Claude Opus 5.5
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-pretty text-ink-2">
          Line up everyone’s waking hours across timezones and spot the window that works.
        </p>
      </div>
      {reference && <ReferenceClock row={reference} now={now} format={format} />}
    </header>
  )
}

function ReferenceClock({ row, now, format }: { row: ScheduleRow; now: Date; format: TimeFormat }) {
  const { city, offsetMinutes } = row.timeline
  const { hour, period } = clockParts(row.nowMinutes, format)
  const minutes = String(row.nowMinutes % 60).padStart(2, '0')
  const date = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', { timeZone: city.timeZone, weekday: 'short', month: 'short', day: 'numeric' }).format(
        now,
      ),
    [city.timeZone, now],
  )

  return (
    <div className="flex flex-col gap-1 sm:items-end sm:text-right">
      <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
        <span className="relative flex size-2" aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-now/60 [animation-duration:2.4s] motion-reduce:hidden" />
          <span className="relative size-2 rounded-full bg-now" />
        </span>
        Now in {city.name}
      </div>
      <p className="font-mono text-4xl font-medium tracking-tight text-ink tabular-nums">
        {hour}:{minutes}
        {period && <span className="ml-1.5 text-lg text-ink-3">{period}</span>}
      </p>
      <p className="text-xs text-ink-3">
        {date} · {formatUtcOffset(offsetMinutes)}
      </p>
    </div>
  )
}
