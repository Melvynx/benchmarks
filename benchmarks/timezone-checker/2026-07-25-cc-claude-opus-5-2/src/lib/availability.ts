/** Awake-window logic and the hour ranges derived from it. */

export const HOURS_IN_DAY = 24;

/** Every hour of the reference day, 0-23. */
export const HOURS: readonly number[] = Array.from({ length: HOURS_IN_DAY }, (_, hour) => hour);

/**
 * Is `hour` inside the awake window?
 *
 * The window is inclusive of `wake` and exclusive of `sleep`. When `wake` is
 * greater than `sleep` the window wraps past midnight (night shift). When the
 * two are equal there is no boundary at all, so the whole day counts as awake.
 */
export function isAwake(hour: number, wake: number, sleep: number): boolean {
  if (wake === sleep) return true;
  if (wake < sleep) return hour >= wake && hour < sleep;
  return hour >= wake || hour < sleep;
}

/** Length of the awake window in hours (1-24). */
export function awakeWindowLength(wake: number, sleep: number): number {
  if (wake === sleep) return HOURS_IN_DAY;
  return (sleep - wake + HOURS_IN_DAY) % HOURS_IN_DAY;
}

/** Inclusive start, exclusive end. `end` runs 1-24 so midnight closes as 24. */
export type HourRange = { start: number; end: number };

/**
 * Collapse a set of hours into contiguous ranges.
 *
 * Ranges never wrap around midnight: the grid shows a single reference day, so
 * hour 23 and hour 0 sit at opposite ends of it rather than next to each other.
 */
export function toHourRanges(hours: readonly boolean[]): HourRange[] {
  const ranges: HourRange[] = [];
  let start: number | null = null;

  for (let hour = 0; hour < HOURS_IN_DAY; hour++) {
    if (hours[hour]) {
      if (start === null) start = hour;
    } else if (start !== null) {
      ranges.push({ start, end: hour });
      start = null;
    }
  }
  if (start !== null) ranges.push({ start, end: HOURS_IN_DAY });
  return ranges;
}

export function countHours(hours: readonly boolean[]): number {
  let total = 0;
  for (const hour of hours) if (hour) total += 1;
  return total;
}
