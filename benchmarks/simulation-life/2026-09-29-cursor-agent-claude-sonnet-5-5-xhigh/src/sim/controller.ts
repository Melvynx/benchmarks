import { DT, World } from './engine';
import { DEFAULT_PARAMS, PRESETS, REBUILD_KEYS, type ParamKey, type Params } from './params';
import { Rng } from './rng';

export class Simulator {
  params: Params = { ...DEFAULT_PARAMS };
  world: World;
  playing = false;
  presetId: string | null = 'balanced';
  /** Interpolation fraction between the previous and the current simulation step. */
  alpha = 1;
  worldVersion = 0;
  private acc = 0;

  constructor() {
    this.world = new World(this.params);
  }

  reset(next?: Partial<Params>) {
    if (next) this.params = { ...this.params, ...next };
    this.world = new World(this.params);
    this.acc = 0;
    this.alpha = 1;
    this.worldVersion++;
  }

  setParam(key: ParamKey, value: number) {
    this.params = { ...this.params, [key]: value };
    if (key !== 'speed') this.presetId = null;
    if (REBUILD_KEYS.includes(key)) {
      this.reset();
    } else {
      this.world.setParams(this.params);
    }
  }

  applyPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const speed = this.params.speed;
    const seed = this.params.seed;
    this.params = { ...DEFAULT_PARAMS, ...preset.params, speed, seed };
    this.presetId = id;
    this.reset();
  }

  randomize() {
    const rng = new Rng((Math.random() * 2 ** 31) >>> 0);
    const base = this.presetId ? { ...DEFAULT_PARAMS, ...(PRESETS.find((p) => p.id === this.presetId)?.params ?? {}) } : this.params;
    const jitter = (v: number, spread: number, lo: number, hi: number, digits = 2) => {
      const r = v * (1 + (rng.next() * 2 - 1) * spread);
      const q = 10 ** digits;
      return Math.round(Math.min(hi, Math.max(lo, r)) * q) / q;
    };
    this.params = {
      ...base,
      speed: this.params.speed,
      seed: 1 + Math.floor(rng.next() * 9999),
      fruitGrowth: jitter(base.fruitGrowth, 0.4, 0.4, 2.2),
      fruitLimit: Math.round(jitter(base.fruitLimit, 0.4, 3, 9, 0)),
      fruitDelay: Math.round(jitter(base.fruitDelay, 0.5, 2, 24, 0)),
      blueSpeed: jitter(base.blueSpeed, 0.2, 1.8, 3.6, 1),
      blueVision: jitter(base.blueVision, 0.25, 5, 14, 1),
      blueCopy: Math.round(jitter(base.blueCopy, 0.12, 70, 115, 0)),
      blueEat: jitter(base.blueEat, 0.4, 0.6, 3.5, 1),
      redSpeed: jitter(base.redSpeed, 0.15, 2.2, 4.2, 1),
      redVision: jitter(base.redVision, 0.25, 5, 14, 1),
      redContact: jitter(base.redContact, 0.25, 0.6, 1.5),
      redCopy: Math.round(jitter(base.redCopy, 0.12, 80, 120, 0)),
      redPause: jitter(base.redPause, 0.4, 1, 8, 1),
      trees: Math.round(jitter(base.trees, 0.3, 5, 14, 0)),
      blueStart: Math.round(jitter(base.blueStart, 0.3, 20, 60, 0)),
      redStart: Math.round(jitter(base.redStart, 0.5, 3, 16, 0)),
    };
    this.presetId = null;
    this.reset();
  }

  play() {
    this.playing = true;
  }

  pause() {
    this.playing = false;
  }

  toggle() {
    this.playing = !this.playing;
  }

  /** Advance the world by a fixed number of simulated seconds (used by the Step button). */
  stepSeconds(seconds: number) {
    const n = Math.max(1, Math.round(seconds / DT));
    this.world.emitEvents = true;
    for (let i = 0; i < n; i++) {
      if (i === n - 1) this.world.emitEvents = true;
      else this.world.emitEvents = false;
      this.world.step();
    }
    this.alpha = 1;
  }

  frame(realDt: number) {
    if (!this.playing) return 0;
    const speed = this.params.speed;
    this.acc += Math.min(realDt, 0.08) * speed;
    let steps = 0;
    const maxSteps = 1200;
    const w = this.world;
    w.emitEvents = speed <= 12;
    while (this.acc >= DT && steps < maxSteps) {
      w.step(DT);
      this.acc -= DT;
      steps++;
    }
    if (steps >= maxSteps) this.acc = 0;
    this.alpha = Math.min(1, this.acc / DT);
    return steps;
  }
}
