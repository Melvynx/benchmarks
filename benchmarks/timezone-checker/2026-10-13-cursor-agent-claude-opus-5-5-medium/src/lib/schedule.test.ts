import { describe, expect, it } from "vitest";
import { getCity, type City } from "./cities";
import { buildSchedule, isAwake, toRanges } from "./schedule";
import { formatTime, formatUtcOffset, getUtcOffsetMinutes } from "./time";

const city = (id: string): City => {
  const found = getCity(id);
  if (!found) throw new Error(`Unknown city ${id}`);
  return found;
};

const flags = (...hours: number[]) => Array.from({ length: 24 }, (_, h) => hours.includes(h));

describe("isAwake", () => {
  it("handles a same-day window", () => {
    const w = { wakeHour: 7, sleepHour: 23 };
    expect(isAwake(6 * 60 + 59, w)).toBe(false);
    expect(isAwake(7 * 60, w)).toBe(true);
    expect(isAwake(22 * 60 + 59, w)).toBe(true);
    expect(isAwake(23 * 60, w)).toBe(false);
  });

  it("handles an overnight window", () => {
    const w = { wakeHour: 22, sleepHour: 6 };
    expect(isAwake(23 * 60, w)).toBe(true);
    expect(isAwake(5 * 60, w)).toBe(true);
    expect(isAwake(6 * 60, w)).toBe(false);
    expect(isAwake(12 * 60, w)).toBe(false);
  });

  it("treats wake === sleep as awake all day", () => {
    expect(isAwake(3 * 60, { wakeHour: 8, sleepHour: 8 })).toBe(true);
  });
});

describe("toRanges", () => {
  it("splits non-contiguous windows", () => {
    expect(toRanges(flags(7, 22))).toEqual([
      { start: 7, end: 8, length: 1 },
      { start: 22, end: 23, length: 1 },
    ]);
  });

  it("merges runs that cross midnight", () => {
    expect(toRanges(flags(22, 23, 0, 1, 9))).toEqual([
      { start: 9, end: 10, length: 1 },
      { start: 22, end: 2, length: 4 },
    ]);
  });

  it("handles a full day and empty input", () => {
    expect(toRanges(flags(...Array.from({ length: 24 }, (_, h) => h)))).toEqual([
      { start: 0, end: 0, length: 24 },
    ]);
    expect(toRanges(flags())).toEqual([]);
  });
});

describe("buildSchedule", () => {
  // October: San Francisco PDT (−7), Denpasar WITA (+8), Geneva CEST (+2)
  const defaults = [
    { city: city("san-francisco"), offsetMinutes: -7 * 60 },
    { city: city("denpasar"), offsetMinutes: 8 * 60 },
    { city: city("geneva"), offsetMinutes: 2 * 60 },
  ];

  it("finds the shared meeting window", () => {
    const s = buildSchedule({ cities: defaults, mode: "meeting", wakeHour: 7, sleepHour: 23 });
    expect(s.meeting.total).toBe(2);
    expect(s.meeting.ranges).toEqual([
      { start: 7, end: 8, length: 1 },
      { start: 22, end: 23, length: 1 },
    ]);
    for (const row of s.rows) {
      expect(row.cells[7]?.status).toBe("overlap");
      expect(row.cells[12]?.status).not.toBe("overlap");
    }
    expect(s.rows[1]?.cells[0]?.localMinutes).toBe(15 * 60);
    expect(s.rows[1]?.cells[9]?.isNewDay).toBe(true);
    expect(s.rows[1]?.cells[9]?.dayShift).toBe(1);
  });

  it("computes independent overlaps in base mode", () => {
    const s = buildSchedule({ cities: defaults, mode: "base", wakeHour: 7, sleepHour: 23 });
    const [ref, denpasar, geneva] = s.rows;
    expect(ref?.baseOverlap).toBeNull();
    expect(denpasar?.baseOverlap?.ranges).toEqual([
      { start: 7, end: 8, length: 1 },
      { start: 16, end: 23, length: 7 },
    ]);
    expect(geneva?.baseOverlap?.ranges).toEqual([
      { start: 7, end: 14, length: 7 },
      { start: 22, end: 23, length: 1 },
    ]);
    expect(denpasar?.cells[18]?.status).toBe("overlap");
    expect(geneva?.cells[18]?.status).toBe("asleep");
    expect(ref?.cells[10]?.status).toBe("overlap");
  });

  it("supports fractional offsets", () => {
    const s = buildSchedule({
      cities: [
        { city: city("london"), offsetMinutes: 0 },
        { city: city("kathmandu"), offsetMinutes: 5 * 60 + 45 },
      ],
      mode: "meeting",
      wakeHour: 9,
      sleepHour: 17,
    });
    expect(s.rows[1]?.cells[3]?.localMinutes).toBe(8 * 60 + 45);
    expect(s.rows[1]?.cells[3]?.status).toBe("asleep");
    expect(s.meeting.ranges).toEqual([{ start: 9, end: 12, length: 3 }]);
  });

  it("does not highlight overlap with a single city", () => {
    const s = buildSchedule({ cities: defaults.slice(0, 1), mode: "meeting", wakeHour: 7, sleepHour: 23 });
    expect(s.canCompare).toBe(false);
    expect(s.rows[0]?.cells.some((c) => c.status === "overlap")).toBe(false);
  });
});

describe("time helpers", () => {
  it("derives DST-aware offsets", () => {
    expect(getUtcOffsetMinutes("America/Los_Angeles", new Date("2026-07-01T12:00:00Z"))).toBe(-420);
    expect(getUtcOffsetMinutes("America/Los_Angeles", new Date("2026-01-01T12:00:00Z"))).toBe(-480);
    expect(getUtcOffsetMinutes("Asia/Kolkata", new Date("2026-01-01T12:00:00Z"))).toBe(330);
    expect(getUtcOffsetMinutes("Asia/Kathmandu", new Date("2026-01-01T12:00:00Z"))).toBe(345);
  });

  it("formats offsets and times", () => {
    expect(formatUtcOffset(330)).toBe("UTC+5:30");
    expect(formatUtcOffset(-420)).toBe("UTC−7");
    expect(formatTime(0, "12h")).toBe("12am");
    expect(formatTime(12 * 60, "12h")).toBe("12pm");
    expect(formatTime(21 * 60 + 30, "12h")).toBe("9:30pm");
    expect(formatTime(9 * 60, "24h")).toBe("09:00");
  });
});
