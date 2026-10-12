import { describe, expect, it } from "vitest";
import { CITIES, DEFAULT_CITY_IDS } from "../data/cities";
import { formatClock, formatOffset, formatRange } from "./format";
import { awakeHourMask, baseMask, isAwake, localParts, maskToRanges, meetingMask } from "./schedule";
import { filterCities } from "./search";
import { sanitizeState } from "./storage";
import { offsetMinutes } from "./time";

const sep = new Date("2026-09-22T18:00:00Z");

describe("offsets", () => {
  it("handles DST and fractional offsets", () => {
    expect(offsetMinutes("America/Los_Angeles", sep)).toBe(-420);
    expect(offsetMinutes("Europe/Zurich", sep)).toBe(120);
    expect(offsetMinutes("Asia/Makassar", sep)).toBe(480);
    expect(offsetMinutes("Asia/Kolkata", sep)).toBe(330);
    expect(offsetMinutes("Asia/Kathmandu", sep)).toBe(345);
    expect(offsetMinutes("Asia/Tehran", sep)).toBe(210);
    expect(offsetMinutes("Australia/Adelaide", sep)).toBe(570);
    expect(offsetMinutes("America/New_York", new Date("2026-01-15T18:00:00Z"))).toBe(-300);
    expect(offsetMinutes("America/New_York", new Date("2026-07-15T18:00:00Z"))).toBe(-240);
    expect(offsetMinutes("Australia/Adelaide", new Date("2026-01-15T18:00:00Z"))).toBe(630);
  });

  it("parses every catalog zone", () => {
    expect(CITIES).toHaveLength(34);
    expect(new Set(CITIES.map((city) => city.id)).size).toBe(34);
    for (const city of CITIES) {
      expect(Number.isInteger(offsetMinutes(city.timeZone, sep))).toBe(true);
    }
  });
});

describe("local time", () => {
  it("shifts by whole and fractional hours", () => {
    expect(localParts(0, 0, 9)).toEqual({ hour: 9, minute: 0 });
    expect(localParts(-420, 480, 7)).toEqual({ hour: 22, minute: 0 });
    expect(localParts(0, 330, 9)).toEqual({ hour: 14, minute: 30 });
    expect(localParts(0, 345, 9)).toEqual({ hour: 14, minute: 45 });
    expect(localParts(0, 330, 20)).toEqual({ hour: 1, minute: 30 });
    expect(localParts(60, -120, 1)).toEqual({ hour: 22, minute: 0 });
  });
});

describe("awake window", () => {
  it("treats sleep as an exclusive end and wraps overnight", () => {
    expect(isAwake(7, 7, 23)).toBe(true);
    expect(isAwake(22, 7, 23)).toBe(true);
    expect(isAwake(23, 7, 23)).toBe(false);
    expect(isAwake(6, 7, 23)).toBe(false);
    expect(isAwake(22, 22, 6)).toBe(true);
    expect(isAwake(5, 22, 6)).toBe(true);
    expect(isAwake(6, 22, 6)).toBe(false);
    expect(isAwake(12, 22, 6)).toBe(false);
    expect(awakeHourMask(7, 7).every(Boolean)).toBe(true);
  });
});

describe("ranges", () => {
  it("merges contiguous hours, including across midnight", () => {
    const mask = (hours: number[]) => Array.from({ length: 24 }, (_, hour) => hours.includes(hour));
    expect(maskToRanges(mask([]))).toEqual([]);
    expect(maskToRanges(mask([9, 10, 11]))).toEqual([{ start: 9, end: 12 }]);
    expect(maskToRanges(mask([22, 23, 0, 1]))).toEqual([{ start: 22, end: 2 }]);
    expect(maskToRanges(mask([23, 0]))).toEqual([{ start: 23, end: 1 }]);
    expect(maskToRanges(mask([0, 1, 3, 4, 22, 23]))).toEqual([
      { start: 3, end: 5 },
      { start: 22, end: 2 },
    ]);
    expect(maskToRanges(Array(24).fill(true))).toEqual([{ start: 0, end: 24 }]);
  });
});

describe("overlap", () => {
  it("finds the default San Francisco, Denpasar, and Geneva window", () => {
    const offsets = [-420, 480, 120];
    const mask = meetingMask(offsets, 7, 23);
    const hours = mask.flatMap((on, hour) => (on ? [hour] : []));
    expect(hours).toEqual([7, 22]);
    expect(maskToRanges(mask)).toEqual([
      { start: 7, end: 8 },
      { start: 22, end: 23 },
    ]);
  });

  it("compares each city only with the base", () => {
    expect(maskToRanges(baseMask(-420, 480, 7, 23))).toEqual([
      { start: 7, end: 8 },
      { start: 16, end: 23 },
    ]);
    expect(maskToRanges(baseMask(-420, 120, 7, 23))).toEqual([
      { start: 7, end: 14 },
      { start: 22, end: 23 },
    ]);
  });

  it("uses the local hour for half-hour offsets", () => {
    const mask = meetingMask([0, 330], 9, 17);
    expect(mask.flatMap((on, hour) => (on ? [hour] : []))).toEqual([9, 10, 11]);
    expect(maskToRanges(mask)).toEqual([{ start: 9, end: 12 }]);
  });
});

describe("format", () => {
  it("formats hours, ranges, and offsets", () => {
    expect(formatClock(0, 0, "12")).toBe("12am");
    expect(formatClock(12, 0, "12")).toBe("12pm");
    expect(formatClock(15, 30, "12")).toBe("3:30pm");
    expect(formatClock(9, 0, "24", true)).toBe("09");
    expect(formatClock(21, 45, "24")).toBe("21:45");
    expect(formatRange({ start: 9, end: 12 }, "12")).toBe("9am – 12pm");
    expect(formatRange({ start: 22, end: 6 }, "12")).toBe("10pm – 6am");
    expect(formatRange({ start: 0, end: 24 }, "24")).toBe("All day");
    expect(formatRange({ start: 22, end: 24 }, "24")).toBe("22:00 – 24:00");
    expect(formatOffset(-420)).toBe("UTC−7");
    expect(formatOffset(330)).toBe("UTC+5:30");
    expect(formatOffset(345)).toBe("UTC+5:45");
    expect(formatOffset(0)).toBe("UTC+0");
  });
});

describe("search and storage", () => {
  it("matches city or country without accents", () => {
    expect(filterCities("sao").map((city) => city.id)).toEqual(["sao-paulo"]);
    expect(filterCities("indonesia").map((city) => city.id)).toEqual(["denpasar"]);
    expect(filterCities("zzz")).toEqual([]);
  });

  it("restores defaults and drops unknown cities", () => {
    expect(sanitizeState(null).cityIds).toEqual(DEFAULT_CITY_IDS);
    expect(
      sanitizeState({
        cityIds: ["geneva", "nope", "geneva", "mumbai"],
        mode: "base",
        wake: 22,
        sleep: 6,
        format: "24",
      }),
    ).toEqual({
      cityIds: ["geneva", "mumbai"],
      mode: "base",
      wake: 22,
      sleep: 6,
      format: "24",
    });
    expect(sanitizeState({ cityIds: [], mode: "nope", wake: 99 }).cityIds).toEqual([]);
    expect(sanitizeState({ cityIds: ["nope"] }).cityIds).toEqual(DEFAULT_CITY_IDS);
  });
});
