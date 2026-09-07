import React from 'react'
import { X, ArrowUpToLine, Clock } from 'lucide-react'
import { useTimezone } from '@/context/TimezoneContext'
import { HourCell } from './HourCell'
import { HOURS, type CityRow } from '@/lib/overlap'
import { formatUtcOffset, formatWholeHour } from '@/lib/timezone'
import { cn } from '@/lib/cn'

const GRID_COLUMNS = 'minmax(12.5rem, 15rem) repeat(24, minmax(0, 1fr)) 2.25rem'

export const DesktopGrid: React.FC = () => {
  const { schedule, settings, setReferenceCity, removeCity } = useTimezone()
  const reference = schedule.rows[0]

  if (!reference) return null

  return (
    <div
      role="grid"
      aria-label="24-Hour Timezone Overlap Grid"
      className="grid gap-x-1.5 gap-y-2 text-xs select-none"
      style={{ gridTemplateColumns: GRID_COLUMNS }}
    >
      {/* Grid Header Row: 24 Reference Hours */}
      <div role="row" className="contents">
        {/* Left column header: Reference city indicator */}
        <div
          role="columnheader"
          className="flex items-end pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400"
        >
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate">{reference.city.name} Time</span>
          </div>
        </div>

        {/* 24 Hour Column Headers */}
        {HOURS.map((hour) => {
          const isCurrent = hour === schedule.currentReferenceHour
          const label = formatWholeHour(hour, settings.timeFormat)
          return (
            <div
              key={hour}
              role="columnheader"
              className={cn(
                'flex flex-col items-center justify-end pb-1.5 font-mono text-[10px] tabular transition-colors',
                isCurrent ? 'text-emerald-300 font-bold' : 'text-ink-400'
              )}
            >
              {isCurrent && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mb-0.5 animate-pulse" />
              )}
              <span className="truncate">{label}</span>
            </div>
          )
        })}

        {/* Action column header spacer */}
        <div role="columnheader" aria-hidden />
      </div>

      {/* City Rows */}
      {schedule.rows.map((row) => (
        <CityDesktopRow
          key={row.city.id}
          row={row}
          referenceName={reference.city.name}
          currentReferenceHour={schedule.currentReferenceHour}
          timeFormat={settings.timeFormat}
          onPromote={() => setReferenceCity(row.city.id)}
          onRemove={() => removeCity(row.city.id)}
          canRemove={schedule.rows.length > 1}
        />
      ))}
    </div>
  )
}

interface CityDesktopRowProps {
  row: CityRow
  referenceName: string
  currentReferenceHour: number | null
  timeFormat: ReturnType<typeof useTimezone>['settings']['timeFormat']
  onPromote: () => void
  onRemove: () => void
  canRemove: boolean
}

const CityDesktopRow: React.FC<CityDesktopRowProps> = ({
  row,
  referenceName,
  currentReferenceHour,
  timeFormat,
  onPromote,
  onRemove,
  canRemove,
}) => {
  const offsetStr = formatUtcOffset(row.offsetMinutes)

  return (
    <div role="row" className="contents group">
      {/* Left: City Info + REF badge + UTC offset */}
      <div
        role="rowheader"
        className="flex items-center justify-between pr-2.5 py-1 min-w-0"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-base shrink-0" aria-hidden>
            {row.city.flag}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onPromote}
                className={cn(
                  'font-semibold text-sm truncate text-left transition-colors cursor-pointer',
                  row.isReference
                    ? 'text-white cursor-default'
                    : 'text-ink-200 hover:text-emerald-400'
                )}
                title={
                  row.isReference
                    ? 'Current Reference City'
                    : `Click to set ${row.city.name} as reference city`
                }
              >
                {row.city.name}
              </button>

              {row.isReference ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0 uppercase tracking-wide">
                  REF
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onPromote}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-ink-400 hover:text-emerald-400 transition-opacity cursor-pointer shrink-0"
                  title={`Make ${row.city.name} the reference city`}
                  aria-label={`Make ${row.city.name} the reference city`}
                >
                  <ArrowUpToLine className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-ink-400">
              <span className="truncate">{row.city.country}</span>
              <span className="text-ink-600">•</span>
              <span className="font-mono text-[11px] text-emerald-400/90 font-medium shrink-0 tabular">
                {offsetStr}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center: 24 Hour Cells */}
      {row.cells.map((cell) => (
        <HourCell
          key={cell.referenceHour}
          cell={cell}
          cityName={row.city.name}
          referenceName={referenceName}
          format={timeFormat}
          isCurrent={cell.referenceHour === currentReferenceHour}
          orientation="row"
        />
      ))}

      {/* Right: Remove button */}
      <div role="gridcell" className="flex items-center justify-center">
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded-lg text-ink-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title={`Remove ${row.city.name}`}
            aria-label={`Remove ${row.city.name}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
