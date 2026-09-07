import { describe, expect, it } from "vitest";
import { formatUtcOffset, getUtcOffsetMinutes, getZonedParts, zonedTimeToInstant } from "./time";
import { CITIES } from "../data/cities";

const WINTER = new Date("2026-01-15T12:00:00Z");
const SUMMER = new Date("2026-07-15T12:00:00Z");

describe("getUtcOffsetMinutes", () => {
  it("follows northern-hemisphere DST", () => {
    expect(getUtcOffsetMinutes("America/Los_Angeles", WINTER)).toBe(-480);
    expect(getUtcOffsetMinutes("America/Los_Angeles", SUMMER)).toBe(-420);
    expect(getUtcOffsetMinutes("Europe/Zurich", WINTER)).toBe(60);
    expect(getUtcOffsetMinutes("Europe/Zurich", SUMMER)).toBe(120);
  });

  it("follows southern-hemisphere DST, which runs the other way", () => {
    expect(getUtcOffsetMinutes("Australia/Sydney", WINTER)).toBe(660);
    expect(getUtcOffsetMinutes("Australia/Sydney", SUMMER)).toBe(600);
  });

  it("handles fractional offsets", () => {
    expect(getUtcOffsetMinutes("Asia/Kolkata", SUMMER)).toBe(330);
    expect(getUtcOffsetMinutes("Asia/Kathmandu", SUMMER)).toBe(345);
  });

  it("handles zones without DST", () => {
    expect(getUtcOffsetMinutes("Asia/Makassar", WINTER)).toBe(480);
    expect(getUtcOffsetMinutes("Asia/Makassar", SUMMER)).toBe(480);
  });
});

describe("zonedTimeToInstant", () => {
  it("round-trips every hour of the day in every catalog zone", () => {
    for (const city of CITIES) {
      for (let hour = 0; hour < 24; hour++) {
        const instant = zonedTimeToInstant(city.zone, 2026, 7, 25, hour);
        expect(getZonedParts(city.zone, instant).hour, `${city.zone} @ ${hour}`).toBe(hour);
      }
    }
  });

  it("resolves the wall time that DST skips to the hour that actually exists", () => {
    // 2026-03-08 02:00 never happens in New York — the clock jumps 02:00 -> 03:00.
    const instant = zonedTimeToInstant("America/New_York", 2026, 3, 8, 2);
    expect(getZonedParts("America/New_York", instant).hour).toBe(3);
  });

  it("picks the first pass through an hour that DST repeats", () => {
    // 2026-11-01 01:00 happens twice in New York; the earlier one is EDT.
    const instant = zonedTimeToInstant("America/New_York", 2026, 11, 1, 1);
    expect(instant.toISOString()).toBe("2026-11-01T05:00:00.000Z");
  });

  it("stays correct on either side of a transition day", () => {
    const before = zonedTimeToInstant("Europe/Zurich", 2026, 3, 29, 1);
    const after = zonedTimeToInstant("Europe/Zurich", 2026, 3, 29, 4);
    expect(before.toISOString()).toBe("2026-03-29T00:00:00.000Z");
    expect(after.toISOString()).toBe("2026-03-29T02:00:00.000Z");
  });
});

describe("formatUtcOffset", () => {
  it("renders whole, fractional, negative and zero offsets", () => {
    expect(formatUtcOffset(0)).toBe("UTC");
    expect(formatUtcOffset(-420)).toBe("UTC−7");
    expect(formatUtcOffset(330)).toBe("UTC+5:30");
    expect(formatUtcOffset(345)).toBe("UTC+5:45");
    expect(formatUtcOffset(-210)).toBe("UTC−3:30");
  });
});

describe("catalog", () => {
  it("has unique ids and resolvable IANA zones", () => {
    const ids = new Set(CITIES.map((city) => city.id));
    expect(ids.size).toBe(CITIES.length);
    for (const city of CITIES) {
      expect(() => getZonedParts(city.zone, SUMMER)).not.toThrow();
    }
  });

  it("covers every region and the documented defaults", () => {
    expect(CITIES.length).toBe(35);
    expect(new Set(CITIES.map((city) => city.region)).size).toBe(7);
    const ids = CITIES.map((city) => city.id);
    for (const id of ["san-francisco", "denpasar", "geneva"]) expect(ids).toContain(id);
  });
});
