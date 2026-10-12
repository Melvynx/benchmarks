import { describe, expect, it } from "vitest";
import {
  clockParts,
  formatClock,
  formatRelativeOffset,
  formatShortDate,
  formatUtcOffset,
  getUtcOffsetMinutes,
  weekdayOf,
} from "@/lib/time";

describe("getUtcOffsetMinutes", () => {
  it("follows daylight saving time", () => {
    const winter = new Date("2026-01-15T12:00:00Z");
    const summer = new Date("2026-07-15T12:00:00Z");
    expect(getUtcOffsetMinutes("America/Los_Angeles", winter)).toBe(-480);
    expect(getUtcOffsetMinutes("America/Los_Angeles", summer)).toBe(-420);
    expect(getUtcOffsetMinutes("Europe/Zurich", winter)).toBe(60);
    expect(getUtcOffsetMinutes("Europe/Zurich", summer)).toBe(120);
    // Southern hemisphere runs DST the other way round.
    expect(getUtcOffsetMinutes("Australia/Sydney", winter)).toBe(660);
    expect(getUtcOffsetMinutes("Australia/Sydney", summer)).toBe(600);
  });

  it("supports fractional offsets", () => {
    const date = new Date("2026-03-01T00:00:00Z");
    expect(getUtcOffsetMinutes("Asia/Kolkata", date)).toBe(330);
    expect(getUtcOffsetMinutes("Asia/Kathmandu", date)).toBe(345);
    expect(getUtcOffsetMinutes("Asia/Tehran", date)).toBe(210);
    expect(getUtcOffsetMinutes("Asia/Makassar", date)).toBe(480);
  });
});

describe("formatting", () => {
  it("formats UTC offsets", () => {
    expect(formatUtcOffset(0)).toBe("UTC");
    expect(formatUtcOffset(480)).toBe("UTC+8");
    expect(formatUtcOffset(-420)).toBe("UTC−7");
    expect(formatUtcOffset(345)).toBe("UTC+5:45");
    expect(formatUtcOffset(-150)).toBe("UTC−2:30");
  });

  it("formats offsets relative to the reference", () => {
    expect(formatRelativeOffset(0)).toBe("same time");
    expect(formatRelativeOffset(900)).toBe("+15h");
    expect(formatRelativeOffset(-150)).toBe("−2h 30m");
    expect(formatRelativeOffset(45)).toBe("+45m");
  });

  it("formats clock times in both formats", () => {
    expect(formatClock(0, "12h")).toBe("12am");
    expect(formatClock(9 * 60, "12h")).toBe("9am");
    expect(formatClock(12 * 60, "12h")).toBe("12pm");
    expect(formatClock(21 * 60 + 30, "12h")).toBe("9:30pm");
    expect(formatClock(9 * 60, "24h")).toBe("09:00");
    expect(formatClock(23 * 60 + 45, "24h")).toBe("23:45");
    expect(formatClock(24 * 60 + 60, "24h")).toBe("01:00");
  });

  it("splits clock parts for grid cells", () => {
    expect(clockParts(13 * 60, "12h")).toEqual({ time: "1", period: "pm" });
    expect(clockParts(5 * 60 + 45, "12h")).toEqual({ time: "5:45", period: "am" });
    expect(clockParts(5 * 60, "24h")).toEqual({ time: "05", period: "" });
    expect(clockParts(-30, "24h")).toEqual({ time: "23:30", period: "" });
  });

  it("derives weekdays and short dates across month boundaries", () => {
    const date = { year: 2026, month: 9, day: 30 };
    expect(weekdayOf(date)).toBe("Wed");
    expect(weekdayOf(date, 1)).toBe("Thu");
    expect(weekdayOf(date, -1)).toBe("Tue");
    expect(formatShortDate(date)).toBe("Wed, Sep 30");
  });
});
