import { describe, expect, it } from 'vitest';
import { resolveCities } from './cities';
import { awakeHourCount, buildOverlapModel, contiguousRuns, isAwake, type Mode, toRanges } from './overlap';

// 2026-09-30: San Francisco is on PDT (UTC−7), Geneva on CEST (UTC+2), Denpasar is UTC+8.
const NOW = new Date('2026-09-30T15:00:00Z');
const DEFAULT_WINDOW = { wakeHour: 7, sleepHour: 23 };

function build(ids: string[], mode: Mode = 'meeting', window = DEFAULT_WINDOW) {
  return buildOverlapModel({ cities: resolveCities(ids), mode, window, now: NOW });
}

describe('isAwake', () => {
  it('handles a same-day window with an exclusive end', () => {
    expect(isAwake(6, DEFAULT_WINDOW)).toBe(false);
    expect(isAwake(7, DEFAULT_WINDOW)).toBe(true);
    expect(isAwake(22, DEFAULT_WINDOW)).toBe(true);
    expect(isAwake(23, DEFAULT_WINDOW)).toBe(false);
  });

  it('handles overnight windows', () => {
    const nightShift = { wakeHour: 22, sleepHour: 6 };
    expect(isAwake(22, nightShift)).toBe(true);
    expect(isAwake(3, nightShift)).toBe(true);
    expect(isAwake(6, nightShift)).toBe(false);
    expect(isAwake(12, nightShift)).toBe(false);
  });

  it('treats wake == sleep as awake around the clock', () => {
    expect(isAwake(4, { wakeHour: 9, sleepHour: 9 })).toBe(true);
    expect(awakeHourCount({ wakeHour: 9, sleepHour: 9 })).toBe(24);
  });

  it('counts awake hours', () => {
    expect(awakeHourCount(DEFAULT_WINDOW)).toBe(16);
    expect(awakeHourCount({ wakeHour: 22, sleepHour: 6 })).toBe(8);
  });
});

describe('toRanges', () => {
  it('groups contiguous hours', () => {
    expect(toRanges([9, 10, 11])).toEqual([{ start: 9, length: 3 }]);
    expect(toRanges([7, 22])).toEqual([
      { start: 7, length: 1 },
      { start: 22, length: 1 },
    ]);
  });

  it('merges windows that wrap past midnight', () => {
    expect(toRanges([0, 1, 22, 23])).toEqual([{ start: 22, length: 4 }]);
  });

  it('handles empty and full days', () => {
    expect(toRanges([])).toEqual([]);
    expect(toRanges(Array.from({ length: 24 }, (_, h) => h))).toEqual([{ start: 0, length: 24 }]);
  });

  it('contiguousRuns never wraps', () => {
    expect(contiguousRuns([23, 0, 1])).toEqual([
      { start: 0, length: 2 },
      { start: 23, length: 1 },
    ]);
  });
});

describe('buildOverlapModel', () => {
  it('computes local hours relative to the reference city', () => {
    const model = build(['san-francisco', 'denpasar', 'geneva']);
    const [sf, denpasar, geneva] = model.rows;
    expect(sf.isReference).toBe(true);
    expect(denpasar.diffMinutes).toBe(15 * 60);
    expect(geneva.diffMinutes).toBe(9 * 60);
    // 7am in San Francisco is 10pm in Denpasar and 4pm in Geneva.
    expect(denpasar.cells[7].localMinutes).toBe(22 * 60);
    expect(geneva.cells[7].localMinutes).toBe(16 * 60);
    // 10am in San Francisco is already the next day in Denpasar.
    expect(denpasar.cells[10]).toMatchObject({ localMinutes: 60, dayShift: 1 });
  });

  it('Meeting mode: finds hours when every city is awake', () => {
    const model = build(['san-francisco', 'denpasar', 'geneva']);
    expect(model.isComparing).toBe(true);
    expect(model.sharedHours).toEqual([7, 22]);
    expect(model.sharedRanges).toEqual([
      { start: 7, length: 1 },
      { start: 22, length: 1 },
    ]);
    for (const row of model.rows) {
      expect(row.cells.filter((cell) => cell.state === 'overlap').map((cell) => cell.refHour)).toEqual([7, 22]);
    }
  });

  it('Base mode: each city overlaps with the reference independently', () => {
    const model = build(['san-francisco', 'denpasar', 'geneva'], 'base');
    const [sf, denpasar, geneva] = model.rows;
    expect(denpasar.ranges).toEqual([
      { start: 7, length: 1 },
      { start: 16, length: 7 },
    ]);
    expect(geneva.ranges).toEqual([
      { start: 7, length: 7 },
      { start: 22, length: 1 },
    ]);
    // The reference highlights every hour it shares with at least one city.
    expect(sf.overlapHours).toEqual([7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22]);
  });

  it('marks sleeping, awake and overlap cells', () => {
    const [sf] = build(['san-francisco', 'denpasar', 'geneva']).rows;
    expect(sf.cells[3].state).toBe('asleep');
    expect(sf.cells[12].state).toBe('awake');
    expect(sf.cells[7].state).toBe('overlap');
  });

  it('re-anchors everything when the reference changes', () => {
    const model = build(['geneva', 'san-francisco', 'denpasar']);
    expect(model.rows[1].diffMinutes).toBe(-9 * 60);
    // Same instants as before, expressed in Geneva hours (7am SF = 4pm Geneva, 10pm SF = 7am Geneva).
    expect(model.sharedHours).toEqual([7, 16]);
  });

  it('supports fractional offsets', () => {
    const model = build(['san-francisco', 'mumbai', 'kathmandu']);
    expect(model.rows[1].diffMinutes).toBe(12 * 60 + 30);
    expect(model.rows[1].cells[0].localMinutes).toBe(12 * 60 + 30);
    expect(model.rows[2].cells[0].localMinutes).toBe(12 * 60 + 45);
  });

  it('reports zero overlap', () => {
    const model = build(['san-francisco', 'denpasar', 'geneva'], 'meeting', { wakeHour: 9, sleepHour: 18 });
    expect(model.sharedHours).toEqual([]);
    expect(model.rows.every((row) => row.cells.every((cell) => cell.state !== 'overlap'))).toBe(true);
  });

  it('does not highlight anything for a single city', () => {
    const model = build(['tokyo']);
    expect(model.isComparing).toBe(false);
    expect(model.rows[0].cells.some((cell) => cell.state === 'overlap')).toBe(false);
  });

  it('handles an empty list', () => {
    const model = build([]);
    expect(model.rows).toEqual([]);
    expect(model.reference).toBeUndefined();
  });
});
