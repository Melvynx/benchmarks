import { cn } from '@/lib/cn'
import type { CellState, HourCell as HourCellModel } from '@/lib/overlap'
import { formatCompact, formatMinuteOfDay, type TimeFormat } from '@/lib/timezone'

interface HourCellProps {
  cell: HourCellModel
  cityName: string
  referenceName: string
  format: TimeFormat
  isCurrent: boolean
  orientation: 'row' | 'column'
}

const STATE_CLASSES: Record<CellState, string> = {
  sleeping: 'bg-ink-900/60 text-ink-500/80',
  awake: 'bg-ink-700/70 text-ink-200',
  overlap:
    'bg-mint-500/20 text-mint-300 font-semibold shadow-[inset_0_0_0_1px_rgb(52_211_153/0.35)]',
}

const STATE_LABEL: Record<CellState, string> = {
  sleeping: 'sleeping',
  awake: 'awake',
  overlap: 'overlap',
}

export function HourCell({ cell, cityName, referenceName, format, isCurrent, orientation }: HourCellProps) {
  const localLabel = formatMinuteOfDay(cell.localMinute, format)
  const referenceLabel = formatMinuteOfDay(cell.referenceHour * 60, format)
  const description = `${cityName}: ${localLabel} when it is ${referenceLabel} in ${referenceName} · ${STATE_LABEL[cell.state]}`

  // Fractional offsets (India, Nepal…) stack the minutes on a second line so
  // the label never overflows a narrow column.
  const minutes = cell.localMinute % 60
  const hourLabel = formatCompact(cell.localMinute - minutes, format)

  return (
    <div
      role="gridcell"
      title={description}
      aria-label={description}
      className={cn(
        'tabular flex flex-col items-center justify-center rounded-md font-mono text-[11px] leading-none transition-colors duration-150 md:text-xs',
        orientation === 'row' ? 'h-10' : 'h-9',
        STATE_CLASSES[cell.state],
        isCurrent && 'ring-1 ring-inset ring-ink-300/50',
      )}
    >
      <span>{hourLabel}</span>
      {minutes !== 0 && (
        <span className="mt-0.5 text-[9px] leading-none opacity-70">:{String(minutes).padStart(2, '0')}</span>
      )}
    </div>
  )
}
