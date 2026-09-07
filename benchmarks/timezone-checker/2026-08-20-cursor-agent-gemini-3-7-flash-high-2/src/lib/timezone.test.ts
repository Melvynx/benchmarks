import { describe, it, expect } from 'vitest';
import {
  getTimezoneOffsetMinutes,
  formatUtcOffset,
  isHourAwake,
  calculateLocalTimeForRefHour,
  formatTimeRange,
  getOverlapRanges,
  formatCellHour,
} from './timezone';

describe('Timezone Math and Calculations', () => {
  it('should correctly calculate timezone offsets', () => {
    // Fixed summer date (Aug 20)
    const testDate = new Date('2026-08-20T12:00:00Z');
    
    const laOffset = getTimezoneOffsetMinutes('America/Los_Angeles', testDate);
    expect(laOffset).toBe(-420); // UTC-7 (PDT)
    expect(formatUtcOffset(laOffset)).toBe('UTC-7');

    const denpasarOffset = getTimezoneOffsetMinutes('Asia/Makassar', testDate);
    expect(denpasarOffset).toBe(480); // UTC+8
    expect(formatUtcOffset(denpasarOffset)).toBe('UTC+8');

    const genevaOffset = getTimezoneOffsetMinutes('Europe/Zurich', testDate);
    expect(genevaOffset).toBe(120); // UTC+2 (CEST)
    expect(formatUtcOffset(genevaOffset)).toBe('UTC+2');

    const mumbaiOffset = getTimezoneOffsetMinutes('Asia/Kolkata', testDate);
    expect(mumbaiOffset).toBe(330); // UTC+5:30
    expect(formatUtcOffset(mumbaiOffset)).toBe('UTC+5:30');

    const kathmanduOffset = getTimezoneOffsetMinutes('Asia/Kathmandu', testDate);
    expect(kathmanduOffset).toBe(345); // UTC+5:45
    expect(formatUtcOffset(kathmanduOffset)).toBe('UTC+5:45');
  });

  it('should correctly calculate awake state for normal and overnight ranges', () => {
    // Normal: wake 7, sleep 23
    expect(isHourAwake(6, 7, 23)).toBe(false);
    expect(isHourAwake(7, 7, 23)).toBe(true);
    expect(isHourAwake(12, 7, 23)).toBe(true);
    expect(isHourAwake(22, 7, 23)).toBe(true);
    expect(isHourAwake(23, 7, 23)).toBe(false);

    // Overnight: wake 22, sleep 6
    expect(isHourAwake(21, 22, 6)).toBe(false);
    expect(isHourAwake(22, 22, 6)).toBe(true);
    expect(isHourAwake(23, 22, 6)).toBe(true);
    expect(isHourAwake(0, 22, 6)).toBe(true);
    expect(isHourAwake(5, 22, 6)).toBe(true);
    expect(isHourAwake(6, 22, 6)).toBe(false);
    expect(isHourAwake(14, 22, 6)).toBe(false);
  });

  it('should calculate local hour accurately across timezones', () => {
    const testDate = new Date('2026-08-20T12:00:00Z');
    
    // When San Francisco is at 7:00 AM (hour 7):
    // SF is UTC-7 -> 14:00 UTC.
    // Denpasar (UTC+8) is at 22:00 (10:00 PM).
    const denpasarAtSf7 = calculateLocalTimeForRefHour(
      'America/Los_Angeles',
      'Asia/Makassar',
      7,
      testDate
    );
    expect(denpasarAtSf7.localHour).toBe(22);
    expect(denpasarAtSf7.dayOffset).toBe(0);

    // Geneva (UTC+2) is at 16:00 (4:00 PM).
    const genevaAtSf7 = calculateLocalTimeForRefHour(
      'America/Los_Angeles',
      'Europe/Zurich',
      7,
      testDate
    );
    expect(genevaAtSf7.localHour).toBe(16);
    expect(genevaAtSf7.dayOffset).toBe(0);

    // Mumbai (UTC+5:30) is at 19:30 (7:30 PM).
    const mumbaiAtSf7 = calculateLocalTimeForRefHour(
      'America/Los_Angeles',
      'Asia/Kolkata',
      7,
      testDate
    );
    expect(mumbaiAtSf7.localHour).toBe(19);
    expect(mumbaiAtSf7.localMinute).toBe(30);
  });

  it('should format time ranges inclusive start to exclusive end', () => {
    expect(formatTimeRange(9, 12, '12h')).toBe('9am — 12pm');
    expect(formatTimeRange(9, 12, '24h')).toBe('09:00 — 12:00');
    expect(formatTimeRange(22, 24, '12h')).toBe('10pm — 12am');
    expect(formatTimeRange(0, 4, '12h')).toBe('12am — 4am');

    const ranges = getOverlapRanges([9, 10, 11], '12h');
    expect(ranges).toHaveLength(1);
    expect(ranges[0].formatted).toBe('9am — 12pm');
    expect(ranges[0].hoursCount).toBe(3);

    const splitRanges = getOverlapRanges([7, 8, 14, 15, 16], '12h');
    expect(splitRanges).toHaveLength(2);
    expect(splitRanges[0].formatted).toBe('7am — 9am');
    expect(splitRanges[1].formatted).toBe('2pm — 5pm');
  });

  it('should format cell hours properly for both standard and fractional minutes', () => {
    expect(formatCellHour(7, 0, '12h').short).toBe('7am');
    expect(formatCellHour(12, 0, '12h').short).toBe('12pm');
    expect(formatCellHour(0, 0, '12h').short).toBe('12am');
    expect(formatCellHour(23, 0, '12h').short).toBe('11pm');
    expect(formatCellHour(19, 30, '12h').short).toBe('7:30pm');

    expect(formatCellHour(7, 0, '24h').short).toBe('07');
    expect(formatCellHour(19, 30, '24h').short).toBe('19:30');
  });
});
