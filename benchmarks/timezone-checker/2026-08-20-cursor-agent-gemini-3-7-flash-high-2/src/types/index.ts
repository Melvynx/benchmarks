export interface City {
  id: string;
  name: string;
  country: string;
  region: 'North America' | 'South America' | 'Europe' | 'Africa' | 'Middle East' | 'Asia' | 'Oceania';
  timezone: string; // IANA timezone, e.g. "America/Los_Angeles"
  flag: string;     // Country code or emoji flag
}

export type AppMode = 'meeting' | 'base';
export type TimeFormat = '12h' | '24h';

export interface UserSettings {
  wakeHour: number;   // 0 - 23 (default: 7)
  sleepHour: number;  // 0 - 23 (default: 23)
  timeFormat: TimeFormat; // '12h' | '24h' (default: '12h')
}

export interface CityHourState {
  localHour: number;
  localMinute: number;
  dayOffset: number; // -1, 0, +1
  isAwake: boolean;
  isOverlap: boolean;
  formattedLocalTime: string;
  formattedShortTime: string;
}

export interface OverlapRange {
  startHour: number;
  endHour: number;
  formatted: string;
  hoursCount: number;
}
