// Living-garden simulation engine. Pure logic, no DOM.
// Energy rules create the waves: fruit -> blue -> red -> back down.

export const DEFAULTS = {
  fruitGrowth: 0.55,   // fruit / sec / tree when empty (logistic)
  fruitLimit: 6,       // max fruit per tree
  fruitDelay: 2.5,     // seconds after a bite before regrowth resumes
  blueEnergyUse: 1.6,  // energy / sec while moving
  blueSpeed: 34,       // world units / sec
  blueVision: 88,
  blueCopy: 80,        // energy needed to make a baby blue
  blueEatTime: 1.1,    // seconds spent chewing one fruit
  redEnergyUse: 2.1,
  redSpeed: 39,
  redVision: 98,
  redContact: 20,      // energy taken from a blue per contact
  redCopy: 84,
  redPause: 1.4,       // seconds a red pauses after contact
  startTrees: 13,
  startBlue: 26,
  startRed: 7,
  worldSize: 150,      // world radius in units
  seed: 42,
  simSpeed: 1,
};

export const FRUIT_ENERGY = 26;
export const MAX_ENERGY = 110;
const MAX_BLOBS = 260;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let nextId = 1;

function makeBlob(rng, type, x, y, parent) {
  const inherit = (v) => {
    if (!parent) return 0.92 + rng() * 0.16;
    return Math.min(1.45, Math.max(0.68, v * (1 + (rng() - 0.5) * 0.14)));
  };
  return {
    id: nextId++,
    type, x, y,
    vx: 0, vy: 0,
    energy: parent ? 30 : 48 + rng() * 22,
    age: 0,
    gen: parent ? parent.gen + 1 : 0,
    parentId: parent ? parent.id : null,
    state: 'wander',
    stateT: 0,          // time left in eat/pause state
    stateDur: 0,
    wanderA: rng() * Math.PI * 2,
    targetId: null,
    reproCd: 2 + rng() * 3,
    shield: 0,          // blue brief immunity after being bumped
    hop: rng() * Math.PI * 2,
    blink: 1 + rng() * 3,
    blinkT: 0,
    lean: 0,
    glow: 0,
    traits: {
      speed: inherit(parent?.traits.speed),
      vision: inherit(parent?.traits.vision),
      metab: inherit(parent?.traits.metab),
    },
  };
}

export function createWorld(params) {
  const p = { ...DEFAULTS, ...params };
  const rng = mulberry32(p.seed);
  nextId = 1;
  const R = p.worldSize;
  const inDisk = (rFrac) => {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * R * rFrac;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  };
  const trees = [];
  let guard = 0;
  while (trees.length < p.startTrees && guard++ < 4000) {
    const pos = inDisk(0.88);
    if (trees.every((t) => Math.hypot(t.x - pos.x, t.y - pos.y) > R * 0.16)) {
      trees.push({
        id: trees.length, x: pos.x, y: pos.y,
        fruit: p.fruitLimit * (0.6 + rng() * 0.4),
        sinceEaten: 99, sway: rng() * Math.PI * 2,
        eatenFlash: 0, scale: 0.85 + rng() * 0.4,
      });
    }
  }
  const blobs = [];
  for (let i = 0; i < p.startBlue; i++) { const q = inDisk(0.9); blobs.push(makeBlob(rng, 'blue', q.x, q.y, null)); }
  for (let i = 0; i < p.startRed; i++) { const q = inDisk(0.9); blobs.push(makeBlob(rng, 'red', q.x, q.y, null)); }
  return { p, rng, trees, blobs, time: 0, events: [], births: 0, deaths: 0 };
}

function steer(b, dx, dy, speed, dt, turn = 6) {
  const len = Math.hypot(dx, dy) || 1;
  const tx = (dx / len) * speed, ty = (dy / len) * speed;
  const k = Math.min(1, turn * dt);
  b.vx += (tx - b.vx) * k;
  b.vy += (ty - b.vy) * k;
}

export function stepWorld(w, dt) {
  const p = w.p, rng = w.rng, R = p.worldSize;
  w.time += dt;

  // --- fruit regrowth (logistic, after a delay) ---
  for (const t of w.trees) {
    t.sinceEaten += dt;
    t.eatenFlash = Math.max(0, t.eatenFlash - dt * 2);
    if (t.sinceEaten >= p.fruitDelay && t.fruit < p.fruitLimit) {
      t.fruit = Math.min(p.fruitLimit, t.fruit + p.fruitGrowth * (1 - t.fruit / p.fruitLimit) * dt);
    }
    if (t.fruit > p.fruitLimit) t.fruit = p.fruitLimit;
  }

  const blues = w.blobs.filter((b) => b.type === 'blue');
  const reds = w.blobs.filter((b) => b.type === 'red');
  const newborns = [];

  for (const b of w.blobs) {
    b.age += dt;
    b.reproCd -= dt;
    b.shield = Math.max(0, b.shield - dt);
    b.glow = Math.max(0, b.glow - dt * 1.6);
    b.blink -= dt;
    if (b.blink <= 0) { b.blink = 1.6 + rng() * 3.2; b.blinkT = 0.14; }
    b.blinkT = Math.max(0, b.blinkT - dt);

    const isBlue = b.type === 'blue';
    const baseSpeed = (isBlue ? p.blueSpeed : p.redSpeed) * b.traits.speed;
    const vision = (isBlue ? p.blueVision : p.redVision) * b.traits.vision;
    const drain = (isBlue ? p.blueEnergyUse : p.redEnergyUse) * b.traits.metab;

    // --- timed states: chewing / pausing (cannot act, small drain) ---
    if (b.state === 'eat' || b.state === 'pause') {
      b.stateT -= dt;
      b.vx *= 0.8; b.vy *= 0.8;
      b.energy -= drain * 0.3 * dt;
      if (b.stateT <= 0) b.state = 'wander';
      b.x += b.vx * dt; b.y += b.vy * dt;
      continue;
    }

    let dx = 0, dy = 0, speed = baseSpeed * 0.55, moving = false;

    if (isBlue) {
      // flee nearby reds first
      let fx = 0, fy = 0, fleeing = false;
      for (const r of reds) {
        const d = Math.hypot(b.x - r.x, b.y - r.y);
        if (d < vision * 0.85 && d > 0.01) {
          const wgt = (vision * 0.85 - d) / (vision * 0.85);
          fx += ((b.x - r.x) / d) * wgt; fy += ((b.y - r.y) / d) * wgt; fleeing = true;
        }
      }
      if (fleeing) {
        b.state = 'flee'; dx = fx; dy = fy; speed = baseSpeed * 1.28; moving = true;
      } else if (b.energy < 74) {
        // look for a tree with fruit; very hungry blues can smell farther
        const senseR = b.energy < 36 ? vision * 3.2 : vision * 1.5;
        let best = null, bestD = 1e9;
        for (const t of w.trees) {
          if (t.fruit < 1) continue;
          const d = Math.hypot(t.x - b.x, t.y - b.y);
          if (d < senseR && d < bestD) { best = t; bestD = d; }
        }
        if (best) {
          b.state = 'seek-fruit'; b.targetId = best.id;
          dx = best.x - b.x; dy = best.y - b.y; speed = baseSpeed; moving = true;
          if (bestD < 13) {
            best.fruit -= 1; best.sinceEaten = 0; best.eatenFlash = 1;
            b.energy = Math.min(MAX_ENERGY, b.energy + FRUIT_ENERGY);
            b.state = 'eat'; b.stateT = p.blueEatTime; b.stateDur = p.blueEatTime; b.glow = 1;
            w.events.push({ type: 'eat', x: b.x, y: b.y });
          }
        }
      }
      if (!moving && b.state !== 'eat') {
        b.state = 'wander';
        b.wanderA += (rng() - 0.5) * 2.4 * dt;
        dx = Math.cos(b.wanderA); dy = Math.sin(b.wanderA);
      }
      // gentle separation from crowded blues
      for (const o of blues) {
        if (o === b) continue;
        const d = Math.hypot(b.x - o.x, b.y - o.y);
        if (d < 15 && d > 0.01) { dx += ((b.x - o.x) / d) * 0.5; dy += ((b.y - o.y) / d) * 0.5; }
      }
    } else {
      // red: chase blues in vision (smell farther when hungry)
      const senseR = b.energy < 36 ? vision * 2.6 : vision;
      let best = null, bestD = 1e9;
      for (const o of blues) {
        const d = Math.hypot(o.x - b.x, o.y - b.y);
        if (d < senseR && d < bestD) { best = o; bestD = d; }
      }
      if (best) {
        b.state = 'chase'; b.targetId = best.id;
        dx = best.x - b.x; dy = best.y - b.y; speed = baseSpeed; moving = true;
        if (bestD < 15 && best.shield <= 0) {
          best.energy -= p.redContact;
          best.shield = 1.3; best.glow = 0.6;
          b.energy = Math.min(MAX_ENERGY, b.energy + p.redContact * 0.9);
          b.state = 'pause'; b.stateT = p.redPause; b.stateDur = p.redPause; b.glow = 1;
          const kb = 26 / Math.max(bestD, 4);
          best.vx += (best.x - b.x) * kb; best.vy += (best.y - b.y) * kb;
          w.events.push({ type: 'hit', x: b.x, y: b.y });
        }
      } else {
        b.state = 'wander';
        b.wanderA += (rng() - 0.5) * 2.2 * dt;
        dx = Math.cos(b.wanderA); dy = Math.sin(b.wanderA);
      }
    }

    // keep inside the dish
    const dc = Math.hypot(b.x, b.y);
    if (dc > R * 0.9) { dx += (-b.x / dc) * 1.6; dy += (-b.y / dc) * 1.6; }

    steer(b, dx, dy, speed, dt);
    b.x += b.vx * dt; b.y += b.vy * dt;
    const nc = Math.hypot(b.x, b.y);
    if (nc > R * 0.97) { b.x *= (R * 0.97) / nc; b.y *= (R * 0.97) / nc; }

    const spd = Math.hypot(b.vx, b.vy);
    b.hop += dt * (2 + spd * 0.22);
    b.lean += ((Math.max(-1, Math.min(1, b.vx / 40))) - b.lean) * Math.min(1, dt * 6);
    const moveFrac = Math.min(1, spd / Math.max(baseSpeed, 1));
    b.energy -= drain * (0.3 + 0.7 * moveFrac) * dt;

    // --- reproduction costs stored energy ---
    const copyAt = isBlue ? p.blueCopy : p.redCopy;
    if (b.energy >= copyAt && b.reproCd <= 0 && b.age > 4 && w.blobs.length + newborns.length < MAX_BLOBS) {
      b.energy -= 36; b.reproCd = 3.5;
      const child = makeBlob(rng, b.type, b.x + (rng() - 0.5) * 10, b.y + (rng() - 0.5) * 10, b);
      newborns.push(child); w.births++;
      w.events.push({ type: 'birth', x: b.x, y: b.y, color: b.type });
    }
  }

  // deaths from empty energy
  const before = w.blobs.length;
  w.blobs = w.blobs.filter((b) => {
    if (b.energy <= 0) { w.events.push({ type: 'death', x: b.x, y: b.y, color: b.type }); return false; }
    return true;
  });
  w.deaths += before - w.blobs.length;
  w.blobs.push(...newborns);
}

export function counts(w) {
  let blue = 0, red = 0, bSpeed = 0, rSpeed = 0, bVis = 0, rVis = 0;
  for (const b of w.blobs) {
    if (b.type === 'blue') { blue++; bSpeed += b.traits.speed; bVis += b.traits.vision; }
    else { red++; rSpeed += b.traits.speed; rVis += b.traits.vision; }
  }
  const fruit = w.trees.reduce((s, t) => s + t.fruit, 0);
  return {
    blue, red, fruit: Math.round(fruit),
    bSpeed: blue ? bSpeed / blue : 0, rSpeed: red ? rSpeed / red : 0,
    bVis: blue ? bVis / blue : 0, rVis: red ? rVis / red : 0,
  };
}
