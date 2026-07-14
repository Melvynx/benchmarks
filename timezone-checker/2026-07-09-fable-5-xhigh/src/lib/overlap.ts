/**
 * Is `localHour` inside the awake window [wakeHour, sleepHour)?
 * Overnight windows (wake 22 → sleep 6) are supported. When wake and sleep
 * coincide the window is degenerate; we treat it as awake around the clock
 * so the grid stays meaningful.
 */
export function isAwakeHour(localHour: number, wakeHour: number, sleepHour: number): boolean {
  if (wakeHour === sleepHour) return true;
  return wakeHour < sleepHour
    ? localHour >= wakeHour && localHour < sleepHour
    : localHour >= wakeHour || localHour < sleepHour;
}

export interface HourRange {
  /** Inclusive start, 0–23, expressed in reference-city hours. */
  start: number;
  /** Exclusive end. Exceeds 24 for ranges that wrap past midnight (22 → 26 means 10pm–2am). */
  end: number;
}

/**
 * Convert a 24-slot boolean mask into contiguous ranges. A run touching both
 * midnight edges is merged into a single wrapping range so "10pm–2am" reads
 * as one window instead of two.
 */
export function hoursToRanges(hours: readonly boolean[]): HourRange[] {
  const ranges: HourRange[] = [];
  let runStart = -1;
  for (let hour = 0; hour < 24; hour++) {
    if (hours[hour] && runStart === -1) runStart = hour;
    if (!hours[hour] && runStart !== -1) {
      ranges.push({ start: runStart, end: hour });
      runStart = -1;
    }
  }
  if (runStart !== -1) ranges.push({ start: runStart, end: 24 });

  const first = ranges[0];
  const last = ranges[ranges.length - 1];
  if (ranges.length > 1 && first.start === 0 && last.end === 24) {
    ranges.pop();
    ranges[0] = { start: last.start, end: first.end + 24 };
  }
  return ranges;
}

export function countHours(hours: readonly boolean[]): number {
  return hours.reduce((total, awake) => total + (awake ? 1 : 0), 0);
}
