import { describe, expect, it } from "vitest";
import { getCity, searchCities } from "./cities";
import { buildGrid, toRanges } from "./grid";
import { formatOffset, formatTime, getOffsetMinutes, isHourAwake } from "./time";
import type { City, Settings } from "../types";

const city = (id: string) => getCity(id) as City;
const DEFAULTS: Settings = { wakeHour: 7, sleepHour: 23, timeFormat: "12h" };
// Mid-January: SF on PST (UTC−8), Geneva on CET (UTC+1), Denpasar UTC+8.
const WINTER = new Date("2026-01-15T20:00:00Z");
const SUMMER = new Date("2026-07-15T20:00:00Z");

describe("time math", () => {
  it("derives DST-aware offsets", () => {
    expect(getOffsetMinutes("America/Los_Angeles", WINTER)).toBe(-480);
    expect(getOffsetMinutes("America/Los_Angeles", SUMMER)).toBe(-420);
    expect(getOffsetMinutes("Europe/Zurich", SUMMER)).toBe(120);
  });

  it("supports fractional offsets", () => {
    expect(getOffsetMinutes("Asia/Kolkata", WINTER)).toBe(330);
    expect(getOffsetMinutes("Asia/Kathmandu", WINTER)).toBe(345);
    expect(formatOffset(345)).toBe("UTC+5:45");
    expect(formatOffset(-480)).toBe("UTC−8");
  });

  it("formats times", () => {
    expect(formatTime(0, "12h")).toBe("12am");
    expect(formatTime(12 * 60, "12h")).toBe("12pm");
    expect(formatTime(21 * 60 + 30, "12h")).toBe("9:30pm");
    expect(formatTime(9 * 60, "24h")).toBe("09:00");
  });

  it("handles overnight awake windows", () => {
    const night: Settings = { ...DEFAULTS, wakeHour: 22, sleepHour: 6 };
    expect(isHourAwake(23 * 60, night)).toBe(true);
    expect(isHourAwake(5 * 60, night)).toBe(true);
    expect(isHourAwake(6 * 60, night)).toBe(false);
    expect(isHourAwake(12 * 60, night)).toBe(false);
  });

  it("requires the full hour to be awake for half-hour offsets", () => {
    expect(isHourAwake(6 * 60 + 30, DEFAULTS)).toBe(false);
    expect(isHourAwake(7 * 60 + 30, DEFAULTS)).toBe(true);
    expect(isHourAwake(22 * 60 + 30, DEFAULTS)).toBe(false);
  });
});

describe("toRanges", () => {
  const mask = (hours: number[]) => Array.from({ length: 24 }, (_, h) => hours.includes(h));

  it("splits non-contiguous windows", () => {
    expect(toRanges(mask([9, 10, 11, 15]))).toEqual([
      { start: 9, end: 12 },
      { start: 15, end: 16 },
    ]);
  });

  it("merges windows wrapping midnight", () => {
    expect(toRanges(mask([0, 1, 5, 22, 23]))).toEqual([
      { start: 22, end: 26 },
      { start: 5, end: 6 },
    ]);
  });
});

describe("buildGrid", () => {
  const defaults = [city("san-francisco"), city("denpasar"), city("geneva")];

  it("computes a shared meeting window anchored to the reference city", () => {
    const grid = buildGrid(defaults, DEFAULTS, "meeting", WINTER);
    // 10pm SF = 2pm Denpasar = 7am Geneva is the only hour all three are awake.
    expect(grid.summary).toEqual({ kind: "meeting", hours: 1, ranges: [{ start: 22, end: 23 }] });
    const [sf, dps, gva] = grid.rows;
    expect(sf!.cells[22]!.state).toBe("overlap");
    expect(sf!.cells[21]!.state).toBe("awake");
    expect(sf!.cells[3]!.state).toBe("sleeping");
    expect(gva!.cells[22]!.localMinute).toBe(7 * 60);
    expect(dps!.cells[22]!.localMinute).toBe(14 * 60);
  });

  it("computes independent per-city overlap in base mode", () => {
    const grid = buildGrid(defaults, DEFAULTS, "base", WINTER);
    if (grid.summary?.kind !== "base") throw new Error("expected base summary");
    const [dps, gva] = grid.summary.entries;
    expect(dps!.hours).toBe(8);
    expect(gva!.hours).toBe(8);
    expect(dps!.ranges).not.toEqual(gva!.ranges);
  });

  it("marks the next local day", () => {
    const grid = buildGrid(defaults, DEFAULTS, "meeting", WINTER);
    const dps = grid.rows[1]!;
    expect(dps.cells[7]!.dayShift).toBe(0);
    expect(dps.cells[8]!.dayShift).toBe(1);
    expect(dps.cells[8]!.isLocalMidnight).toBe(true);
    expect(dps.cells[8]!.weekday).toBe("Fri");
  });

  it("has no summary for a single city", () => {
    expect(buildGrid([city("tokyo")], DEFAULTS, "meeting", WINTER).summary).toBeNull();
  });
});

describe("searchCities", () => {
  it("matches by name, accent-insensitive, and by country", () => {
    expect(searchCities("sao", [])[0]?.id).toBe("sao-paulo");
    expect(searchCities("japan", [])[0]?.id).toBe("tokyo");
    expect(searchCities("", ["tokyo"]).some((c) => c.id === "tokyo")).toBe(false);
  });
});
