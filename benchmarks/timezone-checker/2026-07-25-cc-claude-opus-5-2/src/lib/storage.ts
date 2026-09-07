import { getCity } from "../data/cities";
import type { TimeFormat } from "./format";
import type { Mode } from "./schedule";

export type AppState = {
  cityIds: string[];
  wake: number;
  sleep: number;
  format: TimeFormat;
  mode: Mode;
};

export const DEFAULT_STATE: AppState = {
  cityIds: ["san-francisco", "denpasar", "geneva"],
  wake: 7,
  sleep: 23,
  format: "12h",
  mode: "meeting",
};

const STORAGE_KEY = "timezone-overlap:v1";

/**
 * Reads persisted state, repairing anything that no longer makes sense (cities
 * dropped from the catalog, out-of-range hours, a hand-edited payload). An
 * unreadable payload falls back to defaults; a merely empty city list does not,
 * since the user may have removed every city on purpose.
 */
export function loadState(): AppState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return DEFAULT_STATE;
  }
  if (!raw) return DEFAULT_STATE;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_STATE;
    const value = parsed as Partial<Record<keyof AppState, unknown>>;

    return {
      cityIds: sanitizeCityIds(value.cityIds),
      wake: sanitizeHour(value.wake, DEFAULT_STATE.wake),
      sleep: sanitizeHour(value.sleep, DEFAULT_STATE.sleep),
      format: value.format === "24h" || value.format === "12h" ? value.format : DEFAULT_STATE.format,
      mode: value.mode === "base" || value.mode === "meeting" ? value.mode : DEFAULT_STATE.mode,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing or a full quota — the app stays usable without persistence.
  }
}

function sanitizeCityIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_STATE.cityIds];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || seen.has(entry) || !getCity(entry)) continue;
    seen.add(entry);
    ids.push(entry);
  }
  return ids;
}

function sanitizeHour(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  const hour = Math.trunc(value);
  return hour >= 0 && hour <= 23 ? hour : fallback;
}
