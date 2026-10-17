export type AppMode = 'meeting' | 'base';
export type TimeFormat = '12h' | '24h';

export type WorldRegion =
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
  region: WorldRegion;
  timezone: string;
}

export interface AvailabilitySettings {
  wakeHour: number; // 0 - 23
  sleepHour: number; // 0 - 23
  timeFormat: TimeFormat;
}

export interface PersistedState {
  cityIds: string[];
  mode: AppMode;
  settings: AvailabilitySettings;
}

export type CellState = 'sleeping' | 'awake' | 'overlap';

export interface HourCellInfo {
  refHour: number; // 0 - 23 in reference city
  localHour: number; // 0 - 23 (floor hour in target city)
  localMinuteOffset: number; // 0, 15, 30, 45 for fractional timezones
  formattedLocal: string; // e.g. "9am" or "09:00" or "9:30a"
  formattedCompact: string; // compact label for tight grid cells
  dayDelta: number; // -1, 0, +1 relative to reference city day
  isAwake: boolean;
  state: CellState;
}

export interface TimeRange {
  startHour: number; // inclusive (0-23)
  endHour: number; // exclusive (1-24)
  formatted: string; // e.g. "9am — 12pm"
  hoursCount: number;
}

export interface CityOverlapSummary {
  city: City;
  totalHours: number;
  ranges: TimeRange[];
}
