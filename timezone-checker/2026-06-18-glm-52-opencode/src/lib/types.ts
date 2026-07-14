export type Mode = 'meeting' | 'base';

export type TimeFormat = '12h' | '24h';

export interface City {
  id: string;
  name: string;
  country: string;
  tz: string;
  region: string;
}

export interface Settings {
  wake: number;
  sleep: number;
  format: TimeFormat;
}

export interface AppState {
  cities: City[];
  settings: Settings;
  mode: Mode;
}
