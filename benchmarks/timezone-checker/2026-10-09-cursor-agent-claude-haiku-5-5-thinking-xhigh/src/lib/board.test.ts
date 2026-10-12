import { describe, expect, it } from "vitest";
import { buildBoard } from "./board";
import { getCityById } from "./cities";

// 2026-10-09 12:00 UTC: San Francisco is UTC−7 (PDT), Denpasar UTC+8, Geneva UTC+2 (CEST).
const NOW = new Date("2026-10-09T12:00:00Z");
const DAY = { wakeHour: 7, sleepHour: 23 };

const cities = (...ids: string[]) => ids.map((id) => {
  const city = getCityById(id);
  if (!city) throw new Error(`unknown city ${id}`);
  return city;
});

const DEFAULT_TRIO = cities("san-francisco", "denpasar", "geneva");

describe("buildBoard: meeting mode", () => {
  it("finds the hours when all three default cities are awake", () => {
    const board = buildBoard({ cities: DEFAULT_TRIO, mode: "meeting", window: DAY, now: NOW });

    expect(board.summary).toEqual({
      kind: "meeting",
      result: {
        hours: 2,
        ranges: [
          { startHour: 7, hourCount: 1 },
          { startHour: 22, hourCount: 1 },
        ],
      },
    });
  });

  it("shares the same overlap across every row", () => {
    const board = buildBoard({ cities: DEFAULT_TRIO, mode: "meeting", window: DAY, now: NOW });
    const [first, ...rest] = board.rows;
    for (const row of rest) expect(row.overlap).toEqual(first.overlap);
  });

  it("reports zero overlap when the awake window doesn't line up", () => {
    const board = buildBoard({
      cities: DEFAULT_TRIO,
      mode: "meeting",
      window: { wakeHour: 9, sleepHour: 9 },
      now: NOW,
    });
    expect(board.summary).toEqual({ kind: "meeting", result: { hours: 0, ranges: [] } });
  });

  it("returns no summary for a single city", () => {
    const board = buildBoard({
      cities: cities("tokyo"),
      mode: "meeting",
      window: DAY,
      now: NOW,
    });
    expect(board.summary).toBeNull();
    expect(board.rows[0].overlap.some(Boolean)).toBe(false);
  });
});

describe("buildBoard: base mode", () => {
  it("compares each non-reference city only against the reference", () => {
    const board = buildBoard({ cities: DEFAULT_TRIO, mode: "base", window: DAY, now: NOW });
    if (board.summary?.kind !== "base") throw new Error("expected base summary");

    const [denpasar, geneva] = board.summary.entries;
    expect(denpasar.city.id).toBe("denpasar");
    expect(denpasar.result).toEqual({
      hours: 8,
      ranges: [
        { startHour: 7, hourCount: 1 },
        { startHour: 16, hourCount: 7 },
      ],
    });
    expect(geneva.city.id).toBe("geneva");
    expect(geneva.result).toEqual({
      hours: 8,
      ranges: [
        { startHour: 7, hourCount: 7 },
        { startHour: 22, hourCount: 1 },
      ],
    });
  });

  it("leaves the reference row unhighlighted", () => {
    const board = buildBoard({ cities: DEFAULT_TRIO, mode: "base", window: DAY, now: NOW });
    expect(board.rows[0].overlap.some(Boolean)).toBe(false);
  });

  it("gives each row its own highlight", () => {
    const board = buildBoard({ cities: DEFAULT_TRIO, mode: "base", window: DAY, now: NOW });
    expect(board.rows[1].overlap).not.toEqual(board.rows[2].overlap);
  });
});

describe("buildBoard: fractional offsets", () => {
  it("never counts a half-asleep hour in India (+5:30)", () => {
    // Mumbai is +12:30 from San Francisco. Reference 9:00 spans 21:30–22:30 there,
    // awake. Reference 10:00 spans 22:30–23:30 there, which includes 23:00 asleep.
    const board = buildBoard({
      cities: cities("san-francisco", "mumbai"),
      mode: "base",
      window: DAY,
      now: NOW,
    });
    if (board.summary?.kind !== "base") throw new Error("expected base summary");

    const [mumbai] = board.summary.entries;
    expect(mumbai.result.ranges).toEqual([
      { startHour: 7, hourCount: 3 },
      { startHour: 19, hourCount: 4 },
    ]);
  });
});

describe("buildBoard: now marker", () => {
  it("points at the reference city's current hour", () => {
    const board = buildBoard({ cities: DEFAULT_TRIO, mode: "meeting", window: DAY, now: NOW });
    // 12:00 UTC is 05:00 in San Francisco.
    expect(board.nowHour).toBe(5);
  });

  it("is null without cities", () => {
    const board = buildBoard({ cities: [], mode: "meeting", window: DAY, now: NOW });
    expect(board.nowHour).toBeNull();
    expect(board.rows).toEqual([]);
  });
});
