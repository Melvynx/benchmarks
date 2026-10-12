import { memo } from 'react'
import { formatCellLabel } from '../../lib/format'
import type { GridCell } from '../../lib/overlap'
import type { TimeFormat } from '../../lib/types'
import { cellState, describeCell } from './cellInfo'

interface HourCellProps {
  cityId: string
  cityName: string
  cell: GridCell
  format: TimeFormat
  /** `compact` stacks hour / minutes / AM-PM for the 24-column desktop grid; `wide` is one line for mobile. */
  layout: 'compact' | 'wide'
  hovered?: boolean
  isNow?: boolean
  onHover?: (refHour: number) => void
}

export const HourCell = memo(function HourCell({
  cityId,
  cityName,
  cell,
  format,
  layout,
  hovered = false,
  isNow = false,
  onHover,
}: HourCellProps) {
  const { hour, minutes, suffix } = formatCellLabel(cell.localMinutes, format)
  const description = describeCell(cityName, cell, format)

  const shared = {
    role: 'cell',
    title: description,
    'aria-label': description,
    'data-testid': 'hour-cell',
    'data-city': cityId,
    'data-hour': cell.refHour,
    'data-state': cellState(cell),
    'data-midnight': Math.floor(cell.localMinutes / 60) === 0,
    'data-layout': layout,
  } as const

  if (layout === 'wide') {
    const dayLabel = cell.dayShift === 0 ? null : cell.dayShift > 0 ? `+${cell.dayShift}d` : `${cell.dayShift}d`
    return (
      <div {...shared} data-now={isNow} className="hour-cell h-10 gap-1.5 text-sm">
        <span>
          {hour}
          {minutes}
        </span>
        {suffix && <span className="text-[10px] font-semibold opacity-75">{suffix}</span>}
        {dayLabel && <span className="absolute right-2 text-[10px] font-semibold opacity-70">{dayLabel}</span>}
      </div>
    )
  }

  return (
    <div
      {...shared}
      data-hover={hovered}
      onMouseEnter={onHover && (() => onHover(cell.refHour))}
      className="hour-cell h-12 flex-col gap-[3px]"
    >
      <span className="text-xs @4xl:text-sm">{hour}</span>
      {minutes && <span className="text-[8px] font-semibold leading-none opacity-75 @4xl:text-[9px]">{minutes}</span>}
      {suffix && <span className="text-[8px] font-semibold leading-none opacity-75 @4xl:text-[9px]">{suffix}</span>}
    </div>
  )
})
