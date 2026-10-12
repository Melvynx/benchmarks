import { DEFAULT_PARAMS, type Params } from './params';
import { DT, step, createWorld } from './world';
import type { Blob, Sample, World } from './types';

/** Record history every 0.5 sim seconds. */
const SAMPLE_EVERY = 10;
const MAX_TICKS_PER_FRAME = 400;

function meanOf(arr: Blob[], pick: (b: Blob) => number): number {
  if (arr.length === 0) return NaN;
  let s = 0;
  for (const b of arr) s += pick(b);
  return s / arr.length;
}

export function takeSample(w: World): Sample {
  let fruit = 0;
  for (const t of w.trees) fruit += t.fruit;
  return {
    t: w.time,
    fruit,
    blue: w.blue.length,
    red: w.red.length,
    blueEnergy: meanOf(w.blue, (b) => Math.max(0, b.energy)),
    redEnergy: meanOf(w.red, (b) => Math.max(0, b.energy)),
    blueSpeedT: meanOf(w.blue, (b) => b.speedTrait),
    blueVisionT: meanOf(w.blue, (b) => b.visionTrait),
    redSpeedT: meanOf(w.red, (b) => b.speedTrait),
    redVisionT: meanOf(w.red, (b) => b.visionTrait),
    births: w.totals.births.blue + w.totals.births.red,
    deaths: w.totals.deaths.blue + w.totals.deaths.red,
    eats: w.totals.eats,
    bites: w.totals.bites,
  };
}

/**
 * Owns the simulation clock and the recorded history.
 * Rendering and UI read from it; they never change the rules.
 */
export class Engine {
  world: World;
  history: Sample[] = [];
  speed = 1;
  playing = false;
  private acc = 0;

  constructor(params: Params = DEFAULT_PARAMS) {
    this.world = createWorld(params);
    this.history = [takeSample(this.world)];
  }

  reset(params: Params): void {
    this.world = createWorld(params);
    this.history = [takeSample(this.world)];
    this.acc = 0;
  }

  /**
   * Live tuning: takes effect on the next tick. Garden size and seed belong to the
   * current garden and only change on reset.
   */
  setParams(params: Params): void {
    this.world.params = { ...params, worldSize: this.world.params.worldSize, seed: this.world.params.seed };
  }

  /** Advance by real seconds at the current speed. Returns ticks run. */
  advance(realDt: number): number {
    if (!this.playing) return 0;
    this.acc += realDt * this.speed;
    let n = 0;
    while (this.acc >= DT) {
      if (n >= MAX_TICKS_PER_FRAME) {
        this.acc = 0;
        break;
      }
      this.tick();
      this.acc -= DT;
      n++;
    }
    return n;
  }

  /** Manual step: one simulated second. */
  stepSecond(): void {
    for (let i = 0; i < Math.round(1 / DT); i++) this.tick();
  }

  private tick(): void {
    step(this.world);
    if (this.world.tick % SAMPLE_EVERY === 0) this.history.push(takeSample(this.world));
  }
}
