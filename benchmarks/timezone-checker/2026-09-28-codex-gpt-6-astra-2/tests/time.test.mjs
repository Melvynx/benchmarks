import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CITIES } from '../src/cities.ts';
import { duration, formatTime, inRanges, isAwake, localMinutes, offsetLabel, overlapRanges, utcOffset, wrap } from '../src/time.ts';

const settings = { wake: 7, sleep: 23, format: '12h' };

describe('Availability boundaries', () => {
  it('includes wake time and excludes sleep time', () => {
    assert.equal(isAwake(7 * 60 - 1, settings), false);
    assert.equal(isAwake(7 * 60, settings), true);
    assert.equal(isAwake(23 * 60 - 1, settings), true);
    assert.equal(isAwake(23 * 60, settings), false);
  });
  it('supports a night shift across midnight', () => {
    const night = { ...settings, wake: 22, sleep: 6 };
    assert.equal(isAwake(21 * 60 + 59, night), false);
    assert.equal(isAwake(22 * 60, night), true);
    assert.equal(isAwake(0, night), true);
    assert.equal(isAwake(5 * 60 + 59, night), true);
    assert.equal(isAwake(6 * 60, night), false);
  });
  it('treats equal wake and sleep as all-day availability', () => {
    assert.equal(isAwake(0, { ...settings, wake: 7, sleep: 7 }), true);
    assert.equal(isAwake(23 * 60, { ...settings, wake: 7, sleep: 7 }), true);
  });
});

describe('Overlap windows', () => {
  it('finds both default meeting windows during northern summer', () => {
    const ranges = overlapRanges([-420, 480, 120], -420, settings);
    assert.deepEqual(ranges, [{ start: 420, end: 480 }, { start: 1320, end: 1380 }]);
    assert.equal(duration(ranges), '2h');
    assert.equal(inRanges(420, ranges), true);
    assert.equal(inRanges(480, ranges), false);
  });
  it('computes independent base windows for each colleague', () => {
    const denpasar = overlapRanges([-420, 480], -420, settings);
    const geneva = overlapRanges([-420, 120], -420, settings);
    assert.deepEqual(denpasar, [{ start: 420, end: 480 }, { start: 960, end: 1380 }]);
    assert.deepEqual(geneva, [{ start: 420, end: 840 }, { start: 1320, end: 1380 }]);
    assert.equal(duration(denpasar), '8h');
    assert.equal(duration(geneva), '8h');
    assert.equal(inRanges(1020, denpasar), true);
    assert.equal(inRanges(1020, geneva), false);
  });
  it('preserves half-hour and quarter-hour overlap boundaries', () => {
    assert.deepEqual(overlapRanges([0, 330], 0, settings), [{ start: 420, end: 1050 }]);
    const nepal = overlapRanges([0, 345], 0, settings);
    assert.deepEqual(nepal, [{ start: 420, end: 1035 }]);
    assert.equal(duration(nepal), '10h 15m');
    assert.equal(formatTime(nepal[0].end, '12h'), '5:15pm');
  });
  it('returns no availability when awake windows never intersect', () => {
    assert.deepEqual(overlapRanges([0, 720], 0, { ...settings, wake: 9, sleep: 17 }), []);
  });
  it('handles overnight overlap and the exclusive end of the day', () => {
    assert.deepEqual(overlapRanges([0, 120], 0, { ...settings, wake: 22, sleep: 6 }), [{ start: 0, end: 240 }, { start: 1320, end: 1440 }]);
    assert.deepEqual(overlapRanges([0, 345], 0, { ...settings, wake: 0, sleep: 0 }), [{ start: 0, end: 1440 }]);
  });
  it('needs at least two cities', () => {
    assert.deepEqual(overlapRanges([], 0, settings), []);
    assert.deepEqual(overlapRanges([480], 480, settings), []);
  });
  it('preserves total availability when another city becomes reference', () => {
    const offsets = [-420, 480, 120];
    for (const reference of offsets) assert.equal(duration(overlapRanges(offsets, reference, settings)), '2h');
  });
});

describe('Timezone and clock accuracy', () => {
  it('reads winter and summer offsets from IANA timezone data', () => {
    const winter = new Date('2026-01-15T12:00:00Z');
    const summer = new Date('2026-07-15T12:00:00Z');
    assert.equal(utcOffset('America/Los_Angeles', winter), -480);
    assert.equal(utcOffset('America/Los_Angeles', summer), -420);
    assert.equal(utcOffset('Europe/Zurich', winter), 60);
    assert.equal(utcOffset('Europe/Zurich', summer), 120);
    assert.equal(utcOffset('Asia/Makassar', winter), 480);
    assert.equal(utcOffset('Asia/Makassar', summer), 480);
  });
  it('reads fractional offsets without truncation', () => {
    const date = new Date('2026-09-29T12:00:00Z');
    assert.equal(utcOffset('Asia/Kolkata', date), 330);
    assert.equal(utcOffset('Asia/Kathmandu', date), 345);
    assert.equal(offsetLabel(345), 'UTC+5:45');
    assert.equal(offsetLabel(-210), 'UTC−3:30');
    assert.equal(offsetLabel(0), 'UTC+0');
    assert.equal(localMinutes('Asia/Kathmandu', date), 1065);
  });
  it('provides 34 unique, valid catalog entries', () => {
    assert.equal(CITIES.length, 34);
    assert.equal(new Set(CITIES.map(city => city.id)).size, 34);
    for (const city of CITIES) assert.ok(Number.isFinite(utcOffset(city.timezone, new Date('2026-09-29T12:00:00Z'))));
  });
  it('formats midnight, noon, fractional times, and date changes', () => {
    assert.equal(formatTime(0, '12h'), '12am');
    assert.equal(formatTime(720, '12h'), '12pm');
    assert.equal(formatTime(345, '12h'), '5:45am');
    assert.equal(formatTime(1440, '24h'), '00:00');
    assert.equal(formatTime(-30, '24h'), '23:30');
    assert.equal(formatTime(1080, '12h', true), '6');
    assert.equal(wrap(-15), 1425);
  });
});
