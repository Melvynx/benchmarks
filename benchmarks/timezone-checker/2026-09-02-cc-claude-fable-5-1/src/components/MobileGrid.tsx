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

/** Cities as columns, reference hours as rows. */
export function MobileGrid({ schedule, format, onPromote, onRemove }: Props) {
  const { rows } = schedule
  const cols = `3rem repeat(${rows.length}, minmax(4.25rem, 1fr))`
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-700/70 bg-ink-900/60 backdrop-blur">
      <div role="grid" aria-label="Timezone overlap grid" className="grid gap-1 p-2" style={{ gridTemplateColumns: cols }}>
        {/* Sticky city header */}
        <div role="row" className="contents">
          <div role="columnheader" className="sticky top-0 z-10 rounded-md bg-ink-900 pb-2 text-[10px] leading-tight text-ink-400">
            {rows[0] ? `${rows[0].city.name} time` : ''}
          </div>
          {rows.map((row) => (
            <div key={row.city.id} role="columnheader" className="sticky top-0 z-10 flex flex-col items-center gap-1 rounded-md bg-ink-900 pb-2">
              <CityLabel row={row} onPromote={() => onPromote(row.city.id)} compact />
              <RemoveButton label={row.city.name} onClick={() => onRemove(row.city.id)} />
            </div>
          ))}
        </div>

        {HOURS.map((h) => (
          <div key={h} role="row" className="contents">
            <div role="rowheader" className="tabular flex items-center text-[11px] text-ink-400">
              {formatHour(h, format)}
            </div>
            {rows.map((row) => (
              <HourCell key={row.city.id} cell={row.cells[h]!} format={format} className="h-8" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
