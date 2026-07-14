import type { City } from '../data/cities'
import { getLocalHour, hoursToRanges, isAwake, type HourRange } from './timezone'

export type AppMode = 'meeting' | 'base'
export type CellState = 'sleeping' | 'awake' | 'overlap'

export type CityRow = {
  city: City
  isReference: boolean
  cells: { refHour: number; localHour: number; state: CellState }[]
}

export type MeetingSummary = {
  mode: 'meeting'
  hours: number[]
  ranges: HourRange[]
}

export type BaseSummaryLine = {
  city: City
  hours: number[]
  ranges: HourRange[]
}

export type BaseSummary = {
  mode: 'base'
  lines: BaseSummaryLine[]
}

export type OverlapSummary = MeetingSummary | BaseSummary

export function buildGrid(
  cities: City[],
  mode: AppMode,
  wakeHour: number,
  sleepHour: number,
  now: Date = new Date(),
): { rows: CityRow[]; summary: OverlapSummary | null; meetingOverlapHours: Set<number> } {
  if (cities.length === 0) {
    return { rows: [], summary: null, meetingOverlapHours: new Set() }
  }

  const ref = cities[0]
  const REF_HOURS = Array.from({ length: 24 }, (_, h) => h)

  const localHoursByCity = cities.map((city) =>
    REF_HOURS.map((refHour) => getLocalHour(ref.timezone, refHour, city.timezone, now)),
  )

  const awakeByCity = localHoursByCity.map((locals) =>
    locals.map((localHour) => isAwake(localHour, wakeHour, sleepHour)),
  )

  const meetingOverlapHours = new Set<number>()
  if (cities.length >= 2) {
    for (const refHour of REF_HOURS) {
      if (awakeByCity.every((row) => row[refHour])) {
        meetingOverlapHours.add(refHour)
      }
    }
  }

  const baseOverlapByCity = new Map<string, Set<number>>()
  if (mode === 'base' && cities.length >= 2) {
    const refAwake = awakeByCity[0]
    for (let i = 1; i < cities.length; i++) {
      const set = new Set<number>()
      for (const refHour of REF_HOURS) {
        if (refAwake[refHour] && awakeByCity[i][refHour]) {
          set.add(refHour)
        }
      }
      baseOverlapByCity.set(cities[i].id, set)
    }
  }

  const rows: CityRow[] = cities.map((city, cityIndex) => {
    const isReference = cityIndex === 0
    const cells = REF_HOURS.map((refHour) => {
      const localHour = localHoursByCity[cityIndex][refHour]
      const awake = awakeByCity[cityIndex][refHour]

      let state: CellState = awake ? 'awake' : 'sleeping'
      if (awake && cities.length >= 2) {
        if (mode === 'meeting' && meetingOverlapHours.has(refHour)) {
          state = 'overlap'
        } else if (mode === 'base') {
          if (isReference) {
            // Reference highlights hours that overlap with ANY other city
            const overlapsSomeone = [...baseOverlapByCity.values()].some((s) => s.has(refHour))
            if (overlapsSomeone) state = 'overlap'
          } else if (baseOverlapByCity.get(city.id)?.has(refHour)) {
            state = 'overlap'
          }
        }
      }

      return { refHour, localHour, state }
    })

    return { city, isReference, cells }
  })

  let summary: OverlapSummary | null = null
  if (cities.length >= 2) {
    if (mode === 'meeting') {
      const hours = [...meetingOverlapHours].sort((a, b) => a - b)
      summary = { mode: 'meeting', hours, ranges: hoursToRanges(hours) }
    } else {
      summary = {
        mode: 'base',
        lines: cities.slice(1).map((city) => {
          const hours = [...(baseOverlapByCity.get(city.id) ?? [])].sort((a, b) => a - b)
          return { city, hours, ranges: hoursToRanges(hours) }
        }),
      }
    }
  }

  return { rows, summary, meetingOverlapHours }
}
