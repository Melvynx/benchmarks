import type { Cell } from '../lib/overlap'
import { formatCellTime, type TimeFormat } from '../lib/time'

const STYLES: Record<Cell['state'], string> = {
  sleeping: 'bg-ink-800/40 text-ink-400/60',
  awake: 'bg-ink-700/70 text-ink-100',
  overlap: 'bg-glow-500/90 font-semibold text-glow-900 shadow-[inset_0_0_0_1px_rgba(134,239,172,0.5)]',
}

export function HourCell({ cell, format, className = '' }: { cell: Cell; format: TimeFormat; className?: string }) {
  return (
    <div
      role="gridcell"
      data-state={cell.state}
      aria-label={`${formatCellTime(cell.localMinutes, format)}, ${cell.state}`}
      className={['tabular flex items-center justify-center rounded-[5px] text-[11px] leading-none transition-colors duration-150', STYLES[cell.state], className].join(' ')}
    >
      {formatCellTime(cell.localMinutes, format)}
    </div>
  )
}
