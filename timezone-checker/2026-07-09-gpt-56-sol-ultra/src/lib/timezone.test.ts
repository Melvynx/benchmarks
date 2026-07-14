import { describe, expect, it } from 'vitest';

import { CITIES, CITY_BY_ID, DEFAULT_CITY_IDS } from '../data/cities';
import {
  buildComparisonModel,
  formatCellTime,
  formatTimeRange,
  formatUtcOffset,
  getLocalMinute,
  getTimeZoneOffsetMinutes,
  groupHoursIntoRanges,
  isMinuteAwake,
} from './timezone';

function getCity(id: string) {
  const city = CITY_BY_ID.get(id);
  if (!city) throw new Error(`Missing fixture city: ${id}`);
  return city;
}

describe('city catalog', () => {
  it('provides a broad, duplicate-free catalog with valid IANA timezones', () => {
    expect(CITIES.length).toBeGreaterThanOrEqual(34);
    expect(new Set(CITIES.map((city) => city.id)).size).toBe(CITIES.length);
    expect(new Set(CITIES.map((city) => city.name)).size).toBe(CITIES.length);

    for (const city of CITIES) {
      expect(() => new Intl.DateTimeFormat('en-US', { timeZone: city.timeZone })).not.toThrow();
    }
  });

  it('uses the requested first-visit city order', () => {
    expect(DEFAULT_CITY_IDS).toEqual(['san-francisco', 'denpasar', 'geneva']);
  });
});

describe('timezone offsets', () => {
  it('uses the current instant to account for daylight saving time', () => {
    const summer = new Date('2026-07-09T12:00:00Z');
    const winter = new Date('2026-01-15T12:00:00Z');

    expect(getTimeZoneOffsetMinutes('America/Los_Angeles', summer)).toBe(-420);
    expect(getTimeZoneOffsetMinutes('America/Los_Angeles', winter)).toBe(-480);
    expect(getTimeZoneOffsetMinutes('Europe/Zurich', summer)).toBe(120);
    expect(getTimeZoneOffsetMinutes('Europe/Zurich', winter)).toBe(60);
  });

  it('updates at the daylight-saving boundary', () => {
    expect(getTimeZoneOffsetMinutes('America/Los_Angeles', new Date('2026-03-08T09:59:00Z'))).toBe(-480);
    expect(getTimeZoneOffsetMinutes('America/Los_Angeles', new Date('2026-03-08T10:01:00Z'))).toBe(-420);
  });

  it('preserves half-hour and quarter-hour offsets', () => {
    const date = new Date('2026-07-09T12:00:00Z');

    expect(getTimeZoneOffsetMinutes('Asia/Kolkata', date)).toBe(330);
    expect(getTimeZoneOffsetMinutes('Asia/Kathmandu', date)).toBe(345);
    expect(formatUtcOffset(345)).toBe('UTC+05:45');
  });
});

describe('awake windows', () => {
  it('uses inclusive wake and exclusive sleep boundaries', () => {
    expect(isMinuteAwake(7 * 60, 7, 23)).toBe(true);
    expect(isMinuteAwake(23 * 60 - 1, 7, 23)).toBe(true);
    expect(isMinuteAwake(7 * 60 - 1, 7, 23)).toBe(false);
    expect(isMinuteAwake(23 * 60, 7, 23)).toBe(false);
  });

  it('supports overnight and all-day schedules', () => {
    expect(isMinuteAwake(22 * 60, 22, 6)).toBe(true);
    expect(isMinuteAwake(6 * 60 - 1, 22, 6)).toBe(true);
    expect(isMinuteAwake(6 * 60, 22, 6)).toBe(false);
    expect(isMinuteAwake(12 * 60, 7, 7)).toBe(true);
  });

  it('maps fractional local times without decimal-hour rounding', () => {
    expect(getLocalMinute(1, 345, 0)).toEqual({ localMinute: 405, dayDelta: 0 });
    expect(getLocalMinute(2, 345, 0)).toEqual({ localMinute: 465, dayDelta: 0 });
    expect(formatCellTime(405, '12h')).toBe('6:45a');
  });
});

describe('overlap calculations', () => {
  const date = new Date('2026-07-09T12:00:00Z');
  const cities = [getCity('san-francisco'), getCity('denpasar'), getCity('geneva')];

  it('finds the common window for the default meeting setup', () => {
    const model = buildComparisonModel(cities, 'meeting', 7, 23, date);

    expect(model?.meetingHours).toEqual([7, 22]);
    expect(model?.timelines.every((timeline) =>
      timeline.cells[7].isOverlap && timeline.cells[22].isOverlap,
    )).toBe(true);
  });

  it('calculates independent pairwise windows in base mode', () => {
    const model = buildComparisonModel(cities, 'base', 7, 23, date);

    expect(model?.baseHoursByCityId.denpasar).toEqual([7, 16, 17, 18, 19, 20, 21, 22]);
    expect(model?.baseHoursByCityId.geneva).toEqual([7, 8, 9, 10, 11, 12, 13, 22]);
    expect(model?.timelines[0].cells.some((cell) => cell.isOverlap)).toBe(false);
  });

  it('does not fabricate overlap for an empty or one-city board', () => {
    expect(buildComparisonModel([], 'meeting', 7, 23, date)).toBeNull();
    expect(buildComparisonModel([cities[0]], 'meeting', 7, 23, date)?.meetingHours).toEqual([]);
  });
});

describe('range grouping and labels', () => {
  it('groups linear and non-contiguous windows', () => {
    expect(groupHoursIntoRanges([9, 10, 11])).toEqual([{ startHour: 9, endHour: 12 }]);
    expect(groupHoursIntoRanges([1, 2, 8, 9, 10])).toEqual([
      { startHour: 1, endHour: 3 },
      { startHour: 8, endHour: 11 },
    ]);
  });

  it('merges an availability window across midnight', () => {
    const ranges = groupHoursIntoRanges([22, 23, 0, 1]);

    expect(ranges).toEqual([{ startHour: 22, endHour: 26 }]);
    expect(formatTimeRange(ranges[0], '12h')).toBe('10pm — 2am (+1 day)');
  });

  it('special-cases full-day availability', () => {
    const allHours = Array.from({ length: 24 }, (_, hour) => hour);
    const range = groupHoursIntoRanges(allHours)[0];

    expect(range).toEqual({ startHour: 0, endHour: 24 });
    expect(formatTimeRange(range, '24h')).toBe('All day');
  });
});
