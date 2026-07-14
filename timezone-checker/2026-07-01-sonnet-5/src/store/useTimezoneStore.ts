import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_CITY_IDS } from "../lib/cities";
import type { AwakeSettings, Mode } from "../lib/types";

const DEFAULT_SETTINGS: AwakeSettings = {
  wakeHour: 7,
  sleepHour: 23,
  format: "12h",
};

interface TimezoneStore {
  cityIds: string[];
  mode: Mode;
  settings: AwakeSettings;
  addCity: (id: string) => void;
  removeCity: (id: string) => void;
  promoteToReference: (id: string) => void;
  setMode: (mode: Mode) => void;
  updateSettings: (patch: Partial<AwakeSettings>) => void;
}

export const useTimezoneStore = create<TimezoneStore>()(
  persist(
    (set) => ({
      cityIds: DEFAULT_CITY_IDS,
      mode: "meeting",
      settings: DEFAULT_SETTINGS,

      addCity: (id) =>
        set((state) => (state.cityIds.includes(id) ? state : { cityIds: [...state.cityIds, id] })),

      removeCity: (id) =>
        set((state) => ({ cityIds: state.cityIds.filter((cityId) => cityId !== id) })),

      promoteToReference: (id) =>
        set((state) => {
          if (!state.cityIds.includes(id) || state.cityIds[0] === id) return state;
          return { cityIds: [id, ...state.cityIds.filter((cityId) => cityId !== id)] };
        }),

      setMode: (mode) => set({ mode }),

      updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),
    }),
    { name: "timezone-checker-state" },
  ),
);
