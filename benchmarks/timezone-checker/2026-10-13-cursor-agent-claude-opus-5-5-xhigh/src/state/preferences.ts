import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getCity } from "@/lib/cities";
import type { TimeFormat } from "@/lib/format";
import type { Mode } from "@/lib/overlap";
import { DEFAULT_PREFERENCES, type Preferences, sanitizePreferences } from "./preferences-schema";

interface PreferenceActions {
  addCity: (id: string) => void;
  removeCity: (id: string) => void;
  setReference: (id: string) => void;
  setMode: (mode: Mode) => void;
  setWakeHour: (hour: number) => void;
  setSleepHour: (hour: number) => void;
  setTimeFormat: (format: TimeFormat) => void;
  reset: () => void;
}

export const STORAGE_KEY = "tz-overlap:preferences";

export const usePreferences = create<Preferences & PreferenceActions>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,

      addCity: (id) =>
        set((state) =>
          getCity(id) && !state.cityIds.includes(id) ? { cityIds: [...state.cityIds, id] } : state,
        ),
      removeCity: (id) => set((state) => ({ cityIds: state.cityIds.filter((cityId) => cityId !== id) })),
      setReference: (id) =>
        set((state) =>
          state.cityIds.includes(id) ? { cityIds: [id, ...state.cityIds.filter((cityId) => cityId !== id)] } : state,
        ),
      setMode: (mode) => set({ mode }),
      setWakeHour: (wakeHour) => set({ wakeHour }),
      setSleepHour: (sleepHour) => set({ sleepHour }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      reset: () => set({ ...DEFAULT_PREFERENCES, cityIds: [...DEFAULT_PREFERENCES.cityIds] }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ cityIds, mode, wakeHour, sleepHour, timeFormat }): Preferences => ({
        cityIds,
        mode,
        wakeHour,
        sleepHour,
        timeFormat,
      }),
      merge: (persisted, current) => ({ ...current, ...sanitizePreferences(persisted) }),
    },
  ),
);

/** Keeps several open tabs in sync. */
export function syncPreferencesAcrossTabs(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) void usePreferences.persist.rehydrate();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
