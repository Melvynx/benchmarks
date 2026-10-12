import type { City } from '../data/cities';
import type { CellState, Mode, Range } from '../types';
import { calendarDayDiff, getOffsetMinutes, getZonedParts, zonedTimeToUtc } from './time';

export type LocalTime = {
  hour: number;
  minute: number;
  dayDiff: number;
  awake: boolean;
};

export type Cell = LocalTime & {
  refHour: number;
  state: CellState;
};

export type CityRow = {
  city: City;
  offsetMinutes: number;
  cells: Cell[];
  overlapRefHours: number[];
};

export type Schedule = {
  rows: CityRow[];
  meetingHours: number[];
};

export function isAwake(hour: number, wake: number, sleep: number): boolean {
  if (wake === sleep) return false;
  if (wake < sleep) return hour >= wake && hour < sleep;
  return hour >= wake || hour < sleep;
}

export function awakeHourCount(wake: number, sleep: number): number {
  let count = 0;
  for (let hour = 0; hour < 24; hour += 1) {
    if (isAwake(hour, wake, sleep)) count += 1;
  }
  return count;
}

export function toRanges(hours: readonly number[]): Range[] {
  const set = new Set(hours.filter((hour) => hour >= 0 && hour <= 23));
  if (set.size === 0) return [];
  if (set.size === 24) return [{ start: 0, end: 0 }];

  const ranges: Range[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    if (!set.has(hour)) continue;
    const previous = (hour + 23) % 24;
    if (set.has(previous)) continue;
    let cursor = hour;
    let guard = 0;
    while (set.has(cursor) && guard < 24) {
      cursor = (cursor + 1) % 24;
      guard += 1;
    }
    ranges.push({ start: hour, end: cursor });
  }
  return ranges;
}

export function buildSchedule(options: {
  cities: readonly City[];
  wake: number;
  sleep: number;
  now: Date;
  mode: Mode;
}): Schedule {
  const { cities, wake, sleep, now, mode } = options;
  const reference = cities[0];
  if (!reference) return { rows: [], meetingHours: [] };

  const refDate = getZonedParts(now, reference.timeZone);
  const instants = Array.from({ length: 24 }, (_, hour) =>
    zonedTimeToUtc(reference.timeZone, refDate.year, refDate.month, refDate.day, hour, 0),
  );
  const referenceAwake = instants.map((_, hour) => isAwake(hour, wake, sleep));

  const locals = cities.map((city, index) => {
    if (index === 0) {
      return referenceAwake.map((awake, hour) => ({
        hour,
        minute: 0,
        dayDiff: 0,
        awake,
      }));
    }
    return instants.map((instant) => {
      const parts = getZonedParts(instant, city.timeZone);
      return {
        hour: parts.hour,
        minute: parts.minute,
        dayDiff: calendarDayDiff(refDate, parts),
        awake: isAwake(parts.hour, wake, sleep),
      };
    });
  });

  const meetingFlags = instants.map((_, hour) => locals.every((row) => row[hour]?.awake));
  const meetingHours = meetingFlags.flatMap((on, hour) => (on ? [hour] : []));

  const rows: CityRow[] = cities.map((city, index) => {
    const cells: Cell[] = locals[index].map((local, refHour) => {
      const overlap = mode === 'meeting' ? meetingFlags[refHour] : index > 0 && local.awake && referenceAwake[refHour];
      const state: CellState = !local.awake ? 'sleep' : overlap ? 'overlap' : 'awake';
      return { refHour, ...local, state };
    });
    return {
      city,
      offsetMinutes: getOffsetMinutes(now, city.timeZone),
      cells,
      overlapRefHours: cells.filter((cell) => cell.state === 'overlap').map((cell) => cell.refHour),
    };
  });

  return { rows, meetingHours };
}
