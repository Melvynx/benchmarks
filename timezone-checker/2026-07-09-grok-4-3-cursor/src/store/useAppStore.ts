import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_CITY_IDS } from '../data/cities'
import type { AppMode } from '../lib/overlap'

export type TimeFormat = '12h' | '24h'

type AppState = {
  cityIds: string[]
  mode: AppMode
  wakeHour: number
  sleepHour: number
  timeFormat: TimeFormat
  settingsOpen: boolean
  addCity: (id: string) => void
  removeCity: (id: string) => void
  setReference: (id: string) => void
  setMode: (mode: AppMode) => void
  setWakeHour: (hour: number) => void
  setSleepHour: (hour: number) => void
  setTimeFormat: (format: TimeFormat) => void
  setSettingsOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      cityIds: [...DEFAULT_CITY_IDS],
      mode: 'meeting',
      wakeHour: 7,
      sleepHour: 23,
      timeFormat: '12h',
      settingsOpen: false,

      addCity: (id) => {
        const { cityIds } = get()
        if (cityIds.includes(id)) return
        set({ cityIds: [...cityIds, id] })
      },

      removeCity: (id) => {
        set({ cityIds: get().cityIds.filter((c) => c !== id) })
      },

      setReference: (id) => {
        const { cityIds } = get()
        if (!cityIds.includes(id) || cityIds[0] === id) return
        set({ cityIds: [id, ...cityIds.filter((c) => c !== id)] })
      },

      setMode: (mode) => set({ mode }),
      setWakeHour: (wakeHour) => set({ wakeHour }),
      setSleepHour: (sleepHour) => set({ sleepHour }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
    }),
    {
      name: 'timezone-overlap-checker',
      partialize: (state) => ({
        cityIds: state.cityIds,
        mode: state.mode,
        wakeHour: state.wakeHour,
        sleepHour: state.sleepHour,
        timeFormat: state.timeFormat,
      }),
    },
  ),
)
