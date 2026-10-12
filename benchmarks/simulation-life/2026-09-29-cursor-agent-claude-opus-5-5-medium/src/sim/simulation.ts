import type { Params } from "./params";
import { createRng, type Rng } from "./rng";

export const DT = 1 / 30;

export const TREE_REACH = 1.55;
export const TRUNK_RADIUS = 0.55;
export const CONTACT_DIST = 0.85;
export const CANOPY_RADIUS = 1.65;
const NAP_WAKE_DIST = 2.2;
const NAP_COST = 0.5;

/** Hidden rules of the garden that aren't exposed as sliders. */
export const TUNING = {
  fruitEnergy: 25,
  contactEfficiency: 0.47,
  fleeMin: 0.85,
  fleeGain: 0.48,
  chaseLimit: 4.2,
  /** Blues under a canopy can only be spotted from this close. */
  hiddenSpotDist: 1.5,
  copyOverhead: 0.12,
  maxEnergyMul: { blue: 1.8, red: 1.3 } as Record<"blue" | "red", number>,
};

export type Kind = "blue" | "red";
export type Action =
  | "wandering"
  | "seeking"
  | "gathering"
  | "waiting"
  | "eating"
  | "fleeing"
  | "startled"
  | "copying"
  | "chasing"
  | "roaming"
  | "pausing"
  | "tired"
  | "hiding"
  | "napping";

export type DeathCause = "starved" | "old" | "contact";

export const ACTION_LABEL: Record<Action, string> = {
  wandering: "Wandering",
  seeking: "Heading for fruit",
  gathering: "Gathering at a tree",
  waiting: "Waiting for fruit",
  eating: "Eating fruit",
  fleeing: "Scooting away from red",
  startled: "Startled after a boop",
  copying: "Making a copy",
  chasing: "Chasing a blue blob",
  roaming: "Roaming",
  pausing: "Resting after a boop",
  tired: "Catching breath",
  hiding: "Hiding under the leaves",
  napping: "Napping (saving energy)",
};

interface KindConst {
  idle: number;
  move: number;
  refSpeed: number;
  vision: number;
  maturity: number;
  cooldown: number;
  lifespan: [number, number];
  turn: number;
}

export const KIND: Record<Kind, KindConst> = {
  blue: { idle: 0.7, move: 1.5, refSpeed: 3, vision: 0.04, maturity: 6, cooldown: 5, lifespan: [70, 120], turn: 7 },
  red: { idle: 1.1, move: 1.5, refSpeed: 3.5, vision: 0.035, maturity: 22, cooldown: 18, lifespan: [160, 260], turn: 5 },
};

export type SlotState = "ripe" | "growing" | "empty" | "eaten";

export interface FruitSlot {
  state: SlotState;
  growth: number;
  timer: number;
  eater: number;
}

export interface Tree {
  id: number;
  x: number;
  z: number;
  size: number;
  seed: number;
  slots: FruitSlot[];
  jiggle: number;
  targeters: number;
  redNearby: boolean;
}

export interface Blob {
  id: number;
  kind: Kind;
  alive: boolean;
  x: number;
  z: number;
  px: number;
  pz: number;
  vx: number;
  vz: number;
  energy: number;
  age: number;
  lifespan: number;
  action: Action;
  timer: number;
  timerMax: number;
  targetTree: number;
  targetBlob: number;
  eatTree: number;
  eatSlot: number;
  faceX: number;
  faceZ: number;
  wander: number;
  patience: number;
  restless: number;
  lastBirth: number;
  speedGene: number;
  visionGene: number;
  generation: number;
  parentId: number;
  children: number;
  meals: number;
  bornAt: number;
  hunter: number;
  hunterDist: number;
  chaseTime: number;
  ignoreId: number;
  ignoreTimer: number;
  hidden: boolean;
  idleTime: number;
  deathCause?: DeathCause;
}

export type SimEvent =
  | { type: "eatStart"; id: number; tree: number; x: number; z: number }
  | { type: "eat"; id: number; tree: number; x: number; z: number }
  | { type: "contact"; id: number; other: number; x: number; z: number; drained: number; faded: boolean }
  | { type: "birth"; id: number; parent: number; kind: Kind; x: number; z: number }
  | { type: "death"; id: number; kind: Kind; cause: DeathCause; x: number; z: number };

export interface HistoryPoint {
  t: number;
  fruit: number;
  blue: number;
  red: number;
  blueSpeed: number;
  redSpeed: number;
  blueVision: number;
  redVision: number;
  blueEnergy: number;
  redEnergy: number;
}

export interface SimStats {
  births: Record<Kind, number>;
  deaths: Record<Kind, Record<DeathCause, number>>;
  fruitEaten: number;
  contacts: number;
  peak: Record<Kind | "fruit", { value: number; t: number }>;
  extinctAt: Record<Kind, number | null>;
  start: { blue: number; red: number; fruit: number };
}

const MAX_HISTORY = 4000;
const MAX_EVENTS = 600;

export class Simulation {
  params: Params;
  rng!: Rng;
  time = 0;
  ticks = 0;
  radius = 16;
  trees: Tree[] = [];
  blobs: Blob[] = [];
  byId = new Map<number, Blob>();
  events: SimEvent[] = [];
  history: HistoryPoint[] = [];
  historyInterval = 0.5;
  stats!: SimStats;
  graveyard = new Map<number, { cause: DeathCause; time: number; kind: Kind }>();
  private nextId = 1;
  private nextSample = 0;
  private gridSize = 3;
  private gridW = 0;
  private cells: Blob[][] = [];

  constructor(params: Params) {
    this.params = { ...params };
    this.reset(params);
  }

  reset(params: Params) {
    this.params = { ...params };
    this.rng = createRng(params.seed * 2654435761);
    this.time = 0;
    this.ticks = 0;
    this.radius = params.worldSize;
    this.trees = [];
    this.blobs = [];
    this.byId.clear();
    this.graveyard.clear();
    this.events = [];
    this.history = [];
    this.historyInterval = 0.5;
    this.nextSample = 0;
    this.nextId = 1;
    this.stats = {
      births: { blue: 0, red: 0 },
      deaths: { blue: { starved: 0, old: 0, contact: 0 }, red: { starved: 0, old: 0, contact: 0 } },
      fruitEaten: 0,
      contacts: 0,
      peak: { blue: { value: 0, t: 0 }, red: { value: 0, t: 0 }, fruit: { value: 0, t: 0 } },
      extinctAt: { blue: null, red: null },
      start: { blue: params.blues, red: params.reds, fruit: 0 },
    };

    this.gridW = Math.ceil((this.radius * 2 + 4) / this.gridSize);
    this.cells = Array.from({ length: this.gridW * this.gridW }, () => []);

    this.placeTrees(params.trees);
    for (let i = 0; i < params.blues; i++) this.spawnInitial("blue");
    for (let i = 0; i < params.reds; i++) this.spawnInitial("red");
    this.stats.start.fruit = this.countFruit();
    this.sample();
  }

  private placeTrees(n: number) {
    const r = this.rng;
    const maxR = Math.max(2, this.radius - 2.2);
    const minD = Math.min(3.4, (this.radius * 1.5) / Math.sqrt(Math.max(1, n)));
    for (let i = 0; i < n; i++) {
      let best = { x: 0, z: 0 };
      let bestScore = -1;
      for (let attempt = 0; attempt < 40; attempt++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * maxR;
        const x = Math.cos(a) * d;
        const z = Math.sin(a) * d;
        let nearest = Infinity;
        for (const t of this.trees) nearest = Math.min(nearest, Math.hypot(t.x - x, t.z - z));
        if (nearest >= minD) {
          best = { x, z };
          bestScore = nearest;
          break;
        }
        if (nearest > bestScore) {
          bestScore = nearest;
          best = { x, z };
        }
      }
      const slots: FruitSlot[] = [];
      for (let s = 0; s < this.params.fruitLimit; s++) slots.push(this.makeSlot(r() < 0.75));
      this.trees.push({ id: i, x: best.x, z: best.z, size: r.range(0.85, 1.2), seed: r.int(1e9), slots, jiggle: 0, targeters: 0, redNearby: false });
    }
  }

  private makeSlot(ripe: boolean): FruitSlot {
    return ripe
      ? { state: "ripe", growth: 1, timer: 0, eater: -1 }
      : { state: "growing", growth: this.rng() * 0.8, timer: 0, eater: -1 };
  }

  private randomFreePoint(): { x: number; z: number } {
    for (let i = 0; i < 30; i++) {
      const a = this.rng() * Math.PI * 2;
      const d = Math.sqrt(this.rng()) * (this.radius - 1);
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      if (this.trees.every((t) => Math.hypot(t.x - x, t.z - z) > 1.3)) return { x, z };
    }
    return { x: 0, z: 0 };
  }

  private spawnInitial(kind: Kind) {
    const { x, z } = this.randomFreePoint();
    const k = KIND[kind];
    const b = this.createBlob(kind, x, z, kind === "blue" ? this.rng.range(40, 65) : this.rng.range(55, 85));
    b.age = this.rng.range(0, k.lifespan[0] * 0.6);
    b.lastBirth = -this.rng.range(0, k.cooldown);
  }

  private createBlob(kind: Kind, x: number, z: number, energy: number, parent?: Blob): Blob {
    const r = this.rng;
    const k = KIND[kind];
    const mut = this.params.mutation;
    const inherit = (g: number) => Math.min(1.8, Math.max(0.5, g * (1 + r.gauss() * mut)));
    const b: Blob = {
      id: this.nextId++,
      kind,
      alive: true,
      x,
      z,
      px: x,
      pz: z,
      vx: 0,
      vz: 0,
      energy,
      age: 0,
      lifespan: r.range(k.lifespan[0], k.lifespan[1]),
      action: kind === "blue" ? "wandering" : "roaming",
      timer: 0,
      timerMax: 0,
      targetTree: -1,
      targetBlob: -1,
      eatTree: -1,
      eatSlot: -1,
      faceX: 0,
      faceZ: 1,
      wander: r() * Math.PI * 2,
      patience: r.range(4, 9),
      restless: 0,
      lastBirth: this.time,
      speedGene: parent ? inherit(parent.speedGene) : 1,
      visionGene: parent ? inherit(parent.visionGene) : 1,
      generation: parent ? parent.generation + 1 : 0,
      parentId: parent ? parent.id : 0,
      children: 0,
      meals: 0,
      bornAt: this.time,
      hunter: -1,
      hunterDist: Infinity,
      chaseTime: 0,
      ignoreId: -1,
      ignoreTimer: 0,
      hidden: false,
      idleTime: 0,
    };
    this.blobs.push(b);
    this.byId.set(b.id, b);
    return b;
  }

  speedOf(b: Blob) {
    return (b.kind === "blue" ? this.params.blueSpeed : this.params.redSpeed) * b.speedGene;
  }

  visionOf(b: Blob) {
    return (b.kind === "blue" ? this.params.blueVision : this.params.redVision) * b.visionGene;
  }

  /** 0 = empty, 1 = at copy threshold. Well-fed blobs move with more pep. */
  vigorOf(b: Blob) {
    return Math.min(1.2, Math.max(0, b.energy / this.copyThresholdOf(b)));
  }

  fleeSpeed(b: Blob) {
    return this.speedOf(b) * (TUNING.fleeMin + TUNING.fleeGain * this.vigorOf(b));
  }

  chaseSpeed(b: Blob) {
    return this.speedOf(b) * (0.8 + 0.25 * Math.min(1, (b.energy / this.copyThresholdOf(b)) * 2));
  }

  copyThresholdOf(b: Blob) {
    return b.kind === "blue" ? this.params.blueCopy : this.params.redCopy;
  }

  maxEnergyOf(b: Blob) {
    return this.copyThresholdOf(b) * TUNING.maxEnergyMul[b.kind];
  }

  countFruit() {
    let n = 0;
    for (const t of this.trees) for (const s of t.slots) if (s.state === "ripe") n++;
    return n;
  }

  count(kind: Kind) {
    let n = 0;
    for (const b of this.blobs) if (b.alive && b.kind === kind) n++;
    return n;
  }

  private ripeAvailable(t: Tree) {
    let n = 0;
    for (const s of t.slots) if (s.state === "ripe") n++;
    return n;
  }

  // ---------------------------------------------------------------- grid

  private cellIndex(x: number, z: number) {
    const ix = Math.min(this.gridW - 1, Math.max(0, Math.floor((x + this.radius + 2) / this.gridSize)));
    const iz = Math.min(this.gridW - 1, Math.max(0, Math.floor((z + this.radius + 2) / this.gridSize)));
    return ix + iz * this.gridW;
  }

  private buildGrid() {
    for (const c of this.cells) c.length = 0;
    for (const b of this.blobs) if (b.alive) this.cells[this.cellIndex(b.x, b.z)].push(b);
  }

  private forNear(x: number, z: number, radius: number, fn: (b: Blob, d2: number) => void) {
    const gs = this.gridSize;
    const off = this.radius + 2;
    const x0 = Math.max(0, Math.floor((x - radius + off) / gs));
    const x1 = Math.min(this.gridW - 1, Math.floor((x + radius + off) / gs));
    const z0 = Math.max(0, Math.floor((z - radius + off) / gs));
    const z1 = Math.min(this.gridW - 1, Math.floor((z + radius + off) / gs));
    const r2 = radius * radius;
    for (let iz = z0; iz <= z1; iz++) {
      for (let ix = x0; ix <= x1; ix++) {
        const cell = this.cells[ix + iz * this.gridW];
        for (let i = 0; i < cell.length; i++) {
          const b = cell[i];
          if (!b.alive) continue;
          const dx = b.x - x;
          const dz = b.z - z;
          const d2 = dx * dx + dz * dz;
          if (d2 <= r2) fn(b, d2);
        }
      }
    }
  }

  // ---------------------------------------------------------------- step

  step() {
    const p = this.params;
    this.time += DT;
    this.ticks++;

    for (const t of this.trees) {
      this.syncSlots(t);
      t.jiggle = Math.max(0, t.jiggle - DT * 2.5);
      t.targeters = 0;
      for (const s of t.slots) {
        if (s.state === "empty") {
          s.timer -= DT;
          if (s.timer <= 0) {
            s.state = "growing";
            s.growth = 0;
          }
        } else if (s.state === "growing") {
          s.growth += p.fruitGrowth * DT;
          if (s.growth >= 1) {
            s.growth = 1;
            s.state = "ripe";
          }
        }
      }
    }
    for (const b of this.blobs) {
      if (b.alive && b.kind === "blue" && b.targetTree >= 0 && b.action === "seeking") this.trees[b.targetTree].targeters++;
      b.hunter = -1;
      b.hunterDist = Infinity;
    }

    this.buildGrid();
    for (const t of this.trees) t.redNearby = this.redNear(t.x, t.z, 3);

    const n = this.blobs.length;
    for (let i = 0; i < n; i++) {
      const b = this.blobs[i];
      if (!b.alive) continue;
      b.px = b.x;
      b.pz = b.z;
      b.age += DT;
      if (b.kind === "blue") this.thinkBlue(b);
      else this.thinkRed(b);
      if (!b.alive) continue;
      this.integrate(b);
      this.metabolize(b);
      if (b.alive) this.maybeCopy(b);
    }

    if (this.blobs.some((b) => !b.alive)) {
      this.blobs = this.blobs.filter((b) => {
        if (!b.alive) this.byId.delete(b.id);
        return b.alive;
      });
    }

    if (this.events.length > MAX_EVENTS) this.events.splice(0, this.events.length - MAX_EVENTS);

    if (this.time >= this.nextSample) this.sample();
  }

  private syncSlots(t: Tree) {
    const want = Math.round(this.params.fruitLimit);
    while (t.slots.length < want) t.slots.push({ state: "growing", growth: 0, timer: 0, eater: -1 });
    while (t.slots.length > want) {
      let idx = t.slots.findIndex((s) => s.state === "empty" || s.state === "growing");
      if (idx < 0) idx = t.slots.findIndex((s) => s.state === "ripe");
      if (idx < 0) break;
      t.slots.splice(idx, 1);
    }
  }

  private desired = { x: 0, z: 0 };

  private setDesired(dx: number, dz: number, speed: number) {
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) {
      this.desired.x = 0;
      this.desired.z = 0;
      return;
    }
    this.desired.x = (dx / len) * speed;
    this.desired.z = (dz / len) * speed;
  }

  private wanderDir(b: Blob, speed: number) {
    b.wander += this.rng.gauss() * DT * 2.4;
    const r = Math.hypot(b.x, b.z);
    let dx = Math.cos(b.wander);
    let dz = Math.sin(b.wander);
    const edge = r / this.radius;
    if (edge > 0.7) {
      const pull = (edge - 0.7) * 4;
      dx -= (b.x / r) * pull;
      dz -= (b.z / r) * pull;
      b.wander = Math.atan2(dz, dx);
    }
    this.setDesired(dx, dz, speed);
  }

  private thinkBlue(b: Blob) {
    const p = this.params;
    const speed = this.speedOf(b);
    const vision = this.visionOf(b);

    if (b.action === "eating") {
      this.desired.x = 0;
      this.desired.z = 0;
      b.timer -= DT;
      if (b.timer <= 0) {
        const tree = this.trees[b.eatTree];
        const slot = tree?.slots[b.eatSlot];
        if (slot && slot.eater === b.id) {
          slot.state = "empty";
          slot.timer = p.fruitDelay;
          slot.eater = -1;
        }
        b.energy = Math.min(this.maxEnergyOf(b), b.energy + TUNING.fruitEnergy);
        b.meals++;
        this.stats.fruitEaten++;
        this.events.push({ type: "eat", id: b.id, tree: b.eatTree, x: b.x, z: b.z });
        b.eatTree = -1;
        b.eatSlot = -1;
        b.targetTree = -1;
        b.patience = this.rng.range(4, 9);
        b.action = "wandering";
      }
      return;
    }
    if (b.action === "copying") {
      this.desired.x = 0;
      this.desired.z = 0;
      b.timer -= DT;
      if (b.timer <= 0) b.action = "wandering";
      return;
    }

    const alertR = vision * (b.action === "fleeing" || b.action === "hiding" ? 1.05 : 0.85);
    let tx = 0;
    let tz = 0;
    let closest = Infinity;
    this.forNear(b.x, b.z, alertR, (o, d2) => {
      if (o.kind !== "red" || o.action === "pausing" || o.action === "tired") return;
      const d = Math.sqrt(d2) + 1e-3;
      if (o.action === "napping" && d > NAP_WAKE_DIST + 1) return;
      const w = 1 / d;
      tx += ((b.x - o.x) / d) * w;
      tz += ((b.z - o.z) / d) * w;
      closest = Math.min(closest, d);
    });
    if (closest < Infinity) {
      b.targetTree = -1;
      if (b.hidden && closest > TUNING.hiddenSpotDist) {
        b.action = "hiding";
        this.desired.x = 0;
        this.desired.z = 0;
        this.addSeparation(b, 0.3);
        return;
      }
      const r = Math.hypot(b.x, b.z);
      const edge = r / this.radius;
      if (edge > 0.7 && r > 1e-3) {
        const nx = b.x / r;
        const nz = b.z / r;
        const radial = tx * nx + tz * nz;
        if (radial > 0) {
          const len = Math.hypot(tx, tz);
          let px = tx - radial * nx;
          let pz = tz - radial * nz;
          const plen = Math.hypot(px, pz);
          if (plen < 1e-4) {
            px = -nz;
            pz = nx;
          }
          const scale = len / Math.max(1e-4, Math.hypot(px, pz));
          const k = Math.min(1, (edge - 0.7) / 0.2);
          tx = tx * (1 - k) + px * scale * k - nx * len * 0.3 * k;
          tz = tz * (1 - k) + pz * scale * k - nz * len * 0.3 * k;
        }
      }
      b.action = "fleeing";
      this.setDesired(tx, tz, this.fleeSpeed(b));
      this.addSeparation(b, 0.6);
      return;
    }
    if (b.action === "startled" && b.timer > 0) {
      b.timer -= DT;
      this.setDesired(b.faceX, b.faceZ, this.fleeSpeed(b));
      return;
    }

    let target = b.targetTree >= 0 ? this.trees[b.targetTree] : null;
    if (target && (this.ripeAvailable(target) === 0 || Math.hypot(target.x - b.x, target.z - b.z) > vision * 1.3)) target = null;
    if (!target) {
      let bestScore = 0;
      for (const t of this.trees) {
        const d = Math.hypot(t.x - b.x, t.z - b.z);
        if (d > vision + TREE_REACH) continue;
        const ripe = this.ripeAvailable(t);
        if (ripe === 0) continue;
        const crowd = Math.max(0, t.targeters - ripe + 1);
        let score = ripe / (d + 2 + crowd * 3);
        if (t.redNearby) score *= 0.15;
        if (score > bestScore) {
          bestScore = score;
          target = t;
        }
      }
      b.targetTree = target ? target.id : -1;
    }

    if (target) {
      const d = Math.hypot(target.x - b.x, target.z - b.z);
      if (d < TREE_REACH) {
        const si = target.slots.findIndex((s) => s.state === "ripe");
        if (si >= 0) {
          const slot = target.slots[si];
          slot.state = "eaten";
          slot.eater = b.id;
          b.eatTree = target.id;
          b.eatSlot = si;
          b.action = "eating";
          b.timer = b.timerMax = Math.max(0.05, p.blueEatTime);
          b.faceX = target.x - b.x;
          b.faceZ = target.z - b.z;
          target.jiggle = 1;
          this.events.push({ type: "eatStart", id: b.id, tree: target.id, x: b.x, z: b.z });
          this.desired.x = 0;
          this.desired.z = 0;
          return;
        }
      }
      b.action = "seeking";
      this.setDesired(target.x - b.x, target.z - b.z, speed);
      this.addSeparation(b, 0.8);
      return;
    }

    if (b.restless > 0) b.restless -= DT;
    if (b.restless <= 0 && b.patience > 0) {
      let near: Tree | null = null;
      let nd = vision + TREE_REACH;
      for (const t of this.trees) {
        const d = Math.hypot(t.x - b.x, t.z - b.z);
        if (d < nd) {
          nd = d;
          near = t;
        }
      }
      if (near) {
        if (nd > TREE_REACH + 1.2) {
          b.action = "gathering";
          this.setDesired(near.x - b.x, near.z - b.z, speed * 0.6);
        } else {
          b.action = "waiting";
          b.patience -= DT;
          this.desired.x = 0;
          this.desired.z = 0;
          b.faceX = near.x - b.x;
          b.faceZ = near.z - b.z;
        }
        this.addSeparation(b, 1);
        if (b.patience <= 0) b.restless = this.rng.range(5, 9);
        return;
      }
    }
    if (b.restless <= 0 && b.patience <= 0) b.patience = this.rng.range(4, 9);

    b.action = "wandering";
    this.wanderDir(b, speed * 0.7);
    this.addSeparation(b, 1);
  }

  private redNear(x: number, z: number, radius: number) {
    let found = false;
    this.forNear(x, z, radius, (o) => {
      if (o.kind === "red") found = true;
    });
    return found;
  }

  private addSeparation(b: Blob, strength: number, radius = 1.2) {
    let sx = 0;
    let sz = 0;
    this.forNear(b.x, b.z, radius, (o, d2) => {
      if (o === b || o.kind !== b.kind) return;
      const d = Math.sqrt(d2) + 1e-3;
      const w = (radius - d) / radius;
      sx += ((b.x - o.x) / d) * w;
      sz += ((b.z - o.z) / d) * w;
    });
    const k = strength * 2.2;
    this.desired.x += sx * k;
    this.desired.z += sz * k;
  }

  /** Nearest blue that no closer red has already claimed this tick. */
  private pickPrey(b: Blob, vision: number): Blob | null {
    let best: Blob | null = null;
    let bestD = Infinity;
    this.forNear(b.x, b.z, vision, (o, d2) => {
      if (o.kind !== "blue" || o.id === b.ignoreId) return;
      if (o.hidden && d2 > TUNING.hiddenSpotDist * TUNING.hiddenSpotDist) return;
      if (o.hunter !== b.id && o.hunter > 0 && o.hunterDist < d2) return;
      if (d2 < bestD) {
        bestD = d2;
        best = o;
      }
    });
    return best;
  }

  private thinkRed(b: Blob) {
    const speed = this.speedOf(b);
    const vision = this.visionOf(b);

    if (b.ignoreTimer > 0) {
      b.ignoreTimer -= DT;
      if (b.ignoreTimer <= 0) b.ignoreId = -1;
    }

    if (b.action === "napping") {
      this.desired.x = 0;
      this.desired.z = 0;
      b.timer -= DT;
      const wake = this.pickPrey(b, NAP_WAKE_DIST);
      if (b.timer <= 0 || wake) {
        b.action = "roaming";
        b.idleTime = 0;
      }
      if (!wake) return;
    } else if (b.action === "pausing" || b.action === "copying" || b.action === "tired") {
      this.desired.x = 0;
      this.desired.z = 0;
      if (b.action === "tired") this.wanderDir(b, speed * 0.2);
      b.timer -= DT;
      if (b.timer <= 0) b.action = "roaming";
      return;
    }

    let prey: Blob | null = null;
    if (b.targetBlob > 0) {
      const t = this.byId.get(b.targetBlob);
      if (t && t.alive) {
        const d2 = (t.x - b.x) ** 2 + (t.z - b.z) ** 2;
        const claimedByCloser = t.hunter > 0 && t.hunter !== b.id && t.hunterDist < d2;
        if (d2 < (vision * 1.15) ** 2 && !claimedByCloser) prey = t;
      }
    }
    if (!prey) prey = this.pickPrey(b, vision);
    if (!prey || prey.id !== b.targetBlob) b.chaseTime = Math.max(0, b.chaseTime - 1);
    b.targetBlob = prey ? prey.id : -1;

    if (prey) {
      const dx = prey.x - b.x;
      const dz = prey.z - b.z;
      const d = Math.hypot(dx, dz);
      prey.hunter = b.id;
      prey.hunterDist = d * d;
      if (d < CONTACT_DIST) {
        b.chaseTime = 0;
        this.contact(b, prey);
        return;
      }
      b.chaseTime += DT;
      if (b.chaseTime > TUNING.chaseLimit) {
        b.action = "tired";
        b.timer = b.timerMax = 2.5;
        b.ignoreId = prey.id;
        b.ignoreTimer = 6;
        b.targetBlob = -1;
        b.chaseTime = 0;
        prey.hunter = -1;
        this.desired.x = 0;
        this.desired.z = 0;
        return;
      }
      b.action = "chasing";
      b.idleTime = 0;
      this.setDesired(dx + prey.vx * 0.25, dz + prey.vz * 0.25, this.chaseSpeed(b));
      this.addSeparation(b, 0.5, 1.6);
      return;
    }

    b.chaseTime = 0;
    b.idleTime += DT;
    if (b.idleTime > 3 && this.rng() < DT * 0.35) {
      b.action = "napping";
      b.timer = b.timerMax = this.rng.range(4, 9);
      this.desired.x = 0;
      this.desired.z = 0;
      return;
    }
    b.action = "roaming";
    this.wanderDir(b, speed * 0.5);
    this.addSeparation(b, 0.8, 2.4);
  }

  private contact(red: Blob, blue: Blob) {
    const p = this.params;
    const drained = Math.min(blue.energy, p.redContact);
    blue.energy -= drained;
    red.energy = Math.min(this.maxEnergyOf(red), red.energy + p.redContact * TUNING.contactEfficiency);
    this.stats.contacts++;
    red.meals++;
    red.action = "pausing";
    red.timer = red.timerMax = Math.max(0.05, p.redPause);
    red.faceX = blue.x - red.x;
    red.faceZ = blue.z - red.z;
    red.targetBlob = -1;
    this.desired.x = 0;
    this.desired.z = 0;

    if (blue.action === "eating") {
      const slot = this.trees[blue.eatTree]?.slots[blue.eatSlot];
      if (slot && slot.eater === blue.id) {
        slot.state = "ripe";
        slot.eater = -1;
      }
      blue.eatTree = -1;
      blue.eatSlot = -1;
    }
    const faded = blue.energy <= 0.5;
    this.events.push({ type: "contact", id: red.id, other: blue.id, x: blue.x, z: blue.z, drained, faded });
    if (faded) {
      this.kill(blue, "contact");
    } else {
      blue.action = "startled";
      blue.timer = blue.timerMax = 1.6;
      blue.faceX = blue.x - red.x;
      blue.faceZ = blue.z - red.z;
      blue.targetTree = -1;
    }
  }

  private integrate(b: Blob) {
    const k = KIND[b.kind];
    const f = Math.min(1, k.turn * DT);
    b.vx += (this.desired.x - b.vx) * f;
    b.vz += (this.desired.z - b.vz) * f;
    const maxV = this.speedOf(b) * 1.45;
    const v = Math.hypot(b.vx, b.vz);
    if (v > maxV) {
      b.vx *= maxV / v;
      b.vz *= maxV / v;
    }
    b.x += b.vx * DT;
    b.z += b.vz * DT;

    const lim = this.radius - 0.6;
    const r = Math.hypot(b.x, b.z);
    if (r > lim) {
      const nx = b.x / r;
      const nz = b.z / r;
      b.x = nx * lim;
      b.z = nz * lim;
      const radial = b.vx * nx + b.vz * nz;
      if (radial > 0) {
        b.vx -= radial * nx * 1.5;
        b.vz -= radial * nz * 1.5;
      }
      b.wander = Math.atan2(-nz, -nx) + this.rng.range(-1, 1);
    }
    b.hidden = false;
    for (const t of this.trees) {
      const dx = b.x - t.x;
      const dz = b.z - t.z;
      const d = Math.hypot(dx, dz);
      const min = TRUNK_RADIUS * t.size + 0.35;
      if (d < min && d > 1e-4) {
        b.x = t.x + (dx / d) * min;
        b.z = t.z + (dz / d) * min;
      }
      if (d < CANOPY_RADIUS * t.size) b.hidden = true;
    }
    if (v > 0.15 && b.action !== "eating" && b.action !== "waiting" && b.action !== "pausing") {
      b.faceX = b.vx;
      b.faceZ = b.vz;
    }
  }

  private metabolize(b: Blob) {
    const k = KIND[b.kind];
    const use = b.kind === "blue" ? this.params.blueEnergyUse : this.params.redEnergyUse;
    const v = Math.hypot(b.vx, b.vz);
    const rel = v / k.refSpeed;
    const idle = b.action === "napping" ? k.idle * NAP_COST : k.idle;
    const cost = use * (idle + k.move * rel * rel + k.vision * this.visionOf(b));
    b.energy -= cost * DT;
    if (b.energy <= 0) this.kill(b, "starved");
    else if (b.age >= b.lifespan) this.kill(b, "old");
  }

  private maybeCopy(b: Blob) {
    if (b.action === "eating" || b.action === "pausing" || b.action === "copying") return;
    const k = KIND[b.kind];
    if (b.energy < this.copyThresholdOf(b) || b.age < k.maturity || this.time - b.lastBirth < k.cooldown) return;
    const total = b.energy * (1 - TUNING.copyOverhead);
    b.energy = total * 0.5;
    const a = this.rng() * Math.PI * 2;
    const child = this.createBlob(b.kind, b.x + Math.cos(a) * 0.7, b.z + Math.sin(a) * 0.7, total * 0.5, b);
    child.vx = Math.cos(a) * 1.5;
    child.vz = Math.sin(a) * 1.5;
    child.wander = a;
    b.lastBirth = this.time;
    b.children++;
    b.action = "copying";
    b.timer = b.timerMax = 0.7;
    this.stats.births[b.kind]++;
    this.events.push({ type: "birth", id: child.id, parent: b.id, kind: b.kind, x: child.x, z: child.z });
  }

  private kill(b: Blob, cause: DeathCause) {
    if (!b.alive) return;
    b.alive = false;
    b.deathCause = cause;
    if (b.eatSlot >= 0) {
      const slot = this.trees[b.eatTree]?.slots[b.eatSlot];
      if (slot && slot.eater === b.id) {
        slot.state = "empty";
        slot.timer = this.params.fruitDelay;
        slot.eater = -1;
      }
    }
    this.stats.deaths[b.kind][cause]++;
    this.graveyard.set(b.id, { cause, time: this.time, kind: b.kind });
    if (this.graveyard.size > 400) this.graveyard.delete(this.graveyard.keys().next().value!);
    this.events.push({ type: "death", id: b.id, kind: b.kind, cause, x: b.x, z: b.z });
  }

  // ---------------------------------------------------------------- history

  private sample() {
    let blue = 0;
    let red = 0;
    let bs = 0;
    let rs = 0;
    let bv = 0;
    let rv = 0;
    let be = 0;
    let re = 0;
    for (const b of this.blobs) {
      if (!b.alive) continue;
      if (b.kind === "blue") {
        blue++;
        bs += b.speedGene;
        bv += b.visionGene;
        be += b.energy;
      } else {
        red++;
        rs += b.speedGene;
        rv += b.visionGene;
        re += b.energy;
      }
    }
    const fruit = this.countFruit();
    const pt: HistoryPoint = {
      t: this.time,
      fruit,
      blue,
      red,
      blueSpeed: blue ? bs / blue : NaN,
      redSpeed: red ? rs / red : NaN,
      blueVision: blue ? bv / blue : NaN,
      redVision: red ? rv / red : NaN,
      blueEnergy: blue ? be / blue : 0,
      redEnergy: red ? re / red : 0,
    };
    this.history.push(pt);
    this.nextSample = this.time + this.historyInterval;

    const s = this.stats;
    if (blue > s.peak.blue.value) s.peak.blue = { value: blue, t: this.time };
    if (red > s.peak.red.value) s.peak.red = { value: red, t: this.time };
    if (fruit > s.peak.fruit.value) s.peak.fruit = { value: fruit, t: this.time };
    if (blue === 0 && s.extinctAt.blue === null && s.start.blue > 0) s.extinctAt.blue = this.time;
    if (red === 0 && s.extinctAt.red === null && s.start.red > 0) s.extinctAt.red = this.time;

    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.filter((_, i) => i % 2 === 0 || i === this.history.length - 1);
      this.historyInterval *= 2;
    }
  }
}
