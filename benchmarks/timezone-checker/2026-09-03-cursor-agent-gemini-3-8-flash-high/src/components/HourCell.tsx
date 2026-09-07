import React from 'react'
import type { HourCell as HourCellType } from '@/lib/overlap'
import { formatCellHour, formatFullTime, formatWholeHour, type TimeFormat } from '@/lib/timezone'
import { cn } from '@/lib/cn'

interface HourCellProps {
  cell: HourCellType
  cityName: string
  referenceName: string
  format: TimeFormat
  isCurrent?: boolean
  orientation?: 'row' | 'column'
}

export const HourCell: React.FC<HourCellProps> = ({
  cell,
  cityName,
  referenceName,
  format,
  isCurrent = false,
  orientation = 'row',
}) => {
  const localFormatted = formatCellHour(cell.localMinute, format)
  const fullLocal = formatFullTime(cell.localMinute, format)
  const fullRef = formatWholeHour(cell.referenceHour, format)

  const statusLabel =
    cell.state === 'overlap'
      ? 'Overlap'
      : cell.state === 'awake'
        ? 'Awake'
        : 'Sleeping'

  const tooltip = `${cityName}: ${fullLocal}\nRef (${referenceName}): ${fullRef}\nStatus: ${statusLabel}`

  return (
    <div
      role="gridcell"
      title={tooltip}
      aria-label={`${cityName} at ${fullRef} reference time: ${fullLocal}, ${statusLabel}`}
      className={cn(
        'relative flex items-center justify-center font-mono select-none transition-all duration-150',
        orientation === 'row'
          ? 'h-9 min-w-0 rounded-md text-[11px]'
          : 'h-8 w-full rounded-md text-[11px]',
        cell.state === 'overlap' &&
          'bg-emerald-500 text-ink-950 font-extrabold border border-emerald-400 shadow-sm shadow-emerald-500/20 z-10',
        cell.state === 'awake' &&
          'bg-ink-800 text-ink-200 border border-ink-700/60 hover:bg-ink-750 hover:text-white',
        cell.state === 'sleeping' &&
          'bg-ink-950/80 text-ink-500/70 border border-ink-900/50 opacity-40 hover:opacity-85'
      )}
    >
      <span className="tabular truncate px-0.5">{localFormatted}</span>

      {/* Current hour subtle indicator marker */}
      {isCurrent && (
        <span
          className={cn(
            'absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full z-20',
            cell.state === 'overlap' ? 'bg-white shadow' : 'bg-emerald-400 shadow'
          )}
          title="Current hour"
        />
      )}
    </div>
  )
}
