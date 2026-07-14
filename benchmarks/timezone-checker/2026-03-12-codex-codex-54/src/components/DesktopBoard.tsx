import type { CityRow, TimeFormat } from '../lib/types'
import { formatAxisHour } from '../lib/timezone'

interface DesktopBoardProps {
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

export function DesktopBoard({
  rows,
  timeFormat,
  onPromoteCity,
  onRemoveCity,
  canRemoveCities,
}: DesktopBoardProps) {
  return (
    <section className="board-panel board-panel--desktop">
      <div className="desktop-board__header">
        <div className="desktop-board__meta">
          <span>City</span>
          <small>Click any city to make it the reference</small>
        </div>
        <div className="desktop-board__hours">
          {rows[0]?.cells.map((cell) => (
            <div key={`desktop-hour-${cell.referenceHour}`} className="axis-tick">
              {formatAxisHour(cell.referenceHour, timeFormat)}
            </div>
          ))}
        </div>
        <div />
      </div>

      <div className="desktop-board__rows">
        {rows.map((row) => (
          <article key={row.city.id} className="city-row">
            <div className="city-row__meta">
              <button
                type="button"
                className="city-row__name"
                onClick={() => onPromoteCity(row.city.id)}
              >
                <span>{row.city.name}</span>
                {row.isReference ? <small className="ref-badge">REF</small> : null}
              </button>

              <div className="city-row__details">
                <span>{row.city.country}</span>
                <span>{row.offsetLabel}</span>
              </div>
            </div>

            <div className="city-row__cells">
              {row.cells.map((cell) => (
                <div
                  key={`${row.city.id}-${cell.referenceHour}`}
                  className={getCellClassName(cell.isAwake, cell.isOverlap)}
                >
                  {formatAxisHour(cell.localHour, timeFormat)}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="remove-button"
              onClick={() => onRemoveCity(row.city.id)}
              disabled={!canRemoveCities}
              aria-label={`Remove ${row.city.name}`}
              title={canRemoveCities ? 'Remove city' : 'Keep at least one city'}
            >
              ×
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
