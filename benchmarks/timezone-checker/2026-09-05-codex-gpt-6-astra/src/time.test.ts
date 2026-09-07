import assert from "node:assert/strict";
import { test } from "node:test";
import { CITIES } from "./cities";
import { calculateTimeline, DEFAULT_CONFIG, formatTime, isAwake, offsetLabel, offsetMinutes, overlapRanges, readConfiguration } from "./time";

const summer = new Date("2026-09-05T12:00:00Z");
const defaults = DEFAULT_CONFIG.cityIds.map((id) => CITIES.find((city) => city.id === id)!);

test("default cities have a shared two-hour window on the current summer date", () => {
  const timeline = calculateTimeline(defaults, DEFAULT_CONFIG.settings, "meeting", summer);
  assert.deepEqual(overlapRanges(timeline.meeting), [[7, 8], [22, 23]]);
  assert.ok(timeline.overlaps.every((overlap) => JSON.stringify(overlap) === JSON.stringify(timeline.meeting)));
});

test("base mode calculates each city independently", () => {
  const timeline = calculateTimeline(defaults, DEFAULT_CONFIG.settings, "base", summer);
  assert.deepEqual(overlapRanges(timeline.overlaps[1]), [[7, 8], [16, 23]]);
  assert.deepEqual(overlapRanges(timeline.overlaps[2]), [[7, 14], [22, 23]]);
});

test("overnight and all-day schedules have clear boundary semantics", () => {
  const night = { wake: 22, sleep: 6, format: "12h" as const };
  assert.equal(isAwake(22 * 60, night), true);
  assert.equal(isAwake(5 * 60 + 59, night), true);
  assert.equal(isAwake(6 * 60, night), false);
  assert.equal(isAwake(21 * 60 + 59, night), false);
  assert.equal(isAwake(720, { ...night, wake: 6 }), true);
});

test("offsets follow DST and preserve fractional zones", () => {
  assert.equal(offsetMinutes("America/Los_Angeles", summer), -420);
  assert.equal(offsetMinutes("America/Los_Angeles", new Date("2026-01-05T12:00:00Z")), -480);
  assert.equal(offsetMinutes("Asia/Kolkata", summer), 330);
  assert.equal(offsetMinutes("Asia/Kathmandu", summer), 345);
  assert.equal(offsetLabel(345), "UTC+5:45");
});

test("fractional local hours remain precise even with a fractional reference", () => {
  const nepal = CITIES.find((city) => city.id === "kathmandu")!;
  const india = CITIES.find((city) => city.id === "mumbai")!;
  const timeline = calculateTimeline([nepal, india], DEFAULT_CONFIG.settings, "base", summer);
  assert.equal(timeline.localTimes[1][0], 1425);
  assert.equal(formatTime(timeline.localTimes[1][0], "24h"), "23:45");
  assert.equal(formatTime(345, "12h", true), "5:45am");
});

test("reference promotion changes the time anchor", () => {
  const timeline = calculateTimeline([defaults[1], defaults[0], defaults[2]], DEFAULT_CONFIG.settings, "meeting", summer);
  assert.equal(timeline.localTimes[0][7], 420);
  assert.equal(timeline.localTimes[1][7], 960);
});

test("empty, full-day and split overlap ranges", () => {
  assert.deepEqual(overlapRanges(Array(24).fill(false)), []);
  assert.deepEqual(overlapRanges(Array(24).fill(true)), [[0, 24]]);
  assert.deepEqual(calculateTimeline([], DEFAULT_CONFIG.settings, "meeting", summer).meeting, Array(24).fill(false));
  const short = calculateTimeline(defaults, { wake: 9, sleep: 10, format: "12h" }, "meeting", summer);
  assert.equal(short.meeting.some(Boolean), false);
});

test("persisted configuration is validated and deduplicated", () => {
  assert.deepEqual(readConfiguration("{oops"), DEFAULT_CONFIG);
  assert.deepEqual(readConfiguration(JSON.stringify({ ...DEFAULT_CONFIG, settings: { wake: 24, sleep: 23, format: "12h" } })), DEFAULT_CONFIG);
  assert.deepEqual(readConfiguration(JSON.stringify({ ...DEFAULT_CONFIG, cityIds: ["geneva", "geneva", "fake"] })).cityIds, ["geneva"]);
  assert.deepEqual(readConfiguration(JSON.stringify({ ...DEFAULT_CONFIG, cityIds: [] })).cityIds, []);
});
