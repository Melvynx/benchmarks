import type { City } from "./cities";
import { HOURS, MINUTES_PER_DAY, getOffsetMinutes, getZonedParts, mod, weekdayName } from "./time";

export type Mode = "meeting" | "base";
export type CellState = "asleep" | "awake" | "overlap";

export interface Availability {
  /** Hour (0–23) the awake window starts. */
  wake: number;
  /** Hour (0–23) the awake window ends (exclusive). */
  sleep: number;
}

/** Inclusive start, exclusive end, in reference-city hours. `end` may wrap past midnight. */
export interface HourRange {
  start: number;
  end: number;
  hours: number;
}

export interface ScheduleCell {
  /** Column: hour of the reference city's day. */
  refHour: number;
  /** Local wall-clock time in minutes since local midnight. */
  localMinutes: number;
  localHour: number;
  /** Local weekday, e.g. "Wed". */
  weekday: string;
  /** True when this cell is the first one of a new local day. */
  startsDay: boolean;
  state: CellState;
}

export interface ScheduleRow {
  city: City;
  isReference: boolean;
  offsetMinutes: number;
  /** Current local time in minutes since local midnight. */
  nowMinutes: number;
  cells: ScheduleCell[];
  /** Per-city overlap (Base Mode only; equals the shared mask in Meeting Mode). */
  overlap: boolean[];
  ranges: HourRange[];
  overlapHours: number;
}

export interface Schedule {
  mode: Mode;
  rows: ScheduleRow[];
  reference: ScheduleRow | null;
  /** Hours where everyone is awake (Meeting Mode). */
  sharedOverlap: boolean[];
  sharedRanges: HourRange[];
  sharedHours: number;
  /** Current position in the reference day, in fractional hours. */
  nowRefHour: number;
}

export function isAwakeHour(hour: number, { wake, sleep }: Availability): boolean {
  if (wake === sleep) return true;
  if (wake < sleep) return hour >= wake && hour < sleep;
  return hour >= wake || hour < sleep; // overnight window, e.g. 22 → 6
}

export function awakeHourCount(availability: Availability): number {
  return HOURS.filter((hour) => isAwakeHour(hour, availability)).length;
}

/**
 * Collapses a 24-slot mask into ranges. The day is treated as circular so a
 * window running 10pm → 2am is reported as one range rather than two.
 */
export function maskToRanges(mask: readonly boolean[]): HourRange[] {
  const size = mask.length;
  const anchor = mask.indexOf(false);
  if (anchor === -1) return size ? [{ start: 0, end: size, hours: size }] : [];

  const ranges: HourRange[] = [];
  let runStart = -1;
  for (let step = 1; step <= size; step++) {
    const position = anchor + step;
    if (mask[position % size]) {
      if (runStart < 0) runStart = position;
    } else if (runStart >= 0) {
      ranges.push({ start: runStart % size, end: position % size, hours: position - runStart });
      runStart = -1;
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

interface ComputeScheduleInput {
  cities: readonly City[];
  mode: Mode;
  availability: Availability;
  now: Date;
}

export function computeSchedule({ cities, mode, availability, now }: ComputeScheduleInput): Schedule {
  const [referenceCity] = cities;
  const empty = HOURS.map(() => false);
  if (!referenceCity) {
    return { mode, rows: [], reference: null, sharedOverlap: empty, sharedRanges: [], sharedHours: 0, nowRefHour: 0 };
  }

  const refOffset = getOffsetMinutes(referenceCity.timeZone, now);
  const refToday = getZonedParts(referenceCity.timeZone, now);

  const timelines = cities.map((city) => {
    const offsetMinutes = getOffsetMinutes(city.timeZone, now);
    const local = getZonedParts(city.timeZone, now);
    const slots = HOURS.map((refHour) => {
      const absolute = refHour * 60 + offsetMinutes - refOffset;
      const localMinutes = mod(absolute, MINUTES_PER_DAY);
      const dayShift = Math.floor(absolute / MINUTES_PER_DAY);
      const localHour = Math.floor(localMinutes / 60);
      return {
        refHour,
        localMinutes,
        localHour,
        dayShift,
        weekday: weekdayName(refToday.year, refToday.month, refToday.day + dayShift),
        awake: isAwakeHour(localHour, availability),
      };
    });
    return { city, offsetMinutes, nowMinutes: local.hour * 60 + local.minute, slots };
  });

  const comparable = timelines.length >= 2;
  const sharedOverlap = HOURS.map((hour) => comparable && timelines.every((t) => t.slots[hour]?.awake));
  const [referenceTimeline, ...others] = timelines;

  // Base Mode: each non-reference city is compared only against the reference.
  const pairwise = others.map((timeline) =>
    HOURS.map((hour) => Boolean(referenceTimeline?.slots[hour]?.awake && timeline.slots[hour]?.awake)),
  );
  const referenceUnion = HOURS.map((hour) => pairwise.some((mask) => mask[hour]));

  const rows = timelines.map((timeline, index): ScheduleRow => {
    const overlap =
      mode === "meeting" ? sharedOverlap : index === 0 ? referenceUnion : (pairwise[index - 1] ?? empty);
    const ranges = maskToRanges(overlap);
    return {
      city: timeline.city,
      isReference: index === 0,
      offsetMinutes: timeline.offsetMinutes,
      nowMinutes: timeline.nowMinutes,
      overlap,
      ranges,
      overlapHours: overlap.filter(Boolean).length,
      cells: timeline.slots.map((slot, hour) => ({
        refHour: slot.refHour,
        localMinutes: slot.localMinutes,
        localHour: slot.localHour,
        weekday: slot.weekday,
        startsDay: hour > 0 && slot.dayShift !== timeline.slots[hour - 1]?.dayShift,
        state: !slot.awake ? "asleep" : overlap[hour] ? "overlap" : "awake",
      })),
    };
  });

  const sharedRanges = maskToRanges(sharedOverlap);
  return {
    mode,
    rows,
    reference: rows[0] ?? null,
    sharedOverlap,
    sharedRanges,
    sharedHours: sharedOverlap.filter(Boolean).length,
    nowRefHour: refToday.hour + refToday.minute / 60,
  };
}
