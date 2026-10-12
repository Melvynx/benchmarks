import { describe, expect, it } from "vitest";
import { compute, isAwake, toRanges, formatRange, utcOffsetMinutes } from "./time";

const s = { wake: 7, sleep: 23, format: "12h" as const };

describe("time math", () => {
  it("handles overnight windows", () => {
    const n = { ...s, wake: 22, sleep: 6 };
    expect(isAwake(23, n)).toBe(true);
    expect(isAwake(3, n)).toBe(true);
    expect(isAwake(12, n)).toBe(false);
  });
  it("merges ranges across midnight", () => {
    const flags = Array.from({ length: 24 }, (_, h) => h >= 22 || h < 2);
    expect(toRanges(flags)).toEqual([{ start: 22, end: 2 }]);
  });
  it("formats ranges", () => {
    expect(formatRange({ start: 9, end: 12 }, "12h")).toBe("9am — 12pm");
  });
  it("supports fractional offsets", () => {
    expect(utcOffsetMinutes("Asia/Kolkata")).toBe(330);
    expect(utcOffsetMinutes("Asia/Kathmandu")).toBe(345);
  });
  it("computes meeting vs base overlap", () => {
    const cities = [{ id: "a", offset: 0 }, { id: "b", offset: 480 }, { id: "c", offset: -480 }];
    const m = compute(cities, s, "meeting");
    expect(m.meeting.count).toBe(0);
    expect(m.perCity.b.count).toBeGreaterThan(0);
  });
});
