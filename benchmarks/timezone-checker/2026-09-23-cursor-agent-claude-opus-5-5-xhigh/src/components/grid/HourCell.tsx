import { memo } from 'react'
import type { CellState } from '../../domain/schedule'
import { clockParts, formatClock, WEEKDAYS, type TimeFormat } from '../../domain/time'
import { cn } from '../../lib/cn'

const STATE_STYLES: Record<CellState, string> = {
  overlap: 'bg-overlap font-bold text-overlap-ink shadow-[inset_0_0_0_1px_var(--overlap-edge)]',
  awake: 'bg-surface-2 font-medium text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]',
  asleep: 'bg-hatch font-normal text-ink-3/85',
}

const STATE_LABEL: Record<CellState, string> = {
  overlap: 'awake, overlap',
  awake: 'awake',
  asleep: 'asleep',
}

/**
 * `row`: desktop, cities as rows. `column`: mobile, cities as columns.
 * `compact`: mobile with many cities, hour and period stacked to fit narrow columns.
 */
export type HourCellVariant = 'row' | 'column' | 'compact'

const VARIANT_STYLES: Record<HourCellVariant, { cell: string; dayMark: string; hour: string; caption: string }> = {
  row: {
    cell: 'h-11 flex-col gap-1 rounded-md lg:h-12 lg:rounded-lg',
    dayMark: 'before:inset-y-2 before:left-0 before:w-[2px]',
    hour: 'text-[11px] lg:text-[13px]',
    caption: 'text-[8px] lg:text-[9px]',
  },
  column: {
    cell: 'h-10 gap-1 rounded-lg',
    dayMark: 'before:inset-x-2 before:top-0 before:h-[2px]',
    hour: 'text-[13px]',
    caption: 'text-[10px]',
  },
  compact: {
    cell: 'h-10 flex-col gap-[3px] rounded-md',
    dayMark: 'before:inset-x-1.5 before:top-0 before:h-[2px]',
    hour: 'text-[12px]',
    caption: 'text-[8.5px]',
  },
}

interface HourCellProps {
  cityName: string
  /** Column in the reference city's day. */
  refHour: number
  /** Local wall-clock minutes in this city at the start of the column. */
  localMinutes: number
  state: CellState
  /** Local weekday for this slot (0 = Sunday). */
  weekday: number
  format: TimeFormat
  variant: HourCellVariant
}

export const HourCell = memo(function HourCell({
  cityName,
  refHour,
  localMinutes,
  state,
  weekday,
  format,
  variant,
}: HourCellProps) {
  const { hour, minute, period } = clockParts(localMinutes, format)
  const dayName = WEEKDAYS[weekday] ?? ''
  const startsDay = localMinutes < 60
  const description = `${cityName} ${formatClock(localMinutes, format)} ${dayName}, ${STATE_LABEL[state]}`
  const styles = VARIANT_STYLES[variant]

  return (
    <div
      role="cell"
      data-hour={refHour}
      data-state={state}
      aria-label={description}
      title={description}
      className={cn(
        'relative flex items-center justify-center overflow-hidden leading-none transition-[background-color,color,box-shadow] duration-200 select-none',
        styles.cell,
        startsDay && ['before:absolute before:rounded-full before:bg-current before:opacity-50', styles.dayMark],
        STATE_STYLES[state],
      )}
    >
      <span className={cn('font-mono tracking-tight tabular-nums', styles.hour)}>
        {hour}
        {minute && <sup className="ml-px text-[0.64em] font-semibold">{minute}</sup>}
      </span>
      <span
        className={cn('min-h-[1em] tracking-wide uppercase', styles.caption, startsDay ? 'font-bold' : 'opacity-65')}
      >
        {startsDay ? dayName : period}
      </span>
    </div>
  )
})
