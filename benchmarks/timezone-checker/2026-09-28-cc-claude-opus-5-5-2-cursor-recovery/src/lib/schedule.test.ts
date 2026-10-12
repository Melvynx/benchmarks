import { describe, expect, it } from "vitest";
import { type City, getCity } from "@/data/cities";
import { awakeHourCount, buildSchedule, formatHourRange, isAwake, toRanges } from "@/lib/schedule";

const city = (id: string): City => {
  const found = getCity(id);
  if (!found) throw new Error(`Unknown city ${id}`);
  return found;
};

// Offsets as of late September: SF is on PDT, Geneva on CEST.
const OFFSETS = new Map([
  ["san-francisco", -420],
  ["denpasar", 480],
  ["geneva", 120],
  ["mumbai", 330],
  ["new-york", -240],
  ["london", 60],
]);
const DAY = { wakeHour: 7, sleepHour: 23 };

describe("isAwake", () => {
  it("handles a regular day", () => {
    expect(isAwake(6, DAY)).toBe(false);
    expect(isAwake(7, DAY)).toBe(true);
    expect(isAwake(22, DAY)).toBe(true);
    expect(isAwake(23, DAY)).toBe(false);
    expect(awakeHourCount(DAY)).toBe(16);
  });

  it("handles overnight windows", () => {
    const night = { wakeHour: 22, sleepHour: 6 };
    expect(isAwake(22, night)).toBe(true);
    expect(isAwake(3, night)).toBe(true);
    expect(isAwake(6, night)).toBe(false);
    expect(isAwake(12, night)).toBe(false);
    expect(awakeHourCount(night)).toBe(8);
  });

  it("treats equal wake and sleep hours as awake all day", () => {
    expect(awakeHourCount({ wakeHour: 9, sleepHour: 9 })).toBe(24);
  });
});

describe("toRanges", () => {
  it("groups contiguous hours with exclusive ends", () => {
    expect(toRanges([9, 10, 11, 15, 16])).toEqual([
      { start: 9, end: 12, length: 3 },
      { start: 15, end: 17, length: 2 },
    ]);
  });

  it("merges windows that wrap past midnight", () => {
    expect(toRanges([0, 1, 22, 23])).toEqual([{ start: 22, end: 2, length: 4 }]);
    expect(toRanges([0, 5, 23])).toEqual([
      { start: 5, end: 6, length: 1 },
      { start: 23, end: 1, length: 2 },
    ]);
  });

  it("handles empty and full days", () => {
    expect(toRanges([])).toEqual([]);
    expect(toRanges(Array.from({ length: 24 }, (_, h) => h))).toEqual([{ start: 0, end: 0, length: 24 }]);
  });

  it("formats ranges", () => {
    expect(formatHourRange({ start: 9, end: 12, length: 3 }, "12h")).toBe("9am — 12pm");
    expect(formatHourRange({ start: 22, end: 2, length: 4 }, "24h")).toBe("22:00 — 02:00");
    expect(formatHourRange({ start: 0, end: 0, length: 24 }, "12h")).toBe("All day");
  });
});

describe("buildSchedule — meeting mode", () => {
  const cities = [city("san-francisco"), city("denpasar"), city("geneva")];
  const schedule = buildSchedule({ cities, offsets: OFFSETS, window: DAY, mode: "meeting" });

  it("maps each reference hour to local time", () => {
    const [sf, denpasar, geneva] = schedule.rows;
    expect(sf?.isReference).toBe(true);
    expect(sf?.cells[9]?.localMinutes).toBe(9 * 60);
    // 9am in SF is midnight the next day in Denpasar (+15h) and 6pm in Geneva (+9h).
    expect(denpasar?.cells[9]).toMatchObject({ localMinutes: 0, dayOffset: 1, startsNewDay: true });
    expect(geneva?.cells[9]).toMatchObject({ localMinutes: 18 * 60, dayOffset: 0 });
    expect(denpasar?.diffMinutes).toBe(900);
  });

  it("finds the hours when everyone is awake", () => {
    // SF awake 7–23; Denpasar awake when SF is 16–24 and 0–8; Geneva awake when SF is 22–24 and 0–14.
    // All three: SF 7am (Denpasar 10pm, Geneva 4pm) and SF 10pm (Denpasar 1pm, Geneva 7am).
    expect(schedule.meetingOverlap).toEqual([7, 22]);
    expect(toRanges(schedule.meetingOverlap)).toEqual([
      { start: 7, end: 8, length: 1 },
      { start: 22, end: 23, length: 1 },
    ]);
    for (const row of schedule.rows) {
      expect(row.cells[7]?.state).toBe("overlap");
      expect(row.cells[22]?.state).toBe("overlap");
      expect(row.cells[8]?.state).not.toBe("overlap");
    }
  });

  it("marks sleeping cells regardless of overlap", () => {
    const denpasar = schedule.rows[1];
    expect(denpasar?.cells[9]?.state).toBe("sleeping");
    expect(denpasar?.cells[18]?.state).toBe("awake");
  });

  it("returns no overlap with fewer than two cities", () => {
    const single = buildSchedule({ cities: [city("geneva")], offsets: OFFSETS, window: DAY, mode: "meeting" });
    expect(single.meetingOverlap).toEqual([]);
    expect(single.rows[0]?.cells.some((cell) => cell.state === "overlap")).toBe(false);
  });
});

describe("buildSchedule — base mode", () => {
  const cities = [city("san-francisco"), city("denpasar"), city("geneva")];
  const schedule = buildSchedule({ cities, offsets: OFFSETS, window: DAY, mode: "base" });
  const [sf, denpasar, geneva] = schedule.rows;

  it("computes each city's overlap independently against the reference", () => {
    // Denpasar awake 7–23 local = SF 16–24 and 0–8; intersect with SF 7–23 → 7, 16–22.
    expect(denpasar?.overlapHours).toEqual([7, 16, 17, 18, 19, 20, 21, 22]);
    // Geneva awake 7–23 local = SF 22–24 and 0–14; intersect with SF 7–23 → 7–13, 22.
    expect(geneva?.overlapHours).toEqual([7, 8, 9, 10, 11, 12, 13, 22]);
  });

  it("highlights the union of overlaps on the reference row", () => {
    expect(sf?.overlapHours).toEqual([7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22]);
    expect(sf?.cells[14]?.state).toBe("awake");
    expect(sf?.cells[3]?.state).toBe("sleeping");
  });

  it("lets different cities highlight different hours", () => {
    expect(denpasar?.cells[18]?.state).toBe("overlap");
    expect(geneva?.cells[18]?.state).toBe("sleeping");
    expect(geneva?.cells[10]?.state).toBe("overlap");
    expect(denpasar?.cells[10]?.state).toBe("sleeping");
  });
});

describe("buildSchedule — fractional offsets and overnight windows", () => {
  it("shows half-hour local times", () => {
    const schedule = buildSchedule({
      cities: [city("london"), city("mumbai")],
      offsets: OFFSETS,
      window: DAY,
      mode: "meeting",
    });
    // London +1, Mumbai +5:30 → 4h30 ahead.
    expect(schedule.rows[1]?.cells[9]?.localMinutes).toBe(13 * 60 + 30);
    expect(schedule.rows[1]?.diffMinutes).toBe(270);
  });

  it("supports night-shift availability", () => {
    const schedule = buildSchedule({
      cities: [city("new-york"), city("london")],
      offsets: OFFSETS,
      window: { wakeHour: 22, sleepHour: 6 },
      mode: "meeting",
    });
    // NY awake 22–6; London (+5) awake 22–6 local = NY 17–1. Overlap NY 22, 23, 0.
    expect(schedule.meetingOverlap).toEqual([0, 22, 23]);
    expect(toRanges(schedule.meetingOverlap)).toEqual([{ start: 22, end: 1, length: 3 }]);
  });
});
