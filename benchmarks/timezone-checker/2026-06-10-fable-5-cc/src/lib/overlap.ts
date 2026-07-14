import type { City } from '../data/cities';
import type { Mode, Settings } from './appState';

export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

const DAY_MINUTES = 24 * 60;

export interface CityClock {
  city: City;
  offsetMinutes: number;
}

export interface Cell {
  /** Hour of the reference city's day this cell sits under (0–23). */
  refHour: number;
  /** Local wall-clock time in this city, as minutes since local midnight (0–1439). */
  localMinutes: number;
  /** Local calendar day relative to the reference city: -1, 0 or +1. */
  dayOffset: number;
  awake: boolean;
  overlap: boolean;
}

export interface CityLane {
  city: City;
  offsetMinutes: number;
  cells: Cell[];
  /** Reference hours highlighted in this lane. */
  overlapHours: number[];
}

export interface Schedule {
  lanes: CityLane[];
  /**
   * Meeting mode: hours when every city is awake.
   * Base mode: union of all per-city overlaps (what the reference lane highlights).
   */
  meetingHours: number[];
}

/** Is a local time inside the awake window? Supports overnight windows (wake 22 → sleep 6). */
export function isAwake(minutesOfDay: number, wake: number, sleep: number): boolean {
  const start = wake * 60;
  const end = sleep * 60;
  if (start === end) return true; // identical wake/sleep is treated as awake around the clock
  if (start < end) return minutesOfDay >= start && minutesOfDay < end;
  return minutesOfDay >= start || minutesOfDay < end;
}

export function buildSchedule(clocks: CityClock[], mode: Mode, settings: Settings): Schedule {
  if (clocks.length === 0) return { lanes: [], meetingHours: [] };

  const refOffset = clocks[0].offsetMinutes;
  const lanes: CityLane[] = clocks.map(({ city, offsetMinutes }) => ({
    city,
    offsetMinutes,
    overlapHours: [],
    cells: HOURS.map((refHour) => {
      const total = refHour * 60 + (offsetMinutes - refOffset);
      const localMinutes = ((total % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
      return {
        refHour,
        localMinutes,
        dayOffset: Math.floor(total / DAY_MINUTES),
        awake: isAwake(localMinutes, settings.wake, settings.sleep),
        overlap: false,
      };
    }),
  }));

  if (mode === 'meeting') {
    const meetingHours = HOURS.filter((hour) => lanes.every((lane) => lane.cells[hour].awake));
    for (const lane of lanes) {
      lane.overlapHours = meetingHours;
      for (const hour of meetingHours) lane.cells[hour].overlap = true;
    }
    return { lanes, meetingHours };
  }

  // Base mode: each city is matched against the reference independently.
  const refLane = lanes[0];
  const union = new Set<number>();
  for (const lane of lanes.slice(1)) {
    lane.overlapHours = HOURS.filter((hour) => refLane.cells[hour].awake && lane.cells[hour].awake);
    for (const hour of lane.overlapHours) {
      lane.cells[hour].overlap = true;
      union.add(hour);
    }
  }
  refLane.overlapHours = [...union].sort((a, b) => a - b);
  for (const hour of refLane.overlapHours) refLane.cells[hour].overlap = true;
  return { lanes, meetingHours: refLane.overlapHours };
}
