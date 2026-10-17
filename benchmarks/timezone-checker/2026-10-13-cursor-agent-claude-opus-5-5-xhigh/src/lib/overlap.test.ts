import { describe, expect, it } from "vitest";
import { type City, getCity } from "./cities";
import { awakeDuration, buildSchedule, isAwake, type ScheduleInput, toRanges } from "./overlap";

const city = (id: string): City => {
  const found = getCity(id);
  if (!found) throw new Error(`Unknown city ${id}`);
  return found;
};

/** San Francisco (PDT), Denpasar, Geneva (CEST) — the defaults, as of October. */
const DEFAULTS = [
  { city: city("san-francisco"), offsetMinutes: -7 * 60 },
  { city: city("denpasar"), offsetMinutes: 8 * 60 },
  { city: city("geneva"), offsetMinutes: 2 * 60 },
];

const hoursOf = (flags: boolean[]) => flags.flatMap((flag, hour) => (flag ? [hour] : []));

const schedule = (overrides: Partial<ScheduleInput> = {}) =>
  buildSchedule({ cities: DEFAULTS, wakeHour: 7, sleepHour: 23, mode: "meeting", ...overrides });

describe("isAwake", () => {
  it("uses an inclusive wake and exclusive sleep hour", () => {
    expect(isAwake(7 * 60, 7, 23)).toBe(true);
    expect(isAwake(22 * 60 + 59, 7, 23)).toBe(true);
    expect(isAwake(23 * 60, 7, 23)).toBe(false);
    expect(isAwake(6 * 60 + 30, 7, 23)).toBe(false);
  });

  it("supports overnight windows", () => {
    expect(isAwake(22 * 60, 22, 6)).toBe(true);
    expect(isAwake(3 * 60, 22, 6)).toBe(true);
    expect(isAwake(6 * 60, 22, 6)).toBe(false);
    expect(isAwake(12 * 60, 22, 6)).toBe(false);
    expect(awakeDuration(22, 6)).toBe(8);
  });

  it("treats identical wake and sleep hours as awake all day", () => {
    expect(isAwake(4 * 60, 9, 9)).toBe(true);
    expect(awakeDuration(9, 9)).toBe(24);
  });
});

describe("toRanges", () => {
  it("splits non-contiguous windows", () => {
    const flags = Array.from({ length: 24 }, (_, hour) => hour === 7 || hour === 22);
    expect(toRanges(flags)).toEqual([
      { start: 7, length: 1 },
      { start: 22, length: 1 },
    ]);
  });

  it("merges a window that wraps past midnight", () => {
    const flags = Array.from({ length: 24 }, (_, hour) => hour >= 22 || hour < 2 || hour === 10);
    expect(toRanges(flags)).toEqual([
      { start: 10, length: 1 },
      { start: 22, length: 4 },
    ]);
  });

  it("returns a single full-day range", () => {
    expect(toRanges(Array(24).fill(true))).toEqual([{ start: 0, length: 24 }]);
    expect(toRanges(Array(24).fill(false))).toEqual([]);
  });
});

describe("buildSchedule — meeting mode", () => {
  it("anchors every column to the reference city's hours", () => {
    const { rows } = schedule();
    const [sf, denpasar, geneva] = rows;
    expect(sf?.isReference).toBe(true);
    expect(sf?.cells[9]?.minutesOfDay).toBe(9 * 60);
    expect(denpasar?.cells[9]?.minutesOfDay).toBe(0);
    expect(denpasar?.cells[9]?.dayOffset).toBe(1);
    expect(denpasar?.cells[9]?.startsNewDay).toBe(true);
    expect(geneva?.cells[9]?.minutesOfDay).toBe(18 * 60);
  });

  it("finds hours where everyone is awake", () => {
    const { rows, summary } = schedule();
    expect(summary).toMatchObject({
      kind: "meeting",
      total: 2,
      ranges: [
        { start: 7, length: 1 },
        { start: 22, length: 1 },
      ],
    });
    for (const row of rows) {
      expect(hoursOf(row.cells.map((cell) => cell.overlap))).toEqual([7, 22]);
    }
  });

  it("reports zero overlap with the closest partial windows", () => {
    const { summary } = schedule({ wakeHour: 9, sleepHour: 17 });
    if (summary?.kind !== "meeting") throw new Error("expected meeting summary");
    expect(summary.total).toBe(0);
    expect(summary.ranges).toEqual([]);
    expect(summary.closest.length).toBeGreaterThan(0);
    for (const window of summary.closest) {
      expect(window.awakeCount).toBe(2);
      expect(window.asleep).toHaveLength(1);
    }
  });

  it("skips the summary with fewer than two cities", () => {
    const { rows, summary } = schedule({ cities: DEFAULTS.slice(0, 1) });
    expect(rows).toHaveLength(1);
    expect(summary).toBeNull();
    expect(rows[0]?.cells.some((cell) => cell.overlap)).toBe(false);
  });

  it("handles fractional offsets", () => {
    const { rows } = schedule({
      cities: [
        { city: city("london"), offsetMinutes: 60 },
        { city: city("kathmandu"), offsetMinutes: 5 * 60 + 45 },
      ],
    });
    expect(rows[1]?.cells[0]?.minutesOfDay).toBe(4 * 60 + 45);
    expect(rows[1]?.diffMinutes).toBe(4 * 60 + 45);
  });
});

describe("buildSchedule — base mode", () => {
  it("computes each city's overlap against the reference only", () => {
    const { rows, summary } = schedule({ mode: "base" });
    if (summary?.kind !== "base") throw new Error("expected base summary");

    const [denpasar, geneva] = summary.entries;
    expect(denpasar).toMatchObject({ total: 8, ranges: [{ start: 7, length: 1 }, { start: 16, length: 7 }] });
    expect(geneva).toMatchObject({ total: 8, ranges: [{ start: 7, length: 7 }, { start: 22, length: 1 }] });

    expect(hoursOf(rows[1]!.cells.map((cell) => cell.overlap))).toEqual([7, 16, 17, 18, 19, 20, 21, 22]);
    expect(hoursOf(rows[2]!.cells.map((cell) => cell.overlap))).toEqual([7, 8, 9, 10, 11, 12, 13, 22]);
    // The reference row shows the union of everyone's overlap.
    expect(hoursOf(rows[0]!.cells.map((cell) => cell.overlap))).toEqual([7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22]);
  });

  it("flags individual cities with no overlap", () => {
    const { summary } = schedule({
      mode: "base",
      wakeHour: 9,
      sleepHour: 17,
      cities: [DEFAULTS[0]!, DEFAULTS[1]!],
    });
    if (summary?.kind !== "base") throw new Error("expected base summary");
    expect(summary.entries[0]).toMatchObject({ total: 0, ranges: [] });
  });
});
