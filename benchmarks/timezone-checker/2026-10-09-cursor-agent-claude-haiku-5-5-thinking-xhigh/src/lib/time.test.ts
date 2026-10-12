import { describe, expect, it } from "vitest";
import {
  formatClock,
  formatHourRange,
  formatUtcOffset,
  getUtcOffsetMinutes,
  wrapMinutes,
} from "./time";

// Fixed instant so DST-dependent expectations are deterministic.
const OCT_2026 = new Date("2026-10-09T12:00:00Z");

describe("getUtcOffsetMinutes", () => {
  it("resolves DST for the given date", () => {
    expect(getUtcOffsetMinutes("America/Los_Angeles", OCT_2026)).toBe(-420); // PDT
    expect(getUtcOffsetMinutes("America/Los_Angeles", new Date("2026-12-09T12:00:00Z"))).toBe(-480); // PST
  });

  it("supports fractional offsets", () => {
    expect(getUtcOffsetMinutes("Asia/Kolkata", OCT_2026)).toBe(330);
    expect(getUtcOffsetMinutes("Asia/Kathmandu", OCT_2026)).toBe(345);
    expect(getUtcOffsetMinutes("Asia/Tehran", OCT_2026)).toBe(210);
  });

  it("handles zones west of UTC without DST", () => {
    expect(getUtcOffsetMinutes("Pacific/Honolulu", OCT_2026)).toBe(-600);
  });
});

describe("formatUtcOffset", () => {
  it("formats whole, negative, fractional and zero offsets", () => {
    expect(formatUtcOffset(-420)).toBe("UTC−7");
    expect(formatUtcOffset(480)).toBe("UTC+8");
    expect(formatUtcOffset(345)).toBe("UTC+5:45");
    expect(formatUtcOffset(-210)).toBe("UTC−3:30");
    expect(formatUtcOffset(0)).toBe("UTC+0");
  });
});

describe("wrapMinutes", () => {
  it("wraps into one day in both directions", () => {
    expect(wrapMinutes(-30)).toBe(1410);
    expect(wrapMinutes(1500)).toBe(60);
    expect(wrapMinutes(0)).toBe(0);
  });
});

describe("formatClock", () => {
  it("formats 12h full labels", () => {
    expect(formatClock(0, "12h", "full")).toBe("12am");
    expect(formatClock(9 * 60, "12h", "full")).toBe("9am");
    expect(formatClock(12 * 60, "12h", "full")).toBe("12pm");
    expect(formatClock(13 * 60 + 5, "12h", "full")).toBe("1:05pm");
  });

  it("formats 12h compact labels for grid cells", () => {
    expect(formatClock(0, "12h", "compact")).toBe("12a");
    expect(formatClock(17 * 60, "12h", "compact")).toBe("5p");
    expect(formatClock(5 * 60 + 30, "12h", "compact")).toBe("5:30a");
  });

  it("formats 24h labels", () => {
    expect(formatClock(7 * 60, "24h", "full")).toBe("07:00");
    expect(formatClock(7 * 60, "24h", "compact")).toBe("07");
    expect(formatClock(5 * 60 + 30, "24h", "compact")).toBe("05:30");
    expect(formatClock(23 * 60, "24h", "full")).toBe("23:00");
  });
});

describe("formatHourRange", () => {
  it("uses inclusive start and exclusive end", () => {
    expect(formatHourRange({ startHour: 9, hourCount: 3 }, "12h")).toBe("9am — 12pm");
  });

  it("renders ranges that cross midnight", () => {
    expect(formatHourRange({ startHour: 22, hourCount: 4 }, "12h")).toBe("10pm — 2am");
    expect(formatHourRange({ startHour: 23, hourCount: 1 }, "12h")).toBe("11pm — 12am");
  });

  it("renders a full day", () => {
    expect(formatHourRange({ startHour: 0, hourCount: 24 }, "12h")).toBe("All day");
  });
});
