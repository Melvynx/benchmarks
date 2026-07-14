import { localMinutesForRefHour } from "./timezone";

export type AwakeWindow = { wake: number; sleep: number };

/**
 * Returns true if the local hour (as minutes since midnight) falls
 * within the awake window. Overnight windows (wake > sleep) are supported.
 * A zero-length window (wake == sleep) means never awake.
 */
export function isAwakeAtLocalMinutes(
  localMinutes: number,
  window: AwakeWindow,
): boolean {
  const h = localMinutes / 60;
  const { wake, sleep } = window;
  if (wake === sleep) return false;
  if (wake < sleep) return h >= wake && h < sleep;
  return h >= wake || h < sleep;
}

/**
 * Builds the awake boolean array (24 entries) for a city relative to
 * the reference city, using integer reference hours.
 */
export function buildAwakeArray(
  refOffsetMin: number,
  cityOffsetMin: number,
  window: AwakeWindow,
): boolean[] {
  return Array.from({ length: 24 }, (_, h) => {
    const local = localMinutesForRefHour(h, refOffsetMin, cityOffsetMin);
    return isAwakeAtLocalMinutes(local, window);
  });
}

/**
 * Compute overlap ranges from a boolean array (length 24).
 * Each range is [startHour, endHour) with end exclusive.
 * Wrap-around ranges (e.g. 22 → 2) are merged into a single range when contiguous.
 */
export function rangesFromMask(mask: boolean[]): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let i = 0;
  while (i < 24) {
    if (mask[i]) {
      const start = i;
      while (i < 24 && mask[i]) i++;
      ranges.push([start, i]);
    } else {
      i++;
    }
  }
  // Merge wrap-around: if first starts at 0 and last ends at 24
  if (
    ranges.length >= 2 &&
    ranges[0][0] === 0 &&
    ranges[ranges.length - 1][1] === 24
  ) {
    const last = ranges.pop()!;
    const first = ranges.shift()!;
    ranges.push([last[0], first[1] + 24]);
  }
  return ranges;
}

export function countHours(mask: boolean[]): number {
  return mask.reduce((a, b) => a + (b ? 1 : 0), 0);
}
