import { useMemo } from 'react'
import { getCity } from '../data/cities'
import { computeBoard, type Board } from '../lib/overlap'
import { currentHour, formatClock, formatUtcOffset, getUtcOffsetMinutes } from '../lib/time'
import type { AppState, City } from '../types'

export interface CityView {
  city: City
  offsetMinutes: number
  offsetLabel: string
  clock: string
  isReference: boolean
}

export interface BoardView {
  cities: CityView[]
  board: Board
  /** Current hour (0–23) in the reference city, i.e. the column that is "now". */
  nowHour: number | null
}

/** Derives everything the grid needs from persisted state and the current minute. */
export function useBoard(state: AppState, now: Date): BoardView {
  const utcMinute = Math.floor(now.getTime() / 60_000)
  const { cityIds, mode, settings } = state
  const { wake, sleep, timeFormat } = settings

  return useMemo(() => {
    const at = new Date(utcMinute * 60_000)
    const cities = cityIds.flatMap((id, index): CityView[] => {
      const city = getCity(id)
      if (!city) return []
      const offsetMinutes = getUtcOffsetMinutes(city.timeZone, at)
      return [
        {
          city,
          offsetMinutes,
          offsetLabel: formatUtcOffset(offsetMinutes),
          clock: formatClock(utcMinute, offsetMinutes, timeFormat),
          isReference: index === 0,
        },
      ]
    })
    const board = computeBoard(
      cities.map((view) => view.offsetMinutes),
      { wake, sleep },
      mode,
    )
    const nowHour = cities.length ? currentHour(utcMinute, cities[0].offsetMinutes) : null
    return { cities, board, nowHour }
  }, [cityIds, mode, wake, sleep, timeFormat, utcMinute])
}
