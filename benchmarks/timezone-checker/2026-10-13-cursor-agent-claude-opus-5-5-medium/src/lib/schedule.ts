import type { City } from "./cities";
import { MINUTES_PER_DAY, mod } from "./time";

export type Mode = "meeting" | "base";
export type CellStatus = "asleep" | "awake" | "overlap";

export const HOURS = Array.from({ length: 24 }, (_, h) => h);

export interface AwakeWindow {
  wakeHour: number;
  sleepHour: number;
}

export interface ScheduleInput extends AwakeWindow {
  mode: Mode;
  /** First entry is the reference city. */
  cities: readonly { city: City; offsetMinutes: number }[];
}

export interface Cell {
  /** Column hour in the reference city's day (0–23). */
  refHour: number;
  /** Local time of day in this city, in minutes (0–1439). */
  localMinutes: number;
  /** Local calendar day relative to the reference city's day (-1, 0, +1). */
  dayShift: number;
  /** True for the cell where the local day rolls over to a new date. */
  isNewDay: boolean;
  status: CellStatus;
}

export interface HourRange {
  /** Inclusive start hour in the reference timezone. */
  start: number;
  /** Exclusive end hour in the reference timezone (wraps past midnight). */
  end: number;
  length: number;
}

export interface Overlap {
  hours: boolean[];
  total: number;
  ranges: HourRange[];
}

export interface ScheduleRow {
  city: City;
  offsetMinutes: number;
  isReference: boolean;
  cells: Cell[];
  /** Base mode: overlap of this city against the reference. Null for the reference itself. */
  baseOverlap: Overlap | null;
}

export interface Schedule {
  rows: ScheduleRow[];
  /** Hours where every city is awake. Only meaningful with 2+ cities. */
  meeting: Overlap;
  canCompare: boolean;
}

export function isAwake(localMinutes: number, { wakeHour, sleepHour }: AwakeWindow): boolean {
  const wake = wakeHour * 60;
  const sleep = sleepHour * 60;
  const m = mod(localMinutes, MINUTES_PER_DAY);
  if (wake === sleep) return true;
  if (wake < sleep) return m >= wake && m < sleep;
  return m >= wake || m < sleep;
}

export function awakeHoursPerDay({ wakeHour, sleepHour }: AwakeWindow): number {
  return wakeHour === sleepHour ? 24 : mod(sleepHour - wakeHour, 24);
}

/**
 * Groups flagged hours into contiguous ranges. A run that touches both 23 and 0
 * is merged into a single range crossing midnight.
 */
export function toRanges(hours: readonly boolean[]): HourRange[] {
  const total = hours.filter(Boolean).length;
  if (total === 0) return [];
  if (total === 24) return [{ start: 0, end: 0, length: 24 }];

  const firstGap = hours.findIndex((on) => !on);
  const ranges: HourRange[] = [];
  let start: number | null = null;
  for (let i = 1; i <= 24; i++) {
    const h = (firstGap + i) % 24;
    if (hours[h]) {
      start ??= h;
    } else if (start !== null) {
      ranges.push({ start, end: h, length: mod(h - start, 24) });
      start = null;
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

function makeOverlap(hours: boolean[]): Overlap {
  return { hours, total: hours.filter(Boolean).length, ranges: toRanges(hours) };
}

export function buildSchedule({ cities, mode, wakeHour, sleepHour }: ScheduleInput): Schedule {
  const window = { wakeHour, sleepHour };
  const reference = cities[0];
  const canCompare = cities.length >= 2;

  if (!reference) {
    return { rows: [], meeting: makeOverlap(HOURS.map(() => false)), canCompare };
  }

  const timeline = cities.map(({ offsetMinutes }) =>
    HOURS.map((refHour) => {
      const absolute = refHour * 60 - reference.offsetMinutes + offsetMinutes;
      const localMinutes = mod(absolute, MINUTES_PER_DAY);
      return {
        localMinutes,
        dayShift: Math.floor(absolute / MINUTES_PER_DAY),
        awake: isAwake(localMinutes, window),
      };
    }),
  );

  const awakeAt = (row: number, hour: number) => timeline[row]?.[hour]?.awake ?? false;
  const otherRows = cities.map((_, i) => i).slice(1);

  const meeting = makeOverlap(
    HOURS.map((h) => canCompare && timeline.every((_, row) => awakeAt(row, h))),
  );
  const baseOverlaps = cities.map((_, row) =>
    row === 0 ? null : makeOverlap(HOURS.map((h) => awakeAt(0, h) && awakeAt(row, h))),
  );

  const isOverlap = (row: number, hour: number): boolean => {
    if (!canCompare) return false;
    if (mode === "meeting") return meeting.hours[hour] ?? false;
    if (row === 0) return otherRows.some((other) => baseOverlaps[other]?.hours[hour]);
    return baseOverlaps[row]?.hours[hour] ?? false;
  };

  const rows = cities.map(({ city, offsetMinutes }, row) => ({
    city,
    offsetMinutes,
    isReference: row === 0,
    baseOverlap: baseOverlaps[row] ?? null,
    cells: (timeline[row] ?? []).map((slot, refHour): Cell => {
      const prev = timeline[row]?.[refHour - 1];
      return {
        refHour,
        localMinutes: slot.localMinutes,
        dayShift: slot.dayShift,
        isNewDay: prev ? prev.dayShift !== slot.dayShift : slot.localMinutes < 60,
        status: !slot.awake ? "asleep" : isOverlap(row, refHour) ? "overlap" : "awake",
      };
    }),
  }));

  return { rows, meeting, canCompare };
}
