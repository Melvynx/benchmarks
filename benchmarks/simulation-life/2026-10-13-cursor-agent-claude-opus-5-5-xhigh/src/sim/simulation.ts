import { Grid } from "./grid";
import type { Params } from "./params";
import { Rng } from "./rng";

export const DT = 0.05;
export const TICKS_PER_SAMPLE = 20;
export const FRUIT_ENERGY = 30;
export const MAX_SLOTS = 12;
export const BLOB_RADIUS = 0.36;
export const TREE_REACH = 1.3;
export const TRUNK_CLEARANCE = 0.62;
export const CONTACT_DIST = 0.85;
/** Blues bolt from any red this close (fraction of vision), or from a red that is actively chasing them. */
export const FLEE_FRACTION = 0.5;
export const FLEE_BOOST = 1.15;
export const CHASE_GIVE_UP = 5;
export const GOLDEN_ANGLE = 2.399963;
/** A starving red keeps only this fraction of its top speed. */
export const RED_VIGOR_FLOOR = 0.55;
/** Blues this close to a trunk are under the leaves; reds only notice them from HIDDEN_SPOT away. */
export const SHELTER_RADIUS = 1.45;
export const HIDDEN_SPOT = 1.8;
/** Fed blues (above this fraction of the copy threshold) rest in the shade instead of roaming. */
export const SHADE_LEVEL = 0.35;

export const BLUE = 0;
export const RED = 1;
export type Kind = typeof BLUE | typeof RED;

export type Action =
  | "wander"
  | "seek"
  | "remember"
  | "eat"
  | "flee"
  | "shade"
  | "crowd"
  | "hunt"
  | "rest"
  | "tired";

export const SLOT_GROW = 0;
export const SLOT_RIPE = 1;
export const SLOT_EAT = 2;
export const SLOT_WAIT = 3;

export interface Slot {
  state: number;
  size: number;
  wait: number;
  eater: number;
}

export interface Tree {
  id: number;
  x: number;
  z: number;
  size: number;
  phase: number;
  ripe: number;
  slots: Slot[];
}

export interface Blob {
  id: number;
  kind: Kind;
  x: number;
  z: number;
  px: number;
  pz: number;
  vx: number;
  vz: number;
  heading: number;
  energy: number;
  age: number;
  gen: number;
  parentId: number;
  children: number;
  meals: number;
  speedGene: number;
  visionGene: number;
  action: Action;
  timer: number;
  timerTotal: number;
  treeId: number;
  slot: number;
  targetId: number;
  memoryTree: number;
  chase: number;
  wander: number;
  think: number;
  alive: boolean;
  sheltered: boolean;
  hunter: number;
  hunterDist: number;
  cause: "" | "faded" | "booped";
  diedAt: number;
}

export type SimEvent =
  | { type: "eat"; x: number; z: number; id: number; treeId: number; slot: number }
  | { type: "ate"; x: number; z: number; id: number }
  | { type: "boop"; x: number; z: number; id: number; victim: number }
  | { type: "birth"; x: number; z: number; id: number; parentId: number; kind: Kind }
  | { type: "fade"; x: number; z: number; id: number; kind: Kind };

export interface History {
  t: number[];
  fruit: number[];
  blue: number[];
  red: number[];
  blueSpeed: number[];
  blueVision: number[];
  redSpeed: number[];
  redVision: number[];
}

export interface Marker {
  t: number;
  kind: Kind;
  type: "vanished" | "returned";
}

export interface Stats {
  births: [number, number];
  fades: [number, number];
  boops: number;
  fruitsEaten: number;
  peak: [number, number];
}

export function slotAngle(tree: Tree, i: number): number {
  return tree.phase + i * GOLDEN_ANGLE;
}

export function blobVision(p: Params, b: Blob): number {
  return (b.kind === BLUE ? p.blueVision : p.redVision) * b.visionGene;
}

/** Hungry reds get sluggish: below half their copy threshold, top speed slides toward RED_VIGOR_FLOOR. */
export function vigor(p: Params, b: Blob): number {
  if (b.kind === BLUE) return 1;
  const full = 0.5 * p.redCopyAt;
  return RED_VIGOR_FLOOR + (1 - RED_VIGOR_FLOOR) * Math.min(1, Math.max(0, b.energy / full));
}

export function blobMaxSpeed(p: Params, b: Blob): number {
  return (b.kind === BLUE ? p.blueSpeed : p.redSpeed) * b.speedGene * vigor(p, b);
}

export function blobCopyAt(p: Params, b: Blob): number {
  return b.kind === BLUE ? p.blueCopyAt : p.redCopyAt;
}

/** Energy burned per second: a small idle cost, a speed² movement cost, and a little for sharp senses. */
export function energyCost(p: Params, b: Blob, speed: number): number {
  if (b.kind === BLUE) {
    const s = speed / 2.5;
    return p.blueEnergyUse * (0.7 + 1.6 * s * s + 0.3 * (blobVision(p, b) / 6));
  }
  const s = speed / 3;
  return p.redEnergyUse * (1.6 + 2.5 * s * s + 0.36 * (blobVision(p, b) / 8));
}

export class Simulation {
  params: Params;
  readonly startParams: Params;
  readonly radius: number;
  readonly trees: Tree[] = [];
  blobs: Blob[] = [];
  readonly byId = new Map<number, Blob>();
  time = 0;
  tick = 0;
  fruitCount = 0;
  readonly history: History = {
    t: [],
    fruit: [],
    blue: [],
    red: [],
    blueSpeed: [],
    blueVision: [],
    redSpeed: [],
    redVision: [],
  };
  readonly markers: Marker[] = [];
  readonly stats: Stats = { births: [0, 0], fades: [0, 0], boops: 0, fruitsEaten: 0, peak: [0, 0] };
  readonly counts: [number, number] = [0, 0];
  collectEvents = true;
  events: SimEvent[] = [];

  private rng: Rng;
  private nextId = 1;
  private readonly blueList: Blob[] = [];
  private readonly redList: Blob[] = [];
  private readonly blueGrid: Grid<Blob>;
  private readonly redGrid: Grid<Blob>;
  private readonly treeGrid: Grid<Tree>;
  constructor(params: Params) {
    this.params = { ...params };
    this.startParams = { ...params };
    this.rng = new Rng(params.seed);
    this.radius = params.worldSize;
    this.blueGrid = new Grid(this.radius, 2);
    this.redGrid = new Grid(this.radius, 2.5);
    this.treeGrid = new Grid(this.radius, 4);
    this.plantTrees();
    for (let i = 0; i < params.blueStart; i++) this.spawnInitial(BLUE);
    for (let i = 0; i < params.redStart; i++) this.spawnInitial(RED);
    this.updateTrees(0);
    this.refreshCounts();
    this.record();
  }

  setParams(p: Params): void {
    this.params = { ...p };
  }

  drainEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  get fruitCapacity(): number {
    return this.trees.length * this.params.fruitLimit;
  }

  step(): void {
    this.time += DT;
    this.tick++;
    this.updateTrees(DT);

    this.blueList.length = 0;
    this.redList.length = 0;
    for (const b of this.blobs) {
      if (b.kind === BLUE) {
        b.hunter = 0;
        b.hunterDist = Infinity;
        this.blueList.push(b);
      } else this.redList.push(b);
    }
    this.blueGrid.build(this.blueList);
    this.redGrid.build(this.redList);
    for (const r of this.redList) {
      if (r.action !== "hunt") continue;
      const t = this.byId.get(r.targetId);
      if (!t) continue;
      const d = Math.hypot(t.x - r.x, t.z - r.z);
      if (d < t.hunterDist) {
        t.hunter = r.id;
        t.hunterDist = d;
      }
    }

    const n = this.blobs.length;
    for (let i = 0; i < n; i++) {
      const b = this.blobs[i];
      if (!b.alive) continue;
      b.px = b.x;
      b.pz = b.z;
      b.age += DT;
      if (b.kind === BLUE) this.updateBlue(b);
      else this.updateRed(b);
      if (!b.alive) continue;

      const speed = Math.hypot(b.vx, b.vz);
      b.energy -= energyCost(this.params, b, speed) * DT;
      if (b.energy <= 0) {
        this.kill(b, "faded");
      } else if (b.energy >= blobCopyAt(this.params, b) && b.action !== "eat" && b.action !== "rest") {
        this.reproduce(b);
      }
    }

    let w = 0;
    for (const b of this.blobs) {
      if (b.alive) this.blobs[w++] = b;
      else this.byId.delete(b.id);
    }
    this.blobs.length = w;

    const before: [number, number] = [this.counts[0], this.counts[1]];
    this.refreshCounts();
    for (const k of [BLUE, RED] as const) {
      if (before[k] > 0 && this.counts[k] === 0) this.markers.push({ t: this.time, kind: k, type: "vanished" });
    }
    if (this.tick % TICKS_PER_SAMPLE === 0) this.record();
  }

  // ---------------------------------------------------------------- setup

  private plantTrees(): void {
    const R = this.radius - 2.2;
    let spacing = 3.2;
    for (let i = 0; i < this.params.trees; i++) {
      let placed = false;
      for (let attempt = 0; attempt < 80 && !placed; attempt++) {
        const a = this.rng.next() * Math.PI * 2;
        const r = Math.sqrt(this.rng.next()) * R;
        const x = Math.sin(a) * r;
        const z = Math.cos(a) * r;
        if (this.trees.every((t) => (t.x - x) ** 2 + (t.z - z) ** 2 > spacing * spacing)) {
          this.addTree(x, z);
          placed = true;
        }
      }
      if (!placed) {
        spacing *= 0.85;
        i--;
      }
    }
    this.treeGrid.build(this.trees);
  }

  private addTree(x: number, z: number): void {
    const slots: Slot[] = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      const ripe = this.rng.chance(0.75);
      slots.push({
        state: ripe ? SLOT_RIPE : SLOT_GROW,
        size: ripe ? 1 : this.rng.next(),
        wait: 0,
        eater: -1,
      });
    }
    this.trees.push({
      id: this.trees.length,
      x,
      z,
      size: this.rng.range(0.88, 1.15),
      phase: this.rng.next() * Math.PI * 2,
      ripe: 0,
      slots,
    });
  }

  private randomFreeSpot(): [number, number] {
    const R = this.radius - 1;
    for (let attempt = 0; attempt < 30; attempt++) {
      const a = this.rng.next() * Math.PI * 2;
      const r = Math.sqrt(this.rng.next()) * R;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      if (this.trees.every((t) => (t.x - x) ** 2 + (t.z - z) ** 2 > 1)) return [x, z];
    }
    return [0, 0];
  }

  private spawnInitial(kind: Kind): void {
    const [x, z] = this.randomFreeSpot();
    const copyAt = kind === BLUE ? this.params.blueCopyAt : this.params.redCopyAt;
    const m = this.params.mutation;
    const b = this.makeBlob(kind, x, z, copyAt * this.rng.range(0.35, 0.75));
    b.age = this.rng.range(8, 60);
    b.speedGene = clampGene(1 + this.rng.gauss() * m);
    b.visionGene = clampGene(1 + this.rng.gauss() * m);
    this.add(b);
  }

  private makeBlob(kind: Kind, x: number, z: number, energy: number): Blob {
    const heading = this.rng.next() * Math.PI * 2;
    return {
      id: this.nextId++,
      kind,
      x,
      z,
      px: x,
      pz: z,
      vx: 0,
      vz: 0,
      heading,
      energy,
      age: 0,
      gen: 0,
      parentId: 0,
      children: 0,
      meals: 0,
      speedGene: 1,
      visionGene: 1,
      action: "wander",
      timer: 0,
      timerTotal: 0,
      treeId: -1,
      slot: -1,
      targetId: -1,
      memoryTree: -1,
      chase: 0,
      wander: heading,
      think: this.rng.next() * 0.3,
      alive: true,
      sheltered: false,
      hunter: 0,
      hunterDist: Infinity,
      cause: "",
      diedAt: 0,
    };
  }

  private add(b: Blob): void {
    this.blobs.push(b);
    this.byId.set(b.id, b);
  }

  // ---------------------------------------------------------------- fruit

  private updateTrees(dt: number): void {
    const p = this.params;
    const lim = p.fruitLimit;
    let total = 0;
    for (const t of this.trees) {
      let ripe = 0;
      for (let i = 0; i < MAX_SLOTS; i++) {
        const s = t.slots[i];
        if (i >= lim) {
          if (s.state !== SLOT_EAT) {
            s.state = SLOT_GROW;
            s.size = 0;
          }
          continue;
        }
        if (s.state === SLOT_GROW) {
          s.size += p.fruitGrowth * dt;
          if (s.size >= 1) {
            s.size = 1;
            s.state = SLOT_RIPE;
          }
        } else if (s.state === SLOT_WAIT) {
          s.wait -= dt;
          if (s.wait <= 0) {
            s.state = SLOT_GROW;
            s.size = 0;
          }
        }
        if (s.state === SLOT_RIPE) ripe++;
      }
      t.ripe = ripe;
      total += ripe;
    }
    this.fruitCount = total;
  }

  private releaseSlot(b: Blob): void {
    if (b.action !== "eat" || b.treeId < 0 || b.slot < 0) return;
    const s = this.trees[b.treeId].slots[b.slot];
    if (s.eater === b.id) {
      s.state = SLOT_WAIT;
      s.wait = this.params.fruitDelay;
      s.size = 0;
      s.eater = -1;
    }
  }

  private tryEat(b: Blob, t: Tree): boolean {
    const lim = this.params.fruitLimit;
    const facing = Math.atan2(b.x - t.x, b.z - t.z);
    let best = -1;
    let bestScore = Infinity;
    for (let i = 0; i < lim; i++) {
      if (t.slots[i].state !== SLOT_RIPE) continue;
      const diff = Math.abs(wrapAngle(slotAngle(t, i) - facing));
      if (diff < bestScore) {
        bestScore = diff;
        best = i;
      }
    }
    if (best < 0) return false;
    const s = t.slots[best];
    s.state = SLOT_EAT;
    s.eater = b.id;
    t.ripe--;
    this.fruitCount--;
    b.action = "eat";
    b.treeId = t.id;
    b.slot = best;
    b.timer = b.timerTotal = Math.max(DT, this.params.blueEatTime);
    b.heading = Math.atan2(t.x - b.x, t.z - b.z);
    b.memoryTree = t.id;
    if (this.collectEvents) this.events.push({ type: "eat", x: b.x, z: b.z, id: b.id, treeId: t.id, slot: best });
    return true;
  }

  // ---------------------------------------------------------------- blue

  private thinkBlue(b: Blob): void {
    const p = this.params;
    const vision = p.blueVision * b.visionGene;
    const near2 = (vision * FLEE_FRACTION) ** 2;
    const threat = this.redGrid.nearest(
      b.x,
      b.z,
      vision,
      (r) =>
        r.alive &&
        ((r.targetId === b.id && r.action === "hunt") ||
          (!b.sheltered && (r.x - b.x) ** 2 + (r.z - b.z) ** 2 < near2)),
    );
    if (threat) {
      b.action = "flee";
      b.targetId = threat.id;
      return;
    }

    let best: Tree | null = null;
    let bestScore = Infinity;
    this.treeGrid.forEachNear(b.x, b.z, vision + 1, (t, d2) => {
      if (t.ripe <= 0) return;
      const score = Math.sqrt(d2) - 0.35 * t.ripe;
      if (score < bestScore) {
        bestScore = score;
        best = t;
      }
    });
    if (best) {
      b.action = "seek";
      b.treeId = (best as Tree).id;
      return;
    }

    if (b.sheltered && b.energy > SHADE_LEVEL * p.blueCopyAt) {
      b.action = "shade";
      return;
    }

    if (b.memoryTree >= 0 && b.energy < 0.75 * p.blueCopyAt) {
      b.action = "remember";
      b.treeId = b.memoryTree;
      return;
    }

    let crowd = 0;
    this.blueGrid.forEachNear(b.x, b.z, 1.6, (o) => {
      if (o !== b && o.alive) crowd++;
    });
    b.action = crowd >= 5 ? "crowd" : "wander";
  }

  private updateBlue(b: Blob): void {
    const p = this.params;
    const maxV = blobMaxSpeed(p, b);

    if (b.action === "eat") {
      const s = this.trees[b.treeId].slots[b.slot];
      b.timer -= DT;
      b.energy += (FRUIT_ENERGY * Math.min(DT, b.timer + DT)) / b.timerTotal;
      s.size = Math.max(0, b.timer / b.timerTotal);
      b.vx *= 0.5;
      b.vz *= 0.5;
      if (b.timer <= 0) {
        this.releaseSlot(b);
        b.action = "wander";
        b.think = 0;
        b.meals++;
        this.stats.fruitsEaten++;
        if (this.collectEvents) this.events.push({ type: "ate", x: b.x, z: b.z, id: b.id });
      }
      this.constrain(b);
      return;
    }

    b.think -= DT;
    if (b.think <= 0) {
      this.thinkBlue(b);
      b.think = 0.2 + this.rng.next() * 0.15;
    }

    let dx = 0;
    let dz = 0;
    let sepWeight = 1;
    let topSpeed = maxV;
    switch (b.action) {
      case "flee": {
        topSpeed = maxV * FLEE_BOOST;
        const vision = p.blueVision * b.visionGene;
        const near2 = (vision * FLEE_FRACTION * 1.3) ** 2;
        let fx = 0;
        let fz = 0;
        this.redGrid.forEachNear(b.x, b.z, vision * 1.1, (o, d2) => {
          if (!o.alive || (d2 > near2 && o.targetId !== b.id)) return;
          const inv = 1 / Math.max(d2, 0.05);
          fx += (b.x - o.x) * inv;
          fz += (b.z - o.z) * inv;
        });
        const f = Math.hypot(fx, fz);
        if (f < 1e-6) {
          b.action = "wander";
          b.think = 0;
        } else {
          dx = (fx / f) * topSpeed;
          dz = (fz / f) * topSpeed;
        }
        break;
      }
      case "seek":
      case "remember": {
        const t = this.trees[b.treeId];
        const ex = t.x - b.x;
        const ez = t.z - b.z;
        const d = Math.hypot(ex, ez);
        if (d < TREE_REACH) {
          if (this.tryEat(b, t)) {
            b.vx *= 0.3;
            b.vz *= 0.3;
            this.constrain(b);
            return;
          }
          if (b.action === "remember") b.memoryTree = -1;
          b.action = "wander";
          b.think = 0;
        } else {
          const urgency = b.action === "seek" ? 0.9 : 0.75;
          dx = (ex / d) * maxV * urgency;
          dz = (ez / d) * maxV * urgency;
          sepWeight = 0.6;
        }
        break;
      }
      case "crowd":
        sepWeight = 2.4;
        [dx, dz] = this.wanderVector(b, maxV * 0.6);
        break;
      case "shade":
        sepWeight = 0.8;
        break;
      default:
        [dx, dz] = this.wanderVector(b, maxV * 0.5);
    }

    let sx = 0;
    let sz = 0;
    this.blueGrid.forEachNear(b.x, b.z, 0.95, (o, d2) => {
      if (o === b || !o.alive || d2 < 1e-6) return;
      const d = Math.sqrt(d2);
      const push = (1 - d / 0.95) / d;
      sx += (b.x - o.x) * push;
      sz += (b.z - o.z) * push;
    });
    dx += sx * maxV * sepWeight;
    dz += sz * maxV * sepWeight;

    this.move(b, dx, dz, topSpeed);
  }

  // ---------------------------------------------------------------- red

  private thinkRed(b: Blob): void {
    const vision = this.params.redVision * b.visionGene;
    const hidden2 = Math.min(HIDDEN_SPOT, vision) ** 2;
    const current = b.action === "hunt" ? this.byId.get(b.targetId) : undefined;
    const nearest = this.blueGrid.nearest(b.x, b.z, vision, (o) => {
      if (!o.alive) return false;
      const d2 = (o.x - b.x) ** 2 + (o.z - b.z) ** 2;
      if (o.sheltered && d2 >= hidden2) return false;
      return o.hunter === 0 || o.hunter === b.id || o.hunterDist * o.hunterDist > d2;
    });
    if (current && current.alive) {
      const dc = Math.hypot(current.x - b.x, current.z - b.z);
      if (dc < vision * 1.2 && (!current.sheltered || dc * dc < hidden2)) {
        if (nearest && nearest !== current && Math.hypot(nearest.x - b.x, nearest.z - b.z) < dc - 1.5) {
          b.targetId = nearest.id;
        }
        return;
      }
    }
    if (nearest) {
      if (b.action !== "hunt") b.chase = 0;
      b.action = "hunt";
      b.targetId = nearest.id;
    } else {
      b.action = "wander";
      b.targetId = -1;
    }
  }

  private updateRed(b: Blob): void {
    const p = this.params;
    const maxV = blobMaxSpeed(p, b);

    if (b.action === "rest") {
      b.timer -= DT;
      b.vx *= 0.8;
      b.vz *= 0.8;
      if (b.timer <= 0) {
        b.action = "wander";
        b.think = 0;
      }
      this.constrain(b);
      return;
    }

    b.think -= DT;
    if (b.think <= 0) {
      if (b.action === "tired") b.action = "wander";
      this.thinkRed(b);
      b.think = 0.2 + this.rng.next() * 0.15;
    }

    let dx = 0;
    let dz = 0;
    if (b.action === "hunt") {
      b.chase += DT;
      const target = this.byId.get(b.targetId);
      if (!target || !target.alive) {
        b.action = "wander";
        b.think = 0;
        [dx, dz] = this.wanderVector(b, maxV * 0.5);
      } else {
        const ex = target.x - b.x;
        const ez = target.z - b.z;
        const d = Math.hypot(ex, ez);
        if (d < CONTACT_DIST) {
          this.boop(b, target);
          this.constrain(b);
          return;
        }
        if (b.chase > CHASE_GIVE_UP) {
          b.action = "tired";
          b.targetId = -1;
          b.think = 2;
          [dx, dz] = this.wanderVector(b, maxV * 0.35);
        } else {
          const lead = Math.min(d / maxV, 0.6);
          const ax = target.x + target.vx * lead - b.x;
          const az = target.z + target.vz * lead - b.z;
          const a = Math.hypot(ax, az) || 1;
          dx = (ax / a) * maxV;
          dz = (az / a) * maxV;
        }
      }
    } else if (b.action === "tired") {
      [dx, dz] = this.wanderVector(b, maxV * 0.35);
    } else {
      [dx, dz] = this.wanderVector(b, maxV * 0.5);
    }

    let sx = 0;
    let sz = 0;
    this.redGrid.forEachNear(b.x, b.z, 2.4, (o, d2) => {
      if (o === b || !o.alive || d2 < 1e-6) return;
      const d = Math.sqrt(d2);
      const push = (1 - d / 2.4) / d;
      sx += (b.x - o.x) * push;
      sz += (b.z - o.z) * push;
    });
    dx += sx * maxV * 0.7;
    dz += sz * maxV * 0.7;

    this.move(b, dx, dz, maxV);
  }

  private boop(red: Blob, blue: Blob): void {
    this.releaseSlot(blue);
    blue.alive = false;
    blue.cause = "booped";
    blue.diedAt = this.time;
    red.energy += this.params.redContact;
    red.meals++;
    red.action = "rest";
    red.timer = red.timerTotal = this.params.redPauseTime;
    red.targetId = blue.id;
    red.heading = Math.atan2(blue.x - red.x, blue.z - red.z);
    red.vx *= 0.2;
    red.vz *= 0.2;
    this.stats.boops++;
    if (this.collectEvents) this.events.push({ type: "boop", x: blue.x, z: blue.z, id: red.id, victim: blue.id });
  }

  // ---------------------------------------------------------------- life & death

  private kill(b: Blob, cause: "faded" | "booped"): void {
    this.releaseSlot(b);
    b.alive = false;
    b.cause = cause;
    b.diedAt = this.time;
    this.stats.fades[b.kind]++;
    if (this.collectEvents) this.events.push({ type: "fade", x: b.x, z: b.z, id: b.id, kind: b.kind });
  }

  private reproduce(b: Blob): void {
    const copyAt = blobCopyAt(this.params, b);
    const share = (b.energy - 0.1 * copyAt) / 2;
    const a = this.rng.next() * Math.PI * 2;
    const child = this.makeBlob(b.kind, b.x + Math.sin(a) * 0.45, b.z + Math.cos(a) * 0.45, share);
    const m = this.params.mutation;
    child.speedGene = clampGene(b.speedGene * (1 + this.rng.gauss() * m));
    child.visionGene = clampGene(b.visionGene * (1 + this.rng.gauss() * m));
    child.gen = b.gen + 1;
    child.parentId = b.id;
    child.memoryTree = b.memoryTree;
    child.heading = child.wander = a;
    child.think = 0.4 + this.rng.next() * 0.3;
    b.energy = share;
    b.children++;
    b.heading = b.wander = a + Math.PI;
    this.constrain(child);
    this.add(child);
    this.stats.births[b.kind]++;
    if (this.collectEvents) {
      this.events.push({ type: "birth", x: child.x, z: child.z, id: child.id, parentId: b.id, kind: b.kind });
    }
  }

  // ---------------------------------------------------------------- motion

  private wanderVector(b: Blob, speed: number): [number, number] {
    b.wander += this.rng.gauss() * 2.2 * Math.sqrt(DT);
    return [Math.sin(b.wander) * speed, Math.cos(b.wander) * speed];
  }

  private move(b: Blob, dx: number, dz: number, maxV: number): void {
    const r = Math.hypot(b.x, b.z);
    const soft = this.radius - 2.6;
    if (r > soft) {
      const nx = b.x / r;
      const nz = b.z / r;
      if (b.action === "flee") {
        const out = dx * nx + dz * nz;
        if (out > 0) {
          const tx = dx - out * nx;
          const tz = dz - out * nz;
          const tl = Math.hypot(tx, tz) || 1;
          const mag = Math.hypot(dx, dz);
          dx = (tx / tl) * mag;
          dz = (tz / tl) * mag;
        }
      } else {
        const k = ((r - soft) / 1.8) * maxV * 1.6;
        dx -= nx * k;
        dz -= nz * k;
        if (b.action === "wander" || b.action === "crowd" || b.action === "tired") {
          b.wander = Math.atan2(-b.x, -b.z) + this.rng.gauss() * 0.6;
        }
      }
    }

    const k = Math.min(1, 6 * DT);
    b.vx += (dx - b.vx) * k;
    b.vz += (dz - b.vz) * k;
    const v = Math.hypot(b.vx, b.vz);
    if (v > maxV) {
      b.vx *= maxV / v;
      b.vz *= maxV / v;
    }
    b.x += b.vx * DT;
    b.z += b.vz * DT;
    if (v > 0.15) b.heading = Math.atan2(b.vx, b.vz);
    this.constrain(b);
  }

  private constrain(b: Blob): void {
    const limit = this.radius - 0.65;
    const r = Math.hypot(b.x, b.z);
    if (r > limit) {
      const nx = b.x / r;
      const nz = b.z / r;
      b.x = nx * limit;
      b.z = nz * limit;
      const out = b.vx * nx + b.vz * nz;
      if (out > 0) {
        b.vx -= out * nx;
        b.vz -= out * nz;
      }
    }
    b.sheltered = false;
    this.treeGrid.forEachNear(b.x, b.z, SHELTER_RADIUS, (t, d2) => {
      b.sheltered = b.kind === BLUE;
      if (d2 >= TRUNK_CLEARANCE * TRUNK_CLEARANCE) return;
      const d = Math.sqrt(d2) || 1e-3;
      const nx = (b.x - t.x) / d;
      const nz = (b.z - t.z) / d;
      b.x = t.x + nx * TRUNK_CLEARANCE;
      b.z = t.z + nz * TRUNK_CLEARANCE;
    });
  }

  // ---------------------------------------------------------------- bookkeeping

  private refreshCounts(): void {
    let blue = 0;
    let red = 0;
    for (const b of this.blobs) {
      if (b.kind === BLUE) blue++;
      else red++;
    }
    this.counts[BLUE] = blue;
    this.counts[RED] = red;
    if (blue > this.stats.peak[BLUE]) this.stats.peak[BLUE] = blue;
    if (red > this.stats.peak[RED]) this.stats.peak[RED] = red;
  }

  private record(): void {
    let bs = 0;
    let bv = 0;
    let rs = 0;
    let rv = 0;
    for (const b of this.blobs) {
      if (b.kind === BLUE) {
        bs += b.speedGene;
        bv += b.visionGene;
      } else {
        rs += b.speedGene;
        rv += b.visionGene;
      }
    }
    const [nb, nr] = this.counts;
    const h = this.history;
    h.t.push(this.time);
    h.fruit.push(this.fruitCount);
    h.blue.push(nb);
    h.red.push(nr);
    h.blueSpeed.push(nb ? bs / nb : NaN);
    h.blueVision.push(nb ? bv / nb : NaN);
    h.redSpeed.push(nr ? rs / nr : NaN);
    h.redVision.push(nr ? rv / nr : NaN);
  }
}

function clampGene(v: number): number {
  return Math.min(1.8, Math.max(0.5, v));
}

export function wrapAngle(a: number): number {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}
