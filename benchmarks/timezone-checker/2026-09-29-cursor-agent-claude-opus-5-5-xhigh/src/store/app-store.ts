import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_CITY_IDS, isKnownCity } from '../lib/cities';
import type { Mode } from '../lib/overlap';
import { type AppState, createDefaultState, sanitizeSettings, sanitizeState, type Settings } from './app-state';

interface AppActions {
  addCity: (id: string) => void;
  removeCity: (id: string) => void;
  insertCity: (id: string, index: number) => void;
  setReference: (id: string) => void;
  setMode: (mode: Mode) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  restoreDefaultCities: () => void;
  replaceState: (state: AppState) => void;
  reset: () => void;
}

export type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...createDefaultState(),

      addCity: (id) =>
        set((state) => (!isKnownCity(id) || state.cityIds.includes(id) ? state : { cityIds: [...state.cityIds, id] })),

      removeCity: (id) => set((state) => ({ cityIds: state.cityIds.filter((cityId) => cityId !== id) })),

      insertCity: (id, index) =>
        set((state) => {
          if (!isKnownCity(id) || state.cityIds.includes(id)) return state;
          const cityIds = [...state.cityIds];
          cityIds.splice(Math.max(0, Math.min(index, cityIds.length)), 0, id);
          return { cityIds };
        }),

      setReference: (id) =>
        set((state) =>
          state.cityIds.includes(id) ? { cityIds: [id, ...state.cityIds.filter((cityId) => cityId !== id)] } : state,
        ),

      setMode: (mode) => set({ mode }),

      updateSettings: (patch) => set((state) => ({ settings: sanitizeSettings({ ...state.settings, ...patch }) })),

      restoreDefaultCities: () => set({ cityIds: [...DEFAULT_CITY_IDS] }),

      replaceState: (next) => set(sanitizeState(next)),

      reset: () => set(createDefaultState()),
    }),
    {
      name: 'timezone-overlap',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ cityIds, mode, settings }): AppState => ({ cityIds, mode, settings }),
      merge: (persisted, current) => ({ ...current, ...sanitizeState(persisted) }),
    },
  ),
);

export function snapshotAppState(): AppState {
  const { cityIds, mode, settings } = useAppStore.getState();
  return { cityIds: [...cityIds], mode, settings: { ...settings } };
}
