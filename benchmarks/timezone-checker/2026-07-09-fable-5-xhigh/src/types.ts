export type Region =
  | 'North America'
  | 'South America'
  | 'Europe'
  | 'Africa'
  | 'Middle East'
  | 'Asia'
  | 'Oceania';

export interface City {
  id: string;
  name: string;
  country: string;
  region: Region;
  /** IANA timezone identifier, e.g. "Asia/Makassar". */
  timeZone: string;
}

export type Mode = 'meeting' | 'base';
export type TimeFormat = '12h' | '24h';

export interface AppState {
  /** Selected city ids; the first entry is always the reference city. */
  cityIds: string[];
  mode: Mode;
  /** Hour (0–23) the shared awake window starts. */
  wakeHour: number;
  /** Hour (0–23) the shared awake window ends (exclusive). May be before wakeHour for overnight windows. */
  sleepHour: number;
  timeFormat: TimeFormat;
}
