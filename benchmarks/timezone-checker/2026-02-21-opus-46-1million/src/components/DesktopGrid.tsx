import type { City } from '../data/cities'
import { getUtcOffset, formatUtcOffset, getLocalTime, isAwake, formatHourCell, formatHourFull } from '../utils/timezone'

interface DesktopGridProps {
  cities: City[]
  referenceCity: City
  wakeHour: number
  sleepHour: number
  timeFormat: '12h' | '24h'
  isOverlapHour: (cityId: string, refHour: number) => boolean
  onRemove: (id: string) => void
  onPromote: (id: string) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function DesktopGrid({
  cities,
  referenceCity,
  wakeHour,
  sleepHour,
  timeFormat,
  isOverlapHour,
  onRemove,
  onPromote,
}: DesktopGridProps) {
  const gridCols = '180px repeat(24, minmax(44px, 1fr)) 36px'

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/30">
      <div style={{ minWidth: '1236px' }}>
        {/* Header row */}
        <div className="grid border-b border-slate-700/50" style={{ gridTemplateColumns: gridCols }}>
          <div className="px-3 py-2 text-[11px] text-slate-500 font-medium uppercase tracking-wider">City</div>
          {HOURS.map((h) => (
            <div
              key={h}
              className="py-2 text-center text-[11px] text-slate-500 font-medium border-l border-slate-800/40"
            >
              {formatHourFull(h, timeFormat)}
            </div>
          ))}
          <div />
        </div>

        {/* City rows */}
        {cities.map((city, index) => {
          const offset = getUtcOffset(city.timezone)
          const isRef = index === 0

          return (
            <div
              key={city.id}
              className="grid border-b border-slate-800/30 last:border-b-0 hover:bg-slate-800/20 transition-colors"
              style={{ gridTemplateColumns: gridCols }}
            >
              <div
                className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-800/40 transition-colors select-none"
                onClick={() => onPromote(city.id)}
                title="Click to set as reference"
              >
                <span className="text-base shrink-0">{city.flag}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-sm text-slate-100 truncate">{city.name}</span>
                    {isRef && (
                      <span className="shrink-0 text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1 py-px rounded leading-tight">
                        REF
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">{formatUtcOffset(offset)}</span>
                </div>
              </div>

              {HOURS.map((h) => {
                const local = getLocalTime(h, referenceCity.timezone, city.timezone)
                const awake = isAwake(local.hour, wakeHour, sleepHour)
                const overlap = isOverlapHour(city.id, h)

                let cellClass = 'text-slate-600 bg-slate-950/40'
                if (awake && overlap) {
                  cellClass = 'text-emerald-200 bg-emerald-600/30 font-bold'
                } else if (awake) {
                  cellClass = 'text-slate-300 bg-slate-800/30'
                }

                return (
                  <div
                    key={h}
                    className={`flex items-center justify-center text-[11px] border-l border-slate-800/30 transition-colors ${cellClass}`}
                  >
                    {formatHourCell(local.hour, local.minute, timeFormat)}
                  </div>
                )
              })}

              <div className="flex items-center justify-center">
                <button
                  onClick={() => onRemove(city.id)}
                  className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors text-lg leading-none"
                  aria-label={`Remove ${city.name}`}
                >
                  &times;
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
