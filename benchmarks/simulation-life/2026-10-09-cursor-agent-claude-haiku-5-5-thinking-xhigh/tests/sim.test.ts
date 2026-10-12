import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS, PRESETS, withPreset, type Params } from '../src/sim/params';
import { computeMetrics } from '../src/sim/analysis';
import { takeSample } from '../src/sim/engine';
import { createWorld, step, MAX_BLUE, MAX_RED } from '../src/sim/world';
import type { Sample, World } from '../src/sim/types';

const TICKS_PER_SECOND = 20;

function preset(id: string): Params {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`missing preset ${id}`);
  return withPreset(DEFAULT_PARAMS, p);
}

/** Runs the sim for `seconds` of sim time, recording a sample every second. */
function run(params: Params, seconds: number): { world: World; history: Sample[] } {
  const world = createWorld(params);
  const history: Sample[] = [takeSample(world)];
  for (let s = 0; s < seconds; s++) {
    for (let i = 0; i < TICKS_PER_SECOND; i++) step(world);
    history.push(takeSample(world));
  }
  return { world, history };
}

describe('determinism', () => {
  it('same params and seed give identical histories', () => {
    const a = run(DEFAULT_PARAMS, 60).history;
    const b = run(DEFAULT_PARAMS, 60).history;
    expect(b).toEqual(a);
  });

  it('a different seed changes the run', () => {
    const a = run(DEFAULT_PARAMS, 60).history;
    const b = run({ ...DEFAULT_PARAMS, seed: 9001 }, 60).history;
    expect(b).not.toEqual(a);
  });
});

describe('invariants', () => {
  it('energy never goes negative on living blobs and stays under the caps', () => {
    const { world } = run(preset('red-heavy'), 120);
    for (const b of [...world.blue, ...world.red]) {
      expect(b.energy).toBeGreaterThanOrEqual(0);
      expect(b.alive).toBe(true);
    }
    expect(world.blue.length).toBeLessThanOrEqual(MAX_BLUE);
    expect(world.red.length).toBeLessThanOrEqual(MAX_RED);
  });

  it('fruit stays between zero and the per-tree limit', () => {
    const params = preset('fruit-rich');
    const world = createWorld(params);
    for (let s = 0; s < 120; s++) {
      for (let i = 0; i < TICKS_PER_SECOND; i++) step(world);
      for (const t of world.trees) {
        expect(t.fruit).toBeGreaterThanOrEqual(0);
        expect(t.fruit).toBeLessThanOrEqual(params.fruitLimit);
      }
    }
  });
});

describe('quality targets', () => {
  it('fruit-rich garden lets blue grow faster than the balanced default', () => {
    const rich = computeMetrics(run(preset('fruit-rich'), 240).history);
    const base = computeMetrics(run(preset('balanced'), 240).history);
    expect(rich.peakBlue).toBeGreaterThan(base.peakBlue);
  });

  it('low-fruit garden stays small and keeps both groups alive', () => {
    const { history } = run(preset('low-fruit'), 300);
    const m = computeMetrics(history);
    expect(m.peakBlue).toBeLessThan(35);
    expect(m.blueExtinctAt).toBeNull();
    expect(m.redExtinctAt).toBeNull();
  });

  it('red-heavy garden lets red boom past its starting count', () => {
    const params = preset('red-heavy');
    const m = computeMetrics(run(params, 240).history);
    expect(m.peakRed).toBeGreaterThan(params.startRed * 1.5);
  });
});
