import { formatClock } from '../../lib/format'
import type { GridCell } from '../../lib/overlap'
import type { TimeFormat } from '../../lib/types'

export type CellState = 'sleep' | 'awake' | 'overlap'

export const cellState = ({ awake, overlap }: GridCell): CellState =>
  overlap ? 'overlap' : awake ? 'awake' : 'sleep'

const STATE_LABEL: Record<CellState, string> = {
  sleep: 'sleeping',
  awake: 'awake',
  overlap: 'overlap',
}

/** Human-readable description used for tooltips and screen readers. */
export function describeCell(cityName: string, cell: GridCell, format: TimeFormat): string {
  const day = cell.dayShift > 0 ? ', next day' : cell.dayShift < 0 ? ', previous day' : ''
  return `${cityName}, ${formatClock(cell.localMinutes, format)}${day}: ${STATE_LABEL[cellState(cell)]}`
}

/** 24 equal columns, shared by the header and every city row so cells line up exactly. */
export const HOUR_COLUMNS = 'grid-cols-[repeat(24,minmax(0,1fr))] gap-px lg:gap-0.5'
