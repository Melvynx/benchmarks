import { test as nodeTest } from 'node:test';
import assert from 'node:assert/strict';
import { Garden, defaults, presets } from '../simulation.js';

export const outcomes = [];
export const completions = [];
function test(name, check) {
  completions.push(nodeTest(name, () => {
    try { check(); outcomes.push({ name, passed: true }); }
    catch (error) { outcomes.push({ name, passed: false, error: error.message }); throw error; }
  }));
}

function advance(garden, seconds) { for (let index = 0; index < seconds * 10; index++) garden.tick(.1); return garden; }

test('same seed and controls reproduce the exact run', () => {
  const first = advance(new Garden(), 120); const second = advance(new Garden(), 120);
  assert.deepEqual(first.history, second.history); assert.deepEqual(first.blobs, second.blobs);
});
test('fruit consumption is visible and eating imposes a real pause', () => {
  const garden = new Garden({ ...defaults, blues: 1, reds: 0, trees: 1 });
  Object.assign(garden.blobs[0], { x: garden.plants[0].x, y: garden.plants[0].y, energy: 40 });
  garden.tick(.1); assert.equal(garden.plants[0].fruit, defaults.limit - 1); assert.ok(garden.blobs[0].energy > 60);
  const position = { x: garden.blobs[0].x, y: garden.blobs[0].y };
  garden.tick(.1); assert.equal(garden.plants[0].fruit, defaults.limit - 1); assert.equal(garden.blobs[0].x, position.x); assert.ok(garden.blobs[0].timer > 0);
});
test('empty plants respect the return delay and fruit cap', () => {
  const garden = new Garden({ ...defaults, blues: 0, reds: 0, trees: 1 });
  garden.plants[0].fruit = 0; garden.plants[0].cooldown = 5;
  advance(garden, 4); assert.equal(garden.plants[0].fruit, 0);
  advance(garden, 100); assert.equal(garden.plants[0].fruit, defaults.limit);
});
test('red contact transfers finite energy and prevents repeated contact during rest', () => {
  const garden = new Garden({ ...defaults, blues: 1, reds: 1 });
  Object.assign(garden.blobs[0], { x: 0, y: 0, energy: 60 }); Object.assign(garden.blobs[1], { x: 0, y: 0, energy: 50 });
  garden.tick(.1); assert.ok(garden.blobs[0].energy < 40); assert.ok(garden.blobs[1].energy > 60); assert.ok(garden.blobs[1].timer > 0);
  const energy = garden.blobs[0].energy; garden.tick(.1); assert.ok(energy - garden.blobs[0].energy < 1);
});
test('births spend more energy than they create', () => {
  const garden = new Garden({ ...defaults, blues: 1, reds: 0, trees: 0 });
  Object.assign(garden.blobs[0], { age: 10, energy: 110 }); garden.tick(.1);
  assert.equal(garden.blobs.length, 2); assert.equal(garden.births, 1);
  assert.ok(garden.blobs.reduce((total, blob) => total + blob.energy, 0) < 110); assert.equal(garden.blobs[1].parent, garden.blobs[0].id);
});
test('balanced seed sustains both populations for one simulated hour', () => {
  const garden = advance(new Garden(), 3600); const counts = garden.counts();
  assert.ok(counts.blue > 0); assert.ok(counts.red > 0); assert.ok(garden.births > 100);
  assert.ok(garden.history.every(point => point.blue + point.red < 350));
  assert.ok(new Set(garden.history.map(point => point.red)).size >= 4);
  assert.ok(new Set(garden.history.map(point => point.blue)).size >= 10);
});
test('fruit-rich and low-fruit presets produce different early growth', () => {
  const rich = advance(new Garden(presets.rich), 60); const low = advance(new Garden(presets.low), 60);
  assert.ok(rich.counts().blue > defaults.blues * 1.5); assert.ok(low.counts().blue < presets.low.blues); assert.ok(rich.births > low.births);
});
test('a red-heavy garden depresses blue first, then loses reds', () => {
  const garden = advance(new Garden(presets.red), 90); const early = garden.counts();
  advance(garden, 510); const later = garden.counts();
  assert.ok(early.blue < presets.red.blues); assert.ok(later.red < early.red);
});
test('reset restores the exact starting state and clears history', () => {
  const garden = advance(new Garden(), 60); garden.reset(defaults);
  assert.equal(garden.time, 0); assert.equal(garden.history.length, 1); assert.equal(garden.births, 0); assert.deepEqual(garden.blobs, new Garden().blobs);
});
