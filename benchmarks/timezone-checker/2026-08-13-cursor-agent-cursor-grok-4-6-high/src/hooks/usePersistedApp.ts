import { useCallback, useEffect, useMemo, useState } from 'react'
import { CITY_BY_ID, type City } from '../data/cities'
import type { Mode } from '../lib/overlap'
import { loadState, saveState, type PersistedState } from '../lib/storage'
import type { TimeFormat } from '../lib/time'

export function usePersistedApp() {
  const [state, setState] = useState<PersistedState>(() => loadState())

  useEffect(() => {
    saveState(state)
  }, [state])

  const cities = useMemo(
    () => state.cityIds.map((id) => CITY_BY_ID.get(id)).filter((city): city is City => Boolean(city)),
    [state.cityIds],
  )

  const addCity = useCallback((id: string) => {
    setState((current) => {
      if (!CITY_BY_ID.has(id) || current.cityIds.includes(id)) return current
      return { ...current, cityIds: [...current.cityIds, id] }
    })
  }, [])

  const removeCity = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      cityIds: current.cityIds.filter((cityId) => cityId !== id),
    }))
  }, [])

  const setReference = useCallback((id: string) => {
    setState((current) => {
      if (current.cityIds[0] === id || !current.cityIds.includes(id)) return current
      return { ...current, cityIds: [id, ...current.cityIds.filter((cityId) => cityId !== id)] }
    })
  }, [])

  const setMode = useCallback((mode: Mode) => {
    setState((current) => (current.mode === mode ? current : { ...current, mode }))
  }, [])

  const setWakeHour = useCallback((wakeHour: number) => {
    setState((current) => ({ ...current, wakeHour }))
  }, [])

  const setSleepHour = useCallback((sleepHour: number) => {
    setState((current) => ({ ...current, sleepHour }))
  }, [])

  const setTimeFormat = useCallback((timeFormat: TimeFormat) => {
    setState((current) => ({ ...current, timeFormat }))
  }, [])

  return {
    ...state,
    cities,
    addCity,
    removeCity,
    setReference,
    setMode,
    setWakeHour,
    setSleepHour,
    setTimeFormat,
  }
}

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
