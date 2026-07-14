import type { City } from "../data/cities";
import { getOffsetMinutes } from "./timezone";

export const HOURS = Array.from({ length: 24 }, (_, i) => i);

/** Is `hour` (0-23) inside the awake window? Overnight windows are supported. */
export function isAwake(hour: number, wake: number, sleep: number): boolean {
  if (wake === sleep) return true; // full 24h
  if (wake < sleep) return hour >= wake && hour < sleep;
  return hour >= wake || hour < sleep; // overnight (e.g. 22 -> 6)
}

export interface Cell {
  /** Hour 0-23 in the reference city. */
  refHour: number;
  /** Local clock hour in this city when the reference shows refHour:00. */
  localHour: number;
  /** Local minutes (0/30/45 for fractional offsets). */
  localMinute: number;
  awake: boolean;
  /** Highlighted as overlap given the active mode. */
  overlap: boolean;
}

export interface CityComputed {
  city: City;
  isReference: boolean;
  offsetMinutes: number;
  cells: Cell[];
}

export interface Range {
  /** Inclusive start hour (ref tz). */
  start: number;
  /** Exclusive end hour (ref tz), 1-24. */
  end: number;
}

export interface CitySummary {
  cityId: string;
  cityName: string;
  hours: number;
  ranges: Range[];
}

export interface Computation {
  cities: CityComputed[];
  /** Meeting mode: the single shared overlap across everyone. */
  meeting: { hours: number; ranges: Range[] };
  /** Base mode: one entry per non-reference city. */
  base: CitySummary[];
}

export type Mode = "meeting" | "base";

interface Settings {
  wake: number;
  sleep: number;
  mode: Mode;
}

/**
 * Group a set of reference hours into contiguous ranges, merging across midnight
 * (e.g. {22,23,0,1} -> 22→2) but never collapsing a full 24h day.
 */
export function hoursToRanges(hourSet: Set<number>): Range[] {
  const sorted = [...hourSet].sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  if (sorted.length === 24) return [{ start: 0, end: 24 }];

  const ranges: Range[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const h = sorted[i];
    if (h === prev + 1) {
      prev = h;
    } else {
      ranges.push({ start, end: prev + 1 });
      start = h;
      prev = h;
    }
  }
  ranges.push({ start, end: prev + 1 });

  // Merge a midnight-wrapping pair: last range ends at 24 and first starts at 0.
  if (ranges.length > 1) {
    const first = ranges[0];
    const last = ranges[ranges.length - 1];
    if (first.start === 0 && last.end === 24) {
      ranges.pop();
      ranges.shift();
      ranges.push({ start: last.start, end: first.end + 24 });
    }
  }
  return ranges;
}

export function compute(
  orderedCities: City[],
  at: Date,
  { wake, sleep, mode }: Settings,
): Computation {
  const offsets = orderedCities.map((c) => getOffsetMinutes(c.timezone, at));
  const refOffset = offsets[0] ?? 0;

  // Per-city, per-hour awake table (computed once, reused for overlap + grid).
  const awakeTable: boolean[][] = orderedCities.map((_, ci) => {
    const delta = offsets[ci] - refOffset;
    return HOURS.map((h) => {
      const total = (((h * 60 + delta) % 1440) + 1440) % 1440;
      return isAwake(Math.floor(total / 60), wake, sleep);
    });
  });

  // Meeting overlap: hours where every city is awake.
  const meetingHours = new Set<number>();
  for (const h of HOURS) {
    if (orderedCities.every((_, ci) => awakeTable[ci][h])) meetingHours.add(h);
  }

  // Base overlap: per non-ref city, hours where ref AND that city are awake.
  const baseHourSets = orderedCities.map((_, ci) => {
    const set = new Set<number>();
    if (ci === 0) return set;
    for (const h of HOURS) {
      if (awakeTable[0][h] && awakeTable[ci][h]) set.add(h);
    }
    return set;
  });
  // Reference row in base mode: highlight hours where the base can meet anyone.
  const baseRefSet = new Set<number>();
  for (const h of HOURS) {
    if (awakeTable[0][h] && orderedCities.some((_, ci) => ci !== 0 && awakeTable[ci][h])) {
      baseRefSet.add(h);
    }
  }

  const cities: CityComputed[] = orderedCities.map((city, ci) => {
    const delta = offsets[ci] - refOffset;
    const cells: Cell[] = HOURS.map((h) => {
      const total = (((h * 60 + delta) % 1440) + 1440) % 1440;
      const localHour = Math.floor(total / 60);
      const localMinute = total % 60;
      const awake = awakeTable[ci][h];
      let overlap: boolean;
      if (mode === "meeting") {
        overlap = meetingHours.has(h);
      } else if (ci === 0) {
        overlap = baseRefSet.has(h);
      } else {
        overlap = baseHourSets[ci].has(h);
      }
      return { refHour: h, localHour, localMinute, awake, overlap };
    });
    return { city, isReference: ci === 0, offsetMinutes: offsets[ci], cells };
  });

  const base: CitySummary[] = orderedCities
    .map((city, ci) => ({ city, ci }))
    .filter(({ ci }) => ci !== 0)
    .map(({ city, ci }) => ({
      cityId: city.id,
      cityName: city.name,
      hours: baseHourSets[ci].size,
      ranges: hoursToRanges(baseHourSets[ci]),
    }));

  return {
    cities,
    meeting: { hours: meetingHours.size, ranges: hoursToRanges(meetingHours) },
    base,
  };
}
