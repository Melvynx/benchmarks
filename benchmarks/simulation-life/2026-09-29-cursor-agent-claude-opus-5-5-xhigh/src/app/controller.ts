import { DT, Simulation, type Blob } from "../sim/engine";
import { mulberry32 } from "../sim/rng";
import {
  DEFAULT_PARAMS,
  META_BY_KEY,
  PARAM_META,
  clampParam,
  presetParams,
  type ParamKey,
  type Params,
} from "../sim/params";
import type { GardenView, ViewSettings } from "../render/garden";

/** Keeps the browser responsive at high speeds; any excess simulated time is dropped. */
const MAX_STEPS_PER_FRAME = 48;
const UI_HZ = 8;

export class Controller {
  params: Params;
  sim: Simulation;
  running = true;
  presetId: string | null = "balanced";
  selectedId: number | null = null;
  /** Last seen copy of the selected blob, kept after it fades so the inspector can say goodbye. */
  selectedSnapshot: Blob | null = null;
  lagging = false;
  view: GardenView | null = null;

  private version = 0;
  private listeners = new Set<() => void>();
  private acc = 0;
  private raf = 0;
  private lastFrame = 0;
  private lastEmit = 0;

  constructor() {
    this.params = presetParams("balanced", DEFAULT_PARAMS);
    this.sim = this.makeSim();
  }

  // ------------------------------------------------------------ store

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getVersion = () => this.version;

  private emit() {
    this.version++;
    for (const fn of this.listeners) fn();
  }

  // ------------------------------------------------------------ lifecycle

  attach(view: GardenView) {
    this.view = view;
    view.onPick = (id) => this.select(id);
    view.setSim(this.sim);
    view.frameCamera();
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  detach() {
    cancelAnimationFrame(this.raf);
    this.view = null;
  }

  private makeSim() {
    const sim = new Simulation(this.params);
    sim.recordEvents = true;
    return sim;
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    const realDt = Math.min(0.1, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    const sim = this.sim;

    if (this.running) {
      this.acc += realDt * this.params.simSpeed;
      let steps = Math.floor(this.acc / DT);
      this.lagging = steps > MAX_STEPS_PER_FRAME;
      if (steps > MAX_STEPS_PER_FRAME) {
        steps = MAX_STEPS_PER_FRAME;
        this.acc = steps * DT + (this.acc % DT);
      }
      for (let i = 0; i < steps; i++) sim.step();
      this.acc -= steps * DT;
    }

    if (sim.events.length) {
      this.view?.handleEvents(sim.events);
      sim.events.length = 0;
    }
    this.trackSelection();
    this.view?.render(this.running ? this.acc / DT : 1, realDt, this.running, this.params.simSpeed);

    if (now - this.lastEmit > 1000 / UI_HZ) {
      this.lastEmit = now;
      this.emit();
    }
  };

  private trackSelection() {
    if (this.selectedId === null) return;
    const b = this.sim.byId.get(this.selectedId);
    if (b && !b.dead) this.selectedSnapshot = { ...b };
    else if (this.selectedSnapshot && !this.selectedSnapshot.dead) {
      this.selectedSnapshot = { ...this.selectedSnapshot, dead: true, action: "fade" };
    }
  }

  // ------------------------------------------------------------ transport

  play = () => {
    this.running = true;
    this.emit();
  };

  pause = () => {
    this.running = false;
    this.emit();
  };

  toggle = () => (this.running ? this.pause() : this.play());

  /** Advance exactly one simulated second while paused. */
  step = () => {
    this.running = false;
    this.acc = 0;
    this.sim.advance(1);
    this.emit();
  };

  reset = () => {
    this.sim = this.makeSim();
    this.acc = 0;
    this.select(null);
    this.view?.setSim(this.sim);
    this.emit();
  };

  applyPreset = (id: string) => {
    this.params = { ...presetParams(id, this.params), seed: this.params.seed };
    this.presetId = id;
    this.reset();
  };

  /** New seed plus a gentle ±20% nudge to every live rule, then a fresh garden. */
  randomize = () => {
    const rng = mulberry32((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    const base = presetParams(this.presetId ?? "balanced", this.params);
    const next: Params = { ...base, seed: Math.floor(rng() * 99999) + 1 };
    for (const m of PARAM_META) {
      if (m.group === "sim" || m.group === "start") continue;
      next[m.key] = clampParam(m.key, base[m.key] * (0.8 + rng() * 0.4));
    }
    this.params = next;
    this.presetId = null;
    this.reset();
  };

  setParam = (key: ParamKey, value: number) => {
    const v = key === "seed" ? Math.max(1, Math.floor(value) || 1) : clampParam(key, value);
    this.params = { ...this.params, [key]: v };
    if (key !== "simSpeed") this.presetId = null;
    if (key === "seed" || !META_BY_KEY[key]?.live) {
      this.emit();
      return;
    }
    this.sim.setParams({ ...this.sim.p, [key]: v });
    this.emit();
  };

  /** Start-only settings edited since the current garden was planted. */
  pendingKeys(): ParamKey[] {
    const keys: ParamKey[] = ["startTrees", "startBlue", "startRed", "worldSize", "seed"];
    return keys.filter((k) => this.params[k] !== this.sim.p[k]);
  }

  select = (id: number | null) => {
    const b = id !== null ? this.sim.byId.get(id) : undefined;
    this.selectedId = b ? b.id : null;
    this.selectedSnapshot = b ? { ...b } : null;
    id = this.selectedId;
    if (this.view) {
      this.view.selectedId = id;
      if (id === null) this.view.settings.follow = false;
    }
    this.emit();
  };

  setView = (patch: Partial<ViewSettings>) => {
    if (!this.view) return;
    Object.assign(this.view.settings, patch);
    this.emit();
  };

  viewSettings(): ViewSettings {
    return this.view?.settings ?? { autoSpin: false, follow: false, showSense: true };
  }
}
