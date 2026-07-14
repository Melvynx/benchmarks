import type { City, Mode, Settings } from './types';
import { getOffsetMinutes } from './timezones';

export function isAwakeHour(hour: number, wake: number, sleep: number): boolean {
  if (wake === sleep) return true;
  if (wake < sleep) {
    return hour >= wake && hour < sleep;
  }
  return hour >= wake || hour < sleep;
}

export function isAwakeMinutes(localMinutes: number, wake: number, sleep: number): boolean {
  const hour = Math.floor(localMinutes / 60);
  return isAwakeHour(hour, wake, sleep);
}

export interface CellInfo {
  refHour: number;
  localMinutes: number;
  dayShift: number;
  awake: boolean;
  overlap: boolean;
}

export interface CityRowData {
  city: City;
  isRef: boolean;
  offsetMinutes: number;
  cells: CellInfo[];
  overlapHours: number[];
}

export interface GridData {
  rows: CityRowData[];
  meetingOverlapHours: number[];
  baseOverlap: Record<string, number[]>;
  refOffsetMinutes: number;
}

export function targetLocalAtRefHour(
  refOffset: number,
  targetOffset: number,
  refHour: number,
): { minutes: number; dayShift: number } {
  const raw = refHour * 60 - refOffset + targetOffset;
  const minutes = ((raw % 1440) + 1440) % 1440;
  const dayShift = Math.floor(raw / 1440);
  return { minutes, dayShift };
}

export function computeGrid(
  cities: City[],
  settings: Settings,
  mode: Mode,
): GridData {
  if (cities.length === 0) {
    return { rows: [], meetingOverlapHours: [], baseOverlap: {}, refOffsetMinutes: 0 };
  }

  const offsets = cities.map((c) => getOffsetMinutes(c.tz));
  const refOffset = offsets[0];
  const { wake, sleep } = settings;

  const meetingOverlap: number[] = [];
  for (let h = 0; h < 24; h++) {
    const allAwake = cities.every((_, i) => {
      const { minutes } = targetLocalAtRefHour(refOffset, offsets[i], h);
      return isAwakeMinutes(minutes, wake, sleep);
    });
    if (allAwake) meetingOverlap.push(h);
  }

  const baseOverlap: Record<string, number[]> = {};
  for (let i = 1; i < cities.length; i++) {
    const arr: number[] = [];
    for (let h = 0; h < 24; h++) {
      if (!isAwakeHour(h, wake, sleep)) continue;
      const { minutes } = targetLocalAtRefHour(refOffset, offsets[i], h);
      if (isAwakeMinutes(minutes, wake, sleep)) arr.push(h);
    }
    baseOverlap[cities[i].id] = arr;
  }

  const rows: CityRowData[] = cities.map((city, i) => {
    const overlapHours =
      mode === 'meeting'
        ? meetingOverlap.slice()
        : i === 0
          ? []
          : (baseOverlap[city.id] ?? []);
    const overlapSet = new Set(overlapHours);
    const cells: CellInfo[] = Array.from({ length: 24 }, (_, h) => {
      const { minutes, dayShift } = targetLocalAtRefHour(refOffset, offsets[i], h);
      const awake = isAwakeMinutes(minutes, wake, sleep);
      return {
        refHour: h,
        localMinutes: minutes,
        dayShift,
        awake,
        overlap: overlapSet.has(h) && awake,
      };
    });
    return {
      city,
      isRef: i === 0,
      offsetMinutes: offsets[i],
      cells,
      overlapHours,
    };
  });

  return {
    rows,
    meetingOverlapHours: meetingOverlap,
    baseOverlap,
    refOffsetMinutes: refOffset,
  };
}
