import { CityLabel, RemoveCityButton } from './CityLabel'
import { HourCell } from './HourCell'
import { cn } from '@/lib/cn'
import { HOURS, type Schedule } from '@/lib/overlap'
import { formatCompact, type TimeFormat } from '@/lib/timezone'

interface DesktopGridProps {
  schedule: Schedule
  format: TimeFormat
}

const COLUMNS = 'minmax(11rem, 14rem) repeat(24, minmax(0, 1fr)) 2.25rem'

/** Cities as rows, the reference city's 24 hours as columns. */
export function DesktopGrid({ schedule, format }: DesktopGridProps) {
  const reference = schedule.rows[0]
  if (!reference) return null

  return (
    <div
      role="grid"
      aria-label="Hour-by-hour availability, cities as rows"
      className="grid gap-x-px gap-y-1.5"
      style={{ gridTemplateColumns: COLUMNS }}
    >
      <div role="row" className="contents">
        <div role="columnheader" className="self-end pb-1 text-[11px] font-medium uppercase tracking-wider text-ink-500">
          {reference.city.name} time
        </div>
        {HOURS.map((hour) => {
          const isCurrent = hour === schedule.currentReferenceHour
          return (
            <div
              key={hour}
              role="columnheader"
              className={cn(
                'tabular flex flex-col items-center justify-end gap-1 pb-1 font-mono text-[10px]',
                isCurrent ? 'text-ink-100' : 'text-ink-500',
              )}
            >
              {isCurrent && <span className="h-1 w-1 rounded-full bg-mint-400" aria-hidden />}
              <span>{formatCompact(hour * 60, format)}</span>
            </div>
          )
        })}
        <div role="columnheader" aria-hidden />
      </div>

      {schedule.rows.map((row) => (
        <div key={row.city.id} role="row" className="contents">
          <div role="rowheader" className="flex items-center pr-3">
            <CityLabel row={row} layout="horizontal" />
          </div>
          {row.cells.map((cell) => (
            <HourCell
              key={cell.referenceHour}
              cell={cell}
              cityName={row.city.name}
              referenceName={reference.city.name}
              format={format}
              isCurrent={cell.referenceHour === schedule.currentReferenceHour}
              orientation="row"
            />
          ))}
          <div role="gridcell" className="flex items-center justify-end">
            <RemoveCityButton row={row} />
          </div>
        </div>
      ))}
    </div>
  )
}
