import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { getCity, DEFAULT_CITY_IDS, type City } from '@/data/cities'
import {
  computeSchedule,
  type AwakeWindow,
  type Mode,
  type Schedule,
} from '@/lib/overlap'
import type { TimeFormat } from '@/lib/timezone'

const STORAGE_KEY = 'tz_overlap_state_v1'

export interface AppSettings {
  wakeHour: number
  sleepHour: number
  timeFormat: TimeFormat
}

interface TimezoneContextValue {
  cityIds: string[]
  cities: City[]
  mode: Mode
  settings: AppSettings
  schedule: Schedule
  addCity: (cityId: string) => void
  removeCity: (cityId: string) => void
  setReferenceCity: (cityId: string) => void
  setMode: (mode: Mode) => void
  updateSettings: (partial: Partial<AppSettings>) => void
  resetToDefaults: () => void
}

const DEFAULT_SETTINGS: AppSettings = {
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: '12h',
}

const DEFAULT_MODE: Mode = 'meeting'

function loadInitialState(): { cityIds: string[]; mode: Mode; settings: AppSettings } {
  if (typeof window === 'undefined') {
    return {
      cityIds: [...DEFAULT_CITY_IDS],
      mode: DEFAULT_MODE,
      settings: DEFAULT_SETTINGS,
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const validCityIds = Array.isArray(parsed.cityIds)
        ? parsed.cityIds.filter((id: unknown) => typeof id === 'string' && getCity(id))
        : []

      const cityIds = validCityIds.length > 0 ? validCityIds : [...DEFAULT_CITY_IDS]
      const mode: Mode = parsed.mode === 'base' ? 'base' : 'meeting'
      const wakeHour =
        typeof parsed.settings?.wakeHour === 'number' &&
        parsed.settings.wakeHour >= 0 &&
        parsed.settings.wakeHour <= 23
          ? parsed.settings.wakeHour
          : DEFAULT_SETTINGS.wakeHour
      const sleepHour =
        typeof parsed.settings?.sleepHour === 'number' &&
        parsed.settings.sleepHour >= 0 &&
        parsed.settings.sleepHour <= 23
          ? parsed.settings.sleepHour
          : DEFAULT_SETTINGS.sleepHour
      const timeFormat: TimeFormat =
        parsed.settings?.timeFormat === '24h' ? '24h' : '12h'

      return {
        cityIds,
        mode,
        settings: { wakeHour, sleepHour, timeFormat },
      }
    }
  } catch {
    // localStorage parse failed or disabled
  }

  return {
    cityIds: [...DEFAULT_CITY_IDS],
    mode: DEFAULT_MODE,
    settings: DEFAULT_SETTINGS,
  }
}

const TimezoneContext = createContext<TimezoneContextValue | null>(null)

export const TimezoneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState(loadInitialState)
  const [now, setNow] = useState(() => new Date())

  // Update current time periodically (every 30 seconds)
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  // Persist state to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage quota or incognito restriction
    }
  }, [state])

  const addCity = useCallback((cityId: string) => {
    setState((prev) => {
      if (prev.cityIds.includes(cityId)) return prev
      if (!getCity(cityId)) return prev
      return { ...prev, cityIds: [...prev.cityIds, cityId] }
    })
  }, [])

  const removeCity = useCallback((cityId: string) => {
    setState((prev) => ({
      ...prev,
      cityIds: prev.cityIds.filter((id) => id !== cityId),
    }))
  }, [])

  const setReferenceCity = useCallback((cityId: string) => {
    setState((prev) => {
      const without = prev.cityIds.filter((id) => id !== cityId)
      if (prev.cityIds.includes(cityId)) {
        return { ...prev, cityIds: [cityId, ...without] }
      }
      return prev
    })
  }, [])

  const setMode = useCallback((mode: Mode) => {
    setState((prev) => ({ ...prev, mode }))
  }, [])

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...partial },
    }))
  }, [])

  const resetToDefaults = useCallback(() => {
    setState({
      cityIds: [...DEFAULT_CITY_IDS],
      mode: DEFAULT_MODE,
      settings: DEFAULT_SETTINGS,
    })
  }, [])

  const cities: City[] = useMemo(() => {
    return state.cityIds
      .map((id) => getCity(id))
      .filter((c): c is City => Boolean(c))
  }, [state.cityIds])

  const awakeWindow: AwakeWindow = useMemo(
    () => ({
      wakeHour: state.settings.wakeHour,
      sleepHour: state.settings.sleepHour,
    }),
    [state.settings.wakeHour, state.settings.sleepHour]
  )

  const schedule: Schedule = useMemo(() => {
    return computeSchedule(cities, awakeWindow, state.mode, now)
  }, [cities, awakeWindow, state.mode, now])

  const value = useMemo(
    () => ({
      cityIds: state.cityIds,
      cities,
      mode: state.mode,
      settings: state.settings,
      schedule,
      addCity,
      removeCity,
      setReferenceCity,
      setMode,
      updateSettings,
      resetToDefaults,
    }),
    [
      state.cityIds,
      cities,
      state.mode,
      state.settings,
      schedule,
      addCity,
      removeCity,
      setReferenceCity,
      setMode,
      updateSettings,
      resetToDefaults,
    ]
  )

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>
}

export function useTimezone(): TimezoneContextValue {
  const context = useContext(TimezoneContext)
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider')
  }
  return context
}
