import assert from "node:assert/strict";
import { GardenSimulation, PRESETS, runHeadless } from "../engine.mjs";

const DURATION = 900;
const results = {};
const histories = {};

function coarsePeaks(history, key) {
  const samples = history.filter((point) => point.t % 30 === 0);
  const peaks = [];
  for (let index = 1; index < samples.length - 1; index += 1) {
    if (samples[index][key] > samples[index - 1][key] && samples[index][key] >= samples[index + 1][key]) peaks.push(samples[index]);
  }
  return peaks;
}

function lagCorrelation(history, lagSeconds) {
  const samples = history.filter((point) => point.t % 10 === 0);
  const lag = Math.round(lagSeconds / 10);
  const blue = samples.slice(0, samples.length - lag).map((point) => point.blue);
  const red = samples.slice(lag).map((point) => point.red);
  const blueMean = blue.reduce((sum, value) => sum + value, 0) / blue.length;
  const redMean = red.reduce((sum, value) => sum + value, 0) / red.length;
  let numerator = 0;
  let blueVariance = 0;
  let redVariance = 0;
  for (let index = 0; index < blue.length; index += 1) {
    const blueDelta = blue[index] - blueMean;
    const redDelta = red[index] - redMean;
    numerator += blueDelta * redDelta;
    blueVariance += blueDelta * blueDelta;
    redVariance += redDelta * redDelta;
  }
  return numerator / Math.sqrt(blueVariance * redVariance);
}

for (const [key, preset] of Object.entries(PRESETS)) {
  const { simulation, report } = runHeadless(preset.values, DURATION);
  assert.equal(report.invariantErrors.length, 0, `${key}: engine invariants failed: ${report.invariantErrors.join(", ")}`);
  assert.equal(simulation.history.length, DURATION + 1, `${key}: expected one history point per simulated second`);
  assert.equal(simulation.history[0].t, 0, `${key}: history must start at zero`);
  assert.equal(simulation.history.at(-1).t, DURATION, `${key}: history must reach the requested duration`);
  results[key] = report;
  histories[key] = simulation.history;
}

const replayA = runHeadless(PRESETS.balanced.values, 360).simulation;
const replayB = runHeadless(PRESETS.balanced.values, 360).simulation;
assert.deepEqual(replayA.history, replayB.history, "same seed and settings must reproduce identical history");
assert.deepEqual(replayA.stats, replayB.stats, "same seed and settings must reproduce identical events");

const liveControls = new GardenSimulation(PRESETS.balanced.values);
const blueSpeedBefore = liveControls.blues[0].traits.speed;
const redVisionBefore = liveControls.reds[0].traits.vision;
liveControls.setConfigValue("blueSpeed", PRESETS.balanced.values.blueSpeed * 1.2);
liveControls.setConfigValue("redVision", PRESETS.balanced.values.redVision * 0.8);
assert.ok(Math.abs(liveControls.blues[0].traits.speed / blueSpeedBefore - 1.2) < 1e-9, "live blue speed control must affect current residents");
assert.ok(Math.abs(liveControls.reds[0].traits.vision / redVisionBefore - 0.8) < 1e-9, "live red vision control must affect current residents");

const balanced = results.balanced;
assert.equal(balanced.extinctBlue, false, "balanced: blue should survive a long run");
assert.equal(balanced.extinctRed, false, "balanced: red should survive a long run");
assert.ok(balanced.bluePeak >= PRESETS.balanced.values.startBlue * 1.6, "balanced: fruit should create a visible blue rise");
assert.ok(balanced.redPeak >= PRESETS.balanced.values.startRed * 2, "balanced: red should visibly follow blue abundance");
assert.ok(balanced.stats.fruitEaten > 100 && balanced.stats.contacts > 100, "balanced: both energy pathways must be active");
assert.ok(balanced.final.blue < 100 && balanced.final.red < 75, "balanced: populations must stay below safety caps");
const balancedLate = histories.balanced.slice(-360);
assert.ok(Math.max(...balancedLate.map((point) => point.blue)) - Math.min(...balancedLate.map((point) => point.blue)) >= 8, "balanced: blue should keep cycling late in the run");
assert.ok(Math.max(...balancedLate.map((point) => point.red)) - Math.min(...balancedLate.map((point) => point.red)) >= 8, "balanced: red should keep cycling late in the run");
assert.ok(coarsePeaks(histories.balanced, "blue").length >= 3, "balanced: blue should show repeated, amplitude-qualified turns");
assert.ok(coarsePeaks(histories.balanced, "red").length >= 3, "balanced: red should show repeated, amplitude-qualified turns");
assert.ok(lagCorrelation(histories.balanced, 0) < 0 && lagCorrelation(histories.balanced, 180) > 0.25, "balanced: red should follow blue out of phase rather than move in lockstep");

const rich = results.fruitRich;
assert.ok(rich.bluePeak > balanced.bluePeak * 1.7, "fruit-rich: blue peak should materially exceed balanced");
assert.ok(rich.meanBlue > balanced.meanBlue * 2, "fruit-rich: blue mean should materially exceed balanced");
assert.ok(rich.stats.blueBirths > balanced.stats.blueBirths * 2, "fruit-rich: extra food should fund many more blue births");
assert.ok(histories.fruitRich[120].blue > histories.balanced[120].blue * 1.5, "fruit-rich: blue should be growing much faster by two minutes");

const low = results.lowFruit;
assert.ok(low.bluePeak < balanced.bluePeak * 0.5, "low-fruit: blue peak should stay small");
assert.ok(low.meanBlue < balanced.meanBlue * 0.6, "low-fruit: average blue population should stay small");
assert.ok(low.meanRed < balanced.meanRed * 0.3, "low-fruit: average red population should stay small");
assert.ok(low.meanFruit < PRESETS.lowFruit.values.startTrees, "low-fruit: branches should spend much of the run depleted");

const fragile = results.fragile;
assert.equal(fragile.extinctBlue, false, "fragile: blue should survive the default recipe");
assert.equal(fragile.extinctRed, false, "fragile: red should survive the default recipe");
assert.ok(fragile.bluePeak < balanced.bluePeak && fragile.redPeak < balanced.redPeak, "fragile: both groups should remain below balanced peaks");

const heavy = results.redHeavy;
assert.ok(heavy.minimumBlueTime < heavy.minimumRedTime, "red-heavy: blue should bottom out before red");
assert.ok(heavy.redPeak > PRESETS.redHeavy.values.startRed, "red-heavy: red should initially grow on abundant blue");
assert.equal(heavy.extinctBlue, true, "red-heavy: blue should fade in the stress test");
assert.equal(heavy.extinctRed, true, "red-heavy: red should fade later after blue scarcity");

console.log("Deterministic ecology checks passed");
console.table(Object.fromEntries(Object.entries(results).map(([key, report]) => [key, {
  finalFruit: report.final.fruit,
  finalBlue: report.final.blue,
  finalRed: report.final.red,
  bluePeak: report.bluePeak,
  redPeak: report.redPeak,
  blueLowAt: report.minimumBlueTime,
  redLowAt: report.minimumRedTime,
  fruitEaten: report.stats.fruitEaten,
  contacts: report.stats.contacts
}])));
