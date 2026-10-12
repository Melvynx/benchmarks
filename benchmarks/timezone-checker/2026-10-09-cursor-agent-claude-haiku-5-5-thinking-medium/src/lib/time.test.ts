import { describe, expect, it } from 'vitest';
import {
  buildSchedule,
  computeOverlaps,
  formatCell,
  formatRange,
  getUtcOffsetMinutes,
  isAwake,
  toRanges,
  type Settings,
} from './time';

const day: Settings = { wakeHour: 7, sleepHour: 23, format: '12h' };

describe('isAwake', () => {
  it('uses [wake, sleep) for normal windows', () => {
    expect(isAwake(6, day)).toBe(false);
    expect(isAwake(7, day)).toBe(true);
    expect(isAwake(22, day)).toBe(true);
    expect(isAwake(23, day)).toBe(false);
  });

  it('wraps midnight for overnight windows', () => {
    const night = { wakeHour: 22, sleepHour: 6 };
    expect(isAwake(23, night)).toBe(true);
    expect(isAwake(3, night)).toBe(true);
    expect(isAwake(6, night)).toBe(false);
    expect(isAwake(12, night)).toBe(false);
  });
});

describe('toRanges', () => {
  it('groups contiguous hours with exclusive end', () => {
    const flags = Array.from({ length: 24 }, (_, h) => h >= 9 && h < 12);
    expect(toRanges(flags)).toEqual([{ start: 9, hours: 3 }]);
    expect(formatRange({ start: 9, hours: 3 }, '12h')).toBe('9am — 12pm');
  });

  it('wraps across midnight as one range', () => {
    const flags = Array.from({ length: 24 }, (_, h) => h >= 22 || h < 2);
    expect(toRanges(flags)).toEqual([{ start: 22, hours: 4 }]);
    expect(formatRange({ start: 22, hours: 4 }, '12h')).toBe('10pm — 2am');
  });

  it('reports all-day when every hour overlaps', () => {
    const all = Array.from({ length: 24 }, () => true);
    expect(toRanges(all)).toEqual([{ start: 0, hours: 24 }]);
    expect(formatRange({ start: 0, hours: 24 }, '24h')).toBe('All day');
  });
});

describe('getUtcOffsetMinutes', () => {
  const at = new Date('2026-01-15T12:00:00Z');
  it('handles fixed and fractional offsets', () => {
    expect(getUtcOffsetMinutes('Asia/Kolkata', at)).toBe(330);
    expect(getUtcOffsetMinutes('Asia/Kathmandu', at)).toBe(345);
    expect(getUtcOffsetMinutes('Asia/Makassar', at)).toBe(480);
  });
  it('applies DST', () => {
    expect(getUtcOffsetMinutes('America/Los_Angeles', at)).toBe(-480);
    expect(getUtcOffsetMinutes('America/Los_Angeles', new Date('2026-07-15T12:00:00Z'))).toBe(-420);
  });
});

describe('buildSchedule', () => {
  it('maps reference hours to local minutes with fractional offsets', () => {
    // Reference UTC+0, Kathmandu UTC+5:45
    const schedule = buildSchedule([0, 345], day);
    expect(schedule[1][0].minute).toBe(345);
    expect(formatCell(schedule[1][0].minute, '12h')).toBe('5:45a');
    expect(schedule[1][18].minute).toBe(1425); // 18:00 ref → 23:45 local
  });

  it('wraps the local day', () => {
    // Reference UTC+0, Auckland UTC+12: ref 15:00 → local 03:00 next day
    const schedule = buildSchedule([0, 720], day);
    expect(schedule[1][15].minute).toBe(180);
    expect(schedule[1][15].awake).toBe(false);
  });
});

describe('computeOverlaps', () => {
  it('meeting mode: all rows share the same all-awake hours', () => {
    // Two cities at the same offset → overlap equals the awake window.
    const schedule = buildSchedule([0, 0], day);
    const [a, b] = computeOverlaps(schedule, 'meeting');
    expect(a).toEqual(b);
    expect(a.filter(Boolean).length).toBe(16); // 7..22
  });

  it('base mode: overlap is per reference pair and the reference row is empty', () => {
    // Ref UTC+0 (awake 7–22), city at UTC+8 (local 7–22 = ref 23–14). Shared ref hours: 7–14.
    const schedule = buildSchedule([0, 480, 0], day);
    const [ref, eastern, same] = computeOverlaps(schedule, 'base');
    expect(ref.some(Boolean)).toBe(false);
    expect(toRanges(eastern)).toEqual([{ start: 7, hours: 8 }]);
    expect(same.filter(Boolean).length).toBe(16);
  });

  it('meeting mode: no overlap when windows are disjoint', () => {
    // Ref UTC+0, city UTC+12: local 7–22 = ref 19–10. Shared with ref 7–22 → ref 7–10 and 19–22 (two windows).
    const schedule = buildSchedule([0, 720], day);
    const [shared] = computeOverlaps(schedule, 'meeting');
    expect(toRanges(shared)).toEqual([
      { start: 7, hours: 4 },
      { start: 19, hours: 4 },
    ]);
  });
});
