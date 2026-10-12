import { describe, expect, it } from "vitest";
import { CITY_BY_ID, type City } from "./cities";
import { computeSchedule, isAwakeHour, maskToRanges } from "./schedule";
import { formatOffset, getOffsetMinutes } from "./time";

const city = (id: string): City => {
  const found = CITY_BY_ID.get(id);
  if (!found) throw new Error(`Unknown city ${id}`);
  return found;
};
const defaults = ["san-francisco", "denpasar", "geneva"].map(city);
const awake = { wake: 7, sleep: 23 };
const WINTER = new Date("2026-01-15T20:00:00Z");
const SUMMER = new Date("2026-07-15T20:00:00Z");

const mask = (hours: number[]) => Array.from({ length: 24 }, (_, hour) => hours.includes(hour));

describe("isAwakeHour", () => {
  it("handles same-day windows", () => {
    expect(isAwakeHour(7, awake)).toBe(true);
    expect(isAwakeHour(22, awake)).toBe(true);
    expect(isAwakeHour(23, awake)).toBe(false);
    expect(isAwakeHour(6, awake)).toBe(false);
  });

  it("handles overnight windows", () => {
    const nightShift = { wake: 22, sleep: 6 };
    expect(isAwakeHour(23, nightShift)).toBe(true);
    expect(isAwakeHour(3, nightShift)).toBe(true);
    expect(isAwakeHour(6, nightShift)).toBe(false);
    expect(isAwakeHour(12, nightShift)).toBe(false);
  });

  it("treats identical wake and sleep hours as awake all day", () => {
    expect(isAwakeHour(4, { wake: 8, sleep: 8 })).toBe(true);
  });
});

describe("maskToRanges", () => {
  it("splits non-contiguous windows", () => {
    expect(maskToRanges(mask([7, 16, 17, 18]))).toEqual([
      { start: 7, end: 8, hours: 1 },
      { start: 16, end: 19, hours: 3 },
    ]);
  });

  it("merges windows that wrap past midnight", () => {
    expect(maskToRanges(mask([22, 23, 0, 1]))).toEqual([{ start: 22, end: 2, hours: 4 }]);
  });

  it("handles empty and full days", () => {
    expect(maskToRanges(mask([]))).toEqual([]);
    expect(maskToRanges(mask([...Array(24).keys()]))).toEqual([{ start: 0, end: 24, hours: 24 }]);
  });
});

describe("offsets", () => {
  it("follows DST and supports fractional zones", () => {
    expect(getOffsetMinutes("America/Los_Angeles", WINTER)).toBe(-480);
    expect(getOffsetMinutes("America/Los_Angeles", SUMMER)).toBe(-420);
    expect(getOffsetMinutes("Asia/Kolkata", WINTER)).toBe(330);
    expect(getOffsetMinutes("Asia/Kathmandu", WINTER)).toBe(345);
    expect(formatOffset(345)).toBe("UTC+5:45");
    expect(formatOffset(-420)).toBe("UTC−7");
    expect(formatOffset(0)).toBe("UTC");
  });
});

describe("computeSchedule", () => {
  it("finds the shared window for the default cities in Meeting Mode", () => {
    const winter = computeSchedule({ cities: defaults, mode: "meeting", availability: awake, now: WINTER });
    expect(winter.sharedRanges).toEqual([{ start: 22, end: 23, hours: 1 }]);

    const summer = computeSchedule({ cities: defaults, mode: "meeting", availability: awake, now: SUMMER });
    expect(summer.sharedRanges).toEqual([
      { start: 7, end: 8, hours: 1 },
      { start: 22, end: 23, hours: 1 },
    ]);
    for (const row of summer.rows) {
      expect(row.cells[7]?.state).toBe("overlap");
      expect(row.cells[12]?.state).not.toBe("overlap");
    }
  });

  it("computes independent windows per city in Base Mode", () => {
    const schedule = computeSchedule({ cities: defaults, mode: "base", availability: awake, now: WINTER });
    const [ref, denpasar, geneva] = schedule.rows;
    expect(denpasar?.ranges).toEqual([{ start: 15, end: 23, hours: 8 }]);
    expect(geneva?.ranges).toEqual([
      { start: 7, end: 14, hours: 7 },
      { start: 22, end: 23, hours: 1 },
    ]);
    // The reference row lights up wherever it overlaps with anyone.
    expect(ref?.overlapHours).toBe(15);
  });

  it("maps fractional offsets onto local clock times", () => {
    const schedule = computeSchedule({
      cities: [city("london"), city("kathmandu")],
      mode: "meeting",
      availability: awake,
      now: WINTER,
    });
    const kathmandu = schedule.rows[1];
    expect(kathmandu?.cells[0]?.localMinutes).toBe(5 * 60 + 45);
    expect(kathmandu?.cells[0]?.localHour).toBe(5);
  });

  it("does not report overlap for a single city", () => {
    const schedule = computeSchedule({ cities: [city("tokyo")], mode: "meeting", availability: awake, now: WINTER });
    expect(schedule.sharedHours).toBe(0);
    expect(schedule.rows[0]?.cells.some((cell) => cell.state === "overlap")).toBe(false);
  });

  it("flags the first cell of each new local day", () => {
    const schedule = computeSchedule({ cities: defaults, mode: "meeting", availability: awake, now: WINTER });
    const geneva = schedule.rows[2];
    const dayStarts = geneva?.cells.filter((cell) => cell.startsDay) ?? [];
    expect(dayStarts).toHaveLength(1);
    expect(dayStarts[0]?.localHour).toBe(0);
  });
});
