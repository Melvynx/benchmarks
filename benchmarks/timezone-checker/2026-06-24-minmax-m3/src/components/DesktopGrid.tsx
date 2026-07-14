import { memo, useMemo } from 'react'
import { CITY_BY_ID } from '../data/cities'
import {
  buildLocalHourMap,
  formatUtcOffset,
  getTimezoneOffsetMinutes,
  isAwake,
} from '../lib/timezone'
import type { City, OverlapInfo, Settings } from '../types'
import { Cell, HourHeader } from './Cell'
import { CloseIcon, MoonIcon, SunIcon } from './icons'

interface Props {
  cityIds: string[]
  settings: Settings
  mode: 'meeting' | 'base'
  overlap: Record<string, OverlapInfo>
  nowHour: number
  onRemove: (id: string) => void
  onPromote: (id: string) => void
}

function DesktopGridRaw({
  cityIds,
  settings,
  mode,
  overlap,
  nowHour,
  onRemove,
  onPromote,
}: Props) {
  const cities = useMemo(
    () => cityIds.map((id) => CITY_BY_ID.get(id)!).filter(Boolean),
    [cityIds],
  )

  const refCity: City | undefined = cities[0]

  const localMaps = useMemo(() => {
    if (!refCity) return [] as number[][]
    return cities.map((c) => buildLocalHourMap(refCity.timezone, c.timezone))
  }, [refCity, cities])

  const offsets = useMemo(() => {
    return cities.map((c) => getTimezoneOffsetMinutes(c.timezone))
  }, [cities])

  if (!refCity || cities.length === 0) return null

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-750 bg-ink-850/60 shadow-2xl shadow-black/30">
      <div
        className="grid border-b border-ink-700/80 bg-ink-900/60"
        style={{ gridTemplateColumns: 'minmax(220px, 240px) repeat(24, minmax(0, 1fr))' }}
      >
        <div className="flex items-center gap-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-ink-400">
          <span>City</span>
          <span className="text-ink-600">·</span>
          <span className="text-ink-500">local</span>
        </div>
        {Array.from({ length: 24 }, (_, h) => (
          <HourHeader key={h} refHour={h} use24h={settings.timeFormat} isNow={h === nowHour} />
        ))}
      </div>

      <div className="divide-y divide-ink-800/60">
        {cities.map((city, idx) => {
          const isRef = idx === 0
          const rowOverlap =
            mode === 'meeting'
              ? overlap['__all__'] ?? { hours: new Set(), ranges: [], totalHours: 0 }
              : overlap[city.id] ?? { hours: new Set(), ranges: [], totalHours: 0 }

          return (
            <div
              key={city.id}
              className={['grid transition-colors', isRef ? 'bg-accent-500/[0.035]' : ''].join(' ')}
              style={{ gridTemplateColumns: 'minmax(220px, 240px) repeat(24, minmax(0, 1fr))' }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => onPromote(city.id)}
                  disabled={isRef}
                  className={[
                    'group flex min-w-0 flex-1 flex-col items-start text-left transition',
                    isRef ? 'cursor-default' : 'cursor-pointer hover:opacity-80',
                  ].join(' ')}
                  title={isRef ? 'Reference city' : `Promote ${city.name} as reference`}
                >
                  <span className="flex w-full items-center gap-2">
                    <span className="truncate font-semibold text-ink-50">{city.name}</span>
                    {isRef && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-sun-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-sun-400 ring-1 ring-inset ring-sun-500/30">
                        Ref
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 flex w-full items-center gap-1.5 text-[11px] text-ink-400">
                    <span className="truncate">{city.country}</span>
                    <span className="font-mono text-ink-600">·</span>
                    <span className="font-mono text-ink-300">{formatUtcOffset(offsets[idx])}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(city.id)}
                  disabled={cityIds.length <= 1}
                  className={[
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-500 transition',
                    'hover:bg-ink-700 hover:text-white',
                    cityIds.length <= 1 ? 'cursor-not-allowed opacity-30 hover:bg-transparent hover:text-ink-500' : '',
                  ].join(' ')}
                  aria-label={`Remove ${city.name}`}
                  title={cityIds.length <= 1 ? 'At least one city required' : `Remove ${city.name}`}
                >
                  <CloseIcon width={14} height={14} />
                </button>
              </div>

              {Array.from({ length: 24 }, (_, refHour) => {
                const localHour = localMaps[idx][refHour]
                const awake = isAwake(localHour, settings)
                let status: 'sleeping' | 'awake' | 'overlap' = 'sleeping'
                if (awake) {
                  status = rowOverlap.hours.has(refHour) ? 'overlap' : 'awake'
                }
                return (
                  <Cell
                    key={refHour}
                    localHour={localHour}
                    status={status}
                    use24h={settings.timeFormat}
                    isNow={isRef && refHour === nowHour}
                    size="desktop"
                  />
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-800/60 bg-ink-900/30 px-4 py-2.5 text-[11px] text-ink-400">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-leaf-500/40 bg-leaf-500/25" />
            <span>Awake + overlap</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-ink-800" />
            <span>Awake only</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-transparent ring-1 ring-inset ring-ink-700" />
            <span>Sleeping</span>
          </span>
        </div>
        <div className="inline-flex items-center gap-1.5 font-mono">
          <SunIcon width={11} height={11} className="text-sun-400" />
          <span>
            {settings.wakeHour.toString().padStart(2, '0')}:00 → {settings.sleepHour.toString().padStart(2, '0')}:00
          </span>
          <MoonIcon width={11} height={11} className="text-ink-400" />
        </div>
      </div>
    </div>
  )
}

export const DesktopGrid = memo(DesktopGridRaw)