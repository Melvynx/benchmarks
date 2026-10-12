import type { ReactNode } from 'react'
import { rangeSegments, type HourRange } from '../../domain/schedule'
import { formatClock, formatRelativeOffset, formatUtcOffset, mod, WEEKDAYS, type TimeFormat } from '../../domain/time'
import type { Schedule, ScheduleRow } from '../../hooks/use-schedule'
import { cn } from '../../lib/cn'
import { cityTransitionName } from '../../lib/view-transition'
import { useUiStore } from '../../state/ui-store'
import { CityName, RefBadge, RemoveCityButton } from './CityControls'
import { HourCell } from './HourCell'
import { useHourFocus } from './use-hour-focus'

/** Cities as rows, the reference city's 24 hours as columns. */
export function DesktopGrid({ schedule }: { schedule: Schedule }) {
  const { rows, analysis, format, referenceWeekday, reference } = schedule
  const focusHandlers = useHourFocus()
  if (!reference) return null

  const bands = analysis?.mode === 'meeting' ? analysis.ranges : []

  return (
    <section aria-label="Hourly availability" className="card px-1.5 pt-1 pb-2 lg:px-2.5 lg:pb-3">
      <NowHeader minutes={reference.nowMinutes} />
      <div
        role="table"
        aria-label={`Local time in each city, hour by hour through ${reference.timeline.city.name}’s day`}
        className="relative"
        {...focusHandlers}
      >
        <ColumnLayer>
          {bands.map((range) => (
            <Band key={range.start} range={range} className="-mx-[3px] -my-[3px] rounded-[11px] bg-overlap/30" />
          ))}
        </ColumnLayer>

        {rows.map((row) => (
          <DesktopRow
            key={row.timeline.city.id}
            row={row}
            format={format}
            referenceWeekday={referenceWeekday}
            divided={row.isReference && rows.length > 1}
          />
        ))}

        <ColumnLayer className="z-20">
          <Band
            range={{ start: Math.floor(reference.nowMinutes / 60), length: 1 }}
            className="-mx-[3px] -my-[3px] rounded-[11px] ring-[1.5px] ring-now/85"
          />
          <FocusRing />
        </ColumnLayer>
      </div>
    </section>
  )
}

interface DesktopRowProps {
  row: ScheduleRow
  format: TimeFormat
  referenceWeekday: number
  /** Separates the reference row from the cities compared against it. */
  divided: boolean
}

function DesktopRow({ row, format, referenceWeekday, divided }: DesktopRowProps) {
  const { timeline, states } = row
  return (
    <div
      role="row"
      style={{ viewTransitionName: cityTransitionName(timeline.city.id) }}
      className={cn(
        'group grid-hours relative items-center py-[3px]',
        divided && 'mb-1.5 pb-2.5 after:absolute after:inset-x-2 after:bottom-0 after:h-px after:bg-line',
      )}
    >
      <CityLabel row={row} format={format} />
      {timeline.slots.map((slot) => (
        <HourCell
          key={slot.refHour}
          variant="row"
          cityName={timeline.city.name}
          refHour={slot.refHour}
          localMinutes={slot.localMinutes}
          state={states[slot.refHour] ?? 'asleep'}
          weekday={mod(referenceWeekday + slot.dayOffset, 7)}
          format={format}
        />
      ))}
      <div role="cell" className="flex justify-center">
        <RemoveCityButton city={timeline.city} className="row-action" />
      </div>
    </div>
  )
}

function CityLabel({ row, format }: { row: ScheduleRow; format: TimeFormat }) {
  const { timeline, isReference, nowMinutes, nowWeekday } = row
  const { city, offsetMinutes, diffMinutes } = timeline

  return (
    <div role="rowheader" className="flex min-w-0 items-center gap-2 pr-2 pl-2 lg:pl-3">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <CityName city={city} isReference={isReference} textClassName="truncate" className="text-[13px] lg:text-sm" />
          {isReference && <RefBadge />}
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 font-mono text-[10.5px] whitespace-nowrap text-ink-3 lg:text-[11px]">
          <span>{formatUtcOffset(offsetMinutes)}</span>
          {!isReference && (
            <>
              <span aria-hidden className="text-ink-4">·</span>
              <span className="text-ink-2" title={`Offset from the reference city`}>
                {formatRelativeOffset(diffMinutes)}
              </span>
            </>
          )}
          <span className="hidden truncate font-sans xl:inline">· {city.country}</span>
        </div>
      </div>
      <time
        className="hidden shrink-0 text-right font-mono text-[11px] leading-tight text-ink-2 tabular-nums lg:block"
        title={`Current time in ${city.name}`}
      >
        {formatClock(nowMinutes, format)}
        <span className="block text-[10px] text-ink-3">{WEEKDAYS[nowWeekday]}</span>
      </time>
    </div>
  )
}

/** Absolutely positioned twin of the row grid, so decorations land on exact columns. */
function ColumnLayer({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div aria-hidden className={cn('grid-hours pointer-events-none absolute inset-0 grid-rows-1', className)}>
      {children}
    </div>
  )
}

function Band({ range, className }: { range: HourRange; className: string }) {
  return rangeSegments(range).map((segment) => (
    <div
      key={segment.start}
      className={className}
      style={{ gridColumn: `${segment.start + 2} / span ${segment.length}`, gridRow: 1 }}
    />
  ))
}

function FocusRing() {
  const focus = useUiStore((s) => s.focus)
  if (!focus) return null
  return <Band range={focus} className="-mx-[3px] -my-[3px] rounded-[11px] ring-2 ring-ink/65" />
}

function NowHeader({ minutes }: { minutes: number }) {
  return (
    <div aria-hidden className="grid-hours h-7">
      <div className="relative" style={{ gridColumn: Math.floor(minutes / 60) + 2, gridRow: 1 }}>
        <span className="absolute bottom-[5px] left-1/2 -translate-x-1/2 rounded-full bg-now px-1.5 py-[3px] font-mono text-[9px] leading-none font-bold tracking-wider text-white uppercase">
          Now
        </span>
      </div>
    </div>
  )
}
