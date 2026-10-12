import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { CITY_BY_ID } from '../domain/cities'
import type { Mode } from '../domain/schedule'
import { createDefaultState, DEFAULT_SETTINGS, sanitizeState, type PersistedState, type Settings } from './persisted'

interface Actions {
  addCity: (id: string) => void
  removeCity: (id: string) => void
  makeReference: (id: string) => void
  setMode: (mode: Mode) => void
  updateSettings: (patch: Partial<Settings>) => void
  resetSettings: () => void
}

export type AppState = PersistedState & Actions

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...createDefaultState(),

      addCity: (id) =>
        set((s) => (CITY_BY_ID.has(id) && !s.cityIds.includes(id) ? { cityIds: [...s.cityIds, id] } : s)),

      removeCity: (id) => set((s) => ({ cityIds: s.cityIds.filter((cityId) => cityId !== id) })),

      makeReference: (id) =>
        set((s) => (s.cityIds.includes(id) ? { cityIds: [id, ...s.cityIds.filter((cityId) => cityId !== id)] } : s)),

      setMode: (mode) => set({ mode }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetSettings: () => set({ settings: { ...DEFAULT_SETTINGS } }),
    }),
    {
      name: 'tz-overlap',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ cityIds, mode, settings }): PersistedState => ({ cityIds, mode, settings }),
      migrate: (persisted) => sanitizeState(persisted),
      merge: (persisted, current) => ({ ...current, ...sanitizeState(persisted) }),
    },
  ),
)

// Keep open tabs in sync; otherwise the last tab to write silently discards the others' changes.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === useAppStore.persist.getOptions().name && event.newValue) void useAppStore.persist.rehydrate()
  })
}
