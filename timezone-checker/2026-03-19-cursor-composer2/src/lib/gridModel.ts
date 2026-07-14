import { DateTime } from 'luxon'
import type { City } from '../data/cities'
import { isAwakeHour } from './awake'

export type AppMode = 'meeting' | 'base'

export interface CellState {
  localHour: number
  sleeping: boolean
  overlap: boolean
}

export interface GridRowModel {
  city: City
  cells: CellState[]
}

function refDayStart(refTz: string): DateTime {
  return DateTime.now().setZone(refTz).startOf('day')
}

/** Local wall hour (0–23) in `cityTz` when reference city is at `refHour` on today's calendar date in ref TZ */
export function localHourAtRefHour(refTz: string, cityTz: string, refHour: number): number {
  const base = refDayStart(refTz)
  const instant = base.set({ hour: refHour, minute: 0, second: 0, millisecond: 0 })
  return instant.setZone(cityTz).hour
}

export function utcOffsetLabel(timeZone: string): string {
  return DateTime.now().setZone(timeZone).toFormat('ZZ')
}

export function buildGridRows(
  cities: City[],
  wakeHour: number,
  sleepHour: number,
  mode: AppMode,
): GridRowModel[] {
  if (cities.length === 0) return []
  const ref = cities[0]
  const refTz = ref.timeZone

  const rows: GridRowModel[] = cities.map((city) => {
    const cells: CellState[] = []
    for (let refH = 0; refH < 24; refH++) {
      const localH =
        city.id === ref.id ? refH : localHourAtRefHour(refTz, city.timeZone, refH)
      const sleeping = !isAwakeHour(localH, wakeHour, sleepHour)

      let overlap = false
      if (!sleeping) {
        if (mode === 'meeting') {
          const allAwake =
            cities.length >= 2 &&
            cities.every((c) => {
              const lh = c.id === ref.id ? refH : localHourAtRefHour(refTz, c.timeZone, refH)
              return isAwakeHour(lh, wakeHour, sleepHour)
            })
          overlap = allAwake
        } else {
          // base: pairwise with reference only
          const refAwake = isAwakeHour(refH, wakeHour, sleepHour)
          overlap = refAwake && city.id !== ref.id && !sleeping
        }
      }

      cells.push({ localHour: localH, sleeping, overlap })
    }
    return { city, cells }
  })

  return rows
}

/** Reference hours (0–23) where condition holds */
export function meetingOverlapHours(
  cities: City[],
  wakeHour: number,
  sleepHour: number,
): number[] {
  if (cities.length < 2) return []
  const ref = cities[0]
  const refTz = ref.timeZone
  const out: number[] = []
  for (let refH = 0; refH < 24; refH++) {
    const ok = cities.every((c) => {
      const lh = c.id === ref.id ? refH : localHourAtRefHour(refTz, c.timeZone, refH)
      return isAwakeHour(lh, wakeHour, sleepHour)
    })
    if (ok) out.push(refH)
  }
  return out
}

export function baseOverlapHours(
  cities: City[],
  wakeHour: number,
  sleepHour: number,
): Map<string, number[]> {
  const map = new Map<string, number[]>()
  if (cities.length < 2) return map
  const ref = cities[0]
  const refTz = ref.timeZone
  for (const city of cities) {
    if (city.id === ref.id) continue
    const hours: number[] = []
    for (let refH = 0; refH < 24; refH++) {
      const refAwake = isAwakeHour(refH, wakeHour, sleepHour)
      const lh = localHourAtRefHour(refTz, city.timeZone, refH)
      const cityAwake = isAwakeHour(lh, wakeHour, sleepHour)
      if (refAwake && cityAwake) hours.push(refH)
    }
    map.set(city.id, hours)
  }
  return map
}

export function hoursToRanges(hours: number[]): [number, number][] {
  if (hours.length === 0) return []
  const sorted = [...new Set(hours)].sort((a, b) => a - b)
  const ranges: [number, number][] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i]
    } else {
      ranges.push([start, prev + 1])
      start = sorted[i]
      prev = sorted[i]
    }
  }
  ranges.push([start, prev + 1])
  return ranges
}
