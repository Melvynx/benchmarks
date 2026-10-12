import { describe, expect, it } from 'vitest';
import { cellLabel, formatClock, formatDiff, formatOffset, formatRange } from './format';

describe('formatClock', () => {
  it('formats 12-hour time', () => {
    expect(formatClock(0, '12h')).toBe('12am');
    expect(formatClock(9 * 60, '12h')).toBe('9am');
    expect(formatClock(12 * 60, '12h')).toBe('12pm');
    expect(formatClock(13 * 60 + 30, '12h')).toBe('1:30pm');
  });

  it('formats 24-hour time', () => {
    expect(formatClock(0, '24h')).toBe('00:00');
    expect(formatClock(17 * 60 + 45, '24h')).toBe('17:45');
  });

  it('wraps around midnight in both directions', () => {
    expect(formatClock(25 * 60, '12h')).toBe('1am');
    expect(formatClock(-60, '24h')).toBe('23:00');
  });
});

describe('formatRange', () => {
  it('uses an exclusive end', () => {
    expect(formatRange({ start: 9, length: 3 }, '12h')).toBe('9am — 12pm');
    expect(formatRange({ start: 22, length: 4 }, '24h')).toBe('22:00 — 02:00');
  });

  it('can shift into another city’s local time', () => {
    expect(formatRange({ start: 7, length: 1 }, '12h', 15 * 60)).toBe('10pm — 11pm');
  });

  it('describes a full day', () => {
    expect(formatRange({ start: 0, length: 24 }, '12h')).toBe('All day');
  });
});

describe('offsets', () => {
  it('formats UTC offsets', () => {
    expect(formatOffset(-420)).toBe('UTC−7');
    expect(formatOffset(0)).toBe('UTC+0');
    expect(formatOffset(330)).toBe('UTC+5:30');
    expect(formatOffset(345)).toBe('UTC+5:45');
  });

  it('formats differences to the reference', () => {
    expect(formatDiff(0)).toBe('same time');
    expect(formatDiff(900)).toBe('+15h');
    expect(formatDiff(-570)).toBe('−9h 30m');
  });
});

describe('cellLabel', () => {
  it('splits hour, minutes and meridiem', () => {
    expect(cellLabel(0, '12h')).toEqual({ hour: '12', minute: null, meridiem: 'am' });
    expect(cellLabel(13 * 60 + 30, '12h')).toEqual({ hour: '1', minute: '30', meridiem: 'pm' });
    expect(cellLabel(7 * 60, '24h')).toEqual({ hour: '07', minute: null, meridiem: null });
  });
});
