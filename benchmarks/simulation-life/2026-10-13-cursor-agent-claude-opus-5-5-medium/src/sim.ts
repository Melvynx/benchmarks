export type Kind = "blue" | "red";

export type Action =
  | "seeking fruit"
  | "eating"
  | "waiting by tree"
  | "wandering"
  | "avoiding crowd"
  | "fleeing"
  | "running to cover"
  | "hiding"
  | "chasing"
  | "resting"
  | "dozing"
  | "newborn";

export interface Params {
  fruitGrowth: number;
  fruitLimit: number;
  fruitDelay: number;
  blueUse: number;
  blueSpeed: number;
  blueVision: number;
  blueCopy: number;
  blueEatTime: number;
  redUse: number;
  redSpeed: number;
  redVision: number;
  redContact: number;
  redCopy: number;
  redPause: number;
  trees: number;
  blueStart: number;
  redStart: number;
  worldSize: number;
  seed: number;
  simSpeed: number;
}

export const DEFAULTS: Params = {
  fruitGrowth: 1,
  fruitLimit: 5,
  fruitDelay: 4,
  blueUse: 1,
  blueSpeed: 3,
  blueVision: 6,
  blueCopy: 60,
  blueEatTime: 1.2,
  redUse: 1,
  redSpeed: 3.4,
  redVision: 7,
  redContact: 30,
  redCopy: 70,
  redPause: 1.5,
  trees: 15,
  blueStart: 45,
  redStart: 8,
  worldSize: 32,
  seed: 7,
  simSpeed: 2,
};

/** Params that only take effect when the world is rebuilt. */
export const START_KEYS: (keyof Params)[] = ["trees", "blueStart", "redStart", "worldSize", "seed"];

export const FRUIT_ENERGY = 30;
export const MAX_SLOTS = 10;
export const BASE_GROW_TIME = 10;
export const CONTACT_RANGE = 0.95;
export const MAX_BLUE = 700;
export const MAX_RED = 300;
const COPY_EFFICIENCY = 0.9;
export const IDLE_COST = { blue: 0.6, red: 0.5 };
export const MOVE_COST = { blue: 1.4, red: 1.2 };
/**
 * fear: share of vision at which blues notice reds. A canopy shelters up to canopyRoom blues from tagging.
 * dozeAt: share of the red copy threshold below which idle reds sit and wait. dash: blue flight boost.
 */
export const TUNING = { fear: 0.75, hideCanopy: 1.9, canopyRoom: 1, mutation: 0.025, dozeAt: 0.5, cover: 1, dash: 1.05 };

export const FRUIT_RIPE = 0;
export const FRUIT_WAITING = 1;
export const FRUIT_GROWING = 2;

export interface FruitSlot {
  state: number;
  /** waiting: seconds left; growing: progress 0..1 */
  t: number;
  /** sim time when last eaten (for shrink animation) */
  eatenAt: number;
}

export interface Tree {
  id: number;
  x: number;
  y: number;
  size: number;
  hue: number;
  slots: FruitSlot[];
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
  energy: number;
  age: number;
  action: Action;
  /** eating (blue) or resting (red) time left */
  busy: number;
  busyTotal: number;
  /** inherited multipliers on the slider values */
  gSpeed: number;
  gVision: number;
  gen: number;
  family: number;
  parent: number | null;
  children: number;
  meals: number;
  patience: number;
  roam: number;
  walk: number;
  seed: number;
  lastMealAt: number;
  hidden: boolean;
  tgtX: number;
  tgtY: number;
  tgtOn: boolean;
}

export interface SimEvent {
  type: "eat" | "tag" | "birth" | "fade";
  kind: Kind;
  x: number;
  y: number;
  id: number;
  other?: number;
  tree?: number;
  slot?: number;
  blob?: Blob;
}

export interface Sample {
  t: number;
  fruit: number;
  blue: number;
  red: number;
  bs: number;
  bv: number;
  rs: number;
  rv: number;
  be: number;
  re: number;
}

export interface Stats {
  blueBirths: number;
  redBirths: number;
  tags: number;
  meals: number;
  blueStarved: number;
  redFaded: number;
  blueExtinctAt: number | null;
  redExtinctAt: number | null;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Grid {
  cell: number;
  map = new Map<number, Blob[]>();
  constructor(cell: number) {
    this.cell = cell;
  }
  key(cx: number, cy: number) {
    return (cx + 512) * 1024 + (cy + 512);
  }
  build(list: Blob[]) {
    this.map.clear();
    for (const b of list) {
      const k = this.key(Math.floor(b.x / this.cell), Math.floor(b.y / this.cell));
      const bucket = this.map.get(k);
      if (bucket) bucket.push(b);
      else this.map.set(k, [b]);
    }
  }
  forEach(x: number, y: number, r: number, fn: (b: Blob, d2: number) => void) {
    const c = this.cell;
    const x0 = Math.floor((x - r) / c);
    const x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c);
    const y1 = Math.floor((y + r) / c);
    const r2 = r * r;
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const bucket = this.map.get(this.key(cx, cy));
        if (!bucket) continue;
        for (const b of bucket) {
          const dx = b.x - x;
          const dy = b.y - y;
          const d2 = dx * dx + dy * dy;
          if (d2 <= r2) fn(b, d2);
        }
      }
    }
  }
}

export class Sim {
  static DT = 0.05;
  p: Params;
  rng: () => number;
  time = 0;
  trees: Tree[] = [];
  blobs: Blob[] = [];
  events: SimEvent[] = [];
  history: Sample[] = [];
  sampleEvery = 0.5;
  nextSample = 0;
  nextId = 1;
  radius = 26;
  stats: Stats = this.emptyStats();
  canopyCount: number[] = [];
  private blueGrid = new Grid(4);
  private redGrid = new Grid(4);

  constructor(p: Params) {
    this.p = { ...p };
    this.rng = mulberry32(p.seed);
    this.reset(p);
  }

  private emptyStats(): Stats {
    return {
      blueBirths: 0,
      redBirths: 0,
      tags: 0,
      meals: 0,
      blueStarved: 0,
      redFaded: 0,
      blueExtinctAt: null,
      redExtinctAt: null,
    };
  }

  reset(p: Params) {
    this.p = { ...p };
    this.rng = mulberry32(Math.floor(p.seed) * 9973 + 17);
    this.time = 0;
    this.trees = [];
    this.blobs = [];
    this.events = [];
    this.history = [];
    this.sampleEvery = 0.5;
    this.nextSample = 0;
    this.nextId = 1;
    this.radius = p.worldSize;
    this.stats = this.emptyStats();

    const R = this.radius;
    const n = Math.round(p.trees);
    const minGap = Math.max(2.6, Math.min(7, (R * 1.4) / Math.sqrt(Math.max(1, n))));
    for (let i = 0; i < n; i++) {
      let best: { x: number; y: number } | null = null;
      let bestGap = -1;
      for (let a = 0; a < 40; a++) {
        const [x, y] = this.randomInDisk(R - 3.2);
        let gap = Infinity;
        for (const t of this.trees) gap = Math.min(gap, Math.hypot(t.x - x, t.y - y));
        if (gap >= minGap) {
          best = { x, y };
          break;
        }
        if (gap > bestGap) {
          bestGap = gap;
          best = { x, y };
        }
      }
      const slots: FruitSlot[] = [];
      for (let s = 0; s < MAX_SLOTS; s++) {
        slots.push({ state: s < p.fruitLimit ? FRUIT_RIPE : FRUIT_GROWING, t: 0, eatenAt: -99 });
      }
      this.trees.push({
        id: i,
        x: best!.x,
        y: best!.y,
        size: 0.85 + this.rng() * 0.4,
        hue: 100 + this.rng() * 40,
        slots,
      });
    }

    for (let i = 0; i < Math.round(p.blueStart); i++) {
      const [x, y] = this.randomInDisk(R - 1.5);
      this.blobs.push(this.makeBlob("blue", x, y, p.blueCopy * (0.4 + this.rng() * 0.3)));
    }
    for (let i = 0; i < Math.round(p.redStart); i++) {
      const [x, y] = this.randomInDisk(R - 1.5);
      this.blobs.push(this.makeBlob("red", x, y, p.redCopy * (0.4 + this.rng() * 0.3)));
    }
    this.record();
  }

  setParams(p: Params) {
    this.p = { ...p };
  }

  randomInDisk(r: number): [number, number] {
    const a = this.rng() * Math.PI * 2;
    const d = Math.sqrt(this.rng()) * r;
    return [Math.cos(a) * d, Math.sin(a) * d];
  }

  gauss() {
    const u = 1 - this.rng();
    const v = this.rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  makeBlob(kind: Kind, x: number, y: number, energy: number, parent?: Blob): Blob {
    const id = this.nextId++;
    const mutate = (g: number) => Math.min(1.25, Math.max(0.8, g * Math.exp(this.gauss() * TUNING.mutation)));
    return {
      id,
      kind,
      x,
      y,
      px: x,
      py: y,
      vx: 0,
      vy: 0,
      heading: this.rng() * Math.PI * 2,
      energy,
      age: 0,
      action: parent ? "newborn" : "wandering",
      busy: parent ? 0.6 : 0,
      busyTotal: parent ? 0.6 : 0,
      gSpeed: parent ? mutate(parent.gSpeed) : 1,
      gVision: parent ? mutate(parent.gVision) : 1,
      gen: parent ? parent.gen + 1 : 0,
      family: parent ? parent.family : id,
      parent: parent ? parent.id : null,
      children: 0,
      meals: 0,
      patience: 0,
      roam: 0,
      walk: this.rng() * 10,
      seed: this.rng(),
      lastMealAt: -99,
      hidden: false,
      tgtX: 0,
      tgtY: 0,
      tgtOn: false,
    };
  }

  speedOf(b: Blob) {
    return (b.kind === "blue" ? this.p.blueSpeed : this.p.redSpeed) * b.gSpeed;
  }

  visionOf(b: Blob) {
    return (b.kind === "blue" ? this.p.blueVision : this.p.redVision) * b.gVision;
  }

  ripeCount(t: Tree) {
    let n = 0;
    const lim = Math.round(this.p.fruitLimit);
    for (let i = 0; i < lim; i++) if (t.slots[i].state === FRUIT_RIPE) n++;
    return n;
  }

  totalFruit() {
    let n = 0;
    for (const t of this.trees) n += this.ripeCount(t);
    return n;
  }

  counts() {
    let blue = 0;
    let red = 0;
    for (const b of this.blobs) if (b.kind === "blue") blue++;
    else red++;
    return { blue, red };
  }

  step() {
    const dt = Sim.DT;
    const p = this.p;
    this.time += dt;

    this.stepFruit(dt);

    const blues: Blob[] = [];
    const reds: Blob[] = [];
    for (const t of this.trees) this.canopyCount[t.id] = 0;
    const under: (Tree | null)[] = [];
    for (const b of this.blobs) {
      if (b.kind === "blue") {
        blues.push(b);
        let found: Tree | null = null;
        for (const t of this.trees) {
          const r = TUNING.hideCanopy * t.size;
          const dx = b.x - t.x;
          const dy = b.y - t.y;
          if (dx * dx + dy * dy < r * r) {
            found = t;
            break;
          }
        }
        under.push(found);
      } else reds.push(b);
    }
    // Whoever was already sheltered keeps their spot; free spots go to the oldest arrivals.
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < blues.length; i++) {
        const t = under[i];
        const b = blues[i];
        if (pass === 0 && !b.hidden) continue;
        if (pass === 1 && b.hidden && t) continue;
        b.hidden = !!t && this.canopyCount[t.id] < TUNING.canopyRoom;
        if (b.hidden) this.canopyCount[t!.id]++;
      }
    }
    this.blueGrid.build(blues);
    this.redGrid.build(reds);

    const dead = new Set<Blob>();
    const born: Blob[] = [];
    let blueCount = blues.length;
    let redCount = reds.length;

    for (const b of this.blobs) {
      if (dead.has(b)) continue;
      b.px = b.x;
      b.py = b.y;
      b.age += dt;
      b.tgtOn = false;
      let dx = 0;
      let dy = 0;
      let wantSpeed = 0;

      if (b.busy > 0) {
        b.busy -= dt;
        if (b.busy <= 0) b.busy = 0;
      } else if (b.kind === "blue") {
        [dx, dy, wantSpeed] = this.thinkBlue(b, dt);
      } else {
        const r = this.thinkRed(b, dt, dead);
        [dx, dy, wantSpeed] = r;
      }

      // Gentle separation from same-colour neighbours.
      const grid = b.kind === "blue" ? this.blueGrid : this.redGrid;
      const sepR = b.kind === "blue" ? 1.3 : 1.8;
      let sx = 0;
      let sy = 0;
      grid.forEach(b.x, b.y, sepR, (o, d2) => {
        if (o === b || d2 < 1e-6) return;
        const d = Math.sqrt(d2);
        const w = (sepR - d) / sepR;
        sx += ((b.x - o.x) / d) * w;
        sy += ((b.y - o.y) / d) * w;
      });

      const speed = this.speedOf(b);
      let tx = dx * wantSpeed + sx * speed * 0.9;
      let ty = dy * wantSpeed + sy * speed * 0.9;
      if (b.busy > 0) {
        tx = sx * 0.4;
        ty = sy * 0.4;
      }

      // Stay inside the dish.
      const R = this.radius;
      const rr = Math.hypot(b.x, b.y);
      if (rr > R - 1.6) {
        const push = (rr - (R - 1.6)) * 1.6;
        tx -= (b.x / rr) * push * speed;
        ty -= (b.y / rr) * push * speed;
      }

      const k = Math.min(1, dt * 5);
      b.vx += (tx - b.vx) * k;
      b.vy += (ty - b.vy) * k;
      const v = Math.hypot(b.vx, b.vy);
      const cap = speed * (b.action === "fleeing" || b.action === "running to cover" ? TUNING.dash : 1.05);
      if (v > cap) {
        b.vx *= cap / v;
        b.vy *= cap / v;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Tree trunks are solid.
      for (const t of this.trees) {
        const ox = b.x - t.x;
        const oy = b.y - t.y;
        const d = Math.hypot(ox, oy);
        const min = 0.75 * t.size;
        if (d < min && d > 1e-6) {
          b.x = t.x + (ox / d) * min;
          b.y = t.y + (oy / d) * min;
        }
      }
      const r2 = Math.hypot(b.x, b.y);
      if (r2 > R - 0.7) {
        b.x *= (R - 0.7) / r2;
        b.y *= (R - 0.7) / r2;
      }

      const realV = Math.hypot(b.x - b.px, b.y - b.py) / dt;
      b.walk += realV * dt;
      if (realV > 0.15 && b.busy <= 0) b.heading = Math.atan2(b.vy, b.vx);

      // Energy: waiting costs a little, moving costs more (quadratic in pace).
      const use = b.kind === "blue" ? p.blueUse : p.redUse;
      const idle = b.kind === "blue" ? IDLE_COST.blue : IDLE_COST.red;
      const move = b.kind === "blue" ? MOVE_COST.blue : MOVE_COST.red;
      const pace = realV / 3;
      const eyes = 0.7 + 0.3 * b.gVision * b.gVision;
      b.energy -= (idle * eyes + move * pace * pace) * use * dt;

      if (b.energy <= 0) {
        dead.add(b);
        if (b.kind === "blue") this.stats.blueStarved++;
        else this.stats.redFaded++;
        this.events.push({ type: "fade", kind: b.kind, x: b.x, y: b.y, id: b.id, blob: b });
        continue;
      }

      // Copying: split stored energy, losing a little to the effort.
      const copyAt = b.kind === "blue" ? p.blueCopy : p.redCopy;
      const room = b.kind === "blue" ? blueCount < MAX_BLUE : redCount < MAX_RED;
      if (b.energy >= copyAt && b.busy <= 0 && room) {
        const share = (b.energy * COPY_EFFICIENCY) / 2;
        b.energy = share;
        b.children++;
        const a = this.rng() * Math.PI * 2;
        const child = this.makeBlob(b.kind, b.x + Math.cos(a) * 0.7, b.y + Math.sin(a) * 0.7, share, b);
        child.vx = Math.cos(a) * 1.5;
        child.vy = Math.sin(a) * 1.5;
        born.push(child);
        if (b.kind === "blue") {
          blueCount++;
          this.stats.blueBirths++;
        } else {
          redCount++;
          this.stats.redBirths++;
        }
        this.events.push({ type: "birth", kind: b.kind, x: child.x, y: child.y, id: child.id, other: b.id });
      }
    }

    if (dead.size) this.blobs = this.blobs.filter((b) => !dead.has(b));
    if (born.length) this.blobs.push(...born);

    const c = this.counts();
    if (c.blue === 0 && this.stats.blueExtinctAt === null && this.p.blueStart > 0) this.stats.blueExtinctAt = this.time;
    if (c.red === 0 && this.stats.redExtinctAt === null && this.p.redStart > 0) this.stats.redExtinctAt = this.time;
    if (c.blue > 0) this.stats.blueExtinctAt = null;
    if (c.red > 0) this.stats.redExtinctAt = null;

    if (this.time >= this.nextSample) this.record();
  }

  private stepFruit(dt: number) {
    const p = this.p;
    const lim = Math.round(p.fruitLimit);
    for (const t of this.trees) {
      for (let i = 0; i < MAX_SLOTS; i++) {
        const s = t.slots[i];
        if (i >= lim) {
          if (s.state !== FRUIT_GROWING || s.t !== 0) {
            s.state = FRUIT_GROWING;
            s.t = 0;
          }
          continue;
        }
        if (s.state === FRUIT_WAITING) {
          s.t -= dt;
          if (s.t <= 0) {
            s.state = FRUIT_GROWING;
            s.t = 0;
          }
        } else if (s.state === FRUIT_GROWING) {
          s.t += (dt * p.fruitGrowth) / BASE_GROW_TIME;
          if (s.t >= 1) {
            s.state = FRUIT_RIPE;
            s.t = 1;
          }
        }
      }
    }
  }

  private aim(b: Blob, x: number, y: number) {
    b.tgtX = x;
    b.tgtY = y;
    b.tgtOn = true;
  }

  private thinkBlue(b: Blob, dt: number): [number, number, number] {
    const p = this.p;
    const speed = this.speedOf(b);
    const vision = this.visionOf(b);

    // 1. Danger: steer away from every visible red, weighted by closeness.
    const fear = vision * TUNING.fear;
    let fx = 0;
    let fy = 0;
    let threats = 0;
    this.redGrid.forEach(b.x, b.y, fear, (r, d2) => {
      const d = Math.sqrt(d2) + 0.01;
      const w = 1 / d;
      fx += ((b.x - r.x) / d) * w;
      fy += ((b.y - r.y) / d) * w;
      threats++;
    });
    if (threats > 0) {
      // Already tucked under leaves: freeze and hide.
      if (TUNING.cover && b.hidden) {
        b.action = "hiding";
        return [0, 0, 0];
      }
      // Otherwise dash for an uncrowded canopy that isn't behind the threat.
      const fm = Math.hypot(fx, fy) || 1;
      let cover: Tree | null = null;
      let coverD = Infinity;
      for (const t of this.trees) {
        if (this.canopyCount[t.id] >= TUNING.canopyRoom) continue;
        const ox = t.x - b.x;
        const oy = t.y - b.y;
        const d = Math.hypot(ox, oy);
        if (d > vision || d < 0.01) continue;
        if ((ox * fx + oy * fy) / (d * fm) < -0.1) continue;
        if (d < coverD) {
          coverD = d;
          cover = t;
        }
      }
      const dash = speed * TUNING.dash;
      if (TUNING.cover && cover && !b.hidden) {
        b.action = "running to cover";
        b.patience = 0;
        this.aim(b, cover.x, cover.y);
        return [(cover.x - b.x) / coverD, (cover.y - b.y) / coverD, dash];
      }
      // Bias toward the centre so fleeing blobs don't pin themselves on the rim.
      const rr = Math.hypot(b.x, b.y);
      if (rr > this.radius * 0.7) {
        fx -= (b.x / rr) * 0.25;
        fy -= (b.y / rr) * 0.25;
      }
      const m = Math.hypot(fx, fy) || 1;
      b.action = "fleeing";
      b.patience = 0;
      return [fx / m, fy / m, dash];
    }

    // 2. Food: nearest tree with ripe fruit inside vision.
    const hungry = b.energy < p.blueCopy;
    let best: Tree | null = null;
    let bestD = Infinity;
    let bare: Tree | null = null;
    let bareD = Infinity;
    for (const t of this.trees) {
      const d = Math.hypot(t.x - b.x, t.y - b.y);
      if (d > vision + 1) continue;
      if (this.ripeCount(t) > 0) {
        if (d < bestD) {
          bestD = d;
          best = t;
        }
      } else if (d < bareD) {
        bareD = d;
        bare = t;
      }
    }

    if (b.roam > 0) b.roam -= dt;

    if (best && hungry) {
      const reach = 1.25 * best.size + 0.35;
      if (bestD <= reach) {
        const lim = Math.round(p.fruitLimit);
        const ripe: number[] = [];
        for (let i = 0; i < lim; i++) if (best.slots[i].state === FRUIT_RIPE) ripe.push(i);
        const si = ripe[Math.floor(this.rng() * ripe.length)];
        const slot = best.slots[si];
        slot.state = FRUIT_WAITING;
        slot.t = p.fruitDelay;
        slot.eatenAt = this.time;
        b.energy += FRUIT_ENERGY;
        b.meals++;
        b.lastMealAt = this.time;
        b.busy = p.blueEatTime;
        b.busyTotal = p.blueEatTime;
        b.action = "eating";
        b.patience = 0;
        b.heading = Math.atan2(best.y - b.y, best.x - b.x);
        this.stats.meals++;
        this.events.push({ type: "eat", kind: "blue", x: b.x, y: b.y, id: b.id, tree: best.id, slot: si });
        return [0, 0, 0];
      }
      b.action = "seeking fruit";
      this.aim(b, best.x, best.y);
      return [(best.x - b.x) / bestD, (best.y - b.y) / bestD, speed * 0.85];
    }

    // 3. Wait near a bare tree for fruit to come back, unless it's crowded or we've waited long.
    if (bare && b.roam <= 0) {
      let crowd = 0;
      this.blueGrid.forEach(bare.x, bare.y, 3.2, () => crowd++);
      if (crowd > 5 || b.patience > 9) {
        b.roam = 5 + this.rng() * 4;
        b.patience = 0;
        b.heading = Math.atan2(b.y - bare.y, b.x - bare.x) + this.gauss() * 0.6;
        b.action = "avoiding crowd";
      } else {
        b.patience += dt;
        b.action = "waiting by tree";
        const ox = b.x - bare.x;
        const oy = b.y - bare.y;
        const d = Math.hypot(ox, oy) || 1;
        const ring = 2.3 * bare.size;
        const radial = (ring - d) * 0.8;
        const tang = 0.25;
        const dirx = (ox / d) * radial + (-oy / d) * tang;
        const diry = (oy / d) * radial + (ox / d) * tang;
        const m = Math.hypot(dirx, diry) || 1;
        return [dirx / m, diry / m, Math.min(speed * 0.35, m * speed * 0.5)];
      }
    }

    // 4. Wander.
    if (b.action !== "avoiding crowd" || b.roam <= 0) b.action = "wandering";
    b.heading += this.gauss() * dt * 2.2;
    return [Math.cos(b.heading), Math.sin(b.heading), speed * 0.5];
  }

  private thinkRed(b: Blob, dt: number, dead: Set<Blob>): [number, number, number] {
    const p = this.p;
    const speed = this.speedOf(b);
    const vision = this.visionOf(b);

    let target: Blob | null = null;
    let td2 = Infinity;
    this.blueGrid.forEach(b.x, b.y, vision, (o, d2) => {
      if (dead.has(o) || o.hidden) return;
      if (d2 < td2) {
        td2 = d2;
        target = o;
      }
    });

    if (target) {
      const t = target as Blob;
      const d = Math.sqrt(td2);
      if (d <= CONTACT_RANGE) {
        dead.add(t);
        b.energy += p.redContact;
        b.meals++;
        b.lastMealAt = this.time;
        b.busy = p.redPause;
        b.busyTotal = p.redPause;
        b.action = "resting";
        b.heading = Math.atan2(t.y - b.y, t.x - b.x);
        this.stats.tags++;
        this.events.push({ type: "tag", kind: "red", x: t.x, y: t.y, id: b.id, other: t.id, blob: t });
        return [0, 0, 0];
      }
      const lead = Math.min(0.6, d / (speed + 0.01)) * 0.5;
      const ax = t.x + t.vx * lead - b.x;
      const ay = t.y + t.vy * lead - b.y;
      const m = Math.hypot(ax, ay) || 1;
      b.action = "chasing";
      this.aim(b, t.x, t.y);
      return [ax / m, ay / m, speed];
    }

    // Low on energy and nothing in sight: sit still and wait for blues to come by.
    if (b.energy < p.redCopy * TUNING.dozeAt) {
      if (b.action !== "dozing" && this.rng() < dt * 0.6) b.action = "dozing";
      if (b.action === "dozing") {
        if (this.rng() < dt * 0.05) b.action = "wandering";
        return [0, 0, 0];
      }
    } else if (b.action === "dozing") b.action = "wandering";

    b.action = "wandering";
    b.heading += this.gauss() * dt * 1.6;
    return [Math.cos(b.heading), Math.sin(b.heading), speed * 0.45];
  }

  record() {
    const c = this.counts();
    let bs = 0,
      bv = 0,
      rs = 0,
      rv = 0,
      be = 0,
      re = 0;
    for (const b of this.blobs) {
      if (b.kind === "blue") {
        bs += b.gSpeed;
        bv += b.gVision;
        be += b.energy;
      } else {
        rs += b.gSpeed;
        rv += b.gVision;
        re += b.energy;
      }
    }
    this.history.push({
      t: this.time,
      fruit: this.totalFruit(),
      blue: c.blue,
      red: c.red,
      bs: c.blue ? bs / c.blue : NaN,
      bv: c.blue ? bv / c.blue : NaN,
      rs: c.red ? rs / c.red : NaN,
      rv: c.red ? rv / c.red : NaN,
      be: c.blue ? be / c.blue : NaN,
      re: c.red ? re / c.red : NaN,
    });
    if (this.history.length > 5000) {
      this.history = this.history.filter((_, i) => i % 2 === 0);
      this.sampleEvery *= 2;
    }
    this.nextSample = this.time + this.sampleEvery;
  }

  findBlob(id: number) {
    return this.blobs.find((b) => b.id === id) ?? null;
  }
}
