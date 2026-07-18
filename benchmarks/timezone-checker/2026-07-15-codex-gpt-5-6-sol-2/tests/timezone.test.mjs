import assert from "node:assert/strict";
import test from "node:test";
import { CITIES } from "../src/data/cities.ts";
import {
  buildTimeMatrix,
  countHours,
  formatHour,
  formatLocalTime,
  formatRange,
  formatUtcOffset,
  getBaseOverlap,
  getMeetingOverlap,
  getOffsetMinutes,
  isAwake,
  rangesFromHours,
} from "../src/lib/timezone.ts";

const city = (id) => CITIES.find((entry) => entry.id === id);
const july = new Date("2026-07-15T12:00:00.000Z");
const january = new Date("2026-01-15T12:00:00.000Z");

test("derives DST-aware and fractional UTC offsets", () => {
  assert.equal(getOffsetMinutes("America/Los_Angeles", july), -420);
  assert.equal(getOffsetMinutes("America/Los_Angeles", january), -480);
  assert.equal(getOffsetMinutes("Europe/Zurich", july), 120);
  assert.equal(getOffsetMinutes("Europe/Zurich", january), 60);
  assert.equal(getOffsetMinutes("Asia/Kolkata", july), 330);
  assert.equal(getOffsetMinutes("Asia/Kathmandu", july), 345);
  assert.equal(formatUtcOffset(-420), "UTC−07:00");
  assert.equal(formatUtcOffset(345), "UTC+05:45");
});

test("maps reference hours to local wall-clock times", () => {
  const matrix = buildTimeMatrix([city("san-francisco"), city("denpasar"), city("geneva")], july);
  assert.deepEqual(matrix[0][10], { hour: 10, minute: 0, totalMinutes: 600 });
  assert.deepEqual(matrix[1][10], { hour: 1, minute: 0, totalMinutes: 60 });
  assert.deepEqual(matrix[2][10], { hour: 19, minute: 0, totalMinutes: 1140 });

  const kathmandu = buildTimeMatrix([city("geneva"), city("kathmandu")], july);
  assert.equal(kathmandu[1][9].minute, 45);
});

test("keeps a deterministic 24-column reference day across DST boundaries", () => {
  const springForward = new Date("2026-03-08T12:00:00.000Z");
  const fallBack = new Date("2026-11-01T12:00:00.000Z");
  for (const instant of [springForward, fallBack]) {
    const matrix = buildTimeMatrix([city("new-york"), city("london")], instant);
    assert.deepEqual(matrix[0].map((time) => time.hour), Array.from({ length: 24 }, (_, hour) => hour));
    assert.equal(matrix[0].length, 24);
    assert.equal(matrix[1].length, 24);
  }
});

test("supports normal, overnight, and all-day awake windows", () => {
  assert.equal(isAwake(7 * 60, 7, 23), true);
  assert.equal(isAwake(22 * 60 + 59, 7, 23), true);
  assert.equal(isAwake(23 * 60, 7, 23), false);
  assert.equal(isAwake(22 * 60, 22, 6), true);
  assert.equal(isAwake(5 * 60 + 45, 22, 6), true);
  assert.equal(isAwake(6 * 60, 22, 6), false);
  assert.equal(isAwake(12 * 60, 22, 6), false);
  assert.equal(isAwake(12 * 60, 7, 7), true);
});

test("computes default meeting and pairwise overlaps", () => {
  const matrix = buildTimeMatrix([city("san-francisco"), city("denpasar"), city("geneva")], july);
  const awake = matrix.map((row) => row.map((time) => isAwake(time.totalMinutes, 7, 23)));
  const meeting = getMeetingOverlap(awake);
  const denpasar = getBaseOverlap(awake, 1);
  const geneva = getBaseOverlap(awake, 2);

  assert.equal(countHours(meeting), 2);
  assert.deepEqual(rangesFromHours(meeting), [{ start: 7, end: 8 }, { start: 22, end: 23 }]);
  assert.equal(countHours(denpasar), 8);
  assert.deepEqual(rangesFromHours(denpasar), [{ start: 7, end: 8 }, { start: 16, end: 23 }]);
  assert.equal(countHours(geneva), 8);
  assert.deepEqual(rangesFromHours(geneva), [{ start: 7, end: 14 }, { start: 22, end: 23 }]);
});

test("treats one-city Meeting Mode as that city's awake window", () => {
  const row = Array.from({ length: 24 }, (_, hour) => hour >= 7 && hour < 23);
  assert.deepEqual(getMeetingOverlap([row]), row);
  assert.equal(countHours(getMeetingOverlap([])), 0);
});

test("merges circular ranges and formats boundaries", () => {
  const wrap = Array(24).fill(false);
  for (const hour of [22, 23, 0, 1]) wrap[hour] = true;
  assert.deepEqual(rangesFromHours(wrap), [{ start: 22, end: 26 }]);
  assert.equal(formatRange({ start: 22, end: 26 }, "12h"), "10pm → 2am");
  assert.equal(formatRange({ start: 0, end: 24 }, "24h"), "All day");
  assert.equal(formatHour(24, "24h"), "00:00");
  assert.equal(formatHour(12, "12h"), "12pm");
  assert.equal(formatLocalTime({ hour: 5, minute: 45, totalMinutes: 345 }, "24h"), "05:45");
  assert.equal(formatLocalTime({ hour: 17, minute: 30, totalMinutes: 1050 }, "12h"), "5:30p");
});
