import { describe, expect, it } from 'vitest';
import { CITY_BY_ID } from '../data/cities';
import { formatOffset, formatRange } from './format';
import { awakeHourCount, buildSchedule, isAwake, toRanges } from './schedule';

const now = new Date('2026-09-29T18:00:00Z');
const city = (id: string) => {
  const found = CITY_BY_ID.get(id);
  if (!found) throw new Error(id);
  return found;
};

describe('awake window', () => {
  it('treats sleep as exclusive and wraps overnight', () => {
    expect(isAwake(7, 7, 23)).toBe(true);
    expect(isAwake(22, 7, 23)).toBe(true);
    expect(isAwake(23, 7, 23)).toBe(false);
    expect(isAwake(0, 7, 23)).toBe(false);
    expect(isAwake(22, 22, 6)).toBe(true);
    expect(isAwake(5, 22, 6)).toBe(true);
    expect(isAwake(6, 22, 6)).toBe(false);
    expect(isAwake(21, 22, 6)).toBe(false);
    expect(isAwake(4, 4, 4)).toBe(false);
    expect(awakeHourCount(7, 23)).toBe(16);
    expect(awakeHourCount(22, 6)).toBe(8);
    expect(awakeHourCount(8, 8)).toBe(0);
  });
});

describe('ranges', () => {
  it('merges contiguous hours, including across midnight', () => {
    expect(toRanges([7])).toEqual([{ start: 7, end: 8 }]);
    expect(toRanges([22, 23])).toEqual([{ start: 22, end: 0 }]);
    expect(toRanges([22, 23, 0, 1])).toEqual([{ start: 22, end: 2 }]);
    expect(toRanges([0, 1, 2, 22, 23])).toEqual([{ start: 22, end: 3 }]);
    expect(toRanges(Array.from({ length: 24 }, (_, hour) => hour))).toEqual([{ start: 0, end: 0 }]);
    expect(formatRange({ start: 9, end: 12 }, '12')).toBe('9am \u2014 12pm');
    expect(formatRange({ start: 22, end: 2 }, '12')).toBe('10pm \u2014 2am');
    expect(formatRange({ start: 7, end: 8 }, '24')).toBe('07:00 \u2014 08:00');
    expect(formatOffset(-420)).toBe('UTC\u22127');
    expect(formatOffset(330)).toBe('UTC+5:30');
    expect(formatOffset(345)).toBe('UTC+5:45');
    expect(formatOffset(0)).toBe('UTC+0');
  });
});

describe('schedule', () => {
  const defaults = [city('san-francisco'), city('denpasar'), city('geneva')];

  it('finds the shared awake hours for the default cities', () => {
    const schedule = buildSchedule({ cities: defaults, wake: 7, sleep: 23, now, mode: 'meeting' });
    expect(schedule.meetingHours).toEqual([7, 22]);
    expect(schedule.rows[0].cells.map((cell) => cell.hour)).toEqual(Array.from({ length: 24 }, (_, hour) => hour));
    expect(schedule.rows[1].cells[0]).toMatchObject({ hour: 15, minute: 0 });
    expect(schedule.rows.every((row) => row.overlapRefHours.join() === '7,22')).toBe(true);
  });

  it('compares each city with the reference independently in base mode', () => {
    const schedule = buildSchedule({ cities: defaults, wake: 7, sleep: 23, now, mode: 'base' });
    expect(schedule.rows[0].overlapRefHours).toEqual([]);
    expect(schedule.rows[1].overlapRefHours).toEqual([7, 16, 17, 18, 19, 20, 21, 22]);
    expect(schedule.rows[2].overlapRefHours).toEqual([7, 8, 9, 10, 11, 12, 13, 22]);
    expect(schedule.rows[0].cells[7].state).toBe('awake');
    expect(schedule.rows[1].cells[7].state).toBe('overlap');
    expect(schedule.rows[1].cells[8].state).toBe('sleep');
  });

  it('keeps fractional minutes when the reference offset is not whole hours', () => {
    const schedule = buildSchedule({
      cities: [city('kathmandu'), city('san-francisco'), city('mumbai')],
      wake: 7,
      sleep: 23,
      now,
      mode: 'base',
    });
    expect(schedule.rows[1].cells[0]).toMatchObject({ hour: 11, minute: 15, dayDiff: -1 });
    expect(schedule.rows[2].cells[0]).toMatchObject({ hour: 23, minute: 45, dayDiff: -1 });
  });

  it('anchors columns to whichever city is first', () => {
    const schedule = buildSchedule({
      cities: [city('geneva'), city('san-francisco')],
      wake: 7,
      sleep: 23,
      now,
      mode: 'meeting',
    });
    expect(schedule.rows[0].cells[0]).toMatchObject({ hour: 0, minute: 0, dayDiff: 0 });
    expect(schedule.rows[1].cells[0]).toMatchObject({ hour: 15, minute: 0, dayDiff: -1 });
  });
});
