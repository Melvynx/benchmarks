import { describe, expect, it } from 'vitest';
import { CITIES } from './cities';
import { getUtcOffsetMinutes, getZonedTime } from './time';

const WINTER = new Date('2026-01-15T12:00:00Z');
const SUMMER = new Date('2026-07-15T12:00:00Z');

describe('getUtcOffsetMinutes', () => {
  it.each([
    ['America/Los_Angeles', -480, -420],
    ['America/New_York', -300, -240],
    ['Europe/London', 0, 60],
    ['Europe/Zurich', 60, 120],
    ['Australia/Sydney', 660, 600],
    ['Pacific/Auckland', 780, 720],
    ['Asia/Makassar', 480, 480],
  ])('%s follows DST (winter %i, summer %i)', (timeZone, winter, summer) => {
    expect(getUtcOffsetMinutes(timeZone, WINTER)).toBe(winter);
    expect(getUtcOffsetMinutes(timeZone, SUMMER)).toBe(summer);
  });

  it.each([
    ['Asia/Kolkata', 330],
    ['Asia/Kathmandu', 345],
    ['Asia/Tehran', 210],
  ])('supports fractional offsets for %s', (timeZone, offset) => {
    expect(getUtcOffsetMinutes(timeZone, WINTER)).toBe(offset);
  });

  it('resolves every catalog timezone to a quarter-hour offset', () => {
    for (const city of CITIES) {
      const offset = getUtcOffsetMinutes(city.timeZone, SUMMER);
      expect(Number.isInteger(offset / 15), city.name).toBe(true);
    }
  });
});

describe('getZonedTime', () => {
  it('returns the wall clock and weekday in the target zone', () => {
    const zoned = getZonedTime('Asia/Tokyo', new Date('2026-09-30T20:30:00Z'));
    expect(zoned).toMatchObject({ year: 2026, month: 10, day: 1, hour: 5, minute: 30, weekday: 4 });
    expect(zoned.minutesOfDay).toBe(330);
  });

  it('reports midnight as hour 0', () => {
    expect(getZonedTime('UTC', new Date('2026-09-30T00:00:00Z')).hour).toBe(0);
  });
});
