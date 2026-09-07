import { describe, expect, it } from "vitest";

import { compassBearing, haversineKm, normalizeLon, withinBounds } from "./geo";

describe("haversineKm", () => {
  it("is zero for identical points", () => {
    expect(haversineKm(35.68, 139.69, 35.68, 139.69)).toBe(0);
  });

  it("measures a known great-circle distance", () => {
    // Tokyo → San Francisco, ~8270 km.
    expect(haversineKm(35.68, 139.69, 37.77, -122.42)).toBeCloseTo(8270, -2);
  });

  it("takes the short way across the antimeridian", () => {
    // 1° of longitude at the equator is ~111 km, even spanning 179.5 → -179.5.
    expect(haversineKm(0, 179.5, 0, -179.5)).toBeCloseTo(111.2, 0);
  });

  it("is symmetric", () => {
    const ab = haversineKm(-33.86, 151.21, -41.29, 174.78);
    const ba = haversineKm(-41.29, 174.78, -33.86, 151.21);
    expect(ab).toBeCloseTo(ba, 9);
  });
});

describe("compassBearing", () => {
  it("names the cardinal directions", () => {
    expect(compassBearing(0, 0, 10, 0)).toBe("N");
    expect(compassBearing(0, 0, -10, 0)).toBe("S");
    expect(compassBearing(0, 0, 0, 10)).toBe("E");
    expect(compassBearing(0, 0, 0, -10)).toBe("W");
  });

  it("resolves intercardinal points", () => {
    expect(compassBearing(0, 0, 10, 10)).toBe("NE");
    expect(compassBearing(0, 0, -10, 10)).toBe("SE");
  });

  it("always returns one of the sixteen points", () => {
    const points = new Set([
      "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
      "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
    ]);
    for (let deg = 0; deg < 360; deg += 7) {
      const lat = Math.cos((deg * Math.PI) / 180) * 5;
      const lon = Math.sin((deg * Math.PI) / 180) * 5;
      expect(points.has(compassBearing(0, 0, lat, lon))).toBe(true);
    }
  });
});

describe("normalizeLon", () => {
  it("wraps into [-180, 180)", () => {
    expect(normalizeLon(0)).toBe(0);
    expect(normalizeLon(190)).toBe(-170);
    expect(normalizeLon(-190)).toBe(170);
    expect(normalizeLon(540)).toBe(-180);
    expect(normalizeLon(-45)).toBe(-45);
  });
});

describe("withinBounds", () => {
  const box = { west: -10, south: -10, east: 10, north: 10 };

  it("accepts interior points and rejects outside ones", () => {
    expect(withinBounds(0, 0, box)).toBe(true);
    expect(withinBounds(9.9, -9.9, box)).toBe(true);
    expect(withinBounds(20, 0, box)).toBe(false);
    expect(withinBounds(0, 20, box)).toBe(false);
  });

  it("handles a viewport straddling the antimeridian", () => {
    const straddling = { west: 170, south: -20, east: -170, north: 20 };
    expect(withinBounds(0, 175, straddling)).toBe(true);
    expect(withinBounds(0, -175, straddling)).toBe(true);
    expect(withinBounds(0, 180, straddling)).toBe(true);
    expect(withinBounds(0, 0, straddling)).toBe(false);
    expect(withinBounds(0, 160, straddling)).toBe(false);
  });

  it("accepts everything when the viewport wraps the whole globe", () => {
    const worldwide = { west: -400, south: -85, east: 400, north: 85 };
    expect(withinBounds(0, 0, worldwide)).toBe(true);
    expect(withinBounds(0, 179, worldwide)).toBe(true);
    expect(withinBounds(0, -179, worldwide)).toBe(true);
  });

  it("still rejects on latitude even for a globe-wide longitude span", () => {
    expect(withinBounds(88, 0, { west: -400, south: -85, east: 400, north: 85 })).toBe(false);
  });

  it("accepts un-normalised longitudes from a panned map", () => {
    // MapLibre reports lon > 180 after panning east past the antimeridian.
    expect(withinBounds(0, 5, { west: 350, south: -10, east: 370, north: 10 })).toBe(true);
  });
});
