import { useEffect, useMemo, useState } from 'react'
import { getCity, type City } from '@/data/cities'
import { computeSchedule, type Schedule } from '@/lib/overlap'
import { useAppStore } from '@/store/useAppStore'

const REFRESH_INTERVAL_MS = 60_000

/** Ticks once a minute so offsets stay correct across DST transitions in a long-lived tab. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export function useSelectedCities(): City[] {
  const cityIds = useAppStore((state) => state.cityIds)
  return useMemo(
    () => cityIds.map((id) => getCity(id)).filter((city): city is City => city !== undefined),
    [cityIds],
  )
}

export function useSchedule(): Schedule {
  const cities = useSelectedCities()
  const mode = useAppStore((state) => state.mode)
  const wakeHour = useAppStore((state) => state.settings.wakeHour)
  const sleepHour = useAppStore((state) => state.settings.sleepHour)
  const now = useNow()

  return useMemo(
    () => computeSchedule(cities, { wakeHour, sleepHour }, mode, now),
    [cities, wakeHour, sleepHour, mode, now],
  )
}
