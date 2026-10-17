import { GardenScene } from "./render/GardenScene";
import { DEFAULT_PARAMS, PARAM_SPECS, PRESETS, clampParam, presetParams, type ParamKey, type Params } from "./sim/params";
import { DT, Simulation, type Blob } from "./sim/simulation";

export const SPEEDS = [0.25, 0.5, 1, 2, 3, 5, 8, 12, 20, 32];
const MAX_TICKS_PER_FRAME = 60;

export interface Selection {
  id: number;
  blob: Blob;
}

export class Engine {
  sim: Simulation;
  params: Params;
  running = true;
  speed = 3;
  follow = false;
  presetId: string | null = "balanced";
  selection: Selection | null = null;
  version = 0;
  fps = 60;

  private scene: GardenScene | null = null;
  private listeners = new Set<() => void>();
  private raf = 0;
  private last = 0;
  private lastEmit = 0;
  private acc = 0;

  constructor(params: Params = DEFAULT_PARAMS) {
    this.params = { ...params };
    this.sim = new Simulation(this.params);
  }

  attach(container: HTMLElement): void {
    this.scene = new GardenScene(container, { onPick: (id) => this.select(id) });
    this.scene.setWorld(this.sim);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  detach(): void {
    cancelAnimationFrame(this.raf);
    this.scene?.dispose();
    this.scene = null;
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getVersion = (): number => this.version;

  emit(): void {
    this.version++;
    for (const fn of this.listeners) fn();
  }

  /** Reset-only parameters that differ from the running garden. */
  pendingReset(): ParamKey[] {
    return PARAM_SPECS.filter((s) => s.resetOnly && this.params[s.key] !== this.sim.startParams[s.key]).map(
      (s) => s.key,
    );
  }

  setParam(key: ParamKey, value: number): void {
    this.params = { ...this.params, [key]: clampParam(key, value) };
    this.presetId = null;
    this.sim.setParams(this.params);
    this.emit();
  }

  reset(params: Params = this.params): void {
    this.params = { ...params };
    this.sim = new Simulation(this.params);
    this.acc = 0;
    this.selection = null;
    this.follow = false;
    this.scene?.setWorld(this.sim);
    this.emit();
  }

  applyPreset(id: string): void {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    this.reset(presetParams(preset, this.params.seed));
    this.presetId = id;
    if (preset.speed) this.speed = preset.speed;
    this.running = true;
    this.emit();
  }

  newSeed(): void {
    this.setParam("seed", 1 + Math.floor(Math.random() * 999998));
    this.reset();
  }

  randomize(): void {
    const r = (a: number, b: number) => a + Math.random() * (b - a);
    const base = DEFAULT_PARAMS;
    const next: Params = { ...this.params };
    const jitter: Partial<Record<ParamKey, [number, number]>> = {
      fruitGrowth: [0.7, 1.5],
      fruitLimit: [0.6, 1.4],
      fruitDelay: [0.5, 1.6],
      blueEnergyUse: [0.85, 1.15],
      blueSpeed: [0.85, 1.15],
      blueVision: [0.8, 1.25],
      blueCopyAt: [0.85, 1.2],
      blueEatTime: [0.7, 1.4],
      redEnergyUse: [0.85, 1.15],
      redSpeed: [0.9, 1.1],
      redVision: [0.8, 1.2],
      redContact: [0.85, 1.15],
      redCopyAt: [0.85, 1.15],
      redPauseTime: [0.6, 1.5],
      trees: [0.7, 1.4],
      blueStart: [0.5, 1.6],
      redStart: [0.4, 2],
      worldSize: [0.8, 1.2],
    };
    for (const [key, [lo, hi]] of Object.entries(jitter) as [ParamKey, [number, number]][]) {
      next[key] = clampParam(key, base[key] * r(lo, hi));
    }
    next.seed = 1 + Math.floor(Math.random() * 999998);
    this.reset(next);
    this.presetId = null;
    this.running = true;
    this.emit();
  }

  togglePlay(): void {
    this.running = !this.running;
    this.emit();
  }

  stepOnce(seconds = 1): void {
    this.running = false;
    const ticks = Math.round(seconds / DT);
    for (let i = 0; i < ticks; i++) this.sim.step();
    this.acc = 0;
    this.emit();
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    this.emit();
  }

  setFollow(on: boolean): void {
    this.follow = on;
    this.emit();
  }

  select(id: number | null): void {
    const b = id != null ? this.sim.byId.get(id) : undefined;
    this.selection = b ? { id: b.id, blob: b } : null;
    if (!b) this.follow = false;
    this.emit();
  }

  frameCamera(): void {
    this.scene?.frameCamera();
  }

  private loop = (now: number): void => {
    this.raf = requestAnimationFrame(this.loop);
    const dtReal = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.fps = this.fps * 0.95 + (dtReal > 0 ? 1 / dtReal : 60) * 0.05;

    if (this.running) {
      this.acc += dtReal * this.speed;
      let ticks = Math.floor(this.acc / DT);
      if (ticks > MAX_TICKS_PER_FRAME) {
        ticks = MAX_TICKS_PER_FRAME;
        this.acc = 0;
      } else {
        this.acc -= ticks * DT;
      }
      for (let i = 0; i < ticks; i++) this.sim.step();
    }
    const sel = this.selection && this.selection.blob.alive ? this.selection.id : null;
    if (!sel && this.follow) this.follow = false;

    this.scene?.frame({
      sim: this.sim,
      alpha: this.running ? Math.min(1, this.acc / DT) : 1,
      dt: dtReal,
      events: this.sim.drainEvents(),
      selectedId: sel,
      follow: this.follow,
      speed: this.running ? this.speed : 1,
    });

    if (now - this.lastEmit > 125) {
      this.lastEmit = now;
      this.emit();
    }
  };
}
