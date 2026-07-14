export type PlannerMode = 'meeting' | 'base';
export type TimeFormat = '12h' | '24h';

export interface City {
  id: string;
  name: string;
  country: string;
  timeZone: string;
}

export interface PlannerState {
  cityIds: string[];
  mode: PlannerMode;
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
}

export interface LocalTime {
  hour: number;
  minute: number;
  minuteOfDay: number;
}

export interface HourRange {
  start: number;
  end: number;
}
