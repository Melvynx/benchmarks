import type { CSSProperties } from 'react'
import { HOURS } from '../lib/overlap'
import { CityName } from './CityName'
import type { GridProps } from './GridTypes'
import { HourCell } from './HourCell'
import { CloseIcon } from './Icons'
import styles from './MobileGrid.module.css'

/** Cities as columns, the reference city's 24 hours as rows. */
export function MobileGrid({ views, board, nowHour, format, onPromote, onRemove }: GridProps) {
  const style = { '--columns': views.length } as CSSProperties

  return (
    <div className={styles.scroller}>
      <div role="table" aria-label="Hourly overlap by city" className={styles.table} style={style}>
        <div role="row" className={`${styles.row} ${styles.headRow}`}>
          {views.map((view) => (
            <div
              key={view.city.id}
              role="columnheader"
              className={styles.slot}
              data-testid="city-column"
              data-reference={view.isReference || undefined}
            >
              <div className={styles.head}>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove ${view.city.name}`}
                  title={`Remove ${view.city.name}`}
                  onClick={() => onRemove(view.city.id)}
                >
                  <CloseIcon size={12} />
                </button>
                <CityName view={view} onPromote={onPromote} />
                <span className={styles.meta}>{view.offsetLabel}</span>
              </div>
            </div>
          ))}
        </div>

        {HOURS.map((hour) => (
          <div key={hour} role="row" className={styles.row}>
            {views.map((view, index) => {
              const cells = board.rows[index]
              const cell = cells[hour]
              return (
                <div key={view.city.id} role="cell" className={styles.slot}>
                  <HourCell
                    cell={cell}
                    cityName={view.city.name}
                    format={format}
                    isNow={hour === nowHour}
                    startsNewDay={hour > 0 && cell.dayShift !== cells[hour - 1].dayShift}
                    axis="y"
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
