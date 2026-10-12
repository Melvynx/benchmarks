import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, createWorld, defaults, presets, snapshot } from './simulation.js';

function run(values, seconds) {
  const world = createWorld({ ...defaults, ...values });
  const observations = new Map([[0, snapshot(world)]]);
  let peakBlue = 0;
  let peakRed = 0;
  for (let tick = 1; tick <= seconds * 10; tick++) {
    advance(world, 0.1);
    if (tick % 100 === 0) {
      const state = snapshot(world);
      observations.set(tick / 10, state);
      peakBlue = Math.max(peakBlue, state.blue);
      peakRed = Math.max(peakRed, state.red);
    }
  }
  return { observations, peakBlue, peakRed, final: snapshot(world) };
}

test('balanced garden produces delayed red growth and remains bounded for 300 days', () => {
  const garden = run({}, 3000);
  assert.ok(garden.observations.get(40).blue > garden.observations.get(40).red);
  assert.ok(garden.observations.get(160).red > garden.observations.get(160).blue);
  assert.ok(garden.final.blue > 4 && garden.final.red > 3);
  assert.ok(garden.peakBlue < 80 && garden.peakRed < 80);
});

test('presets produce distinct outcomes from the same energy rules', () => {
  const balancedEarly = run({}, 60);
  const rich = run(presets.rich.values, 60);
  const sparse = run(presets.sparse.values, 250);
  const redHeavy = run(presets.redHeavy.values, 450);
  assert.ok(rich.final.blue > balancedEarly.final.blue);
  assert.ok(sparse.final.blue < balancedEarly.final.blue);
  assert.ok(redHeavy.observations.get(100).blue < defaults.blue);
  assert.ok(redHeavy.final.red < redHeavy.observations.get(100).red);
});

test('fruit is picked, eaten during a pause, and regrows on its tree', () => {
  const world = createWorld({ ...defaults, trees: 1, blue: 1, red: 0, fruitLimit: 2, fruitGrowth: 1.6, fruitDelay: 2, blueVision: 2, blueSpeed: 1.8, blueCopy: 200 });
  const tree = world.trees[0];
  const blue = world.blobs[0];
  let picked = false;
  let restoredEnergy = false;
  let regrew = false;
  let energyAtPick = 0;
  let previousFruit = tree.fruit;
  for (let tick = 0; tick < 300; tick++) {
    advance(world, 0.1);
    if (!picked && tree.fruit < previousFruit) {
      picked = true;
      energyAtPick = blue.energy;
      assert.equal(blue.action, 'Eating fruit');
      assert.ok(blue.timer > 0);
    }
    if (picked && blue.energy > energyAtPick + 15) restoredEnergy = true;
    if (picked && tree.fruit > previousFruit) { regrew = true; break; }
    previousFruit = tree.fruit;
  }
  assert.ok(picked && restoredEnergy && regrew);
});

test('red contact costs blue energy and restores red energy after its pause', () => {
  const world = createWorld({ ...defaults, trees: 0, blue: 1, red: 1, redVision: 2, redSpeed: 1.8, blueSpeed: 0.5, blueCopy: 200, redCopy: 200 });
  const blue = world.blobs.find(blob => blob.kind === 'blue');
  const red = world.blobs.find(blob => blob.kind === 'red');
  const startingBlueEnergy = blue.energy;
  let contactEnergy = null;
  let restored = false;
  for (let tick = 0; tick < 300; tick++) {
    advance(world, 0.1);
    if (contactEnergy === null && red.action === 'Happy pause') {
      contactEnergy = red.energy;
      assert.ok(red.timer > 0);
      assert.ok(blue.energy < startingBlueEnergy);
      assert.ok(blue.hitCooldown > 0);
    }
    if (contactEnergy !== null && red.energy > contactEnergy + 10) { restored = true; break; }
  }
  assert.ok(contactEnergy !== null && restored);
});

test('seed zero produces a distinct reproducible garden', () => {
  const first = createWorld({ ...defaults, seed: 0 });
  const repeat = createWorld({ ...defaults, seed: 0 });
  const other = createWorld({ ...defaults, seed: 1 });
  assert.deepEqual(first.trees, repeat.trees);
  assert.notDeepEqual(first.trees, other.trees);
});
