import { useMemo } from 'react'
import { CITY_BY_ID, type City } from '../domain/cities'
import {
  analyzeOverlap,
  buildTimelines,
  resolveCellStates,
  type AwakeWindow,
  type CellState,
  type CityTimeline,
  type Mode,
  type OverlapAnalysis,
} from '../domain/schedule'
import { getZonedParts, type TimeFormat } from '../domain/time'
import { useAppStore } from '../state/app-store'
import { useNow } from './use-now'

export interface ScheduleRow {
  timeline: CityTimeline
  states: readonly CellState[]
  isReference: boolean
  /** Live local clock for this city. */
  nowMinutes: number
  nowWeekday: number
}

export interface Schedule {
  now: Date
  mode: Mode
  format: TimeFormat
  window: AwakeWindow
  rows: ScheduleRow[]
  reference: ScheduleRow | null
  analysis: OverlapAnalysis | null
  /** Weekday of the reference city's current day; anchors the date shown at local midnights. */
  referenceWeekday: number
}

export function useSchedule(): Schedule {
  const cityIds = useAppStore((s) => s.cityIds)
  const mode = useAppStore((s) => s.mode)
  const settings = useAppStore((s) => s.settings)
  const now = useNow()

  return useMemo(() => {
    const awakeWindow = { wakeHour: settings.wakeHour, sleepHour: settings.sleepHour }
    const cities = cityIds.map((id) => CITY_BY_ID.get(id)).filter((city): city is City => Boolean(city))
    const timelines = buildTimelines(cities, now, awakeWindow)
    const analysis = analyzeOverlap(timelines, mode)
    const states = resolveCellStates(timelines, analysis)

    const rows = timelines.map((timeline, index): ScheduleRow => {
      const clock = getZonedParts(timeline.city.timeZone, now)
      return {
        timeline,
        states: states[index] ?? [],
        isReference: index === 0,
        nowMinutes: clock.hour * 60 + clock.minute,
        nowWeekday: clock.weekday,
      }
    })
    const reference = rows[0] ?? null

    return {
      now,
      mode,
      format: settings.timeFormat,
      window: awakeWindow,
      rows,
      reference,
      analysis,
      referenceWeekday: reference?.nowWeekday ?? now.getDay(),
    }
  }, [cityIds, mode, settings, now])
}
