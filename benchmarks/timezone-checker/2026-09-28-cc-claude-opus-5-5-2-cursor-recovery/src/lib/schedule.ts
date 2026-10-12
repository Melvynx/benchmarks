import type { City } from "@/data/cities";
import { formatHour, MINUTES_PER_DAY, type TimeFormat } from "@/lib/time";

export type Mode = "meeting" | "base";

export interface AwakeWindow {
  /** Hour (0–23) the day starts. */
  wakeHour: number;
  /** Hour (0–23) the day ends; exclusive. Earlier than `wakeHour` means an overnight schedule. */
  sleepHour: number;
}

export type CellState = "sleeping" | "awake" | "overlap";

export interface HourCell {
  /** Column: hour of day in the reference city (0–23). */
  refHour: number;
  /** Local wall-clock time in this city, minutes since local midnight. */
  localMinutes: number;
  /** Calendar days relative to the reference city's day (−1, 0, +1). */
  dayOffset: number;
  /** True for the first cell of a new local day — where a date label belongs. */
  startsNewDay: boolean;
  state: CellState;
}

export interface CityRow {
  city: City;
  isReference: boolean;
  offsetMinutes: number;
  /** Offset relative to the reference city, in minutes. */
  diffMinutes: number;
  cells: HourCell[];
  /** Overlap hours (reference-city hours) that apply to this row. */
  overlapHours: number[];
}

export interface Schedule {
  rows: CityRow[];
  /** Hours (reference-city time) where every city is awake. Only meaningful in meeting mode. */
  meetingOverlap: number[];
}

export const HOURS: readonly number[] = Array.from({ length: 24 }, (_, hour) => hour);

/** Is someone with this window awake during local hour `hour`? Handles overnight windows. */
export function isAwake(hour: number, { wakeHour, sleepHour }: AwakeWindow): boolean {
  if (wakeHour === sleepHour) return true; // no sleep configured: awake around the clock
  if (wakeHour < sleepHour) return hour >= wakeHour && hour < sleepHour;
  return hour >= wakeHour || hour < sleepHour;
}

export function awakeHourCount(window: AwakeWindow): number {
  return HOURS.filter((hour) => isAwake(hour, window)).length;
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

interface LocalSlot {
  localMinutes: number;
  dayOffset: number;
  awake: boolean;
}

/** Local time in a city whose offset differs by `diffMinutes`, at `refHour` in the reference city. */
function localSlot(refHour: number, diffMinutes: number, window: AwakeWindow): LocalSlot {
  const absolute = refHour * 60 + diffMinutes;
  const localMinutes = mod(absolute, MINUTES_PER_DAY);
  return {
    localMinutes,
    dayOffset: Math.floor(absolute / MINUTES_PER_DAY),
    awake: isAwake(Math.floor(localMinutes / 60), window),
  };
}

export interface ScheduleInput {
  cities: readonly City[];
  /** UTC offset (minutes) per city id, derived from the current date. */
  offsets: ReadonlyMap<string, number>;
  window: AwakeWindow;
  mode: Mode;
}

/**
 * Builds the 24-column grid anchored on the first (reference) city.
 *
 * Meeting mode: an hour is overlap when every city is awake.
 * Base mode: each city overlaps only with the reference; the reference row
 * highlights hours shared with at least one other city.
 */
export function buildSchedule({ cities, offsets, window, mode }: ScheduleInput): Schedule {
  const [reference] = cities;
  if (!reference) return { rows: [], meetingOverlap: [] };

  const refOffset = offsets.get(reference.id) ?? 0;
  const slots = cities.map((city) => {
    const diff = (offsets.get(city.id) ?? 0) - refOffset;
    return HOURS.map((hour) => localSlot(hour, diff, window));
  });
  const awakeAt = (cityIndex: number, hour: number) => slots[cityIndex]?.[hour]?.awake ?? false;

  const comparable = cities.length >= 2;
  const meetingOverlap = comparable
    ? HOURS.filter((hour) => cities.every((_, index) => awakeAt(index, hour)))
    : [];

  const baseOverlap = cities.map((_, index) =>
    comparable && index > 0 ? HOURS.filter((hour) => awakeAt(0, hour) && awakeAt(index, hour)) : [],
  );
  const baseUnion = HOURS.filter((hour) => baseOverlap.some((hours) => hours.includes(hour)));

  const rows = cities.map((city, index): CityRow => {
    const offsetMinutes = offsets.get(city.id) ?? 0;
    const overlapHours = mode === "meeting" ? meetingOverlap : index === 0 ? baseUnion : (baseOverlap[index] ?? []);
    const overlapSet = new Set(overlapHours);
    const citySlots = slots[index] ?? [];

    const cells = citySlots.map((slot, hour): HourCell => {
      const previous = citySlots[hour - 1];
      return {
        refHour: hour,
        localMinutes: slot.localMinutes,
        dayOffset: slot.dayOffset,
        startsNewDay: previous ? previous.dayOffset !== slot.dayOffset : slot.localMinutes < 60,
        state: !slot.awake ? "sleeping" : overlapSet.has(hour) ? "overlap" : "awake",
      };
    });

    return {
      city,
      isReference: index === 0,
      offsetMinutes,
      diffMinutes: offsetMinutes - refOffset,
      cells,
      overlapHours,
    };
  });

  return { rows, meetingOverlap };
}

export interface HourRange {
  /** First hour, inclusive. */
  start: number;
  /** Hour the range ends, exclusive (wraps past midnight: 22 → 2). */
  end: number;
  length: number;
}

/**
 * Collapses a set of hours into contiguous ranges, treating the day as circular
 * so 22, 23, 0, 1 reads as a single "10pm — 2am" window.
 */
export function toRanges(hours: readonly number[]): HourRange[] {
  const set = new Set(hours.filter((hour) => hour >= 0 && hour < 24));
  if (set.size === 0) return [];
  if (set.size === 24) return [{ start: 0, end: 0, length: 24 }];

  // Start scanning right after a gap so a wrap-around run is never split.
  const firstGap = HOURS.find((hour) => !set.has(hour)) ?? 0;
  const ranges: HourRange[] = [];
  let current: HourRange | null = null;

  for (let step = 1; step <= 24; step++) {
    const hour = (firstGap + step) % 24;
    if (set.has(hour)) {
      if (current) {
        current.length += 1;
        current.end = (hour + 1) % 24;
      } else {
        current = { start: hour, end: (hour + 1) % 24, length: 1 };
      }
    } else if (current) {
      ranges.push(current);
      current = null;
    }
  }
  if (current) ranges.push(current);

  return ranges.sort((a, b) => a.start - b.start);
}

/** "9am — 12pm" (end exclusive), or "All day" for a full 24-hour window. */
export function formatHourRange(range: HourRange, format: TimeFormat): string {
  if (range.length === 24) return "All day";
  return `${formatHour(range.start, format)} — ${formatHour(range.end, format)}`;
}
