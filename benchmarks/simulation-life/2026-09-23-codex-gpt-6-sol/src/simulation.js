export const defaults = {
  fruitGrowth: 0.9,
  fruitLimit: 6,
  fruitDelay: 6,
  blueDrain: 0.56,
  blueSpeed: 1.08,
  blueVision: 0.48,
  blueCopy: 87,
  blueEatTime: 1.5,
  redDrain: 0.8,
  redSpeed: 1.16,
  redVision: 0.58,
  redContact: 23,
  redCopy: 86,
  redPause: 3.2,
  trees: 13,
  blue: 14,
  red: 4,
  worldSize: 1,
  seed: 77,
  simSpeed: 6,
};

export const presets = {
  balanced: { label: 'Balanced garden', values: {} },
  rich: { label: 'Fruit-rich garden', values: { fruitGrowth: 1.15, fruitLimit: 7, trees: 14, blue: 12, red: 3 } },
  redHeavy: { label: 'Red-heavy garden', values: { red: 12, blue: 15, trees: 11, redContact: 32, redDrain: 0.87 } },
  fragile: { label: 'Fragile balance', values: { fruitGrowth: 0.58, fruitLimit: 4, trees: 9, blue: 12, red: 4, blueDrain: 0.64 } },
  sparse: { label: 'Low-fruit garden', values: { fruitGrowth: 0.28, fruitLimit: 3, fruitDelay: 11, trees: 7, blue: 9, red: 2 } },
};

function random(world) {
  world.rng = (world.rng + 0x6D2B79F5) | 0;
  let t = Math.imul(world.rng ^ (world.rng >>> 15), 1 | world.rng);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function point(world, radius = 0.88) {
  const a = random(world) * Math.PI * 2;
  const r = Math.sqrt(random(world)) * radius * world.config.worldSize;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestBlob(blobs, origin, kind, range, requireReady = false) {
  let nearest = null;
  let best = range;
  for (const candidate of blobs) {
    if (candidate.kind !== kind || candidate.energy <= 0 || (requireReady && candidate.hitCooldown > 0)) continue;
    const gap = distance(origin, candidate);
    if (gap < best) { nearest = candidate; best = gap; }
  }
  return nearest;
}

function nearestFruit(trees, origin, range) {
  let nearest = null;
  let best = range;
  for (const tree of trees) {
    if (tree.fruit <= 0) continue;
    const gap = distance(origin, tree);
    if (gap < best) { nearest = tree; best = gap; }
  }
  return nearest;
}

function makeBlob(world, kind, position, energy, generation = 0) {
  return {
    id: world.nextId++, kind, x: position.x, y: position.y,
    energy, age: 0, action: 'Wandering', timer: 0, cooldown: 7 + random(world) * 9,
    heading: random(world) * Math.PI * 2, wanderTimer: 0,
    bob: random(world) * Math.PI * 2, generation,
    speedTrait: 0.88 + random(world) * 0.24,
    visionTrait: 0.88 + random(world) * 0.24,
    pendingEnergy: 0, hitCooldown: 0,
  };
}

export function createWorld(config) {
  const seed = Number(config.seed);
  const world = {
    config: { ...config }, rng: Number.isFinite(seed) ? seed : 1,
    time: 0, nextId: 1, trees: [], blobs: [], history: [], events: [],
    births: { blue: 0, red: 0 }, losses: { blue: 0, red: 0 },
  };
  for (let i = 0; i < config.trees; i++) {
    let p = point(world, 0.77);
    for (let tries = 0; tries < 20 && world.trees.some(tree => distance(tree, p) < 0.19); tries++) p = point(world, 0.77);
    world.trees.push({ id: i, ...p, fruit: Math.max(2, config.fruitLimit - Math.floor(random(world) * 3)), growth: random(world), delay: 0, size: 0.85 + random(world) * 0.32 });
  }
  for (let i = 0; i < config.blue; i++) world.blobs.push(makeBlob(world, 'blue', point(world), 58 + random(world) * 31));
  for (let i = 0; i < config.red; i++) world.blobs.push(makeBlob(world, 'red', point(world), 56 + random(world) * 28));
  record(world);
  return world;
}

function record(world) {
  world.history.push({
    time: world.time,
    fruit: world.trees.reduce((n, tree) => n + tree.fruit, 0),
    blue: world.blobs.filter(blob => blob.kind === 'blue').length,
    red: world.blobs.filter(blob => blob.kind === 'red').length,
  });
  if (world.history.length > 360) world.history.shift();
}

function seek(blob, target, speed, dt, world, action) {
  const dx = target.x - blob.x;
  const dy = target.y - blob.y;
  const d = Math.hypot(dx, dy) || 1;
  blob.heading = Math.atan2(dy, dx);
  const step = Math.min(d, speed * dt);
  blob.x += (dx / d) * step;
  blob.y += (dy / d) * step;
  const edge = world.config.worldSize * 0.91;
  const r = Math.hypot(blob.x, blob.y);
  if (r > edge) { blob.x *= edge / r; blob.y *= edge / r; blob.heading += Math.PI; }
  blob.action = action;
  return step;
}

function wander(blob, speed, dt, world) {
  blob.wanderTimer -= dt;
  if (blob.wanderTimer <= 0) {
    blob.heading += (random(world) - 0.5) * 2.5;
    blob.wanderTimer = 1.2 + random(world) * 3;
  }
  const target = { x: blob.x + Math.cos(blob.heading), y: blob.y + Math.sin(blob.heading) };
  return seek(blob, target, speed * 0.54, dt, world, 'Wandering') * 0.15;
}

export function advance(world, dt) {
  const c = world.config;
  world.time += dt;
  world.events = world.events.filter(event => world.time - event.time < 1.2);

  for (const tree of world.trees) {
    if (tree.delay > 0) tree.delay = Math.max(0, tree.delay - dt);
    else if (tree.fruit < c.fruitLimit) {
      tree.growth += dt * c.fruitGrowth / 10;
      if (tree.growth >= 1) { tree.fruit++; tree.growth -= 1; }
    }
    tree.fruit = Math.min(tree.fruit, c.fruitLimit);
  }

  const newborns = [];
  const alive = [];
  for (const blob of world.blobs) {
    blob.age += dt;
    blob.cooldown = Math.max(0, blob.cooldown - dt);
    blob.hitCooldown = Math.max(0, blob.hitCooldown - dt);
    const blue = blob.kind === 'blue';
    const moveSpeed = (blue ? c.blueSpeed : c.redSpeed) * blob.speedTrait * 0.105;
    let moved = 0;

    if (blob.timer > 0) {
      blob.timer = Math.max(0, blob.timer - dt);
      if (blob.timer === 0) {
        blob.energy = Math.min(112, blob.energy + blob.pendingEnergy);
        blob.pendingEnergy = 0;
        blob.action = 'Resting';
      }
    } else if (blue) {
      const danger = nearestBlob(world.blobs, blob, 'red', 0.24 * c.worldSize);
      if (danger) {
        const d = distance(blob, danger) || 0.01;
        moved = seek(blob, { x: blob.x + (blob.x - danger.x) / d, y: blob.y + (blob.y - danger.y) / d }, moveSpeed * 1.32, dt, world, 'Fleeing red');
      } else {
        const vision = c.blueVision * blob.visionTrait * c.worldSize;
        const food = nearestFruit(world.trees, blob, vision);
        if (food && blob.energy < 102) {
          if (distance(blob, food) < 0.085 * c.worldSize) {
            food.fruit--;
            food.delay = c.fruitDelay;
            blob.action = 'Eating fruit';
            blob.timer = c.blueEatTime;
            blob.pendingEnergy = 26;
            world.events.push({ type: 'eat', x: food.x, y: food.y, time: world.time });
          } else moved = seek(blob, food, moveSpeed, dt, world, 'Seeking fruit');
        } else moved = wander(blob, moveSpeed, dt, world);
      }
    } else {
      const vision = c.redVision * blob.visionTrait * c.worldSize;
      const prey = nearestBlob(world.blobs, blob, 'blue', vision, true);
      if (prey) {
        if (distance(blob, prey) < 0.077 * c.worldSize) {
          prey.energy -= c.redContact * 0.62;
          prey.hitCooldown = 11;
          prey.action = 'Recovering';
          blob.action = 'Happy pause';
          blob.timer = c.redPause;
          blob.pendingEnergy = c.redContact;
          world.events.push({ type: 'contact', x: (blob.x + prey.x) / 2, y: (blob.y + prey.y) / 2, time: world.time });
        } else moved = seek(blob, prey, moveSpeed, dt, world, 'Seeking blue');
      } else moved = wander(blob, moveSpeed, dt, world);
    }

    const restingUse = blue ? c.blueDrain : c.redDrain * (blob.action === 'Wandering' ? 0.32 : blob.action === 'Happy pause' ? 0.58 : 1);
    blob.energy -= dt * restingUse + moved * (blue ? 1.8 : 2.2);
    const lifetime = blue ? 235 : 215;
    if (blob.energy <= 0 || blob.age > lifetime + (blob.id % 9) * 4) {
      world.losses[blob.kind]++;
      continue;
    }

    const threshold = blue ? c.blueCopy : c.redCopy;
    const cost = blue ? 45 : 46;
    if (blob.energy >= threshold && blob.age > 10 && blob.cooldown === 0 && world.blobs.length + newborns.length < 130) {
      blob.energy -= cost;
      blob.cooldown = blue ? 13 : 20;
      const child = makeBlob(world, blob.kind, { x: blob.x + (random(world) - 0.5) * 0.09, y: blob.y + (random(world) - 0.5) * 0.09 }, 29, blob.generation + 1);
      child.cooldown = 13 + random(world) * 5;
      newborns.push(child);
      world.births[blob.kind]++;
      world.events.push({ type: 'birth', x: blob.x, y: blob.y, time: world.time });
    }
    alive.push(blob);
  }
  world.blobs = alive.concat(newborns);
  const last = world.history.at(-1);
  if (world.time - last.time >= 1.5) record(world);
  return world;
}

export function snapshot(world) {
  let blue = 0;
  let red = 0;
  for (const blob of world.blobs) {
    if (blob.kind === 'blue') blue++;
    else red++;
  }
  const previous = world.history.at(-12) ?? world.history[0];
  return {
    fruit: world.trees.reduce((n, tree) => n + tree.fruit, 0),
    blue,
    red,
    time: world.time,
    births: { ...world.births }, losses: { ...world.losses },
    trend: { blue: blue - previous.blue, red: red - previous.red },
  };
}
