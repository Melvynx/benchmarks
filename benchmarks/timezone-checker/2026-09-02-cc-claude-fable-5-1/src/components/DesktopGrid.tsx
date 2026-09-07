import { HOURS, type Schedule } from '../lib/overlap'
import { formatHour, type TimeFormat } from '../lib/time'
import { CityLabel } from './CityLabel'
import { HourCell } from './HourCell'
import { RemoveButton } from './RemoveButton'

interface Props {
  schedule: Schedule
  format: TimeFormat
  onPromote: (id: string) => void
  onRemove: (id: string) => void
}

/** Cities as rows, reference hours as columns. */
export function DesktopGrid({ schedule, format, onPromote, onRemove }: Props) {
  const refName = schedule.rows[0]?.city.name
  return (
    <div role="grid" aria-label="Timezone overlap grid" className="grid grid-cols-[minmax(11rem,13rem)_1fr_2.25rem] gap-x-3 gap-y-1.5">
      {/* Hour axis */}
      <div role="row" className="col-span-3 grid grid-cols-subgrid items-end">
        <div role="columnheader" className="pb-1 text-[11px] text-ink-400">
          {refName ? `Hours in ${refName}` : 'Hours'}
        </div>
        <div className="grid grid-cols-24 gap-0.5">
          {HOURS.map((h) => (
            <div key={h} role="columnheader" className="tabular pb-1 text-center text-[10px] text-ink-400">
              {format === '12h' ? formatHour(h, format).replace('m', '') : String(h).padStart(2, '0')}
            </div>
          ))}
        </div>
        <div />
      </div>

      {schedule.rows.map((row) => (
        <div
          key={row.city.id}
          role="row"
          className="animate-fade-up col-span-3 grid grid-cols-subgrid items-center rounded-xl border border-ink-700/70 bg-ink-900/60 py-2 pr-1.5 pl-3 backdrop-blur"
        >
          <div role="rowheader">
            <CityLabel row={row} onPromote={() => onPromote(row.city.id)} />
          </div>
          <div className="grid grid-cols-24 gap-0.5">
            {row.cells.map((cell) => (
              <HourCell key={cell.refHour} cell={cell} format={format} className="h-9" />
            ))}
          </div>
          <div className="flex justify-end">
            <RemoveButton label={row.city.name} onClick={() => onRemove(row.city.id)} />
          </div>
        </div>
      ))}
    </div>
  )
}
