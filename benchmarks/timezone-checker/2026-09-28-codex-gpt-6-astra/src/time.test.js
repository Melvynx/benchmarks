import test from 'node:test';
import assert from 'node:assert/strict';
import { CITIES, DEFAULTS, calculate, duration, formatTime, getWindows, isAwake, offsetMinutes, restore } from './time.js';

const summer = new Date('2026-07-01T12:00:00Z');
const winter = new Date('2026-01-15T12:00:00Z');
const cities = ids => ids.map(id => CITIES.find(city => city.id === id));
const defaults = cities(DEFAULTS.cityIds);

test('default meeting shares exactly the same overlap across all cities', () => {
  const result = calculate(defaults, DEFAULTS, summer);
  assert.deepEqual(result.windows, [[420, 480], [1320, 1380]]);
  assert.equal(duration(result.windows), '2 hours');
  for (const row of result.rows) assert.deepEqual(row.availability, result.common);
});

test('current-date offsets account for seasonal DST changes', () => {
  assert.equal(offsetMinutes('America/Los_Angeles', summer), -420);
  assert.equal(offsetMinutes('America/Los_Angeles', winter), -480);
  assert.deepEqual(calculate(defaults, DEFAULTS, winter).windows, [[1320, 1380]]);
});

test('base comparisons are independent and the reference highlights their union', () => {
  const { rows } = calculate(defaults, { ...DEFAULTS, mode: 'base' }, summer);
  assert.deepEqual(rows[1].windows, [[420, 480], [960, 1380]]);
  assert.deepEqual(rows[2].windows, [[420, 840], [1320, 1380]]);
  assert.deepEqual(rows[0].windows, [[420, 840], [960, 1380]]);
});

test('half-hour and quarter-hour boundaries are preserved in summaries', () => {
  assert.equal(offsetMinutes('Asia/Kolkata', summer), 330);
  assert.equal(offsetMinutes('Asia/Kathmandu', summer), 345);
  assert.deepEqual(calculate(cities(['san-francisco', 'mumbai']), DEFAULTS, summer).windows, [[420, 630], [1110, 1380]]);
  assert.deepEqual(calculate(cities(['san-francisco', 'kathmandu']), DEFAULTS, summer).windows, [[420, 615], [1095, 1380]]);
  assert.equal(formatTime(615), '10:15am');
  assert.equal(formatTime(1095, '24'), '18:15');
});

test('overnight availability includes waking and excludes sleeping boundaries', () => {
  assert.equal(isAwake(22 * 60, 22, 6), true);
  assert.equal(isAwake(5 * 60 + 59, 22, 6), true);
  assert.equal(isAwake(6 * 60, 22, 6), false);
  assert.equal(isAwake(21 * 60 + 59, 22, 6), false);
  assert.equal(isAwake(12 * 60, 7, 7), true);
});

test('no overlap, empty and single-city configurations are valid', () => {
  assert.deepEqual(calculate(defaults, { ...DEFAULTS, wake: 9, sleep: 10 }, summer).windows, []);
  assert.deepEqual(calculate([], DEFAULTS, summer).rows, []);
  assert.deepEqual(calculate([defaults[0]], DEFAULTS, summer).windows, [[420, 1380]]);
});

test('changing reference preserves local availability and recalculates ranges', () => {
  const { rows, windows } = calculate(cities(['denpasar', 'san-francisco', 'geneva']), DEFAULTS, summer);
  assert.equal(rows[0].delta, 0);
  assert.equal(rows[1].delta, -900);
  assert.deepEqual(windows, [[780, 840], [1320, 1380]]);
});

test('disconnected ranges have exclusive ends, including midnight', () => {
  assert.deepEqual(getWindows([true, true, false, true]), [[0, 2], [3, 4]]);
  assert.deepEqual(getWindows(Array(1440).fill(true)), [[0, 1440]]);
  assert.equal(duration([[420, 465]]), '45m');
  assert.equal(duration([[420, 480]]), '1 hour');
});

test('stored settings reject invalid cities and fields while preserving an empty list', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    let stored = JSON.stringify({ cityIds: ['tokyo', 'tokyo', 'invalid'], wake: 99, sleep: -1, mode: 'bad', format: 'bad' });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => stored } });
    assert.deepEqual(restore(), { ...DEFAULTS, cityIds: ['tokyo'] });
    stored = JSON.stringify({ ...DEFAULTS, cityIds: [] });
    assert.deepEqual(restore().cityIds, []);
    stored = '{malformed';
    assert.deepEqual(restore(), DEFAULTS);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});
