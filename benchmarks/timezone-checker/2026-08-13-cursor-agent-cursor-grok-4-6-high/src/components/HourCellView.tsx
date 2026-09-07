import type { HourCell } from '../lib/overlap'
import { formatMinutesOfDay, type TimeFormat } from '../lib/time'

type Props = {
  cell: HourCell
  format: TimeFormat
  isNow: boolean
}

export function HourCellView({ cell, format, isNow }: Props) {
  const parts = formatMinutesOfDay(cell.localMinutes, format)
  const shift =
    cell.dayShift < 0 ? '−1' : cell.dayShift > 0 ? '+1' : null

  return (
    <div
      className={`cell cell-${cell.state}${isNow ? ' is-now' : ''}`}
      data-state={cell.state}
      title={shift ? `${parts.value}${parts.meridiem ?? ''} (${shift} day)` : undefined}
    >
      <span className="cell-time">
        <span className="cell-hour">{parts.value}</span>
        {parts.meridiem ? <span className="cell-meridiem">{parts.meridiem}</span> : null}
      </span>
      {shift ? <span className="cell-shift">{shift}</span> : null}
    </div>
  )
}
