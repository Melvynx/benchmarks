import { DateTime } from "luxon";
import type { City } from "../data/cities";

export type AppMode = "meeting" | "base";

export interface CellState {
  localHour: number;
  localMinute: number;
  awake: boolean;
  overlap: boolean;
}

export interface HourColumn {
  refHour: number;
  instant: DateTime;
  cells: Map<string, CellState>;
}

export interface OverlapRange {
  start: number;
  end: number;
}

/** Wall-clock offset label for `timezone` at `instant` (DST-aware). */
export function formatUtcOffset(instant: DateTime, timezone: string): string {
  const z = instant.setZone(timezone);
  const off = z.offset;
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(m).padStart(2, "0")}`;
}

export function minutesSinceMidnight(hour: number, minute: number): number {
  return hour * 60 + minute;
}

/** Awake window [wake, sleep) on the 24h clock; overnight if wake > sleep */
export function isAwakeAt(hour: number, minute: number, wakeHour: number, sleepHour: number): boolean {
  const m = minutesSinceMidnight(hour, minute);
  const w = minutesSinceMidnight(wakeHour, 0);
  const s = minutesSinceMidnight(sleepHour, 0);
  if (w <= s) return m >= w && m < s;
  return m >= w || m < s;
}

export function formatLocalClock(hour: number, minute: number, use12h: boolean): string {
  if (minute !== 0) {
    if (use12h) {
      const h12 = ((hour + 11) % 12) + 1;
      const ap = hour >= 12 ? "pm" : "am";
      return `${h12}:${String(minute).padStart(2, "0")}${ap}`;
    }
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  if (use12h) {
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ap = hour >= 12 ? "pm" : "am";
    return `${h12}${ap}`;
  }
  return String(hour).padStart(2, "0");
}

export function formatRefHourLabel(refHour: number, use12h: boolean): string {
  return formatLocalClock(refHour, 0, use12h);
}

/** Merge sorted hour indices into [start, end) ranges (end exclusive) */
export function hoursToRanges(hours: number[]): OverlapRange[] {
  if (hours.length === 0) return [];
  const sorted = [...new Set(hours)].sort((a, b) => a - b);
  const ranges: OverlapRange[] = [];
  let start = sorted[0]!;
  let prev = sorted[0]!;
  for (let i = 1; i < sorted.length; i++) {
    const h = sorted[i]!;
    if (h === prev + 1) prev = h;
    else {
      ranges.push({ start, end: prev + 1 });
      start = h;
      prev = h;
    }
  }
  ranges.push({ start, end: prev + 1 });
  return ranges;
}

export function formatRangeLabel(
  range: OverlapRange,
  use12h: boolean,
): string {
  const a = formatRefHourLabel(range.start, use12h);
  const endH = range.end >= 24 ? range.end - 24 : range.end;
  const b = formatRefHourLabel(endH, use12h);
  return `${a} — ${b}`;
}

export interface GridComputation {
  columns: HourColumn[];
  meetingOverlapHours: number[];
  baseOverlapByCityId: Map<string, number[]>;
  refDateLabel: string;
}

/**
 * Anchor = "today" in reference TZ. Each column is wall-clock hour 0–23 in reference;
 * cells show actual local time in each city at that instant (DST + fractional offsets).
 */
export function computeGrid(
  cities: City[],
  refCity: City,
  mode: AppMode,
  wakeHour: number,
  sleepHour: number,
  now: Date = new Date(),
): GridComputation {
  const refTz = refCity.timezone;
  const anchor = DateTime.fromJSDate(now, { zone: refTz }).startOf("day");

  const columns: HourColumn[] = [];
  const meetingOverlapHours: number[] = [];
  const baseOverlapByCityId = new Map<string, number[]>();
  const others = cities.filter((c) => c.id !== refCity.id);
  for (const c of others) baseOverlapByCityId.set(c.id, []);

  for (let refH = 0; refH < 24; refH++) {
    const instant = anchor.set({ hour: refH, minute: 0, second: 0, millisecond: 0 });
    const cells = new Map<string, CellState>();

    for (const city of cities) {
      const z = instant.setZone(city.timezone);
      const awake = isAwakeAt(z.hour, z.minute, wakeHour, sleepHour);
      cells.set(city.id, {
        localHour: z.hour,
        localMinute: z.minute,
        awake,
        overlap: false,
      });
    }

    const refCell = cells.get(refCity.id)!;

    if (mode === "meeting") {
      const allAwake = cities.every((c) => cells.get(c.id)!.awake);
      if (allAwake) meetingOverlapHours.push(refH);
      for (const city of cities) {
        const cell = cells.get(city.id)!;
        cell.overlap = allAwake && cell.awake;
      }
    } else {
      for (const city of others) {
        const cell = cells.get(city.id)!;
        const pair = refCell.awake && cell.awake;
        if (pair) baseOverlapByCityId.get(city.id)!.push(refH);
        cell.overlap = pair;
      }
    }

    columns.push({ refHour: refH, instant, cells });
  }

  const refDateLabel = anchor.toFormat("ccc, LLL d");

  return {
    columns,
    meetingOverlapHours,
    baseOverlapByCityId,
    refDateLabel,
  };
}

