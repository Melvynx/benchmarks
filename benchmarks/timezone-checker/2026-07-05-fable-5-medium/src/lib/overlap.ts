import type { City } from '../data/cities';
import {
  formatUtcOffset,
  getUtcOffsetMinutes,
  isAwake,
  localMinutesAt,
  toRanges,
  type HourRange,
} from './time';

export type Mode = 'meeting' | 'base';

export interface CellState {
  /** Local minutes-of-day in this city at this reference hour. */
  localMinutes: number;
  awake: boolean;
  overlap: boolean;
}

export interface CityRow {
  city: City;
  offsetMinutes: number;
  offsetLabel: string;
  isReference: boolean;
  /** One entry per reference hour, 0–23. */
  cells: CellState[];
  /** Base mode: overlap ranges of this city against the reference. */
  ranges: HourRange[];
}

export interface OverlapModel {
  rows: CityRow[];
  /** Meeting mode: hours (in reference time) when every city is awake. */
  meetingHours: number[];
  meetingRanges: HourRange[];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * Compute the full grid model. All hour columns are anchored to the
 * reference city (first in the list). Offsets are taken from `now`, so
 * DST rules for the current date apply.
 */
export function computeOverlap(
  cities: City[],
  mode: Mode,
  wakeHour: number,
  sleepHour: number,
  now: Date,
): OverlapModel {
  if (cities.length === 0) return { rows: [], meetingHours: [], meetingRanges: [] };

  const offsets = cities.map((c) => getUtcOffsetMinutes(c.timeZone, now));
  const refOffset = offsets[0];

  const awakeGrid = cities.map((_, i) =>
    HOURS.map((h) => {
      const localMinutes = localMinutesAt(h, refOffset, offsets[i]);
      return { localMinutes, awake: isAwake(localMinutes, wakeHour, sleepHour) };
    }),
  );

  const meetingHours = HOURS.filter((h) => awakeGrid.every((row) => row[h].awake));
  const meetingSet = new Set(meetingHours);

  const rows: CityRow[] = cities.map((city, i) => {
    const isReference = i === 0;
    // Base mode: hours when both the reference and this city are awake.
    const baseHours = HOURS.filter((h) => awakeGrid[0][h].awake && awakeGrid[i][h].awake);
    const baseSet = new Set(baseHours);

    const cells: CellState[] = HOURS.map((h) => {
      const { localMinutes, awake } = awakeGrid[i][h];
      const overlap =
        awake && (mode === 'meeting' ? meetingSet.has(h) : isReference ? false : baseSet.has(h));
      return { localMinutes, awake, overlap };
    });

    return {
      city,
      offsetMinutes: offsets[i],
      offsetLabel: formatUtcOffset(offsets[i]),
      isReference,
      cells,
      ranges: isReference ? [] : toRanges(baseHours),
    };
  });

  return { rows, meetingHours, meetingRanges: toRanges(meetingHours) };
}
