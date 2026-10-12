import {
  clampParam,
  PARAM_META,
  presetParams,
  PRESETS,
  RESET_KEYS,
  RULES,
  type ParamKey,
  type Params,
} from "../sim/params";
import { createRng } from "../sim/rng";
import { summarize, type Summary } from "../sim/summary";
import type { SimEvent } from "../sim/types";
import { createWorld, step, type World } from "../sim/world";

export interface Snapshot {
  version: number;
  worldVersion: number;
  historyVersion: number;
  running: boolean;
  time: number;
  counts: World["counts"];
  params: Params;
  presetId: string | null;
  pendingReset: ParamKey[];
  selected: number | null;
  selectedTree: number | null;
  follow: boolean;
  turntable: boolean;
  lagging: boolean;
  achievedSpeed: number;
}

const MAX_STEPS_PER_FRAME = 60;
/** Sim work allowed per animation frame, leaving room for rendering at 60 fps. */
const SIM_BUDGET_MS = 10;
const MAX_QUEUED_EVENTS = 600;

export class SimController {
  world: World;
  params: Params;
  running = false;
  presetId: string | null = "balanced";
  worldVersion = 0;
  selected: number | null = null;
  selectedTree: number | null = null;
  follow = false;
  turntable = false;
  lagging = false;

  private acc = 0;
  private events: SimEvent[] = [];
  private listeners = new Set<() => void>();
  private version = 0;
  private snap: Snapshot;
  private lastNotify = 0;
  private summaryCache: { v: number; at: number; s: Summary } | null = null;
  private lagFrames = 0;
  /** Smoothed garden seconds simulated per real second. */
  private achieved = 0;

  constructor() {
    this.params = presetParams("balanced");
    this.world = createWorld(this.params);
    this.snap = this.buildSnapshot();
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snap;

  private buildSnapshot(): Snapshot {
    const w = this.world;
    return {
      version: this.version,
      worldVersion: this.worldVersion,
      historyVersion: w.history.version,
      running: this.running,
      time: w.time,
      counts: w.counts,
      params: { ...this.params },
      presetId: this.presetId,
      pendingReset: RESET_KEYS.filter((k) => w.initParams[k] !== this.params[k]),
      selected: this.selected,
      selectedTree: this.selectedTree,
      follow: this.follow,
      turntable: this.turntable,
      lagging: this.lagging,
      achievedSpeed: this.lagging ? Math.max(0.5, Math.round(this.achieved * 2) / 2) : this.params.simSpeed,
    };
  }

  notify() {
    this.version++;
    this.snap = this.buildSnapshot();
    this.lastNotify = performance.now();
    for (const fn of this.listeners) fn();
  }

  /** Called by the render loop each frame; returns interpolation alpha between the last two ticks. */
  frame(realDt: number): number {
    if (this.running) {
      const dt = RULES.dt;
      const real = Math.min(realDt, 0.1);
      this.acc += real * this.params.simSpeed;
      const deadline = performance.now() + SIM_BUDGET_MS;
      let n = 0;
      while (this.acc >= dt && n < MAX_STEPS_PER_FRAME) {
        this.stepOnce();
        this.acc -= dt;
        n++;
        if (performance.now() > deadline) break;
      }
      if (this.acc >= dt) {
        this.acc = 0;
        this.lagFrames = Math.min(60, this.lagFrames + 1);
      } else {
        this.lagFrames = Math.max(0, this.lagFrames - 1);
      }
      if (real > 0) this.achieved += ((n * dt) / real - this.achieved) * 0.04;
      const lagging = this.lagFrames > 20;
      if (lagging !== this.lagging) {
        this.lagging = lagging;
        this.notify();
      }
    }
    if (performance.now() - this.lastNotify > 120) this.notify();
    return this.running ? this.acc / RULES.dt : 1;
  }

  private stepOnce() {
    step(this.world);
    const evs = this.world.events;
    if (evs.length) {
      if (this.events.length < MAX_QUEUED_EVENTS) this.events.push(...evs);
      evs.length = 0;
    }
    if (this.selected !== null && !this.world.byId.has(this.selected)) {
      this.follow = false;
    }
  }

  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  play() {
    this.running = true;
    this.achieved = this.params.simSpeed;
    this.notify();
  }

  pause() {
    this.running = false;
    this.acc = 0;
    this.notify();
  }

  toggle() {
    if (this.running) this.pause();
    else this.play();
  }

  /** Advance half a garden second while paused. */
  stepOnceManual() {
    const ticks = Math.round(0.5 / RULES.dt);
    for (let i = 0; i < ticks; i++) this.stepOnce();
    this.notify();
  }

  reset() {
    this.world = createWorld(this.params);
    this.worldVersion++;
    this.acc = 0;
    this.selected = null;
    this.selectedTree = null;
    this.follow = false;
    this.events = [];
    this.summaryCache = null;
    this.notify();
  }

  setParam(key: ParamKey, value: number) {
    this.params[key] = clampParam(key, value);
    if (key !== "simSpeed") this.presetId = this.matchPreset();
    this.notify();
  }

  applyPreset(id: string) {
    const keep = { simSpeed: this.params.simSpeed, seed: this.params.seed };
    const next = presetParams(id, keep);
    Object.assign(this.params, next);
    this.presetId = id;
    this.reset();
  }

  randomize() {
    const rng = createRng((Date.now() ^ (this.params.seed * 7919)) >>> 0);
    const base = presetParams(rng.pick(PRESETS).id);
    for (const m of PARAM_META) {
      if (m.key === "simSpeed") continue;
      if (m.key === "seed") {
        this.params.seed = rng.int(1, 10000);
        continue;
      }
      const span = m.max - m.min;
      const jitter = m.log ? base[m.key] * Math.exp(rng.range(-0.35, 0.35)) : base[m.key] + rng.range(-0.18, 0.18) * span;
      this.params[m.key] = clampParam(m.key, Math.round(jitter / m.step) * m.step);
    }
    this.presetId = this.matchPreset();
    this.reset();
    this.play();
  }

  newSeed() {
    this.params.seed = 1 + Math.floor(Math.random() * 9999);
    this.reset();
  }

  private matchPreset(): string | null {
    for (const p of PRESETS) {
      const target = presetParams(p.id);
      const same = PARAM_META.every(
        (m) => m.key === "simSpeed" || m.key === "seed" || Math.abs(target[m.key] - this.params[m.key]) < 1e-9,
      );
      if (same) return p.id;
    }
    return null;
  }

  select(id: number | null) {
    this.selected = id;
    if (id !== null) this.selectedTree = null;
    if (id === null) this.follow = false;
    this.notify();
  }

  selectTree(id: number | null) {
    this.selectedTree = id;
    if (id !== null) {
      this.selected = null;
      this.follow = false;
    }
    this.notify();
  }

  setFollow(on: boolean) {
    this.follow = on && this.selected !== null;
    this.notify();
  }

  setTurntable(on: boolean) {
    this.turntable = on;
    this.notify();
  }

  summary(): Summary {
    const v = this.world.history.version;
    const now = performance.now();
    if (this.summaryCache && (this.summaryCache.v === v || now - this.summaryCache.at < 700)) {
      return this.summaryCache.s;
    }
    const s = summarize(this.world);
    this.summaryCache = { v, at: now, s };
    return s;
  }
}
