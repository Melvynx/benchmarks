import { History } from "./history";
import { blobName } from "./names";
import { RULES, type Params } from "./params";
import { createRng, type Rng } from "./rng";
import { SpatialGrid } from "./spatial";
import type { Blob, Counters, FruitSlot, Genes, SimEvent, Species, Tree } from "./types";

export interface World {
  params: Params;
  initParams: Params;
  rng: Rng;
  ticks: number;
  time: number;
  radius: number;
  trees: Tree[];
  treeSeekers: Int32Array;
  treeSheltered: Int32Array;
  /** Blues running toward a tree to hide there, not yet under cover. */
  treeHiders: Int32Array;
  treeCells: number[][];
  treeCellSize: number;
  blobs: Blob[];
  byId: Map<number, Blob>;
  nextId: number;
  events: SimEvent[];
  history: History;
  stats: Counters;
  grid: SpatialGrid;
  blueGrid: SpatialGrid;
  redGrid: SpatialGrid;
  counts: { blue: number; red: number; fruit: number; growing: number; hiding: number };
}

const TAU = Math.PI * 2;

export const radiusOf = (s: Species) => (s === "blue" ? RULES.blueRadius : RULES.redRadius);
export const maxEnergyOf = (s: Species, p: Params) =>
  (s === "blue" ? p.blueCopy : p.redCopy) * RULES.maxEnergyMult;
export const copyThresholdOf = (s: Species, p: Params) => (s === "blue" ? p.blueCopy : p.redCopy);
export const topSpeedOf = (b: Blob, p: Params) =>
  (b.species === "blue" ? p.blueSpeed : p.redSpeed) * b.genes.speed;
export const visionOf = (b: Blob, p: Params) =>
  (b.species === "blue" ? p.blueVision : p.redVision) * b.genes.vision;

/** Compass direction (in the ground plane) of a fruit slot around its tree. */
export const slotAngle = (slot: number) => slot * 2.39996;

export function createWorld(params: Params): World {
  const p = params;
  const rng = createRng(p.seed);
  const radius = p.worldSize;

  const world: World = {
    params: p,
    initParams: { ...p },
    rng,
    ticks: 0,
    time: 0,
    radius,
    trees: [],
    treeSeekers: new Int32Array(0),
    treeSheltered: new Int32Array(0),
    treeHiders: new Int32Array(0),
    treeCells: [],
    treeCellSize: 2.5,
    blobs: [],
    byId: new Map(),
    nextId: 1,
    events: [],
    history: new History(RULES.sampleInterval),
    stats: {
      bornBlue: 0,
      bornRed: 0,
      fadedBlueHungry: 0,
      fadedBlueContact: 0,
      fadedRed: 0,
      contacts: 0,
      fruitEaten: 0,
      blueMax: 0,
      blueMaxAt: 0,
      redMax: 0,
      redMaxAt: 0,
      blueGoneAt: null,
      redGoneAt: null,
      maxGeneration: 0,
      capped: false,
    },
    grid: new SpatialGrid(radius, 2, 2048),
    blueGrid: new SpatialGrid(radius, 2, 2048),
    redGrid: new SpatialGrid(radius, 2, 2048),
    counts: { blue: 0, red: 0, fruit: 0, growing: 0, hiding: 0 },
  };

  plantTrees(world);
  buildTreeCells(world);

  for (let i = 0; i < p.blueStart; i++) spawnFounder(world, "blue");
  for (let i = 0; i < p.redStart; i++) spawnFounder(world, "red");

  sample(world);
  return world;
}

function plantTrees(w: World) {
  const { rng, radius } = w;
  const n = Math.max(0, Math.round(w.params.trees));
  const usable = radius - 1.6;
  let minDist = Math.min(5, Math.max(1.9, Math.sqrt((Math.PI * usable * usable) / Math.max(1, n)) * 0.75));
  for (let i = 0; i < n; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 300 && !placed; attempt++) {
      if (attempt > 0 && attempt % 100 === 0) minDist *= 0.8;
      const r = Math.sqrt(rng.next()) * usable;
      const a = rng.next() * TAU;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (w.trees.every((t) => Math.hypot(t.x - x, t.y - y) >= minDist)) {
        const slots: FruitSlot[] = [];
        for (let s = 0; s < RULES.maxFruitSlots; s++) {
          const active = s < w.params.fruitLimit;
          slots.push({
            growth: active ? (rng.chance(0.7) ? 1 : rng.next()) : 0,
            cooldown: 0,
            claimedBy: -1,
            eatProgress: 0,
          });
        }
        w.trees.push({ id: w.trees.length, x, y, scale: rng.range(0.88, 1.15), slots, meals: 0 });
        placed = true;
      }
    }
  }
  w.treeSeekers = new Int32Array(w.trees.length);
  w.treeSheltered = new Int32Array(w.trees.length);
  w.treeHiders = new Int32Array(w.trees.length);
}

function buildTreeCells(w: World) {
  const cs = w.treeCellSize;
  const half = w.radius + cs;
  const cols = Math.ceil((half * 2) / cs) + 1;
  const reach = RULES.treeTrunkRadius + RULES.redRadius + 0.2;
  w.treeCells = Array.from({ length: cols * cols }, () => []);
  for (let cy = 0; cy < cols; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const x0 = cx * cs - half - reach;
      const y0 = cy * cs - half - reach;
      const x1 = x0 + cs + reach * 2;
      const y1 = y0 + cs + reach * 2;
      for (const t of w.trees) {
        if (t.x >= x0 && t.x <= x1 && t.y >= y0 && t.y <= y1) w.treeCells[cy * cols + cx].push(t.id);
      }
    }
  }
}

function treesNear(w: World, x: number, y: number): number[] {
  const cs = w.treeCellSize;
  const half = w.radius + cs;
  const cols = Math.ceil((half * 2) / cs) + 1;
  const cx = Math.min(cols - 1, Math.max(0, Math.floor((x + half) / cs)));
  const cy = Math.min(cols - 1, Math.max(0, Math.floor((y + half) / cs)));
  return w.treeCells[cy * cols + cx];
}

function randomFreePoint(w: World, margin: number): [number, number] {
  for (let i = 0; i < 40; i++) {
    const r = Math.sqrt(w.rng.next()) * (w.radius - margin);
    const a = w.rng.next() * TAU;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (w.trees.every((t) => Math.hypot(t.x - x, t.y - y) > 1.1)) return [x, y];
  }
  return [0, 0];
}

function spawnFounder(w: World, species: Species) {
  const [x, y] = randomFreePoint(w, 1.2);
  const thr = copyThresholdOf(species, w.params);
  const b = makeBlob(w, species, x, y, thr * w.rng.range(0.35, 0.8), { speed: 1, vision: 1 }, null);
  b.age = w.rng.range(0, 20);
}

function makeBlob(
  w: World,
  species: Species,
  x: number,
  y: number,
  energy: number,
  genes: Genes,
  parent: Blob | null,
): Blob {
  const heading = w.rng.next() * TAU;
  const id = w.nextId++;
  const b: Blob = {
    id,
    species,
    name: blobName(w.rng, species),
    x,
    y,
    px: x,
    py: y,
    heading,
    pheading: heading,
    speed: 0,
    energy,
    age: 0,
    action: species === "blue" ? "wander" : "hunt",
    timer: 0,
    timerTotal: 0,
    thinkIn: w.rng.next() * 0.25,
    targetId: -1,
    targetSlot: -1,
    fleeX: 0,
    fleeY: 0,
    wanderAngle: heading,
    homeTree: parent ? parent.homeTree : -1,
    genes,
    generation: parent ? parent.generation + 1 : 0,
    parentId: parent ? parent.id : -1,
    founderId: parent ? parent.founderId : id,
    children: 0,
    bornAt: w.time,
    lastFleeAt: -99,
    lastThreatAt: -99,
    chaseFor: 0,
    sheltered: false,
    glow: 0,
    fadeCause: null,
    contacts: 0,
    meals: 0,
  };
  w.blobs.push(b);
  w.byId.set(id, b);
  return b;
}

export function step(w: World) {
  const dt = RULES.dt;
  const blobs = w.blobs;

  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    b.px = b.x;
    b.py = b.y;
    b.pheading = b.heading;
  }

  updateFruit(w, dt);

  w.treeSeekers.fill(0);
  w.treeSheltered.fill(0);
  w.treeHiders.fill(0);
  const shelterR2 = RULES.shelterRadius * RULES.shelterRadius;
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    if (b.species !== "blue") continue;
    b.sheltered = false;
    if (b.targetId < 0) continue;
    if (b.action === "seek" || b.action === "eat") w.treeSeekers[b.targetId]++;
    if (b.action === "eat" || b.action === "wait" || b.action === "rest" || b.action === "hide") {
      const t = w.trees[b.targetId];
      const dx = b.x - t.x;
      const dy = b.y - t.y;
      if (dx * dx + dy * dy < shelterR2 * t.scale * t.scale && w.treeSheltered[t.id] < RULES.shelterSlots) {
        b.sheltered = true;
        w.treeSheltered[t.id]++;
      } else if (b.action === "hide") {
        w.treeHiders[t.id]++;
      }
    }
  }

  w.grid.rebuild(blobs);
  w.blueGrid.rebuild(blobs, "blue");
  w.redGrid.rebuild(blobs, "red");
  const n = blobs.length;
  for (let i = 0; i < n; i++) {
    const b = blobs[i];
    if (b.species === "blue") updateBlue(w, b, dt);
    else updateRed(w, b, dt);
  }

  resolveOverlaps(w);

  let write = 0;
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    if (b.action === "fade" && b.timer <= 0) {
      w.byId.delete(b.id);
      continue;
    }
    blobs[write++] = b;
  }
  blobs.length = write;

  w.ticks++;
  w.time = w.ticks * dt;
  if (w.time + 1e-6 >= w.history.nextAt) sample(w);
}

function updateFruit(w: World, dt: number) {
  const p = w.params;
  const limit = Math.min(RULES.maxFruitSlots, Math.round(p.fruitLimit));
  for (const t of w.trees) {
    for (let s = 0; s < t.slots.length; s++) {
      const slot = t.slots[s];
      if (slot.claimedBy >= 0) continue;
      if (s >= limit) {
        slot.growth = 0;
        slot.cooldown = 0;
        continue;
      }
      if (slot.cooldown > 0) {
        slot.cooldown -= dt;
        continue;
      }
      if (slot.growth < 1) slot.growth = Math.min(1, slot.growth + p.fruitGrowth * dt);
    }
  }
}

export function availableFruit(w: World, t: Tree): number {
  const limit = Math.min(RULES.maxFruitSlots, Math.round(w.params.fruitLimit));
  let n = 0;
  for (let s = 0; s < limit; s++) {
    const slot = t.slots[s];
    if (slot.growth >= 1 && slot.claimedBy < 0) n++;
  }
  return n;
}

/** Seconds until the next fruit on this tree ripens (0 if one is ripe now). */
export function nextFruitEta(w: World, t: Tree): number {
  const p = w.params;
  const limit = Math.min(RULES.maxFruitSlots, Math.round(p.fruitLimit));
  let best = Infinity;
  for (let s = 0; s < limit; s++) {
    const slot = t.slots[s];
    if (slot.claimedBy >= 0) continue;
    const eta = Math.max(0, slot.cooldown) + (1 - slot.growth) / Math.max(1e-6, p.fruitGrowth);
    if (eta < best) best = eta;
  }
  return best;
}

function wallPush(w: World, b: Blob, out: { x: number; y: number }, gain: number) {
  const r = Math.hypot(b.x, b.y);
  const edge = w.radius - 1.6;
  if (r > edge && r > 1e-6) {
    const k = ((r - edge) / 1.6) * gain;
    out.x -= (b.x / r) * k;
    out.y -= (b.y / r) * k;
  }
}

const steer = { x: 0, y: 0 };

function updateBlue(w: World, b: Blob, dt: number) {
  const p = w.params;
  b.age += dt;
  if (b.glow > 0) b.glow -= dt;
  if (b.action === "fade") {
    b.timer -= dt;
    b.speed *= 0.85;
    return;
  }

  const maxSpeed = p.blueSpeed * b.genes.speed;
  let targetSpeed = 0;
  steer.x = 0;
  steer.y = 0;

  if (b.action === "eat") {
    const tree = w.trees[b.targetId];
    const slot = tree.slots[b.targetSlot];
    b.timer -= dt;
    slot.eatProgress = 1 - Math.max(0, b.timer) / Math.max(1e-6, b.timerTotal);
    steer.x = tree.x - b.x;
    steer.y = tree.y - b.y;
    if (b.timer <= 0) finishMeal(w, b, tree, slot);
  } else if (b.action === "startled") {
    b.timer -= dt;
    steer.x = Math.cos(b.heading);
    steer.y = Math.sin(b.heading);
    wallPush(w, b, steer, 3);
    targetSpeed = maxSpeed * 1.15;
    if (b.timer <= 0) {
      b.action = "flee";
      b.thinkIn = 0;
    }
  } else {
    b.thinkIn -= dt;
    if (b.thinkIn <= 0) {
      thinkBlue(w, b);
      b.thinkIn = 0.16 + w.rng.next() * 0.1;
    }

    switch (b.action) {
      case "flee": {
        steer.x = b.fleeX;
        steer.y = b.fleeY;
        targetSpeed = maxSpeed * RULES.fleeBurst;
        break;
      }
      case "seek": {
        const tree = w.trees[b.targetId];
        const dx = tree.x - b.x;
        const dy = tree.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d <= RULES.treeReach * tree.scale + 0.15) {
          if (!startMeal(w, b, tree)) {
            b.action = "wait";
            b.thinkIn = 0.2;
          }
        } else {
          steer.x = dx;
          steer.y = dy;
          targetSpeed = maxSpeed * 0.85 * Math.min(1, 0.35 + d / 2);
        }
        break;
      }
      case "hide": {
        const tree = w.trees[b.targetId];
        const dx = tree.x - b.x;
        const dy = tree.y - b.y;
        const d = Math.hypot(dx, dy);
        const reach = RULES.treeReach * tree.scale + 0.15;
        if (d > reach) {
          const len = d || 1;
          steer.x = dx / len + b.fleeX * 0.6;
          steer.y = dy / len + b.fleeY * 0.6;
          const covered = d < RULES.shelterRadius * tree.scale;
          targetSpeed = maxSpeed * (covered ? 0.35 : RULES.fleeBurst);
        } else if (b.energy < maxEnergyOf("blue", p) * 0.97 && startMeal(w, b, tree)) {
          break;
        } else {
          steer.x = dx * 0.2;
          steer.y = dy * 0.2;
        }
        break;
      }
      case "wait":
      case "rest": {
        const tree = b.targetId >= 0 ? w.trees[b.targetId] : null;
        if (tree) {
          const dx = tree.x - b.x;
          const dy = tree.y - b.y;
          const d = Math.hypot(dx, dy);
          const ring = b.action === "wait" ? 1.7 : 2.6;
          if (d > ring + 0.8) {
            steer.x = dx;
            steer.y = dy;
            targetSpeed = maxSpeed * 0.4;
          } else if (d < ring - 0.6) {
            steer.x = -dx;
            steer.y = -dy;
            targetSpeed = maxSpeed * 0.2;
          } else {
            steer.x = dx;
            steer.y = dy;
          }
        }
        break;
      }
      default: {
        b.wanderAngle += w.rng.gauss() * 2.2 * dt * 3;
        steer.x = Math.cos(b.wanderAngle) + b.fleeX * 0.8;
        steer.y = Math.sin(b.wanderAngle) + b.fleeY * 0.8;
        wallPush(w, b, steer, 2.5);
        const r = Math.hypot(b.x, b.y);
        if (r > w.radius - 1.4) b.wanderAngle = Math.atan2(-b.y, -b.x) + w.rng.range(-0.8, 0.8);
        targetSpeed = maxSpeed * 0.5;
      }
    }
  }

  const moving = b.action !== "eat";
  if (moving) separate(w, b, steer, targetSpeed === 0 ? 2.2 : 1.4);
  if (targetSpeed === 0 && moving && Math.hypot(steer.x, steer.y) > 1.2 && b.action !== "startled") {
    targetSpeed = maxSpeed * 0.15;
  }

  move(w, b, steer.x, steer.y, targetSpeed, 6.5, dt);
  spendEnergy(b, p.blueEnergyUse, p.blueSpeed, dt);

  if (b.energy <= 0) {
    fade(w, b, "hungry");
    return;
  }
  if (b.energy >= p.blueCopy && b.action !== "eat" && b.action !== "startled" && calmEnoughToCopy(w, b)) {
    reproduce(w, b);
  }
}

/** A blue hiding from a red nearby is too scared to copy. */
function calmEnoughToCopy(w: World, b: Blob) {
  return !b.sheltered || w.time - b.lastThreatAt >= RULES.hideMemory;
}

function thinkBlue(w: World, b: Blob) {
  const p = w.params;
  const vis = p.blueVision * b.genes.vision;
  const vis2 = vis * vis;
  const crowdR2 = (vis * 0.45) * (vis * 0.45);
  let fx = 0;
  let fy = 0;
  let threats = 0;
  let cx = 0;
  let cy = 0;

  const desperate = b.energy < p.blueCopy * RULES.boldBelow;
  const bold2 = RULES.boldFleeDistance * RULES.boldFleeDistance;
  const qr = w.redGrid.query(b.x, b.y, vis);
  for (let k = 0; k < qr.count; k++) {
    const o = w.blobs[qr.ids[k]];
    if (o.action === "fade" || o.action === "pause") continue;
    const dx = b.x - o.x;
    const dy = b.y - o.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > vis2) continue;
    b.lastThreatAt = w.time;
    if (b.sheltered || (desperate && d2 > bold2)) continue;
    const d = Math.sqrt(d2) + 1e-6;
    const weight = 1 / (d + 0.4);
    fx += (dx / d) * weight;
    fy += (dy / d) * weight;
    threats++;
  }
  // Grid cells hold start-of-tick positions; the margin covers blobs that moved since.
  const qb = w.blueGrid.query(b.x, b.y, Math.min(vis, vis * 0.45 + 0.5));
  for (let k = 0; k < qb.count; k++) {
    const o = w.blobs[qb.ids[k]];
    if (o === b || o.action === "fade") continue;
    const dx = b.x - o.x;
    const dy = b.y - o.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < crowdR2 && d2 > 1e-6) {
      const d = Math.sqrt(d2);
      cx += dx / d / (d + 0.5);
      cy += dy / d / (d + 0.5);
    }
  }

  if (threats > 0) {
    let len = Math.hypot(fx, fy) || 1;
    fx /= len;
    fy /= len;
    const r = Math.hypot(b.x, b.y);
    const edge = w.radius - 3;
    if (r > edge && r > 1e-6) {
      const nx = -b.x / r;
      const ny = -b.y / r;
      const outward = -(fx * nx + fy * ny);
      if (outward > 0) {
        fx += nx * outward * 1.2;
        fy += ny * outward * 1.2;
      }
      const k = (r - edge) / 3;
      fx += nx * k;
      fy += ny * k;
      len = Math.hypot(fx, fy) || 1;
      fx /= len;
      fy /= len;
    }
    if (b.action !== "flee" && b.action !== "hide" && w.time - b.lastFleeAt > 3) {
      w.events.push({ type: "flee", id: b.id, x: b.x, y: b.y });
      b.lastFleeAt = w.time;
    }
    b.fleeX = fx;
    b.fleeY = fy;
    const cover = findCover(w, b, fx, fy, vis);
    if (cover >= 0) {
      b.action = "hide";
      b.targetId = cover;
      return;
    }
    b.action = "flee";
    return;
  }

  if (b.sheltered && w.time - b.lastThreatAt < RULES.hideMemory) {
    const tree = w.trees[b.targetId];
    if (!desperate || availableFruit(w, tree) > 0) {
      b.action = "hide";
      b.fleeX = 0;
      b.fleeY = 0;
      return;
    }
  }

  const crowdLen = Math.hypot(cx, cy);
  b.fleeX = crowdLen > 1e-6 ? (cx / crowdLen) * Math.min(1, crowdLen) : 0;
  b.fleeY = crowdLen > 1e-6 ? (cy / crowdLen) * Math.min(1, crowdLen) : 0;

  if (b.energy < maxEnergyOf("blue", p) * 0.97) {
    let best = -1;
    let bestScore = Infinity;
    for (const t of w.trees) {
      const d = Math.hypot(t.x - b.x, t.y - b.y);
      if (d > vis + 0.8) continue;
      const avail = availableFruit(w, t);
      if (avail === 0) continue;
      const others = w.treeSeekers[t.id] - (b.action === "seek" && b.targetId === t.id ? 1 : 0);
      const score = d + 3 * Math.max(0, others - avail + 1);
      if (score < bestScore) {
        bestScore = score;
        best = t.id;
      }
    }
    if (best >= 0) {
      b.action = "seek";
      b.targetId = best;
      return;
    }

    let waitTree = -1;
    let waitScore = Infinity;
    if (b.homeTree >= 0) {
      const t = w.trees[b.homeTree];
      const d = Math.hypot(t.x - b.x, t.y - b.y);
      const eta = nextFruitEta(w, t);
      if (d < vis * 2.5 && eta < 9) {
        waitTree = t.id;
        waitScore = eta + d * 0.5;
      }
    }
    for (const t of w.trees) {
      const d = Math.hypot(t.x - b.x, t.y - b.y);
      if (d > vis) continue;
      const eta = nextFruitEta(w, t);
      const score = eta + d * 0.5 + w.treeSeekers[t.id] * 2;
      if (eta < 6 && score < waitScore) {
        waitScore = score;
        waitTree = t.id;
      }
    }
    if (waitTree >= 0) {
      b.action = "wait";
      b.targetId = waitTree;
      return;
    }

    if (b.action !== "wander") b.wanderAngle = b.heading;
    b.action = "wander";
    b.targetId = -1;
    return;
  }

  if (b.homeTree >= 0) {
    b.action = "rest";
    b.targetId = b.homeTree;
  } else {
    b.action = "wander";
    b.targetId = -1;
  }
}

/** Nearest tree with a free hiding spot that doesn't mean running at the threat. */
function findCover(w: World, b: Blob, fx: number, fy: number, vis: number): number {
  if (RULES.hideMemory <= 0) return -1;
  let best = -1;
  let bestScore = Infinity;
  for (const t of w.trees) {
    const self = b.targetId === t.id && (b.sheltered || b.action === "hide") ? 1 : 0;
    const taken = w.treeSheltered[t.id] + w.treeHiders[t.id] - self;
    if (taken >= RULES.shelterSlots) continue;
    const dx = t.x - b.x;
    const dy = t.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d > vis) continue;
    const toward = d > 1e-6 ? (dx * fx + dy * fy) / d : 1;
    if (toward < -0.3 && d > RULES.shelterRadius * t.scale) continue;
    const score = d * (1.6 - toward);
    if (score < bestScore) {
      bestScore = score;
      best = t.id;
    }
  }
  return best;
}

function startMeal(w: World, b: Blob, tree: Tree): boolean {
  const limit = Math.min(RULES.maxFruitSlots, Math.round(w.params.fruitLimit));
  let pick = -1;
  let bestDot = -Infinity;
  const ax = b.x - tree.x;
  const ay = b.y - tree.y;
  for (let s = 0; s < limit; s++) {
    const slot = tree.slots[s];
    if (slot.growth < 1 || slot.claimedBy >= 0) continue;
    const ang = slotAngle(s);
    const dot = Math.cos(ang) * ax + Math.sin(ang) * ay;
    if (dot > bestDot) {
      bestDot = dot;
      pick = s;
    }
  }
  if (pick < 0) return false;
  const slot = tree.slots[pick];
  slot.claimedBy = b.id;
  slot.eatProgress = 0;
  b.action = "eat";
  b.targetId = tree.id;
  b.targetSlot = pick;
  b.timer = w.params.blueEatTime;
  b.timerTotal = w.params.blueEatTime;
  w.events.push({ type: "eatStart", blobId: b.id, treeId: tree.id, slot: pick });
  return true;
}

function finishMeal(w: World, b: Blob, tree: Tree, slot: FruitSlot) {
  const p = w.params;
  b.energy = Math.min(maxEnergyOf("blue", p), b.energy + RULES.fruitEnergy);
  slot.growth = 0;
  slot.cooldown = p.fruitDelay;
  slot.claimedBy = -1;
  slot.eatProgress = 0;
  b.meals++;
  tree.meals++;
  b.homeTree = tree.id;
  b.glow = 0.8;
  w.stats.fruitEaten++;
  w.events.push({ type: "eatDone", blobId: b.id, treeId: tree.id, slot: b.targetSlot, x: b.x, y: b.y });
  b.action = "wait";
  b.targetSlot = -1;
  b.thinkIn = 0;
}

function releaseSlot(w: World, b: Blob) {
  if (b.action !== "eat" || b.targetId < 0 || b.targetSlot < 0) return;
  const slot = w.trees[b.targetId].slots[b.targetSlot];
  if (slot.claimedBy === b.id) {
    slot.claimedBy = -1;
    slot.eatProgress = 0;
  }
  b.targetSlot = -1;
}

function updateRed(w: World, b: Blob, dt: number) {
  const p = w.params;
  b.age += dt;
  if (b.glow > 0) b.glow -= dt;
  if (b.action === "fade") {
    b.timer -= dt;
    b.speed *= 0.85;
    return;
  }

  const maxSpeed = p.redSpeed * b.genes.speed;
  let targetSpeed = 0;
  steer.x = Math.cos(b.heading) * 0.01;
  steer.y = Math.sin(b.heading) * 0.01;
  let turnRate = 4.5;

  if (b.action === "pause" || b.action === "tired") {
    b.timer -= dt;
    if (b.timer <= 0) {
      b.action = "hunt";
      b.timer = w.rng.range(RULES.huntTime[0], RULES.huntTime[1]);
      b.wanderAngle = b.heading;
      b.thinkIn = 0;
    }
  } else {
    b.thinkIn -= dt;
    if (b.thinkIn <= 0) {
      thinkRed(w, b);
      b.thinkIn = 0.16 + w.rng.next() * 0.1;
    }

    if (b.action === "chase") {
      const t = w.byId.get(b.targetId);
      b.chaseFor += dt;
      if (!t || t.action === "fade" || t.sheltered) {
        b.targetId = -1;
        b.action = "hunt";
        b.chaseFor = 0;
        b.thinkIn = 0;
      } else if (b.chaseFor > RULES.chaseStamina) {
        b.action = "tired";
        b.timer = RULES.tiredTime;
        b.timerTotal = RULES.tiredTime;
        b.chaseFor = 0;
        b.targetId = -1;
      } else {
        const dx = t.x - b.x;
        const dy = t.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < RULES.redRadius + RULES.blueRadius + 0.06) {
          b.chaseFor = 0;
          contact(w, b, t);
          return;
        }
        const lead = Math.min(0.6, (d / Math.max(0.1, maxSpeed)) * 0.5);
        steer.x = dx + Math.cos(t.heading) * t.speed * lead;
        steer.y = dy + Math.sin(t.heading) * t.speed * lead;
        targetSpeed = maxSpeed;
        turnRate = 5;
      }
    }

    if (b.action === "lurk") {
      b.timer -= dt;
      b.wanderAngle += w.rng.gauss() * dt * 2;
      steer.x = Math.cos(b.wanderAngle);
      steer.y = Math.sin(b.wanderAngle);
      turnRate = 1.2;
    } else if (b.action === "hunt" || b.action === "lounge") {
      b.timer -= dt;
      b.wanderAngle += w.rng.gauss() * 1.6 * dt * 3;
      steer.x = Math.cos(b.wanderAngle);
      steer.y = Math.sin(b.wanderAngle);
      wallPush(w, b, steer, 2.5);
      const r = Math.hypot(b.x, b.y);
      if (r > w.radius - 1.4) b.wanderAngle = Math.atan2(-b.y, -b.x) + w.rng.range(-0.8, 0.8);
      targetSpeed = maxSpeed * (b.action === "hunt" ? 0.55 : 0.28);
      turnRate = 3;
    }
  }

  const resting = b.action === "pause" || b.action === "tired";
  if (!resting) separate(w, b, steer, 1.2, b.action === "chase" ? 0.35 : RULES.redSpacing);
  move(w, b, steer.x, steer.y, targetSpeed, turnRate, dt);
  spendEnergy(b, p.redEnergyUse, p.redSpeed, dt);

  if (b.energy <= 0) {
    fade(w, b, "hungry");
    return;
  }
  if (b.energy >= p.redCopy && !resting) reproduce(w, b);
}

function thinkRed(w: World, b: Blob) {
  const p = w.params;
  if (b.energy >= maxEnergyOf("red", p) * 0.98) {
    b.action = "lounge";
    b.targetId = -1;
    return;
  }
  const vis = p.redVision * b.genes.vision;
  let best: Blob | null = null;
  let bestD2 = vis * vis;
  const q = w.blueGrid.query(b.x, b.y, vis);
  for (let k = 0; k < q.count; k++) {
    const o = w.blobs[q.ids[k]];
    if (o.action === "fade") continue;
    const dx = o.x - b.x;
    const dy = o.y - b.y;
    if (o.sheltered) continue;
    let d2 = dx * dx + dy * dy;
    if (b.action === "chase" && o.id === b.targetId) d2 *= 0.55;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = o;
    }
  }
  if (best) {
    if (b.action !== "chase") b.chaseFor = 0;
    b.action = "chase";
    b.targetId = best.id;
    return;
  }
  b.targetId = -1;
  b.chaseFor = 0;
  if (b.action === "hunt") {
    if (b.timer <= 0) {
      b.action = "lurk";
      b.timer = w.rng.range(RULES.lurkTime[0], RULES.lurkTime[1]);
      b.wanderAngle = b.heading;
    }
  } else if (b.action === "lurk") {
    if (b.timer <= 0) {
      b.action = "hunt";
      b.timer = w.rng.range(RULES.huntTime[0], RULES.huntTime[1]);
      b.wanderAngle = b.heading + w.rng.range(-1.2, 1.2);
    }
  } else {
    b.action = "hunt";
    b.timer = w.rng.range(RULES.huntTime[0], RULES.huntTime[1]);
    b.wanderAngle = b.heading;
  }
}

function contact(w: World, red: Blob, blue: Blob) {
  const p = w.params;
  const drained = Math.min(p.redContact, Math.max(0, blue.energy));
  blue.energy -= drained;
  red.energy = Math.min(maxEnergyOf("red", p), red.energy + drained * RULES.redEfficiency);
  red.action = "pause";
  red.timer = p.redPauseTime;
  red.timerTotal = Math.max(0.01, p.redPauseTime);
  red.targetId = -1;
  red.speed = 0;
  red.contacts++;
  red.glow = 1.2;
  blue.contacts++;
  w.stats.contacts++;

  const faded = blue.energy <= 0.5;
  if (faded) {
    fade(w, blue, "contact");
  } else {
    releaseSlot(w, blue);
    blue.action = "startled";
    blue.timer = RULES.startledTime;
    blue.timerTotal = RULES.startledTime;
    blue.heading = Math.atan2(blue.y - red.y, blue.x - red.x);
    blue.speed = p.blueSpeed * blue.genes.speed * 1.2;
    blue.targetId = -1;
  }
  w.events.push({
    type: "contact",
    redId: red.id,
    blueId: blue.id,
    x: (red.x + blue.x) / 2,
    y: (red.y + blue.y) / 2,
    drained,
    faded,
  });
}

function fade(w: World, b: Blob, cause: "hungry" | "contact") {
  releaseSlot(w, b);
  b.action = "fade";
  b.timer = RULES.fadeTime;
  b.timerTotal = RULES.fadeTime;
  b.fadeCause = cause;
  b.energy = Math.max(0, b.energy);
  if (b.species === "blue") {
    if (cause === "hungry") w.stats.fadedBlueHungry++;
    else w.stats.fadedBlueContact++;
  } else {
    w.stats.fadedRed++;
  }
  w.events.push({ type: "fade", id: b.id, species: b.species, x: b.x, y: b.y, cause });
}

function mutate(w: World, g: number): number {
  const drift = w.params.traitDrift;
  if (drift <= 0) return g;
  return Math.min(2, Math.max(0.5, g * Math.exp(w.rng.gauss() * drift)));
}

function reproduce(w: World, b: Blob) {
  if (w.blobs.length >= RULES.maxBlobs) {
    w.stats.capped = true;
    return;
  }
  const p = w.params;
  const thr = copyThresholdOf(b.species, p);
  const share = (b.energy - thr * RULES.copyOverhead) / 2;
  if (share <= 0) return;
  b.energy = share;

  const side = w.rng.chance(0.5) ? 1 : -1;
  const a = b.heading + side * (Math.PI / 2 + w.rng.range(-0.5, 0.5));
  const dist = radiusOf(b.species) * 2.1;
  let x = b.x + Math.cos(a) * dist;
  let y = b.y + Math.sin(a) * dist;
  const r = Math.hypot(x, y);
  const lim = w.radius - radiusOf(b.species) - 0.2;
  if (r > lim) {
    x *= lim / r;
    y *= lim / r;
  }
  const child = makeBlob(w, b.species, x, y, share, { speed: mutate(w, b.genes.speed), vision: mutate(w, b.genes.vision) }, b);
  child.heading = a;
  child.pheading = a;
  child.wanderAngle = a;
  child.thinkIn = 0.3;
  b.children++;
  b.glow = 0.6;
  if (b.species === "blue") w.stats.bornBlue++;
  else w.stats.bornRed++;
  if (child.generation > w.stats.maxGeneration) w.stats.maxGeneration = child.generation;
  w.events.push({ type: "birth", id: child.id, parentId: b.id, species: b.species, x, y });
}

function separate(w: World, b: Blob, out: { x: number; y: number }, gain: number, spacing = 0.35) {
  const rb = radiusOf(b.species);
  const reach = rb + RULES.redRadius + spacing;
  const q = (b.species === "blue" ? w.blueGrid : w.redGrid).query(b.x, b.y, reach);
  let sx = 0;
  let sy = 0;
  for (let k = 0; k < q.count; k++) {
    const o = w.blobs[q.ids[k]];
    if (o === b || o.action === "fade") continue;
    const dx = b.x - o.x;
    const dy = b.y - o.y;
    const d2 = dx * dx + dy * dy;
    const lim = rb + radiusOf(o.species) + spacing;
    if (d2 >= lim * lim || d2 < 1e-8) continue;
    const d = Math.sqrt(d2);
    const k2 = (lim - d) / lim;
    sx += (dx / d) * k2;
    sy += (dy / d) * k2;
  }
  const len = Math.hypot(out.x, out.y) || 1;
  out.x = out.x / len + sx * gain;
  out.y = out.y / len + sy * gain;
}

function move(w: World, b: Blob, dx: number, dy: number, targetSpeed: number, turnRate: number, dt: number) {
  if (dx * dx + dy * dy > 1e-10) {
    const desired = Math.atan2(dy, dx);
    let diff = desired - b.heading;
    diff = ((diff + Math.PI) % TAU + TAU) % TAU - Math.PI;
    const maxTurn = turnRate * dt;
    b.heading += Math.max(-maxTurn, Math.min(maxTurn, diff));
    if (Math.abs(diff) > 2) targetSpeed *= 0.35;
  }
  const accel = targetSpeed > b.speed ? 7 : 9;
  const dv = targetSpeed - b.speed;
  b.speed += Math.sign(dv) * Math.min(Math.abs(dv), accel * dt);

  b.x += Math.cos(b.heading) * b.speed * dt;
  b.y += Math.sin(b.heading) * b.speed * dt;

  const rb = radiusOf(b.species);
  const lim = w.radius - rb - 0.15;
  const r = Math.hypot(b.x, b.y);
  if (r > lim) {
    b.x *= lim / r;
    b.y *= lim / r;
  }

  const near = treesNear(w, b.x, b.y);
  for (let i = 0; i < near.length; i++) {
    const t = w.trees[near[i]];
    const tx = b.x - t.x;
    const ty = b.y - t.y;
    const minD = RULES.treeTrunkRadius * t.scale + rb;
    const d2 = tx * tx + ty * ty;
    if (d2 < minD * minD) {
      const d = Math.sqrt(d2) || 1e-3;
      b.x = t.x + (tx / d) * minD;
      b.y = t.y + (ty / d) * minD;
    }
  }
}

function spendEnergy(b: Blob, use: number, baseSpeed: number, dt: number) {
  const idle = use * RULES.idleShare * (0.7 + 0.3 * b.genes.vision * b.genes.vision);
  const rel = b.speed / Math.max(0.1, baseSpeed);
  const moving = use * (1 - RULES.idleShare) * rel * rel;
  b.energy -= (idle + moving) * dt;
}

function resolveOverlaps(w: World) {
  const blobs = w.blobs;
  for (let i = 0; i < blobs.length; i++) {
    const a = blobs[i];
    if (a.action === "fade") continue;
    const ra = radiusOf(a.species);
    const q = w.grid.query(a.x, a.y, ra + RULES.redRadius);
    for (let k = 0; k < q.count; k++) {
      const j = q.ids[k];
      if (j <= i) continue;
      const o = blobs[j];
      if (o.action === "fade") continue;
      const dx = o.x - a.x;
      const dy = o.y - a.y;
      const lim = ra + radiusOf(o.species);
      const d2 = dx * dx + dy * dy;
      if (d2 >= lim * lim || d2 < 1e-10) continue;
      const d = Math.sqrt(d2);
      const push = (lim - d) * 0.25;
      const ux = dx / d;
      const uy = dy / d;
      const wa = a.action === "eat" ? 0.3 : 1;
      const wo = o.action === "eat" ? 0.3 : 1;
      a.x -= ux * push * wa;
      a.y -= uy * push * wa;
      o.x += ux * push * wo;
      o.y += uy * push * wo;
    }
  }
}

function sample(w: World) {
  let blue = 0;
  let red = 0;
  let bs = 0;
  let bv = 0;
  let rs = 0;
  let rv = 0;
  let be = 0;
  let re = 0;
  let hiding = 0;
  for (const b of w.blobs) {
    if (b.action === "fade") continue;
    if (b.species === "blue") {
      blue++;
      if (b.sheltered) hiding++;
      bs += b.genes.speed;
      bv += b.genes.vision;
      be += b.energy;
    } else {
      red++;
      rs += b.genes.speed;
      rv += b.genes.vision;
      re += b.energy;
    }
  }
  const limit = Math.min(RULES.maxFruitSlots, Math.round(w.params.fruitLimit));
  let fruit = 0;
  let growing = 0;
  for (const t of w.trees) {
    for (let s = 0; s < limit; s++) {
      const slot = t.slots[s];
      if (slot.claimedBy >= 0) continue;
      if (slot.growth >= 1) fruit++;
      else if (slot.cooldown <= 0) growing++;
    }
  }

  const st = w.stats;
  const prev = w.counts;
  if (blue > st.blueMax) {
    st.blueMax = blue;
    st.blueMaxAt = w.time;
  }
  if (red > st.redMax) {
    st.redMax = red;
    st.redMaxAt = w.time;
  }
  if (blue === 0 && prev.blue > 0 && st.blueGoneAt === null) st.blueGoneAt = w.time;
  if (red === 0 && prev.red > 0 && st.redGoneAt === null) st.redGoneAt = w.time;

  w.counts = { blue, red, fruit, growing, hiding };
  w.history.push({
    t: w.time,
    fruit,
    blue,
    red,
    blueSpeed: blue ? bs / blue : NaN,
    blueVision: blue ? bv / blue : NaN,
    redSpeed: red ? rs / red : NaN,
    redVision: red ? rv / red : NaN,
    blueEnergy: blue ? be / blue : NaN,
    redEnergy: red ? re / red : NaN,
  });
}
