import { CITY_BY_ID } from "../lib/cities";
import { DEFAULT_STATE, type AppState } from "./appState";

const STORAGE_KEY = "tz-overlap:state:v1";

const isHour = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 23;

/** Reads persisted state, falling back field-by-field to defaults on anything malformed. */
export function loadState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const data = JSON.parse(raw) as Partial<AppState> | null;
    const settings: Partial<AppState["settings"]> = data?.settings ?? {};

    const cityIds = Array.isArray(data?.cityIds)
      ? [...new Set(data.cityIds.filter((id): id is string => typeof id === "string" && CITY_BY_ID.has(id)))]
      : DEFAULT_STATE.cityIds;

    return {
      cityIds,
      mode: data?.mode === "base" || data?.mode === "meeting" ? data.mode : DEFAULT_STATE.mode,
      settings: {
        wake: isHour(settings.wake) ? settings.wake : DEFAULT_STATE.settings.wake,
        sleep: isHour(settings.sleep) ? settings.sleep : DEFAULT_STATE.settings.sleep,
        timeFormat:
          settings.timeFormat === "12h" || settings.timeFormat === "24h"
            ? settings.timeFormat
            : DEFAULT_STATE.settings.timeFormat,
      },
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (quota, privacy mode); the app keeps working in memory.
  }
}
