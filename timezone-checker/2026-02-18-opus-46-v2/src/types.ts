export interface City {
  name: string;
  country: string;
  timezone: string;
}

export interface TimezoneRow {
  id: string;
  city: City;
  isPrimary: boolean;
}

export interface Settings {
  timeFormat: '12h' | '24h';
  workStart: number;
  workEnd: number;
  wakeStart: number;
  wakeEnd: number;
}

export type CellType = 'night' | 'day' | 'wake' | 'overlap' | 'no-overlap';
