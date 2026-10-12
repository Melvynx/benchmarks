import { CityName } from './CityName'
import styles from './DesktopGrid.module.css'
import type { GridProps } from './GridTypes'
import { HourCell } from './HourCell'
import { CloseIcon } from './Icons'

/** Cities as rows, the reference city's 24 hours as columns. */
export function DesktopGrid({ views, board, nowHour, format, onPromote, onRemove }: GridProps) {
  return (
    <div role="table" aria-label="Hourly overlap by city" className={styles.table}>
      {views.map((view, index) => {
        const cells = board.rows[index]
        return (
          <div
            key={view.city.id}
            role="row"
            className={styles.row}
            data-testid="city-row"
            data-reference={view.isReference || undefined}
          >
            <div role="rowheader" className={styles.info}>
              <CityName view={view} onPromote={onPromote} />
              <span className={styles.meta}>
                {view.offsetLabel} <span aria-hidden="true">·</span> {view.clock}
              </span>
            </div>
            <div className={styles.cells}>
              {cells.map((cell, hour) => (
                <HourCell
                  key={cell.refHour}
                  cell={cell}
                  cityName={view.city.name}
                  format={format}
                  isNow={cell.refHour === nowHour}
                  startsNewDay={hour > 0 && cell.dayShift !== cells[hour - 1].dayShift}
                  axis="x"
                />
              ))}
            </div>
            <div role="cell" className={styles.action}>
              <button
                type="button"
                className={styles.remove}
                aria-label={`Remove ${view.city.name}`}
                title={`Remove ${view.city.name}`}
                onClick={() => onRemove(view.city.id)}
              >
                <CloseIcon size={14} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
