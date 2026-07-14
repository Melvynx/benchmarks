const TAU = Math.PI * 2;
const FIXED_STEP = 1 / 30;

export const DEFAULT_CONFIG = Object.freeze({
  fruitGrowth: 0.04,
  fruitLimit: 48,
  fruitReturnDelay: 18,
  blueEnergyUse: 0.42,
  blueSpeed: 5.2,
  blueVision: 24,
  blueCopyThreshold: 88,
  blueEatingTime: 1.25,
  redEnergyUse: 0.58,
  redSpeed: 6.1,
  redVision: 34,
  redContactStrength: 14,
  redCopyThreshold: 90,
  redPauseTime: 2.4,
  treeCount: 8,
  blueStart: 26,
  redStart: 7,
  worldSize: 72,
  seed: 4821,
  simSpeed: 2,
});

export const PRESETS = Object.freeze({
  balanced: {
    label: "Balanced garden",
    color: "#7ea553",
    description: "A steady orchard with room for long, lagging waves.",
    values: { ...DEFAULT_CONFIG },
  },
  fruitRich: {
    label: "Fruit-rich",
    color: "#a8cb46",
    description: "Fast fruit and extra branches give blue a bright head start.",
    values: {
      ...DEFAULT_CONFIG,
      fruitGrowth: 0.045,
      fruitLimit: 52,
      fruitReturnDelay: 10,
      blueEnergyUse: 0.5,
      blueCopyThreshold: 86,
      blueEatingTime: 1,
      redEnergyUse: 0.5,
      redContactStrength: 15,
      redCopyThreshold: 86,
      redPauseTime: 2.3,
      treeCount: 10,
      blueStart: 22,
      redStart: 5,
      worldSize: 78,
      seed: 7319,
    },
  },
  redHeavy: {
    label: "Red-heavy",
    color: "#ef6c61",
    description: "Blue dips first; hungry red follows a little later.",
    values: {
      ...DEFAULT_CONFIG,
      fruitLimit: 46,
      fruitReturnDelay: 19,
      blueEnergyUse: 0.44,
      blueCopyThreshold: 90,
      redEnergyUse: 0.52,
      redSpeed: 6.7,
      redVision: 38,
      redContactStrength: 18,
      redCopyThreshold: 84,
      redPauseTime: 2,
      blueStart: 30,
      redStart: 14,
      worldSize: 74,
      seed: 9134,
    },
  },
  fragile: {
    label: "Fragile balance",
    color: "#d89954",
    description: "Small changes can tip this lean little ecosystem.",
    values: {
      ...DEFAULT_CONFIG,
      fruitGrowth: 0.028,
      fruitLimit: 34,
      fruitReturnDelay: 24,
      blueEnergyUse: 0.46,
      blueSpeed: 4.8,
      blueVision: 22,
      blueCopyThreshold: 92,
      blueEatingTime: 1.55,
      redEnergyUse: 0.64,
      redSpeed: 5.9,
      redVision: 32,
      redContactStrength: 16,
      redCopyThreshold: 92,
      redPauseTime: 2.9,
      treeCount: 7,
      blueStart: 20,
      redStart: 6,
      worldSize: 70,
      seed: 2657,
    },
  },
  lowFruit: {
    label: "Low-fruit",
    color: "#a89a63",
    description: "A quiet, spare garden where every fruit matters.",
    values: {
      ...DEFAULT_CONFIG,
      fruitGrowth: 0.02,
      fruitLimit: 24,
      fruitReturnDelay: 28,
      blueEnergyUse: 0.46,
      blueSpeed: 4.6,
      blueVision: 27,
      blueCopyThreshold: 94,
      blueEatingTime: 1.7,
      redEnergyUse: 0.7,
      redSpeed: 5.6,
      redVision: 31,
      redContactStrength: 11,
      redCopyThreshold: 95,
      redPauseTime: 3.4,
      treeCount: 6,
      blueStart: 12,
      redStart: 3,
      worldSize: 64,
      seed: 1048,
    },
  },
});

export const STRUCTURAL_KEYS = new Set([
  "treeCount",
  "blueStart",
  "redStart",
  "worldSize",
  "seed",
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const length = (x, y) => Math.hypot(x, y);
const distanceSq = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

class SeededRandom {
  constructor(seed) {
    this.state = (Number(seed) || 1) >>> 0;
  }

  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + (max - min) * this.next();
  }

  int(min, maxInclusive) {
    return Math.floor(this.range(min, maxInclusive + 1));
  }

  pick(items) {
    return items[Math.floor(this.next() * items.length)];
  }
}

export class GardenSimulation {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._accumulator = 0;
    this.reset(this.config);
  }

  reset(config = this.config) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.random = new SeededRandom(this.config.seed);
    this.time = 0;
    this._accumulator = 0;
    this._recordTimer = 0;
    this._nextBlobId = 1;
    this._nextFruitId = 1;
    this.blobs = [];
    this.trees = [];
    this.decorations = [];
    this.effects = [];
    this.history = [];
    this.stats = {
      births: 0,
      blueBirths: 0,
      redBirths: 0,
      deaths: 0,
      fruitUsed: 0,
      contacts: 0,
      bluePeak: 0,
      redPeak: 0,
      fruitPeak: 0,
      bluePeakTime: 0,
      redPeakTime: 0,
    };

    this._buildTrees();
    this._buildDecorations();

    for (let i = 0; i < this.config.blueStart; i += 1) {
      this._spawnBlob("blue", null, false);
    }
    for (let i = 0; i < this.config.redStart; i += 1) {
      this._spawnBlob("red", null, false);
    }

    this._recordHistory();
    return this;
  }

  setConfig(key, value) {
    if (!(key in this.config)) return;
    this.config[key] = Number(value);
    if (key === "fruitLimit") this._reconcileFruitSlots();
  }

  advance(seconds) {
    this._accumulator += clamp(Number(seconds) || 0, 0, 5);
    let steps = 0;
    while (this._accumulator >= FIXED_STEP && steps < 240) {
      this._tick(FIXED_STEP);
      this._accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (steps >= 240) this._accumulator = 0;
  }

  step(seconds = 0.25) {
    this.advance(Math.max(FIXED_STEP, seconds));
  }

  get livingBlobs() {
    return this.blobs.filter((blob) => !blob.dying);
  }

  get counts() {
    let blue = 0;
    let red = 0;
    for (const blob of this.blobs) {
      if (blob.dying) continue;
      if (blob.group === "blue") blue += 1;
      else red += 1;
    }
    return { fruit: this.ripeFruitCount, blue, red };
  }

  get ripeFruitCount() {
    let total = 0;
    for (const tree of this.trees) {
      for (const fruit of tree.fruits) {
        if (fruit.growth >= 0.78 && !fruit.reservedBy) total += 1;
      }
    }
    return total;
  }

  get fruitMass() {
    let total = 0;
    for (const tree of this.trees) {
      for (const fruit of tree.fruits) total += fruit.growth;
    }
    return total;
  }

  findBlob(id) {
    return this.blobs.find((blob) => blob.id === id) || null;
  }

  getNarrative() {
    const { blue, red, fruit } = this.counts;
    const records = this.history;
    if (this.time < 8) {
      return {
        title: "The garden is waking up",
        text: "Blue is sniffing out fruit while red begins its gentle search.",
        tone: "growing",
      };
    }

    if (blue === 0 && red === 0) {
      return {
        title: "The dish has gone quiet",
        text: "Both groups faded, and fruit is slowly reclaiming the garden.",
        tone: "quiet",
      };
    }

    if (blue === 0) {
      return {
        title: "Blue faded first",
        text: red > 0
          ? "Without blue to restore them, the remaining red blobs are now running low."
          : "Fruit is returning to a simpler, blob-free garden.",
        tone: "fragile",
      };
    }

    if (red === 0) {
      return {
        title: "A blue orchard remains",
        text: "Red has faded, so blue now rises and falls with the returning fruit alone.",
        tone: "blue",
      };
    }

    const recent = records.slice(-Math.min(30, records.length));
    const averageFruit = recent.reduce((sum, row) => sum + row.fruit, 0) / Math.max(1, recent.length);
    const blueDelta = recent.length > 1 ? blue - recent[0].blue : 0;
    const redDelta = recent.length > 1 ? red - recent[0].red : 0;

    if (averageFruit < this.config.fruitLimit * 0.1) {
      return {
        title: "Every fruit matters",
        text: "Low fruit is keeping the whole garden small and slowing blue births.",
        tone: "fruit",
      };
    }

    if (blueDelta < -Math.max(3, blue * 0.18) && redDelta >= 0) {
      return {
        title: "Red is cresting",
        text: "Blue is dipping under contact pressure; red may follow once energy gets scarce.",
        tone: "red",
      };
    }

    if (blueDelta > Math.max(3, blue * 0.16) && redDelta <= 1) {
      return {
        title: "Blue found the feast first",
        text: "Fruit sparked a blue rise. Red usually answers after a short delay.",
        tone: "blue",
      };
    }

    if (redDelta < -Math.max(2, red * 0.18) && blueDelta >= 0) {
      return {
        title: "The pressure is easing",
        text: "Red is fading after the blue dip, opening room for the orchard to recover.",
        tone: "growing",
      };
    }

    if (fruit > this.config.fruitLimit * 0.55 && blueDelta > 0) {
      return {
        title: "The orchard is generous",
        text: "Fruit is plentiful, and blue is turning that stored energy into new life.",
        tone: "fruit",
      };
    }

    return {
      title: "The garden is in balance",
      text: "Fruit, blue, and red are trading small advantages without one taking over.",
      tone: "balanced",
    };
  }

  _buildTrees() {
    const count = Math.max(1, Math.round(this.config.treeCount));
    const radius = this.config.worldSize * 0.68;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i += 1) {
      const ring = Math.sqrt((i + 0.7) / count);
      const angle = i * goldenAngle + this.random.range(-0.24, 0.24);
      this.trees.push({
        id: `T${i + 1}`,
        x: Math.cos(angle) * radius * ring + this.random.range(-2, 2),
        y: Math.sin(angle) * radius * ring + this.random.range(-2, 2),
        size: this.random.range(0.88, 1.15),
        lean: this.random.range(-0.18, 0.18),
        canopyHue: this.random.range(-7, 8),
        phase: this.random.range(0, TAU),
        fruits: [],
      });
    }

    for (let i = 0; i < Math.round(this.config.fruitLimit); i += 1) {
      this.trees[i % this.trees.length].fruits.push(this._makeFruit(1));
    }
  }

  _makeFruit(growth = 0) {
    return {
      id: `F${this._nextFruitId++}`,
      growth,
      readyAt: 0,
      reservedBy: null,
      anchorAngle: this.random.range(0, TAU),
      anchorRadius: this.random.range(0.28, 0.88),
      anchorLayer: this.random.range(0.2, 1),
      wobble: this.random.range(0, TAU),
    };
  }

  _reconcileFruitSlots() {
    const desired = Math.max(this.trees.length, Math.round(this.config.fruitLimit));
    let current = this.trees.reduce((sum, tree) => sum + tree.fruits.length, 0);

    while (current < desired) {
      const tree = this.trees[current % this.trees.length];
      const fruit = this._makeFruit(0.05);
      fruit.readyAt = this.time;
      tree.fruits.push(fruit);
      current += 1;
    }

    if (current <= desired) return;
    let removeCount = current - desired;
    for (let pass = 0; pass < 2 && removeCount > 0; pass += 1) {
      for (let i = this.trees.length - 1; i >= 0 && removeCount > 0; i -= 1) {
        const tree = this.trees[i];
        for (let j = tree.fruits.length - 1; j >= 0 && removeCount > 0; j -= 1) {
          const fruit = tree.fruits[j];
          if (pass === 0 && fruit.reservedBy) continue;
          if (fruit.reservedBy) {
            const blob = this.findBlob(fruit.reservedBy);
            if (blob) {
              blob.targetFruitId = null;
              blob.action = "wandering";
              blob.actionTimer = 0;
            }
          }
          tree.fruits.splice(j, 1);
          removeCount -= 1;
        }
      }
    }
  }

  _buildDecorations() {
    const count = Math.round(this.config.worldSize * 0.38);
    for (let i = 0; i < count; i += 1) {
      const point = this._randomPoint(0.9);
      this.decorations.push({
        x: point.x,
        y: point.y,
        kind: this.random.next() < 0.58 ? "sprout" : this.random.next() < 0.72 ? "flower" : "stone",
        size: this.random.range(0.6, 1.2),
        angle: this.random.range(0, TAU),
        tint: this.random.next(),
      });
    }
  }

  _randomPoint(fraction = 0.82) {
    const angle = this.random.range(0, TAU);
    const radius = Math.sqrt(this.random.next()) * this.config.worldSize * fraction;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  }

  _randomOpenPoint(parent = null) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      let point;
      if (parent) {
        const angle = this.random.range(0, TAU);
        const spread = this.random.range(3.2, 6.2);
        point = { x: parent.x + Math.cos(angle) * spread, y: parent.y + Math.sin(angle) * spread };
      } else {
        point = this._randomPoint(0.78);
      }
      if (length(point.x, point.y) > this.config.worldSize - 4) continue;
      const treeCrowded = this.trees.some((tree) => distanceSq(point, tree) < 20);
      const blobCrowded = this.blobs.some((blob) => !blob.dying && distanceSq(point, blob) < 5);
      if (!treeCrowded && !blobCrowded) return point;
    }
    return parent ? { x: parent.x + 3, y: parent.y } : this._randomPoint(0.7);
  }

  _spawnBlob(group, parent = null, countAsBirth = true) {
    const point = this._randomOpenPoint(parent);
    const child = Boolean(parent);
    const idNumber = this._nextBlobId++;
    const id = `${group === "blue" ? "B" : "R"}${idNumber}`;
    const baseSpeed = group === "blue" ? this.config.blueSpeed : this.config.redSpeed;
    const baseVision = group === "blue" ? this.config.blueVision : this.config.redVision;
    const initialEnergy = child
      ? 28
      : group === "blue"
        ? this.random.range(56, 80)
        : this.random.range(52, 76);
    const minimumAge = group === "blue" ? 8 : 12;

    const blob = {
      id,
      idNumber,
      group,
      x: point.x,
      y: point.y,
      vx: parent ? this.random.range(-1.2, 1.2) : 0,
      vy: parent ? this.random.range(-1.2, 1.2) : 0,
      energy: initialEnergy,
      age: child ? 0 : this.random.range(0, minimumAge + 2),
      action: child ? "budding" : "wandering",
      actionTimer: child ? 0.72 : 0,
      actionTotal: child ? 0.72 : 0,
      targetId: null,
      targetFruitId: null,
      intentX: 0,
      intentY: 0,
      wanderAngle: this.random.range(0, TAU),
      wanderTimer: this.random.range(0.2, 3),
      contactImmune: 0,
      contactCooldown: this.random.range(0, 2),
      birthCooldown: child ? (group === "blue" ? 12 : 18) : this.random.range(0, group === "blue" ? 8 : 12),
      reproductionCharge: 0,
      reproductionDelay: this.random.range(group === "blue" ? 2 : 3, group === "blue" ? 5 : 6),
      speedTrait: this.random.range(0.91, 1.09) * (baseSpeed / Math.max(0.1, baseSpeed)),
      visionTrait: this.random.range(0.9, 1.1) * (baseVision / Math.max(0.1, baseVision)),
      bodyShape: this.random.range(-0.12, 0.12),
      phase: this.random.range(0, TAU),
      blinkPhase: this.random.range(0, TAU),
      parentId: parent?.id ?? null,
      familyRoot: parent?.familyRoot ?? parent?.id ?? id,
      generation: parent ? parent.generation + 1 : 0,
      maxAge: this.random.range(480, 720),
      dying: false,
      deathTimer: 0,
      bornAt: this.time,
      lastContactAt: null,
    };

    this.blobs.push(blob);
    if (countAsBirth) {
      this.stats.births += 1;
      if (group === "blue") this.stats.blueBirths += 1;
      else this.stats.redBirths += 1;
      this._emit("birth", blob.x, blob.y, group, { childId: id });
    }
    return blob;
  }

  _tick(dt) {
    this.time += dt;
    this._updateFruit(dt);

    const snapshot = this.blobs.slice();
    for (const blob of snapshot) this._updateBlob(blob, dt);

    for (let i = this.blobs.length - 1; i >= 0; i -= 1) {
      const blob = this.blobs[i];
      if (blob.dying && blob.deathTimer <= 0) this.blobs.splice(i, 1);
    }

    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      this.effects[i].life -= dt;
      if (this.effects[i].life <= 0) this.effects.splice(i, 1);
    }

    this._recordTimer += dt;
    if (this._recordTimer >= 1) {
      this._recordTimer -= 1;
      this._recordHistory();
    }
  }

  _updateFruit(dt) {
    for (const tree of this.trees) {
      for (const fruit of tree.fruits) {
        if (fruit.reservedBy || fruit.growth >= 1 || this.time < fruit.readyAt) continue;
        fruit.growth = Math.min(1, fruit.growth + this.config.fruitGrowth * dt);
      }
    }
  }

  _updateBlob(blob, dt) {
    if (blob.dying) {
      blob.deathTimer -= dt;
      return;
    }

    blob.age += dt;
    blob.birthCooldown = Math.max(0, blob.birthCooldown - dt);
    blob.contactCooldown = Math.max(0, blob.contactCooldown - dt);
    blob.contactImmune = Math.max(0, blob.contactImmune - dt);

    if (blob.action === "eating") {
      this._burnEnergy(blob, dt, false);
      blob.actionTimer -= dt;
      blob.vx *= Math.exp(-dt * 9);
      blob.vy *= Math.exp(-dt * 9);
      if (blob.actionTimer <= 0) this._finishEating(blob);
      this._checkVitality(blob);
      return;
    }

    if (blob.action === "resting" || blob.action === "startled" || blob.action === "budding") {
      this._burnEnergy(blob, dt, false);
      blob.actionTimer -= dt;
      blob.vx *= Math.exp(-dt * 7);
      blob.vy *= Math.exp(-dt * 7);
      if (blob.actionTimer <= 0) blob.action = "wandering";
      this._checkVitality(blob);
      return;
    }

    if (this._tryReproduce(blob, dt)) {
      this._burnEnergy(blob, dt, false);
      this._checkVitality(blob);
      return;
    }

    if (blob.group === "blue") this._updateBlue(blob, dt);
    else this._updateRed(blob, dt);

    const moving = length(blob.vx, blob.vy) > 0.35;
    this._burnEnergy(blob, dt, moving);
    this._checkVitality(blob);
  }

  _burnEnergy(blob, dt, moving) {
    const maxSpeed = (blob.group === "blue" ? this.config.blueSpeed : this.config.redSpeed) * blob.speedTrait;
    const energyUse = blob.group === "blue" ? this.config.blueEnergyUse : this.config.redEnergyUse;
    const speedRatio = moving ? clamp(length(blob.vx, blob.vy) / Math.max(0.1, maxSpeed), 0, 1.25) : 0;
    const movementFactor = 0.35 + 0.65 * speedRatio * speedRatio;
    const living = this.livingBlobs;
    const capacity = Math.max(36, this.config.worldSize * 0.82);
    const densityPressure = Math.max(0, (living.length - capacity) / capacity);
    let cost = energyUse * movementFactor * (1 + densityPressure * 1.7) * dt;
    if (blob.group === "red") {
      let blueCount = 0;
      let redCount = 0;
      for (const other of living) {
        if (other.group === "blue") blueCount += 1;
        else redCount += 1;
      }
      const redCompetition = Math.max(0, redCount / Math.max(2, blueCount * 0.42) - 1);
      cost *= 1 + Math.min(2, redCompetition * 0.45);
      if (blob.action === "seeking") cost *= 1.1;
    }
    if (blob.age > blob.maxAge) cost += (0.12 + (blob.age - blob.maxAge) * 0.003) * dt;
    blob.energy -= cost;
  }

  _checkVitality(blob) {
    if (blob.energy > 0) {
      blob.energy = Math.min(100, blob.energy);
      return;
    }
    this._startDying(blob);
  }

  _startDying(blob) {
    if (blob.dying) return;
    blob.energy = 0;
    blob.dying = true;
    blob.action = "fading";
    blob.deathTimer = 1.05;
    blob.actionTimer = 1.05;
    blob.actionTotal = 1.05;
    blob.vx = 0;
    blob.vy = 0;
    this._releaseFruit(blob);
    this.stats.deaths += 1;
    this._emit("death", blob.x, blob.y, blob.group);
  }

  _tryReproduce(blob, dt) {
    const isBlue = blob.group === "blue";
    const threshold = isBlue ? this.config.blueCopyThreshold : this.config.redCopyThreshold;
    const cost = isBlue ? 48 : 52;
    const minimumAge = isBlue ? 8 : 12;
    const groupCap = isBlue ? 110 : 70;
    const groupCount = this.blobs.reduce(
      (sum, other) => sum + (!other.dying && other.group === blob.group ? 1 : 0),
      0,
    );
    const totalCount = this.livingBlobs.length;
    const eligible =
      blob.age >= minimumAge &&
      blob.birthCooldown <= 0 &&
      blob.energy >= Math.max(threshold, cost + 5) &&
      groupCount < groupCap &&
      totalCount < 150;

    if (!eligible) {
      blob.reproductionCharge = Math.max(0, blob.reproductionCharge - dt * 0.25);
      return false;
    }

    blob.reproductionCharge += dt;
    if (blob.reproductionCharge < blob.reproductionDelay) return false;

    blob.energy -= cost;
    blob.birthCooldown = isBlue ? 12 : 18;
    blob.reproductionCharge = 0;
    blob.reproductionDelay = this.random.range(isBlue ? 2 : 3, isBlue ? 5 : 6);
    blob.action = "budding";
    blob.actionTimer = 0.72;
    blob.actionTotal = 0.72;
    this._spawnBlob(blob.group, blob, true);
    return true;
  }

  _updateBlue(blob, dt) {
    const vision = this.config.blueVision * blob.visionTrait;
    const nearestThreat = this._nearestBlob(blob, "red", vision * 0.72);

    if (nearestThreat) {
      blob.action = "fleeing";
      blob.targetId = nearestThreat.id;
      blob.targetFruitId = null;
      const dx = blob.x - nearestThreat.x;
      const dy = blob.y - nearestThreat.y;
      const d = Math.max(0.1, length(dx, dy));
      const sideStep = Math.sin(blob.phase + this.time * 0.8) * 0.28;
      this._steer(blob, dx / d - (dy / d) * sideStep, dy / d + (dx / d) * sideStep, this.config.blueSpeed, dt);
      return;
    }

    let fruitInfo = blob.targetFruitId ? this._findFruit(blob.targetFruitId) : null;
    if (!fruitInfo || fruitInfo.fruit.reservedBy || fruitInfo.fruit.growth < 0.78) {
      blob.targetFruitId = null;
      fruitInfo = null;
    }

    const desiredEnergy = Math.min(98, this.config.blueCopyThreshold + 4);
    if (!fruitInfo && blob.energy < desiredEnergy) {
      fruitInfo = this._nearestFruit(blob, vision);
      if (fruitInfo) blob.targetFruitId = fruitInfo.fruit.id;
    }

    if (fruitInfo) {
      const dx = fruitInfo.tree.x - blob.x;
      const dy = fruitInfo.tree.y - blob.y;
      const d = length(dx, dy);
      blob.action = "foraging";
      blob.targetId = fruitInfo.tree.id;
      if (d < 4.3 + fruitInfo.tree.size) {
        fruitInfo.fruit.reservedBy = blob.id;
        blob.action = "eating";
        blob.actionTimer = this.config.blueEatingTime;
        blob.actionTotal = this.config.blueEatingTime;
        blob.vx *= 0.2;
        blob.vy *= 0.2;
        return;
      }
      this._steer(blob, dx / Math.max(0.1, d), dy / Math.max(0.1, d), this.config.blueSpeed, dt);
      return;
    }

    blob.targetId = null;
    blob.action = "wandering";
    const wander = this._wander(blob, dt);
    this._steer(blob, wander.x, wander.y, this.config.blueSpeed * 0.58, dt);
  }

  _updateRed(blob, dt) {
    const vision = this.config.redVision * blob.visionTrait;
    let target = blob.targetId ? this.findBlob(blob.targetId) : null;
    if (!target || target.dying || target.group !== "blue" || distanceSq(blob, target) > vision * vision * 1.35) {
      target = this._chooseBlueTarget(blob, vision);
      blob.targetId = target?.id ?? null;
    }

    if (target && blob.energy < Math.min(99, this.config.redCopyThreshold + 6)) {
      const dx = target.x - blob.x;
      const dy = target.y - blob.y;
      const d = length(dx, dy);
      blob.action = "seeking";
      if (d < 3.15 && blob.contactCooldown <= 0 && target.contactImmune <= 0) {
        this._makeContact(blob, target);
        return;
      }
      const weave = Math.sin(blob.phase + this.time * 0.7) * 0.12;
      this._steer(
        blob,
        dx / Math.max(0.1, d) - (dy / Math.max(0.1, d)) * weave,
        dy / Math.max(0.1, d) + (dx / Math.max(0.1, d)) * weave,
        this.config.redSpeed,
        dt,
      );
      return;
    }

    blob.targetId = null;
    blob.action = "wandering";
    const wander = this._wander(blob, dt);
    this._steer(blob, wander.x, wander.y, this.config.redSpeed * 0.52, dt);
  }

  _nearestBlob(blob, group, maxDistance) {
    let nearest = null;
    let nearestDistanceSq = maxDistance * maxDistance;
    for (const candidate of this.blobs) {
      if (candidate === blob || candidate.dying || candidate.group !== group) continue;
      const d2 = distanceSq(blob, candidate);
      if (d2 < nearestDistanceSq) {
        nearest = candidate;
        nearestDistanceSq = d2;
      }
    }
    return nearest;
  }

  _chooseBlueTarget(red, vision) {
    const pursuerCounts = new Map();
    for (const blob of this.blobs) {
      if (blob.group === "red" && !blob.dying && blob.targetId) {
        pursuerCounts.set(blob.targetId, (pursuerCounts.get(blob.targetId) || 0) + 1);
      }
    }

    let best = null;
    let bestScore = Infinity;
    for (const blue of this.blobs) {
      if (blue.group !== "blue" || blue.dying) continue;
      const d2 = distanceSq(red, blue);
      if (d2 > vision * vision) continue;
      const pursuers = pursuerCounts.get(blue.id) || 0;
      if (pursuers >= 2) continue;
      const immunityPenalty = blue.contactImmune > 0 ? 2.4 : 1;
      const availableReserve = clamp((blue.energy - 18) / 58, 0.12, 1);
      const score = (d2 * (1 + pursuers * 0.48) * immunityPenalty) / availableReserve;
      if (score < bestScore) {
        best = blue;
        bestScore = score;
      }
    }
    return best;
  }

  _nearestFruit(blob, vision) {
    let best = null;
    let bestScore = Infinity;
    const maximumDistanceSq = vision * vision;
    for (const tree of this.trees) {
      const d2 = distanceSq(blob, tree);
      if (d2 > maximumDistanceSq) continue;
      const fruit = tree.fruits.find((candidate) => candidate.growth >= 0.78 && !candidate.reservedBy);
      if (!fruit) continue;
      const crowd = this.blobs.reduce(
        (sum, other) => sum + (!other.dying && other.group === "blue" && distanceSq(other, tree) < 55 ? 1 : 0),
        0,
      );
      const score = d2 * (1 + Math.max(0, crowd - 2) * 0.08);
      if (score < bestScore) {
        best = { tree, fruit };
        bestScore = score;
      }
    }
    return best;
  }

  _findFruit(id) {
    for (const tree of this.trees) {
      const fruit = tree.fruits.find((candidate) => candidate.id === id);
      if (fruit) return { tree, fruit };
    }
    return null;
  }

  _finishEating(blob) {
    const fruitInfo = blob.targetFruitId ? this._findFruit(blob.targetFruitId) : null;
    if (fruitInfo && fruitInfo.fruit.reservedBy === blob.id) {
      fruitInfo.fruit.growth = 0;
      fruitInfo.fruit.readyAt = this.time + this.config.fruitReturnDelay;
      fruitInfo.fruit.reservedBy = null;
      blob.energy = Math.min(100, blob.energy + 24);
      this.stats.fruitUsed += 1;
      this._emit("eat", fruitInfo.tree.x, fruitInfo.tree.y, "blue", { blobId: blob.id });
    }
    blob.targetFruitId = null;
    blob.targetId = null;
    blob.action = "resting";
    blob.actionTimer = 0.38;
    blob.actionTotal = 0.38;
  }

  _releaseFruit(blob) {
    if (!blob.targetFruitId) return;
    const fruitInfo = this._findFruit(blob.targetFruitId);
    if (fruitInfo?.fruit.reservedBy === blob.id) fruitInfo.fruit.reservedBy = null;
    blob.targetFruitId = null;
  }

  _makeContact(red, blue) {
    const contactStrength = this.config.redContactStrength;
    const availableReserve = Math.max(0, blue.energy - 18);
    const drained = Math.min(contactStrength * 0.62, availableReserve);
    blue.energy -= drained;
    const contactYield = contactStrength * 1.35 * (drained / Math.max(0.01, contactStrength * 0.62));
    red.energy = Math.min(100, red.energy + contactYield);
    red.action = "resting";
    red.actionTimer = this.config.redPauseTime;
    red.actionTotal = this.config.redPauseTime;
    red.contactCooldown = this.config.redPauseTime + 0.5;
    red.vx *= -0.25;
    red.vy *= -0.25;
    red.targetId = null;
    blue.action = "startled";
    blue.actionTimer = 0.45;
    blue.actionTotal = 0.45;
    blue.contactImmune = Math.max(2.5, this.config.redPauseTime * 1.25);
    blue.lastContactAt = this.time;
    red.lastContactAt = this.time;
    this.stats.contacts += 1;
    this._emit("contact", (red.x + blue.x) / 2, (red.y + blue.y) / 2, "red", {
      redId: red.id,
      blueId: blue.id,
    });
    if (blue.energy <= 0) this._startDying(blue);
  }

  _wander(blob, dt) {
    blob.wanderTimer -= dt;
    if (blob.wanderTimer <= 0) {
      const inwardAngle = Math.atan2(-blob.y, -blob.x);
      const edge = length(blob.x, blob.y) / this.config.worldSize;
      if (edge > 0.72) {
        blob.wanderAngle = inwardAngle + this.random.range(-0.75, 0.75);
      } else {
        blob.wanderAngle += this.random.range(-1.25, 1.25);
      }
      blob.wanderTimer = this.random.range(1.8, 4.8);
    }
    return { x: Math.cos(blob.wanderAngle), y: Math.sin(blob.wanderAngle) };
  }

  _steer(blob, desiredX, desiredY, speed, dt) {
    let dx = desiredX;
    let dy = desiredY;
    let separationX = 0;
    let separationY = 0;
    let neighbors = 0;

    for (const other of this.blobs) {
      if (other === blob || other.dying) continue;
      const ox = blob.x - other.x;
      const oy = blob.y - other.y;
      const d2 = ox * ox + oy * oy;
      if (d2 > 0.01 && d2 < 30) {
        const weight = (30 - d2) / 30;
        separationX += (ox / Math.sqrt(d2)) * weight;
        separationY += (oy / Math.sqrt(d2)) * weight;
        neighbors += 1;
      }
    }

    if (neighbors) {
      dx += (separationX / neighbors) * 0.8;
      dy += (separationY / neighbors) * 0.8;
    }

    const radial = length(blob.x, blob.y);
    const edgeStart = this.config.worldSize * 0.8;
    if (radial > edgeStart) {
      const edgeForce = clamp((radial - edgeStart) / Math.max(1, this.config.worldSize - edgeStart), 0, 1) * 2.4;
      dx += (-blob.x / radial) * edgeForce;
      dy += (-blob.y / radial) * edgeForce;
    }

    const desiredLength = Math.max(0.001, length(dx, dy));
    const traitSpeed = speed * blob.speedTrait;
    const targetVx = (dx / desiredLength) * traitSpeed;
    const targetVy = (dy / desiredLength) * traitSpeed;
    const response = 1 - Math.exp(-dt * 4.3);
    blob.vx += (targetVx - blob.vx) * response;
    blob.vy += (targetVy - blob.vy) * response;
    blob.x += blob.vx * dt;
    blob.y += blob.vy * dt;

    const maxRadius = this.config.worldSize - 2.2;
    const afterRadius = length(blob.x, blob.y);
    if (afterRadius > maxRadius) {
      const nx = blob.x / afterRadius;
      const ny = blob.y / afterRadius;
      blob.x = nx * maxRadius;
      blob.y = ny * maxRadius;
      const outward = blob.vx * nx + blob.vy * ny;
      if (outward > 0) {
        blob.vx -= outward * nx * 1.35;
        blob.vy -= outward * ny * 1.35;
      }
      blob.wanderAngle = Math.atan2(-blob.y, -blob.x) + this.random.range(-0.45, 0.45);
      blob.wanderTimer = 1;
    }
  }

  _emit(type, x, y, group, extra = {}) {
    const lifeByType = { eat: 1.1, contact: 1.25, birth: 1.15, death: 1.1 };
    const life = lifeByType[type] || 1;
    this.effects.push({
      id: `${type}-${this.time}-${this.random.next()}`,
      type,
      x,
      y,
      group,
      life,
      maxLife: life,
      phase: this.random.range(0, TAU),
      ...extra,
    });
    if (this.effects.length > 80) this.effects.splice(0, this.effects.length - 80);
  }

  _recordHistory() {
    const counts = this.counts;
    const row = {
      time: this.time,
      fruit: counts.fruit,
      fruitMass: this.fruitMass,
      blue: counts.blue,
      red: counts.red,
    };
    this.history.push(row);
    if (this.history.length > 600) this.history.shift();

    if (counts.blue > this.stats.bluePeak) {
      this.stats.bluePeak = counts.blue;
      this.stats.bluePeakTime = this.time;
    }
    if (counts.red > this.stats.redPeak) {
      this.stats.redPeak = counts.red;
      this.stats.redPeakTime = this.time;
    }
    this.stats.fruitPeak = Math.max(this.stats.fruitPeak, counts.fruit);
  }
}

export function runHeadless(config = {}, duration = 240) {
  const simulation = new GardenSimulation(config);
  const ticks = Math.round(duration / 0.25);
  for (let i = 0; i < ticks; i += 1) simulation.step(0.25);
  return {
    counts: simulation.counts,
    stats: { ...simulation.stats },
    history: simulation.history.slice(),
    narrative: simulation.getNarrative(),
  };
}
