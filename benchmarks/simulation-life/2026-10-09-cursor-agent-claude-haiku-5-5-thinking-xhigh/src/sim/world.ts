import { gaussian, mulberry32, range, type Rng } from './rng';
import { SpatialGrid } from './grid';
import type { Params } from './params';
import type { Blob, Group, SimEvent, Tree, World } from './types';

/** Fixed simulation step, in sim seconds. */
export const DT = 0.05;

export const MAX_ENERGY = 100;
export const BLOB_RADIUS = 0.7;
export const CONTACT_RANGE = 1.5; // centre distance for a gentle red-to-blue contact
export const TREE_STAND = 1.45; // where a forager stands around a trunk
export const TREE_REACH = 2.1; // close enough to start chewing
export const MAX_BLUE = 240;
export const MAX_RED = 120;
export const REF_SPEED = 1.2; // speed at which movement cost equals the full energy-use rate

/** Balance constants. Exposed so experiments can nudge them; defaults are the shipped rules. */
export const RULES = {
  fruitEnergy: 30, // energy from one fruit, absorbed over the chewing time
  copyCost: 30, // energy the parent pays to make a child
  childEnergy: 22,
  copyCooldown: 9,
  blueSeekBelow: 72, // blue forages below this (or its copy threshold, if higher)
  redHuntBelow: 96, // red stops hunting once nearly full
  biteLoss: 0.8, // blue loses this share of the energy red gains from a bite
  biteCooldown: 6, // seconds a blue is immune after being touched (caps how many reds a garden can feed)
  fleeBoost: 1.1,
  fleeShare: 0.6, // fraction of blue vision at which a hunting red triggers flight
  blueMaturity: 20, // seconds before a newborn blue can have children
  redMaturity: 30, // seconds before a newborn red can have children
};

const WAIT_COST = 0.35; // share of energy use spent standing still
const SEP_RADIUS = 1.6;
const SEP_WEIGHT = 1.1;
const CROWD_RADIUS = 2.2;
const CROWD_LIMIT = 5;
const TRAIT_MUTATION = 0.07;
const TREE_SPACING = 4.5;
const EVENT_CAP = 400;
const CELL = 3;

const scratchSep: Blob[] = [];
const scratchCrowd: Blob[] = [];
const scratchFlee: Blob[] = [];
const scratchTouch: Blob[] = [];
const scratchHunt: Blob[] = [];

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function unit(x: number, z: number): [number, number] {
  const d = Math.hypot(x, z);
  return d < 1e-6 ? [0, 0] : [x / d, z / d];
}

function randomInDisc(rng: Rng, r: number): { x: number; z: number } {
  const a = rng() * Math.PI * 2;
  const d = Math.sqrt(rng()) * r;
  return { x: Math.cos(a) * d, z: Math.sin(a) * d };
}

function traitDraw(rng: Rng): number {
  return clamp(1 + gaussian(rng) * 0.06, 0.8, 1.2);
}

function makeBlob(
  w: World,
  group: Group,
  x: number,
  z: number,
  energy: number,
  opts: { generation: number; parentId: number | null; speedTrait: number; visionTrait: number; age: number },
): Blob {
  return {
    id: w.nextId++,
    group,
    x,
    z,
    vx: 0,
    vz: 0,
    energy,
    age: opts.age,
    generation: opts.generation,
    parentId: opts.parentId,
    speedTrait: opts.speedTrait,
    visionTrait: opts.visionTrait,
    action: 'wander',
    actionTimer: 0,
    eatRemain: 0,
    targetId: null,
    wanderAngle: w.rng() * Math.PI * 2,
    wanderTimer: range(w.rng, 0.5, 3),
    copyCooldown: 0,
    contactCooldown: 0,
    moved: 0,
    births: 0,
    bites: 0,
    bitten: 0,
    eats: 0,
    alive: true,
  };
}

export function createWorld(params: Params): World {
  const rng = mulberry32(params.seed);
  const R = params.worldSize;
  const w: World = {
    tick: 0,
    time: 0,
    params: { ...params },
    rng,
    trees: [],
    blue: [],
    red: [],
    nextId: 1,
    events: [],
    totals: { births: { blue: 0, red: 0 }, deaths: { blue: 0, red: 0 }, eats: 0, bites: 0 },
    gridBlue: new SpatialGrid<Blob>(CELL),
    gridRed: new SpatialGrid<Blob>(CELL),
  };

  for (let i = 0; i < params.startTrees; i++) {
    let spot: { x: number; z: number } | null = null;
    for (let attempt = 0; attempt < 60 && !spot; attempt++) {
      const c = randomInDisc(rng, R * 0.72);
      if (w.trees.every((t) => Math.hypot(t.x - c.x, t.z - c.z) >= TREE_SPACING)) spot = c;
    }
    spot ??= randomInDisc(rng, R * 0.72);
    const tree: Tree = {
      id: w.nextId++,
      x: spot.x,
      z: spot.z,
      fruit: params.fruitLimit,
      growth: 0,
      pending: [],
      phase: rng() * Math.PI * 2,
      eaten: 0,
    };
    w.trees.push(tree);
  }

  for (let i = 0; i < params.startBlue; i++) {
    const p = randomInDisc(rng, R * 0.85);
    w.blue.push(
      makeBlob(w, 'blue', p.x, p.z, range(rng, 40, 70), {
        generation: 0,
        parentId: null,
        speedTrait: traitDraw(rng),
        visionTrait: traitDraw(rng),
        age: 10,
      }),
    );
  }
  for (let i = 0; i < params.startRed; i++) {
    const p = randomInDisc(rng, R * 0.85);
    w.red.push(
      makeBlob(w, 'red', p.x, p.z, range(rng, 45, 75), {
        generation: 0,
        parentId: null,
        speedTrait: traitDraw(rng),
        visionTrait: traitDraw(rng),
        age: 10,
      }),
    );
  }
  return w;
}

function pushEvent(w: World, ev: SimEvent): void {
  // Drop the oldest half in one go when the renderer has fallen behind (headless runs never drain).
  if (w.events.length >= EVENT_CAP) w.events.splice(0, EVENT_CAP / 2);
  w.events.push(ev);
}

/** Advance the garden by one fixed DT step. */
export function step(w: World): void {
  w.gridBlue.clear();
  w.gridRed.clear();
  for (const b of w.blue) w.gridBlue.insert(b);
  for (const r of w.red) w.gridRed.insert(r);

  for (const t of w.trees) updateTree(w, t);
  for (const r of w.red) redThink(w, r);
  for (const b of w.blue) blueThink(w, b);
  for (const b of w.blue) integrate(w, b);
  for (const r of w.red) integrate(w, r);
  lifecycle(w);

  w.tick++;
  w.time += DT;
}

function updateTree(w: World, t: Tree): void {
  const p = w.params;
  if (t.fruit > p.fruitLimit) t.fruit = Math.floor(p.fruitLimit);
  const missing = Math.max(0, p.fruitLimit - t.fruit);
  // Every missing fruit owns a slot in the queue. Slots added by a raised limit are ready now.
  if (t.pending.length > missing) t.pending.length = missing;
  while (t.pending.length < missing) t.pending.push(w.time);
  if (missing === 0) {
    t.growth = 0;
    return;
  }
  // Regrowth is serial: the oldest slot ripens first, once its return delay has passed.
  if (t.pending[0] <= w.time) {
    t.growth += p.fruitGrowth * DT;
    if (t.growth >= 1) {
      t.fruit += 1;
      t.growth = 0;
      t.pending.shift();
    }
  }
}

function damp(b: Blob, dt: number): void {
  const k = Math.max(0, 1 - 6 * dt);
  b.vx *= k;
  b.vz *= k;
}

/** Steer toward a desired unit direction, adding edge and crowd separation. */
function move(w: World, b: Blob, dx: number, dz: number, speed: number, accel: number): void {
  const R = w.params.worldSize;
  let sx = dx;
  let sz = dz;

  const d = Math.hypot(b.x, b.z);
  const edge = R - 2.5;
  if (d > edge) {
    const k = ((d - edge) / 2.5) * 2;
    sx += (-b.x / d) * k;
    sz += (-b.z / d) * k;
  }

  const grid = b.group === 'blue' ? w.gridBlue : w.gridRed;
  for (const o of grid.query(b.x, b.z, SEP_RADIUS, scratchSep)) {
    if (o === b) continue;
    const ox = b.x - o.x;
    const oz = b.z - o.z;
    const od = Math.hypot(ox, oz) || 0.01;
    const k = (SEP_RADIUS - od) / SEP_RADIUS;
    sx += (ox / od) * k * SEP_WEIGHT;
    sz += (oz / od) * k * SEP_WEIGHT;
  }

  const [ux, uz] = unit(sx, sz);
  const kk = Math.min(1, accel * DT);
  b.vx += (ux * speed - b.vx) * kk;
  b.vz += (uz * speed - b.vz) * kk;
}

function wanderStep(w: World, b: Blob, speed: number, canIdle: boolean): void {
  if (b.action === 'idle') {
    b.actionTimer -= DT;
    damp(b, DT);
    if (b.actionTimer <= 0) b.action = 'wander';
    return;
  }
  b.wanderTimer -= DT;
  if (b.wanderTimer <= 0) {
    b.wanderTimer = range(w.rng, 1.5, 3.5);
    if (canIdle && w.rng() < 0.28) {
      b.action = 'idle';
      b.actionTimer = range(w.rng, 1, 2.5);
      damp(b, DT);
      return;
    }
    b.wanderAngle += gaussian(w.rng) * 1.4;
  }
  b.action = 'wander';
  move(w, b, Math.cos(b.wanderAngle), Math.sin(b.wanderAngle), speed, 2.5);
}

function bite(w: World, r: Blob, b: Blob): void {
  const gain = w.params.redContactStrength;
  r.energy = Math.min(MAX_ENERGY, r.energy + gain);
  b.energy -= gain * RULES.biteLoss;
  b.contactCooldown = RULES.biteCooldown;
  b.bitten++;
  r.bites++;
  r.action = 'pause';
  r.actionTimer = w.params.redPauseTime;
  r.targetId = b.id;
  r.vx = 0;
  r.vz = 0;
  w.totals.bites++;
  pushEvent(w, { type: 'bite', redId: r.id, blueId: b.id, x: (r.x + b.x) / 2, z: (r.z + b.z) / 2, gain });
}

function redThink(w: World, r: Blob): void {
  const p = w.params;
  if (r.action === 'pause') {
    r.actionTimer -= DT;
    damp(r, DT);
    if (r.actionTimer <= 0) r.action = 'wander';
    return;
  }

  // Gentle contact: a hungry red touching an unshielded blue bites it.
  let touch: Blob | null = null;
  if (r.energy < RULES.redHuntBelow) {
  let touchD = Infinity;
  for (const o of w.gridBlue.query(r.x, r.z, CONTACT_RANGE, scratchTouch)) {
    if (o.contactCooldown > 0) continue;
    const d = Math.hypot(o.x - r.x, o.z - r.z);
    if (d < touchD) {
      touchD = d;
      touch = o;
    }
  }
  }
  if (touch) {
    bite(w, r, touch);
    return;
  }

  const vision = p.redVision * r.visionTrait;
  const speed = p.redSpeed * r.speedTrait;
  if (r.energy < RULES.redHuntBelow) {
    let hunt: Blob | null = null;
    let huntD = Infinity;
    for (const o of w.gridBlue.query(r.x, r.z, vision, scratchHunt)) {
      if (o.contactCooldown > 0) continue;
      const d = Math.hypot(o.x - r.x, o.z - r.z);
      if (d < huntD) {
        huntD = d;
        hunt = o;
      }
    }
    if (hunt) {
      const [dx, dz] = unit(hunt.x - r.x, hunt.z - r.z);
      r.targetId = hunt.id;
      r.action = 'hunt';
      move(w, r, dx, dz, speed, 4);
      return;
    }
  }
  r.targetId = null;
  wanderStep(w, r, speed * 0.6, true);
}

function startEat(w: World, b: Blob, t: Tree): void {
  t.fruit -= 1;
  t.pending.push(w.time + w.params.fruitReturnDelay);
  t.eaten++;
  b.action = 'eat';
  b.actionTimer = w.params.blueEatTime;
  b.eatRemain = RULES.fruitEnergy;
  b.eats++;
  b.targetId = t.id;
  b.vx = 0;
  b.vz = 0;
  w.totals.eats++;
  pushEvent(w, { type: 'eat', id: b.id, treeId: t.id, x: b.x, z: b.z, gain: RULES.fruitEnergy });
}

function blueThink(w: World, b: Blob): void {
  const p = w.params;
  const vision = p.blueVision * b.visionTrait;
  const speed = p.blueSpeed * b.speedTrait;

  if (b.action === 'eat') {
    b.actionTimer -= DT;
    const per = (RULES.fruitEnergy * DT) / Math.max(0.2, p.blueEatTime);
    const take = Math.min(per, b.eatRemain);
    b.energy = Math.min(MAX_ENERGY, b.energy + take);
    b.eatRemain -= take;
    damp(b, DT);
    if (b.actionTimer <= 0) {
      b.energy = Math.min(MAX_ENERGY, b.energy + b.eatRemain);
      b.eatRemain = 0;
      b.action = 'wander';
    }
    return;
  }

  // 1. Flee from nearby hunting red blobs (resting reds are no threat).
  const fleeR = vision * RULES.fleeShare;
  let fx = 0;
  let fz = 0;
  let threatened = false;
  for (const o of w.gridRed.query(b.x, b.z, fleeR, scratchFlee)) {
    if (o.action === 'pause') continue;
    const dx = b.x - o.x;
    const dz = b.z - o.z;
    const d = Math.hypot(dx, dz) || 0.01;
    const wgt = 1.2 - d / fleeR;
    fx += (dx / d) * wgt;
    fz += (dz / d) * wgt;
    threatened = true;
  }
  if (threatened) {
    const [dx, dz] = unit(fx, fz);
    b.targetId = null;
    b.action = 'flee';
    move(w, b, dx, dz, speed * RULES.fleeBoost, 6);
    return;
  }

  // 2. Hungry: head for the nearest tree that still has fruit.
  if (b.energy < Math.max(RULES.blueSeekBelow, p.blueCopyThreshold)) {
    let tree: Tree | null = null;
    let bestD = Infinity;
    const sense = vision * 1.3 + TREE_STAND;
    for (const t of w.trees) {
      if (t.fruit <= 0) continue;
      const d = Math.hypot(t.x - b.x, t.z - b.z);
      if (d <= sense && d < bestD) {
        bestD = d;
        tree = t;
      }
    }
    if (tree) {
      if (bestD <= TREE_REACH) {
        startEat(w, b, tree);
        return;
      }
      const [ux, uz] = unit(b.x - tree.x, b.z - tree.z);
      const [dx, dz] = unit(tree.x + ux * TREE_STAND - b.x, tree.z + uz * TREE_STAND - b.z);
      b.targetId = tree.id;
      b.action = 'seek';
      move(w, b, dx, dz, speed, 4);
      return;
    }
  }

  // 3. Too crowded: drift away from the middle of the crowd.
  const crowd = w.gridBlue.query(b.x, b.z, CROWD_RADIUS, scratchCrowd);
  if (crowd.length - 1 >= CROWD_LIMIT) {
    let cx = 0;
    let cz = 0;
    let n = 0;
    for (const o of crowd) {
      if (o === b) continue;
      cx += o.x;
      cz += o.z;
      n++;
    }
    const [dx, dz] = unit(b.x - cx / n, b.z - cz / n);
    b.targetId = null;
    b.action = 'avoid';
    move(w, b, dx, dz, speed * 0.9, 3);
    return;
  }

  // 4. Gather loosely around nearby trees.
  let near: Tree | null = null;
  let nearD = Infinity;
  const gatherR = vision * 1.5;
  for (const t of w.trees) {
    const d = Math.hypot(t.x - b.x, t.z - b.z);
    if (d <= gatherR && d < nearD) {
      nearD = d;
      near = t;
    }
  }
  if (near && nearD > TREE_STAND + 1.2) {
    const [dx, dz] = unit(near.x - b.x, near.z - b.z);
    b.targetId = near.id;
    b.action = 'gather';
    move(w, b, dx, dz, speed * 0.6, 2.5);
    return;
  }

  // 5. Wander, sometimes stopping to idle.
  b.targetId = null;
  wanderStep(w, b, speed * 0.55, true);
}

function integrate(w: World, b: Blob): void {
  const p = w.params;
  const R = p.worldSize;
  b.x += b.vx * DT;
  b.z += b.vz * DT;

  const d = Math.hypot(b.x, b.z);
  const lim = R - BLOB_RADIUS;
  if (d > lim) {
    const ox = b.x / d;
    const oz = b.z / d;
    b.x = ox * lim;
    b.z = oz * lim;
    const vOut = b.vx * ox + b.vz * oz;
    if (vOut > 0) {
      b.vx -= vOut * ox;
      b.vz -= vOut * oz;
    }
  }

  const speed = Math.hypot(b.vx, b.vz);
  b.moved = speed;
  const use = b.group === 'blue' ? p.blueEnergyUse : p.redEnergyUse;
  const ratio = speed / REF_SPEED;
  b.energy -= use * (WAIT_COST + (1 - WAIT_COST) * ratio * ratio) * DT;
  b.age += DT;
  if (b.copyCooldown > 0) b.copyCooldown = Math.max(0, b.copyCooldown - DT);
  if (b.contactCooldown > 0) b.contactCooldown = Math.max(0, b.contactCooldown - DT);
}

function spawnChild(w: World, parent: Blob): Blob {
  parent.energy -= RULES.copyCost;
  parent.copyCooldown = RULES.copyCooldown;
  parent.births++;
  const R = w.params.worldSize;
  const a = w.rng() * Math.PI * 2;
  const x = clamp(parent.x + Math.cos(a) * 1.1, -R + 1, R - 1);
  const z = clamp(parent.z + Math.sin(a) * 1.1, -R + 1, R - 1);
  const child = makeBlob(w, parent.group, x, z, RULES.childEnergy, {
    generation: parent.generation + 1,
    parentId: parent.id,
    speedTrait: clamp(parent.speedTrait * (1 + gaussian(w.rng) * TRAIT_MUTATION), 0.6, 1.5),
    visionTrait: clamp(parent.visionTrait * (1 + gaussian(w.rng) * TRAIT_MUTATION), 0.6, 1.5),
    age: 0,
  });
  child.copyCooldown = RULES.copyCooldown * 1.5;
  w.totals.births[parent.group]++;
  pushEvent(w, { type: 'birth', id: child.id, group: parent.group, x, z });
  return child;
}

function lifecycle(w: World): void {
  const p = w.params;
  const newBlue: Blob[] = [];
  const newRed: Blob[] = [];

  for (const b of w.blue) {
    if (b.age < RULES.blueMaturity) continue;
    if (b.energy >= p.blueCopyThreshold && b.copyCooldown <= 0 && w.blue.length + newBlue.length < MAX_BLUE) {
      newBlue.push(spawnChild(w, b));
    }
  }
  for (const r of w.red) {
    if (r.age < RULES.redMaturity) continue;
    if (r.energy >= p.redCopyThreshold && r.copyCooldown <= 0 && w.red.length + newRed.length < MAX_RED) {
      newRed.push(spawnChild(w, r));
    }
  }

  for (const b of w.blue) {
    if (b.energy <= 0) {
      b.alive = false;
      w.totals.deaths.blue++;
      pushEvent(w, { type: 'death', id: b.id, group: 'blue', x: b.x, z: b.z });
    }
  }
  for (const r of w.red) {
    if (r.energy <= 0) {
      r.alive = false;
      w.totals.deaths.red++;
      pushEvent(w, { type: 'death', id: r.id, group: 'red', x: r.x, z: r.z });
    }
  }

  w.blue = w.blue.filter((b) => b.alive).concat(newBlue);
  w.red = w.red.filter((r) => r.alive).concat(newRed);
}
