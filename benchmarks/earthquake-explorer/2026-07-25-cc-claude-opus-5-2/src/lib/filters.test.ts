import { describe, expect, it } from "vitest";

import {
  DEFAULT_FILTERS,
  activeFilterCount,
  applyFilters,
  sortQuakes,
  summarize,
  type Filters,
} from "./filters";
import type { Quake } from "./usgs";

let seq = 0;
function quake(overrides: Partial<Quake> = {}): Quake {
  seq += 1;
  return {
    id: `q${seq}`,
    mag: 3,
    magType: "ml",
    place: "10 km N of Somewhere, Chile",
    title: "M 3.0",
    time: 1_000_000,
    updated: 1_000_000,
    lon: 0,
    lat: 0,
    depth: 10,
    sig: 100,
    felt: null,
    cdi: null,
    mmi: null,
    alert: null,
    tsunami: false,
    status: "reviewed",
    type: "earthquake",
    nst: null,
    gap: null,
    dmin: null,
    rms: null,
    net: "us",
    url: "https://example.test",
    ...overrides,
  };
}

const filters = (overrides: Partial<Filters> = {}): Filters => ({
  ...DEFAULT_FILTERS,
  ...overrides,
});

describe("applyFilters", () => {
  it("passes everything through with default filters", () => {
    const list = [quake(), quake({ mag: 7 }), quake({ depth: 500 })];
    expect(applyFilters(list, filters())).toHaveLength(3);
  });

  it("filters on magnitude and depth ranges inclusively", () => {
    const list = [quake({ mag: 2 }), quake({ mag: 4 }), quake({ mag: 6 })];
    expect(applyFilters(list, filters({ minMag: 4, maxMag: 6 })).map((q) => q.mag)).toEqual([4, 6]);

    const deep = [quake({ depth: 5 }), quake({ depth: 120 }), quake({ depth: 400 })];
    expect(applyFilters(deep, filters({ minDepth: 100, maxDepth: 400 })).map((q) => q.depth)).toEqual(
      [120, 400],
    );
  });

  it("treats a slider parked at its extreme as no bound at all", () => {
    // USGS reports magnitudes below the slider's floor and depths above sea
    // level. Untouched sliders must not silently drop them.
    const list = [quake({ mag: -1.6 }), quake({ mag: 3 }), quake({ depth: -2.1 })];
    expect(applyFilters(list, filters())).toHaveLength(3);
    expect(activeFilterCount(filters())).toBe(0);

    // Moving either handle off its extreme starts filtering again.
    expect(applyFilters(list, filters({ minMag: -0.9 })).map((q) => q.mag)).toEqual([3, 3]);
    expect(applyFilters(list, filters({ minDepth: 5 })).map((q) => q.depth)).toEqual([10, 10]);
  });

  it("filters on an origin-time window", () => {
    const list = [quake({ time: 10 }), quake({ time: 50 }), quake({ time: 90 })];
    expect(applyFilters(list, filters({ timeFrom: 20, timeTo: 90 })).map((q) => q.time)).toEqual([
      50, 90,
    ]);
  });

  it("matches search case-insensitively against place, title and id", () => {
    const list = [
      quake({ place: "5 km E of Reykjavík, Iceland" }),
      quake({ place: "Off the coast of Chile" }),
    ];
    expect(applyFilters(list, filters({ search: "iceland" }))).toHaveLength(1);
    expect(applyFilters(list, filters({ search: "  CHILE " }))).toHaveLength(1);
    expect(applyFilters(list, filters({ search: "atlantis" }))).toHaveLength(0);
  });

  it("applies the boolean quick filters", () => {
    const list = [
      quake({ sig: 700, felt: 30, tsunami: true, type: "earthquake" }),
      quake({ sig: 100, felt: 0, tsunami: false, type: "quarry blast" }),
    ];
    expect(applyFilters(list, filters({ significantOnly: true }))).toHaveLength(1);
    expect(applyFilters(list, filters({ feltOnly: true }))).toHaveLength(1);
    expect(applyFilters(list, filters({ tsunamiOnly: true }))).toHaveLength(1);
    expect(applyFilters(list, filters({ tectonicOnly: true }))).toHaveLength(1);
  });

  it("only consults bounds when the viewport filter is on", () => {
    const list = [quake({ lat: 10, lon: 10 }), quake({ lat: 60, lon: 60 })];
    const bounds = { west: 0, south: 0, east: 20, north: 20 };
    expect(applyFilters(list, filters(), bounds)).toHaveLength(2);
    expect(applyFilters(list, filters({ viewportOnly: true }), bounds)).toHaveLength(1);
    // No bounds yet (map still loading) must not silently hide everything.
    expect(applyFilters(list, filters({ viewportOnly: true }), null)).toHaveLength(2);
  });

  it("combines filters conjunctively", () => {
    const list = [
      quake({ mag: 5, felt: 4, place: "Peru" }),
      quake({ mag: 5, felt: 0, place: "Peru" }),
      quake({ mag: 2, felt: 9, place: "Peru" }),
    ];
    expect(applyFilters(list, filters({ minMag: 4, feltOnly: true, search: "peru" }))).toHaveLength(
      1,
    );
  });
});

describe("activeFilterCount", () => {
  it("is zero for defaults and counts each narrowed dimension once", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount(filters({ minMag: 3 }))).toBe(1);
    expect(activeFilterCount(filters({ minMag: 3, maxMag: 6 }))).toBe(1);
    expect(activeFilterCount(filters({ minMag: 3, feltOnly: true, search: "x" }))).toBe(3);
    expect(activeFilterCount(filters({ search: "   " }))).toBe(0);
  });
});

describe("sortQuakes", () => {
  const list = [
    quake({ mag: 2, depth: 300, time: 30, felt: 5, sig: 10 }),
    quake({ mag: 6, depth: 10, time: 10, felt: 900, sig: 800 }),
    quake({ mag: 4, depth: 100, time: 20, felt: null, sig: 400 }),
  ];

  it("orders by each key", () => {
    expect(sortQuakes(list, "recent").map((q) => q.time)).toEqual([30, 20, 10]);
    expect(sortQuakes(list, "magnitude").map((q) => q.mag)).toEqual([6, 4, 2]);
    expect(sortQuakes(list, "shallow").map((q) => q.depth)).toEqual([10, 100, 300]);
    expect(sortQuakes(list, "deep").map((q) => q.depth)).toEqual([300, 100, 10]);
    expect(sortQuakes(list, "felt").map((q) => q.felt)).toEqual([900, 5, null]);
    expect(sortQuakes(list, "significance").map((q) => q.sig)).toEqual([800, 400, 10]);
  });

  it("does not mutate the input", () => {
    const original = list.map((q) => q.id);
    sortQuakes(list, "magnitude");
    expect(list.map((q) => q.id)).toEqual(original);
  });
});

describe("summarize", () => {
  it("reports zeros for an empty set", () => {
    const stats = summarize([]);
    expect(stats.count).toBe(0);
    expect(stats.strongest).toBeNull();
    expect(stats.equivalentMagnitude).toBeNull();
  });

  it("finds extremes and counts flags", () => {
    const stats = summarize([
      quake({ mag: 3, depth: 10, time: 1, felt: 2, sig: 700 }),
      quake({ mag: 6.4, depth: 400, time: 9, tsunami: true }),
      quake({ mag: 1, depth: 40, time: 5, felt: 0 }),
    ]);
    expect(stats.count).toBe(3);
    expect(stats.strongest?.mag).toBe(6.4);
    expect(stats.latest?.time).toBe(9);
    expect(stats.deepest?.depth).toBe(400);
    expect(stats.feltCount).toBe(1);
    expect(stats.tsunamiCount).toBe(1);
    expect(stats.significantCount).toBe(1);
    expect(stats.medianDepth).toBe(40);
  });

  it("sums energy, so the equivalent magnitude is at least the largest event", () => {
    const stats = summarize([quake({ mag: 5 }), quake({ mag: 5 })]);
    // Two M5s release twice the energy of one: 10^(1.5·M) doubling ≈ +0.2 M.
    expect(stats.equivalentMagnitude).toBeCloseTo(5.2, 1);
  });

  it("takes the mean of the two middle depths for an even count", () => {
    expect(summarize([quake({ depth: 10 }), quake({ depth: 30 })]).medianDepth).toBe(20);
  });
});
