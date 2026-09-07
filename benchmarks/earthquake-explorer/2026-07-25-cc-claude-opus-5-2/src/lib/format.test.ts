import { describe, expect, it } from "vitest";

import {
  depthLabel,
  energyJoules,
  latLabel,
  lonLabel,
  magnitudeLabel,
  mmiDescriptor,
  mmiRoman,
  relativeTime,
  shortDuration,
  splitPlace,
  titleCase,
  tntEquivalent,
  utcTime,
} from "./format";

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

describe("relativeTime", () => {
  it("steps through the units", () => {
    expect(relativeTime(0, 30_000)).toBe("just now");
    expect(relativeTime(0, 12 * MINUTE)).toBe("12m ago");
    expect(relativeTime(0, 3 * HOUR + 5 * MINUTE)).toBe("3h ago");
    expect(relativeTime(0, DAY)).toBe("1d ago");
    expect(relativeTime(0, 6 * DAY)).toBe("6d ago");
  });

  it("clamps clock skew instead of printing a negative age", () => {
    expect(relativeTime(1000, 0)).toBe("just now");
  });
});

describe("shortDuration", () => {
  it("picks the coarsest sensible unit", () => {
    expect(shortDuration(90_000)).toBe("2m");
    expect(shortDuration(5 * HOUR)).toBe("5h");
    expect(shortDuration(30 * DAY)).toBe("30d");
  });
});

describe("numeric labels", () => {
  it("always shows one magnitude decimal", () => {
    expect(magnitudeLabel(5)).toBe("5.0");
    expect(magnitudeLabel(-0.42)).toBe("-0.4");
  });

  it("keeps precision for shallow depths only", () => {
    expect(depthLabel(3.42)).toBe("3.4 km");
    expect(depthLabel(35.6)).toBe("36 km");
  });

  it("renders hemispheres rather than signs", () => {
    expect(latLabel(-17.4821)).toBe("17.482° S");
    expect(latLabel(60.1)).toBe("60.100° N");
    expect(lonLabel(-135.25)).toBe("135.250° W");
    expect(lonLabel(139.6917)).toBe("139.692° E");
  });
});

describe("utcTime", () => {
  it("formats in UTC regardless of the host timezone", () => {
    // 2023-11-14T22:13:20Z
    expect(utcTime(1_700_000_000_000)).toBe("14 Nov 2023, 22:13 UTC");
  });
});

describe("energy", () => {
  it("follows Gutenberg–Richter: +1 magnitude ≈ 31.6× the energy", () => {
    expect(energyJoules(5) / energyJoules(4)).toBeCloseTo(10 ** 1.5, 6);
    expect(energyJoules(0)).toBeCloseTo(10 ** 4.8, 6);
  });

  it("scales the TNT unit with the magnitude", () => {
    expect(tntEquivalent(0)).toMatch(/g of TNT$/);
    expect(tntEquivalent(2)).toMatch(/kg of TNT$/);
    expect(tntEquivalent(4)).toMatch(/tons of TNT$/);
    expect(tntEquivalent(6)).toMatch(/kilotons of TNT$/);
    expect(tntEquivalent(9)).toMatch(/megatons of TNT$/);
  });
});

describe("Modified Mercalli helpers", () => {
  it("maps intensity to the ShakeMap descriptor", () => {
    expect(mmiDescriptor(1)).toBe("Not felt");
    expect(mmiDescriptor(4.4)).toBe("Light");
    expect(mmiDescriptor(6.5)).toBe("Very strong");
    expect(mmiDescriptor(10)).toBe("Extreme");
  });

  it("renders roman numerals within the I–XII scale", () => {
    expect(mmiRoman(0)).toBe("I");
    expect(mmiRoman(4)).toBe("IV");
    expect(mmiRoman(9.6)).toBe("X");
    expect(mmiRoman(40)).toBe("XII");
  });
});

describe("splitPlace", () => {
  it("separates the distance prefix from the region", () => {
    expect(splitPlace("68 km SSW of Whitehorse, Canada")).toEqual({
      prefix: "68 km SSW",
      region: "Whitehorse, Canada",
    });
    expect(splitPlace("7.5 km NE of Pāhala, Hawaii")).toEqual({
      prefix: "7.5 km NE",
      region: "Pāhala, Hawaii",
    });
  });

  it("leaves region-only places untouched", () => {
    expect(splitPlace("Southern Alaska")).toEqual({ prefix: null, region: "Southern Alaska" });
    expect(splitPlace("off the coast of Oregon")).toEqual({
      prefix: null,
      region: "off the coast of Oregon",
    });
  });
});

describe("titleCase", () => {
  it("sentence-cases an event type token", () => {
    expect(titleCase("quarry blast")).toBe("Quarry blast");
    expect(titleCase("")).toBe("");
  });
});
