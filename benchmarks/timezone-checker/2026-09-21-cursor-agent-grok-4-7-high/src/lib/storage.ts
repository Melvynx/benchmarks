import { CITY_MAP, DEFAULT_CITY_IDS } from "../data/cities";
import type { AppState, Mode, TimeFormat } from "../types";

export const STORAGE_KEY = "tz-board-v1";

export const DEFAULT_STATE: AppState = {
  cityIds: [...DEFAULT_CITY_IDS],
  mode: "meeting",
  wake: 7,
  sleep: 23,
  format: "12",
};

function clampHour(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23
    ? value
    : fallback;
}

function sanitizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_STATE.cityIds];
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string" || seen.has(entry) || !CITY_MAP.has(entry)) continue;
    seen.add(entry);
    ids.push(entry);
  }
  if (ids.length === 0 && value.length > 0) return [...DEFAULT_STATE.cityIds];
  return ids;
}

export function sanitizeState(raw: unknown): AppState {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE, cityIds: [...DEFAULT_STATE.cityIds] };
  const input = raw as Partial<AppState>;
  const mode: Mode = input.mode === "base" || input.mode === "meeting" ? input.mode : "meeting";
  const format: TimeFormat = input.format === "24" || input.format === "12" ? input.format : "12";
  return {
    cityIds: sanitizeIds(input.cityIds),
    mode,
    wake: clampHour(input.wake, DEFAULT_STATE.wake),
    sleep: clampHour(input.sleep, DEFAULT_STATE.sleep),
    format,
  };
}

export function readState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE, cityIds: [...DEFAULT_STATE.cityIds] };
    return sanitizeState(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_STATE, cityIds: [...DEFAULT_STATE.cityIds] };
  }
}

export function writeState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode can reject storage; the board still works for the session.
  }
}
