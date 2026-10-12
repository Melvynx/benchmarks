import type { Settings } from "./settings.ts";

export type Group = "blue" | "red";
export type BlueState = "eat" | "seek" | "gather" | "wander" | "crowded" | "flee" | "shy" | "birth";
export type RedState = "hunt" | "roam" | "contact" | "birth";
export type BlobState = BlueState | RedState;

export interface Tree {
  id: number;
  x: number;
  y: number;
  fruit: number;
  growth: number;
  cooldown: number;
}

export interface Blob {
  id: number;
  group: Group;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  age: number;
  speedGene: number;
  visionGene: number;
  state: BlobState;
  pause: number;
  pauseTotal: number;
  pauseKind: "none" | "eat" | "contact" | "shy" | "birth";
  targetTree: number;
  wander: number;
  flee: number;
  flash: number;
  eaten: number;
  contacts: number;
  children: number;
  parent: number;
}

export interface Totals {
  blueBirths: number;
  redBirths: number;
  blueDeaths: number;
  redDeaths: number;
  fruitEaten: number;
  contacts: number;
}

export interface World {
  s: Settings;
  R: number;
  t: number;
  rng: () => number;
  nextId: number;
  trees: Tree[];
  blues: Blob[];
  reds: Blob[];
  totals: Totals;
}

export interface Snapshot {
  t: number;
  fruit: number;
  blue: number;
  red: number;
  blueEnergy: number;
  redEnergy: number;
  blueSpeed: number;
  blueVision: number;
  redSpeed: number;
  redVision: number;
}

export const SIM_DT = 0.05;

const FRUIT_ENERGY = 42;
const MAX_ENERGY = 100;
const COPY_COST = 35;
const CHILD_ENERGY = 30;
const POP_CAP = 700;
const HUNGRY = 70;
const EAT_RANGE = 0.1;
const CONTACT_RANGE = 0.05;
const BLUE_LOSS_RATIO = 1.0;
const SHY_TIME = 0.5;
const BIRTH_PAUSE = 0.6;
const FLEE_RANGE = 0.09;
const FLEE_TIME = 1.2;
const CROWD_RANGE = 0.08;
const CROWD_LIMIT = 4;
const TREE_SPACING = 0.22;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number): number {
  const u = Math.max(1e-9, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function createWorld(s: Settings): World {
  const rng = mulberry32(s.seed);
  const R = s.worldSize;
  const w: World = {
    s,
    R,
    t: 0,
    rng,
    nextId: 1,
    trees: [],
    blues: [],
    reds: [],
    totals: { blueBirths: 0, redBirths: 0, blueDeaths: 0, redDeaths: 0, fruitEaten: 0, contacts: 0 },
  };

  let tries = 0;
  while (w.trees.length < s.trees && tries < 4000) {
    tries++;
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 0.8 * R;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    const ok = w.trees.every((t) => (t.x - x) ** 2 + (t.y - y) ** 2 >= (TREE_SPACING * R) ** 2);
    if (ok) {
      w.trees.push({ id: w.trees.length, x, y, fruit: s.fruitLimit, growth: 0, cooldown: 0 });
    }
  }

  for (let i = 0; i < s.blueStart; i++) w.blues.push(spawnRandom(w, "blue", 55));
  for (let i = 0; i < s.redStart; i++) w.reds.push(spawnRandom(w, "red", 55));
  return w;
}

function spawnRandom(w: World, group: Group, energy: number): Blob {
  const a = w.rng() * Math.PI * 2;
  const r = Math.sqrt(w.rng()) * 0.85 * w.R;
  return {
    id: w.nextId++,
    group,
    x: Math.cos(a) * r,
    y: Math.sin(a) * r,
    vx: 0,
    vy: 0,
    energy,
    age: 0,
    speedGene: 1,
    visionGene: 1,
    state: group === "blue" ? "wander" : "roam",
    pause: 0,
    pauseTotal: 0,
    pauseKind: "none",
    targetTree: -1,
    wander: w.rng() * Math.PI * 2,
    flee: 0,
    flash: 0,
    eaten: 0,
    contacts: 0,
    children: 0,
    parent: 0,
  };
}

function makeChild(w: World, p: Blob, group: Group): Blob {
  const a = w.rng() * Math.PI * 2;
  const d = 0.03 * w.R;
  const x = clamp(p.x + Math.cos(a) * d, -w.R, w.R);
  const y = clamp(p.y + Math.sin(a) * d, -w.R, w.R);
  return {
    id: w.nextId++,
    group,
    x,
    y,
    vx: 0,
    vy: 0,
    energy: CHILD_ENERGY,
    age: 0,
    speedGene: clamp(p.speedGene + gauss(w.rng) * 0.05, 0.6, 1.5),
    visionGene: clamp(p.visionGene + gauss(w.rng) * 0.05, 0.6, 1.5),
    state: group === "blue" ? "birth" : "birth",
    pause: BIRTH_PAUSE,
    pauseTotal: BIRTH_PAUSE,
    pauseKind: "birth",
    targetTree: -1,
    wander: w.rng() * Math.PI * 2,
    flee: 0,
    flash: 1,
    eaten: 0,
    contacts: 0,
    children: 0,
    parent: p.id,
  };
}

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

function integrate(w: World, e: Body, dt: number): void {
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  const lim = w.R * 0.94;
  const r2 = e.x * e.x + e.y * e.y;
  if (r2 > lim * lim) {
    const r = Math.sqrt(r2);
    const nx = e.x / r;
    const ny = e.y / r;
    e.x = nx * lim;
    e.y = ny * lim;
    const vn = e.vx * nx + e.vy * ny;
    if (vn > 0) {
      e.vx -= 1.6 * vn * nx;
      e.vy -= 1.6 * vn * ny;
    }
  }
}

function steer(b: Blob, dirX: number, dirY: number, speed: number, dt: number): void {
  const k = Math.min(1, dt * 4);
  b.vx += (dirX * speed - b.vx) * k;
  b.vy += (dirY * speed - b.vy) * k;
}

function drainFor(e: Blob, moveRef: number, dt: number, use: number): void {
  const mv = Math.min(1.5, Math.hypot(e.vx, e.vy) / (moveRef || 1));
  e.energy -= use * dt * (0.35 + 0.65 * mv);
}

function updateTrees(w: World, dt: number): void {
  const s = w.s;
  for (const tr of w.trees) {
    if (tr.fruit > s.fruitLimit) tr.fruit = s.fruitLimit;
    if (tr.fruit >= s.fruitLimit) {
      tr.growth = 0;
      continue;
    }
    if (tr.cooldown > 0) {
      tr.cooldown = Math.max(0, tr.cooldown - dt);
      continue;
    }
    tr.growth += s.fruitGrowth * dt;
    if (tr.growth >= 1) {
      tr.fruit += 1;
      tr.growth = 0;
    }
  }
}

function updateBlue(w: World, b: Blob, dt: number, births: Blob[]): void {
  const s = w.s;
  const R = w.R;
  b.age += dt;
  b.flash = Math.max(0, b.flash - dt * 2.5);

  if (b.pause > 0) {
    b.pause -= dt;
    if (b.pause <= 0) {
      b.pause = 0;
      b.pauseKind = "none";
    }
    b.vx *= Math.max(0, 1 - dt * 6);
    b.vy *= Math.max(0, 1 - dt * 6);
    integrate(w, b, dt);
    b.energy -= s.blueUse * dt * 0.3;
    if (b.pauseKind === "none" || b.pause > 0) b.state = b.pauseKind === "eat" ? "eat" : b.pauseKind === "shy" ? "shy" : "birth";
    else b.state = "wander";
    settleDeath(b);
    return;
  }

  const vis = s.blueVision * R * b.visionGene;
  const spd = s.blueSpeed * R * b.speedGene;
  const refSpeed = s.blueSpeed * R * 1.3;

  let nrD2 = Infinity;
  let nrx = 0;
  let nry = 0;
  for (const r of w.reds) {
    const dx = r.x - b.x;
    const dy = r.y - b.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < nrD2) {
      nrD2 = d2;
      nrx = dx;
      nry = dy;
    }
  }

  let repX = 0;
  let repY = 0;
  let crowd = 0;
  const crowdR2 = (CROWD_RANGE * R) ** 2;
  for (const o of w.blues) {
    if (o === b) continue;
    const dx = o.x - b.x;
    const dy = o.y - b.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < crowdR2 && d2 > 1e-9) {
      crowd++;
      repX -= dx / d2;
      repY -= dy / d2;
    }
  }

  const seeR = vis * 2;
  const seeR2 = seeR * seeR;
  let tree: Tree | null = null;
  let tD2 = Infinity;
  let near: Tree | null = null;
  let nearD2 = Infinity;
  for (const tr of w.trees) {
    const dx = tr.x - b.x;
    const dy = tr.y - b.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < nearD2) {
      nearD2 = d2;
      near = tr;
    }
    if (tr.fruit > 0 && d2 < seeR2 && d2 < tD2) {
      tD2 = d2;
      tree = tr;
    }
  }

  const hungry = b.energy < HUNGRY;
  const eatR = EAT_RANGE * R;
  const fleeR = FLEE_RANGE * R;
  if (nrD2 < fleeR * fleeR) b.flee = FLEE_TIME;
  let dirX = 0;
  let dirY = 0;
  let speed = spd * 0.45;
  let state: BlueState = "wander";

  if (b.flee > 0) {
    b.flee = Math.max(0, b.flee - dt);
    const d = Math.sqrt(nrD2) || 1e-6;
    dirX = -nrx / d;
    dirY = -nry / d;
    speed = spd * 1.3;
    state = "flee";
  } else if (hungry && tree && tD2 < eatR * eatR) {
    // Eat: stop, chew, drop fruit, regrow later.
    tree.fruit -= 1;
    if (tree.cooldown <= 0) tree.cooldown = s.fruitDelay;
    b.energy = Math.min(MAX_ENERGY, b.energy + FRUIT_ENERGY);
    b.eaten++;
    w.totals.fruitEaten++;
    b.pause = s.blueEat;
    b.pauseTotal = s.blueEat;
    b.pauseKind = "eat";
    b.vx = 0;
    b.vy = 0;
    b.state = "eat";
    drainFor(b, refSpeed, dt, s.blueUse);
    settleDeath(b);
    return;
  } else if (hungry && tree) {
    const d = Math.sqrt(tD2);
    dirX = (tree.x - b.x) / d;
    dirY = (tree.y - b.y) / d;
    speed = spd;
    state = "seek";
  } else if (hungry && near) {
    // No fruit in sight: gather around the nearest tree.
    const tx = near.x + Math.cos(b.wander) * 0.12 * R;
    const ty = near.y + Math.sin(b.wander) * 0.12 * R;
    const dx = tx - b.x;
    const dy = ty - b.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    dirX = dx / d;
    dirY = dy / d;
    speed = spd * 0.8;
    state = "gather";
    b.wander += (w.rng() - 0.5) * dt * 2;
  } else {
    b.wander += (w.rng() - 0.5) * dt * 3;
    dirX = Math.cos(b.wander);
    dirY = Math.sin(b.wander);
    speed = spd * 0.45;
    state = "wander";
  }

  if (crowd >= CROWD_LIMIT && (state === "wander" || state === "gather")) {
    const rd = Math.hypot(repX, repY) || 1e-6;
    dirX = repX / rd;
    dirY = repY / rd;
    speed = spd * 0.9;
    state = "crowded";
  }

  steer(b, dirX, dirY, speed, dt);
  integrate(w, b, dt);
  drainFor(b, refSpeed, dt, s.blueUse);
  b.state = state;

  if (b.energy >= s.blueCopy && w.blues.length + w.reds.length + births.length < POP_CAP) {
    b.energy -= COPY_COST;
    b.children++;
    b.pause = BIRTH_PAUSE;
    b.pauseTotal = BIRTH_PAUSE;
    b.pauseKind = "birth";
    births.push(makeChild(w, b, "blue"));
    w.totals.blueBirths++;
    b.state = "birth";
  }
  settleDeath(b);
}

function updateRed(w: World, r: Blob, dt: number, births: Blob[]): void {
  const s = w.s;
  const R = w.R;
  r.age += dt;
  r.flash = Math.max(0, r.flash - dt * 2.5);

  if (r.pause > 0) {
    r.pause -= dt;
    if (r.pause <= 0) {
      r.pause = 0;
      r.pauseKind = "none";
    }
    r.vx *= Math.max(0, 1 - dt * 6);
    r.vy *= Math.max(0, 1 - dt * 6);
    integrate(w, r, dt);
    r.energy -= s.redUse * dt * 0.3;
    r.state = r.pauseKind === "birth" ? "birth" : "contact";
    settleDeath(r);
    return;
  }

  const vis = s.redVision * R * r.visionGene;
  const spd = s.redSpeed * R * r.speedGene;
  const refSpeed = s.redSpeed * R * 1.3;
  const cR = CONTACT_RANGE * R;

  let nb: Blob | null = null;
  let nD2 = Infinity;
  for (const b of w.blues) {
    const dx = b.x - r.x;
    const dy = b.y - r.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < nD2) {
      nD2 = d2;
      nb = b;
    }
  }

  let dirX: number;
  let dirY: number;
  let speed = spd * 0.4;
  let state: RedState = "roam";

  if (nb && nD2 <= vis * vis && nD2 < cR * cR) {
    // Gentle contact: red gains energy, blue loses a share, both pause.
    const gain = s.redContact;
    r.energy = Math.min(MAX_ENERGY, r.energy + gain);
    nb.energy = Math.max(0, nb.energy - gain * BLUE_LOSS_RATIO);
    nb.flash = 1;
    if (nb.pause <= 0) {
      nb.pause = SHY_TIME;
      nb.pauseTotal = SHY_TIME;
      nb.pauseKind = "shy";
    }
    r.pause = s.redPause;
    r.pauseTotal = s.redPause;
    r.pauseKind = "contact";
    r.contacts++;
    w.totals.contacts++;
    r.vx *= 0.2;
    r.vy *= 0.2;
    r.state = "contact";
    drainFor(r, refSpeed, dt, s.redUse);
    maybeCopyRed(w, r, births);
    settleDeath(r);
    return;
  } else if (nb && nD2 <= vis * vis) {
    const d = Math.sqrt(nD2);
    dirX = (nb.x - r.x) / d;
    dirY = (nb.y - r.y) / d;
    speed = spd;
    state = "hunt";
  } else {
    r.wander += (w.rng() - 0.5) * dt * 3;
    dirX = Math.cos(r.wander);
    dirY = Math.sin(r.wander);
    speed = spd * 0.4;
  }

  steer(r, dirX, dirY, speed, dt);
  integrate(w, r, dt);
  drainFor(r, refSpeed, dt, s.redUse);
  r.state = state;
  maybeCopyRed(w, r, births);
  settleDeath(r);
}

function maybeCopyRed(w: World, r: Blob, births: Blob[]): void {
  if (r.energy >= w.s.redCopy && w.blues.length + w.reds.length + births.length < POP_CAP) {
    r.energy -= COPY_COST;
    r.children++;
    r.pause = BIRTH_PAUSE;
    r.pauseTotal = BIRTH_PAUSE;
    r.pauseKind = "birth";
    births.push(makeChild(w, r, "red"));
    w.totals.redBirths++;
    r.state = "birth";
  }
}

// Marks dead blobs by zeroing energy; removed in the sweep below.
function settleDeath(e: Blob): void {
  if (e.energy <= 0) e.energy = 0;
}

export function step(w: World, dt: number): void {
  updateTrees(w, dt);

  const births: Blob[] = [];
  for (const b of w.blues) updateBlue(w, b, dt, births);
  for (const r of w.reds) updateRed(w, r, dt, births);

  for (const c of births) {
    if (c.group === "blue") w.blues.push(c);
    else w.reds.push(c);
  }

  const liveBlue: Blob[] = [];
  for (const b of w.blues) {
    if (b.energy > 0) liveBlue.push(b);
    else w.totals.blueDeaths++;
  }
  const liveRed: Blob[] = [];
  for (const r of w.reds) {
    if (r.energy > 0) liveRed.push(r);
    else w.totals.redDeaths++;
  }
  w.blues = liveBlue;
  w.reds = liveRed;
  w.t += dt;
}

export function snapshot(w: World): Snapshot {
  let fruit = 0;
  for (const tr of w.trees) fruit += tr.fruit;
  const nb = w.blues.length;
  const nr = w.reds.length;
  let be = 0, bs = 0, bv = 0, rE = 0, rs = 0, rv = 0;
  for (const b of w.blues) {
    be += b.energy;
    bs += b.speedGene;
    bv += b.visionGene;
  }
  for (const r of w.reds) {
    rE += r.energy;
    rs += r.speedGene;
    rv += r.visionGene;
  }
  return {
    t: w.t,
    fruit,
    blue: nb,
    red: nr,
    blueEnergy: nb ? be / nb : NaN,
    redEnergy: nr ? rE / nr : NaN,
    blueSpeed: nb ? bs / nb : NaN,
    blueVision: nb ? bv / nb : NaN,
    redSpeed: nr ? rs / nr : NaN,
    redVision: nr ? rv / nr : NaN,
  };
}
