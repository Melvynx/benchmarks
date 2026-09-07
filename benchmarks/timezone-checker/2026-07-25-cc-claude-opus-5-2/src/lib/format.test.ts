import { describe, expect, it } from "vitest";
import { formatClock, formatHourLabel, formatHourRange, formatTimeOfDay } from "./format";

describe("formatClock", () => {
  it("keeps 12h cells compact and carries the meridiem separately", () => {
    expect(formatClock(0, 0, "12h")).toEqual({ value: "12", meridiem: "AM" });
    expect(formatClock(9, 0, "12h")).toEqual({ value: "9", meridiem: "AM" });
    expect(formatClock(12, 0, "12h")).toEqual({ value: "12", meridiem: "PM" });
    expect(formatClock(23, 0, "12h")).toEqual({ value: "11", meridiem: "PM" });
  });

  it("shows minutes only for fractional offsets", () => {
    expect(formatClock(21, 30, "12h")).toEqual({ value: "9:30", meridiem: "PM" });
    expect(formatClock(5, 45, "24h")).toEqual({ value: "05:45" });
    expect(formatClock(5, 0, "24h")).toEqual({ value: "05" });
  });
});

describe("formatHourLabel", () => {
  it("renders both formats, treating 24 as midnight", () => {
    expect(formatHourLabel(0, "12h")).toBe("12 AM");
    expect(formatHourLabel(9, "12h")).toBe("9 AM");
    expect(formatHourLabel(13, "12h")).toBe("1 PM");
    expect(formatHourLabel(24, "12h")).toBe("12 AM");
    expect(formatHourLabel(9, "24h")).toBe("09:00");
    expect(formatHourLabel(24, "24h")).toBe("24:00");
  });
});

describe("formatHourRange", () => {
  it("is start-inclusive and end-exclusive", () => {
    expect(formatHourRange({ start: 9, end: 12 }, "12h")).toBe("9 AM → 12 PM");
    expect(formatHourRange({ start: 22, end: 24 }, "12h")).toBe("10 PM → 12 AM");
    expect(formatHourRange({ start: 9, end: 12 }, "24h")).toBe("09:00 → 12:00");
  });
});

describe("formatTimeOfDay", () => {
  it("always shows minutes", () => {
    expect(formatTimeOfDay(16, 7, "12h")).toBe("4:07 PM");
    expect(formatTimeOfDay(16, 0, "12h")).toBe("4:00 PM");
    expect(formatTimeOfDay(0, 5, "12h")).toBe("12:05 AM");
    expect(formatTimeOfDay(16, 7, "24h")).toBe("16:07");
  });
});
