import { useMemo } from 'react'
import { CITY_BY_ID } from '../data/cities'
import { buildGrid, type Grid, type GridCity } from '../lib/overlap'
import { getUtcOffsetMinutes } from '../lib/timezone'
import type { AppState } from '../state/appState'

export function useGrid({ cityIds, settings, mode }: AppState, now: Date): Grid {
  const { wake, sleep } = settings
  // Offsets only change at DST boundaries, so recompute at minute granularity at most.
  const minute = Math.floor(now.getTime() / 60_000)

  return useMemo(() => {
    const at = new Date(minute * 60_000)
    const cities: GridCity[] = cityIds.flatMap((id) => {
      const city = CITY_BY_ID.get(id)
      return city ? [{ city, offsetMinutes: getUtcOffsetMinutes(city.timeZone, at) }] : []
    })
    return buildGrid(cities, { wake, sleep }, mode)
  }, [cityIds, wake, sleep, mode, minute])
}
