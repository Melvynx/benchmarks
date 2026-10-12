import { wrapMinutes } from "./time";

export interface AwakeWindow {
  readonly wakeHour: number;
  readonly sleepHour: number;
}

/**
 * One grid column for one city. `refHour` is the column index in the reference
 * city's day. `localStart` is the city's clock at the start of that reference hour.
 */
export interface HourSlot {
  readonly refHour: number;
  readonly localStart: number;
  /** True only when all 60 minutes of the slot fall inside the awake window. */
  readonly awake: boolean;
}

export interface HourRange {
  readonly startHour: number;
  readonly hourCount: number;
}

export interface OverlapResult {
  readonly hours: number;
  readonly ranges: readonly HourRange[];
}

export const HOURS_PER_DAY = 24;

/** Equal wake and sleep hours describe an empty window: nobody is ever awake. */
export function isAwakeHour(hour: number, { wakeHour, sleepHour }: AwakeWindow): boolean {
  if (wakeHour === sleepHour) return false;
  return wakeHour < sleepHour
    ? hour >= wakeHour && hour < sleepHour
    : hour >= wakeHour || hour < sleepHour;
}

export function countAwakeHours(window: AwakeWindow): number {
  let count = 0;
  for (let hour = 0; hour < HOURS_PER_DAY; hour++) {
    if (isAwakeHour(hour, window)) count++;
  }
  return count;
}

/**
 * Builds the 24 slots for a city given its offset relative to the reference
 * (`offsetDiffMinutes` = cityOffset - referenceOffset).
 *
 * A slot can straddle two local hours when the offset is fractional (India +5:30).
 * It counts as awake only if both hours are awake, so a half-asleep hour is never
 * offered as overlap.
 */
export function buildSlots(offsetDiffMinutes: number, window: AwakeWindow): HourSlot[] {
  return Array.from({ length: HOURS_PER_DAY }, (_, refHour) => {
    const localStart = wrapMinutes(refHour * 60 + offsetDiffMinutes);
    const firstHour = Math.floor(localStart / 60);
    const lastHour = Math.floor(wrapMinutes(localStart + 59) / 60);

    return {
      refHour,
      localStart,
      awake: isAwakeHour(firstHour, window) && isAwakeHour(lastHour, window),
    };
  });
}

/** Hours where every city is awake. */
export function meetingOverlap(slotsPerCity: readonly (readonly HourSlot[])[]): boolean[] {
  return Array.from({ length: HOURS_PER_DAY }, (_, hour) =>
    slotsPerCity.every((slots) => slots[hour].awake),
  );
}

/** Hours where both the reference and the other city are awake. */
export function pairOverlap(
  reference: readonly HourSlot[],
  other: readonly HourSlot[],
): boolean[] {
  return Array.from({ length: HOURS_PER_DAY }, (_, hour) =>
    reference[hour].awake && other[hour].awake,
  );
}

/**
 * Merges consecutive true flags into ranges. Runs that cross midnight are kept
 * whole (22, 23, 0, 1 becomes one range starting at 22), so the scan starts
 * after a false hour.
 */
export function toHourRanges(flags: readonly boolean[]): HourRange[] {
  const n = flags.length;
  if (!flags.some(Boolean)) return [];
  if (flags.every(Boolean)) return [{ startHour: 0, hourCount: n }];

  const anchor = flags.indexOf(false);
  const ranges: { startHour: number; hourCount: number }[] = [];
  let current: { startHour: number; hourCount: number } | null = null;

  for (let step = 1; step <= n; step++) {
    const hour = (anchor + step) % n;
    if (flags[hour]) {
      if (current) current.hourCount++;
      else current = { startHour: hour, hourCount: 1 };
    } else if (current) {
      ranges.push(current);
      current = null;
    }
  }

  return ranges.sort((a, b) => a.startHour - b.startHour);
}

export function summarizeOverlap(flags: readonly boolean[]): OverlapResult {
  return { hours: flags.filter(Boolean).length, ranges: toHourRanges(flags) };
}
