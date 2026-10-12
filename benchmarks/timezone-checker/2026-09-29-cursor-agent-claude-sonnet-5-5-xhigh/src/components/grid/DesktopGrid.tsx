import { X } from 'lucide-react'
import { memo, useState } from 'react'
import { formatCellLabel, formatUtcOffset } from '../../lib/format'
import { HOURS_PER_DAY, type GridRow } from '../../lib/overlap'
import { currentHourAtOffset } from '../../lib/timezone'
import type { TimeFormat } from '../../lib/types'
import { HOUR_COLUMNS } from './cellInfo'
import { HourCell } from './HourCell'
import { RefBadge } from './RefBadge'
import type { GridViewProps } from './types'

const ROW_COLUMNS = 'grid-cols-[9.5rem_minmax(0,1fr)_2rem] lg:grid-cols-[14rem_minmax(0,1fr)_2.25rem]'
const HOURS = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour)

export function DesktopGrid({ grid, mode, format, now, onPromote, onRemove }: GridViewProps) {
  const [hoverHour, setHoverHour] = useState<number | null>(null)
  const reference = grid.rows[0]!
  const nowHour = currentHourAtOffset(reference.offsetMinutes, now)

  return (
    <div
      role="table"
      aria-label="Hourly availability by city"
      onMouseLeave={() => setHoverHour(null)}
      className="@container rounded-2xl border border-line bg-surface p-3 shadow-card lg:p-4"
    >
      <div role="row" className={`mb-1.5 grid items-end gap-x-2 lg:gap-x-3 ${ROW_COLUMNS}`}>
        <div role="columnheader" className="pb-1 text-xs font-semibold text-ink-2">
          Hours in {reference.city.name}
        </div>
        <div role="presentation" className={`grid ${HOUR_COLUMNS}`}>
          {HOURS.map((hour) => {
            const { hour: label, suffix } = formatCellLabel(hour * 60, format)
            const shared = mode === 'meeting' && grid.sharedOverlap[hour]
            const isNow = hour === nowHour
            return (
              <div
                key={hour}
                role="columnheader"
                data-testid="hour-header"
                data-hour={hour}
                className="flex min-w-0 flex-col items-stretch gap-1"
              >
                <div
                  data-now={isNow}
                  title={isNow ? `Now in ${reference.city.name}` : undefined}
                  className={`hour-head flex flex-col items-center gap-[3px] rounded-md py-1 leading-none ${
                    shared ? 'font-bold text-ink' : 'font-medium text-ink-2'
                  } ${hoverHour === hour ? 'bg-line/70' : ''}`}
                >
                  <span className="text-[10px] @4xl:text-xs">{label}</span>
                  {suffix && <span className="text-[7px] @4xl:text-[8px]">{suffix}</span>}
                </div>
                {mode === 'meeting' && (
                  <span
                    data-overlap={Boolean(shared)}
                    className={`h-1 rounded-full ${shared ? 'bg-overlap' : 'bg-line/60'}`}
                  />
                )}
              </div>
            )
          })}
        </div>
        <div />
      </div>

      <div role="rowgroup" className="flex flex-col gap-1">
        {grid.rows.map((row) => (
          <DesktopRow
            key={row.city.id}
            row={row}
            format={format}
            hoverHour={hoverHour}
            onHover={setHoverHour}
            onPromote={onPromote}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}

interface DesktopRowProps {
  row: GridRow
  format: TimeFormat
  hoverHour: number | null
  onHover: (refHour: number) => void
  onPromote: (cityId: string) => void
  onRemove: (cityId: string) => void
}

const DesktopRow = memo(function DesktopRow({
  row,
  format,
  hoverHour,
  onHover,
  onPromote,
  onRemove,
}: DesktopRowProps) {
  const { city } = row

  return (
    <div
      role="row"
      data-testid="city-row"
      data-city={city.id}
      data-reference={row.isReference}
      className={`grid items-center gap-x-2 lg:gap-x-3 ${ROW_COLUMNS}`}
    >
      <div role="rowheader" className="min-w-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="city-name"
            onClick={() => onPromote(city.id)}
            title={row.isReference ? 'Reference city' : `Make ${city.name} the reference city`}
            className={`min-w-0 truncate rounded text-left text-sm font-semibold ${
              row.isReference ? 'cursor-default' : 'hover:text-accent hover:underline'
            }`}
          >
            {city.name}
          </button>
          {row.isReference && <RefBadge />}
        </div>
        <p className="truncate text-xs text-ink-2">
          {city.country} · <span data-testid="utc-offset">{formatUtcOffset(row.offsetMinutes)}</span>
        </p>
      </div>

      <div role="presentation" className={`grid ${HOUR_COLUMNS}`}>
        {row.cells.map((cell) => (
          <HourCell
            key={cell.refHour}
            cityId={city.id}
            cityName={city.name}
            cell={cell}
            format={format}
            layout="compact"
            hovered={hoverHour === cell.refHour}
            onHover={onHover}
          />
        ))}
      </div>

      <button
        type="button"
        aria-label={`Remove ${city.name}`}
        title={`Remove ${city.name}`}
        onClick={() => onRemove(city.id)}
        className="grid size-8 place-items-center justify-self-end rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
})
