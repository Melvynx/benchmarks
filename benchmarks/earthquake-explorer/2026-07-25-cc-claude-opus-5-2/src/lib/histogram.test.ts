import { describe, expect, it } from "vitest";

import { buildHistogram, maxCount } from "./histogram";
import type { Quake } from "./usgs";

const at = (time: number, mag = 1): Quake => ({ time, mag } as Quake);

describe("buildHistogram", () => {
  it("produces exactly binCount contiguous bins spanning the range", () => {
    const bins = buildHistogram([], 0, 100, 10);
    expect(bins).toHaveLength(10);
    expect(bins[0].start).toBe(0);
    expect(bins[9].end).toBe(100);
    for (let i = 1; i < bins.length; i += 1) {
      expect(bins[i].start).toBe(bins[i - 1].end);
    }
  });

  it("assigns events to the bin containing their origin time", () => {
    const bins = buildHistogram([at(5), at(15), at(15), at(95)], 0, 100, 10);
    expect(bins[0].count).toBe(1);
    expect(bins[1].count).toBe(2);
    expect(bins[9].count).toBe(1);
    expect(bins.reduce((sum, b) => sum + b.count, 0)).toBe(4);
  });

  it("puts an event on a boundary in the later bin, and the range end in the last bin", () => {
    const bins = buildHistogram([at(10), at(100)], 0, 100, 10);
    expect(bins[0].count).toBe(0);
    expect(bins[1].count).toBe(1);
    expect(bins[9].count).toBe(1);
  });

  it("ignores events outside the range instead of clamping them in", () => {
    const bins = buildHistogram([at(-50), at(150)], 0, 100, 10);
    expect(bins.reduce((sum, b) => sum + b.count, 0)).toBe(0);
  });

  it("tracks the peak magnitude per bin and leaves empty bins null", () => {
    const bins = buildHistogram([at(5, 2.1), at(6, 4.8), at(7, 3.3)], 0, 100, 10);
    expect(bins[0].peakMag).toBe(4.8);
    expect(bins[1].peakMag).toBeNull();
  });

  it("survives a degenerate range or bin count", () => {
    expect(buildHistogram([at(0)], 50, 50, 4)).toHaveLength(4);
    expect(buildHistogram([at(0)], 0, 100, 0)).toHaveLength(1);
    expect(buildHistogram([at(50)], 0, 100, 1)[0].count).toBe(1);
  });
});

describe("maxCount", () => {
  it("returns the tallest bar, or zero for an empty histogram", () => {
    expect(maxCount(buildHistogram([at(5), at(5), at(95)], 0, 100, 10))).toBe(2);
    expect(maxCount(buildHistogram([], 0, 100, 10))).toBe(0);
    expect(maxCount([])).toBe(0);
  });
});
