import { BASE_RIPEN_SECONDS, type Params } from "./params";
import { gaussian, mulberry32, type Rng } from "./rng";
import { blobName } from "./names";

export const DT = 0.05;
export const FRUIT_ENERGY = 12;
export const BIRTH_COST = 0.2;
export const HUG_TIME = 0.6;
export const BUD_TIME = 0.7;
export const FADE_TIME = 1.2;
export const IDLE_FRAC = 0.3;
export const FADE_BELOW = 2;
export const MAX_BLOBS = 1400;
export const MAX_SLOTS = 12;
export const BLUE_RADIUS = 0.3;
export const RED_RADIUS = 0.34;
export const TRUNK_RADIUS = 0.26;
export const SAMPLE_EVERY = 1;
const MAX_HISTORY = 20000;
const TAU = Math.PI * 2;

export type Group = "blue" | "red";

export type Action =
  | "wander"
  | "look"
  | "seek"
  | "wait"
  | "eat"
  | "flee"
  | "crowd"
  | "startled"
  | "hugged"
  | "chase"
  | "lurk"
  | "prowl"
  | "tired"
  | "hug"
  | "rest"
  | "bud"
  | "fade";

export const ACTION_LABEL: Record<Action, string> = {
  wander: "Wandering",
  look: "Looking around",
  seek: "Heading for fruit",
  wait: "Waiting by a tree",
  eat: "Munching fruit",
  flee: "Dodging a red blob",
  crowd: "Making room",
  startled: "Scurrying off after a hug",
  hugged: "Being hugged",
  chase: "Chasing a blue blob",
  lurk: "Waiting quietly",
  prowl: "Prowling toward a tree",
  tired: "Catching breath",
  hug: "Hugging a blue blob",
  rest: "Resting after a hug",
  bud: "Budding a copy",
  fade: "Fading away",
};

/** Actions that run to completion; everything else re-decides on a short cadence. */
const LOCKED: ReadonlySet<Action> = new Set(["eat", "hugged", "bud", "hug", "rest", "fade", "startled", "tired"]);
/** Behavioral ecology constants. Mutable so the headless tuning scripts can probe them. */
export const ECO = {
  /** Seconds a red can sprint after one blue before it has to give up. */
  chaseLimit: 4,
  tiredTime: 1.6,
  chaseBoost: 1.2,
  fleeBoost: 1.35,
  prowlChance: 0.1,
  /** Blues munching under a canopy, or waiting beside one, are only spotted from these fractions of a red's vision. */
  shadeEating: 0.55,
  shadeWaiting: 0.55,
  /** Blues notice reds within this fraction of their vision. */
  fearFraction: 0.65,
  /** Reds only bud when at most redRoomMax other reds are within redRoom. */
  redRoom: 5,
  redRoomMax: 1,
  /** Reds stop banking energy past this multiple of their copy threshold. */
  redEnergyCap: 1.6,
  redSpacing: 2.5,
  /** Reds below this fraction of their copy threshold sit and wait more instead of roaming. */
  hungryFraction: 0.35,
  hungryLurk: 0.4,
  /** How much a red's vision shrinks once its search image has faded (0 = never). */
  searchImage: 0,
  focusGain: 0.35,
  focusDecay: 60,
};

export type SlotState = "ripe" | "eaten" | "waiting" | "growing" | "off";

export interface Slot {
  state: SlotState;
  growth: number;
  timer: number;
  eater: number;
  rate: number;
  angle: number;
  lift: number;
}

export interface Tree {
  id: number;
  x: number;
  z: number;
  canopy: number;
  height: number;
  slots: Slot[];
  ripe: number;
  claims: number;
  lastEaten: number;
  eatenTotal: number;
  seed: number;
}

export interface Blob {
  id: number;
  group: Group;
  name: string;
  x: number;
  z: number;
  px: number;
  pz: number;
  heading: number;
  pheading: number;
  speed: number;
  energy: number;
  bornAt: number;
  action: Action;
  actionTime: number;
  actionDur: number;
  decideIn: number;
  wander: number;
  tx: number;
  tz: number;
  targetTree: number;
  targetSlot: number;
  targetBlob: number;
  partner: number;
  homeTree: number;
  patience: number;
  cooldown: number;
  chasers: number;
  /** Red only: how tuned-in it is to spotting blues, fed by recent hugs and fading between them. */
  focus: number;
  speedGene: number;
  visionGene: number;
  generation: number;
  parentId: number;
  parentName: string;
  children: number;
  fruitsEaten: number;
  hugs: number;
  lastEat: number;
  lastHug: number;
  fadeCause: "hunger" | "hug" | null;
  diedAt: number;
  dead: boolean;
}

export interface Sample {
  t: number;
  fruit: number;
  blue: number;
  red: number;
  blueEnergy: number;
  redEnergy: number;
  blueSpeedGene: number;
  blueVisionGene: number;
  redSpeedGene: number;
  redVisionGene: number;
  blueBirths: number;
  redBirths: number;
  blueHugFades: number;
  blueHungerFades: number;
  redHungerFades: number;
  fruitEaten: number;
  hugs: number;
}

export type SimEvent =
  | { type: "eat"; blob: number; tree: number; slot: number; x: number; z: number }
  | { type: "hugStart"; red: number; blue: number; x: number; z: number }
  | {
      type: "hug";
      red: number;
      blue: number;
      amount: number;
      faded: boolean;
      x: number;
      z: number;
      bx: number;
      bz: number;
    }
  | { type: "birth"; parent: number; child: number; group: Group; x: number; z: number }
  | { type: "fade"; blob: number; group: Group; cause: "hunger" | "hug"; x: number; z: number };

type Counters = Pick<
  Sample,
  | "blueBirths"
  | "redBirths"
  | "blueHugFades"
  | "blueHungerFades"
  | "redHungerFades"
  | "fruitEaten"
  | "hugs"
>;

const zeroCounters = (): Counters => ({
  blueBirths: 0,
  redBirths: 0,
  blueHugFades: 0,
  blueHungerFades: 0,
  redHungerFades: 0,
  fruitEaten: 0,
  hugs: 0,
});

const wrapAngle = (a: number) => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export const radiusOf = (b: Blob) => (b.group === "blue" ? BLUE_RADIUS : RED_RADIUS);

class Grid {
  private cell: number;
  private n: number;
  private half: number;
  private heads: Int32Array;
  private next = new Int32Array(64);

  constructor(radius: number, cell: number) {
    this.cell = cell;
    this.half = radius + 1;
    this.n = Math.max(1, Math.ceil((2 * this.half) / cell));
    this.heads = new Int32Array(this.n * this.n);
  }

  private cellIndex(v: number) {
    return clamp(Math.floor((v + this.half) / this.cell), 0, this.n - 1);
  }

  build(blobs: Blob[], group: Group) {
    this.heads.fill(-1);
    if (this.next.length < blobs.length) this.next = new Int32Array(blobs.length * 2);
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];
      if (b.group !== group || b.action === "fade") continue;
      const c = this.cellIndex(b.z) * this.n + this.cellIndex(b.x);
      this.next[i] = this.heads[c];
      this.heads[c] = i;
    }
  }

  query(x: number, z: number, r: number, cb: (i: number) => void) {
    const x0 = this.cellIndex(x - r);
    const x1 = this.cellIndex(x + r);
    const z0 = this.cellIndex(z - r);
    const z1 = this.cellIndex(z + r);
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) {
        let i = this.heads[cz * this.n + cx];
        while (i !== -1) {
          cb(i);
          i = this.next[i];
        }
      }
    }
  }
}

export class Simulation {
  p: Params;
  readonly seed: number;
  readonly R: number;
  time = 0;
  trees: Tree[] = [];
  blobs: Blob[] = [];
  byId = new Map<number, Blob>();
  history: Sample[] = [];
  events: SimEvent[] = [];
  recordEvents = false;
  extinctAt: { blue: number | null; red: number | null } = { blue: null, red: null };
  peakBlue = 0;
  peakRed = 0;
  totals = zeroCounters();
  chases = 0;
  caughtWhile: Partial<Record<Action, number>> = {};

  private rng: Rng;
  private nextId = 1;
  private blueGrid: Grid;
  private redGrid: Grid;
  private counters = zeroCounters();
  private sampleClock = 0;
  private sampleStride = 1;
  private pendingStride = 0;
  private hadRemoval = false;

  constructor(params: Params) {
    this.p = { ...params };
    this.seed = params.seed;
    this.R = params.worldSize;
    this.rng = mulberry32((params.seed * 9973 + 12345) >>> 0);
    this.blueGrid = new Grid(this.R, 1.6);
    this.redGrid = new Grid(this.R, 1.6);
    this.setup();
  }

  setParams(p: Params) {
    this.p = p;
  }

  // ---------------------------------------------------------------- setup

  private randomInDisk(maxR: number) {
    const r = Math.sqrt(this.rng()) * maxR;
    const a = this.rng() * TAU;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r };
  }

  private setup() {
    const p = this.p;
    const maxR = this.R - 1.7;
    const n = Math.round(p.startTrees);
    let minDist = clamp(Math.sqrt((Math.PI * maxR * maxR) / Math.max(1, n)) * 0.78, 2.3, 5);
    for (let i = 0; i < n; i++) {
      let placed: { x: number; z: number } | null = null;
      for (let attempt = 0; attempt < 400 && !placed; attempt++) {
        if (attempt > 0 && attempt % 60 === 0) minDist *= 0.9;
        const c = this.randomInDisk(maxR);
        if (this.trees.every((t) => Math.hypot(t.x - c.x, t.z - c.z) >= minDist)) placed = c;
      }
      placed ??= this.randomInDisk(maxR);
      const slots: Slot[] = [];
      const twist = this.rng() * TAU;
      for (let s = 0; s < MAX_SLOTS; s++) {
        const active = s < p.fruitLimit;
        const ripe = active && this.rng() < 0.7;
        slots.push({
          state: active ? (ripe ? "ripe" : "growing") : "off",
          growth: ripe ? 1 : active ? this.rng() : 0,
          timer: 0,
          eater: -1,
          rate: 0.8 + this.rng() * 0.4,
          angle: twist + s * 2.39996,
          lift: ((s * 0.618034) % 1) * 0.8 + this.rng() * 0.2,
        });
      }
      this.trees.push({
        id: i,
        x: placed.x,
        z: placed.z,
        canopy: 0.95 + this.rng() * 0.35,
        height: 1.35 + this.rng() * 0.5,
        slots,
        ripe: slots.filter((s) => s.state === "ripe").length,
        claims: 0,
        lastEaten: -99,
        eatenTotal: 0,
        seed: Math.floor(this.rng() * 1e9),
      });
    }

    for (let i = 0; i < p.startBlue; i++) {
      const pos = this.freeSpot();
      this.spawn("blue", pos.x, pos.z, p.blueCopyAt * (0.35 + 0.35 * this.rng()), null);
    }
    for (let i = 0; i < p.startRed; i++) {
      const pos = this.freeSpot();
      this.spawn("red", pos.x, pos.z, p.redCopyAt * (0.35 + 0.35 * this.rng()), null);
    }
    this.record();
  }

  private freeSpot() {
    for (let attempt = 0; attempt < 30; attempt++) {
      const c = this.randomInDisk(this.R - 1);
      if (this.trees.every((t) => Math.hypot(t.x - c.x, t.z - c.z) > TRUNK_RADIUS + 0.6)) return c;
    }
    return this.randomInDisk(this.R - 1);
  }

  private spawn(group: Group, x: number, z: number, energy: number, parent: Blob | null): Blob {
    const drift = this.p.traitDrift;
    const mutate = (g: number) => clamp(g * (1 + gaussian(this.rng) * drift), 0.55, 1.8);
    const id = this.nextId++;
    const heading = this.rng() * TAU;
    const b: Blob = {
      id,
      group,
      name: blobName(id, this.seed),
      x,
      z,
      px: x,
      pz: z,
      heading,
      pheading: heading,
      speed: 0,
      energy,
      bornAt: this.time,
      action: "wander",
      actionTime: 0,
      actionDur: 0,
      decideIn: this.rng() * 0.4,
      wander: (this.rng() - 0.5) * 1.4,
      tx: 0,
      tz: 0,
      targetTree: -1,
      targetSlot: -1,
      targetBlob: -1,
      partner: -1,
      homeTree: -1,
      patience: 0,
      cooldown: parent ? 2 : this.rng() * 3,
      chasers: 0,
      focus: parent ? parent.focus : 0.7,
      speedGene: parent ? mutate(parent.speedGene) : 1,
      visionGene: parent ? mutate(parent.visionGene) : 1,
      generation: parent ? parent.generation + 1 : 0,
      parentId: parent ? parent.id : -1,
      parentName: parent ? parent.name : "",
      children: 0,
      fruitsEaten: 0,
      hugs: 0,
      lastEat: -99,
      lastHug: -99,
      fadeCause: null,
      diedAt: -1,
      dead: false,
    };
    this.blobs.push(b);
    this.byId.set(id, b);
    return b;
  }

  // ---------------------------------------------------------------- stepping

  advance(seconds: number) {
    const steps = Math.max(1, Math.round(seconds / DT));
    for (let i = 0; i < steps; i++) this.step();
  }

  step(dt = DT) {
    this.time += dt;
    this.updateFruit(dt);

    const blobs = this.blobs;
    this.blueGrid.build(blobs, "blue");
    this.redGrid.build(blobs, "red");

    for (const t of this.trees) t.claims = 0;
    for (const b of blobs) b.chasers = 0;
    for (const b of blobs) {
      if (b.group === "blue" && b.action === "seek" && b.targetTree >= 0) this.trees[b.targetTree].claims++;
      else if (b.group === "red" && b.action === "chase") {
        const t = this.byId.get(b.targetBlob);
        if (t) t.chasers++;
      }
    }

    const n = blobs.length;
    for (let i = 0; i < n; i++) {
      const b = blobs[i];
      b.px = b.x;
      b.pz = b.z;
      b.pheading = b.heading;
    }
    for (let i = 0; i < n; i++) {
      const b = blobs[i];
      if (b.dead) continue;
      if (b.group === "blue") this.updateBlue(b, dt);
      else this.updateRed(b, dt);
    }

    if (this.hadRemoval) {
      this.hadRemoval = false;
      this.blobs = blobs.filter((b) => {
        if (b.dead) this.byId.delete(b.id);
        return !b.dead;
      });
    }

    this.sampleClock += dt;
    if (this.sampleClock >= SAMPLE_EVERY - 1e-9) {
      this.sampleClock -= SAMPLE_EVERY;
      this.record();
    }
    if (this.events.length > 600) this.events.splice(0, this.events.length - 600);
  }

  private updateFruit(dt: number) {
    const limit = Math.round(this.p.fruitLimit);
    const g = this.p.fruitGrowth / BASE_RIPEN_SECONDS;
    for (const t of this.trees) {
      let ripe = 0;
      for (let s = 0; s < MAX_SLOTS; s++) {
        const slot = t.slots[s];
        if (s >= limit) {
          if (slot.state !== "eaten") slot.state = "off";
          continue;
        }
        switch (slot.state) {
          case "off":
            slot.state = "growing";
            slot.growth = 0;
            break;
          case "waiting":
            slot.timer -= dt;
            if (slot.timer <= 0) {
              slot.state = "growing";
              slot.growth = 0;
            }
            break;
          case "growing":
            slot.growth += g * slot.rate * dt;
            if (slot.growth >= 1) {
              slot.growth = 1;
              slot.state = "ripe";
            }
            break;
          default:
            break;
        }
        if (slot.state === "ripe") ripe++;
      }
      t.ripe = ripe;
    }
  }

  // ---------------------------------------------------------------- movement

  private steer(b: Blob, dx: number, dz: number, targetSpeed: number, turnRate: number, dt: number) {
    const r = Math.hypot(b.x, b.z);
    const edge = this.R - 2.2;
    if (r > edge && targetSpeed > 0) {
      const len = Math.hypot(dx, dz) || 1;
      const k = ((r - edge) / 2.2) * 1.6;
      dx = dx / len - (b.x / r) * k;
      dz = dz / len - (b.z / r) * k;
    }
    const len = Math.hypot(dx, dz);
    if (len > 1e-6) {
      const diff = wrapAngle(Math.atan2(dz, dx) - b.heading);
      const maxTurn = turnRate * dt;
      b.heading = wrapAngle(b.heading + clamp(diff, -maxTurn, maxTurn));
      if (Math.abs(diff) > 1.7) targetSpeed *= 0.45;
    }
    b.speed += (targetSpeed - b.speed) * Math.min(1, dt * 6);
    if (b.speed < 0.005) b.speed = 0;
    b.x += Math.cos(b.heading) * b.speed * dt;
    b.z += Math.sin(b.heading) * b.speed * dt;
    this.collide(b);
  }

  private collide(b: Blob) {
    const r0 = radiusOf(b);
    const push = (i: number) => {
      const o = this.blobs[i];
      if (o === b || o.dead || o.action === "fade" || o.id === b.partner) return;
      const dx = b.x - o.x;
      const dz = b.z - o.z;
      const min = r0 + radiusOf(o) + 0.04;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min || d2 < 1e-10) return;
      const d = Math.sqrt(d2);
      const k = ((min - d) / d) * 0.5;
      b.x += dx * k;
      b.z += dz * k;
    };
    this.blueGrid.query(b.x, b.z, 0.8, push);
    this.redGrid.query(b.x, b.z, 0.8, push);

    for (const t of this.trees) {
      const dx = b.x - t.x;
      const dz = b.z - t.z;
      const min = TRUNK_RADIUS + r0;
      const d2 = dx * dx + dz * dz;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 1e-3;
        b.x = t.x + (dx / d) * min;
        b.z = t.z + (dz / d) * min;
      }
    }

    const lim = this.R - r0 - 0.15;
    const r = Math.hypot(b.x, b.z);
    if (r > lim) {
      b.x *= lim / r;
      b.z *= lim / r;
    }
  }

  private face(b: Blob, x: number, z: number, dt: number) {
    const diff = wrapAngle(Math.atan2(z - b.z, x - b.x) - b.heading);
    b.heading = wrapAngle(b.heading + clamp(diff, -8 * dt, 8 * dt));
  }

  private burn(b: Blob, baseSpeed: number, use: number, dt: number) {
    const rel = baseSpeed > 0 ? b.speed / baseSpeed : 0;
    const f = IDLE_FRAC + (1 - IDLE_FRAC) * rel * rel;
    b.energy -= use * f * (0.85 + 0.15 * b.visionGene) * dt;
  }

  // ---------------------------------------------------------------- blue

  private updateBlue(b: Blob, dt: number) {
    const p = this.p;
    const base = p.blueSpeed * b.speedGene;
    if (b.cooldown > 0) b.cooldown -= dt;

    if (b.action === "fade") return this.tickFade(b, dt);

    if (!LOCKED.has(b.action)) {
      b.decideIn -= dt;
      if (b.decideIn <= 0) this.decideBlue(b);
    }

    let dx = 0;
    let dz = 0;
    let want = 0;
    let turn = 5;

    switch (b.action) {
      case "eat": {
        const tree = this.trees[b.targetTree];
        b.actionTime -= dt;
        if (tree) this.face(b, tree.x, tree.z, dt);
        if (b.actionTime <= 0) this.finishEat(b);
        break;
      }
      case "hugged": {
        const red = this.byId.get(b.partner);
        b.actionTime -= dt;
        if (red && !red.dead) this.face(b, red.x, red.z, dt);
        if (!red || red.dead || red.action !== "hug" || b.actionTime < -0.5) {
          b.partner = -1;
          b.action = "wander";
          b.decideIn = 0;
        }
        break;
      }
      case "bud":
        b.actionTime -= dt;
        if (b.actionTime <= 0) this.finishBud(b);
        break;
      case "startled":
        b.actionTime -= dt;
        dx = b.tx;
        dz = b.tz;
        want = base * 1.3;
        turn = 8;
        if (b.actionTime <= 0) {
          b.action = "wander";
          b.decideIn = 0;
        }
        break;
      case "flee":
        dx = b.tx;
        dz = b.tz;
        want = base * ECO.fleeBoost;
        turn = 8;
        break;
      case "crowd":
        b.actionTime -= dt;
        dx = b.tx;
        dz = b.tz;
        want = base * 0.7;
        if (b.actionTime <= 0) {
          b.action = "wander";
          b.decideIn = 0;
        }
        break;
      case "look":
        b.actionTime -= dt;
        b.heading = wrapAngle(b.heading + b.wander * 0.9 * dt);
        if (b.actionTime <= 0) b.decideIn = 0;
        break;
      case "seek": {
        const tree = this.trees[b.targetTree];
        b.patience -= dt;
        if (!tree || b.patience <= 0) {
          b.action = "wander";
          b.targetTree = -1;
          b.decideIn = 0;
          break;
        }
        const ox = b.x - tree.x;
        const oz = b.z - tree.z;
        const d = Math.hypot(ox, oz) || 1e-3;
        if (d <= tree.canopy + 0.45) {
          if (!this.startEat(b, tree)) {
            b.action = "wait";
            b.tx = b.x;
            b.tz = b.z;
            b.patience = 2 + this.rng() * 3;
            b.decideIn = 0.2;
          }
          break;
        }
        const stand = tree.canopy * 0.85;
        dx = tree.x + (ox / d) * stand - b.x;
        dz = tree.z + (oz / d) * stand - b.z;
        want = base;
        break;
      }
      case "wait": {
        b.patience -= dt;
        dx = b.tx - b.x;
        dz = b.tz - b.z;
        const d = Math.hypot(dx, dz);
        want = d > 0.3 ? base * 0.7 : 0;
        const tree = this.trees[b.homeTree];
        if (want === 0 && tree) this.face(b, tree.x, tree.z, dt * 0.3);
        if (b.patience <= 0) b.decideIn = 0;
        break;
      }
      default: {
        b.heading = wrapAngle(b.heading + b.wander * 0.8 * dt);
        dx = Math.cos(b.heading);
        dz = Math.sin(b.heading);
        want = base * 0.6;
      }
    }

    this.steer(b, dx, dz, want, turn, dt);
    this.burn(b, p.blueSpeed, p.blueEnergyUse, dt);

    if (b.energy <= 0) {
      b.energy = 0;
      this.startFade(b, "hunger");
      return;
    }
    if (
      b.energy >= p.blueCopyAt &&
      b.cooldown <= 0 &&
      (b.action === "wander" || b.action === "look" || b.action === "wait" || b.action === "seek")
    ) {
      this.startBud(b);
    }
  }

  private decideBlue(b: Blob) {
    const p = this.p;
    const rng = this.rng;
    const vision = p.blueVision * b.visionGene;
    b.decideIn = 0.3 + rng() * 0.15;

    const fear = vision * ECO.fearFraction;
    let ax = 0;
    let az = 0;
    let threats = 0;
    this.redGrid.query(b.x, b.z, fear, (i) => {
      const r = this.blobs[i];
      if (r.action === "rest" || r.action === "hug" || r.action === "bud" || r.action === "tired") return;
      const dx = b.x - r.x;
      const dz = b.z - r.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > fear * fear) return;
      const inv = 1 / (d2 + 0.05);
      ax += dx * inv;
      az += dz * inv;
      threats++;
    });
    if (threats > 0) {
      b.action = "flee";
      b.tx = ax;
      b.tz = az;
      b.targetTree = -1;
      b.decideIn = 0.18;
      return;
    }

    if (b.action === "wander" || b.action === "wait" || b.action === "look") {
      let cx = 0;
      let cz = 0;
      let crowd = 0;
      this.blueGrid.query(b.x, b.z, 1.4, (i) => {
        const o = this.blobs[i];
        if (o === b) return;
        const dx = o.x - b.x;
        const dz = o.z - b.z;
        if (dx * dx + dz * dz > 1.96) return;
        cx += o.x;
        cz += o.z;
        crowd++;
      });
      if (crowd >= 5) {
        b.action = "crowd";
        b.tx = b.x - cx / crowd;
        b.tz = b.z - cz / crowd;
        b.actionTime = 1 + rng() * 0.8;
        return;
      }
    }

    if (b.action === "seek" && b.targetTree >= 0) {
      const t = this.trees[b.targetTree];
      if (t.ripe - (t.claims - 1) > 0) return;
    }

    let best = -1;
    let bestScore = Infinity;
    for (const t of this.trees) {
      const d = Math.hypot(t.x - b.x, t.z - b.z) - t.canopy;
      if (d > vision) continue;
      const mine = b.action === "seek" && b.targetTree === t.id ? 1 : 0;
      const others = t.claims - mine;
      if (t.ripe - others <= 0) continue;
      const score = d + others * 0.9;
      if (score < bestScore) {
        bestScore = score;
        best = t.id;
      }
    }
    if (best >= 0) {
      if (!(b.action === "seek" && b.targetTree === best)) {
        this.trees[best].claims++;
        b.patience = 10;
      }
      b.action = "seek";
      b.targetTree = best;
      return;
    }
    b.targetTree = -1;

    if (b.action === "wait" && b.patience > 0) return;
    if (b.action === "wait") {
      b.action = "wander";
      if (rng() < 0.5) b.homeTree = -1;
    }

    if (b.homeTree >= 0 && rng() < 0.3) {
      const t = this.trees[b.homeTree];
      const a = rng() * TAU;
      const rr = t.canopy + 0.6 + rng() * 1.1;
      b.tx = t.x + Math.cos(a) * rr;
      b.tz = t.z + Math.sin(a) * rr;
      const lim = this.R - 0.8;
      const r = Math.hypot(b.tx, b.tz);
      if (r > lim) {
        b.tx *= lim / r;
        b.tz *= lim / r;
      }
      b.action = "wait";
      b.patience = 5 + rng() * 8;
      return;
    }

    if (b.action === "look" && b.actionTime > 0) return;
    if (rng() < 0.1) {
      b.action = "look";
      b.actionTime = 0.8 + rng() * 1.4;
      b.wander = (rng() - 0.5) * 2;
      return;
    }
    b.action = "wander";
    b.wander = clamp(b.wander + (rng() - 0.5) * 1.4, -1.3, 1.3);
  }

  private startEat(b: Blob, tree: Tree): boolean {
    const want = Math.atan2(b.z - tree.z, b.x - tree.x);
    let best = -1;
    let bestDiff = Infinity;
    const limit = Math.round(this.p.fruitLimit);
    for (let s = 0; s < limit; s++) {
      const slot = tree.slots[s];
      if (slot.state !== "ripe") continue;
      const diff = Math.abs(wrapAngle(slot.angle - want));
      if (diff < bestDiff) {
        bestDiff = diff;
        best = s;
      }
    }
    if (best < 0) return false;
    const slot = tree.slots[best];
    slot.state = "eaten";
    slot.eater = b.id;
    tree.ripe--;
    b.action = "eat";
    b.targetSlot = best;
    b.actionDur = b.actionTime = Math.max(0.2, this.p.blueEatTime);
    b.homeTree = tree.id;
    b.speed = 0;
    return true;
  }

  private finishEat(b: Blob) {
    const tree = this.trees[b.targetTree];
    const slot = tree?.slots[b.targetSlot];
    if (tree && slot && slot.eater === b.id) {
      slot.state = "waiting";
      slot.timer = this.p.fruitDelay;
      slot.growth = 0;
      slot.eater = -1;
      tree.lastEaten = this.time;
      tree.eatenTotal++;
      b.energy += FRUIT_ENERGY;
      b.fruitsEaten++;
      b.lastEat = this.time;
      this.counters.fruitEaten++;
      this.totals.fruitEaten++;
      if (this.recordEvents)
        this.events.push({ type: "eat", blob: b.id, tree: tree.id, slot: b.targetSlot, x: b.x, z: b.z });
    }
    b.targetSlot = -1;
    b.targetTree = -1;
    b.action = "wander";
    b.decideIn = 0;
  }

  private releaseSlot(b: Blob) {
    if (b.action !== "eat") return;
    const tree = this.trees[b.targetTree];
    const slot = tree?.slots[b.targetSlot];
    if (tree && slot && slot.eater === b.id) {
      slot.state = "ripe";
      slot.eater = -1;
      tree.ripe++;
    }
    b.targetSlot = -1;
    b.targetTree = -1;
  }

  // ---------------------------------------------------------------- red

  private updateRed(b: Blob, dt: number) {
    const p = this.p;
    const base = p.redSpeed * b.speedGene;
    if (b.cooldown > 0) b.cooldown -= dt;
    if (b.focus > 0) b.focus = Math.max(0, b.focus - dt / ECO.focusDecay);

    if (b.action === "fade") return this.tickFade(b, dt);

    if (!LOCKED.has(b.action)) {
      b.decideIn -= dt;
      if (b.decideIn <= 0) this.decideRed(b);
    }

    let dx = 0;
    let dz = 0;
    let want = 0;
    let turn = 5;

    switch (b.action) {
      case "hug": {
        const blue = this.byId.get(b.partner);
        b.actionTime -= dt;
        if (blue && !blue.dead) this.face(b, blue.x, blue.z, dt);
        if (b.actionTime <= 0) this.finishHug(b);
        break;
      }
      case "rest":
        b.actionTime -= dt;
        if (b.actionTime <= 0) {
          b.action = "wander";
          b.decideIn = 0;
        }
        break;
      case "bud":
        b.actionTime -= dt;
        if (b.actionTime <= 0) this.finishBud(b);
        break;
      case "lurk":
        b.actionTime -= dt;
        if (b.actionTime <= 0) b.decideIn = 0;
        break;
      case "tired":
        b.actionTime -= dt;
        if (b.actionTime <= 0) {
          b.action = "wander";
          b.decideIn = 0;
        }
        break;
      case "prowl":
        b.patience -= dt;
        dx = b.tx - b.x;
        dz = b.tz - b.z;
        want = base * 0.7;
        if (dx * dx + dz * dz < 0.25 || b.patience <= 0) b.decideIn = 0;
        break;
      case "chase": {
        const t = this.byId.get(b.targetBlob);
        const vision = this.visionOf(b);
        b.patience -= dt;
        if (b.patience <= 0) {
          b.action = "tired";
          b.actionDur = b.actionTime = ECO.tiredTime;
          b.targetBlob = -1;
          break;
        }
        if (!t || t.dead || t.action === "fade" || t.action === "hugged") {
          b.action = "wander";
          b.targetBlob = -1;
          b.decideIn = 0;
          dx = Math.cos(b.heading);
          dz = Math.sin(b.heading);
          want = base * 0.65;
          break;
        }
        const ox = t.x - b.x;
        const oz = t.z - b.z;
        const d = Math.hypot(ox, oz);
        if (d > vision * 1.25) {
          b.action = "wander";
          b.targetBlob = -1;
          b.decideIn = 0;
          break;
        }
        if (d <= RED_RADIUS + BLUE_RADIUS + 0.09) {
          this.startHug(b, t);
          break;
        }
        const lead = Math.min(d / (base * ECO.chaseBoost), 0.5);
        dx = ox + Math.cos(t.heading) * t.speed * lead;
        dz = oz + Math.sin(t.heading) * t.speed * lead;
        want = base * ECO.chaseBoost;
        turn = 6;
        break;
      }
      default: {
        b.heading = wrapAngle(b.heading + b.wander * 0.6 * dt);
        dx = Math.cos(b.heading);
        dz = Math.sin(b.heading);
        want = base * 0.65;
      }
    }

    this.steer(b, dx, dz, want, turn, dt);
    this.burn(b, p.redSpeed, p.redEnergyUse, dt);

    if (b.energy <= 0) {
      b.energy = 0;
      this.startFade(b, "hunger");
      return;
    }
    if (b.energy > p.redCopyAt * ECO.redEnergyCap) b.energy = p.redCopyAt * ECO.redEnergyCap;
    if (
      b.energy >= p.redCopyAt &&
      b.cooldown <= 0 &&
      (b.action === "wander" || b.action === "lurk" || b.action === "chase" || b.action === "prowl")
    ) {
      if (this.hasRoom(b)) this.startBud(b);
      else b.cooldown = 2;
    }
  }

  private hasRoom(b: Blob) {
    let near = 0;
    this.redGrid.query(b.x, b.z, ECO.redRoom, (i) => {
      const o = this.blobs[i];
      if (o === b) return;
      const dx = o.x - b.x;
      const dz = o.z - b.z;
      if (dx * dx + dz * dz <= ECO.redRoom * ECO.redRoom) near++;
    });
    return near <= ECO.redRoomMax;
  }

  private decideRed(b: Blob) {
    const p = this.p;
    const rng = this.rng;
    const vision = this.visionOf(b);
    b.decideIn = 0.25 + rng() * 0.15;

    let best: Blob | null = null;
    let bestScore = Infinity;
    const full = b.energy >= p.redCopyAt;
    if (!full) this.blueGrid.query(b.x, b.z, vision, (i) => {
      const t = this.blobs[i];
      if (t.action === "hugged" || t.dead) return;
      const dx = t.x - b.x;
      const dz = t.z - b.z;
      const d2 = dx * dx + dz * dz;
      const reach = vision * this.shade(t);
      if (d2 > reach * reach) return;
      const others = t.chasers - (t.id === b.targetBlob && b.action === "chase" ? 1 : 0);
      const score = Math.sqrt(d2) + others * 3;
      if (score < bestScore) {
        bestScore = score;
        best = t;
      }
    });
    if (best) {
      const t = best as Blob;
      if (b.action !== "chase") {
        b.patience = ECO.chaseLimit;
        this.chases++;
      }
      if (!(b.action === "chase" && b.targetBlob === t.id)) t.chasers++;
      b.action = "chase";
      b.targetBlob = t.id;
      return;
    }
    b.targetBlob = -1;
    if (b.action === "lurk" && b.actionTime > 0) return;
    if (b.action === "prowl") {
      const t = this.trees[b.targetTree];
      if (t && Math.hypot(b.tx - b.x, b.tz - b.z) > 0.5 && b.patience > 0) return;
      b.targetTree = -1;
      b.action = "lurk";
      b.actionTime = 1.5 + rng() * 2;
      return;
    }
    if (this.trees.length && rng() < ECO.prowlChance) {
      let best = -1;
      let bestD = Infinity;
      for (let k = 0; k < 3; k++) {
        const t = this.trees[Math.floor(rng() * this.trees.length)];
        const d = Math.hypot(t.x - b.x, t.z - b.z);
        if (d < bestD) {
          bestD = d;
          best = t.id;
        }
      }
      const t = this.trees[best];
      const a = rng() * TAU;
      const rr = t.canopy + 1 + rng() * 1.2;
      b.tx = t.x + Math.cos(a) * rr;
      b.tz = t.z + Math.sin(a) * rr;
      const lim = this.R - 0.8;
      const r = Math.hypot(b.tx, b.tz);
      if (r > lim) {
        b.tx *= lim / r;
        b.tz *= lim / r;
      }
      b.targetTree = best;
      b.patience = 12;
      b.action = "prowl";
      return;
    }
    const hungry = b.energy < p.redCopyAt * ECO.hungryFraction;
    if (rng() < (hungry ? 0.08 + ECO.hungryLurk : 0.08)) {
      b.action = "lurk";
      b.actionTime = hungry ? 2 + rng() * 4 : 1 + rng() * 2;
      return;
    }
    b.action = "wander";
    let ax = 0;
    let az = 0;
    this.redGrid.query(b.x, b.z, ECO.redSpacing, (i) => {
      const o = this.blobs[i];
      if (o === b) return;
      const dx = b.x - o.x;
      const dz = b.z - o.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > ECO.redSpacing * ECO.redSpacing) return;
      ax += dx / (d2 + 0.1);
      az += dz / (d2 + 0.1);
    });
    if (ax !== 0 || az !== 0) {
      const diff = wrapAngle(Math.atan2(az, ax) - b.heading);
      b.wander = clamp(diff * 1.5, -1.8, 1.8);
    } else {
      b.wander = clamp(b.wander + (rng() - 0.5) * 1.0, -1, 1);
    }
  }

  /** Sensing radius right now, including a red's fading search image. */
  visionOf(b: Blob) {
    if (b.group === "blue") return this.p.blueVision * b.visionGene;
    return this.p.redVision * b.visionGene * (1 - ECO.searchImage * (1 - b.focus));
  }

  /** 1 = fully visible to reds; lower values mean the blue is tucked into a tree's shade. */
  shade(b: Blob) {
    if (b.action === "eat") return ECO.shadeEating;
    if (b.action !== "wait") return 1;
    const t = this.trees[b.homeTree];
    return t && Math.hypot(t.x - b.x, t.z - b.z) < t.canopy + 0.8 ? ECO.shadeWaiting : 1;
  }

  private startHug(r: Blob, b: Blob) {
    this.caughtWhile[b.action] = (this.caughtWhile[b.action] ?? 0) + 1;
    this.releaseSlot(b);
    r.action = "hug";
    r.actionDur = r.actionTime = HUG_TIME;
    r.partner = b.id;
    r.targetBlob = -1;
    r.speed = 0;
    b.action = "hugged";
    b.actionDur = b.actionTime = HUG_TIME;
    b.partner = r.id;
    b.targetTree = -1;
    b.speed = 0;
    if (this.recordEvents) this.events.push({ type: "hugStart", red: r.id, blue: b.id, x: r.x, z: r.z });
  }

  private finishHug(r: Blob) {
    const b = this.byId.get(r.partner);
    r.partner = -1;
    if (b && !b.dead && b.action === "hugged" && b.partner === r.id) {
      const amount = Math.min(this.p.redContact, Math.max(0, b.energy));
      b.energy -= amount;
      r.energy += amount;
      r.hugs++;
      r.lastHug = this.time;
      r.focus = Math.min(1, r.focus + ECO.focusGain);
      b.partner = -1;
      this.counters.hugs++;
      this.totals.hugs++;
      const faded = b.energy < FADE_BELOW;
      if (faded) this.startFade(b, "hug");
      else {
        b.action = "startled";
        b.actionTime = 1.3;
        b.tx = b.x - r.x;
        b.tz = b.z - r.z;
      }
      if (this.recordEvents)
        this.events.push({ type: "hug", red: r.id, blue: b.id, amount, faded, x: r.x, z: r.z, bx: b.x, bz: b.z });
    }
    if (this.p.redPauseTime > 0.01) {
      r.action = "rest";
      r.actionDur = r.actionTime = this.p.redPauseTime;
    } else {
      r.action = "wander";
      r.decideIn = 0;
    }
  }

  // ---------------------------------------------------------------- shared

  private startBud(b: Blob) {
    if (this.blobs.length >= MAX_BLOBS) {
      b.cooldown = 3;
      return;
    }
    b.targetTree = -1;
    b.targetBlob = -1;
    b.action = "bud";
    b.actionDur = b.actionTime = BUD_TIME;
    b.speed = 0;
  }

  private finishBud(b: Blob) {
    b.action = "wander";
    b.decideIn = 0;
    b.cooldown = 1.5;
    if (this.blobs.length >= MAX_BLOBS) return;
    const share = (b.energy * (1 - BIRTH_COST)) / 2;
    b.energy = share;
    const a = b.heading + Math.PI * (0.6 + this.rng() * 0.8);
    const r = radiusOf(b) * 2.3;
    const child = this.spawn(b.group, b.x + Math.cos(a) * r, b.z + Math.sin(a) * r, share, b);
    child.heading = a;
    child.pheading = a;
    this.collide(child);
    child.px = child.x;
    child.pz = child.z;
    b.children++;
    if (b.group === "blue") {
      this.counters.blueBirths++;
      this.totals.blueBirths++;
    } else {
      this.counters.redBirths++;
      this.totals.redBirths++;
    }
    if (this.recordEvents)
      this.events.push({ type: "birth", parent: b.id, child: child.id, group: b.group, x: child.x, z: child.z });
  }

  private startFade(b: Blob, cause: "hunger" | "hug") {
    this.releaseSlot(b);
    if (b.action === "hug") {
      const partner = this.byId.get(b.partner);
      if (partner && partner.action === "hugged") {
        partner.action = "startled";
        partner.actionTime = 1;
        partner.partner = -1;
        partner.tx = partner.x - b.x;
        partner.tz = partner.z - b.z;
      }
    }
    b.partner = -1;
    b.targetTree = -1;
    b.targetBlob = -1;
    b.action = "fade";
    b.actionDur = b.actionTime = FADE_TIME;
    b.fadeCause = cause;
    b.diedAt = this.time;
    if (b.group === "blue") {
      if (cause === "hug") {
        this.counters.blueHugFades++;
        this.totals.blueHugFades++;
      } else {
        this.counters.blueHungerFades++;
        this.totals.blueHungerFades++;
      }
    } else {
      this.counters.redHungerFades++;
      this.totals.redHungerFades++;
    }
    if (this.recordEvents) this.events.push({ type: "fade", blob: b.id, group: b.group, cause, x: b.x, z: b.z });
  }

  private tickFade(b: Blob, dt: number) {
    b.actionTime -= dt;
    b.speed *= 0.85;
    if (b.actionTime <= 0) {
      b.dead = true;
      this.hadRemoval = true;
    }
  }

  // ---------------------------------------------------------------- history

  counts() {
    let blue = 0;
    let red = 0;
    for (const b of this.blobs) {
      if (b.action === "fade" || b.dead) continue;
      if (b.group === "blue") blue++;
      else red++;
    }
    return { blue, red };
  }

  ripeFruit() {
    let n = 0;
    for (const t of this.trees) n += t.ripe;
    return n;
  }

  fruitCapacity() {
    return this.trees.length * Math.round(this.p.fruitLimit);
  }

  private record() {
    let blue = 0;
    let red = 0;
    let be = 0;
    let re = 0;
    let bs = 0;
    let bv = 0;
    let rs = 0;
    let rv = 0;
    for (const b of this.blobs) {
      if (b.action === "fade" || b.dead) continue;
      if (b.group === "blue") {
        blue++;
        be += b.energy;
        bs += b.speedGene;
        bv += b.visionGene;
      } else {
        red++;
        re += b.energy;
        rs += b.speedGene;
        rv += b.visionGene;
      }
    }
    const last = this.history[this.history.length - 1];
    const s: Sample = {
      t: Math.round(this.time * 1000) / 1000,
      fruit: this.ripeFruit(),
      blue,
      red,
      blueEnergy: blue ? be / blue : 0,
      redEnergy: red ? re / red : 0,
      blueSpeedGene: blue ? bs / blue : (last?.blueSpeedGene ?? 1),
      blueVisionGene: blue ? bv / blue : (last?.blueVisionGene ?? 1),
      redSpeedGene: red ? rs / red : (last?.redSpeedGene ?? 1),
      redVisionGene: red ? rv / red : (last?.redVisionGene ?? 1),
      ...this.counters,
    };
    this.counters = zeroCounters();

    if (blue > this.peakBlue) this.peakBlue = blue;
    if (red > this.peakRed) this.peakRed = red;
    if (last) {
      if (blue === 0 && last.blue > 0 && this.extinctAt.blue === null) this.extinctAt.blue = s.t;
      if (red === 0 && last.red > 0 && this.extinctAt.red === null) this.extinctAt.red = s.t;
    }

    if (this.sampleStride > 1 && last) {
      this.pendingStride++;
      if (this.pendingStride < this.sampleStride) {
        last.blueBirths += s.blueBirths;
        last.redBirths += s.redBirths;
        last.blueHugFades += s.blueHugFades;
        last.blueHungerFades += s.blueHungerFades;
        last.redHungerFades += s.redHungerFades;
        last.fruitEaten += s.fruitEaten;
        last.hugs += s.hugs;
        return;
      }
      this.pendingStride = 0;
    }
    this.history.push(s);

    if (this.history.length > MAX_HISTORY) {
      const merged: Sample[] = [];
      for (let i = 0; i < this.history.length; i += 2) {
        const a = this.history[i];
        const b = this.history[i + 1];
        if (b) {
          a.blueBirths += b.blueBirths;
          a.redBirths += b.redBirths;
          a.blueHugFades += b.blueHugFades;
          a.blueHungerFades += b.blueHungerFades;
          a.redHungerFades += b.redHungerFades;
          a.fruitEaten += b.fruitEaten;
          a.hugs += b.hugs;
        }
        merged.push(a);
      }
      this.history = merged;
      this.sampleStride *= 2;
    }
  }
}
