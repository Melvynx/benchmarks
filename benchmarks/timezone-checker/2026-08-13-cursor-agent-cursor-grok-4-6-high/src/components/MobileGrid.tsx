import type { Board } from '../lib/overlap'
import { formatHour, type TimeFormat } from '../lib/time'
import { CityMeta } from './CityMeta'
import { HourCellView } from './HourCellView'
import { RemoveButton } from './RemoveButton'

type Props = {
  board: Board
  format: TimeFormat
  nowHour: number | null
  onSetReference: (id: string) => void
  onRemove: (id: string) => void
}

export function MobileGrid({ board, format, nowHour, onSetReference, onRemove }: Props) {
  if (board.rows.length === 0) return null

  return (
    <div className="mobile-grid" aria-label="Timezone overlap by city">
      <div className="mobile-scroll">
        <div
          className="mobile-table"
          style={{ gridTemplateColumns: `3.25rem repeat(${board.rows.length}, minmax(4.75rem, 1fr))` }}
        >
          <div className="mobile-corner" />
          {board.rows.map((row) => (
            <div key={row.city.id} className={`mobile-city-head${row.isReference ? ' is-ref' : ''}`}>
              <CityMeta
                city={row.city}
                isReference={row.isReference}
                offsetMinutes={row.offsetMinutes}
                compact
                onSetReference={onSetReference}
              />
              <RemoveButton cityName={row.city.name} onRemove={() => onRemove(row.city.id)} />
            </div>
          ))}

          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="mobile-hour-group" style={{ display: 'contents' }}>
              <div className={`mobile-hour-label${nowHour === hour ? ' is-now' : ''}`}>
                {format === '24h' ? String(hour).padStart(2, '0') : formatHour(hour, '12h')}
              </div>
              {board.rows.map((row) => (
                <HourCellView
                  key={`${row.city.id}-${hour}`}
                  cell={row.cells[hour]}
                  format={format}
                  isNow={nowHour === hour}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
