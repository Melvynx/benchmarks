import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_CITY_IDS, isCityId } from "@/data/cities";
import type { Mode } from "@/lib/schedule";
import type { TimeFormat } from "@/lib/time";

export interface Settings {
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
}

export interface PlannerData {
  /** Ordered city ids; the first one is the reference city. */
  cityIds: string[];
  mode: Mode;
  settings: Settings;
}

interface PlannerActions {
  addCity: (id: string) => void;
  removeCity: (id: string) => void;
  restoreDefaultCities: () => void;
  makeReference: (id: string) => void;
  setMode: (mode: Mode) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetSettings: () => void;
}

export type PlannerState = PlannerData & PlannerActions;

export const DEFAULT_SETTINGS: Settings = { wakeHour: 7, sleepHour: 23, timeFormat: "12h" };

export const DEFAULT_DATA: PlannerData = {
  cityIds: [...DEFAULT_CITY_IDS],
  mode: "meeting",
  settings: DEFAULT_SETTINGS,
};

export const STORAGE_KEY = "tz-overlap";

function toHour(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23 ? value : fallback;
}

function sanitizeSettings(raw: unknown): Settings {
  const settings = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Settings, unknown>>;
  return {
    wakeHour: toHour(settings.wakeHour, DEFAULT_SETTINGS.wakeHour),
    sleepHour: toHour(settings.sleepHour, DEFAULT_SETTINGS.sleepHour),
    timeFormat: settings.timeFormat === "24h" ? "24h" : "12h",
  };
}

/** Accepts anything read from storage and returns a valid, de-duplicated state. */
export function sanitize(raw: unknown): PlannerData {
  if (!raw || typeof raw !== "object") return DEFAULT_DATA;
  const data = raw as Partial<Record<keyof PlannerData, unknown>>;

  return {
    cityIds: Array.isArray(data.cityIds) ? [...new Set(data.cityIds.filter(isCityId))] : DEFAULT_DATA.cityIds,
    mode: data.mode === "base" ? "base" : "meeting",
    settings: sanitizeSettings(data.settings),
  };
}

export const usePlanner = create<PlannerState>()(
  persist(
    (set) => ({
      ...DEFAULT_DATA,

      addCity: (id) =>
        set((state) => (!isCityId(id) || state.cityIds.includes(id) ? state : { cityIds: [...state.cityIds, id] })),

      removeCity: (id) => set((state) => ({ cityIds: state.cityIds.filter((cityId) => cityId !== id) })),

      restoreDefaultCities: () => set({ cityIds: [...DEFAULT_CITY_IDS] }),

      makeReference: (id) =>
        set((state) =>
          state.cityIds.includes(id) && state.cityIds[0] !== id
            ? { cityIds: [id, ...state.cityIds.filter((cityId) => cityId !== id)] }
            : state,
        ),

      setMode: (mode) => set({ mode }),

      updateSettings: (patch) => set((state) => ({ settings: sanitizeSettings({ ...state.settings, ...patch }) })),

      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ cityIds, mode, settings }): PlannerData => ({ cityIds, mode, settings }),
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted) }),
    },
  ),
);
