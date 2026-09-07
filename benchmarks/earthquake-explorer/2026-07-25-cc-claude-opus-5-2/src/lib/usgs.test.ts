import { describe, expect, it } from "vitest";

import { feedUrl, parseFeature, parseFeed } from "./usgs";

/** Sentinel so a test can pass an explicit `null` geometry without it being defaulted away. */
const DEFAULT_GEOMETRY = Symbol("default-geometry");

type RawFeature = Parameters<typeof parseFeature>[0];

const feature = (
  overrides: Record<string, unknown> = {},
  geometry: unknown = DEFAULT_GEOMETRY,
): RawFeature => ({
  id: "us7000abcd",
  properties: {
    mag: 5.2,
    place: "68 km SSW of Whitehorse, Canada",
    title: "M 5.2 - 68 km SSW of Whitehorse, Canada",
    time: 1_700_000_000_000,
    updated: 1_700_000_060_000,
    tsunami: 1,
    sig: 640,
    felt: 12,
    cdi: 4.2,
    mmi: null,
    alert: "GREEN",
    status: "reviewed",
    type: "earthquake",
    magType: "mww",
    nst: 41,
    gap: 88,
    dmin: 0.4,
    rms: 0.71,
    net: "us",
    url: "https://example.test/event",
    ...overrides,
  },
  geometry: (geometry === DEFAULT_GEOMETRY
    ? { type: "Point", coordinates: [-135.2, 60.1, 12.4] }
    : geometry) as RawFeature["geometry"],
});

describe("parseFeature", () => {
  it("maps a well-formed feature onto the domain model", () => {
    const quake = parseFeature(feature());
    expect(quake).not.toBeNull();
    expect(quake).toMatchObject({
      id: "us7000abcd",
      mag: 5.2,
      lon: -135.2,
      lat: 60.1,
      depth: 12.4,
      tsunami: true,
      alert: "green",
      felt: 12,
      net: "us",
    });
  });

  it("defaults depth to 0 when the third ordinate is absent", () => {
    expect(parseFeature(feature({}, { type: "Point", coordinates: [10, 20] }))?.depth).toBe(0);
  });

  it("drops events without a magnitude, position, id or time", () => {
    expect(parseFeature(feature({ mag: null }))).toBeNull();
    expect(parseFeature(feature({ time: null }))).toBeNull();
    expect(parseFeature({ ...feature(), id: undefined })).toBeNull();
    expect(parseFeature(feature({}, { type: "Point", coordinates: [] }))).toBeNull();
    expect(parseFeature(feature({}, null))).toBeNull();
  });

  it("rejects out-of-range latitudes rather than plotting them wrongly", () => {
    expect(parseFeature(feature({}, { type: "Point", coordinates: [10, 120, 5] }))).toBeNull();
  });

  it("normalises an unknown alert level to null", () => {
    expect(parseFeature(feature({ alert: "chartreuse" }))?.alert).toBeNull();
    expect(parseFeature(feature({ alert: null }))?.alert).toBeNull();
  });

  it("keeps negative depths, which shallow events genuinely report", () => {
    expect(parseFeature(feature({}, { type: "Point", coordinates: [1, 2, -1.3] }))?.depth).toBe(-1.3);
  });
});

describe("parseFeed", () => {
  it("sorts newest first and skips unusable features", () => {
    const result = parseFeed({
      metadata: { generated: 1_700_000_100_000, title: "Test feed" },
      features: [
        feature({ time: 100 }),
        { ...feature({ time: 300 }), id: "b" },
        feature({ mag: null, time: 200 }),
        { ...feature({ time: 200 }), id: "c" },
      ],
    });

    expect(result.quakes.map((q) => q.time)).toEqual([300, 200, 100]);
    expect(result.generated).toBe(1_700_000_100_000);
    expect(result.title).toBe("Test feed");
  });

  it("throws on a payload that is not a feature collection", () => {
    expect(() => parseFeed({ nope: true })).toThrow(/feature collection/i);
  });
});

describe("feedUrl", () => {
  it("points at the documented USGS summary feeds", () => {
    expect(feedUrl("hour")).toBe(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
    );
    expect(feedUrl("week")).toContain("all_week.geojson");
    expect(feedUrl("month")).toContain("2.5_month.geojson");
  });
});
