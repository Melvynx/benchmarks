import { afterEach, describe, expect, it, vi } from 'vitest';
import { CITIES } from '../data/cities';
import { buildBoard } from '../lib/board';
import { reducer } from '../lib/reducer';
import { filterCities } from '../lib/search';
import { STORAGE_KEY, loadState, sanitize } from '../lib/storage';
import {
  cityLocal,
  describeRuns,
  formatOffset,
  formatRange,
  hourRuns,
  isAwake,
  offsetMinutes,
  rangeHours,
} from '../lib/time';
import { DEFAULT_STATE, REGIONS, type AppState } from '../types';

const SEPT = new Date('2026-09-29T18:00:00Z');
const JAN = new Date('2026-01-15T16:00:00Z');
const JULY = new Date('2026-07-01T16:00:00Z');

function wall(date: Date, timeZone: string) {
  const list = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const num = (type: string) => Number(list.find((part) => part.type === type)?.value);
  let hour = num('hour');
  if (hour === 24) hour = 0;
  return { year: num('year'), month: num('month'), day: num('day'), hour, minute: num('minute') };
}

function instantAt(timeZone: string, year: number, month: number, day: number, hour: number): Date {
  const wallUtc = Date.UTC(year, month - 1, day, hour, 0, 0);
  let utc = new Date(wallUtc);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    utc = new Date(wallUtc - offsetMinutes(timeZone, utc) * 60_000);
  }
  return utc;
}

describe('catalog', () => {
  it('covers every region with 34 unique cities', () => {
    expect(CITIES).toHaveLength(34);
    expect(new Set(CITIES.map((city) => city.id)).size).toBe(34);
    for (const region of REGIONS) {
      expect(CITIES.some((city) => city.region === region)).toBe(true);
    }
    for (const id of DEFAULT_STATE.cityIds) expect(CITIES.some((city) => city.id === id)).toBe(true);
  });

  it('resolves every zone, including fractional offsets', () => {
    for (const city of CITIES) {
      const offset = offsetMinutes(city.timeZone, SEPT);
      expect(offset).toBeGreaterThanOrEqual(-12 * 60);
      expect(offset).toBeLessThanOrEqual(14 * 60);
    }
    expect(offsetMinutes('Asia/Kolkata', SEPT)).toBe(330);
    expect(offsetMinutes('Asia/Kathmandu', SEPT)).toBe(345);
    expect(offsetMinutes('Asia/Makassar', SEPT)).toBe(480);
  });
});

describe('offsets follow the date', () => {
  it('switches US and European zones between winter and summer', () => {
    expect(offsetMinutes('America/Los_Angeles', SEPT)).toBe(-420);
    expect(offsetMinutes('America/Los_Angeles', JAN)).toBe(-480);
    expect(offsetMinutes('America/New_York', JULY)).toBe(-240);
    expect(offsetMinutes('America/New_York', JAN)).toBe(-300);
    expect(offsetMinutes('Europe/Zurich', SEPT)).toBe(120);
    expect(offsetMinutes('Europe/Zurich', JAN)).toBe(60);
    expect(offsetMinutes('Pacific/Auckland', SEPT)).toBe(780);
    expect(offsetMinutes('Pacific/Auckland', JULY)).toBe(720);
  });
});

describe('awake window', () => {
  it('treats sleep as exclusive and wraps overnight', () => {
    expect(HOURS_AWAKE(7, 23)).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
    expect(HOURS_AWAKE(22, 6)).toEqual([0, 1, 2, 3, 4, 5, 22, 23]);
    expect(HOURS_AWAKE(8, 8)).toEqual([]);
    expect(isAwake(23, 7, 23)).toBe(false);
    expect(isAwake(22, 7, 23)).toBe(true);
  });
});

describe('ranges', () => {
  it('formats inclusive start and exclusive end, including wraps', () => {
    expect(formatRange(9, 12, '12h')).toBe('9am — 12pm');
    expect(formatRange(9, 12, '24h')).toBe('09:00 — 12:00');
    expect(formatRange(0, 1, '12h')).toBe('12am — 1am');
    expect(formatRange(12, 13, '12h')).toBe('12pm — 1pm');

    const split = Array.from({ length: 24 }, (_, hour) => hour === 9 || hour === 10 || hour === 11);
    expect(describeRuns(split, '12h')).toEqual([
      { key: '9-12', label: '9am — 12pm', title: '9am, 10am, 11am' },
    ]);

    const wrapped = Array.from({ length: 24 }, (_, hour) => hour >= 22 || hour <= 5);
    expect(hourRuns(wrapped)).toEqual([{ start: 22, end: 6 }]);
    expect(formatRange(22, 6, '12h')).toBe('10pm — 6am');
    expect(rangeHours(22, 6)).toEqual([22, 23, 0, 1, 2, 3, 4, 5]);

    const all = Array.from({ length: 24 }, () => true);
    expect(describeRuns(all, '12h')[0]?.label).toBe('All day');
  });
});

describe('city local time', () => {
  it('matches Intl wall clocks for every catalog city', () => {
    const refZone = 'America/Los_Angeles';
    const refOff = offsetMinutes(refZone, SEPT);
    const refWall = wall(SEPT, refZone);
    for (const city of CITIES) {
      const cityOff = offsetMinutes(city.timeZone, SEPT);
      for (const hour of [0, 7, 11, 15, 22, 23]) {
        const utc = instantAt(refZone, refWall.year, refWall.month, refWall.day, hour);
        const there = wall(utc, city.timeZone);
        const back = wall(utc, refZone);
        expect(back.hour, `${refZone} hour ${hour}`).toBe(hour);
        const local = cityLocal(hour, refOff, cityOff);
        expect(local.hour, city.id).toBe(there.hour);
        expect(local.minute, city.id).toBe(there.minute);
        const delta = Math.round(
          (Date.UTC(there.year, there.month - 1, there.day) - Date.UTC(refWall.year, refWall.month - 1, refWall.day)) /
            86_400_000,
        );
        expect(local.dayDelta, `${city.id} @ ${hour}`).toBe(delta);
      }
    }
  });

  it('keeps India and Nepal on a half and three-quarter hour', () => {
    expect(cityLocal(9, -420, 330)).toEqual({ hour: 21, minute: 30, dayDelta: 0 });
    expect(cityLocal(12, -420, 330)).toEqual({ hour: 0, minute: 30, dayDelta: 1 });
    expect(cityLocal(9, -420, 345)).toEqual({ hour: 21, minute: 45, dayDelta: 0 });
    expect(formatOffset(-420)).toBe('UTC−7');
    expect(formatOffset(330)).toBe('UTC+5:30');
    expect(formatOffset(345)).toBe('UTC+5:45');
  });
});

describe('board', () => {
  it('shows the two real windows across the default cities', () => {
    const board = buildBoard(DEFAULT_STATE, SEPT);
    expect(board.hint).toBe('Green cells = everyone awake');
    expect(board.windowLabel).toBe('7am — 11pm');
    expect(board.rows.map((row) => row.city.id)).toEqual(['san-francisco', 'denpasar', 'geneva']);
    expect(board.rows[0]?.isReference).toBe(true);
    expect(board.rows[0]?.abbrev).toBe('PDT');
    expect(board.rows[0]?.offsetLabel).toBe('UTC−7');
    expect(board.rows[1]?.offsetLabel).toBe('UTC+8');
    expect(board.summary).toMatchObject({
      kind: 'meeting',
      count: 2,
      headline: '2 shared hours',
      where: 'San Francisco time',
      warning: null,
    });
    if (board.summary.kind !== 'meeting') throw new Error('expected meeting summary');
    expect(board.summary.ranges.map((range) => range.label)).toEqual(['7am — 8am', '10pm — 11pm']);

    for (const row of board.rows) {
      expect(row.cells.filter((cell) => cell.state === 'overlap').map((cell) => cell.refHour)).toEqual([7, 22]);
    }
    expect(board.rows[1]?.cells[8]?.state).toBe('sleep');
    expect(board.rows[0]?.cells[8]?.state).toBe('awake');
    expect(board.rows[1]?.cells[9]).toMatchObject({ hour: 0, minute: 0, dayDelta: 1, state: 'sleep' });
  });

  it('gives each city its own overlap against the reference in base mode', () => {
    const board = buildBoard({ ...DEFAULT_STATE, mode: 'base' }, SEPT);
    expect(board.hint).toBe('Green cells = awake together with San Francisco');
    expect(board.rows[0]?.cells.every((cell) => cell.state !== 'overlap')).toBe(true);
    expect(board.rows[1]?.cells.filter((cell) => cell.state === 'overlap').map((cell) => cell.refHour)).toEqual([
      7, 16, 17, 18, 19, 20, 21, 22,
    ]);
    expect(board.rows[2]?.cells.filter((cell) => cell.state === 'overlap').map((cell) => cell.refHour)).toEqual([
      7, 8, 9, 10, 11, 12, 13, 22,
    ]);
    expect(board.rows[0]?.cells[8]?.state).toBe('awake');
    expect(board.rows[1]?.cells[8]?.state).toBe('sleep');
    expect(board.rows[2]?.cells[8]?.state).toBe('overlap');
    expect(board.summary).toMatchObject({ kind: 'base', heading: 'Overlap with San Francisco' });
    if (board.summary.kind !== 'base') throw new Error('expected base summary');
    expect(board.summary.lines.map((line) => [line.cityName, line.detail, line.ranges.map((range) => range.label)])).toEqual([
      ['Denpasar', '8 hours', ['7am — 8am', '4pm — 11pm']],
      ['Geneva', '8 hours', ['7am — 2pm', '10pm — 11pm']],
    ]);
  });

  it('moves the same two hours onto the new reference clock', () => {
    const board = buildBoard({ ...DEFAULT_STATE, cityIds: ['geneva', 'san-francisco', 'denpasar'] }, SEPT);
    expect(board.summary).toMatchObject({ kind: 'meeting', count: 2, where: 'Geneva time' });
    if (board.summary.kind !== 'meeting') throw new Error('expected meeting summary');
    expect(board.summary.ranges.map((range) => range.label)).toEqual(['7am — 8am', '4pm — 5pm']);
  });

  it('warns when a window has no overlap', () => {
    const state: AppState = {
      ...DEFAULT_STATE,
      cityIds: ['san-francisco', 'denpasar'],
      wake: 9,
      sleep: 10,
    };
    const meeting = buildBoard(state, SEPT);
    expect(meeting.summary).toMatchObject({ kind: 'meeting', count: 0, warning: 'No shared awake hours.' });
    const base = buildBoard({ ...state, mode: 'base' }, SEPT);
    expect(base.summary).toMatchObject({
      kind: 'base',
      lines: [{ cityId: 'denpasar', count: 0, warning: 'No overlap with San Francisco.' }],
    });
  });

  it('hides the summary until two cities are present', () => {
    const board = buildBoard({ ...DEFAULT_STATE, cityIds: ['geneva'] }, SEPT);
    expect(board.summary.kind).toBe('hidden');
    expect(board.rows[0]?.cells[7]?.state).toBe('overlap');
    expect(board.rows[0]?.cells[23]?.state).toBe('sleep');
    const base = buildBoard({ ...DEFAULT_STATE, cityIds: ['geneva'], mode: 'base' }, SEPT);
    expect(base.rows[0]?.cells.every((cell) => cell.state !== 'overlap')).toBe(true);
  });

  it('formats fractional cells from a whole-hour reference', () => {
    const board = buildBoard({ ...DEFAULT_STATE, cityIds: ['san-francisco', 'mumbai', 'kathmandu'] }, SEPT);
    expect(board.rows[1]?.cells.every((cell) => cell.minute === 30)).toBe(true);
    expect(board.rows[2]?.cells.every((cell) => cell.minute === 45)).toBe(true);
    expect(board.rows[1]?.offsetLabel).toBe('UTC+5:30');
    expect(board.rows[2]?.offsetLabel).toBe('UTC+5:45');
  });

  it('labels an overnight window in 24-hour time', () => {
    const board = buildBoard(
      {
        ...DEFAULT_STATE,
        cityIds: ['san-francisco', 'vancouver'],
        wake: 22,
        sleep: 6,
        format: '24h',
      },
      SEPT,
    );
    expect(offsetMinutes('America/Los_Angeles', SEPT)).toBe(offsetMinutes('America/Vancouver', SEPT));
    expect(board.windowLabel).toBe('22:00 — 06:00');
    if (board.summary.kind !== 'meeting') throw new Error('expected meeting summary');
    expect(board.summary.count).toBe(8);
    expect(board.summary.ranges.map((range) => range.label)).toEqual(['22:00 — 06:00']);
  });
});

describe('search', () => {
  it('matches city, country, and aliases without duplicates', () => {
    expect(filterCities([], 'bali').map((city) => city.id)).toEqual(['denpasar']);
    expect(filterCities([], 'sao').map((city) => city.id)).toEqual(['sao-paulo']);
    expect(filterCities([], 'nepal').map((city) => city.id)).toEqual(['kathmandu']);
    expect(filterCities(['geneva'], 'geneva')).toEqual([]);
    const us = filterCities([], 'us').map((city) => city.id);
    expect(us).toContain('san-francisco');
    expect(us).toContain('honolulu');
    expect(us).not.toContain('sydney');
    expect(us).not.toContain('auckland');
    expect(filterCities([], 'uk').map((city) => city.id)).toEqual(['london']);
  });
});

describe('state', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('promotes, rejects duplicates, and resets', () => {
    let state = DEFAULT_STATE;
    state = reducer(state, { type: 'promote', id: 'geneva' });
    expect(state.cityIds).toEqual(['geneva', 'san-francisco', 'denpasar']);
    const again = reducer(state, { type: 'promote', id: 'geneva' });
    expect(again).toBe(state);
    const dup = reducer(state, { type: 'add', id: 'geneva' });
    expect(dup).toBe(state);
    const unknown = reducer(state, { type: 'add', id: 'atlantis' });
    expect(unknown).toBe(state);
    const added = reducer(state, { type: 'add', id: 'tokyo' });
    expect(added.cityIds.at(-1)).toBe('tokyo');
    const removed = reducer(added, { type: 'remove', id: 'geneva' });
    expect(removed.cityIds[0]).toBe('san-francisco');
    expect(reducer(removed, { type: 'reset' }).cityIds).toEqual(['san-francisco', 'denpasar', 'geneva']);
    expect(reducer(state, { type: 'wake', hour: 24 })).toBe(state);
    expect(reducer(state, { type: 'format', format: '24h' }).format).toBe('24h');
    expect(reducer(state, { type: 'mode', mode: 'base' }).mode).toBe('base');
  });

  it('restores sanitized local storage and keeps an explicit empty list', () => {
    const map = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => map.set(key, value),
      removeItem: (key: string) => map.delete(key),
      clear: () => map.clear(),
    });
    expect(loadState()).toEqual(DEFAULT_STATE);
    map.set(
      STORAGE_KEY,
      JSON.stringify({
        cityIds: ['tokyo', 'tokyo', 'nope', 'lisbon'],
        mode: 'base',
        wake: 8,
        sleep: 20,
        format: '24h',
      }),
    );
    expect(loadState()).toEqual({
      cityIds: ['tokyo', 'lisbon'],
      mode: 'base',
      wake: 8,
      sleep: 20,
      format: '24h',
    });
    map.set(STORAGE_KEY, JSON.stringify({ cityIds: [], mode: 'meeting', wake: 0, sleep: 0, format: '12h' }));
    expect(loadState().cityIds).toEqual([]);
    map.set(STORAGE_KEY, '{');
    expect(loadState()).toEqual(DEFAULT_STATE);
    expect(sanitize(null)).toEqual(DEFAULT_STATE);
  });
});

function HOURS_AWAKE(wake: number, sleep: number): number[] {
  return Array.from({ length: 24 }, (_, hour) => hour).filter((hour) => isAwake(hour, wake, sleep));
}
