import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMode = 'meeting' | 'base';
export type TimeFormat = '12h' | '24h';

interface AppState {
  cities: string[]; // array of city IDs
  mode: AppMode;
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;

  // Actions
  addCity: (id: string) => void;
  removeCity: (id: string) => void;
  makeReference: (id: string) => void;
  setMode: (mode: AppMode) => void;
  setWakeHour: (hour: number) => void;
  setSleepHour: (hour: number) => void;
  setTimeFormat: (format: TimeFormat) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      cities: ['sf', 'dps', 'gva'],
      mode: 'meeting',
      wakeHour: 7,
      sleepHour: 23,
      timeFormat: '12h',

      addCity: (id) =>
        set((state) => ({
          cities: state.cities.includes(id) ? state.cities : [...state.cities, id],
        })),

      removeCity: (id) =>
        set((state) => ({
          cities: state.cities.filter((c) => c !== id),
        })),

      makeReference: (id) =>
        set((state) => {
          if (!state.cities.includes(id)) return state;
          const otherCities = state.cities.filter((c) => c !== id);
          return { cities: [id, ...otherCities] };
        }),

      setMode: (mode) => set({ mode }),
      setWakeHour: (wakeHour) => set({ wakeHour }),
      setSleepHour: (sleepHour) => set({ sleepHour }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
    }),
    {
      name: 'timezone-app-storage',
    }
  )
);
