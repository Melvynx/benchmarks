import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { Garden, DEFAULTS, PRESETS } from '../src/simulation.js';
import { timeline, phasePlot } from '../src/charts.js';

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`✓ ${name}`); }
function advance(garden, seconds) { for (let i = 0; i < seconds * 10; i++) garden.tick(0.1); }

for (const directory of ['src', 'scripts']) {
  for (const file of await readdir(directory)) {
    if (!/\.(m?js)$/.test(file)) continue;
    const result = spawnSync(process.execPath, ['--check', `${directory}/${file}`], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
}
console.log('✓ All application and verification modules parse'); passed++;

check('The same seed and rules reproduce the same history', () => {
  const a = new Garden(), b = new Garden();
  advance(a, 240); advance(b, 240);
  assert.deepEqual(a.history, b.history);
  assert.deepEqual(a.blobs, b.blobs);
});

check('Copies spend parent energy and never create energy for free', () => {
  const g = new Garden({ ...DEFAULTS, blues: 1, reds: 0, blueEnergy: 0, blueSpeed: 0, blueThreshold: 88, growth: 0 });
  g.plants.forEach(p => p.fruit = 0);
  const parent = g.blobs[0];
  parent.energy = 100; parent.birthCooldown = 0;
  g.tick();
  assert.equal(g.blobs.length, 2);
  assert.equal(parent.energy, 54);
  assert.equal(g.blobs[1].energy, 34);
  assert.equal(g.blobs[1].parent, parent.id);
  assert.equal(g.blobs[1].generation, 2);
  assert.ok(g.blobs.reduce((sum, b) => sum + b.energy, 0) < 100);
});

check('Fruit is consumed, eating pauses movement, and fruit grows back', () => {
  const g = new Garden({ ...DEFAULTS, blues: 1, reds: 0 });
  const blob = g.blobs[0], plant = g.plants[0];
  blob.x = plant.x; blob.z = plant.z; blob.energy = 35;
  const fruit = plant.fruit;
  g.tick();
  assert.equal(plant.fruit, fruit - 1);
  assert.ok(blob.energy > 35);
  assert.equal(blob.action, 'Happy munching');
  const position = [blob.x, blob.z];
  advance(g, 1);
  assert.deepEqual([blob.x, blob.z], position);
  g.blobs = [];
  advance(g, 15);
  assert.equal(plant.fruit, fruit);
});

check('Contact transfers energy, gives the blue a recovery window, and pauses the red', () => {
  const g = new Garden({ ...DEFAULTS, blues: 1, reds: 1 });
  const blue = g.blobs[0], red = g.blobs[1];
  blue.x = red.x = 0; blue.z = red.z = 0;
  blue.energy = red.energy = 60;
  blue.timer = 2;
  g.tick();
  assert.equal(g.contacts, 1);
  assert.ok(blue.energy < 60);
  assert.ok(red.energy > 60);
  assert.ok(blue.immune > 0);
  const position = [red.x, red.z];
  advance(g, 2);
  assert.equal(g.contacts, 1);
  assert.deepEqual([red.x, red.z], position);
});

check('Blobs cannot live or copy indefinitely without food', () => {
  const g = new Garden({ ...DEFAULTS, growth: 0 });
  g.plants.forEach(p => p.fruit = 0);
  advance(g, 600);
  assert.equal(g.blobs.length, 0);
});

const balanced = new Garden();
advance(balanced, 1800);
check('The balanced garden sustains both groups for 30 simulated minutes', () => {
  assert.ok(balanced.history.every(p => p.blue > 0 && p.red > 0));
  assert.ok(balanced.births.blue > 100 && balanced.births.red > 20);
  assert.ok(Math.max(...balanced.history.map(p => p.blue)) < 150);
  assert.ok(Math.max(...balanced.history.map(p => p.red)) < 70);
});

check('Blue growth precedes red growth, with ongoing population waves', () => {
  const early = balanced.history.filter(p => p.time < 400);
  const bluePeak = early.reduce((best, p) => p.blue > best.blue ? p : best);
  const redPeak = early.reduce((best, p) => p.red > best.red ? p : best);
  assert.ok(bluePeak.time < redPeak.time);
  let turns = 0, direction = 0;
  const late = balanced.history.filter(p => p.time > 600).filter((_, i) => i % 20 === 0);
  for (let i = 1; i < late.length; i++) {
    const next = Math.sign(late[i].blue - late[i - 1].blue);
    if (next && direction && next !== direction) turns++;
    if (next) direction = next;
  }
  assert.ok(turns > 8);
});

for (const seed of [12, 99, 2026, 1]) {
  check(`Both groups survive 30 minutes with seed ${seed}`, () => {
    const g = new Garden({ ...DEFAULTS, seed });
    advance(g, 1800);
    assert.ok(g.history.every(p => p.blue > 0 && p.red > 0));
  });
}

check('Fruit-rich conditions produce faster blue growth', () => {
  const rich = new Garden({ ...DEFAULTS, ...PRESETS.rich.settings });
  const normal = new Garden();
  advance(rich, 100); advance(normal, 100);
  assert.ok(rich.counts().blue > normal.counts().blue * 1.5);
});

check('Low fruit limits the whole garden', () => {
  const g = new Garden({ ...DEFAULTS, ...PRESETS.low.settings });
  advance(g, 1000);
  assert.ok(Math.max(...g.history.map(p => p.blue)) < 35);
  assert.ok(Math.max(...g.history.map(p => p.red)) < 10);
  assert.ok(g.counts().blue < 30);
});

check('A red-heavy start reduces blues first, then reds lose energy and fade', () => {
  const g = new Garden({ ...DEFAULTS, ...PRESETS.red.settings });
  advance(g, 400);
  const blueGone = g.history.find(p => p.blue === 0);
  const redGone = g.history.find(p => p.red === 0);
  assert.ok(blueGone && redGone && blueGone.time < redGone.time);
});

check('Live rule changes take effect without resetting the garden', () => {
  const g = new Garden();
  advance(g, 20);
  const time = g.time;
  g.updateSetting('fruitLimit', 1);
  g.updateSetting('blueSpeed', 1.8);
  assert.ok(g.plants.every(p => p.fruit <= 1));
  assert.equal(g.settings.blueSpeed, 1.8);
  assert.equal(g.time, time);
});

check('Every chart sample comes from recorded simulation state', () => {
  const g = new Garden();
  assert.deepEqual(g.history[0], { time: 0, fruit: 72, blue: 24, red: 6 });
  advance(g, 60);
  g.record();
  assert.deepEqual(g.history.at(-1), { time: g.time, ...g.counts() });
  assert.ok(timeline(g.history).includes('Recorded populations'));
  assert.ok(phasePlot(g.history).includes('Phase plot'));
  assert.ok(!timeline(g.history).includes('NaN'));
  assert.ok(!phasePlot(g.history).includes('NaN'));
});

check('Empty populations remain valid and charts stay readable', () => {
  const g = new Garden({ ...DEFAULTS, blues: 0, reds: 0 });
  advance(g, 180);
  assert.equal(g.blobs.length, 0);
  assert.ok(g.plants.every(p => p.fruit === DEFAULTS.fruitLimit));
  assert.ok(!phasePlot(g.history).includes('NaN'));
  assert.ok(g.summary().title.includes('quiet'));
});

const html = await readFile('index.html', 'utf8');
const app = await readFile('src/app.js', 'utf8');
check('Browser title and primary visible title use the requested model identity', () => {
  assert.ok(html.includes('<title>GPT-6</title>'));
  assert.ok(app.includes('<h1>GPT-6</h1>'));
});

console.log(`\n${passed} checks passed. Deterministic ecology, energy rules, presets, charts, and source syntax verified.`);
