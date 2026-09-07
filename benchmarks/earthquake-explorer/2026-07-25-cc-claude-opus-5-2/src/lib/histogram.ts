import type { Quake } from "./usgs";

export interface Bin {
  /** Inclusive start of the bin, ms since epoch. */
  start: number;
  /** Exclusive end of the bin. */
  end: number;
  count: number;
  /** Largest magnitude in the bin, or null when empty. */
  peakMag: number | null;
}

/**
 * Bucket events into a fixed number of equal-width bins spanning [from, to].
 * Used by the timeline strip, which doubles as the time-range brush.
 */
export function buildHistogram(
  quakes: Quake[],
  from: number,
  to: number,
  binCount: number,
): Bin[] {
  const safeCount = Math.max(1, Math.floor(binCount));
  const span = Math.max(1, to - from);
  const width = span / safeCount;

  const bins: Bin[] = Array.from({ length: safeCount }, (_, i) => ({
    start: from + i * width,
    end: from + (i + 1) * width,
    count: 0,
    peakMag: null,
  }));

  for (const quake of quakes) {
    if (quake.time < from || quake.time > to) continue;
    const index = Math.min(safeCount - 1, Math.floor((quake.time - from) / width));
    const bin = bins[index];
    bin.count += 1;
    if (bin.peakMag === null || quake.mag > bin.peakMag) bin.peakMag = quake.mag;
  }

  return bins;
}

export function maxCount(bins: Bin[]): number {
  let max = 0;
  for (const bin of bins) if (bin.count > max) max = bin.count;
  return max;
}
