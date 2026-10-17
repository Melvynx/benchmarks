import { describe, expect, it } from "vitest";
import {
  formatCellLabel,
  formatClock,
  formatHour,
  formatLocalRange,
  formatOffsetDiff,
  formatRange,
  formatUtcOffset,
} from "./format";

describe("format", () => {
  it("formats hours in 12h and 24h", () => {
    expect(formatHour(0, "12h")).toBe("12am");
    expect(formatHour(12, "12h")).toBe("12pm");
    expect(formatHour(15, "12h")).toBe("3pm");
    expect(formatHour(24, "12h")).toBe("12am");
    expect(formatHour(7, "24h")).toBe("07:00");
  });

  it("formats ranges as inclusive start to exclusive end", () => {
    expect(formatRange({ start: 9, length: 3 }, "12h")).toBe("9am — 12pm");
    expect(formatRange({ start: 22, length: 4 }, "24h")).toBe("22:00 — 02:00");
    expect(formatRange({ start: 0, length: 24 }, "12h")).toBe("All day");
  });

  it("translates a window into another city's local time", () => {
    expect(formatLocalRange({ start: 9, length: 2 }, 5 * 60 + 30, "12h")).toBe("2:30pm — 4:30pm");
    expect(formatLocalRange({ start: 1, length: 1 }, -3 * 60, "24h")).toBe("22:00 — 23:00");
  });

  it("formats clocks and cell labels", () => {
    expect(formatClock(16 * 60 + 5, "12h", true)).toBe("4:05pm");
    expect(formatClock(16 * 60, "12h")).toBe("4pm");
    expect(formatClock(16 * 60, "24h")).toBe("16:00");
    expect(formatCellLabel(14 * 60 + 45, "12h")).toEqual({ hour: "2", minutes: "45", meridiem: "pm" });
    expect(formatCellLabel(0, "12h")).toEqual({ hour: "12", minutes: null, meridiem: "am" });
    expect(formatCellLabel(0, "24h")).toEqual({ hour: "00", minutes: null, meridiem: null });
    expect(formatCellLabel(9 * 60 + 30, "24h")).toEqual({ hour: "09", minutes: "30", meridiem: null });
  });

  it("formats offsets", () => {
    expect(formatUtcOffset(-7 * 60)).toBe("UTC−7");
    expect(formatUtcOffset(5 * 60 + 45)).toBe("UTC+5:45");
    expect(formatUtcOffset(0)).toBe("UTC+0");
    expect(formatOffsetDiff(15 * 60)).toBe("+15h");
    expect(formatOffsetDiff(-(3 * 60 + 30))).toBe("−3h 30m");
  });
});
