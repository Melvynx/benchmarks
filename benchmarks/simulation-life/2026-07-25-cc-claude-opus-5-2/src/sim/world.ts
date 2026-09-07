import { Rng } from "./rng";
import type { Params } from "./params";
import type {
  Action,
  Blob,
  HistorySample,
  SimEvent,
  Species,
  Tree,
} from "./types";

/** Fixed simulation timestep. Everything below is expressed in sim-seconds. */
export const DT = 1 / 30;

const FRUIT_ENERGY = 26;
const BLUE_MAX_ENERGY = 100;
const RED_MAX_ENERGY = 110;
const CONTACT_RADIUS = 1.25;
const FLEE_BOOST = 1.2;
/**
 * Blues notice fruit far away but only startle at *nearby* reds. Keeping the
 * fear radius well under the vision radius is what makes chases finite: a red
 * closes most of the gap before the blue reacts.
 */
const FEAR_FRACTION = 0.6;
/** Only part of the energy a red takes actually sticks, so reds stay rare. */
const CONTACT_EFFICIENCY = 0.8;
/** Fraction of the reproduction cost that actually reaches the child. */
const BIRTH_YIELD = 0.66;
const REPRO_COOLDOWN = 8;
/**
 * Blobs must grow up before they can copy themselves. This caps how fast a
 * group can expand no matter how much food it finds, which is what keeps a
 * boom from overshooting the garden and starving everyone at once.
 */
const MATURITY = { blue: 15, red: 20 };
/**
 * Blues tuck under a canopy to escape reds, but each tree only hides so many.
 * Shelter therefore saturates: a small blue group is almost entirely safe, a
 * large one leaves plenty of blobs in the open. That density dependence is what
 * stops either group from wiping the other out.
 */
const SHELTER_CAP = 2;
const POP_CAP = 300;
const SAMPLE_EVERY = 0.5;
const REF_SPEED = 3.2;
const GRID_CELL = 4;

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Uniform bucket grid, rebuilt each step, for cheap "who is near me" queries. */
class Grid {
  private cells = new Map<number, number[]>();
  private cols = 1;

  constructor(private size: number) {}

  build(blobs: Blob[], species: Species) {
    this.cells.clear();
    this.cols = Math.ceil((this.size * 2) / GRID_CELL) + 2;
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i];
      if (b.species !== species) continue;
      const key = this.key(b.x, b.y);
      const bucket = this.cells.get(key);
      if (bucket) bucket.push(i);
      else this.cells.set(key, [i]);
    }
  }

  private key(x: number, y: number) {
    const cx = Math.floor((x + this.size) / GRID_CELL);
    const cy = Math.floor((y + this.size) / GRID_CELL);
    return cy * this.cols + cx;
  }

  /** Calls `visit` for every candidate index within `radius` of (x, y). */
  around(x: number, y: number, radius: number, visit: (i: number) => void) {
    const span = Math.ceil(radius / GRID_CELL);
    const cx = Math.floor((x + this.size) / GRID_CELL);
    const cy = Math.floor((y + this.size) / GRID_CELL);
    for (let dy = -span; dy <= span; dy++) {
      for (let dx = -span; dx <= span; dx++) {
        const bucket = this.cells.get((cy + dy) * this.cols + (cx + dx));
        if (!bucket) continue;
        for (let k = 0; k < bucket.length; k++) visit(bucket[k]);
      }
    }
  }
}

export interface RunStats {
  peakBlue: number;
  peakRed: number;
  peakFruit: number;
  blueBirths: number;
  redBirths: number;
  blueDeaths: number;
  redDeaths: number;
  blueStarved: number;
  blueTaken: number;
  blueAged: number;
  redStarved: number;
  redAged: number;
  contacts: number;
  giveUps: number;
  meals: number;
  blueExtinctAt: number | null;
  redExtinctAt: number | null;
  maxGeneration: number;
}

export class World {
  params: Params;
  blobs: Blob[] = [];
  trees: Tree[] = [];
  time = 0;
  events: SimEvent[] = [];
  history: HistorySample[] = [];
  stats: RunStats = emptyStats();
  radius: number;

  private rng: Rng;
  private nextId = 1;
  private sampleClock = 0;
  private windowBirths = 0;
  private windowDeaths = 0;
  private blueGrid = new Grid(60);
  private redGrid = new Grid(60);

  constructor(params: Params) {
    this.params = { ...params };
    this.radius = params.worldSize;
    this.rng = new Rng(params.seed);
    this.build();
  }

  /** Rebuilds trees and starting population from the current params + seed. */
  reset(params?: Params) {
    if (params) this.params = { ...params };
    this.radius = this.params.worldSize;
    this.rng = new Rng(this.params.seed);
    this.blobs = [];
    this.trees = [];
    this.time = 0;
    this.nextId = 1;
    this.sampleClock = 0;
    this.windowBirths = 0;
    this.windowDeaths = 0;
    this.events = [];
    this.history = [];
    this.stats = emptyStats();
    this.build();
  }

  private build() {
    const p = this.params;
    this.blueGrid = new Grid(this.radius + 4);
    this.redGrid = new Grid(this.radius + 4);

    // Trees: rejection-sampled so canopies keep a little breathing room.
    const minGap = Math.max(3.4, this.radius / Math.sqrt(p.trees + 1) * 0.9);
    for (let i = 0; i < p.trees; i++) {
      let placed = false;
      for (let attempt = 0; attempt < 90 && !placed; attempt++) {
        const a = this.rng.next() * Math.PI * 2;
        const r = Math.sqrt(this.rng.next()) * (this.radius - 3.5);
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        const gap = attempt < 60 ? minGap : minGap * 0.55;
        if (this.trees.some((t) => Math.hypot(t.x - x, t.y - y) < gap)) continue;
        this.trees.push({
          id: i,
          x,
          y,
          fruit: Math.max(1, Math.round(p.fruitLimit * this.rng.range(0.4, 1))),
          grow: this.rng.next(),
          delay: 0,
          claimed: 0,
          shelter: 0,
          scale: this.rng.range(0.82, 1.25),
          kind: this.rng.int(3),
          seedAngle: this.rng.next() * Math.PI * 2,
          pop: 0,
        });
        placed = true;
      }
    }

    for (let i = 0; i < p.blueStart; i++) this.spawn("blue", null);
    for (let i = 0; i < p.redStart; i++) this.spawn("red", null);
    this.sample();
  }

  private spawn(species: Species, parent: Blob | null): Blob {
    const rng = this.rng;
    const isBlue = species === "blue";
    let x: number;
    let y: number;
    if (parent) {
      const a = rng.next() * Math.PI * 2;
      const d = rng.range(0.8, 1.8);
      x = clamp(parent.x + Math.cos(a) * d, -this.radius + 1, this.radius - 1);
      y = clamp(parent.y + Math.sin(a) * d, -this.radius + 1, this.radius - 1);
    } else {
      const a = rng.next() * Math.PI * 2;
      const r = Math.sqrt(rng.next()) * (this.radius - 2);
      x = Math.cos(a) * r;
      y = Math.sin(a) * r;
    }

    const speedT = parent
      ? clamp(parent.traits.speed + rng.normal() * 0.05, 0.6, 1.6)
      : clamp(1 + rng.normal() * 0.09, 0.7, 1.35);
    const visionT = parent
      ? clamp(parent.traits.vision + rng.normal() * 0.05, 0.6, 1.6)
      : clamp(1 + rng.normal() * 0.09, 0.7, 1.35);

    const maxEnergy = isBlue ? BLUE_MAX_ENERGY : RED_MAX_ENERGY;
    const blob: Blob = {
      id: this.nextId++,
      species,
      x,
      y,
      vx: 0,
      vy: 0,
      heading: rng.next() * Math.PI * 2,
      energy: parent
        ? 0
        : maxEnergy * (isBlue ? rng.range(0.5, 0.8) : rng.range(0.55, 0.85)),
      maxEnergy,
      age: 0,
      maxAge: (isBlue ? 240 : 280) * rng.range(0.82, 1.18),
      action: "wander",
      timer: 0,
      timerTotal: 0,
      targetTree: -1,
      targetBlob: -1,
      reproCooldown: parent ? REPRO_COOLDOWN : rng.range(0, 3),
      chase: 0,
      patience: rng.range(2.6, 4.4),
      ignoreId: -1,
      ignoreTime: 0,
      traits: {
        speed: speedT,
        vision: visionT,
        // Faster, sharper-eyed blobs pay for it every second they live.
        metabolism: clamp(0.55 + 0.29 * speedT + 0.16 * visionT, 0.5, 1.6),
      },
      generation: parent ? parent.generation + 1 : 0,
      parent: parent ? parent.id : 0,
      children: 0,
      meals: 0,
      hidden: false,
      takenByRed: false,
      bounce: rng.next() * Math.PI * 2,
      blink: rng.range(1, 5),
      glow: 0,
      squash: 0,
    };
    this.blobs.push(blob);
    if (blob.generation > this.stats.maxGeneration)
      this.stats.maxGeneration = blob.generation;
    return blob;
  }

  private emit(type: SimEvent["type"], b: { x: number; y: number; species: Species; id: number }) {
    if (this.events.length > 400) return;
    this.events.push({ type, x: b.x, y: b.y, species: b.species, id: b.id });
  }

  step() {
    const p = this.params;
    this.time += DT;

    this.growFruit();

    this.blueGrid.build(this.blobs, "blue");
    this.redGrid.build(this.blobs, "red");

    // One-frame-old claim counts: blues spread across trees instead of piling up.
    for (const t of this.trees) t.claimed = 0;
    for (const b of this.blobs) {
      if (b.species === "blue" && b.targetTree >= 0) {
        const t = this.trees[b.targetTree];
        if (t) t.claimed++;
      }
    }

    this.assignShelter();

    let blueCount = 0;
    let redCount = 0;
    for (const b of this.blobs) (b.species === "blue" ? blueCount++ : redCount++);

    for (const b of this.blobs) {
      b.age += DT;
      b.bounce += DT * (4 + Math.hypot(b.vx, b.vy) * 1.1);
      b.blink -= DT;
      b.glow = Math.max(0, b.glow - DT * 1.6);
      b.squash *= 1 - Math.min(1, DT * 5);
      if (b.reproCooldown > 0) b.reproCooldown -= DT;
      if (b.blink <= -0.16) b.blink = 2.2 + this.rng.next() * 4.5;

      if (b.species === "blue") this.updateBlue(b);
      else this.updateRed(b);

      this.burnEnergy(b);
    }

    // Reproduction runs after movement so newborns start clean next step.
    const total = this.blobs.length;
    for (let i = 0; i < total; i++) {
      const b = this.blobs[i];
      if (b.energy <= 0 || b.timer > 0 || b.reproCooldown > 0) continue;
      const isBlue = b.species === "blue";
      if (b.age < (isBlue ? MATURITY.blue : MATURITY.red)) continue;
      const threshold = isBlue ? p.blueRepro : p.redRepro;
      const cap = isBlue ? blueCount : redCount;
      if (b.energy < threshold || cap >= POP_CAP) continue;
      const cost = threshold * 0.5;
      b.energy -= cost;
      b.reproCooldown = REPRO_COOLDOWN;
      const child = this.spawn(b.species, b);
      child.energy = cost * BIRTH_YIELD;
      b.children++;
      if (isBlue) {
        blueCount++;
        this.stats.blueBirths++;
      } else {
        redCount++;
        this.stats.redBirths++;
      }
      this.windowBirths++;
      this.emit("birth", child);
    }

    this.reap();

    this.sampleClock += DT;
    if (this.sampleClock >= SAMPLE_EVERY) {
      this.sampleClock -= SAMPLE_EVERY;
      this.sample();
    }
  }

  private growFruit() {
    const p = this.params;
    const limit = Math.round(p.fruitLimit);
    for (const t of this.trees) {
      if (t.pop > 0) t.pop = Math.max(0, t.pop - DT * 2.2);
      if (t.fruit >= limit) {
        t.fruit = Math.min(t.fruit, limit);
        t.grow = 0;
        continue;
      }
      if (t.delay > 0) {
        t.delay -= DT;
        continue;
      }
      t.grow += p.fruitGrowth * DT;
      while (t.grow >= 1 && t.fruit < limit) {
        t.grow -= 1;
        t.fruit++;
      }
    }
  }

  /**
   * Marks which blues are tucked under a canopy this step. Shelter is handed
   * out nearest-first and capped per tree, so once the blue group outgrows the
   * available cover the extras are left in the open.
   */
  private assignShelter() {
    for (const t of this.trees) t.shelter = 0;

    const claims: { blob: Blob; tree: Tree; d: number }[] = [];
    for (const b of this.blobs) {
      if (b.species !== "blue") {
        b.hidden = false;
        continue;
      }
      b.hidden = false;
      let best: Tree | null = null;
      let bestD = Infinity;
      for (const t of this.trees) {
        const r = 1.4 + t.scale * 1.1;
        const d = Math.hypot(t.x - b.x, t.y - b.y);
        if (d < r && d < bestD) {
          bestD = d;
          best = t;
        }
      }
      if (best) claims.push({ blob: b, tree: best, d: bestD });
    }

    claims.sort((a, c) => a.d - c.d);
    for (const claim of claims) {
      if (claim.tree.shelter >= SHELTER_CAP) continue;
      claim.tree.shelter++;
      claim.blob.hidden = true;
    }
  }

  /** The canopy a blob is standing under, if any. */
  private nearestCanopy(b: Blob): Tree | null {
    let best: Tree | null = null;
    let bestD = Infinity;
    for (const t of this.trees) {
      const r = 1.4 + t.scale * 1.1;
      const d = Math.hypot(t.x - b.x, t.y - b.y);
      if (d < r && d < bestD) {
        bestD = d;
        best = t;
      }
    }
    return best;
  }

  /** Nearest tree with a free hiding spot that is not behind the threat. */
  private findCover(b: Blob, range: number, threat: Blob): Tree | null {
    let best: Tree | null = null;
    let bestScore = Infinity;
    for (const t of this.trees) {
      if (t.shelter >= SHELTER_CAP) continue;
      const d = Math.hypot(t.x - b.x, t.y - b.y);
      if (d > range) continue;
      // Running past the red to reach a tree is worse than running to a farther one.
      const toThreat = Math.hypot(t.x - threat.x, t.y - threat.y);
      const score = d + Math.max(0, 8 - toThreat) * 2.5;
      if (score < bestScore) {
        bestScore = score;
        best = t;
      }
    }
    return best;
  }

  private startEating(b: Blob, t: Tree) {
    const p = this.params;
    t.fruit--;
    t.delay = p.fruitReturnDelay;
    t.grow = 0;
    t.pop = 1;
    b.timer = p.blueEatTime;
    b.timerTotal = p.blueEatTime;
    b.action = "eat";
    b.squash = 0.3;
    b.targetTree = t.id;
    this.drift(b, 0, 0, 0);
    this.emit("eat", { x: t.x, y: t.y, species: "blue", id: b.id });
  }

  private updateBlue(b: Blob) {
    const p = this.params;
    const speed = p.blueSpeed * b.traits.speed;
    const vision = p.blueVision * b.traits.vision;

    if (b.timer > 0) {
      b.timer -= DT;
      this.drift(b, 0, 0, 0);
      if (b.timer <= 0) {
        b.timer = 0;
        b.energy = Math.min(b.maxEnergy, b.energy + FRUIT_ENERGY);
        b.meals++;
        b.glow = 1;
        b.squash = 0.45;
        b.action = "wander";
        b.targetTree = -1;
        this.stats.meals++;
      }
      return;
    }

    // 1. Danger first — but a starving blob accepts more risk than a full one.
    const fullness = b.energy / b.maxEnergy;
    const fear = vision * FEAR_FRACTION * (0.45 + 0.55 * fullness);
    let threat: Blob | null = null;
    let threatDist = Infinity;
    this.redGrid.around(b.x, b.y, vision, (i) => {
      const r = this.blobs[i];
      const d = Math.hypot(r.x - b.x, r.y - b.y);
      if (d < threatDist && d <= vision) {
        threatDist = d;
        threat = r;
      }
    });
    if (threat && threatDist <= fear) {
      const t = threat as Blob;

      // Already under cover: sit tight, and pick at this tree while waiting.
      if (b.hidden) {
        const canopy = this.nearestCanopy(b);
        if (canopy && canopy.fruit > 0 && fullness < 0.86) {
          this.startEating(b, canopy);
        } else {
          b.action = "hide";
          b.targetTree = -1;
          this.drift(b, 0, 0, 0);
        }
        return;
      }

      const ax = b.x - t.x;
      const ay = b.y - t.y;
      const alen = Math.hypot(ax, ay) || 1;
      let dx = ax / alen;
      let dy = ay / alen;

      // Break for the nearest canopy that still has room under it.
      const cover = this.findCover(b, vision * 1.5, t);
      if (cover) {
        const cx = cover.x - b.x;
        const cy = cover.y - b.y;
        const clen = Math.hypot(cx, cy) || 1;
        dx = dx * 0.4 + cx / clen;
        dy = dy * 0.4 + cy / clen;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
      }

      b.action = "flee";
      b.targetTree = -1;
      this.drift(b, dx, dy, speed * FLEE_BOOST);
      return;
    }

    // 2. Hungry blobs head for the least contested tree that still has fruit.
    if (fullness < 0.86) {
      const reach = vision * 1.7;
      const danger = threat as Blob | null;

      // Stick with the tree already chosen. Re-picking every step makes blobs
      // thrash between groves and starve within arm's reach of fruit.
      let best: Tree | null = null;
      if (b.targetTree >= 0) {
        const cur = this.trees[b.targetTree];
        if (
          cur &&
          cur.fruit > 0 &&
          Math.hypot(cur.x - b.x, cur.y - b.y) <= reach * 1.5
        )
          best = cur;
        else b.targetTree = -1;
      }

      if (!best) {
        let bestScore = Infinity;
        for (const t of this.trees) {
          if (t.fruit <= 0) continue;
          const d = Math.hypot(t.x - b.x, t.y - b.y);
          if (d > reach) continue;
          // `claimed` never counts this blob: it has no target right now.
          let score = d + t.claimed * 2.4 - t.fruit * 0.55;
          if (danger) {
            // Groves with a red blob loitering in them look less appealing.
            const dd = Math.hypot(t.x - danger.x, t.y - danger.y);
            if (dd < vision) score += (vision - dd) * 1.6;
          }
          if (score < bestScore) {
            bestScore = score;
            best = t;
          }
        }
      }

      if (best) {
        const t = best;
        const dx = t.x - b.x;
        const dy = t.y - b.y;
        const d = Math.hypot(dx, dy) || 1;
        const eatRadius = 1.5 + t.scale * 1.1;
        b.targetTree = t.id;
        if (d < eatRadius && t.fruit > 0) {
          this.startEating(b, t);
        } else {
          b.action = "seek-fruit";
          this.drift(b, dx / d, dy / d, speed);
        }
        return;
      }
      b.targetTree = -1;
    } else {
      b.targetTree = -1;
    }

    // 3. Well fed but packed in: spread out.
    let nx = 0;
    let ny = 0;
    let crowd = 0;
    this.blueGrid.around(b.x, b.y, 3.6, (i) => {
      const o = this.blobs[i];
      if (o === b) return;
      const dx = b.x - o.x;
      const dy = b.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d > 3.6 || d < 0.0001) return;
      crowd++;
      nx += dx / d / d;
      ny += dy / d / d;
    });
    if (crowd >= 4) {
      const len = Math.hypot(nx, ny) || 1;
      b.action = "crowded";
      this.drift(b, nx / len, ny / len, speed * 0.85);
      return;
    }

    // Hungry with no fruit in reach: rest and save what is left.
    if (
      b.energy < b.maxEnergy * 0.35 &&
      b.targetTree < 0 &&
      this.rng.next() < 0.6 * DT
    ) {
      b.timer = 0;
      b.action = "rest";
      this.drift(b, 0, 0, 0);
      return;
    }

    b.action = "wander";
    this.wander(b, speed * 0.65, crowd > 0 ? nx : 0, crowd > 0 ? ny : 0);
  }

  private updateRed(b: Blob) {
    const p = this.params;
    const speed = p.redSpeed * b.traits.speed;
    const vision = p.redVision * b.traits.vision;

    if (b.timer > 0) {
      b.timer -= DT;
      b.action = "rest";
      this.drift(b, 0, 0, 0);
      if (b.timer <= 0) {
        b.timer = 0;
        b.action = "wander";
      }
      return;
    }

    if (b.ignoreTime > 0) {
      b.ignoreTime -= DT;
      if (b.ignoreTime <= 0) b.ignoreId = -1;
    }

    let prey: Blob | null = null;
    let bestDist = Infinity;
    this.blueGrid.around(b.x, b.y, vision, (i) => {
      const o = this.blobs[i];
      if (o.id === b.ignoreId || o.hidden) return;
      const d = Math.hypot(o.x - b.x, o.y - b.y);
      if (d < bestDist && d <= vision) {
        bestDist = d;
        prey = o;
      }
    });

    if (prey) {
      const t = prey as Blob;
      if (t.id !== b.targetBlob) b.chase = 0;
      b.targetBlob = t.id;
      if (bestDist >= CONTACT_RADIUS) {
        // Patience is spent on the pursuit itself, not on closing in on a blob
        // that has not noticed anything yet.
        if (t.action === "flee") b.chase += DT;
        // Reds are not tireless: a blue with a head start gets away.
        if (b.chase > b.patience) {
          b.chase = 0;
          this.stats.giveUps++;
          b.ignoreId = t.id;
          b.ignoreTime = 7;
          b.targetBlob = -1;
          b.timer = 1.1;
          b.timerTotal = 1.1;
          b.action = "rest";
          this.drift(b, 0, 0, 0);
          return;
        }
      }
      if (bestDist < CONTACT_RADIUS) {
        b.chase = 0;
        const drain = Math.min(t.energy, p.redContact);
        t.energy -= drain;
        if (t.energy <= 0) t.takenByRed = true;
        b.energy = Math.min(b.maxEnergy, b.energy + drain * CONTACT_EFFICIENCY);
        b.timer = p.redPause;
        b.timerTotal = p.redPause;
        b.action = "rest";
        b.glow = 1;
        b.squash = 0.5;
        t.squash = 0.6;
        t.glow = 0.5;
        // A shove, so the blue is not instantly re-touched on the next step.
        const dx = t.x - b.x;
        const dy = t.y - b.y;
        const len = Math.hypot(dx, dy) || 1;
        t.vx += (dx / len) * 3.5;
        t.vy += (dy / len) * 3.5;
        t.timer = 0;
        this.stats.contacts++;
        this.drift(b, 0, 0, 0);
        this.emit("contact", { x: b.x, y: b.y, species: "red", id: b.id });
        return;
      }
      // Lead the target a little so chases look intentional.
      const px = t.x + t.vx * 0.35;
      const py = t.y + t.vy * 0.35;
      const dx = px - b.x;
      const dy = py - b.y;
      const d = Math.hypot(dx, dy) || 1;
      b.action = "hunt";
      this.drift(b, dx / d, dy / d, speed);
      return;
    }

    b.targetBlob = -1;
    b.chase = 0;

    // Nothing in sight and running low: sit still rather than burn the last of
    // it on a fruitless patrol. This is what carries reds through the lean
    // stretch after a blue crash.
    if (b.energy < b.maxEnergy * 0.4 && this.rng.next() < 0.7 * DT) {
      b.timer = this.rng.range(1.5, 3.5);
      b.timerTotal = b.timer;
      b.action = "rest";
      this.drift(b, 0, 0, 0);
      return;
    }

    let nx = 0;
    let ny = 0;
    this.redGrid.around(b.x, b.y, 3, (i) => {
      const o = this.blobs[i];
      if (o === b) return;
      const dx = b.x - o.x;
      const dy = b.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d > 3 || d < 0.0001) return;
      nx += dx / d / d;
      ny += dy / d / d;
    });
    b.action = "wander";
    this.wander(b, speed * 0.7, nx, ny);
  }

  /** Random-walk heading with a gentle separation nudge mixed in. */
  private wander(b: Blob, speed: number, sepX: number, sepY: number) {
    b.heading += this.rng.normal() * 0.9 * DT * 3;
    let dx = Math.cos(b.heading);
    let dy = Math.sin(b.heading);
    const sepLen = Math.hypot(sepX, sepY);
    if (sepLen > 0.0001) {
      dx += (sepX / sepLen) * 0.6;
      dy += (sepY / sepLen) * 0.6;
    }
    const len = Math.hypot(dx, dy) || 1;
    this.drift(b, dx / len, dy / len, speed);
  }

  /** Steers velocity toward the desired direction and keeps the blob in the dish. */
  private drift(b: Blob, dx: number, dy: number, speed: number) {
    const desiredX = dx * speed;
    const desiredY = dy * speed;
    const k = Math.min(1, DT * 7);
    b.vx += (desiredX - b.vx) * k;
    b.vy += (desiredY - b.vy) * k;
    b.x += b.vx * DT;
    b.y += b.vy * DT;

    const edge = this.radius - 1.2;
    const r = Math.hypot(b.x, b.y);
    if (r > edge) {
      const nx = b.x / (r || 1);
      const ny = b.y / (r || 1);
      b.x = nx * edge;
      b.y = ny * edge;
      const dot = b.vx * nx + b.vy * ny;
      b.vx -= 1.6 * dot * nx;
      b.vy -= 1.6 * dot * ny;
      b.heading = Math.atan2(b.vy, b.vx) + this.rng.range(-0.5, 0.5);
    }
    if (speed > 0.05) b.heading = Math.atan2(b.vy, b.vx);
  }

  private burnEnergy(b: Blob) {
    const p = this.params;
    const spd = Math.hypot(b.vx, b.vy);
    const activity = 0.35 + 0.85 * (spd / REF_SPEED);
    const aging = 1 + 0.4 * Math.max(0, b.age / b.maxAge - 0.6) / 0.4;
    const base = b.species === "blue" ? p.blueEnergyUse : p.redEnergyUse;
    b.energy -= base * b.traits.metabolism * activity * aging * DT;
  }

  private reap() {
    const survivors: Blob[] = [];
    for (const b of this.blobs) {
      const starved = b.energy <= 0;
      const old = b.age >= b.maxAge;
      if (!starved && !old) {
        survivors.push(b);
        continue;
      }
      this.windowDeaths++;
      if (b.species === "blue") {
        this.stats.blueDeaths++;
        if (b.takenByRed) this.stats.blueTaken++;
        else if (starved) this.stats.blueStarved++;
        else this.stats.blueAged++;
      } else {
        this.stats.redDeaths++;
        if (starved) this.stats.redStarved++;
        else this.stats.redAged++;
      }
      this.emit("death", b);
    }
    this.blobs = survivors;
  }

  private sample() {
    let blue = 0;
    let red = 0;
    let blueE = 0;
    let redE = 0;
    let blueS = 0;
    let blueV = 0;
    let redS = 0;
    let redV = 0;
    for (const b of this.blobs) {
      if (b.species === "blue") {
        blue++;
        blueE += b.energy;
        blueS += b.traits.speed;
        blueV += b.traits.vision;
      } else {
        red++;
        redE += b.energy;
        redS += b.traits.speed;
        redV += b.traits.vision;
      }
    }
    let fruit = 0;
    for (const t of this.trees) fruit += t.fruit;

    const s = this.stats;
    if (blue > s.peakBlue) s.peakBlue = blue;
    if (red > s.peakRed) s.peakRed = red;
    if (fruit > s.peakFruit) s.peakFruit = fruit;
    if (blue === 0 && s.blueExtinctAt === null && this.time > 0)
      s.blueExtinctAt = this.time;
    if (red === 0 && s.redExtinctAt === null && this.time > 0)
      s.redExtinctAt = this.time;

    this.history.push({
      t: this.time,
      fruit,
      blue,
      red,
      blueEnergy: blue ? blueE / blue : 0,
      redEnergy: red ? redE / red : 0,
      blueSpeed: blue ? blueS / blue : 0,
      blueVision: blue ? blueV / blue : 0,
      redSpeed: red ? redS / red : 0,
      redVision: red ? redV / red : 0,
      births: this.windowBirths,
      deaths: this.windowDeaths,
    });
    this.windowBirths = 0;
    this.windowDeaths = 0;

    // Keep long runs affordable by halving resolution once history gets deep.
    if (this.history.length > 4000) {
      this.history = this.history.filter((_, i) => i % 2 === 0);
    }
  }

  drainEvents(): SimEvent[] {
    if (this.events.length === 0) return [];
    const out = this.events;
    this.events = [];
    return out;
  }

  counts() {
    let blue = 0;
    let red = 0;
    for (const b of this.blobs) (b.species === "blue" ? blue++ : red++);
    let fruit = 0;
    for (const t of this.trees) fruit += t.fruit;
    return { blue, red, fruit };
  }

  findBlob(id: number): Blob | null {
    return this.blobs.find((b) => b.id === id) ?? null;
  }
}

function emptyStats(): RunStats {
  return {
    peakBlue: 0,
    peakRed: 0,
    peakFruit: 0,
    blueBirths: 0,
    redBirths: 0,
    blueDeaths: 0,
    redDeaths: 0,
    blueStarved: 0,
    blueTaken: 0,
    blueAged: 0,
    redStarved: 0,
    redAged: 0,
    contacts: 0,
    giveUps: 0,
    meals: 0,
    blueExtinctAt: null,
    redExtinctAt: null,
    maxGeneration: 0,
  };
}

export type { Blob, Tree, HistorySample, SimEvent, Action, Species };
