import type { City } from './cities';
import {
  HOURS,
  getOffsetMinutes,
  getZonedParts,
  isAwake,
  localHourToUtc,
  toRanges,
  type TimeRange,
} from './time';

export type Mode = 'meeting' | 'base';

export interface CellInfo {
  /** Hour of the reference city's day this column represents (0–23). */
  refHour: number;
  /** Local hour in this city at that instant. */
  localHour: number;
  /** Local minutes — non-zero for fractional offsets (e.g. 45 for Nepal). */
  localMinute: number;
  awake: boolean;
  overlap: boolean;
}

export interface CityRowData {
  city: City;
  isRef: boolean;
  offsetMinutes: number;
  cells: CellInfo[];
  overlapFlags: boolean[];
  overlapCount: number;
  ranges: TimeRange[];
}

export interface GridData {
  refCity: City;
  currentRefHour: number;
  rows: CityRowData[];
  meetingFlags: boolean[];
  meetingCount: number;
  meetingRanges: TimeRange[];
}

/**
 * Build the full 24-column grid anchored to the reference city's current day.
 *
 * - Meeting mode: a column is overlap only when *every* city is awake.
 * - Base mode: each non-reference city overlaps independently with the
 *   reference; the reference row highlights columns where at least one other
 *   city is simultaneously awake.
 */
export function buildGrid(
  cities: City[],
  mode: Mode,
  wake: number,
  sleep: number,
  now: number,
): GridData | null {
  const ref = cities[0];
  if (!ref) return null;

  const refNow = getZonedParts(ref.tz, now);
  const currentRefHour = refNow.hour;

  // UTC instant behind each of the reference day's 24 hour columns.
  const colUtc = HOURS.map((h) => localHourToUtc(ref.tz, refNow.year, refNow.month, refNow.day, h));

  const localTimes = cities.map((city) =>
    colUtc.map((ts) => {
      const p = getZonedParts(city.tz, ts);
      return { hour: p.hour, minute: p.minute };
    }),
  );

  const awake = cities.map((_, i) =>
    localTimes[i].map((t) => isAwake(t.hour + t.minute / 60, wake, sleep)),
  );

  // A single city has nothing to overlap with: its awake hours stay neutral.
  const meetingFlags =
    cities.length < 2
      ? HOURS.map(() => false)
      : HOURS.map((h) => cities.every((_, i) => awake[i][h]));

  const flagsFor = (i: number): boolean[] => {
    if (mode === 'meeting') return meetingFlags;
    if (i === 0) {
      if (cities.length === 1) return meetingFlags;
      return HOURS.map((h) => awake[0][h] && cities.some((_, j) => j > 0 && awake[j][h]));
    }
    return HOURS.map((h) => awake[0][h] && awake[i][h]);
  };

  const rows: CityRowData[] = cities.map((city, i) => {
    const flags = flagsFor(i);
    const cells: CellInfo[] = HOURS.map((h) => ({
      refHour: h,
      localHour: localTimes[i][h].hour,
      localMinute: localTimes[i][h].minute,
      awake: awake[i][h],
      overlap: flags[h],
    }));
    return {
      city,
      isRef: i === 0,
      offsetMinutes: getOffsetMinutes(city.tz, now),
      cells,
      overlapFlags: flags,
      overlapCount: flags.filter(Boolean).length,
      ranges: toRanges(flags),
    };
  });

  return {
    refCity: ref,
    currentRefHour,
    rows,
    meetingFlags,
    meetingCount: meetingFlags.filter(Boolean).length,
    meetingRanges: toRanges(meetingFlags),
  };
}
