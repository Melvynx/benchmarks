export type AppMode = 'meeting' | 'base';
export type TimeFormat = '12h' | '24h';

export interface City {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  timeZone: string;
}

export interface AppState {
  version: 1;
  cityIds: string[];
  mode: AppMode;
  wakeHour: number;
  sleepHour: number;
  timeFormat: TimeFormat;
}

export interface HourCell {
  referenceHour: number;
  localMinute: number;
  dayDelta: number;
  isAwake: boolean;
  isOverlap: boolean;
}

export interface CityTimeline {
  city: City;
  offsetMinutes: number;
  cells: HourCell[];
}

export interface TimeRange {
  startHour: number;
  endHour: number;
}

export interface ComparisonModel {
  referenceCity: City;
  timelines: CityTimeline[];
  meetingHours: number[];
  baseHoursByCityId: Record<string, number[]>;
}
