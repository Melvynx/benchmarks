import { useRef, type CSSProperties } from 'react'
import { HOURS, rangeContains, type HourMask } from '../../domain/schedule'
import { formatOffset, formatRelativeOffset, formatUtcOffset, mod, type TimeFormat } from '../../domain/time'
import type { Schedule, ScheduleRow } from '../../hooks/use-schedule'
import { cn } from '../../lib/cn'
import { cityTransitionName } from '../../lib/view-transition'
import { useUiStore } from '../../state/ui-store'
import { CityName, RefBadge, RemoveCityButton } from './CityControls'
import { HourCell, type HourCellVariant } from './HourCell'
import { useHourFocus } from './use-hour-focus'

/** Beyond this many cities full names no longer fit a phone-width column. */
const COMPACT_FROM = 5
/** Beyond this many cities even compact columns get too narrow, so the grid scrolls sideways. */
const SCROLL_FROM = 9

/**
 * Cities as columns, the reference city's 24 hours as rows.
 *
 * With many cities the body scrolls sideways. The header lives outside that scroller
 * (a scroll container would capture `position: sticky`) and mirrors its `scrollLeft`.
 */
export function MobileGrid({ schedule }: { schedule: Schedule }) {
  const { rows, analysis, format, referenceWeekday, reference } = schedule
  const focusHandlers = useHourFocus()
  const headerRef = useRef<HTMLDivElement>(null)
  if (!reference) return null

  const compact = rows.length >= COMPACT_FROM
  const scrolls = rows.length >= SCROLL_FROM
  const gap = compact ? '0.125rem' : '0.25rem'
  const track: CSSProperties = { columnGap: gap, gridTemplateColumns: `0.75rem repeat(${rows.length}, minmax(0, 1fr))` }
  // Shared by header and body so their columns line up while scrolled; includes the px-1.5 padding.
  const minWidth = scrolls ? `calc(0.75rem + ${rows.length} * (2.75rem + ${gap}) + 0.75rem)` : undefined
  const band = analysis?.mode === 'meeting' ? analysis.mask : null

  return (
    <section aria-label="Hourly availability" className="card overflow-clip pb-1.5">
      <div
        role="table"
        aria-label={`Local time in each city, hour by hour through ${reference.timeline.city.name}’s day`}
      >
        <div
          ref={headerRef}
          role="rowgroup"
          className="sticky top-0 z-30 overflow-hidden border-b border-line bg-surface/90 backdrop-blur-md"
        >
          <div role="row" className="grid px-1.5 pt-3 pb-2.5" style={{ ...track, minWidth }}>
            <span aria-hidden />
            {rows.map((row) => (
              <ColumnHeader key={row.timeline.city.id} row={row} compact={compact} />
            ))}
          </div>
        </div>
        <div
          role="rowgroup"
          className={cn(scrolls && 'overflow-x-auto overscroll-x-contain')}
          onScroll={(event) => {
            if (headerRef.current) headerRef.current.scrollLeft = event.currentTarget.scrollLeft
          }}
        >
          <div className="px-1.5 pt-1.5" style={{ minWidth }} {...focusHandlers}>
            {HOURS.map((hour) => (
              <HourRow
                key={hour}
                hour={hour}
                rows={rows}
                track={track}
                band={band}
                nowMinutes={reference.nowMinutes}
                format={format}
                referenceWeekday={referenceWeekday}
                variant={compact ? 'compact' : 'column'}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ColumnHeader({ row, compact }: { row: ScheduleRow; compact: boolean }) {
  const { timeline, isReference } = row
  const { city, offsetMinutes, diffMinutes } = timeline
  return (
    <div
      role="columnheader"
      style={{ viewTransitionName: cityTransitionName(city.id) }}
      className="flex min-w-0 flex-col items-center gap-1 text-center"
    >
      <CityName
        city={city}
        isReference={isReference}
        short={compact}
        className={cn('w-full leading-tight', compact ? 'text-xs' : 'text-[13px]')}
        textClassName={compact ? undefined : 'line-clamp-2 min-h-[2lh] hyphens-auto wrap-break-word'}
      />
      {isReference ? (
        <RefBadge />
      ) : (
        <span className="flex h-[18px] items-center font-mono text-[10.5px] font-medium text-ink-2">
          {formatRelativeOffset(diffMinutes, compact ? '' : 'h')}
        </span>
      )}
      {compact ? (
        <span className="flex flex-col items-center font-mono text-[10px] leading-tight text-ink-3">
          <span className="text-[8px] tracking-wider text-ink-4">UTC</span>
          {formatOffset(offsetMinutes)}
        </span>
      ) : (
        <span className="font-mono text-[10px] text-ink-3">{formatUtcOffset(offsetMinutes)}</span>
      )}
      <RemoveCityButton city={city} className="-mb-1 bg-surface-2/70" />
    </div>
  )
}

interface HourRowProps {
  hour: number
  rows: ScheduleRow[]
  track: CSSProperties
  band: HourMask | null
  nowMinutes: number
  format: TimeFormat
  referenceWeekday: number
  variant: HourCellVariant
}

function HourRow({ hour, rows, track, band, nowMinutes, format, referenceWeekday, variant }: HourRowProps) {
  const focused = useUiStore((s) => s.focus !== null && rangeContains(s.focus, hour))
  const inBand = band?.[hour] ?? false
  const isNow = Math.floor(nowMinutes / 60) === hour

  return (
    <div
      role="row"
      className={cn(
        'relative grid py-[2px]',
        inBand && 'bg-overlap/30',
        inBand && !band?.[hour - 1] && 'rounded-t-xl',
        inBand && !band?.[hour + 1] && 'rounded-b-xl',
      )}
      style={track}
    >
      <span aria-hidden className="flex items-center justify-center">
        {isNow ? (
          <span className="size-1.5 rounded-full bg-now" />
        ) : (
          hour % 6 === 0 && <span className="h-px w-1.5 rounded-full bg-ink-4" />
        )}
      </span>
      {rows.map(({ timeline, states }) => {
        const slot = timeline.slots[hour]
        if (!slot) return null
        return (
          <HourCell
            key={timeline.city.id}
            variant={variant}
            cityName={timeline.city.name}
            refHour={slot.refHour}
            localMinutes={slot.localMinutes}
            state={states[hour] ?? 'asleep'}
            weekday={mod(referenceWeekday + slot.dayOffset, 7)}
            format={format}
          />
        )
      })}
      {isNow && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 left-3 rounded-xl ring-[1.5px] ring-now/85" />
      )}
      {focused && <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 left-3 rounded-xl ring-2 ring-ink/65" />}
    </div>
  )
}
