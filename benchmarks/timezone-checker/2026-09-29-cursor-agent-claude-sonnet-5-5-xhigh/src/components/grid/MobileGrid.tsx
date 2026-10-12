import { X } from 'lucide-react'
import { formatUtcOffset } from '../../lib/format'
import { HOURS_PER_DAY, type GridRow } from '../../lib/overlap'
import { currentHourAtOffset } from '../../lib/timezone'
import { HourCell } from './HourCell'
import { RefBadge } from './RefBadge'
import type { GridViewProps } from './types'

const HOURS = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour)
const MIN_COLUMN_REM = 6.5

/**
 * Mobile layout: cities are columns, reference hours are rows. The reference
 * city is the first column and doubles as the hour axis. The scroll area is
 * bounded in height so the city headers can stay pinned while scrolling.
 */
export function MobileGrid({ grid, format, now, onPromote, onRemove }: GridViewProps) {
  const reference = grid.rows[0]!
  const nowHour = currentHourAtOffset(reference.offsetMinutes, now)

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div
        role="table"
        aria-label="Hourly availability by city"
        className="max-h-[80dvh] overflow-auto overscroll-contain"
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${grid.rows.length}, minmax(0, 1fr))`,
            minWidth: `${grid.rows.length * MIN_COLUMN_REM}rem`,
          }}
        >
          <div role="row" className="contents">
            {grid.rows.map((row) => (
              <CityHeader key={row.city.id} row={row} onPromote={onPromote} onRemove={onRemove} />
            ))}
          </div>

          {HOURS.map((hour) => (
            <div key={hour} role="row" data-testid="hour-row" data-hour={hour} className="contents">
              {grid.rows.map((row) => (
                <div
                  key={row.city.id}
                  role="presentation"
                  className={`bg-surface p-0.5 ${row.isReference ? 'sticky left-0 z-[5]' : ''}`}
                >
                  <HourCell
                    cityId={row.city.id}
                    cityName={row.city.name}
                    cell={row.cells[hour]!}
                    format={format}
                    layout="wide"
                    isNow={row.isReference && hour === nowHour}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface CityHeaderProps {
  row: GridRow
  onPromote: (cityId: string) => void
  onRemove: (cityId: string) => void
}

function CityHeader({ row, onPromote, onRemove }: CityHeaderProps) {
  const { city } = row

  return (
    <div
      role="columnheader"
      data-testid="city-column"
      data-city={city.id}
      data-reference={row.isReference}
      className={`sticky top-0 flex bg-surface p-0.5 ${row.isReference ? 'left-0 z-20' : 'z-10'}`}
    >
      <div className="flex min-h-[5.5rem] flex-1 flex-col gap-1 rounded-xl border border-line bg-surface-2 p-1.5 pl-2">
        <div className="flex h-5 items-center justify-between">
          {row.isReference ? <RefBadge /> : <span />}
          <button
            type="button"
            aria-label={`Remove ${city.name}`}
            onClick={() => onRemove(city.id)}
            className="-mr-1 -mt-1 grid size-7 place-items-center rounded-lg text-ink-3 hover:bg-line/60 hover:text-ink"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          data-testid="city-name"
          onClick={() => onPromote(city.id)}
          title={row.isReference ? 'Reference city' : `Make ${city.name} the reference city`}
          className={`line-clamp-2 rounded text-left text-xs font-semibold leading-tight [overflow-wrap:anywhere] ${
            row.isReference ? 'cursor-default' : 'active:text-accent'
          }`}
        >
          {city.name}
        </button>
        <span data-testid="utc-offset" className="mt-auto text-[11px] text-ink-2">
          {formatUtcOffset(row.offsetMinutes)}
        </span>
      </div>
    </div>
  )
}
