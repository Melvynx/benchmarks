import React from 'react'
import { X, ArrowUpToLine, Clock } from 'lucide-react'
import { useTimezone } from '@/context/TimezoneContext'
import { HourCell } from './HourCell'
import { HOURS } from '@/lib/overlap'
import { formatUtcOffset, formatWholeHour } from '@/lib/timezone'
import { cn } from '@/lib/cn'

export const MobileGrid: React.FC = () => {
  const { schedule, settings, setReferenceCity, removeCity } = useTimezone()
  const reference = schedule.rows[0]

  if (!reference) return null

  const gridColumns = `3.5rem repeat(${schedule.rows.length}, minmax(5rem, 1fr))`

  return (
    <div className="overflow-x-auto scrollbar-thin pb-4 -mx-2 px-2">
      <div
        role="grid"
        aria-label="Mobile 24-Hour Timezone Overlap Grid (Vertical hours)"
        className="grid gap-x-1.5 gap-y-1.5 min-w-max"
        style={{ gridTemplateColumns: gridColumns }}
      >
        {/* Header Row: Column Headers (Ref time + Cities) */}
        <div role="row" className="contents">
          {/* Top-left corner: Reference Time label */}
          <div
            role="columnheader"
            className="sticky top-0 left-0 z-30 bg-ink-900/95 backdrop-blur-md pb-2 pt-1 border-b border-ink-800 flex flex-col justify-end text-[10px] font-bold uppercase tracking-wider text-ink-400"
          >
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Ref</span>
            </div>
          </div>

          {/* City Column Headers */}
          {schedule.rows.map((row) => {
            const offsetStr = formatUtcOffset(row.offsetMinutes)
            return (
              <div
                key={row.city.id}
                role="columnheader"
                className="sticky top-0 z-20 bg-ink-900/95 backdrop-blur-md pb-2 pt-1 border-b border-ink-800 flex flex-col items-center text-center px-1"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-sm" aria-hidden>{row.city.flag}</span>
                  {schedule.rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCity(row.city.id)}
                      className="text-ink-500 hover:text-rose-400 p-0.5 rounded cursor-pointer"
                      title={`Remove ${row.city.name}`}
                      aria-label={`Remove ${row.city.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setReferenceCity(row.city.id)}
                  className={cn(
                    'text-xs font-semibold truncate w-full text-center transition-colors cursor-pointer',
                    row.isReference
                      ? 'text-white'
                      : 'text-ink-200 hover:text-emerald-400'
                  )}
                  title={
                    row.isReference
                      ? 'Reference City'
                      : `Click to set ${row.city.name} as reference`
                  }
                >
                  {row.city.name}
                </button>

                <div className="flex items-center gap-1 mt-0.5">
                  {row.isReference ? (
                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                      REF
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReferenceCity(row.city.id)}
                      className="text-ink-400 hover:text-emerald-400 p-0.5 cursor-pointer"
                      title={`Make ${row.city.name} reference`}
                    >
                      <ArrowUpToLine className="w-3 h-3" />
                    </button>
                  )}
                  <span className="font-mono text-[10px] text-emerald-400/90 tabular">
                    {offsetStr}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* 24 Hour Rows */}
        {HOURS.map((hour) => {
          const isCurrent = hour === schedule.currentReferenceHour
          const hourLabel = formatWholeHour(hour, settings.timeFormat)

          return (
            <div key={hour} role="row" className="contents">
              {/* Row Header: Reference Hour (sticky left) */}
              <div
                role="rowheader"
                className={cn(
                  'sticky left-0 z-10 bg-ink-900/95 backdrop-blur-md flex items-center justify-start pr-1 text-[11px] font-mono tabular font-medium select-none',
                  isCurrent ? 'text-emerald-300 font-bold' : 'text-ink-400'
                )}
              >
                {isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 shrink-0 animate-pulse" />
                )}
                <span>{hourLabel}</span>
              </div>

              {/* City cells for this hour */}
              {schedule.rows.map((row) => (
                <HourCell
                  key={row.city.id}
                  cell={row.cells[hour]}
                  cityName={row.city.name}
                  referenceName={reference.city.name}
                  format={settings.timeFormat}
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
