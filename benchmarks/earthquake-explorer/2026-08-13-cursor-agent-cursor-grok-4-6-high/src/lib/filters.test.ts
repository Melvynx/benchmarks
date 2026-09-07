import { describe, expect, it } from "vitest";

import { applyFilters, haversineKm, inBounds, sortQuakes, summarize } from "./filters";
import type { Filters, Quake } from "./types";
import { parseQuake } from "./usgs";

const base: Filters = {
  minMag: 0,
  depth: "all",
  query: "",
  feltOnly: false,
  tsunamiOnly: false,
  viewportOnly: false,
  timeFrom: null,
  timeTo: null,
};

function quake(partial: Partial<Quake> & Pick<Quake, "id" | "lat" | "lon">): Quake {
  return {
    mag: 4.1,
    place: "12 km SW of Ferndale, CA",
    time: 1_700_000_000_000,
    updated: 1_700_000_000_000,
    url: "https://example.test",
    felt: null,
    cdi: null,
    mmi: null,
    alert: null,
    status: "reviewed",
    tsunami: false,
    sig: 200,
    magType: "ml",
    type: "earthquake",
    depth: 10,
    net: "nc",
    code: "1",
    ...partial,
  };
}

describe("parseQuake", () => {
  it("reads lon, lat, depth from USGS coordinates in that order", () => {
    const parsed = parseQuake({
      id: "nc123",
      properties: {
        mag: 5.4,
        place: "Near Tokyo",
        time: 1_700_000_000_000,
        url: "https://earthquake.usgs.gov/earthquakes/eventpage/nc123",
      },
      geometry: { coordinates: [139.69, 35.68, 42.2] },
    });
    expect(parsed?.lon).toBe(139.69);
    expect(parsed?.lat).toBe(35.68);
    expect(parsed?.depth).toBe(42.2);
    expect(parsed?.mag).toBe(5.4);
  });

  it("rejects incomplete coordinates", () => {
    expect(parseQuake({ geometry: { coordinates: [12] } })).toBeNull();
  });
});

describe("applyFilters", () => {
  const sample = [
    quake({ id: "a", lat: 37, lon: -122, mag: 2.1, place: "California", depth: 8 }),
    quake({ id: "b", lat: 35, lon: 139, mag: 6.2, place: "Japan", depth: 380, tsunami: true }),
    quake({ id: "c", lat: -2, lon: 118, mag: 4.8, place: "Indonesia", depth: 90, felt: 12 }),
  ];

  it("filters by magnitude, depth band, place, felt, and tsunami", () => {
    expect(applyFilters(sample, { ...base, minMag: 5 }, null).map((q) => q.id)).toEqual(["b"]);
    expect(applyFilters(sample, { ...base, depth: "deep" }, null).map((q) => q.id)).toEqual(["b"]);
    expect(applyFilters(sample, { ...base, query: "indo" }, null).map((q) => q.id)).toEqual(["c"]);
    expect(applyFilters(sample, { ...base, feltOnly: true }, null).map((q) => q.id)).toEqual(["c"]);
    expect(applyFilters(sample, { ...base, tsunamiOnly: true }, null).map((q) => q.id)).toEqual(["b"]);
  });

  it("can keep only events inside the current map bounds", () => {
    const bounds = { west: -124, south: 32, east: -114, north: 42 };
    expect(inBounds(sample[0], bounds)).toBe(true);
    expect(
      applyFilters(sample, { ...base, viewportOnly: true }, bounds).map((q) => q.id),
    ).toEqual(["a"]);
  });
});

describe("sort and summarize", () => {
  it("sorts strongest first and reports the peak event", () => {
    const sample = [
      quake({ id: "a", lat: 0, lon: 0, mag: 3, time: 2 }),
      quake({ id: "b", lat: 1, lon: 1, mag: 6, time: 1 }),
    ];
    expect(sortQuakes(sample, "strongest")[0].id).toBe("b");
    expect(summarize(sample).strongest?.id).toBe("b");
    expect(summarize(sample).count).toBe(2);
  });

  it("sorts nearest using haversine distance", () => {
    const sample = [
      quake({ id: "far", lat: 40, lon: 40 }),
      quake({ id: "near", lat: 10.2, lon: 10.1 }),
    ];
    const origin = { lat: 10, lon: 10 };
    expect(haversineKm(10, 10, 10.2, 10.1)).toBeLessThan(40);
    expect(sortQuakes(sample, "nearest", origin)[0].id).toBe("near");
  });
});
