import { memo, useMemo } from 'react'
import { CITY_BY_ID } from '../data/cities'
import {
  buildLocalHourMap,
  formatUtcOffset,
  getTimezoneOffsetMinutes,
  isAwake,
} from '../lib/timezone'
import type { OverlapInfo, Settings } from '../types'
import { Cell } from './Cell'
import { CloseIcon } from './icons'

interface Props {
  cityIds: string[]
  settings: Settings
  mode: 'meeting' | 'base'
  overlap: Record<string, OverlapInfo>
  nowHour: number
  onRemove: (id: string) => void
  onPromote: (id: string) => void
}

function MobileGridRaw({
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
  const refCity = cities[0]

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
      <div className="overflow-x-auto">
        <div className="min-w-fit">
          {/* Header row: cities as columns */}
          <div
            className="grid border-b border-ink-700/80 bg-ink-900/60"
            style={{ gridTemplateColumns: `52px repeat(${cities.length}, minmax(102px, 1fr))` }}
          >
            <div className="flex items-center justify-center px-1.5 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
              Hour
            </div>
            {cities.map((city, idx) => {
              const isRef = idx === 0
              return (
                <div
                  key={city.id}
                  className={[
                    'flex flex-col gap-1 border-l border-ink-800/60 px-2.5 py-2.5',
                    isRef ? 'bg-accent-500/[0.04]' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => onPromote(city.id)}
                      disabled={isRef}
                      className={[
                        'min-w-0 flex-1 text-left transition',
                        isRef ? 'cursor-default' : 'cursor-pointer hover:opacity-80',
                      ].join(' ')}
                      title={isRef ? 'Reference city' : `Promote ${city.name} as reference`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="truncate text-[13px] font-semibold text-ink-50">{city.name}</span>
                        {isRef && (
                          <span className="inline-flex shrink-0 items-center rounded bg-sun-500/15 px-1 font-mono text-[8px] font-bold uppercase tracking-widest text-sun-400 ring-1 ring-inset ring-sun-500/30">
                            Ref
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-ink-300">{formatUtcOffset(offsets[idx])}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(city.id)}
                      disabled={cityIds.length <= 1}
                      className={[
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-500 transition',
                        'hover:bg-ink-700 hover:text-white',
                        cityIds.length <= 1
                          ? 'cursor-not-allowed opacity-30 hover:bg-transparent hover:text-ink-500'
                          : '',
                      ].join(' ')}
                      aria-label={`Remove ${city.name}`}
                    >
                      <CloseIcon width={12} height={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Body: each row is one reference hour */}
          <div className="divide-y divide-ink-800/60">
            {Array.from({ length: 24 }, (_, refHour) => {
              const isNow = refHour === nowHour
              return (
                <div
                  key={refHour}
                  className={['grid', isNow ? 'bg-accent-500/[0.04]' : ''].join(' ')}
                  style={{ gridTemplateColumns: `56px repeat(${cities.length}, minmax(118px, 1fr))` }}
                >
                  <div
                    className={[
                      'flex items-center justify-center border-r border-ink-800/60 px-1.5 py-2 font-mono text-[11px]',
                      isNow ? 'bg-accent-500/10 text-accent-300' : 'text-ink-400',
                    ].join(' ')}
                  >
                    {refHour.toString().padStart(2, '0')}:00
                  </div>
                  {cities.map((city, idx) => {
                    const isRef = idx === 0
                    const rowOverlap =
                      mode === 'meeting'
                        ? overlap['__all__'] ?? { hours: new Set(), ranges: [], totalHours: 0 }
                        : overlap[city.id] ?? { hours: new Set(), ranges: [], totalHours: 0 }
                    const localHour = localMaps[idx][refHour]
                    const awake = isAwake(localHour, settings)
                    let status: 'sleeping' | 'awake' | 'overlap' = 'sleeping'
                    if (awake) {
                      status = rowOverlap.hours.has(refHour) ? 'overlap' : 'awake'
                    }
                    return (
                      <Cell
                        key={city.id}
                        localHour={localHour}
                        status={status}
                        use24h={settings.timeFormat}
                        isNow={isRef && isNow}
                        size="mobile"
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <div className="border-t border-ink-800/60 bg-ink-900/30 px-4 py-2 text-[11px] text-ink-400">
        Scroll horizontally to see more cities · {settings.timeFormat} format
      </div>
    </div>
  )
}

export const MobileGrid = memo(MobileGridRaw)