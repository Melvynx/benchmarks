import { describe, expect, it } from "vitest";
import { CITIES } from "./cities";
import { getUtcOffsetMinutes, getWallClock } from "./timezone";

describe("getUtcOffsetMinutes", () => {
  const summer = new Date("2026-07-01T12:00:00Z");
  const winter = new Date("2026-01-15T12:00:00Z");

  it("follows daylight saving time", () => {
    expect(getUtcOffsetMinutes("America/Los_Angeles", summer)).toBe(-7 * 60);
    expect(getUtcOffsetMinutes("America/Los_Angeles", winter)).toBe(-8 * 60);
    expect(getUtcOffsetMinutes("Europe/Zurich", summer)).toBe(2 * 60);
    expect(getUtcOffsetMinutes("Europe/Zurich", winter)).toBe(60);
    expect(getUtcOffsetMinutes("Australia/Sydney", summer)).toBe(10 * 60);
    expect(getUtcOffsetMinutes("Australia/Sydney", winter)).toBe(11 * 60);
  });

  it("supports fractional offsets", () => {
    expect(getUtcOffsetMinutes("Asia/Kolkata", summer)).toBe(5 * 60 + 30);
    expect(getUtcOffsetMinutes("Asia/Kathmandu", summer)).toBe(5 * 60 + 45);
    expect(getUtcOffsetMinutes("Australia/Adelaide", winter)).toBe(10 * 60 + 30);
  });

  it("handles zones without DST", () => {
    expect(getUtcOffsetMinutes("Asia/Makassar", summer)).toBe(8 * 60);
    expect(getUtcOffsetMinutes("Asia/Makassar", winter)).toBe(8 * 60);
    expect(getUtcOffsetMinutes("Pacific/Honolulu", winter)).toBe(-10 * 60);
  });

  it("resolves every catalog timezone", () => {
    for (const city of CITIES) {
      const offset = getUtcOffsetMinutes(city.timeZone, summer);
      expect(Number.isFinite(offset), city.id).toBe(true);
      expect(Math.abs(offset)).toBeLessThanOrEqual(14 * 60);
    }
  });
});

describe("getWallClock", () => {
  it("shifts the instant into local wall-clock time", () => {
    const clock = getWallClock(new Date("2026-10-14T23:30:00Z"), 5 * 60 + 30);
    expect(clock).toEqual({ year: 2026, month: 9, day: 15, weekday: 4, minutesOfDay: 5 * 60 });
  });
});
