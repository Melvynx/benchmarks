import type { City, Mode } from '../types';
import { formatOffset, localMinutesOfDay, utcOffsetMinutes } from './time';
import { countHours, hoursToRanges, isAwakeHour, type HourRange } from './overlap';

export const HOURS: readonly number[] = Array.from({ length: 24 }, (_, hour) => hour);

export interface CellModel {
  /** Column: hour of the day in the reference city (0–23). */
  refHour: number;
  /** Local wall-clock time in this city, as minutes since local midnight. */
  localMinutes: number;
  /** Local calendar day relative to the reference city's day. */
  dayDelta: -1 | 0 | 1;
  awake: boolean;
  overlap: boolean;
}

export interface RowModel {
  city: City;
  isRef: boolean;
  offsetMinutes: number;
  offsetLabel: string;
  cells: CellModel[];
}

export interface OverlapInfo {
  count: number;
  ranges: HourRange[];
}

export interface ScheduleModel {
  /** One row per city; rows[0] is the reference. */
  rows: RowModel[];
  /** Meeting mode with 2+ cities: hours when every city is awake. */
  meeting: OverlapInfo | null;
  /** Base mode with 2+ cities: per-city overlap vs the reference, keyed by city id. */
  base: Map<string, OverlapInfo> | null;
  /** Current hour in the reference city, for the "now" marker. */
  nowRefHour: number | null;
}

/**
 * Pure derivation of everything the grids and summary render, anchored to the
 * reference city's day. Offsets are taken at `now`, so DST is always current.
 */
export function buildSchedule(
  cities: City[],
  mode: Mode,
  wakeHour: number,
  sleepHour: number,
  now: Date,
): ScheduleModel {
  if (cities.length === 0) {
    return { rows: [], meeting: null, base: null, nowRefHour: null };
  }

  const refOffset = utcOffsetMinutes(cities[0].timeZone, now);

  const rows: RowModel[] = cities.map((city, index) => {
    const offset = utcOffsetMinutes(city.timeZone, now);
    const cells: CellModel[] = HOURS.map((refHour) => {
      const raw = refHour * 60 + offset - refOffset;
      const dayDelta = raw < 0 ? -1 : raw >= 1440 ? 1 : 0;
      const localMinutes = ((raw % 1440) + 1440) % 1440;
      return {
        refHour,
        localMinutes,
        dayDelta,
        awake: isAwakeHour(Math.floor(localMinutes / 60), wakeHour, sleepHour),
        overlap: false,
      };
    });
    return { city, isRef: index === 0, offsetMinutes: offset, offsetLabel: formatOffset(offset), cells };
  });

  let meeting: OverlapInfo | null = null;
  let base: Map<string, OverlapInfo> | null = null;

  if (rows.length >= 2) {
    if (mode === 'meeting') {
      const shared = HOURS.map((hour) => rows.every((row) => row.cells[hour].awake));
      for (const row of rows) {
        row.cells.forEach((cell, hour) => {
          cell.overlap = shared[hour];
        });
      }
      meeting = { count: countHours(shared), ranges: hoursToRanges(shared) };
    } else {
      base = new Map();
      const refCells = rows[0].cells;
      // The reference row highlights the union: any hour usable with at least one city.
      const union = new Array<boolean>(24).fill(false);
      for (const row of rows.slice(1)) {
        const pair = HOURS.map((hour) => refCells[hour].awake && row.cells[hour].awake);
        row.cells.forEach((cell, hour) => {
          cell.overlap = pair[hour];
          if (pair[hour]) union[hour] = true;
        });
        base.set(row.city.id, { count: countHours(pair), ranges: hoursToRanges(pair) });
      }
      refCells.forEach((cell, hour) => {
        cell.overlap = union[hour];
      });
    }
  }

  const nowRefHour = Math.floor(localMinutesOfDay(cities[0].timeZone, now) / 60);
  return { rows, meeting, base, nowRefHour };
}
