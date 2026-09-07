import { describe, expect, it } from "vitest";

import {
  RAMPS,
  colorExpression,
  hexToRgb,
  mixHex,
  quakeColor,
  radiusExpression,
  rampGradient,
  sampleStops,
  stopPositions,
} from "./color";
import type { Quake } from "./usgs";

const stops = [
  { at: 0, color: "#000000" },
  { at: 10, color: "#ffffff" },
];

describe("mixHex", () => {
  it("interpolates channel-wise and clamps t", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#000000", "#ffffff", -3)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 42)).toBe("#ffffff");
  });

  it("expands three-digit hex", () => {
    expect(hexToRgb("#f0a")).toEqual({ r: 255, g: 0, b: 170 });
  });
});

describe("sampleStops", () => {
  it("returns the endpoints outside the domain", () => {
    expect(sampleStops(stops, -5)).toBe("#000000");
    expect(sampleStops(stops, 99)).toBe("#ffffff");
  });

  it("interpolates inside the domain", () => {
    expect(sampleStops(stops, 5)).toBe("#808080");
  });

  it("is monotonic in brightness across the magnitude ramp", () => {
    const luminance = (hex: string) => {
      const { r, g, b } = hexToRgb(hex);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    // Not strictly monotonic by design, but every step must remain visible on
    // a near-black basemap.
    for (let mag = 0; mag <= 8; mag += 0.25) {
      expect(luminance(sampleStops(RAMPS.magnitude.stops, mag))).toBeGreaterThan(70);
    }
  });
});

describe("stopPositions", () => {
  it("spans 0 to 1 for a linear ramp", () => {
    const positions = stopPositions(RAMPS.magnitude);
    expect(positions[0]).toBe(0);
    expect(positions[positions.length - 1]).toBe(1);
  });

  it("spreads a log-age ramp so the first hour is not a sliver", () => {
    const positions = stopPositions(RAMPS.recency);
    expect(positions[0]).toBe(0);
    expect(positions[positions.length - 1]).toBeCloseTo(1, 10);
    // "1 hour" would sit at 0.14 % on a linear 30-day axis; log spreads it out.
    expect(positions[1]).toBeGreaterThan(0.35);
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });
});

describe("rampGradient", () => {
  it("emits one colour stop per ramp stop", () => {
    const gradient = rampGradient(RAMPS.depth);
    expect(gradient.startsWith("linear-gradient(90deg,")).toBe(true);
    expect(gradient.split(",").length - 1).toBe(RAMPS.depth.stops.length);
  });
});

describe("quakeColor", () => {
  const quake = { mag: 4.5, depth: 35, time: 1000 } as Quake;

  it("reads the property matching the active mode", () => {
    expect(quakeColor("magnitude", quake, 1000)).toBe("#facc15");
    expect(quakeColor("depth", quake, 1000)).toBe("#fb923c");
    // 1 hour after the event lands exactly on the recency ramp's "1h" stop.
    expect(quakeColor("recency", quake, 1000 + 3_600_000)).toBe("#fde047");
  });

  it("treats a future-dated event as brand new rather than clamping oddly", () => {
    expect(quakeColor("recency", quake, 0)).toBe(RAMPS.recency.stops[0].color);
  });
});

describe("map expressions", () => {
  it("keys the colour expression off the right feature property", () => {
    expect(colorExpression("magnitude")[2]).toEqual(["get", "mag"]);
    expect(colorExpression("depth")[2]).toEqual(["get", "depth"]);
    expect(colorExpression("recency")[2]).toEqual(["get", "age"]);
  });

  it("pairs every ramp stop with its colour", () => {
    const expr = colorExpression("magnitude");
    const stopCount = RAMPS.magnitude.stops.length;
    expect(expr.length).toBe(3 + stopCount * 2);
  });

  it("scales the radius ramp without changing its shape", () => {
    const base = radiusExpression();
    const doubled = radiusExpression(2);
    // [ "interpolate", ["linear"], ["zoom"], 0, <byMag>, ... ]
    expect(doubled[4][4]).toBeCloseTo(base[4][4] * 2);
    expect(doubled[4][12]).toBeCloseTo(base[4][12] * 2);
  });

  it("folds tap-target padding into every stop, keeping zoom at the top level", () => {
    const base = radiusExpression();
    const padded = radiusExpression(1, 7);
    expect(padded[2]).toEqual(["zoom"]); // must stay the direct interpolate input
    for (const zoomStop of [4, 6, 8, 10]) {
      for (const magStop of [4, 6, 8, 10, 12]) {
        expect(padded[zoomStop][magStop]).toBeCloseTo(base[zoomStop][magStop] + 7);
      }
    }
  });
});
