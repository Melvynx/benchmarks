import { getCityById } from "./cities";
import type { TimeFormat } from "./time";

export type Mode = "meeting" | "base";

export interface AppSettings {
  readonly wakeHour: number;
  readonly sleepHour: number;
  readonly timeFormat: TimeFormat;
}

export interface AppState {
  /** Ordered. Index 0 is the reference city. */
  readonly cityIds: readonly string[];
  readonly mode: Mode;
  readonly settings: AppSettings;
}

export const STORAGE_KEY = "timezone-overlap:v1";

export const DEFAULT_STATE: AppState = {
  cityIds: ["san-francisco", "denpasar", "geneva"],
  mode: "meeting",
  settings: { wakeHour: 7, sleepHour: 23, timeFormat: "12h" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHour(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 23;
}

function isKnownCityId(value: unknown): value is string {
  return typeof value === "string" && getCityById(value) !== undefined;
}

/**
 * Turns untrusted localStorage content into a valid AppState. Unknown cities and
 * duplicates are dropped and bad fields fall back to defaults. An intentionally
 * empty city list is preserved.
 */
export function parseAppState(raw: unknown): AppState {
  if (!isRecord(raw)) return DEFAULT_STATE;

  const cityIds = Array.isArray(raw.cityIds)
    ? [...new Set(raw.cityIds.filter(isKnownCityId))]
    : DEFAULT_STATE.cityIds;

  const mode: Mode = raw.mode === "base" || raw.mode === "meeting" ? raw.mode : DEFAULT_STATE.mode;

  const rawSettings = isRecord(raw.settings) ? raw.settings : {};
  const settings: AppSettings = {
    wakeHour: isHour(rawSettings.wakeHour) ? rawSettings.wakeHour : DEFAULT_STATE.settings.wakeHour,
    sleepHour: isHour(rawSettings.sleepHour) ? rawSettings.sleepHour : DEFAULT_STATE.settings.sleepHour,
    timeFormat:
      rawSettings.timeFormat === "12h" || rawSettings.timeFormat === "24h"
        ? rawSettings.timeFormat
        : DEFAULT_STATE.settings.timeFormat,
  };

  return { cityIds, mode, settings };
}

export function addCity(state: AppState, cityId: string): AppState {
  if (!getCityById(cityId) || state.cityIds.includes(cityId)) return state;
  return { ...state, cityIds: [...state.cityIds, cityId] };
}

export function removeCity(state: AppState, cityId: string): AppState {
  if (!state.cityIds.includes(cityId)) return state;
  return { ...state, cityIds: state.cityIds.filter((id) => id !== cityId) };
}

/** Moves a city to index 0, making it the reference. Other cities keep their order. */
export function promoteCity(state: AppState, cityId: string): AppState {
  if (state.cityIds[0] === cityId || !state.cityIds.includes(cityId)) return state;
  return { ...state, cityIds: [cityId, ...state.cityIds.filter((id) => id !== cityId)] };
}

export function setMode(state: AppState, mode: Mode): AppState {
  return state.mode === mode ? state : { ...state, mode };
}

export function updateSettings(state: AppState, patch: Partial<AppSettings>): AppState {
  return { ...state, settings: { ...state.settings, ...patch } };
}
