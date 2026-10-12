import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const source = await readFile(new URL('../src/timezones.ts', import.meta.url), 'utf8');
const math = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`);
let passed = 0;
function check(name, verify) {
  verify();
  passed++;
  console.log(`✓ ${name}`);
}

check('Catalog has 34 unique, valid IANA timezones', () => {
  assert.equal(math.cities.length, 34);
  assert.equal(new Set(math.cities.map(city => city.id)).size, 34);
  for (const city of math.cities) new Intl.DateTimeFormat('en-US', { timeZone: city.zone });
});
check('Current-date offsets automatically reflect DST', () => {
  assert.equal(math.offsetMinutes('America/Los_Angeles', new Date('2026-01-15T12:00:00Z')), -480);
  assert.equal(math.offsetMinutes('America/Los_Angeles', new Date('2026-07-15T12:00:00Z')), -420);
});
check('India and Nepal retain fractional offsets and local minutes', () => {
  const date = new Date('2026-09-30T12:00:00Z');
  assert.equal(math.offsetMinutes('Asia/Kolkata', date), 330);
  assert.equal(math.offsetMinutes('Asia/Kathmandu', date), 345);
  assert.equal(math.localMinutes(7, 345, -420), 1185);
  assert.equal(math.formatTime(1185, '12h'), '7:45pm');
});
check('Awake windows exclude sleep time and support overnight schedules', () => {
  assert.equal(math.isAwake(7 * 60, 7, 23), true);
  assert.equal(math.isAwake(23 * 60, 7, 23), false);
  assert.equal(math.isAwake(22 * 60, 22, 6), true);
  assert.equal(math.isAwake(5 * 60 + 45, 22, 6), true);
  assert.equal(math.isAwake(6 * 60, 22, 6), false);
  assert.equal(math.isAwake(12 * 60, 22, 6), false);
});
check('Default meeting cities share two separate summer windows', () => {
  const masks = math.overlapMasks([-420, 480, 120], math.defaults);
  assert.deepEqual(math.ranges(masks[0]), [[7, 8], [22, 23]]);
  assert.deepEqual(masks[0], masks[1]);
  assert.deepEqual(masks[0], masks[2]);
});
check('Base mode calculates each pair independently', () => {
  const masks = math.overlapMasks([-420, 480, 120], { ...math.defaults, mode: 'base' });
  assert.deepEqual(math.ranges(masks[1]), [[7, 8], [16, 23]]);
  assert.deepEqual(math.ranges(masks[2]), [[7, 14], [22, 23]]);
  assert.deepEqual(math.ranges(masks[0]), [[7, 14], [16, 23]]);
});
check('Disjoint ranges, day end, and zero overlap are preserved', () => {
  const mask = Array.from({ length: 24 }, (_, h) => [0, 1, 7, 22, 23].includes(h));
  assert.deepEqual(math.ranges(mask), [[0, 2], [7, 8], [22, 24]]);
  assert.deepEqual(math.ranges(Array(24).fill(false)), []);
  assert.equal(math.formatTime(1440, '12h'), '12am');
  assert.equal(math.formatTime(0, '24h'), '00:00');
});
check('Empty selection remains valid', () => {
  assert.deepEqual(math.overlapMasks([], math.defaults), []);
});
check('Persistence restores empty cities and validates malformed settings', () => {
  const original = globalThis.localStorage;
  try {
    globalThis.localStorage = { getItem: () => JSON.stringify({ ids: [], wake: 22, sleep: 6, mode: 'base', format: '24h' }) };
    assert.deepEqual(math.restoreSettings(), { ids: [], wake: 22, sleep: 6, mode: 'base', format: '24h' });
    globalThis.localStorage = { getItem: () => JSON.stringify({ ids: ['geneva', 'geneva', 'invalid'], wake: 30, sleep: -1 }) };
    assert.deepEqual(math.restoreSettings(), { ids: ['geneva'], wake: 7, sleep: 23, mode: 'meeting', format: '12h' });
    globalThis.localStorage = { getItem: () => 'broken json' };
    assert.deepEqual(math.restoreSettings(), math.defaults);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});
console.log(`${passed} timezone checks passed.`);
