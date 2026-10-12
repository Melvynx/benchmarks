export const REGIONS = [
  'North America',
  'South America',
  'Europe',
  'Africa',
  'Middle East',
  'Asia',
  'Oceania',
] as const;

export type Region = (typeof REGIONS)[number];

export type City = {
  id: string;
  name: string;
  country: string;
  region: Region;
  timeZone: string;
  aliases?: readonly string[];
};

export type Mode = 'meeting' | 'base';

export type TimeFormat = '12h' | '24h';

export type CellState = 'sleep' | 'awake' | 'overlap';

export type AppState = {
  cityIds: string[];
  mode: Mode;
  wake: number;
  sleep: number;
  format: TimeFormat;
};

export const DEFAULT_CITY_IDS = ['san-francisco', 'denpasar', 'geneva'] as const;

export const DEFAULT_STATE: AppState = {
  cityIds: [...DEFAULT_CITY_IDS],
  mode: 'meeting',
  wake: 7,
  sleep: 23,
  format: '12h',
};

export type RangeChip = {
  key: string;
  label: string;
  title: string;
};
