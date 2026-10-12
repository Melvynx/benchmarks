import { DEFAULT_CITY_IDS, isKnownCity } from '../lib/cities';
import type { TimeFormat } from '../lib/format';
import type { Mode } from '../lib/overlap';

export interface Settings {
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
}

export interface AppState {
  /** Ordered list; the first city is the reference. */
  cityIds: string[];
  mode: Mode;
  settings: Settings;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = { wakeHour: 7, sleepHour: 23, timeFormat: '12h' };

export function createDefaultState(): AppState {
  return { cityIds: [...DEFAULT_CITY_IDS], mode: 'meeting', settings: { ...DEFAULT_SETTINGS } };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toHour = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23 ? value : fallback;

export function sanitizeSettings(input: unknown): Settings {
  const source = isRecord(input) ? input : {};
  return {
    wakeHour: toHour(source.wakeHour, DEFAULT_SETTINGS.wakeHour),
    sleepHour: toHour(source.sleepHour, DEFAULT_SETTINGS.sleepHour),
    timeFormat: source.timeFormat === '24h' || source.timeFormat === '12h' ? source.timeFormat : DEFAULT_SETTINGS.timeFormat,
  };
}

/** Accepts anything read back from storage and returns a valid state. */
export function sanitizeState(input: unknown): AppState {
  const defaults = createDefaultState();
  if (!isRecord(input)) return defaults;

  return {
    cityIds: Array.isArray(input.cityIds) ? [...new Set(input.cityIds.filter(isKnownCity))] : defaults.cityIds,
    mode: input.mode === 'meeting' || input.mode === 'base' ? input.mode : defaults.mode,
    settings: sanitizeSettings(input.settings),
  };
}
