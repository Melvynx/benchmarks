import type { City } from '../data/cities'
import { getUtcOffset, formatUtcOffset, getLocalTime, isAwake, formatHourCell, formatHourFull } from '../utils/timezone'

interface MobileGridProps {
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

export function MobileGrid({
  cities,
  referenceCity,
  wakeHour,
  sleepHour,
  timeFormat,
  isOverlapHour,
  onRemove,
  onPromote,
}: MobileGridProps) {
  const colTemplate = `56px repeat(${cities.length}, 1fr)`

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/30">
      {/* City header row */}
      <div className="grid border-b border-slate-700/50" style={{ gridTemplateColumns: colTemplate }}>
        <div className="px-1 py-2 text-[10px] text-slate-500 font-medium text-center">Hour</div>
        {cities.map((city, index) => {
          const offset = getUtcOffset(city.timezone)
          const isRef = index === 0
          return (
            <div
              key={city.id}
              className="px-1 py-2 text-center border-l border-slate-800/40 cursor-pointer hover:bg-slate-800/40 transition-colors"
              onClick={() => onPromote(city.id)}
            >
              <div className="text-base">{city.flag}</div>
              <div className="text-[11px] font-medium text-slate-200 truncate">{city.name}</div>
              <div className="text-[10px] text-slate-500">{formatUtcOffset(offset)}</div>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                {isRef && (
                  <span className="text-[8px] font-bold bg-amber-500/20 text-amber-400 px-1 rounded leading-tight">
                    REF
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(city.id)
                  }}
                  className="text-[10px] text-slate-600 hover:text-red-400 transition-colors"
                  aria-label={`Remove ${city.name}`}
                >
                  &times;
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Hour rows */}
      {HOURS.map((h) => (
        <div
          key={h}
          className="grid border-b border-slate-800/20 last:border-b-0"
          style={{ gridTemplateColumns: colTemplate }}
        >
          <div className="flex items-center justify-center text-[11px] text-slate-500 font-medium py-1.5">
            {formatHourFull(h, timeFormat)}
          </div>
          {cities.map((city) => {
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
                key={city.id}
                className={`flex items-center justify-center text-[11px] border-l border-slate-800/30 py-1.5 ${cellClass}`}
              >
                {formatHourCell(local.hour, local.minute, timeFormat)}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
