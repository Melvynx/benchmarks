import type { City, Mode, Settings } from "../types";
import { HOURS, MINUTES_PER_DAY, getOffsetMinutes, getZonedParts, isHourAwake, mod } from "./time";

export type CellState = "sleeping" | "awake" | "overlap";

export interface Cell {
  refHour: number;
  /** Local minute-of-day (0–1439) at the start of this reference hour. */
  localMinute: number;
  /** Local calendar-day shift relative to the reference city's day. */
  dayShift: number;
  weekday: string;
  isLocalMidnight: boolean;
  state: CellState;
}

export interface Row {
  city: City;
  offset: number;
  isReference: boolean;
  localNowMinute: number;
  overlapCount: number;
  cells: Cell[];
}

/** Hour range in reference time: start inclusive, end exclusive (end may be ≥ 24 when wrapping midnight). */
export interface HourRange {
  start: number;
  end: number;
}

export interface OverlapEntry {
  city: City;
  offset: number;
  hours: number;
  ranges: HourRange[];
}

export type Summary =
  | { kind: "meeting"; hours: number; ranges: HourRange[] }
  | { kind: "base"; reference: City; entries: OverlapEntry[] };

export interface GridModel {
  rows: Row[];
  summary: Summary | null;
  refNowHour: number | null;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Collapses a 24-slot boolean mask into contiguous ranges. Runs touching both
 * ends of the day are merged (e.g. 22–24 + 0–2 → 22–26) since they are one
 * continuous window in real time.
 */
export function toRanges(mask: readonly boolean[]): HourRange[] {
  const ranges: HourRange[] = [];
  let start: number | null = null;
  mask.forEach((on, hour) => {
    if (on && start === null) start = hour;
    if (!on && start !== null) {
      ranges.push({ start, end: hour });
      start = null;
    }
  });
  if (start !== null) ranges.push({ start, end: mask.length });

  if (ranges.length > 1) {
    const first = ranges[0]!;
    const last = ranges[ranges.length - 1]!;
    if (first.start === 0 && last.end === mask.length) {
      ranges.pop();
      ranges[0] = { start: last.start, end: mask.length + first.end };
    }
  }
  return ranges;
}

const count = (mask: readonly boolean[]) => mask.filter(Boolean).length;

export function buildGrid(cities: readonly City[], settings: Settings, mode: Mode, now: Date): GridModel {
  const reference = cities[0];
  if (!reference) return { rows: [], summary: null, refNowHour: null };

  const offsets = cities.map((city) => getOffsetMinutes(city.timeZone, now));
  const refOffset = offsets[0]!;
  const refNow = getZonedParts(reference.timeZone, now);
  const refMidnightUtc = Date.UTC(refNow.year, refNow.month - 1, refNow.day) - refOffset * 60_000;
  const utcNowMinute = mod(Math.floor(now.getTime() / 60_000), MINUTES_PER_DAY);

  const rawLocal = cities.map((_, i) => HOURS.map((hour) => hour * 60 - refOffset + offsets[i]!));
  const awake = rawLocal.map((minutes) => minutes.map((m) => isHourAwake(mod(m, MINUTES_PER_DAY), settings)));

  let overlap: boolean[][];
  let summary: Summary | null = null;

  if (cities.length < 2) {
    overlap = awake.map((mask) => mask.map(() => false));
  } else if (mode === "meeting") {
    const common = HOURS.map((hour) => awake.every((mask) => mask[hour]));
    overlap = cities.map(() => common);
    summary = { kind: "meeting", hours: count(common), ranges: toRanges(common) };
  } else {
    const refAwake = awake[0]!;
    const perCity = awake.map((mask) => HOURS.map((hour) => refAwake[hour]! && mask[hour]!));
    const union = HOURS.map((hour) => perCity.slice(1).some((mask) => mask[hour]));
    overlap = [union, ...perCity.slice(1)];
    summary = {
      kind: "base",
      reference,
      entries: cities.slice(1).map((city, index) => {
        const mask = perCity[index + 1]!;
        return { city, offset: offsets[index + 1]!, hours: count(mask), ranges: toRanges(mask) };
      }),
    };
  }

  const rows: Row[] = cities.map((city, i) => {
    const cells: Cell[] = HOURS.map((hour) => {
      const raw = rawLocal[i]![hour]!;
      const localMinute = mod(raw, MINUTES_PER_DAY);
      const instant = refMidnightUtc + hour * 3_600_000 + offsets[i]! * 60_000;
      return {
        refHour: hour,
        localMinute,
        dayShift: Math.floor(raw / MINUTES_PER_DAY),
        weekday: WEEKDAYS[new Date(instant).getUTCDay()]!,
        isLocalMidnight: localMinute < 60,
        state: overlap[i]![hour] ? "overlap" : awake[i]![hour] ? "awake" : "sleeping",
      };
    });
    return {
      city,
      offset: offsets[i]!,
      isReference: i === 0,
      localNowMinute: mod(utcNowMinute + offsets[i]!, MINUTES_PER_DAY),
      overlapCount: count(overlap[i]!),
      cells,
    };
  });

  return { rows, summary, refNowHour: Math.floor(mod(utcNowMinute + refOffset, MINUTES_PER_DAY) / 60) };
}
