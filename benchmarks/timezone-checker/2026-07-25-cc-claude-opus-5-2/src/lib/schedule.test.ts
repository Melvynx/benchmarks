import { describe, expect, it } from "vitest";
import { getCity, type City } from "../data/cities";
import { buildSchedule, type Mode } from "./schedule";

const city = (id: string): City => {
  const found = getCity(id);
  if (!found) throw new Error(`Unknown city in test: ${id}`);
  return found;
};

/** 2026-07-25 11:00 in San Francisco. Summer: SF −7, Denpasar +8, Geneva +2. */
const NOW = new Date("2026-07-25T18:00:00Z");
const DEFAULTS = { wake: 7, sleep: 23, now: NOW };

const hoursOf = (mask: readonly boolean[]) =>
  mask.flatMap((value, hour) => (value ? [hour] : []));

const run = (ids: string[], mode: Mode, overrides: Partial<typeof DEFAULTS> = {}) =>
  buildSchedule({ ...DEFAULTS, ...overrides, cities: ids.map(city), mode });

describe("buildSchedule — grid", () => {
  it("anchors columns to the reference city's own day", () => {
    const schedule = run(["san-francisco", "geneva"], "meeting");
    const reference = schedule.rows[0]!;
    expect(reference.cells.map((cell) => cell.localHour)).toEqual(
      Array.from({ length: 24 }, (_, hour) => hour),
    );
    expect(reference.isReference).toBe(true);
    expect(schedule.rows[1]!.isReference).toBe(false);
  });

  it("shifts other cities by their offset and flags the day change", () => {
    const geneva = run(["san-francisco", "geneva"], "meeting").rows[1]!;
    // Geneva is 9 hours ahead of San Francisco in July.
    expect(geneva.cells[0]!.localHour).toBe(9);
    expect(geneva.cells[0]!.dayDelta).toBe(0);
    expect(geneva.cells[15]!.localHour).toBe(0);
    expect(geneva.cells[15]!.dayDelta).toBe(1);
    expect(geneva.offsetMinutes).toBe(120);
  });

  it("keeps the minutes of fractional offsets", () => {
    const kathmandu = run(["san-francisco", "kathmandu"], "meeting").rows[1]!;
    expect(kathmandu.offsetMinutes).toBe(345);
    for (const cell of kathmandu.cells) expect(cell.localMinute).toBe(45);
    expect(kathmandu.cells[0]!.localHour).toBe(12);
  });

  it("marks the reference city's current hour", () => {
    expect(run(["san-francisco"], "meeting").nowRefHour).toBe(11);
  });

  it("labels cells sleeping, awake, or overlap", () => {
    const sanFrancisco = run(["san-francisco", "denpasar", "geneva"], "meeting").rows[0]!;
    expect(sanFrancisco.cells[3]!.state).toBe("sleeping"); // 3am, outside 7-23
    expect(sanFrancisco.cells[12]!.state).toBe("awake"); // awake, but Denpasar is asleep
    expect(sanFrancisco.cells[7]!.state).toBe("overlap");
  });
});

describe("buildSchedule — meeting mode", () => {
  it("keeps only hours where every city is awake, shared by all rows", () => {
    const schedule = run(["san-francisco", "denpasar", "geneva"], "meeting");
    expect(hoursOf(schedule.overlap.hours)).toEqual([7, 22]);
    expect(schedule.overlap.count).toBe(2);
    expect(schedule.overlap.ranges).toEqual([
      { start: 7, end: 8 },
      { start: 22, end: 23 },
    ]);
    for (const row of schedule.rows) {
      expect(hoursOf(row.overlapHours)).toEqual([7, 22]);
    }
  });

  it("reports zero overlap rather than inventing one", () => {
    const schedule = run(["san-francisco", "dubai"], "meeting", { wake: 9, sleep: 17 });
    expect(schedule.overlap.count).toBe(0);
    expect(schedule.overlap.ranges).toEqual([]);
  });

  it("falls back to the city's own awake hours when it is alone", () => {
    const schedule = run(["san-francisco"], "meeting");
    expect(schedule.overlap.count).toBe(16);
    expect(schedule.overlap.ranges).toEqual([{ start: 7, end: 23 }]);
  });

  it("re-anchors when a different city becomes the reference", () => {
    const schedule = run(["geneva", "san-francisco", "denpasar"], "meeting");
    expect(schedule.rows[0]!.city.id).toBe("geneva");
    // Same two real hours as before, expressed in Geneva time (+9 from SF).
    expect(hoursOf(schedule.overlap.hours)).toEqual([7, 16]);
  });
});

describe("buildSchedule — base mode", () => {
  it("gives each city its own window against the base", () => {
    const schedule = run(["san-francisco", "denpasar", "geneva"], "base");
    expect(hoursOf(schedule.rows[1]!.overlapHours)).toEqual([7, 16, 17, 18, 19, 20, 21, 22]);
    expect(hoursOf(schedule.rows[2]!.overlapHours)).toEqual([7, 8, 9, 10, 11, 12, 13, 22]);
    expect(schedule.rows[1]!.overlapCount).toBe(8);
    expect(schedule.rows[2]!.overlapCount).toBe(8);
  });

  it("shows the base city the union — the hours it can reach anyone", () => {
    const schedule = run(["san-francisco", "denpasar", "geneva"], "base");
    expect(hoursOf(schedule.rows[0]!.overlapHours)).toEqual([
      7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22,
    ]);
  });

  it("differs from meeting mode on the same city list", () => {
    const ids = ["san-francisco", "denpasar", "geneva"];
    const meeting = run(ids, "meeting").rows[1]!.overlapCount;
    const base = run(ids, "base").rows[1]!.overlapCount;
    expect(meeting).toBe(2);
    expect(base).toBe(8);
  });

  it("reports an empty window for a city that never matches the base", () => {
    const schedule = run(["san-francisco", "dubai"], "base", { wake: 9, sleep: 17 });
    expect(schedule.rows[1]!.overlapCount).toBe(0);
    expect(schedule.rows[1]!.overlapRanges).toEqual([]);
  });
});

describe("buildSchedule — edge cases", () => {
  it("returns an inert schedule with no cities", () => {
    const schedule = buildSchedule({ ...DEFAULTS, cities: [], mode: "meeting" });
    expect(schedule.rows).toEqual([]);
    expect(schedule.nowRefHour).toBeNull();
    expect(schedule.overlap.count).toBe(0);
  });

  it("supports an overnight awake window, reported as two same-day ranges", () => {
    const schedule = run(["san-francisco"], "meeting", { wake: 22, sleep: 6 });
    expect(hoursOf(schedule.rows[0]!.overlapHours)).toEqual([0, 1, 2, 3, 4, 5, 22, 23]);
    expect(schedule.overlap.ranges).toEqual([
      { start: 0, end: 6 },
      { start: 22, end: 24 },
    ]);
  });

  it("finds the overlap between an overnight and a daytime schedule", () => {
    // Denpasar wakes at 07:00 WITA, which is 16:00 the previous day in SF.
    const schedule = run(["san-francisco", "denpasar"], "base", { wake: 22, sleep: 6 });
    expect(hoursOf(schedule.rows[1]!.overlapHours)).toEqual([]);
    const daytime = run(["san-francisco", "denpasar"], "base");
    expect(daytime.rows[1]!.overlapCount).toBe(8);
  });

  it("applies winter offsets on a winter date", () => {
    const winter = run(["san-francisco", "denpasar", "geneva"], "meeting", {
      now: new Date("2026-01-15T19:00:00Z"),
    });
    expect(winter.rows[2]!.offsetMinutes).toBe(60); // Geneva back on CET
    expect(hoursOf(winter.overlap.hours)).toEqual([22]);
  });
});
