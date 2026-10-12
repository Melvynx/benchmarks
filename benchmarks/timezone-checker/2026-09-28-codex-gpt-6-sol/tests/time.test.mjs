import assert from 'node:assert/strict';
import test from 'node:test';
import { CITIES, formatTime, isAwake, localTime, offsetLabel, offsetMinutes, overlapRanges, referenceInstants } from '../src/time.ts';

test('default cities have two shared hours on September 29, 2026', () => {
  const now = new Date('2026-09-29T12:00:00Z');
  const selected = ['san-francisco', 'denpasar', 'geneva'].map((id) => CITIES.find((city) => city.id === id));
  const instants = referenceInstants(now, selected[0].zone);
  const overlap = instants.map((instant) => selected.every((city) => isAwake(localTime(instant, city.zone).hour, 7, 23)));
  assert.deepEqual(overlapRanges(overlap), [[7, 8], [22, 23]]);
});

test('fractional offsets and local minutes are preserved', () => {
  const instant = new Date('2026-09-29T12:00:00Z');
  assert.equal(offsetLabel(offsetMinutes(instant, 'Asia/Kolkata')), 'UTC+5:30');
  assert.equal(offsetLabel(offsetMinutes(instant, 'Asia/Kathmandu')), 'UTC+5:45');
  assert.deepEqual(localTime(instant, 'Asia/Kathmandu'), { hour: 17, minute: 45 });
  assert.equal(formatTime(17, 45, '12h'), '5:45pm');
});

test('overnight awake windows include late and early hours', () => {
  assert.equal(isAwake(23, 22, 6), true);
  assert.equal(isAwake(3, 22, 6), true);
  assert.equal(isAwake(12, 22, 6), false);
  assert.equal(isAwake(12, 7, 7), true);
});

test('offsets reflect daylight saving changes', () => {
  assert.equal(offsetMinutes(new Date('2026-01-15T12:00:00Z'), 'Europe/Zurich'), 60);
  assert.equal(offsetMinutes(new Date('2026-07-15T12:00:00Z'), 'Europe/Zurich'), 120);
  assert.equal(offsetMinutes(new Date('2026-01-15T12:00:00Z'), 'America/Los_Angeles'), -480);
  assert.equal(offsetMinutes(new Date('2026-07-15T12:00:00Z'), 'America/Los_Angeles'), -420);
});
