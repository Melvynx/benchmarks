import { CityLabel, RemoveCityButton } from './CityLabel'
import { HourCell } from './HourCell'
import { cn } from '@/lib/cn'
import { HOURS, type Schedule } from '@/lib/overlap'
import { formatCompact, type TimeFormat } from '@/lib/timezone'

interface MobileGridProps {
  schedule: Schedule
  format: TimeFormat
}

/** Cities as columns, the reference city's 24 hours as rows. */
export function MobileGrid({ schedule, format }: MobileGridProps) {
  const reference = schedule.rows[0]
  if (!reference) return null

  const columns = `3.25rem repeat(${schedule.rows.length}, minmax(4.25rem, 1fr))`

  return (
    <div className="scrollbar-thin -mx-1 overflow-x-auto px-1">
      <div
        role="grid"
        aria-label="Hour-by-hour availability, cities as columns"
        className="grid gap-x-1.5 gap-y-px"
        style={{ gridTemplateColumns: columns }}
      >
        <div role="row" className="contents">
          <div
            role="columnheader"
            className="sticky left-0 top-0 z-20 flex items-end bg-ink-850 pb-2 text-[10px] font-medium uppercase tracking-wider text-ink-500"
          >
            Ref
          </div>
          {schedule.rows.map((row) => (
            <div
              key={row.city.id}
              role="columnheader"
              className="sticky top-0 z-10 flex flex-col items-center gap-1 bg-ink-850/95 pb-2 backdrop-blur"
            >
              <CityLabel row={row} layout="vertical" />
              <RemoveCityButton row={row} className="h-6 w-6" />
            </div>
          ))}
        </div>

        {HOURS.map((hour) => {
          const isCurrent = hour === schedule.currentReferenceHour
          return (
            <div key={hour} role="row" className="contents">
              <div
                role="rowheader"
                className={cn(
                  'tabular sticky left-0 z-10 flex items-center gap-1 bg-ink-850 pr-1 font-mono text-[10px]',
                  isCurrent ? 'text-ink-100' : 'text-ink-500',
                )}
              >
                {isCurrent && <span className="h-1 w-1 shrink-0 rounded-full bg-mint-400" aria-hidden />}
                {formatCompact(hour * 60, format)}
              </div>
              {schedule.rows.map((row) => (
                <HourCell
                  key={row.city.id}
                  cell={row.cells[hour]}
                  cityName={row.city.name}
                  referenceName={reference.city.name}
                  format={format}
                  isCurrent={isCurrent}
                  orientation="column"
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
