import type { Params } from "./sim/params";
import { DT, Simulation } from "./sim/simulation";
import type { WorldView } from "./render/world";

const MAX_STEPS_PER_FRAME = 240;
const UI_INTERVAL = 1000 / 8;

export class Engine {
  sim: Simulation;
  params: Params;
  playing = false;
  version = 0;
  fps = 60;
  private view: WorldView | null = null;
  private acc = 0;
  private raf = 0;
  private last = 0;
  private lastNotify = 0;
  private listeners = new Set<() => void>();

  constructor(params: Params) {
    this.params = { ...params };
    this.sim = new Simulation(this.params);
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getVersion = () => this.version;

  notify() {
    this.version++;
    this.lastNotify = performance.now();
    for (const fn of this.listeners) fn();
  }

  attach(view: WorldView) {
    this.view = view;
    view.build(this.sim);
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.frame);
  }

  detach() {
    cancelAnimationFrame(this.raf);
    this.view = null;
  }

  /** Live-tunable params apply immediately; world-shape params wait for reset(). */
  setParams(p: Params) {
    this.params = { ...p };
    const { trees, blues, reds, worldSize, seed } = this.sim.params;
    this.sim.params = { ...p, trees, blues, reds, worldSize, seed };
    this.notify();
  }

  reset(p?: Params) {
    if (p) this.params = { ...p };
    this.sim.reset(this.params);
    this.acc = 0;
    this.view?.build(this.sim);
    this.notify();
  }

  setPlaying(on: boolean) {
    this.playing = on;
    this.last = performance.now();
    this.notify();
  }

  step(seconds = 1) {
    const n = Math.round(seconds / DT);
    for (let i = 0; i < n; i++) this.sim.step();
    this.acc = 0;
    this.notify();
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (dt > 0) this.fps += (1 / dt - this.fps) * 0.05;

    if (this.playing) {
      this.acc += dt * this.params.simSpeed;
      let steps = Math.floor(this.acc / DT);
      if (steps > MAX_STEPS_PER_FRAME) {
        steps = MAX_STEPS_PER_FRAME;
        this.acc = 0;
      } else {
        this.acc -= steps * DT;
      }
      for (let i = 0; i < steps; i++) this.sim.step();
    }
    const alpha = this.playing ? Math.min(1, this.acc / DT) : 1;
    const events = this.sim.events.splice(0);
    this.view?.update(this.sim, alpha, dt, this.playing, events);

    if (now - this.lastNotify > UI_INTERVAL) this.notify();
  };
}
