export type Mode = "meeting" | "base";
export type TimeFormat = "12h" | "24h";

export interface AwakeSettings {
  wakeHour: number;
  sleepHour: number;
  format: TimeFormat;
}

export interface HourRange {
  /** inclusive start hour, 0-24 */
  start: number;
  /** exclusive end hour, 0-24 (24 means through midnight) */
  end: number;
}

export type CellState = "sleeping" | "awake" | "overlap";

export interface CityComputed {
  id: string;
  name: string;
  country: string;
  timezone: string;
  isReference: boolean;
  offsetMinutes: number;
  /** Local hour (0-24, fractional) for each of the 24 reference-city columns. */
  localHours: number[];
  awakeFlags: boolean[];
  cellStates: CellState[];
  overlapFlags: boolean[];
  overlapCount: number;
  overlapRanges: HourRange[];
}
