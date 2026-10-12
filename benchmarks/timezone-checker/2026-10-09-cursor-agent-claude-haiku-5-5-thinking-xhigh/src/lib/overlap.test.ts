import { describe, expect, it } from "vitest";
import {
  buildSlots,
  countAwakeHours,
  isAwakeHour,
  meetingOverlap,
  pairOverlap,
  summarizeOverlap,
  toHourRanges,
} from "./overlap";

const DAY = { wakeHour: 7, sleepHour: 23 };
const NIGHT_SHIFT = { wakeHour: 22, sleepHour: 6 };

const hoursWhere = (predicate: (hour: number) => boolean) =>
  Array.from({ length: 24 }, (_, hour) => predicate(hour));

describe("isAwakeHour", () => {
  it("treats the sleep hour as asleep in a daytime window", () => {
    expect(isAwakeHour(6, DAY)).toBe(false);
    expect(isAwakeHour(7, DAY)).toBe(true);
    expect(isAwakeHour(22, DAY)).toBe(true);
    expect(isAwakeHour(23, DAY)).toBe(false);
  });

  it("supports overnight windows", () => {
    expect(isAwakeHour(21, NIGHT_SHIFT)).toBe(false);
    expect(isAwakeHour(22, NIGHT_SHIFT)).toBe(true);
    expect(isAwakeHour(0, NIGHT_SHIFT)).toBe(true);
    expect(isAwakeHour(5, NIGHT_SHIFT)).toBe(true);
    expect(isAwakeHour(6, NIGHT_SHIFT)).toBe(false);
  });

  it("treats equal wake and sleep as an empty window", () => {
    expect(isAwakeHour(7, { wakeHour: 7, sleepHour: 7 })).toBe(false);
    expect(isAwakeHour(0, { wakeHour: 7, sleepHour: 7 })).toBe(false);
  });
});

describe("countAwakeHours", () => {
  it("counts daytime, overnight and empty windows", () => {
    expect(countAwakeHours(DAY)).toBe(16);
    expect(countAwakeHours(NIGHT_SHIFT)).toBe(8);
    expect(countAwakeHours({ wakeHour: 3, sleepHour: 3 })).toBe(0);
  });
});

describe("buildSlots", () => {
  it("matches the awake window for whole-hour offsets", () => {
    const slots = buildSlots(0, DAY);
    expect(slots.map((slot) => slot.awake)).toEqual(hoursWhere((h) => h >= 7 && h < 23));
  });

  it("maps reference hours onto the city's clock", () => {
    // Denpasar is +15h from San Francisco: reference 9:00 is 0:00 there.
    const slots = buildSlots(15 * 60, DAY);
    expect(slots[0].localStart).toBe(15 * 60);
    expect(slots[9].localStart).toBe(0);
  });

  it("only marks a fractional slot awake when both of its hours are awake", () => {
    // India is +12:30 from San Francisco. Reference 10:00 spans 22:30–23:30 there.
    const slots = buildSlots(12 * 60 + 30, DAY);
    expect(slots[10].awake).toBe(false); // 23:00 falls inside it
    expect(slots[9].awake).toBe(true); // 21:30–22:30 is fully awake
    expect(slots[19].awake).toBe(true); // 7:30–8:30 is fully awake
  });
});

describe("toHourRanges", () => {
  it("returns nothing when no hour is set", () => {
    expect(toHourRanges(hoursWhere(() => false))).toEqual([]);
  });

  it("returns one full-day range when every hour is set", () => {
    expect(toHourRanges(hoursWhere(() => true))).toEqual([{ startHour: 0, hourCount: 24 }]);
  });

  it("separates non-contiguous runs", () => {
    expect(toHourRanges(hoursWhere((h) => h === 7 || h === 22))).toEqual([
      { startHour: 7, hourCount: 1 },
      { startHour: 22, hourCount: 1 },
    ]);
  });

  it("keeps a run that crosses midnight as one range", () => {
    expect(toHourRanges(hoursWhere((h) => [22, 23, 0, 1].includes(h)))).toEqual([
      { startHour: 22, hourCount: 4 },
    ]);
  });
});

describe("meetingOverlap and pairOverlap", () => {
  it("requires every city to be awake", () => {
    // Second city is +7h: awake at reference hours 0..15. Reference is awake 7..22.
    const shared = meetingOverlap([buildSlots(0, DAY), buildSlots(7 * 60, DAY)]);
    expect(shared).toEqual(hoursWhere((h) => h >= 7 && h <= 15));
  });

  it("requires both the reference and the other city to be awake", () => {
    // Other city is -5h: awake at reference hours 12..23 and 0..3.
    // Intersected with the reference's 7..22 gives 12..22.
    const pair = pairOverlap(buildSlots(0, DAY), buildSlots(-5 * 60, DAY));
    expect(pair).toEqual(hoursWhere((h) => h >= 12 && h <= 22));
  });
});

describe("summarizeOverlap", () => {
  it("counts hours and reports ranges together", () => {
    expect(summarizeOverlap(hoursWhere((h) => h >= 9 && h < 12))).toEqual({
      hours: 3,
      ranges: [{ startHour: 9, hourCount: 3 }],
    });
  });
});
