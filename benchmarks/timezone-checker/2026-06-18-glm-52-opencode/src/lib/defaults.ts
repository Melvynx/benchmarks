import type { AppState, City, Mode, Settings } from './types';
import { getCityById } from './timezones';

export const STORAGE_KEY = 'tz-overlap-state-v1';

export const DEFAULT_SETTINGS: Settings = {
  wake: 7,
  sleep: 23,
  format: '12h',
};

export const DEFAULT_MODE: Mode = 'meeting';

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva'];

export const DEFAULT_CITIES: City[] = DEFAULT_CITY_IDS
  .map((id) => getCityById(id))
  .filter((c): c is City => Boolean(c));

export const DEFAULT_STATE: AppState = {
  cities: DEFAULT_CITIES,
  settings: DEFAULT_SETTINGS,
  mode: DEFAULT_MODE,
};

export function sanitizeState(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') return DEFAULT_STATE;
  const obj = raw as Partial<AppState>;

  const cities = Array.isArray(obj.cities)
    ? obj.cities
        .map((c) => {
          if (!c || typeof c !== 'object') return null;
          const maybe = c as { id?: unknown };
          if (typeof maybe.id !== 'string') return null;
          return getCityById(maybe.id) ?? null;
        })
        .filter((c: City | null): c is City => Boolean(c))
    : DEFAULT_CITIES;

  // de-duplicate while preserving order
  const seen = new Set<string>();
  const deduped = cities.filter((c) =>
    seen.has(c.id) ? false : seen.add(c.id),
  );

  const settingsRaw = (obj.settings ?? {}) as Partial<Settings>;
  const settings: Settings = {
    wake: clampInt(settingsRaw.wake, 0, 23, DEFAULT_SETTINGS.wake),
    sleep: clampInt(settingsRaw.sleep, 0, 23, DEFAULT_SETTINGS.sleep),
    format: settingsRaw.format === '24h' ? '24h' : '12h',
  };

  const mode: Mode = obj.mode === 'base' ? 'base' : 'meeting';

  if (deduped.length === 0) return { ...DEFAULT_STATE, settings, mode };

  return { cities: deduped, settings, mode };
}

function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n);
  return Math.min(max, Math.max(min, rounded));
}
