const TAU = Math.PI * 2;
const FIXED_STEP = 0.1;
const MAX_ENERGY = 100;

export const PARAM_SCHEMA = [
  { key: "fruitGrowth", label: "Fruit growth speed", group: "garden", min: 0.01, max: 0.22, step: 0.005, decimals: 3, suffix: "/s" },
  { key: "fruitLimit", label: "Fruit limit / tree", group: "garden", min: 1, max: 8, step: 1, decimals: 0, suffix: "" },
  { key: "fruitReturnDelay", label: "Fruit return delay", group: "garden", min: 1, max: 20, step: 0.5, decimals: 1, suffix: "s" },
  { key: "blueEnergyUse", label: "Energy use", group: "blue", min: 0.2, max: 1.4, step: 0.05, decimals: 2, suffix: "/s" },
  { key: "blueSpeed", label: "Move speed", group: "blue", min: 3, max: 13, step: 0.5, decimals: 1, suffix: "u/s" },
  { key: "blueVision", label: "Sensing range", group: "blue", min: 18, max: 70, step: 1, decimals: 0, suffix: "u" },
  { key: "blueCopyThreshold", label: "Copy threshold", group: "blue", min: 62, max: 96, step: 1, decimals: 0, suffix: "%" },
  { key: "blueEatingTime", label: "Eating time", group: "blue", min: 0.5, max: 4, step: 0.1, decimals: 1, suffix: "s" },
  { key: "redEnergyUse", label: "Energy use", group: "red", min: 0.2, max: 1.3, step: 0.05, decimals: 2, suffix: "/s" },
  { key: "redSpeed", label: "Move speed", group: "red", min: 3, max: 14, step: 0.5, decimals: 1, suffix: "u/s" },
  { key: "redVision", label: "Sensing range", group: "red", min: 20, max: 80, step: 1, decimals: 0, suffix: "u" },
  { key: "redContactStrength", label: "Contact strength", group: "red", min: 8, max: 36, step: 1, decimals: 0, suffix: " energy" },
  { key: "redCopyThreshold", label: "Copy threshold", group: "red", min: 62, max: 98, step: 1, decimals: 0, suffix: "%" },
  { key: "redPauseTime", label: "Pause after contact", group: "red", min: 0.5, max: 5, step: 0.1, decimals: 1, suffix: "s" },
  { key: "startTrees", label: "Fruit trees", group: "start", min: 3, max: 14, step: 1, decimals: 0, suffix: "" },
  { key: "startBlue", label: "Blue blobs", group: "start", min: 2, max: 30, step: 1, decimals: 0, suffix: "" },
  { key: "startRed", label: "Red blobs", group: "start", min: 1, max: 24, step: 1, decimals: 0, suffix: "" },
  { key: "worldSize", label: "World size", group: "start", min: 72, max: 135, step: 1, decimals: 0, suffix: "u" }
];

const BASE_VALUES = {
  fruitGrowth: 0.055,
  fruitLimit: 4,
  fruitReturnDelay: 7.5,
  blueEnergyUse: 0.42,
  blueSpeed: 7.5,
  blueVision: 55,
  blueCopyThreshold: 79,
  blueEatingTime: 1.25,
  redEnergyUse: 0.68,
  redSpeed: 8.2,
  redVision: 47,
  redContactStrength: 19,
  redCopyThreshold: 92,
  redPauseTime: 2.4,
  startTrees: 8,
  startBlue: 16,
  startRed: 4,
  worldSize: 100,
  seed: 2847,
  simSpeed: 1
};

function preset(name, shortName, description, note, values) {
  return { name, shortName, description, note, values: Object.freeze({ ...BASE_VALUES, ...values }) };
}

export const PRESETS = Object.freeze({
  balanced: preset(
    "Balanced garden",
    "Balanced",
    "Blue rises on fruit; red follows a little later.",
    "A steady little food web, ready to wake.",
    {}
  ),
  fruitRich: preset(
    "Fruit-rich garden",
    "Fruit-rich",
    "Fast-growing fruit gives blue a bright early bloom.",
    "Branches are heavy. Expect a quick blue bloom.",
    {
      fruitGrowth: 0.145,
      fruitLimit: 7,
      fruitReturnDelay: 3,
      blueEnergyUse: 0.52,
      blueSpeed: 8.2,
      blueVision: 50,
      blueCopyThreshold: 74,
      blueEatingTime: 0.9,
      redEnergyUse: 0.6,
      redContactStrength: 19,
      redCopyThreshold: 93,
      startTrees: 10,
      startBlue: 14,
      startRed: 4,
      worldSize: 108,
      seed: 9182
    }
  ),
  redHeavy: preset(
    "Red-heavy garden",
    "Red-heavy",
    "An early red crowd presses blue, then feels the shortage.",
    "Red is already crowding in. Watch the delayed hunger.",
    {
      fruitGrowth: 0.06,
      fruitLimit: 4,
      blueCopyThreshold: 84,
      redEnergyUse: 0.46,
      redSpeed: 9.8,
      redVision: 62,
      redContactStrength: 29,
      redCopyThreshold: 75,
      redPauseTime: 1.4,
      startTrees: 8,
      startBlue: 16,
      startRed: 13,
      worldSize: 104,
      seed: 6731
    }
  ),
  fragile: preset(
    "Fragile balance",
    "Fragile",
    "Both groups survive, but small changes can tip the dish.",
    "The margins are thin; every fruit and contact matters.",
    {
      fruitGrowth: 0.043,
      fruitLimit: 3,
      fruitReturnDelay: 10,
      blueEnergyUse: 0.48,
      blueVision: 50,
      blueCopyThreshold: 86,
      blueEatingTime: 1.5,
      redEnergyUse: 0.62,
      redVision: 44,
      redContactStrength: 19,
      redCopyThreshold: 92,
      redPauseTime: 2.5,
      startTrees: 7,
      startBlue: 12,
      startRed: 3,
      worldSize: 96,
      seed: 4319
    }
  ),
  lowFruit: preset(
    "Low-fruit garden",
    "Low-fruit",
    "Slow branches keep the whole ecology small and quiet.",
    "Food is scarce. The dish may settle into a tiny world.",
    {
      fruitGrowth: 0.025,
      fruitLimit: 2,
      fruitReturnDelay: 13,
      blueEnergyUse: 0.5,
      blueSpeed: 6.5,
      blueVision: 48,
      blueCopyThreshold: 92,
      blueEatingTime: 1.8,
      redEnergyUse: 0.72,
      redSpeed: 7.8,
      redVision: 46,
      redContactStrength: 16,
      redCopyThreshold: 96,
      redPauseTime: 2.6,
      startTrees: 6,
      startBlue: 8,
      startRed: 2,
      worldSize: 92,
      seed: 2501
    }
  )
});

export function createRng(seed) {
  let value = (Number(seed) || 1) >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function magnitude(x, y) {
  return Math.hypot(x, y) || 1;
}

function randomPoint(rng, radius, minRadius = 0) {
  const angle = rng() * TAU;
  const radial = Math.sqrt(rng() * (radius * radius - minRadius * minRadius) + minRadius * minRadius);
  return { x: Math.cos(angle) * radial, y: Math.sin(angle) * radial };
}

function copyConfig(values) {
  const config = { ...BASE_VALUES, ...(values || {}) };
  for (const item of PARAM_SCHEMA) {
    config[item.key] = clamp(Number(config[item.key]), item.min, item.max);
  }
  config.seed = clamp(Math.round(Number(config.seed) || BASE_VALUES.seed), 1, 999999);
  config.simSpeed = clamp(Number(config.simSpeed) || 1, 0.25, 20);
  return config;
}

function slotAngle(index, total) {
  const rings = [
    [-0.58, -0.42], [0.48, -0.52], [-0.02, -0.78], [-0.72, 0.02],
    [0.66, -0.03], [-0.35, 0.26], [0.32, 0.25], [0.02, -0.14]
  ];
  if (index < rings.length) return rings[index];
  const angle = (index / Math.max(1, total)) * TAU - Math.PI / 2;
  return [Math.cos(angle) * 0.68, Math.sin(angle) * 0.55];
}

export class GardenSimulation {
  constructor(values = PRESETS.balanced.values) {
    this.config = copyConfig(values);
    this.reset(this.config);
  }

  reset(values = this.config) {
    this.config = copyConfig(values);
    this.rng = createRng(this.config.seed);
    this.time = 0;
    this.nextId = 1;
    this.nextHistoryAt = 1;
    this.history = [];
    this.events = [];
    this.trees = [];
    this.blues = [];
    this.reds = [];
    this.stats = {
      fruitEaten: 0,
      contacts: 0,
      blueBirths: 0,
      redBirths: 0,
      blueDeaths: 0,
      redDeaths: 0,
      energyFromFruit: 0,
      energyFromContact: 0
    };

    this.#createTrees();
    for (let i = 0; i < this.config.startBlue; i += 1) this.blues.push(this.#createBlob("blue", null, true));
    for (let i = 0; i < this.config.startRed; i += 1) this.reds.push(this.#createBlob("red", null, true));
    this.#recordHistory(0);
    return this;
  }

  #createTrees() {
    const radius = this.config.worldSize * 0.78;
    const count = Math.round(this.config.startTrees);
    for (let index = 0; index < count; index += 1) {
      const sector = (index / count) * TAU + (this.rng() - 0.5) * 0.42;
      const ring = radius * (0.3 + 0.62 * Math.sqrt((index + 0.7) / count));
      const x = Math.cos(sector) * ring + (this.rng() - 0.5) * 8;
      const y = Math.sin(sector) * ring + (this.rng() - 0.5) * 8;
      const fruitSlots = [];
      for (let slot = 0; slot < this.config.fruitLimit; slot += 1) {
        const [ox, oy] = slotAngle(slot, this.config.fruitLimit);
        fruitSlots.push({ ready: true, progress: 1, availableAt: 0, ox, oy });
      }
      this.trees.push({
        id: `T${index + 1}`,
        x,
        y,
        size: 0.86 + this.rng() * 0.28,
        tilt: (this.rng() - 0.5) * 0.3,
        fruitSlots,
        growthBank: 0,
        pulse: 0
      });
    }
  }

  #createBlob(kind, parent = null, founder = false) {
    const point = parent
      ? {
          x: parent.x + (this.rng() - 0.5) * 7,
          y: parent.y + (this.rng() - 0.5) * 7
        }
      : randomPoint(this.rng, this.config.worldSize * 0.72, this.config.worldSize * 0.08);
    const idNumber = this.nextId++;
    const baseSpeed = kind === "blue" ? this.config.blueSpeed : this.config.redSpeed;
    const baseVision = kind === "blue" ? this.config.blueVision : this.config.redVision;
    const mutation = parent ? (this.rng() - 0.5) * 0.06 : (this.rng() - 0.5) * 0.035;
    const energy = founder
      ? (kind === "blue" ? 56 : 62) + this.rng() * 15
      : kind === "blue" ? 27 : 25;
    const angle = this.rng() * TAU;
    const labelPrefix = kind === "blue" ? "B" : "R";
    return {
      id: `${labelPrefix}-${String(idNumber).padStart(3, "0")}`,
      numericId: idNumber,
      kind,
      x: clamp(point.x, -this.config.worldSize * 0.88, this.config.worldSize * 0.88),
      y: clamp(point.y, -this.config.worldSize * 0.88, this.config.worldSize * 0.88),
      vx: Math.cos(angle) * 0.4,
      vy: Math.sin(angle) * 0.4,
      heading: angle,
      energy,
      age: founder ? 7 + this.rng() * 28 : 0,
      maxAge: (kind === "blue" ? 520 : 460) + this.rng() * 150,
      action: "wandering",
      actionTimer: 0,
      actionDuration: 0,
      restAfter: 0,
      cooldown: founder ? this.rng() * 4 : 8 + this.rng() * 5,
      contactImmunity: 0,
      targetId: null,
      targetSlot: -1,
      wanderAngle: angle,
      wanderTimer: this.rng() * 3,
      copyReadyIn: founder ? 1 + this.rng() * 7 : 10 + this.rng() * 6,
      generation: parent ? parent.generation + 1 : 1,
      parentId: parent ? parent.id : null,
      bornAt: this.time,
      traits: {
        speed: clamp(baseSpeed * (1 + mutation), baseSpeed * 0.88, baseSpeed * 1.12),
        vision: clamp(baseVision * (1 - mutation * 0.5), baseVision * 0.9, baseVision * 1.1)
      },
      visualPhase: this.rng() * TAU,
      blinkAt: this.time + 2 + this.rng() * 7,
      blink: 0,
      pulse: 0,
      lowEnergySince: null
    };
  }

  setConfigValue(key, value) {
    const descriptor = PARAM_SCHEMA.find((item) => item.key === key);
    if (!descriptor) return;
    const numeric = clamp(Number(value), descriptor.min, descriptor.max);
    const previous = this.config[key];
    this.config[key] = numeric;
    if (key === "fruitLimit") this.#syncFruitSlots(Math.round(numeric));
    const liveTraitTargets = {
      blueSpeed: [this.blues, "speed"],
      blueVision: [this.blues, "vision"],
      redSpeed: [this.reds, "speed"],
      redVision: [this.reds, "vision"]
    };
    const target = liveTraitTargets[key];
    if (target && previous > 0) {
      const [population, trait] = target;
      const ratio = numeric / previous;
      for (const blob of population) blob.traits[trait] *= ratio;
    }
  }

  #syncFruitSlots(limit) {
    for (const tree of this.trees) {
      while (tree.fruitSlots.length < limit) {
        const slot = tree.fruitSlots.length;
        const [ox, oy] = slotAngle(slot, limit);
        tree.fruitSlots.push({ ready: false, progress: 0, availableAt: this.time + this.config.fruitReturnDelay, ox, oy });
      }
      if (tree.fruitSlots.length > limit) tree.fruitSlots.length = limit;
    }
  }

  step(dt = FIXED_STEP) {
    const safeDt = clamp(Number(dt) || FIXED_STEP, 0.01, 0.25);
    this.time += safeDt;
    this.#updateTrees(safeDt);

    const births = [];
    const survivorsBlue = [];
    const survivorsRed = [];

    for (const blob of this.blues) {
      if (this.#updateBlob(blob, safeDt, births)) survivorsBlue.push(blob);
      else this.#registerDeath(blob);
    }
    this.blues = survivorsBlue;

    for (const blob of this.reds) {
      if (this.#updateBlob(blob, safeDt, births)) survivorsRed.push(blob);
      else this.#registerDeath(blob);
    }
    this.reds = survivorsRed;

    const postContactBlue = [];
    for (const blob of this.blues) {
      if (blob.energy > 0) postContactBlue.push(blob);
      else this.#registerDeath(blob);
    }
    this.blues = postContactBlue;

    for (const child of births) {
      if (child.kind === "blue") this.blues.push(child);
      else this.reds.push(child);
    }

    while (this.time + 1e-8 >= this.nextHistoryAt) {
      this.#recordHistory(this.nextHistoryAt);
      this.nextHistoryAt += 1;
    }

    for (const tree of this.trees) tree.pulse = Math.max(0, tree.pulse - safeDt * 1.8);
    for (const blob of [...this.blues, ...this.reds]) blob.pulse = Math.max(0, blob.pulse - safeDt * 2.2);
    if (this.events.length > 300) this.events.splice(0, this.events.length - 300);
  }

  advance(seconds) {
    const steps = Math.max(0, Math.round(Number(seconds) / FIXED_STEP));
    for (let index = 0; index < steps; index += 1) this.step(FIXED_STEP);
    return this;
  }

  #updateTrees(dt) {
    for (const tree of this.trees) {
      const missing = tree.fruitSlots.filter((slot) => !slot.ready && slot.availableAt <= this.time);
      if (!missing.length) continue;
      tree.growthBank += this.config.fruitGrowth * dt;
      if (tree.growthBank >= 1) {
        const slot = missing[0];
        slot.ready = true;
        slot.progress = 1;
        tree.growthBank -= 1;
        tree.pulse = 1;
        this.events.push({ type: "regrow", x: tree.x, y: tree.y, time: this.time, treeId: tree.id });
      } else {
        missing[0].progress = tree.growthBank;
      }
    }
  }

  #updateBlob(blob, dt, births) {
    blob.age += dt;
    blob.cooldown = Math.max(0, blob.cooldown - dt);
    blob.contactImmunity = Math.max(0, blob.contactImmunity - dt);
    blob.wanderTimer -= dt;
    if (blob.blinkAt <= this.time) {
      blob.blink = 1;
      blob.blinkAt = this.time + 2.5 + this.rng() * 7;
    }
    blob.blink = Math.max(0, blob.blink - dt * 7);

    const locked = blob.actionTimer > 0;
    const drainMultiplier = locked ? 0.42 : 1;
    const baseUse = blob.kind === "blue" ? this.config.blueEnergyUse : this.config.redEnergyUse;
    const sameGroup = blob.kind === "blue" ? this.blues : this.reds;
    const density = this.#nearbyCount(blob, sameGroup, 15);
    const densityCost = Math.max(0, density - 3) * 0.025;
    blob.energy -= (baseUse * drainMultiplier + densityCost) * dt;

    if (blob.energy < 18 && blob.lowEnergySince == null) blob.lowEnergySince = this.time;
    if (blob.energy >= 24) blob.lowEnergySince = null;

    if (locked) {
      blob.vx *= Math.pow(0.05, dt);
      blob.vy *= Math.pow(0.05, dt);
      blob.actionTimer = Math.max(0, blob.actionTimer - dt);
      if (blob.actionTimer <= 0) this.#finishAction(blob);
    } else if (blob.kind === "blue") {
      this.#moveBlue(blob, dt);
    } else {
      this.#moveRed(blob, dt);
    }

    this.#keepInWorld(blob);
    this.#tryReproduction(blob, dt, births);

    const diedOfAge = blob.age >= blob.maxAge;
    return blob.energy > 0 && !diedOfAge;
  }

  #nearbyCount(blob, population, radius) {
    const radiusSquared = radius * radius;
    let count = 0;
    for (const other of population) {
      if (other !== blob && distanceSquared(blob, other) < radiusSquared) count += 1;
    }
    return count;
  }

  #finishAction(blob) {
    if (blob.action === "eating") {
      const tree = this.trees.find((item) => item.id === blob.targetId);
      const slot = tree?.fruitSlots[blob.targetSlot];
      if (tree && slot?.ready) {
        slot.ready = false;
        slot.progress = 0;
        slot.availableAt = this.time + this.config.fruitReturnDelay;
        tree.growthBank = Math.min(tree.growthBank, 0.95);
        tree.pulse = 1;
        const gain = 34;
        const energyBefore = blob.energy;
        blob.energy = Math.min(MAX_ENERGY, blob.energy + gain);
        blob.pulse = 1;
        this.stats.fruitEaten += 1;
        this.stats.energyFromFruit += blob.energy - energyBefore;
        this.events.push({ type: "eat", x: blob.x, y: blob.y, time: this.time, blobId: blob.id, treeId: tree.id });
      }
      blob.cooldown = Math.max(blob.cooldown, 0.7);
    }

    if (blob.action === "contacting" && blob.restAfter > 0) {
      blob.action = "resting";
      blob.actionTimer = blob.restAfter;
      blob.actionDuration = blob.restAfter;
      blob.restAfter = 0;
      blob.targetId = null;
      return;
    }

    blob.action = "wandering";
    blob.targetId = null;
    blob.targetSlot = -1;
    blob.actionDuration = 0;
  }

  #moveBlue(blob, dt) {
    const danger = this.#nearest(blob, this.reds, Math.min(blob.traits.vision * 0.62, 28));
    if (danger && blob.energy < 88) {
      const dx = blob.x - danger.x;
      const dy = blob.y - danger.y;
      this.#steer(blob, dx, dy, dt, 1.08);
      blob.action = "avoiding red";
      blob.targetId = danger.id;
      return;
    }

    const target = this.#nearestFruit(blob, blob.traits.vision);
    if (target && blob.energy < 94) {
      const dx = target.tree.x - blob.x;
      const dy = target.tree.y - blob.y;
      const dist = magnitude(dx, dy);
      blob.targetId = target.tree.id;
      blob.targetSlot = target.slotIndex;
      if (dist <= 7.2 && blob.cooldown <= 0) {
        blob.action = "eating";
        blob.actionTimer = this.config.blueEatingTime;
        blob.actionDuration = this.config.blueEatingTime;
        blob.vx = 0;
        blob.vy = 0;
      } else {
        this.#steer(blob, dx, dy, dt, 0.93);
        blob.action = "seeking fruit";
      }
      return;
    }

    this.#wander(blob, dt, "wandering");
  }

  #moveRed(blob, dt) {
    const target = this.#nearest(blob, this.blues, blob.traits.vision);
    if (!target) {
      this.#wander(blob, dt, blob.energy < 25 ? "searching" : "wandering");
      return;
    }

    const dx = target.x - blob.x;
    const dy = target.y - blob.y;
    const dist = magnitude(dx, dy);
    blob.targetId = target.id;
    if (dist <= 5.7 && blob.cooldown <= 0 && target.contactImmunity <= 0 && target.actionTimer <= 0) {
      const strength = this.config.redContactStrength;
      const costToBlue = strength * 0.36;
      target.energy = Math.max(0, target.energy - costToBlue);
      target.contactImmunity = this.config.redPauseTime * 2.2;
      target.action = "startled";
      target.actionTimer = Math.min(0.75, this.config.redPauseTime * 0.5);
      target.actionDuration = target.actionTimer;
      target.targetId = blob.id;
      target.pulse = 1;
      const energyBefore = blob.energy;
      blob.energy = Math.min(MAX_ENERGY, blob.energy + strength);
      blob.action = "contacting";
      blob.actionTimer = Math.min(0.48, this.config.redPauseTime * 0.32);
      blob.actionDuration = blob.actionTimer;
      blob.restAfter = Math.max(0, this.config.redPauseTime - blob.actionTimer);
      blob.cooldown = this.config.redPauseTime * 3;
      blob.vx = 0;
      blob.vy = 0;
      blob.pulse = 1;
      this.stats.contacts += 1;
      this.stats.energyFromContact += blob.energy - energyBefore;
      this.events.push({ type: "contact", x: (blob.x + target.x) / 2, y: (blob.y + target.y) / 2, time: this.time, redId: blob.id, blueId: target.id });
      return;
    }

    this.#steer(blob, dx, dy, dt, 1.02);
    blob.action = "tracking blue";
  }

  #nearest(blob, population, maxDistance) {
    let winner = null;
    let best = maxDistance * maxDistance;
    for (const other of population) {
      if (other.energy <= 0) continue;
      const distance = distanceSquared(blob, other);
      if (distance < best) {
        best = distance;
        winner = other;
      }
    }
    return winner;
  }

  #nearestFruit(blob, maxDistance) {
    let winner = null;
    let bestScore = maxDistance * maxDistance;
    for (const tree of this.trees) {
      const slotIndex = tree.fruitSlots.findIndex((slot) => slot.ready);
      if (slotIndex < 0) continue;
      const dx = tree.x - blob.x;
      const dy = tree.y - blob.y;
      const distSquared = dx * dx + dy * dy;
      const crowd = this.blues.reduce((count, blue) => count + (blue !== blob && distanceSquared(tree, blue) < 100 ? 1 : 0), 0);
      const score = distSquared * (1 + crowd * 0.09);
      if (score < bestScore) {
        bestScore = score;
        winner = { tree, slotIndex };
      }
    }
    return winner;
  }

  #wander(blob, dt, action) {
    if (blob.wanderTimer <= 0) {
      blob.wanderTimer = 1.6 + this.rng() * 3.8;
      blob.wanderAngle += (this.rng() - 0.5) * 1.8;
    }
    const inward = Math.hypot(blob.x, blob.y) > this.config.worldSize * 0.72;
    let dx = Math.cos(blob.wanderAngle);
    let dy = Math.sin(blob.wanderAngle);
    if (inward) {
      const blend = 0.62;
      dx = dx * (1 - blend) - (blob.x / this.config.worldSize) * blend;
      dy = dy * (1 - blend) - (blob.y / this.config.worldSize) * blend;
    }
    this.#steer(blob, dx, dy, dt, blob.energy < 20 ? 0.62 : 0.78);
    blob.action = action;
    blob.targetId = null;
  }

  #steer(blob, dx, dy, dt, speedScale) {
    const length = magnitude(dx, dy);
    const crowdPush = this.#crowdVector(blob);
    const desiredX = (dx / length) * blob.traits.speed * speedScale + crowdPush.x;
    const desiredY = (dy / length) * blob.traits.speed * speedScale + crowdPush.y;
    const turn = clamp(dt * 3.8, 0, 1);
    blob.vx += (desiredX - blob.vx) * turn;
    blob.vy += (desiredY - blob.vy) * turn;
    const current = magnitude(blob.vx, blob.vy);
    const maxSpeed = blob.traits.speed * (blob.energy < 15 ? 0.62 : 1.05);
    if (current > maxSpeed) {
      blob.vx = (blob.vx / current) * maxSpeed;
      blob.vy = (blob.vy / current) * maxSpeed;
    }
    blob.x += blob.vx * dt;
    blob.y += blob.vy * dt;
    if (Math.abs(blob.vx) + Math.abs(blob.vy) > 0.05) blob.heading = Math.atan2(blob.vy, blob.vx);
  }

  #crowdVector(blob) {
    const population = blob.kind === "blue" ? this.blues : this.reds;
    let x = 0;
    let y = 0;
    for (const other of population) {
      if (other === blob) continue;
      const dx = blob.x - other.x;
      const dy = blob.y - other.y;
      const distSquared = dx * dx + dy * dy;
      if (distSquared > 0.001 && distSquared < 55) {
        const force = (55 - distSquared) / 55;
        const dist = Math.sqrt(distSquared);
        x += (dx / dist) * force * 4;
        y += (dy / dist) * force * 4;
      }
    }
    return { x, y };
  }

  #keepInWorld(blob) {
    const radius = this.config.worldSize - 4;
    const distance = Math.hypot(blob.x, blob.y);
    if (distance <= radius) return;
    const nx = blob.x / distance;
    const ny = blob.y / distance;
    blob.x = nx * radius;
    blob.y = ny * radius;
    const outward = blob.vx * nx + blob.vy * ny;
    if (outward > 0) {
      blob.vx -= 1.75 * outward * nx;
      blob.vy -= 1.75 * outward * ny;
    }
    blob.wanderAngle = Math.atan2(-blob.y, -blob.x) + (this.rng() - 0.5) * 0.5;
  }

  #tryReproduction(blob, dt, births) {
    if (blob.actionTimer > 0 || blob.cooldown > 0 || blob.age < 10) return;
    const population = blob.kind === "blue" ? this.blues : this.reds;
    const cap = blob.kind === "blue" ? 100 : 75;
    if (population.length + births.filter((child) => child.kind === blob.kind).length >= cap) return;
    const threshold = blob.kind === "blue" ? this.config.blueCopyThreshold : this.config.redCopyThreshold;
    if (blob.energy < threshold) {
      blob.copyReadyIn = Math.max(blob.copyReadyIn, 1.5);
      return;
    }

    blob.copyReadyIn -= dt;
    if (blob.copyReadyIn > 0) return;

    const cost = blob.kind === "blue" ? 38 : 48;
    if (blob.energy <= cost + 8) return;
    blob.energy -= cost;
    blob.cooldown = blob.kind === "blue" ? 8 + this.rng() * 7 : 11 + this.rng() * 8;
    blob.copyReadyIn = blob.kind === "blue" ? 2.5 + this.rng() * 4 : 5 + this.rng() * 5;
    blob.pulse = 1;
    const child = this.#createBlob(blob.kind, blob, false);
    births.push(child);
    if (blob.kind === "blue") this.stats.blueBirths += 1;
    else this.stats.redBirths += 1;
    this.events.push({ type: "birth", x: blob.x, y: blob.y, time: this.time, kind: blob.kind, parentId: blob.id, childId: child.id });
  }

  #registerDeath(blob) {
    if (blob.kind === "blue") this.stats.blueDeaths += 1;
    else this.stats.redDeaths += 1;
    this.events.push({ type: "death", x: blob.x, y: blob.y, time: this.time, kind: blob.kind, blobId: blob.id });
  }

  #recordHistory(sampleTime = Math.round(this.time)) {
    const fruit = this.getFruitCount();
    const blueEnergy = this.blues.length ? this.blues.reduce((sum, blob) => sum + blob.energy, 0) / this.blues.length : 0;
    const redEnergy = this.reds.length ? this.reds.reduce((sum, blob) => sum + blob.energy, 0) / this.reds.length : 0;
    this.history.push({
      t: sampleTime,
      fruit,
      blue: this.blues.length,
      red: this.reds.length,
      blueEnergy: Number(blueEnergy.toFixed(3)),
      redEnergy: Number(redEnergy.toFixed(3))
    });
    if (this.history.length > 3600) this.history.shift();
  }

  getFruitCount() {
    let count = 0;
    for (const tree of this.trees) {
      for (const slot of tree.fruitSlots) if (slot.ready) count += 1;
    }
    return count;
  }

  getAllBlobs() {
    return [...this.blues, ...this.reds];
  }

  getBlob(id) {
    return this.blues.find((blob) => blob.id === id) || this.reds.find((blob) => blob.id === id) || null;
  }

  drainEvents() {
    const events = this.events.slice();
    this.events.length = 0;
    return events;
  }

  snapshot() {
    return {
      time: this.time,
      fruit: this.getFruitCount(),
      blue: this.blues.length,
      red: this.reds.length,
      history: this.history,
      stats: { ...this.stats }
    };
  }
}

function localPeaks(values, window = 10) {
  const peaks = [];
  for (let index = window; index < values.length - window; index += 1) {
    const value = values[index];
    let isPeak = true;
    for (let offset = -window; offset <= window; offset += 1) {
      if (offset !== 0 && values[index + offset] > value) {
        isPeak = false;
        break;
      }
    }
    if (isPeak && value > 0 && (!peaks.length || index - peaks[peaks.length - 1] > window)) peaks.push(index);
  }
  return peaks;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function analyzeRun(simulation) {
  const history = simulation.history;
  const blues = history.map((point) => point.blue);
  const reds = history.map((point) => point.red);
  const fruits = history.map((point) => point.fruit);
  const bluePeak = Math.max(...blues, 0);
  const redPeak = Math.max(...reds, 0);
  const bluePeakIndex = blues.indexOf(bluePeak);
  const redPeakIndex = reds.indexOf(redPeak);
  const tailStart = Math.max(0, history.length - 120);
  const bluePeaks = localPeaks(blues);
  const redPeaks = localPeaks(reds);
  const minimumBlueIndex = blues.length ? blues.indexOf(Math.min(...blues)) : -1;
  const minimumRedIndex = reds.length ? reds.indexOf(Math.min(...reds)) : -1;
  const invariantErrors = [];

  for (let index = 1; index < history.length; index += 1) {
    if (history[index].t <= history[index - 1].t) invariantErrors.push("history time is not strictly increasing");
    if (history[index].fruit < 0 || history[index].blue < 0 || history[index].red < 0) invariantErrors.push("negative aggregate count");
  }
  for (const blob of simulation.getAllBlobs()) {
    if (!Number.isFinite(blob.energy) || !Number.isFinite(blob.x) || !Number.isFinite(blob.y)) invariantErrors.push(`non-finite state on ${blob.id}`);
    if (blob.energy <= 0) invariantErrors.push(`non-positive live energy on ${blob.id}`);
    if (Math.hypot(blob.x, blob.y) > simulation.config.worldSize + 0.001) invariantErrors.push(`out-of-bounds state on ${blob.id}`);
  }

  return {
    duration: simulation.time,
    final: history.at(-1) || { fruit: 0, blue: 0, red: 0 },
    bluePeak,
    redPeak,
    bluePeakTime: history[bluePeakIndex]?.t ?? 0,
    redPeakTime: history[redPeakIndex]?.t ?? 0,
    peakLag: (history[redPeakIndex]?.t ?? 0) - (history[bluePeakIndex]?.t ?? 0),
    bluePeaks: bluePeaks.length,
    redPeaks: redPeaks.length,
    minimumBlueTime: history[minimumBlueIndex]?.t ?? 0,
    minimumRedTime: history[minimumRedIndex]?.t ?? 0,
    meanBlue: average(blues),
    meanRed: average(reds),
    meanFruit: average(fruits),
    tailMeanBlue: average(blues.slice(tailStart)),
    tailMeanRed: average(reds.slice(tailStart)),
    extinctBlue: history.length > 30 && blues.slice(-30).every((value) => value === 0),
    extinctRed: history.length > 30 && reds.slice(-30).every((value) => value === 0),
    stats: { ...simulation.stats },
    invariantErrors: [...new Set(invariantErrors)]
  };
}

export function summarizeHistory(simulation) {
  const history = simulation.history;
  if (history.length < 8) return "Run the garden to reveal its story.";
  const report = analyzeRun(simulation);
  const latest = report.final;
  const recent = history.slice(-Math.min(90, history.length));
  const averageFruit = average(recent.map((point) => point.fruit));
  const capacity = simulation.trees.length * simulation.config.fruitLimit;

  if (report.extinctBlue && report.extinctRed) {
    return "Both groups faded after the food web ran out of handholds. Fruit is quietly reclaiming the dish.";
  }
  if (report.extinctBlue && latest.red > 0) {
    return "Blue faded first. With no blue energy to borrow, the remaining red group is now living on borrowed time.";
  }
  if (report.extinctRed && latest.blue > 0) {
    return "Red faded and the garden simplified. Blue now rises and falls mostly with the fruit crop.";
  }
  if (averageFruit < Math.max(1, capacity * 0.12) && report.meanBlue < simulation.config.startBlue * 1.15) {
    return "Fruit stayed scarce, so blue remained small and red had little energy to follow. This is a quiet, food-limited garden.";
  }
  if (report.redPeakTime > report.bluePeakTime + 4 && report.redPeak > simulation.config.startRed) {
    const lag = report.redPeakTime - report.bluePeakTime;
    return `Blue crested first; red followed about ${lag} seconds later. That delay is the garden's food web showing through.`;
  }
  if (report.bluePeak > simulation.config.startBlue * 1.6 && report.stats.blueBirths > report.stats.redBirths * 1.4) {
    return "A generous fruit crop pushed blue into a fast bloom. Red is following, but the branches set the pace.";
  }
  if (latest.blue > 0 && latest.red > 0) {
    return "The garden is holding both groups. Small energy trades are keeping the populations in motion without free growth.";
  }
  return "The garden is still choosing a direction. Let it run a little longer to reveal the next turn.";
}

export function runHeadless(values, duration = 600) {
  const simulation = new GardenSimulation(values);
  simulation.advance(duration);
  return { simulation, report: analyzeRun(simulation) };
}

export { FIXED_STEP, MAX_ENERGY };
