import { Fragment, type CSSProperties } from 'react'

import type { CityRow, TimeFormat } from '../lib/types'
import { formatAxisHour } from '../lib/timezone'

interface MobileBoardProps {
  rows: CityRow[]
  timeFormat: TimeFormat
  onPromoteCity: (cityId: string) => void
  onRemoveCity: (cityId: string) => void
  canRemoveCities: boolean
}

function getCellClassName(isAwake: boolean, isOverlap: boolean) {
  if (!isAwake) {
    return 'time-cell is-sleeping'
  }

  if (isOverlap) {
    return 'time-cell is-overlap'
  }

  return 'time-cell'
}

export function MobileBoard({
  rows,
  timeFormat,
  onPromoteCity,
  onRemoveCity,
  canRemoveCities,
}: MobileBoardProps) {
  const gridTemplateColumns = `4.75rem repeat(${rows.length}, minmax(6.75rem, 1fr))`

  return (
    <section className="board-panel board-panel--mobile">
      <div className="mobile-board__scroller">
        <div
          className="mobile-board__grid"
          style={
            {
              gridTemplateColumns,
              '--city-count': rows.length,
            } as CSSProperties
          }
        >
          <div className="mobile-board__corner">Ref hour</div>

          {rows.map((row) => (
            <div key={`mobile-head-${row.city.id}`} className="mobile-board__city">
              <button
                type="button"
                className="mobile-board__city-name"
                onClick={() => onPromoteCity(row.city.id)}
              >
                <span>{row.city.name}</span>
                {row.isReference ? <small className="ref-badge">REF</small> : null}
              </button>

              <div className="mobile-board__city-meta">
                <span>{row.offsetLabel}</span>
                <button
                  type="button"
                  className="remove-button remove-button--inline"
                  onClick={() => onRemoveCity(row.city.id)}
                  disabled={!canRemoveCities}
                  aria-label={`Remove ${row.city.name}`}
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {rows[0]?.cells.map((_, index) => (
            <Fragment key={`mobile-row-${index}`}>
              <div className="mobile-board__axis">
                {formatAxisHour(index, timeFormat)}
              </div>

              {rows.map((row) => {
                const cell = row.cells[index]

                return (
                  <div
                    key={`${row.city.id}-${cell.referenceHour}`}
                    className={getCellClassName(cell.isAwake, cell.isOverlap)}
                  >
                    {formatAxisHour(cell.localHour, timeFormat)}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  )
}
