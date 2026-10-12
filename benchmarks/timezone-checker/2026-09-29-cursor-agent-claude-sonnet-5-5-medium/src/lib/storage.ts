import { CITY_BY_ID, DEFAULT_CITY_IDS } from "./cities";
import type { Mode, Settings } from "./time";

export interface State {
  cityIds: string[];
  settings: Settings;
  mode: Mode;
}

const KEY = "tz-overlap-checker:v1";

export const DEFAULT_STATE: State = {
  cityIds: DEFAULT_CITY_IDS,
  settings: { wake: 7, sleep: 23, format: "12h" },
  mode: "meeting",
};

const hour = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 23 ? v : fallback;

export function loadState(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const p = JSON.parse(raw);
    const ids: string[] = Array.isArray(p.cityIds)
      ? [...new Set<string>(p.cityIds.filter((id: unknown): id is string => typeof id === "string" && CITY_BY_ID.has(id)))]
      : [];
    return {
      cityIds: ids.length ? ids : DEFAULT_STATE.cityIds,
      settings: {
        wake: hour(p.settings?.wake, 7),
        sleep: hour(p.settings?.sleep, 23),
        format: p.settings?.format === "24h" ? "24h" : "12h",
      },
      mode: p.mode === "base" ? "base" : "meeting",
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}
