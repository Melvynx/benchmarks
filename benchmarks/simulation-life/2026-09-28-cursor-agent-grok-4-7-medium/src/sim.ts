import type { Action, Params, Sample } from "./types.ts";

const MEAL = 5.6;
const BLUE_MOVE = 0.38;
const BLUE_IDLE = 0.11;
const RED_MOVE = 0.306;
const RED_IDLE = 0.119;
const BIRTH_COST = 0.56;
const CHILD_SHARE = 0.52;
const DIGEST = 0.5;
const EAT_R = 1.12;
const HIT_R = 0.92;
const CROWD_R = 1.5;
const BIRTH_CD = 5.5;
const CHILD_CD = 4;
const TRAIT_MIN = 0.62;
const TRAIT_MAX = 1.42;

export type Blob = {
  id: number;
  group: "blue" | "red";
  x: number;
  z: number;
  vx: number;
  vz: number;
  energy: number;
  age: number;
  action: Action;
  actionTimer: number;
  actionDuration: number;
  speedTrait: number;
  visionTrait: number;
  family: number;
  generation: number;
  flash: number;
  phase: number;
  birthCd: number;
  blinkT: number;
  blinking: number;
  wanderAng: number;
  wanderT: number;
  mealTree: number | null;
};

export type Tree = {
  id: number;
  x: number;
  z: number;
  fruit: number;
  regen: number;
  sprout: number;
  nibble: number;
  spin: number;
};

export type Spark = {
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
};

export type Decor = {
  x: number;
  z: number;
  s: number;
  kind: "tuft" | "flower" | "stone";
  hue: number;
};

export type Sim = {
  params: Params;
  radius: number;
  time: number;
  rng: () => number;
  nextId: number;
  blobs: Blob[];
  trees: Tree[];
  sparks: Spark[];
  decor: Decor[];
  history: Sample[];
  recordAcc: number;
  meals: number;
  contacts: number;
  births: number;
  deaths: number;
};

export function actionLabel(action: Action): string {
  switch (action) {
    case "seek-fruit":
      return "Looking for fruit";
    case "eat":
      return "Eating";
    case "wander":
      return "Wandering";
    case "avoid-crowd":
      return "Avoiding the crowd";
    case "flee":
      return "Moving away from red blobs";
    case "hunt":
      return "Looking for blue blobs";
    case "pause":
      return "Resting after contact";
    case "digest":
      return "Settling after a meal";
  }
}

export function describeBlob(blob: Blob, params: Params) {
  const baseVision = blob.group === "blue" ? params.blueVision : params.redVision;
  const baseSpeed = blob.group === "blue" ? params.blueSpeed : params.redSpeed;
  const timed = blob.action === "eat" || blob.action === "pause" || blob.action === "digest";
  return {
    group: blob.group === "blue" ? "Blue" : "Red",
    energy: blob.energy,
    age: blob.age,
    action: actionLabel(blob.action),
    speed: Math.hypot(blob.vx, blob.vz),
    maxSpeed: baseSpeed * blob.speedTrait,
    sense: baseVision * blob.visionTrait,
    timeLeft: timed ? Math.max(0, blob.actionTimer) : null,
    family: blob.family,
    generation: blob.generation,
    speedTrait: blob.speedTrait,
    visionTrait: blob.visionTrait,
  };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function scatter(
  rng: () => number,
  count: number,
  rad: number,
  minDist: number,
): { x: number; z: number }[] {
  const pts: { x: number; z: number }[] = [];
  if (count <= 0) return pts;
  let dist = minDist;
  let guard = 0;
  while (pts.length < count && guard < 6000) {
    guard += 1;
    const ang = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * rad;
    const x = Math.cos(ang) * r;
    const z = Math.sin(ang) * r;
    let ok = true;
    for (const p of pts) {
      const dx = p.x - x;
      const dz = p.z - z;
      if (dx * dx + dz * dz < dist * dist) {
        ok = false;
        break;
      }
    }
    if (ok) pts.push({ x, z });
    if (guard % 500 === 499) dist *= 0.82;
  }
  while (pts.length < count) {
    const ang = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * rad;
    pts.push({ x: Math.cos(ang) * r, z: Math.sin(ang) * r });
  }
  return pts;
}

function clampInside(x: number, z: number, radius: number) {
  const r = Math.hypot(x, z);
  const limit = Math.max(0.4, radius);
  if (r <= limit) return { x, z };
  const k = limit / r;
  return { x: x * k, z: z * k };
}

function trait(rng: () => number, base = 1) {
  return clamp(base + (rng() * 2 - 1) * 0.06, TRAIT_MIN, TRAIT_MAX);
}

export function createSim(params: Params): Sim {
  const rng = mulberry32(Math.floor(params.seed) || 1);
  const radius = clamp(params.worldSize, 6, 40);
  const sim: Sim = {
    params,
    radius,
    time: 0,
    rng,
    nextId: 1,
    blobs: [],
    trees: [],
    sparks: [],
    decor: [],
    history: [],
    recordAcc: 0,
    meals: 0,
    contacts: 0,
    births: 0,
    deaths: 0,
  };

  const decorCount = 36;
  for (let i = 0; i < decorCount; i += 1) {
    const ang = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * radius * 0.9;
    const roll = rng();
    sim.decor.push({
      x: Math.cos(ang) * r,
      z: Math.sin(ang) * r,
      s: 0.6 + rng() * 0.8,
      kind: roll < 0.62 ? "tuft" : roll < 0.84 ? "flower" : "stone",
      hue: rng(),
    });
  }

  const treePts = scatter(rng, Math.max(0, Math.round(params.trees)), radius * 0.72, radius * 0.2);
  for (const pt of treePts) {
    sim.trees.push({
      id: sim.nextId++,
      x: pt.x,
      z: pt.z,
      fruit: Math.max(1, params.fruitLimit),
      regen: 0,
      sprout: 0,
      nibble: 0,
      spin: rng() * Math.PI * 2,
    });
  }

  const bluePts = scatter(rng, Math.max(0, Math.round(params.blues)), radius * 0.78, 0.9);
  for (const pt of bluePts) spawnBlob(sim, "blue", pt.x, pt.z, true);
  const redPts = scatter(rng, Math.max(0, Math.round(params.reds)), radius * 0.78, 0.9);
  for (const pt of redPts) spawnBlob(sim, "red", pt.x, pt.z, true);

  pushSample(sim);
  return sim;
}

function spawnBlob(sim: Sim, group: "blue" | "red", x: number, z: number, initial: boolean, parent?: Blob) {
  const params = sim.params;
  const pos = clampInside(x, z, sim.radius - 0.7);
  const threshold = group === "blue" ? params.blueCopy : params.redCopy;
  const id = sim.nextId++;
  let energy: number;
  if (parent) {
    energy = threshold * BIRTH_COST * CHILD_SHARE;
  } else if (group === "blue") {
    energy = threshold * (0.62 + sim.rng() * 0.28);
  } else {
    energy = threshold * (0.5 + sim.rng() * 0.28);
  }
  const blob: Blob = {
    id,
    group,
    x: pos.x,
    z: pos.z,
    vx: 0,
    vz: 0,
    energy,
    age: 0,
    action: "wander",
    actionTimer: 0,
    actionDuration: 0,
    speedTrait: parent ? clamp(parent.speedTrait + (sim.rng() * 2 - 1) * 0.08, TRAIT_MIN, TRAIT_MAX) : trait(sim.rng),
    visionTrait: parent ? clamp(parent.visionTrait + (sim.rng() * 2 - 1) * 0.08, TRAIT_MIN, TRAIT_MAX) : trait(sim.rng),
    family: parent ? parent.family : id,
    generation: parent ? parent.generation + 1 : 1,
    flash: 0,
    phase: sim.rng() * Math.PI * 2,
    birthCd: initial ? sim.rng() * 4 : CHILD_CD,
    blinkT: 1 + sim.rng() * 4,
    blinking: 0,
    wanderAng: sim.rng() * Math.PI * 2,
    wanderT: sim.rng() * 2,
    mealTree: null,
  };
  sim.blobs.push(blob);
  return blob;
}

function burst(sim: Sim, x: number, z: number, y: number, color: string) {
  for (let i = 0; i < 5; i += 1) {
    const ang = sim.rng() * Math.PI * 2;
    const spd = 0.35 + sim.rng() * 0.9;
    sim.sparks.push({
      x,
      z,
      y,
      vx: Math.cos(ang) * spd,
      vz: Math.sin(ang) * spd,
      vy: 0.6 + sim.rng() * 1.1,
      life: 0.28 + sim.rng() * 0.22,
      max: 0.5,
      color,
      size: 0.07 + sim.rng() * 0.07,
    });
  }
  if (sim.sparks.length > 120) sim.sparks.splice(0, sim.sparks.length - 120);
}

function nearestBlob(sim: Sim, self: Blob, group: "blue" | "red", rad: number) {
  let best: Blob | null = null;
  let bestD = rad;
  for (const other of sim.blobs) {
    if (other === self || other.group !== group || other.energy <= 0) continue;
    const d = Math.hypot(other.x - self.x, other.z - self.z);
    if (d < bestD) {
      best = other;
      bestD = d;
    }
  }
  return best ? { blob: best, d: bestD } : null;
}

function nearestTree(sim: Sim, self: Blob, rad: number) {
  let best: Tree | null = null;
  let bestD = rad;
  for (const tree of sim.trees) {
    if (tree.fruit < 1) continue;
    const d = Math.hypot(tree.x - self.x, tree.z - self.z);
    if (d < bestD) {
      best = tree;
      bestD = d;
    }
  }
  return best;
}

function separation(sim: Sim, self: Blob) {
  let x = 0;
  let z = 0;
  let n = 0;
  for (const other of sim.blobs) {
    if (other === self || other.group !== self.group || other.energy <= 0) continue;
    const dx = self.x - other.x;
    const dz = self.z - other.z;
    const d2 = dx * dx + dz * dz;
    if (d2 > 0.0001 && d2 < CROWD_R * CROWD_R) {
      const d = Math.sqrt(d2);
      x += dx / d;
      z += dz / d;
      n += 1;
    }
  }
  return { x, z, n };
}

function steer(sim: Sim, blob: Blob, gx: number, gz: number, speed: number, dt: number, arrive: boolean) {
  let dx = gx - blob.x;
  let dz = gz - blob.z;
  const goal = Math.hypot(dx, dz);
  const sep = separation(sim, blob);
  if (goal > 0.001) {
    dx /= goal;
    dz /= goal;
  }
  dx += sep.x * 0.28;
  dz += sep.z * 0.28;
  const r = Math.hypot(blob.x, blob.z);
  const edge = sim.radius * 0.86;
  if (r > edge) {
    dx += (-blob.x / r) * 1.7;
    dz += (-blob.z / r) * 1.7;
  }
  const wob = Math.sin(sim.time * 2.5 + blob.phase) * 0.16;
  const px = -dz * wob;
  const pz = dx * wob;
  dx += px;
  dz += pz;
  const mag = Math.hypot(dx, dz) || 1;
  dx /= mag;
  dz /= mag;
  let spd = speed;
  if (arrive && goal < 0.45) spd = speed * (goal / 0.45);
  const k = 1 - Math.exp(-7 * dt);
  blob.vx += (dx * spd - blob.vx) * k;
  blob.vz += (dz * spd - blob.vz) * k;
  blob.x += blob.vx * dt;
  blob.z += blob.vz * dt;
  const next = clampInside(blob.x, blob.z, sim.radius - 0.55);
  blob.x = next.x;
  blob.z = next.z;
}

function moveFree(sim: Sim, blob: Blob, dt: number) {
  const p = sim.params;
  let action: Action = "wander";
  let gx = blob.x;
  let gz = blob.z;
  let speedMul = 1;
  let arrive = false;

  if (blob.group === "blue") {
    const sense = p.blueVision * blob.visionTrait;
    const fleeR = Math.min(3.15, Math.max(1.15, sense * 0.4));
    const threat = nearestBlob(sim, blob, "red", fleeR);
    if (threat) {
      action = "flee";
      gx = blob.x - (threat.blob.x - blob.x);
      gz = blob.z - (threat.blob.z - blob.z);
      speedMul = 1.05;
    } else if (blob.energy < p.blueCopy * 0.82) {
      const tree = nearestTree(sim, blob, sense);
      if (tree) {
        action = "seek-fruit";
        gx = tree.x;
        gz = tree.z;
        arrive = true;
        if (blob.energy < p.blueCopy * 0.4) speedMul = 1.08;
      }
    }
    if (action === "wander") {
      const sep = separation(sim, blob);
      if (sep.n >= 3) {
        action = "avoid-crowd";
        gx = blob.x + sep.x;
        gz = blob.z + sep.z;
      }
    }
  } else {
    const sense = p.redVision * blob.visionTrait;
    const prey = nearestBlob(sim, blob, "blue", sense);
    if (prey) {
      action = "hunt";
      gx = prey.blob.x;
      gz = prey.blob.z;
      arrive = true;
      speedMul = 1.14;
    }
  }

  if (action === "wander") {
    blob.wanderT -= dt;
    if (blob.wanderT <= 0) {
      blob.wanderAng = sim.rng() * Math.PI * 2;
      blob.wanderT = 0.9 + sim.rng() * 2.4;
    }
    gx = blob.x + Math.cos(blob.wanderAng) * 3;
    gz = blob.z + Math.sin(blob.wanderAng) * 3;
  }

  const base = (blob.group === "blue" ? p.blueSpeed : p.redSpeed) * blob.speedTrait * speedMul;
  steer(sim, blob, gx, gz, base, dt, arrive);
  blob.action = action;
}

function growTrees(sim: Sim, dt: number) {
  const p = sim.params;
  const limit = Math.max(0, p.fruitLimit);
  for (const tree of sim.trees) {
    if (tree.nibble > 0) tree.nibble = Math.max(0, tree.nibble - dt);
    if (tree.sprout > 0) tree.sprout = Math.max(0, tree.sprout - dt);
    if (tree.fruit > limit) tree.fruit = limit;
    if (tree.regen > 0) {
      tree.regen = Math.max(0, tree.regen - dt);
      continue;
    }
    if (tree.fruit < limit) {
      const before = tree.fruit;
      tree.fruit = Math.min(limit, tree.fruit + Math.max(0, p.fruitGrowth) * dt);
      if (Math.floor(tree.fruit + 1e-6) > Math.floor(before + 1e-6)) {
        tree.sprout = 0.4;
        burst(sim, tree.x, tree.z, 1.25, "#c6ef7a");
      }
    }
  }
}

function updateEat(sim: Sim, blob: Blob, dt: number) {
  blob.actionTimer -= dt;
  blob.vx = 0;
  blob.vz = 0;
  if (blob.actionTimer > 0) return;
  const cap = sim.params.blueCopy * 1.7;
  blob.energy = Math.min(cap, blob.energy + MEAL);
  blob.action = "digest";
  blob.actionTimer = DIGEST;
  blob.actionDuration = DIGEST;
  blob.flash = 0.45;
  sim.meals += 1;
  burst(sim, blob.x, blob.z, 0.7, "#d9f5a8");
}

function updatePause(blob: Blob, dt: number) {
  blob.actionTimer -= dt;
  blob.vx = 0;
  blob.vz = 0;
  if (blob.actionTimer <= 0) blob.action = "wander";
}

function updateDigest(sim: Sim, blob: Blob, dt: number) {
  blob.actionTimer -= dt;
  const tree = blob.mealTree != null ? sim.trees.find((t) => t.id === blob.mealTree) : null;
  if (tree) {
    const speed = sim.params.blueSpeed * blob.speedTrait * 0.55;
    steer(sim, blob, blob.x * 2 - tree.x, blob.z * 2 - tree.z, speed, dt, false);
  } else {
    blob.vx *= Math.max(0, 1 - 4 * dt);
    blob.vz *= Math.max(0, 1 - 4 * dt);
    blob.x += blob.vx * dt;
    blob.z += blob.vz * dt;
  }
  if (blob.actionTimer <= 0) {
    blob.action = "wander";
    blob.mealTree = null;
  }
}

function updateFlee(sim: Sim, blob: Blob, dt: number) {
  blob.actionTimer -= dt;
  const sense = sim.params.blueVision * blob.visionTrait;
  const threat = nearestBlob(sim, blob, "red", Math.min(4.2, Math.max(1.6, sense * 0.5)));
  const speed = sim.params.blueSpeed * blob.speedTrait * 1.05;
  if (threat) {
    steer(
      sim,
      blob,
      blob.x - (threat.blob.x - blob.x),
      blob.z - (threat.blob.z - blob.z),
      speed,
      dt,
      false,
    );
  } else {
    const mag = Math.hypot(blob.vx, blob.vz) || 1;
    steer(sim, blob, blob.x + (blob.vx / mag) * 2, blob.z + (blob.vz / mag) * 2, speed, dt, false);
  }
  if (blob.actionTimer <= 0) blob.action = "wander";
  else blob.action = "flee";
}

function tryStartEat(sim: Sim, blob: Blob) {
  if (blob.group !== "blue") return;
  if (blob.action === "eat" || blob.action === "digest" || blob.action === "pause" || blob.action === "flee") return;
  const cap = sim.params.blueCopy * 1.55;
  if (blob.energy >= cap) return;
  let tree: Tree | null = null;
  let best = EAT_R;
  for (const candidate of sim.trees) {
    if (candidate.fruit < 1) continue;
    const d = Math.hypot(candidate.x - blob.x, candidate.z - blob.z);
    if (d < best) {
      tree = candidate;
      best = d;
    }
  }
  if (!tree) return;
  tree.fruit -= 1;
  tree.regen = Math.max(0, sim.params.fruitDelay);
  tree.nibble = 0.28;
  blob.action = "eat";
  blob.actionDuration = Math.max(0.12, sim.params.blueEat);
  blob.actionTimer = blob.actionDuration;
  blob.mealTree = tree.id;
  blob.vx = 0;
  blob.vz = 0;
  burst(sim, tree.x, tree.z, 1.15, "#b7e56a");
}

const hitThisStep = new Set<number>();

function nearTree(sim: Sim, blob: Blob) {
  for (const tree of sim.trees) {
    const dx = tree.x - blob.x;
    const dz = tree.z - blob.z;
    if (dx * dx + dz * dz < 1.7) return true;
  }
  return false;
}

function tryContact(sim: Sim, blob: Blob) {
  if (blob.group !== "red") return;
  if (blob.action === "pause") return;
  let prey: Blob | null = null;
  let best = HIT_R;
  for (const other of sim.blobs) {
    if (other.group !== "blue" || other.energy <= 0 || hitThisStep.has(other.id)) continue;
    if (other.action === "flee" && other.actionTimer > 0.2) continue;
    const d = Math.hypot(other.x - blob.x, other.z - blob.z);
    const reach = nearTree(sim, other) ? HIT_R * 0.62 : HIT_R;
    if (d < reach && d < best) {
      prey = other;
      best = d;
    }
  }
  if (!prey) return;
  hitThisStep.add(prey.id);
  if (prey.action === "eat") {
    const total = Math.max(0.05, prey.actionDuration);
    const done = clamp(1 - prey.actionTimer / total, 0, 1);
    prey.energy += MEAL * done;
    prey.mealTree = null;
  }
  const taken = Math.min(Math.max(0, sim.params.redContact), prey.energy);
  prey.energy -= taken;
  const redCap = sim.params.redCopy * 1.75;
  blob.energy = Math.min(redCap, blob.energy + taken);
  blob.action = "pause";
  blob.actionDuration = Math.max(0.08, sim.params.redPause);
  blob.actionTimer = blob.actionDuration;
  blob.vx = 0;
  blob.vz = 0;
  blob.flash = 0.5;
  prey.flash = 0.55;
  prey.action = "flee";
  prey.actionTimer = 0.7;
  prey.actionDuration = 0.7;
  sim.contacts += 1;
  burst(sim, (blob.x + prey.x) / 2, (blob.z + prey.z) / 2, 0.6, "#ffe08a");
}

function metabolize(sim: Sim, blob: Blob, dt: number) {
  const moving = Math.hypot(blob.vx, blob.vz) > 0.18;
  const use = blob.group === "blue" ? sim.params.blueUse : sim.params.redUse;
  const move = blob.group === "blue" ? BLUE_MOVE : RED_MOVE;
  const idle = blob.group === "blue" ? BLUE_IDLE : RED_IDLE;
  const traitBurn = 0.78 + 0.32 * blob.speedTrait;
  const senseTax = 0.035 * blob.visionTrait;
  const rate = (moving ? move * traitBurn : idle) * use + senseTax;
  blob.energy -= rate * dt;
}

function tryBirth(sim: Sim, blob: Blob, births: Blob[]) {
  if (blob.birthCd > 0 || blob.energy <= 0) return;
  if (blob.action === "eat" || blob.action === "pause" || blob.action === "digest") return;
  if (sim.blobs.length + births.length >= 260) return;
  const threshold = blob.group === "blue" ? sim.params.blueCopy : sim.params.redCopy;
  if (blob.energy < threshold) return;
  const cost = threshold * BIRTH_COST;
  if (blob.energy - cost < 1.4) return;
  blob.energy -= cost;
  blob.birthCd = BIRTH_CD;
  const ang = sim.rng() * Math.PI * 2;
  const dist = 0.55 + sim.rng() * 0.35;
  const before = sim.blobs.length;
  const child = spawnBlob(sim, blob.group, blob.x + Math.cos(ang) * dist, blob.z + Math.sin(ang) * dist, false, blob);
  sim.blobs.pop();
  if (sim.blobs.length !== before) return;
  births.push(child);
  sim.births += 1;
  burst(sim, child.x, child.z, 0.4, blob.group === "blue" ? "#9ecbff" : "#ffb1a8");
}

function pushSample(sim: Sim) {
  const blues = sim.blobs.filter((b) => b.group === "blue");
  const reds = sim.blobs.filter((b) => b.group === "red");
  const avg = (list: Blob[], key: "speedTrait" | "visionTrait") => {
    if (!list.length) return null;
    let s = 0;
    for (const blob of list) s += blob[key];
    return s / list.length;
  };
  let fruit = 0;
  for (const tree of sim.trees) fruit += tree.fruit;
  sim.history.push({
    t: sim.time,
    fruit,
    blue: blues.length,
    red: reds.length,
    blueSpeed: avg(blues, "speedTrait"),
    redSpeed: avg(reds, "speedTrait"),
    blueVision: avg(blues, "visionTrait"),
    redVision: avg(reds, "visionTrait"),
  });
  if (sim.history.length > 3600) sim.history.splice(0, sim.history.length - 3600);
}

function stepOnce(sim: Sim, dt: number) {
  sim.time += dt;
  hitThisStep.clear();
  growTrees(sim, dt);

  for (let i = sim.sparks.length - 1; i >= 0; i -= 1) {
    const spark = sim.sparks[i];
    spark.life -= dt;
    spark.x += spark.vx * dt;
    spark.z += spark.vz * dt;
    spark.y += spark.vy * dt;
    spark.vy -= 3.2 * dt;
    if (spark.life <= 0) sim.sparks.splice(i, 1);
  }

  for (const blob of sim.blobs) {
    if (blob.energy <= 0) continue;
    blob.age += dt;
    blob.flash = Math.max(0, blob.flash - dt);
    blob.birthCd = Math.max(0, blob.birthCd - dt);
    blob.blinkT -= dt;
    if (blob.blinking > 0) blob.blinking = Math.max(0, blob.blinking - dt);
    if (blob.blinkT <= 0) {
      blob.blinking = 0.12;
      blob.blinkT = 1.8 + sim.rng() * 4.2;
    }
    if (blob.action === "eat") updateEat(sim, blob, dt);
    else if (blob.action === "pause") updatePause(blob, dt);
    else if (blob.action === "digest") updateDigest(sim, blob, dt);
    else if (blob.action === "flee" && blob.actionTimer > 0) updateFlee(sim, blob, dt);
    else moveFree(sim, blob, dt);
  }

  for (const blob of sim.blobs) {
    if (blob.energy <= 0) continue;
    if (blob.group === "blue") tryStartEat(sim, blob);
    else tryContact(sim, blob);
  }

  const births: Blob[] = [];
  for (const blob of sim.blobs) {
    if (blob.energy <= 0) continue;
    metabolize(sim, blob, dt);
    tryBirth(sim, blob, births);
  }

  const before = sim.blobs.length;
  sim.blobs = sim.blobs.filter((blob) => blob.energy > 0);
  sim.deaths += before - sim.blobs.length;
  for (const child of births) sim.blobs.push(child);

  sim.recordAcc += dt;
  if (sim.recordAcc >= 0.5) {
    sim.recordAcc -= 0.5;
    pushSample(sim);
  }
}

export function stepSim(sim: Sim, dt: number) {
  if (!(dt > 0)) return;
  const steps = Math.max(1, Math.round(dt / 0.05));
  const h = dt / steps;
  for (let i = 0; i < steps; i += 1) stepOnce(sim, h);
}

export function fruitTotal(sim: Sim) {
  let fruit = 0;
  for (const tree of sim.trees) fruit += tree.fruit;
  return fruit;
}

export function countGroup(sim: Sim, group: "blue" | "red") {
  let n = 0;
  for (const blob of sim.blobs) if (blob.group === group && blob.energy > 0) n += 1;
  return n;
}
