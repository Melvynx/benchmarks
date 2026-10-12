import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculate, cities, defaults, formatTime, isAwake, offsetLabel, offsetMinutes, ranges } from './timezones.ts';

const selected = ids => ids.map(id => cities.find(city => city.id === id));

describe('timezone calculations', () => {
  it('finds the common default summer window', () => {
    const result = calculate(selected(defaults.cities), defaults, new Date('2026-09-30T12:00:00Z'));
    assert.deepEqual(ranges(result.meeting), [[7, 8], [22, 23]]);
    assert.equal(result.overlap.every(row => JSON.stringify(row) === JSON.stringify(result.meeting)), true);
  });
  it('calculates separate base windows', () => {
    const result = calculate(selected(defaults.cities), { ...defaults, mode: 'base' }, new Date('2026-09-30T12:00:00Z'));
    assert.deepEqual(ranges(result.overlap[1]), [[7, 8], [16, 23]]);
    assert.deepEqual(ranges(result.overlap[2]), [[7, 14], [22, 23]]);
  });
  it('supports overnight schedules and exclusive sleep boundaries', () => {
    assert.equal(isAwake(22 * 60, 22, 6), true);
    assert.equal(isAwake(5 * 60 + 45, 22, 6), true);
    assert.equal(isAwake(6 * 60, 22, 6), false);
    assert.equal(isAwake(21 * 60, 22, 6), false);
    assert.equal(isAwake(12 * 60, 7, 7), true);
  });
  it('handles DST and fractional offsets without rounding', () => {
    assert.equal(offsetMinutes('America/Los_Angeles', new Date('2026-07-01T12:00:00Z')), -420);
    assert.equal(offsetMinutes('America/Los_Angeles', new Date('2026-01-01T12:00:00Z')), -480);
    assert.equal(offsetMinutes('Asia/Kolkata'), 330);
    assert.equal(offsetMinutes('Asia/Kathmandu'), 345);
    const result = calculate(selected(['sf', 'ktm']), defaults, new Date('2026-09-30T12:00:00Z'));
    assert.equal(result.local[1][0], 765);
    assert.equal(formatTime(result.local[1][0], '12h'), '12:45pm');
    assert.equal(offsetLabel(345), 'UTC+5:45');
  });
  it('splits disjoint windows and preserves exclusive midnight', () => {
    assert.deepEqual(ranges(Array.from({ length: 24 }, (_, hour) => hour < 2 || hour >= 22)), [[0, 2], [22, 24]]);
    assert.equal(formatTime(1440, '12h'), '12am');
    assert.equal(formatTime(7 * 60 + 30, '24h'), '07:30');
  });
  it('returns no overlap when schedules cannot intersect', () => {
    const result = calculate(selected(['sf', 'den']), { ...defaults, wake: 9, sleep: 10 }, new Date('2026-09-30T12:00:00Z'));
    assert.equal(result.meeting.some(Boolean), false);
  });
});
