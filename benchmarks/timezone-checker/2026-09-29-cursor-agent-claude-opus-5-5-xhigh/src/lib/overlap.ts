import type { City } from './cities';
import { HOURS_PER_DAY, MINUTES_PER_DAY, MINUTES_PER_HOUR, mod } from './math';
import { getUtcOffsetMinutes, getZonedTime } from './time';

export type Mode = 'meeting' | 'base';

export interface AwakeWindow {
  wakeHour: number;
  sleepHour: number;
}

export type CellState = 'asleep' | 'awake' | 'overlap';

/** A span of reference-city hours. `length` may carry past midnight (e.g. 22 → 2am). */
export interface HourRange {
  start: number;
  length: number;
}

export interface GridCell {
  /** Column: hour of the reference city's day, 0–23. */
  refHour: number;
  /** Local wall-clock time in this city at that column, minutes since local midnight. */
  localMinutes: number;
  /** Local calendar day relative to the reference day: −1, 0 or +1. */
  dayShift: number;
  weekday: number;
  state: CellState;
}

export interface GridRow {
  city: City;
  isReference: boolean;
  offsetMinutes: number;
  /** Offset relative to the reference city. */
  diffMinutes: number;
  nowMinutes: number;
  nowWeekday: number;
  cells: GridCell[];
  /** Reference hours highlighted as overlap in this row. */
  overlapHours: number[];
  ranges: HourRange[];
}

export interface OverlapModel {
  mode: Mode;
  window: AwakeWindow;
  rows: GridRow[];
  reference: GridRow | undefined;
  /** True when there are at least two cities to compare. */
  isComparing: boolean;
  /** Hours when every city is awake (the Meeting-mode overlap). */
  sharedHours: number[];
  sharedRanges: HourRange[];
  referenceNowMinutes: number;
}

export const HOURS: readonly number[] = Array.from({ length: HOURS_PER_DAY }, (_, hour) => hour);

/** Wake == sleep is treated as "awake around the clock". Overnight windows wrap. */
export function isAwake(localHour: number, { wakeHour, sleepHour }: AwakeWindow): boolean {
  if (wakeHour === sleepHour) return true;
  return wakeHour < sleepHour
    ? localHour >= wakeHour && localHour < sleepHour
    : localHour >= wakeHour || localHour < sleepHour;
}

export function awakeHourCount({ wakeHour, sleepHour }: AwakeWindow): number {
  return wakeHour === sleepHour ? HOURS_PER_DAY : mod(sleepHour - wakeHour, HOURS_PER_DAY);
}

/**
 * Groups hours into ranges on a circular 24h clock, so 22, 23, 0, 1 becomes a
 * single 10pm — 2am window. Sorted by start hour.
 */
export function toRanges(hours: Iterable<number>): HourRange[] {
  const set = new Set(hours);
  if (set.size === 0) return [];
  if (set.size >= HOURS_PER_DAY) return [{ start: 0, length: HOURS_PER_DAY }];

  const ranges: HourRange[] = [];
  for (const hour of HOURS) {
    const startsRun = set.has(hour) && !set.has(mod(hour - 1, HOURS_PER_DAY));
    if (!startsRun) continue;
    let length = 1;
    while (set.has(mod(hour + length, HOURS_PER_DAY))) length += 1;
    ranges.push({ start: hour, length });
  }
  return ranges;
}

/** Like `toRanges`, but never wraps past the end of the grid. Used for drawing. */
export function contiguousRuns(hours: Iterable<number>): HourRange[] {
  const runs: HourRange[] = [];
  for (const hour of [...new Set(hours)].sort((a, b) => a - b)) {
    const last = runs.at(-1);
    if (last && last.start + last.length === hour) last.length += 1;
    else runs.push({ start: hour, length: 1 });
  }
  return runs;
}

/** Whether neighbouring cells share a state, so they render as one continuous band. */
export function joinsAt(cells: readonly GridCell[], index: number): { joinPrev: boolean; joinNext: boolean } {
  const state = cells[index].state;
  return {
    joinPrev: index > 0 && cells[index - 1].state === state,
    joinNext: index < cells.length - 1 && cells[index + 1].state === state,
  };
}

interface BuildInput {
  cities: readonly City[];
  mode: Mode;
  window: AwakeWindow;
  now: Date;
}

export function buildOverlapModel({ cities, mode, window, now }: BuildInput): OverlapModel {
  const [referenceCity] = cities;
  if (!referenceCity) {
    return { mode, window, rows: [], reference: undefined, isComparing: false, sharedHours: [], sharedRanges: [], referenceNowMinutes: 0 };
  }

  const referenceNow = getZonedTime(referenceCity.timeZone, now);
  const referenceOffset = getUtcOffsetMinutes(referenceCity.timeZone, now);

  const timelines = cities.map((city) => {
    const offsetMinutes = getUtcOffsetMinutes(city.timeZone, now);
    const diffMinutes = offsetMinutes - referenceOffset;
    const slots = HOURS.map((refHour) => {
      const total = refHour * MINUTES_PER_HOUR + diffMinutes;
      const dayShift = Math.floor(total / MINUTES_PER_DAY);
      const localMinutes = total - dayShift * MINUTES_PER_DAY;
      return {
        refHour,
        localMinutes,
        dayShift,
        weekday: mod(referenceNow.weekday + dayShift, 7),
        awake: isAwake(Math.floor(localMinutes / MINUTES_PER_HOUR), window),
      };
    });
    return { city, offsetMinutes, diffMinutes, slots };
  });

  const isComparing = timelines.length >= 2;
  const [reference] = timelines;
  const sharedHours = isComparing
    ? HOURS.filter((hour) => timelines.every((timeline) => timeline.slots[hour].awake))
    : [];

  const highlights: number[][] = timelines.map((timeline, index) => {
    if (!isComparing) return [];
    if (mode === 'meeting') return sharedHours;
    if (index === 0) return [];
    return HOURS.filter((hour) => reference.slots[hour].awake && timeline.slots[hour].awake);
  });

  // In Base mode the reference row lights up wherever it overlaps with at least one other city.
  if (mode === 'base' && isComparing) {
    const union = new Set(highlights.slice(1).flat());
    highlights[0] = HOURS.filter((hour) => union.has(hour));
  }

  const rows: GridRow[] = timelines.map((timeline, index) => {
    const highlighted = new Set(highlights[index]);
    const zoned = getZonedTime(timeline.city.timeZone, now);
    return {
      city: timeline.city,
      isReference: index === 0,
      offsetMinutes: timeline.offsetMinutes,
      diffMinutes: timeline.diffMinutes,
      nowMinutes: zoned.minutesOfDay,
      nowWeekday: zoned.weekday,
      cells: timeline.slots.map(({ awake, ...slot }) => ({
        ...slot,
        state: !awake ? 'asleep' : highlighted.has(slot.refHour) ? 'overlap' : 'awake',
      })),
      overlapHours: highlights[index],
      ranges: toRanges(highlights[index]),
    };
  });

  return {
    mode,
    window,
    rows,
    reference: rows[0],
    isComparing,
    sharedHours,
    sharedRanges: toRanges(sharedHours),
    referenceNowMinutes: referenceNow.minutesOfDay,
  };
}
