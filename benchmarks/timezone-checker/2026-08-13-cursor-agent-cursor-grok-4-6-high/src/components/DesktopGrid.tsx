import type { Board } from '../lib/overlap'
import type { TimeFormat } from '../lib/time'
import { CityMeta } from './CityMeta'
import { HourCellView } from './HourCellView'
import { HourHeader } from './HourHeader'
import { RemoveButton } from './RemoveButton'

type Props = {
  board: Board
  format: TimeFormat
  nowHour: number | null
  onSetReference: (id: string) => void
  onRemove: (id: string) => void
}

export function DesktopGrid({ board, format, nowHour, onSetReference, onRemove }: Props) {
  if (board.rows.length === 0) return null

  return (
    <div className="desktop-grid" role="table" aria-label="Timezone overlap by city">
      <HourHeader format={format} nowHour={nowHour} />
      {board.rows.map((row) => (
        <div
          key={row.city.id}
          className={`city-row${row.isReference ? ' is-ref' : ''}`}
          role="row"
        >
          <div className="city-row-meta" role="rowheader">
            <CityMeta
              city={row.city}
              isReference={row.isReference}
              offsetMinutes={row.offsetMinutes}
              onSetReference={onSetReference}
            />
          </div>
          <div className="city-row-cells" role="cell">
            {row.cells.map((cell) => (
              <HourCellView
                key={cell.refHour}
                cell={cell}
                format={format}
                isNow={nowHour === cell.refHour}
              />
            ))}
          </div>
          <div className="city-row-action">
            <RemoveButton cityName={row.city.name} onRemove={() => onRemove(row.city.id)} />
          </div>
        </div>
      ))}
    </div>
  )
}
