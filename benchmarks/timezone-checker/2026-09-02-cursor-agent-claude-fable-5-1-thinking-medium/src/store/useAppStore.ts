import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_CITY_IDS, getCity } from '@/data/cities'
import type { Mode } from '@/lib/overlap'
import type { TimeFormat } from '@/lib/timezone'

export interface Settings {
  wakeHour: number
  sleepHour: number
  timeFormat: TimeFormat
}

interface AppState {
  cityIds: string[]
  mode: Mode
  settings: Settings
  addCity: (id: string) => void
  removeCity: (id: string) => void
  promoteCity: (id: string) => void
  setMode: (mode: Mode) => void
  updateSettings: (patch: Partial<Settings>) => void
  reset: () => void
}

export const DEFAULT_SETTINGS: Settings = {
  wakeHour: 7,
  sleepHour: 23,
  timeFormat: '12h',
}

export const STORAGE_KEY = 'timezone-overlap-checker:v1'

const clampHour = (value: number, fallback: number) =>
  Number.isInteger(value) && value >= 0 && value <= 23 ? value : fallback

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      cityIds: [...DEFAULT_CITY_IDS],
      mode: 'meeting',
      settings: { ...DEFAULT_SETTINGS },

      addCity: (id) =>
        set((state) => {
          if (!getCity(id) || state.cityIds.includes(id)) return state
          return { cityIds: [...state.cityIds, id] }
        }),

      removeCity: (id) => set((state) => ({ cityIds: state.cityIds.filter((cityId) => cityId !== id) })),

      promoteCity: (id) =>
        set((state) => {
          if (!state.cityIds.includes(id) || state.cityIds[0] === id) return state
          return { cityIds: [id, ...state.cityIds.filter((cityId) => cityId !== id)] }
        }),

      setMode: (mode) => set({ mode }),

      updateSettings: (patch) =>
        set((state) => {
          const next = { ...state.settings, ...patch }
          return {
            settings: {
              wakeHour: clampHour(next.wakeHour, state.settings.wakeHour),
              sleepHour: clampHour(next.sleepHour, state.settings.sleepHour),
              timeFormat: next.timeFormat === '24h' ? '24h' : '12h',
            },
          }
        }),

      reset: () => set({ cityIds: [...DEFAULT_CITY_IDS], mode: 'meeting', settings: { ...DEFAULT_SETTINGS } }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state) => ({ cityIds: state.cityIds, mode: state.mode, settings: state.settings }),
      // Drop anything that no longer resolves against the catalog so a stale payload can't break the UI.
      merge: (persisted, current) => {
        const raw = (persisted ?? {}) as Partial<Pick<AppState, 'cityIds' | 'mode' | 'settings'>>
        const cityIds = Array.isArray(raw.cityIds)
          ? [...new Set(raw.cityIds.filter((id): id is string => typeof id === 'string' && !!getCity(id)))]
          : current.cityIds
        return {
          ...current,
          cityIds,
          mode: raw.mode === 'base' ? 'base' : 'meeting',
          settings: {
            wakeHour: clampHour(Number(raw.settings?.wakeHour), DEFAULT_SETTINGS.wakeHour),
            sleepHour: clampHour(Number(raw.settings?.sleepHour), DEFAULT_SETTINGS.sleepHour),
            timeFormat: raw.settings?.timeFormat === '24h' ? '24h' : '12h',
          },
        }
      },
    },
  ),
)
