import { DateTime } from "luxon";
import type { HourRange, TimeFormat } from "./types";

const HOURS_IN_DAY = 24;

/** Current UTC offset (minutes) for an IANA timezone. DST-aware since it's resolved for "now". */
export function getUtcOffsetMinutes(timezone: string): number {
  return DateTime.now().setZone(timezone).offset;
}

export function formatUtcOffset(minutes: number): string {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? ":" + String(m).padStart(2, "0") : ""}`;
}

function roundToMinute(hour: number): number {
  return Math.round(hour * 60) / 60;
}

/**
 * What's the local hour (0-24, fractional for half/quarter-hour zones) in a city
 * when it's `columnHour` in the reference city, given both UTC offsets in minutes.
 */
export function localHourForColumn(
  columnHour: number,
  cityOffsetMin: number,
  refOffsetMin: number,
): number {
  const diffHours = (cityOffsetMin - refOffsetMin) / 60;
  const raw = columnHour + diffHours;
  const wrapped = ((raw % HOURS_IN_DAY) + HOURS_IN_DAY) % HOURS_IN_DAY;
  return roundToMinute(wrapped);
}

/** All 24 local hours (one per reference-city column) for a city. */
export function computeLocalHours(cityOffsetMin: number, refOffsetMin: number): number[] {
  return Array.from({ length: HOURS_IN_DAY }, (_, h) =>
    localHourForColumn(h, cityOffsetMin, refOffsetMin),
  );
}

/** Is `hour` (0-24, fractional) inside the [wake, sleep) awake window? Handles overnight wrap. */
export function isAwake(hour: number, wakeHour: number, sleepHour: number): boolean {
  if (wakeHour < sleepHour) {
    return hour >= wakeHour && hour < sleepHour;
  }
  return hour >= wakeHour || hour < sleepHour;
}

export function computeAwakeFlags(
  cityOffsetMin: number,
  refOffsetMin: number,
  wakeHour: number,
  sleepHour: number,
): boolean[] {
  return computeLocalHours(cityOffsetMin, refOffsetMin).map((hour) =>
    isAwake(hour, wakeHour, sleepHour),
  );
}

/** Meeting mode: an hour counts only if every city is awake at that hour. */
export function computeMeetingOverlap(allAwakeFlags: boolean[][]): boolean[] {
  if (allAwakeFlags.length === 0) return Array(HOURS_IN_DAY).fill(false);
  return Array.from({ length: HOURS_IN_DAY }, (_, h) => allAwakeFlags.every((flags) => flags[h]));
}

/** Base mode: an hour counts if both the reference city and this city are awake. */
export function computeBaseOverlap(refAwakeFlags: boolean[], cityAwakeFlags: boolean[]): boolean[] {
  return Array.from({ length: HOURS_IN_DAY }, (_, h) => refAwakeFlags[h] && cityAwakeFlags[h]);
}

export function countTrue(flags: boolean[]): number {
  return flags.reduce((sum, f) => sum + (f ? 1 : 0), 0);
}

/** Merge a 24-length boolean array into contiguous [start, end) ranges (no wraparound). */
export function mergeRanges(flags: boolean[]): HourRange[] {
  const ranges: HourRange[] = [];
  let start: number | null = null;
  for (let h = 0; h < flags.length; h++) {
    if (flags[h] && start === null) {
      start = h;
    } else if (!flags[h] && start !== null) {
      ranges.push({ start, end: h });
      start = null;
    }
  }
  if (start !== null) ranges.push({ start, end: flags.length });
  return ranges;
}

/** Format a fractional hour (0-24) as a display label, e.g. "9am", "9:30am", "09:00". */
export function formatHourLabel(hour: number, format: TimeFormat): string {
  const wrapped = ((hour % 24) + 24) % 24;
  let hh = Math.floor(wrapped);
  let mm = Math.round((wrapped - hh) * 60);
  if (mm === 60) {
    mm = 0;
    hh = (hh + 1) % 24;
  }
  if (format === "24h") {
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  const period = hh < 12 ? "am" : "pm";
  const displayHour = hh % 12 === 0 ? 12 : hh % 12;
  return mm === 0 ? `${displayHour}${period}` : `${displayHour}:${String(mm).padStart(2, "0")}${period}`;
}

export function formatRangeLabel(range: HourRange, format: TimeFormat): string {
  return `${formatHourLabel(range.start, format)} – ${formatHourLabel(range.end, format)}`;
}
