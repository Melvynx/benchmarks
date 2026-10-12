import { describe, expect, it } from 'vitest';
import { CITIES } from '../data/cities';
import { getOffsetMinutes, getZonedParts, zonedTimeToUtc } from './time';

const noon = new Date('2026-09-29T18:00:00Z');

describe('timezone offsets', () => {
  it('resolves every catalog zone', () => {
    expect(CITIES).toHaveLength(34);
    expect(new Set(CITIES.map((city) => city.id)).size).toBe(34);
    expect(new Set(CITIES.map((city) => city.region)).size).toBe(7);
    for (const city of CITIES) {
      expect(Number.isFinite(getOffsetMinutes(noon, city.timeZone))).toBe(true);
    }
  });

  it('handles DST and fractional offsets on 29 Sep 2026', () => {
    expect(getOffsetMinutes(noon, 'America/Los_Angeles')).toBe(-420);
    expect(getOffsetMinutes(noon, 'Asia/Makassar')).toBe(480);
    expect(getOffsetMinutes(noon, 'Europe/Zurich')).toBe(120);
    expect(getOffsetMinutes(noon, 'Asia/Kolkata')).toBe(330);
    expect(getOffsetMinutes(noon, 'Asia/Kathmandu')).toBe(345);
    expect(getOffsetMinutes(noon, 'Pacific/Auckland')).toBe(780);
  });

  it('converts a reference wall time to the matching instant', () => {
    expect(zonedTimeToUtc('America/Los_Angeles', 2026, 9, 29, 0, 0).toISOString()).toBe('2026-09-29T07:00:00.000Z');
    expect(getZonedParts(new Date('2026-09-29T07:00:00Z'), 'Asia/Kolkata')).toMatchObject({
      hour: 12,
      minute: 30,
      day: 29,
    });
    expect(getZonedParts(new Date('2026-09-29T07:00:00Z'), 'Asia/Kathmandu')).toMatchObject({
      hour: 12,
      minute: 45,
    });
  });
});
