import { describe, expect, it } from 'vitest';

import {
  formatUtcOffset,
  getBaseOverlapMask,
  getHourRanges,
  getLocalTime,
  getUtcOffsetMinutes,
  isAwake,
} from './timezone';
import { CITY_BY_ID } from '../data/cities';

describe('timezone utilities', () => {
  it('supports daytime and overnight awake windows', () => {
    expect(isAwake(7 * 60, 7, 23)).toBe(true);
    expect(isAwake(23 * 60, 7, 23)).toBe(false);
    expect(isAwake(23 * 60, 22, 6)).toBe(true);
    expect(isAwake(5 * 60 + 59, 22, 6)).toBe(true);
    expect(isAwake(12 * 60, 22, 6)).toBe(false);
  });

  it('preserves fractional timezone offsets', () => {
    const localTime = getLocalTime(9, -7 * 60, 5 * 60 + 45);
    expect(localTime).toEqual({ hour: 21, minute: 45, minuteOfDay: 1305 });
  });

  it('derives DST-aware offsets from the supplied date', () => {
    const sanFrancisco = 'America/Los_Angeles';
    expect(getUtcOffsetMinutes(new Date('2026-01-15T12:00:00Z'), sanFrancisco)).toBe(-480);
    expect(getUtcOffsetMinutes(new Date('2026-07-15T12:00:00Z'), sanFrancisco)).toBe(-420);
    expect(formatUtcOffset(345)).toBe('UTC+5:45');
  });

  it('finds inclusive-start, exclusive-end ranges', () => {
    const mask = Array.from({ length: 24 }, (_, hour) =>
      [1, 2, 7, 8, 9].includes(hour),
    );
    expect(getHourRanges(mask)).toEqual([
      { start: 1, end: 3 },
      { start: 7, end: 10 },
    ]);
  });

  it('calculates independent base-city overlap', () => {
    const referenceCity = CITY_BY_ID.get('geneva');
    const city = CITY_BY_ID.get('mumbai');
    if (!referenceCity || !city) throw new Error('Test city fixture is missing');

    const mask = getBaseOverlapMask(
      referenceCity,
      city,
      7,
      23,
      new Date('2026-07-09T12:00:00Z'),
    );
    expect(mask.some(Boolean)).toBe(true);
    expect(mask).toHaveLength(24);
  });
});
