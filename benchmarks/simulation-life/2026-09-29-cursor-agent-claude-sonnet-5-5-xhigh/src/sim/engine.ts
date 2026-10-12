import { Rng } from './rng';
import type { Params } from './params';

/* ------------------------------------------------------------------ */
/* Constants of the little universe (everything else is a slider).     */
/* ------------------------------------------------------------------ */

export const DT = 0.05;
export const MAX_ENERGY = 140;
export const FRUIT_ENERGY = 42;
export const GROW_TIME = 26;
export const CONTACT_RANGE = 2.1;
export const DRAIN_PER_CONTACT = 14;
export const CHILD_EFFICIENCY = 0.8;
export const COPY_COST_FRACTION = 0.55;
export const BUDDING_TIME = 1.4;
export const NUZZLE_TIME = 0.8;
export const STARTLE_TIME = 0.9;
export const IMMUNE_TIME = 6;
export const DYING_TIME = 1;
export const TREE_RADIUS = 1.9;
export const TREE_CANOPY_Z = 2.6;
export const TREE_BLOCK_RADIUS = 1.55;
export const STAND_DISTANCE = 2.5;
export const CHASE_LIMIT = 8;
export const BLOB_CAP = { blue: 320, red: 180 };

/** Hidden tuning knobs of the little universe. Exported so headless experiments can poke them. */
export const K = {
  blueIdle: 0.5,
  blueMove: 0.11,
  redIdle: 0.4,
  redMove: 0.02,
  redStress: 0.15,
  redStressRange: 7,
  blueStress: 0,
  blueCrowdFree: 2,
  drainEfficiency: 0.6,
  redCooldown: 40,
  fleeFactor: 1.3,
  redWander: 0.5,
  redMemory: 0.4,
  lifeBlue: 380,
  lifeRed: 450,
};
const BLOB_TRAIT_MIN = 0.65;
const BLOB_TRAIT_MAX = 1.6;
const MUTATION = 0.06;

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type Kind = 'blue' | 'red';

export type Action =
  | 'seek'
  | 'gather'
  | 'wander'
  | 'idle'
  | 'flee'
  | 'spread'
  | 'eat'
  | 'startled'
  | 'bud'
  | 'hunt'
  | 'nuzzle'
  | 'pause';

export type SlotState = 'ripe' | 'growing' | 'resting' | 'eating';

export interface Slot {
  state: SlotState;
  progress: number;
  delay: number;
  rate: number;
  claim: Blob | null;
  eat: number;
}

export interface Tree {
  id: number;
  x: number;
  y: number;
  seed: number;
  scale: number;
  slots: Slot[];
  shake: number;
}

export interface Traits {
  speed: number;
  vision: number;
}

export interface Blob {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  heading: number;
  pheading: number;
  energy: number;
  age: number;
  traits: Traits;
  family: number;
  generation: number;
  parent: number;
  kids: number;
  action: Action;
  lock: number;
  lockTotal: number;
  think: number;
  target: Blob | null;
  tree: Tree | null;
  slot: Slot | null;
  slotIdx: number;
  gx: number;
  gy: number;
  dirX: number;
  dirY: number;
  sepX: number;
  sepY: number;
  stress: number;
  hunter: Blob | null;
  ignore: Blob | null;
  ignoreT: number;
  chase: number;
  idle: number;
  immune: number;
  cooldown: number;
  memTree: Tree | null;
  memX: number;
  memY: number;
  hasMem: boolean;
  dying: number;
  dead: boolean;
  cause: '' | 'starved' | 'drained' | 'old';
  lifespan: number;
  eaten: number;
  contacts: number;
  bornAt: number;
  orbit: number;
  personality: number;
  hueShift: number;
}

export interface SimEvent {
  type: 'eat' | 'contact' | 'birth' | 'die' | 'ripe' | 'drain';
  x: number;
  y: number;
  z: number;
  kind: Kind;
  amount: number;
  cause?: string;
}

export interface Sample {
  t: number;
  fruit: number;
  growing: number;
  blue: number;
  red: number;
  blueEnergy: number;
  redEnergy: number;
  blueSpeed: number;
  blueVision: number;
  redSpeed: number;
  redVision: number;
}

export interface History {
  interval: number;
  samples: Sample[];
}

export interface Stats {
  blueBorn: number;
  redBorn: number;
  blueStarved: number;
  blueDrained: number;
  blueOld: number;
  redStarved: number;
  redOld: number;
  fruitEaten: number;
  contacts: number;
  blueFounders: number;
  redFounders: number;
}

/* ------------------------------------------------------------------ */
/* Spatial grid                                                         */
/* ------------------------------------------------------------------ */

class Grid {
  private cell = 5;
  private w = 1;
  private head = new Int32Array(1);
  private next = new Int32Array(0);
  private items: Blob[] = [];
  private offset = 0;

  build(list: Blob[], radius: number) {
    this.offset = radius + 1;
    this.w = Math.ceil((radius * 2 + 2) / this.cell) + 1;
    const cells = this.w * this.w;
    if (this.head.length !== cells) this.head = new Int32Array(cells);
    this.head.fill(-1);
    if (this.next.length < list.length) this.next = new Int32Array(list.length * 2);
    this.items = list;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const c = this.idx(b.x, b.y);
      this.next[i] = this.head[c];
      this.head[c] = i;
    }
  }

  private cx(v: number) {
    const c = Math.floor((v + this.offset) / this.cell);
    return c < 0 ? 0 : c >= this.w ? this.w - 1 : c;
  }

  private idx(x: number, y: number) {
    return this.cx(x) + this.cx(y) * this.w;
  }

  each(x: number, y: number, r: number, fn: (b: Blob, d2: number) => void) {
    const x0 = this.cx(x - r);
    const x1 = this.cx(x + r);
    const y0 = this.cx(y - r);
    const y1 = this.cx(y + r);
    const r2 = r * r;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        for (let i = this.head[cx + cy * this.w]; i !== -1; i = this.next[i]) {
          const b = this.items[i];
          const dx = b.x - x;
          const dy = b.y - y;
          const d2 = dx * dx + dy * dy;
          if (d2 <= r2) fn(b, d2);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Fruit geometry shared with the renderer                              */
/* ------------------------------------------------------------------ */

export function slotAnchor(tree: Tree, i: number) {
  const az = tree.seed * Math.PI * 2 + i * 2.39996323;
  const f = (i * 0.61803399 + 0.17) % 1;
  const elev = -0.25 + f * 0.85;
  const ch = Math.sqrt(1 - elev * elev);
  return { az, elev, ch };
}

export function slotStandPoint(tree: Tree, i: number) {
  const { az } = slotAnchor(tree, i);
  return { x: tree.x + Math.cos(az) * STAND_DISTANCE, y: tree.y + Math.sin(az) * STAND_DISTANCE };
}

/* ------------------------------------------------------------------ */
/* World                                                                */
/* ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

function angleDiff(a: number, b: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class World {
  params: Params;
  rng: Rng;
  time = 0;
  radius: number;
  trees: Tree[] = [];
  blobs: Blob[] = [];
  events: SimEvent[] = [];
  history: History = { interval: 2, samples: [] };
  stats: Stats = {
    blueBorn: 0,
    redBorn: 0,
    blueStarved: 0,
    blueDrained: 0,
    blueOld: 0,
    redStarved: 0,
    redOld: 0,
    fruitEaten: 0,
    contacts: 0,
    blueFounders: 0,
    redFounders: 0,
  };
  version = 0;

  private nextId = 1;
  private nextFamily = 1;
  private blueList: Blob[] = [];
  private redList: Blob[] = [];
  private blueGrid = new Grid();
  private redGrid = new Grid();
  private nextSample = 0;
  private births: Array<() => void> = [];
  emitEvents = true;

  constructor(params: Params) {
    this.params = { ...params };
    this.rng = new Rng(params.seed);
    this.radius = params.worldSize;
    this.plantTrees();
    this.seedBlobs();
    this.rebuildLists();
    this.record();
  }

  /* ---------------------------- setup ---------------------------- */

  private plantTrees() {
    const R = this.radius;
    const p = this.params;
    const maxByArea = Math.max(1, Math.floor((R * R) / 20));
    const want = Math.min(p.trees, maxByArea);
    let spacing = Math.max(5.5, Math.min(11, R * 0.45));
    const placed: Array<{ x: number; y: number }> = [];
    const lim = R - 4.5;
    while (placed.length < want) {
      let ok = false;
      for (let attempt = 0; attempt < 120 && !ok; attempt++) {
        const a = this.rng.range(0, Math.PI * 2);
        const r = Math.sqrt(this.rng.next()) * lim;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (placed.every((q) => Math.hypot(q.x - x, q.y - y) >= spacing)) {
          placed.push({ x, y });
          ok = true;
        }
      }
      if (!ok) spacing *= 0.9;
    }
    this.trees = placed.map((pos, i) => {
      const tree: Tree = {
        id: i + 1,
        x: pos.x,
        y: pos.y,
        seed: this.rng.next(),
        scale: this.rng.range(0.9, 1.12),
        slots: [],
        shake: 0,
      };
      for (let s = 0; s < p.fruitLimit; s++) tree.slots.push(this.newSlot(true));
      return tree;
    });
  }

  private newSlot(initial: boolean): Slot {
    const roll = this.rng.next();
    const slot: Slot = {
      state: 'growing',
      progress: 0.03,
      delay: 0,
      rate: this.rng.range(0.8, 1.25),
      claim: null,
      eat: 0,
    };
    if (initial) {
      if (roll < 0.7) {
        slot.state = 'ripe';
        slot.progress = 1;
      } else {
        slot.progress = this.rng.range(0.1, 0.9);
      }
    }
    return slot;
  }

  private makeBlob(kind: Kind, x: number, y: number, energy: number, traits: Traits, parent: Blob | null): Blob {
    const id = this.nextId++;
    let family: number;
    let generation = 0;
    if (parent) {
      family = parent.family;
      generation = parent.generation + 1;
    } else {
      family = this.nextFamily++;
    }
    const heading = this.rng.range(0, Math.PI * 2);
    return {
      id,
      kind,
      x,
      y,
      px: x,
      py: y,
      vx: 0,
      vy: 0,
      heading,
      pheading: heading,
      energy,
      age: 0,
      traits,
      family,
      generation,
      parent: parent ? parent.id : 0,
      kids: 0,
      action: 'idle',
      lock: 0,
      lockTotal: 0,
      think: this.rng.range(0, 0.4),
      target: null,
      tree: null,
      slot: null,
      slotIdx: -1,
      gx: x,
      gy: y,
      dirX: 0,
      dirY: 0,
      sepX: 0,
      sepY: 0,
      stress: 0,
      hunter: null,
      ignore: null,
      ignoreT: 0,
      chase: 0,
      idle: 0,
      immune: 0,
      cooldown: 0,
      memTree: null,
      memX: 0,
      memY: 0,
      hasMem: false,
      dying: 0,
      dead: false,
      cause: '',
      lifespan: (kind === 'blue' ? K.lifeBlue : K.lifeRed) * this.rng.range(0.75, 1.25),
      eaten: 0,
      contacts: 0,
      bornAt: this.time,
      orbit: this.rng.range(0, Math.PI * 2),
      personality: this.rng.next(),
      hueShift: (((family * 37) % 11) - 5) / 5,
    };
  }

  private seedBlobs() {
    const p = this.params;
    const R = this.radius;
    for (let i = 0; i < p.blueStart; i++) {
      let x: number;
      let y: number;
      if (this.trees.length && this.rng.chance(0.75)) {
        const t = this.trees[this.rng.int(this.trees.length)];
        const a = this.rng.range(0, Math.PI * 2);
        const d = this.rng.range(2.6, 5);
        x = t.x + Math.cos(a) * d;
        y = t.y + Math.sin(a) * d;
      } else {
        const a = this.rng.range(0, Math.PI * 2);
        const r = Math.sqrt(this.rng.next()) * (R - 2);
        x = Math.cos(a) * r;
        y = Math.sin(a) * r;
      }
      const d = Math.hypot(x, y);
      if (d > R - 1.5) {
        x *= (R - 1.5) / d;
        y *= (R - 1.5) / d;
      }
      const b = this.makeBlob('blue', x, y, this.rng.range(0.35, 0.8) * p.blueCopy, { speed: 1, vision: 1 }, null);
      b.age = this.rng.range(0, 30);
      this.blobs.push(b);
      this.stats.blueFounders++;
    }
    for (let i = 0; i < p.redStart; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const r = Math.sqrt(this.rng.next()) * (R - 2);
      const b = this.makeBlob('red', Math.cos(a) * r, Math.sin(a) * r, this.rng.range(0.4, 0.8) * p.redCopy, { speed: 1, vision: 1 }, null);
      b.age = this.rng.range(0, 30);
      this.blobs.push(b);
      this.stats.redFounders++;
    }
  }

  /* --------------------------- live params ------------------------ */

  setParams(next: Params) {
    const prev = this.params;
    this.params = { ...next };
    if (next.fruitLimit !== prev.fruitLimit) this.syncSlots();
  }

  private syncSlots() {
    const limit = this.params.fruitLimit;
    for (const tree of this.trees) {
      while (tree.slots.length > limit) {
        const slot = tree.slots.pop()!;
        const claimant = slot.claim;
        if (claimant && claimant.slot === slot) {
          claimant.slot = null;
          claimant.tree = null;
          if (claimant.action === 'eat') {
            claimant.lock = 0;
            claimant.action = 'idle';
          }
        }
      }
      while (tree.slots.length < limit) tree.slots.push(this.newSlot(false));
    }
  }

  /* ---------------------------- queries --------------------------- */

  get blueCount() {
    return this.blueList.length;
  }

  get redCount() {
    return this.redList.length;
  }

  get fruitCount() {
    let n = 0;
    for (const t of this.trees) for (const s of t.slots) if (s.state === 'ripe') n++;
    return n;
  }

  get fruitCapacity() {
    return this.trees.length * this.params.fruitLimit;
  }

  blobAt(id: number): Blob | undefined {
    return this.blobs.find((b) => b.id === id);
  }

  private rebuildLists() {
    this.blueList.length = 0;
    this.redList.length = 0;
    for (const b of this.blobs) {
      if (b.dead) continue;
      (b.kind === 'blue' ? this.blueList : this.redList).push(b);
    }
    this.blueGrid.build(this.blueList, this.radius);
    this.redGrid.build(this.redList, this.radius);
  }

  /* ----------------------------- step ----------------------------- */

  step(dt: number = DT) {
    this.rebuildLists();
    this.growFruit(dt);

    const blobs = this.blobs;
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];
      b.px = b.x;
      b.py = b.y;
      b.pheading = b.heading;
      if (b.dead) {
        b.dying -= dt;
        continue;
      }
      b.age += dt;
      if (b.age > b.lifespan && !b.dead) {
        b.cause = 'old';
        this.kill(b);
        continue;
      }
      if (b.immune > 0) b.immune -= dt;
      if (b.cooldown > 0) b.cooldown -= dt;
      if (b.kind === 'blue') this.updateBlue(b, dt);
      else this.updateRed(b, dt);
    }

    if (this.births.length) {
      for (const fn of this.births) fn();
      this.births.length = 0;
    }

    let w = 0;
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];
      if (!b.dead && b.energy <= 0) this.kill(b);
      if (b.dead && b.dying <= 0) continue;
      blobs[w++] = b;
    }
    blobs.length = w;

    for (const t of this.trees) if (t.shake > 0) t.shake = Math.max(0, t.shake - dt * 2.5);

    this.time += dt;
    if (this.time >= this.nextSample) this.record();
    this.version++;
  }

  private kill(b: Blob) {
    b.dead = true;
    b.dying = DYING_TIME;
    b.lock = 0;
    b.vx = 0;
    b.vy = 0;
    this.release(b);
    if (!b.cause) b.cause = 'starved';
    if (b.kind === 'blue') {
      if (b.cause === 'drained') this.stats.blueDrained++;
      else if (b.cause === 'old') this.stats.blueOld++;
      else this.stats.blueStarved++;
    } else if (b.cause === 'old') {
      this.stats.redOld++;
    } else {
      this.stats.redStarved++;
    }
    this.emit({ type: 'die', x: b.x, y: b.y, z: 1, kind: b.kind, amount: 0, cause: b.cause });
  }

  private release(b: Blob) {
    if (b.slot) {
      if (b.slot.claim === b) b.slot.claim = null;
      if (b.slot.state === 'eating') {
        b.slot.state = 'ripe';
        b.slot.progress = 1;
        b.slot.eat = 0;
      }
    }
    b.slot = null;
    b.tree = null;
    b.slotIdx = -1;
    this.stopHunting(b);
  }

  private emit(e: SimEvent) {
    if (!this.emitEvents) return;
    if (this.events.length < 400) this.events.push(e);
  }

  /* ----------------------------- fruit ---------------------------- */

  private growFruit(dt: number) {
    const p = this.params;
    for (const tree of this.trees) {
      for (let i = 0; i < tree.slots.length; i++) {
        const s = tree.slots[i];
        switch (s.state) {
          case 'growing':
            s.progress += (dt * p.fruitGrowth * s.rate) / GROW_TIME;
            if (s.progress >= 1) {
              s.progress = 1;
              s.state = 'ripe';
              if (this.emitEvents && (this.stats.fruitEaten + i) % 3 === 0) this.emit({ type: 'ripe', x: tree.x, y: tree.y, z: TREE_CANOPY_Z, kind: 'blue', amount: i });
            }
            break;
          case 'resting':
            s.delay -= dt;
            if (s.delay <= 0) {
              s.state = 'growing';
              s.progress = 0.03;
            }
            break;
          case 'ripe':
            if (s.claim && (s.claim.dead || s.claim.slot !== s)) s.claim = null;
            break;
          default:
            break;
        }
      }
    }
  }

  /* ------------------------------ move ---------------------------- */

  private move(b: Blob, dvx: number, dvy: number, dt: number, idle: number, moveCoef: number) {
    const k = 1 - Math.exp(-dt * 7);
    b.vx += (dvx - b.vx) * k;
    b.vy += (dvy - b.vy) * k;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    const R = this.radius - 1.3;
    const d = Math.hypot(b.x, b.y);
    if (d > R) {
      const nx = b.x / d;
      const ny = b.y / d;
      b.x = nx * R;
      b.y = ny * R;
      const out = b.vx * nx + b.vy * ny;
      if (out > 0) {
        b.vx -= nx * out;
        b.vy -= ny * out;
      }
    }
    for (const t of this.trees) {
      const dx = b.x - t.x;
      const dy = b.y - t.y;
      const dd = dx * dx + dy * dy;
      if (dd < TREE_BLOCK_RADIUS * TREE_BLOCK_RADIUS) {
        const l = Math.sqrt(dd) || 0.001;
        b.x = t.x + (dx / l) * TREE_BLOCK_RADIUS;
        b.y = t.y + (dy / l) * TREE_BLOCK_RADIUS;
      }
    }

    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 0.25) {
      const want = Math.atan2(b.vy, b.vx);
      b.heading += angleDiff(b.heading, want) * Math.min(1, dt * 9);
    }
    b.energy -= (idle + moveCoef * sp * sp) * dt;
  }

  private steerTo(b: Blob, gx: number, gy: number, speed: number, arrive = 1.6) {
    const dx = gx - b.x;
    const dy = gy - b.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.05) {
      b.dirX = 0;
      b.dirY = 0;
      return d;
    }
    const s = d < arrive ? speed * Math.max(0.25, d / arrive) : speed;
    b.dirX = (dx / d) * s;
    b.dirY = (dy / d) * s;
    return d;
  }

  private beginLock(b: Blob, action: Action, seconds: number) {
    b.action = action;
    b.lock = seconds;
    b.lockTotal = seconds;
  }

  /* ------------------------------ blue ---------------------------- */

  private updateBlue(b: Blob, dt: number) {
    const p = this.params;
    const speed = p.blueSpeed * b.traits.speed;
    const vision = p.blueVision * b.traits.vision;
    const idle = K.blueIdle * p.blueUse * (1 + 0.02 * vision) + b.stress;
    const moveCoef = K.blueMove * p.blueUse;

    if (b.lock > 0) {
      b.lock -= dt;
      if (b.action === 'eat' && b.slot) {
        b.slot.eat = clamp(1 - b.lock / b.lockTotal, 0, 1);
        if (b.tree) {
          const dx = b.tree.x - b.x;
          const dy = b.tree.y - b.y;
          b.heading += angleDiff(b.heading, Math.atan2(dy, dx)) * Math.min(1, dt * 6);
        }
      }
      this.move(b, 0, 0, dt, idle, moveCoef);
      if (b.lock <= 0) this.finishLock(b);
      return;
    }

    b.think -= dt;
    if (b.think <= 0) {
      b.think = 0.18 + this.rng.next() * 0.14;
      this.thinkBlue(b, vision);
    }

    let dvx = 0;
    let dvy = 0;
    switch (b.action) {
      case 'seek': {
        if (!b.slot || !b.tree) {
          b.think = 0;
          break;
        }
        const st = slotStandPoint(b.tree, b.slotIdx);
        const d = this.steerTo(b, st.x, st.y, speed);
        dvx = b.dirX + b.sepX * speed * 0.25;
        dvy = b.dirY + b.sepY * speed * 0.25;
        if (d < 0.7 && b.slot.state === 'ripe' && (!b.slot.claim || b.slot.claim === b)) this.startEating(b);
        break;
      }
      case 'gather': {
        const d = this.steerTo(b, b.gx, b.gy, speed * 0.6, 2.2);
        dvx = b.dirX + b.sepX * speed * 0.4;
        dvy = b.dirY + b.sepY * speed * 0.4;
        if (d < 0.7) {
          dvx = b.sepX * speed * 0.3;
          dvy = b.sepY * speed * 0.3;
        }
        break;
      }
      case 'wander': {
        const d = this.steerTo(b, b.gx, b.gy, speed * 0.55, 1.5);
        dvx = b.dirX + b.sepX * speed * 0.4;
        dvy = b.dirY + b.sepY * speed * 0.4;
        if (d < 0.8) b.think = 0;
        break;
      }
      case 'flee':
        dvx = b.dirX * speed * K.fleeFactor;
        dvy = b.dirY * speed * K.fleeFactor;
        break;
      case 'spread':
        dvx = b.dirX * speed * 0.7;
        dvy = b.dirY * speed * 0.7;
        break;
      case 'idle':
        b.idle -= dt;
        if (b.idle <= 0) b.think = 0;
        break;
      default:
        break;
    }
    this.move(b, dvx, dvy, dt, idle, moveCoef);
  }

  private separate(b: Blob, grid: Grid, radius: number) {
    let sx = 0;
    let sy = 0;
    grid.each(b.x, b.y, radius, (o, d2) => {
      if (o === b || o.dead) return;
      const d = Math.sqrt(d2) + 0.2;
      const w = (radius - d) / radius / d;
      sx += (b.x - o.x) * w;
      sy += (b.y - o.y) * w;
    });
    const l = Math.hypot(sx, sy);
    if (l > 1.2) {
      sx = (sx / l) * 1.2;
      sy = (sy / l) * 1.2;
    }
    b.sepX = sx;
    b.sepY = sy;
  }

  private thinkBlue(b: Blob, vision: number) {
    const p = this.params;
    const fleeRange = Math.min(vision * 0.8, 9);
    this.separate(b, this.blueGrid, 2.6);

    let cx = 0;
    let cy = 0;
    let crowd = 0;
    this.blueGrid.each(b.x, b.y, 3, (o) => {
      if (o === b) return;
      cx += o.x;
      cy += o.y;
      crowd++;
    });
    b.stress = Math.max(0, crowd - K.blueCrowdFree) * K.blueStress;

    let fx = 0;
    let fy = 0;
    let threats = 0;
    this.redGrid.each(b.x, b.y, fleeRange, (r, d2) => {
      if (r.dead || r.action === 'pause' || r.action === 'nuzzle') return;
      const d = Math.sqrt(d2) + 0.3;
      const w = 1 / (d * d);
      fx += ((b.x - r.x) / d) * w;
      fy += ((b.y - r.y) / d) * w;
      threats++;
    });
    if (threats > 0) {
      const l = Math.hypot(fx, fy) || 1;
      b.dirX = fx / l;
      b.dirY = fy / l;
      if (b.action !== 'flee') this.dropTarget(b);
      b.action = 'flee';
      return;
    }

    if (b.energy >= p.blueCopy && b.cooldown <= 0 && b.age > 6 && this.blueList.length < BLOB_CAP.blue) {
      this.beginLock(b, 'bud', BUDDING_TIME);
      return;
    }

    const hungry = b.energy < MAX_ENERGY * 0.9;
    if (hungry) {
      // keep the current fruit if it is still good
      if (b.slot && b.tree && b.slot.state === 'ripe' && (!b.slot.claim || b.slot.claim === b)) {
        b.action = 'seek';
        return;
      }
      this.dropTarget(b);
      if (this.findFruit(b, vision)) {
        b.action = 'seek';
        return;
      }
      // nothing ripe in sight: hang out where fruit is coming
      const tree = this.pickGatherTree(b, vision);
      if (tree) {
        const ring = 3.2 + b.personality * 2.4;
        b.gx = tree.x + Math.cos(b.orbit) * ring;
        b.gy = tree.y + Math.sin(b.orbit) * ring;
        const dTree = Math.hypot(b.x - tree.x, b.y - tree.y);
        if (crowd >= 5 && dTree < 5) {
          this.spreadFrom(b, cx / crowd, cy / crowd);
          return;
        }
        b.action = 'gather';
        return;
      }
    }

    if (crowd >= 4) {
      this.spreadFrom(b, cx / crowd, cy / crowd);
      return;
    }

    if (b.action === 'idle' && b.idle > 0) return;
    if (b.action === 'wander' && Math.hypot(b.gx - b.x, b.gy - b.y) > 0.9) return;

    if (this.rng.chance(0.35)) {
      b.action = 'idle';
      b.idle = this.rng.range(0.8, 2.6);
      return;
    }
    this.pickWander(b, 3, 9);
  }

  private spreadFrom(b: Blob, cx: number, cy: number) {
    const dx = b.x - cx;
    const dy = b.y - cy;
    const l = Math.hypot(dx, dy) || 1;
    b.dirX = dx / l;
    b.dirY = dy / l;
    b.action = 'spread';
  }

  private pickWander(b: Blob, minD: number, maxD: number) {
    const R = this.radius - 2.5;
    let bias = 0;
    if (Math.hypot(b.x, b.y) > R * 0.75) bias = Math.atan2(-b.y, -b.x) - b.heading;
    const a = b.heading + bias * 0.6 + this.rng.range(-1.7, 1.7);
    const d = this.rng.range(minD, maxD);
    let x = b.x + Math.cos(a) * d;
    let y = b.y + Math.sin(a) * d;
    const l = Math.hypot(x, y);
    if (l > R) {
      x *= R / l;
      y *= R / l;
    }
    b.gx = x;
    b.gy = y;
    b.action = 'wander';
  }

  private dropTarget(b: Blob) {
    if (b.slot && b.slot.claim === b) b.slot.claim = null;
    b.slot = null;
    b.tree = null;
    b.slotIdx = -1;
  }

  private findFruit(b: Blob, vision: number): boolean {
    let best: Slot | null = null;
    let bestTree: Tree | null = null;
    let bestIdx = -1;
    let bestD = Infinity;
    const reach = vision + 2.5;
    for (const t of this.trees) {
      const dt = Math.hypot(t.x - b.x, t.y - b.y);
      if (dt > reach + 2) continue;
      for (let i = 0; i < t.slots.length; i++) {
        const s = t.slots[i];
        if (s.state !== 'ripe') continue;
        if (s.claim && s.claim !== b && !s.claim.dead) continue;
        const st = slotStandPoint(t, i);
        const d = Math.hypot(st.x - b.x, st.y - b.y);
        if (d < bestD && d <= reach) {
          bestD = d;
          best = s;
          bestTree = t;
          bestIdx = i;
        }
      }
    }
    if (!best) {
      // remembered tree beyond the horizon
      return false;
    }
    best.claim = b;
    b.slot = best;
    b.tree = bestTree;
    b.slotIdx = bestIdx;
    b.memTree = bestTree;
    return true;
  }

  private pickGatherTree(b: Blob, vision: number): Tree | null {
    let best: Tree | null = null;
    let bestScore = Infinity;
    const horizon = vision * 2.2 + 4;
    for (const t of this.trees) {
      const d = Math.hypot(t.x - b.x, t.y - b.y);
      if (d > horizon && t !== b.memTree) continue;
      // trees with fruit that is about to ripen are the best place to wait
      let soon = 0;
      for (const s of t.slots) {
        if (s.state === 'growing') soon += s.progress * s.progress;
        else if (s.state === 'ripe' && s.claim && s.claim !== b) soon += 0.2;
      }
      const score = d - Math.min(soon, 4) * 2.2 - (t === b.memTree ? 3 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = t;
      }
    }
    return best;
  }

  private startEating(b: Blob) {
    const s = b.slot!;
    s.state = 'eating';
    s.claim = b;
    s.eat = 0;
    const t = this.params.blueEat * (0.9 + b.personality * 0.2);
    this.beginLock(b, 'eat', Math.max(0.2, t));
  }

  private finishLock(b: Blob) {
    const p = this.params;
    switch (b.action) {
      case 'eat': {
        const s = b.slot;
        if (s && b.tree) {
          s.state = 'resting';
          s.delay = p.fruitDelay * this.rng.range(0.8, 1.2);
          s.progress = 0;
          s.claim = null;
          s.eat = 0;
          b.tree.shake = 1;
          const gain = FRUIT_ENERGY;
          b.energy = Math.min(MAX_ENERGY, b.energy + gain);
          b.eaten++;
          this.stats.fruitEaten++;
          this.emit({ type: 'eat', x: b.x, y: b.y, z: 1.3, kind: 'blue', amount: gain });
          b.memTree = b.tree;
        }
        b.slot = null;
        b.tree = null;
        b.slotIdx = -1;
        b.action = 'idle';
        b.idle = 0.35;
        b.think = 0;
        break;
      }
      case 'startled':
        b.action = 'flee';
        b.think = 0;
        break;
      case 'bud':
        this.finishBud(b);
        break;
      case 'nuzzle':
        this.beginLock(b, 'pause', Math.max(0.1, p.redPause));
        if (p.redPause <= 0) {
          b.lock = 0;
          b.action = 'idle';
        }
        break;
      case 'pause':
        b.action = 'idle';
        b.idle = 0.2;
        b.think = 0;
        break;
      default:
        b.action = 'idle';
        b.think = 0;
    }
  }

  private finishBud(b: Blob) {
    const p = this.params;
    const threshold = b.kind === 'blue' ? p.blueCopy : p.redCopy;
    const cost = threshold * COPY_COST_FRACTION;
    const cap = b.kind === 'blue' ? BLOB_CAP.blue : BLOB_CAP.red;
    const list = b.kind === 'blue' ? this.blueList : this.redList;
    b.action = 'idle';
    b.idle = 0.6;
    b.think = 0;
    if (b.energy < cost + 5 || list.length >= cap) {
      b.cooldown = 3;
      return;
    }
    b.energy -= cost;
    b.cooldown = b.kind === 'red' ? K.redCooldown : 12;
    b.kids++;
    const childEnergy = cost * CHILD_EFFICIENCY;
    const mutate = (v: number) => clamp(v * (1 + this.rng.gauss() * MUTATION), BLOB_TRAIT_MIN, BLOB_TRAIT_MAX);
    const traits = { speed: mutate(b.traits.speed), vision: mutate(b.traits.vision) };
    const a = this.rng.range(0, Math.PI * 2);
    let x = b.x + Math.cos(a) * 1.4;
    let y = b.y + Math.sin(a) * 1.4;
    const l = Math.hypot(x, y);
    const R = this.radius - 1.5;
    if (l > R) {
      x *= R / l;
      y *= R / l;
    }
    const kid = this.makeBlob(b.kind, x, y, childEnergy, traits, b);
    kid.action = 'idle';
    kid.idle = 0.8;
    kid.cooldown = 10;
    kid.immune = 2;
    this.births.push(() => {
      this.blobs.push(kid);
      if (b.kind === 'blue') this.stats.blueBorn++;
      else this.stats.redBorn++;
    });
    this.emit({ type: 'birth', x: b.x, y: b.y, z: 1.2, kind: b.kind, amount: cost });
  }

  /* ------------------------------- red ---------------------------- */

  private updateRed(b: Blob, dt: number) {
    const p = this.params;
    const speed = p.redSpeed * b.traits.speed;
    const vision = p.redVision * b.traits.vision;
    const idle = (K.redIdle * p.redUse * (1 + 0.015 * vision)) + b.stress;
    const moveCoef = K.redMove * p.redUse;

    if (b.lock > 0) {
      b.lock -= dt;
      if (b.action === 'nuzzle' && b.target && !b.target.dead) {
        b.heading += angleDiff(b.heading, Math.atan2(b.target.y - b.y, b.target.x - b.x)) * Math.min(1, dt * 8);
      }
      this.move(b, 0, 0, dt, idle, moveCoef);
      if (b.lock <= 0) this.finishLock(b);
      return;
    }

    b.think -= dt;
    if (b.think <= 0) {
      b.think = 0.2 + this.rng.next() * 0.15;
      this.thinkRed(b, vision);
    }

    let dvx = 0;
    let dvy = 0;
    switch (b.action) {
      case 'hunt': {
        const t = b.target;
        if (!t || t.dead || t.immune > 0) {
          this.stopHunting(b);
          b.think = 0;
          break;
        }
        b.chase += dt;
        if (b.chase > CHASE_LIMIT) {
          b.ignore = t;
          b.ignoreT = 6;
          this.stopHunting(b);
          this.beginLock(b, 'pause', 1.6);
          break;
        }
        const dx = t.x - b.x;
        const dy = t.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < CONTACT_RANGE) {
          this.contact(b, t);
          break;
        }
        const lead = clamp(d / (speed + 0.1), 0, 1.2) * 0.6;
        const tx = t.x + t.vx * lead;
        const ty = t.y + t.vy * lead;
        const burst = d < 3.5 ? 1.15 : 1;
        this.steerTo(b, tx, ty, speed * burst, 0.4);
        dvx = b.dirX + b.sepX * speed * 0.2;
        dvy = b.dirY + b.sepY * speed * 0.2;
        break;
      }
      case 'wander': {
        const d = this.steerTo(b, b.gx, b.gy, speed * K.redWander, 1.5);
        dvx = b.dirX + b.sepX * speed * 0.5;
        dvy = b.dirY + b.sepY * speed * 0.5;
        if (d < 0.8) b.think = 0;
        break;
      }
      case 'idle':
        b.idle -= dt;
        if (b.idle <= 0) b.think = 0;
        break;
      default:
        break;
    }
    this.move(b, dvx, dvy, dt, idle, moveCoef);
  }

  private stopHunting(b: Blob) {
    if (b.target && b.target.hunter === b) b.target.hunter = null;
    b.target = null;
    b.chase = 0;
  }

  private thinkRed(b: Blob, vision: number) {
    const p = this.params;
    this.separate(b, this.redGrid, 5);
    let crowd = 0;
    this.redGrid.each(b.x, b.y, K.redStressRange, (o) => {
      if (o !== b) crowd++;
    });
    b.stress = crowd * K.redStress;

    if (b.energy >= p.redCopy && b.cooldown <= 0 && b.age > 6 && this.redList.length < BLOB_CAP.red) {
      this.beginLock(b, 'bud', BUDDING_TIME);
      return;
    }

    if (b.ignoreT > 0) b.ignoreT -= 0.3;
    if (b.energy < p.redCopy) {
      let best: Blob | null = null;
      let bestD = Infinity;
      this.blueGrid.each(b.x, b.y, vision, (o, d2) => {
        if (o.dead || o.immune > 0 || o.energy < 6) return;
        if (o === b.ignore && b.ignoreT > 0) return;
        const h = o.hunter;
        if (h && h !== b && !h.dead && h.target === o) return;
        if (d2 < bestD) {
          bestD = d2;
          best = o;
        }
      });
      if (best) {
        const found: Blob = best;
        if (b.target !== found) {
          b.chase = 0;
          if (b.target && b.target.hunter === b) b.target.hunter = null;
        }
        b.target = found;
        found.hunter = b;
        b.action = 'hunt';
        return;
      }
    }

    this.stopHunting(b);
    if (b.action === 'idle' && b.idle > 0) return;
    if (b.action === 'wander' && Math.hypot(b.gx - b.x, b.gy - b.y) > 0.9) return;

    if (this.rng.chance(0.3)) {
      b.action = 'idle';
      b.idle = this.rng.range(0.6, 2);
      return;
    }
    if (b.hasMem && this.rng.chance(K.redMemory)) {
      const R = this.radius - 2.5;
      let x = b.memX + this.rng.range(-3, 3);
      let y = b.memY + this.rng.range(-3, 3);
      const l = Math.hypot(x, y);
      if (l > R) {
        x *= R / l;
        y *= R / l;
      }
      b.gx = x;
      b.gy = y;
      b.action = 'wander';
      return;
    }
    this.pickWander(b, 4, 12);
  }

  private contact(red: Blob, blue: Blob) {
    const p = this.params;
    const drain = DRAIN_PER_CONTACT * p.redContact;
    const taken = Math.min(blue.energy, drain);
    blue.energy -= taken;
    red.energy = Math.min(MAX_ENERGY, red.energy + taken * K.drainEfficiency);
    red.contacts++;
    red.memX = blue.x;
    red.memY = blue.y;
    red.hasMem = true;
    this.stats.contacts++;
    blue.immune = IMMUNE_TIME;

    if (blue.energy <= 0.01) {
      blue.cause = 'drained';
      blue.energy = 0;
    } else {
      if (blue.action === 'eat') {
        // the snack is interrupted
        this.release(blue);
      } else {
        this.dropTarget(blue);
      }
      this.beginLock(blue, 'startled', STARTLE_TIME);
      const dx = blue.x - red.x;
      const dy = blue.y - red.y;
      const l = Math.hypot(dx, dy) || 1;
      blue.vx = (dx / l) * 2.5;
      blue.vy = (dy / l) * 2.5;
      blue.dirX = dx / l;
      blue.dirY = dy / l;
    }

    blue.hunter = null;
    red.target = null;
    red.chase = 0;
    this.beginLock(red, 'nuzzle', NUZZLE_TIME);
    this.emit({ type: 'contact', x: (red.x + blue.x) / 2, y: (red.y + blue.y) / 2, z: 1.2, kind: 'red', amount: taken * K.drainEfficiency });
    this.emit({ type: 'drain', x: blue.x, y: blue.y, z: 1.2, kind: 'blue', amount: taken });
  }

  /* ---------------------------- history -------------------------- */

  private record() {
    this.rebuildLists();
    const h = this.history;
    let fruit = 0;
    let growing = 0;
    for (const t of this.trees) {
      for (const s of t.slots) {
        if (s.state === 'ripe') fruit++;
        else if (s.state === 'growing') growing += s.progress;
      }
    }
    let bE = 0;
    let rE = 0;
    let bs = 0;
    let bv = 0;
    let rs = 0;
    let rv = 0;
    for (const b of this.blueList) {
      bE += b.energy;
      bs += b.traits.speed;
      bv += b.traits.vision;
    }
    for (const b of this.redList) {
      rE += b.energy;
      rs += b.traits.speed;
      rv += b.traits.vision;
    }
    const nb = this.blueList.length;
    const nr = this.redList.length;
    h.samples.push({
      t: this.time,
      fruit,
      growing,
      blue: nb,
      red: nr,
      blueEnergy: nb ? bE / nb : 0,
      redEnergy: nr ? rE / nr : 0,
      blueSpeed: nb ? bs / nb : 1,
      blueVision: nb ? bv / nb : 1,
      redSpeed: nr ? rs / nr : 1,
      redVision: nr ? rv / nr : 1,
    });
    this.nextSample = this.time + h.interval;
    if (h.samples.length > 3000) {
      h.samples = h.samples.filter((_, i) => i % 2 === 0);
      h.interval *= 2;
    }
  }
}
