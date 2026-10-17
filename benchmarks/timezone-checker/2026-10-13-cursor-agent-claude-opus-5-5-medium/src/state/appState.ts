import { DEFAULT_CITY_IDS, getCity } from "../lib/cities";
import type { Mode } from "../lib/schedule";
import type { TimeFormat } from "../lib/time";

export interface Settings {
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
}

export interface AppState {
  cityIds: string[];
  mode: Mode;
  settings: Settings;
}

export const DEFAULT_STATE: AppState = {
  cityIds: [...DEFAULT_CITY_IDS],
  mode: "meeting",
  settings: { wakeHour: 7, sleepHour: 23, timeFormat: "12h" },
};

const STORAGE_KEY = "tz-overlap/state/v1";

const isHour = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23;

function sanitize(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") return DEFAULT_STATE;
  const data = raw as Partial<Record<keyof AppState, unknown>>;
  const settings = (data.settings ?? {}) as Partial<Record<keyof Settings, unknown>>;

  const cityIds = Array.isArray(data.cityIds)
    ? [...new Set(data.cityIds.filter((id): id is string => typeof id === "string" && !!getCity(id)))]
    : DEFAULT_STATE.cityIds;

  return {
    cityIds,
    mode: data.mode === "base" || data.mode === "meeting" ? data.mode : DEFAULT_STATE.mode,
    settings: {
      wakeHour: isHour(settings.wakeHour) ? settings.wakeHour : DEFAULT_STATE.settings.wakeHour,
      sleepHour: isHour(settings.sleepHour) ? settings.sleepHour : DEFAULT_STATE.settings.sleepHour,
      timeFormat:
        settings.timeFormat === "12h" || settings.timeFormat === "24h"
          ? settings.timeFormat
          : DEFAULT_STATE.settings.timeFormat,
    },
  };
}

export function loadState(): AppState {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? sanitize(JSON.parse(stored)) : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (quota, privacy mode); the app keeps working in memory.
  }
}

export type Action =
  | { type: "addCity"; id: string }
  | { type: "removeCity"; id: string }
  | { type: "promoteCity"; id: string }
  | { type: "setMode"; mode: Mode }
  | { type: "updateSettings"; patch: Partial<Settings> }
  | { type: "reset" };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "addCity":
      if (state.cityIds.includes(action.id) || !getCity(action.id)) return state;
      return { ...state, cityIds: [...state.cityIds, action.id] };
    case "removeCity":
      return { ...state, cityIds: state.cityIds.filter((id) => id !== action.id) };
    case "promoteCity":
      if (state.cityIds[0] === action.id || !state.cityIds.includes(action.id)) return state;
      return { ...state, cityIds: [action.id, ...state.cityIds.filter((id) => id !== action.id)] };
    case "setMode":
      return { ...state, mode: action.mode };
    case "updateSettings":
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case "reset":
      return DEFAULT_STATE;
  }
}
