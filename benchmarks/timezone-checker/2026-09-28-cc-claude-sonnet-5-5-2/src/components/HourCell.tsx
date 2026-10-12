import type { CellModel, CellState } from '../lib/overlap'
import { formatTimeOfDay, getHourParts } from '../lib/time'
import type { TimeFormat } from '../types'
import styles from './HourCell.module.css'

const STATE_LABEL: Record<CellState, string> = {
  overlap: 'Overlap',
  awake: 'Awake',
  sleeping: 'Sleeping',
}

const DAY_NOTE: Record<number, string> = { [-1]: ' (yesterday)', 1: ' (tomorrow)' }

interface Props {
  cell: CellModel
  cityName: string
  format: TimeFormat
  isNow: boolean
  /** True when the local calendar day changes at this cell. */
  startsNewDay: boolean
  /** Direction the hours run in: along a row (desktop) or down a column (mobile). */
  axis: 'x' | 'y'
}

export function HourCell({ cell, cityName, format, isNow, startsNewDay, axis }: Props) {
  const { main, minutes, meridiem } = getHourParts(cell.hour, cell.minute, format)
  const time = formatTimeOfDay(cell.hour, cell.minute, format)
  const label = `${cityName}: ${time}${DAY_NOTE[cell.dayShift] ?? ''}, ${STATE_LABEL[cell.state].toLowerCase()}`

  return (
    <div
      role="cell"
      className={styles.cell}
      data-testid="hour-cell"
      data-state={cell.state}
      data-ref-hour={cell.refHour}
      data-now={isNow || undefined}
      data-new-day={startsNewDay || undefined}
      data-axis={axis}
      title={label}
      aria-label={label}
    >
      <span className={styles.main}>{main}</span>
      {(minutes || meridiem) && (
        <span className={styles.sub}>
          {minutes && <span className={styles.minutes}>{minutes}</span>}
          {meridiem && <span className={styles.meridiem}>{meridiem}</span>}
        </span>
      )}
    </div>
  )
}
