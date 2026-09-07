import { describe, expect, it } from "vitest";
import { awakeWindowLength, countHours, isAwake, toHourRanges } from "./availability";

const mask = (...hours: number[]) =>
  Array.from({ length: 24 }, (_, hour) => hours.includes(hour));

describe("isAwake", () => {
  it("treats the window as start-inclusive, end-exclusive", () => {
    expect(isAwake(7, 7, 23)).toBe(true);
    expect(isAwake(22, 7, 23)).toBe(true);
    expect(isAwake(23, 7, 23)).toBe(false);
    expect(isAwake(6, 7, 23)).toBe(false);
  });

  it("wraps past midnight for night shifts", () => {
    expect(isAwake(22, 22, 6)).toBe(true);
    expect(isAwake(2, 22, 6)).toBe(true);
    expect(isAwake(6, 22, 6)).toBe(false);
    expect(isAwake(12, 22, 6)).toBe(false);
  });

  it("counts an empty boundary as always awake", () => {
    for (let hour = 0; hour < 24; hour++) expect(isAwake(hour, 9, 9)).toBe(true);
  });
});

describe("awakeWindowLength", () => {
  it("measures both ordinary and overnight windows", () => {
    expect(awakeWindowLength(7, 23)).toBe(16);
    expect(awakeWindowLength(22, 6)).toBe(8);
    expect(awakeWindowLength(0, 1)).toBe(1);
    expect(awakeWindowLength(9, 9)).toBe(24);
  });
});

describe("toHourRanges", () => {
  it("collapses contiguous hours, end exclusive", () => {
    expect(toHourRanges(mask(9, 10, 11))).toEqual([{ start: 9, end: 12 }]);
  });

  it("splits non-contiguous windows", () => {
    expect(toHourRanges(mask(7, 22))).toEqual([
      { start: 7, end: 8 },
      { start: 22, end: 23 },
    ]);
  });

  it("closes a run that reaches the end of the day at 24", () => {
    expect(toHourRanges(mask(22, 23))).toEqual([{ start: 22, end: 24 }]);
  });

  it("does not wrap 23 into 0 — the grid shows one reference day", () => {
    expect(toHourRanges(mask(0, 1, 23))).toEqual([
      { start: 0, end: 2 },
      { start: 23, end: 24 },
    ]);
  });

  it("handles the empty and full cases", () => {
    expect(toHourRanges(mask())).toEqual([]);
    expect(toHourRanges(Array.from({ length: 24 }, () => true))).toEqual([{ start: 0, end: 24 }]);
  });
});

describe("countHours", () => {
  it("counts truthy hours", () => {
    expect(countHours(mask(1, 2, 3))).toBe(3);
    expect(countHours(mask())).toBe(0);
  });
});
