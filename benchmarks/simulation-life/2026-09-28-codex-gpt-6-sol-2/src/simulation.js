export const defaults = {
  fruitGrowth: 1,
  fruitLimit: 5,
  fruitDelay: 8,
  blueUse: 1.55,
  blueSpeed: 12,
  blueVision: 26,
  blueCopy: 116,
  blueEatTime: 1.15,
  redUse: 2.05,
  redSpeed: 15.2,
  redVision: 13.5,
  redStrength: 26,
  redCopy: 101,
  redPause: 2.4,
  startTrees: 13,
  startBlue: 15,
  startRed: 5,
  worldSize: 52,
  seed: 4271,
  speed: 1,
};

export const presets = {
  Balanced: { ...defaults },
  'Fruit rich': { ...defaults, fruitGrowth: 1.4, fruitLimit: 6, startTrees: 16, startBlue: 17, startRed: 5 },
  'Red heavy': { ...defaults, startBlue: 19, startRed: 12, redStrength: 34, redUse: 3.2, fruitGrowth: 1.1 },
  'Fragile balance': { ...defaults, fruitGrowth: 0.85, fruitLimit: 4, startBlue: 15, startRed: 5, blueUse: 1.8, redUse: 2.3 },
  'Low fruit': { ...defaults, fruitGrowth: 0.55, fruitLimit: 3, startTrees: 8, startBlue: 9, startRed: 3 },
};

function seedRandom(seed) {
  let value = (Number(seed) || 1) >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export class Garden {
  constructor(config) {
    this.config = { ...config };
    this.random = seedRandom(config.seed);
    this.time = 0;
    this.nextId = 1;
    this.trees = [];
    this.blobs = [];
    this.effects = [];
    this.history = [];
    this.recordClock = 0;
    this.events = { fruitEaten: 0, contacts: 0, blueBorn: 0, redBorn: 0 };
    this.makeInitialWorld();
    this.record();
  }

  setConfig(config) {
    this.config = { ...config };
    for (const tree of this.trees) {
      while (tree.fruits.length < config.fruitLimit) {
        tree.fruits.push({ ripe: 0, delay: this.random() * config.fruitDelay });
      }
      tree.fruits.length = config.fruitLimit;
    }
  }

  point(radius = this.config.worldSize * 0.88) {
    const angle = this.random() * Math.PI * 2;
    const r = Math.sqrt(this.random()) * radius;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  }

  makeInitialWorld() {
    for (let i = 0; i < this.config.startTrees; i++) {
      let spot = this.point(this.config.worldSize * 0.78);
      for (let attempt = 0; attempt < 20 && this.trees.some(tree => distance(tree, spot) < 10); attempt++) {
        spot = this.point(this.config.worldSize * 0.78);
      }
      this.trees.push({
        id: i,
        ...spot,
        height: 0.84 + this.random() * 0.4,
        shape: this.random(),
        fruits: Array.from({ length: this.config.fruitLimit }, () => ({ ripe: 0.45 + this.random() * 0.55, delay: 0 })),
      });
    }
    for (let i = 0; i < this.config.startBlue; i++) this.addBlob('blue', this.point(), 63 + this.random() * 19, true);
    for (let i = 0; i < this.config.startRed; i++) this.addBlob('red', this.point(), 66 + this.random() * 16, true);
  }

  addBlob(group, point, energy, initial = false, parent = null) {
    const baseSpeed = group === 'blue' ? this.config.blueSpeed : this.config.redSpeed;
    const baseVision = group === 'blue' ? this.config.blueVision : this.config.redVision;
    const inherited = parent ? 0.94 + this.random() * 0.12 : 0.94 + this.random() * 0.12;
    const blob = {
      id: this.nextId++, group, x: point.x, y: point.y,
      vx: 0, vy: 0, heading: this.random() * Math.PI * 2,
      energy, age: initial ? this.random() * 22 : 0,
      speedTrait: clamp((parent?.speedTrait || inherited) * (parent ? 0.97 + this.random() * 0.06 : 1), 0.78, 1.24),
      visionTrait: clamp((parent?.visionTrait || (0.94 + this.random() * 0.12)) * (parent ? 0.97 + this.random() * 0.06 : 1), 0.78, 1.24),
      baseSpeed, baseVision,
      action: 'Wandering', timer: 0, cooldown: this.random() * 2,
      contactShield: 0,
      wanderAngle: this.random() * Math.PI * 2, wanderTimer: 0,
      parentId: parent?.id ?? null, generation: parent ? parent.generation + 1 : 1,
      blinkOffset: this.random() * 10, bounceOffset: this.random() * Math.PI * 2,
    };
    this.blobs.push(blob);
    if (!initial) this.events[group === 'blue' ? 'blueBorn' : 'redBorn']++;
    return blob;
  }

  ripeFruitCount() {
    let count = 0;
    for (const tree of this.trees) for (const fruit of tree.fruits) if (fruit.ripe >= 0.72) count++;
    return count;
  }

  counts() {
    let blue = 0, red = 0;
    for (const blob of this.blobs) blob.group === 'blue' ? blue++ : red++;
    return { fruit: this.ripeFruitCount(), blue, red };
  }

  record() {
    this.history.push({ time: this.time, ...this.counts() });
    if (this.history.length > 1800) this.history.shift();
  }

  step(dt) {
    dt = Math.min(dt, 0.2);
    this.time += dt;
    this.growFruit(dt);
    const newborns = [];
    const blues = this.blobs.filter(blob => blob.group === 'blue' && blob.energy > 0);
    for (const blob of this.blobs.slice()) {
      blob.age += dt;
      blob.cooldown = Math.max(0, blob.cooldown - dt);
      blob.contactShield = Math.max(0, blob.contactShield - dt);
      const use = blob.group === 'blue' ? this.config.blueUse : this.config.redUse;
      const moving = Math.hypot(blob.vx, blob.vy) > 1;
      blob.energy -= use * dt * (moving ? 1.12 : 0.76);
      if (blob.timer > 0) {
        blob.timer = Math.max(0, blob.timer - dt);
        blob.vx *= Math.max(0, 1 - dt * 5);
        blob.vy *= Math.max(0, 1 - dt * 5);
        blob.x += blob.vx * dt;
        blob.y += blob.vy * dt;
        if (blob.timer === 0) blob.action = 'Wandering';
      } else if (blob.group === 'blue') {
        this.moveBlue(blob, dt, blues.length);
      } else {
        this.moveRed(blob, blues, dt);
      }
      this.keepInside(blob);
      if (blob.energy > (blob.group === 'blue' ? this.config.blueCopy : this.config.redCopy) && blob.age > 11 && blob.cooldown === 0 && this.blobs.length + newborns.length < 180) {
        const cost = blob.group === 'blue' ? 63 : 67;
        blob.energy -= cost;
        blob.cooldown = 13 + this.random() * 6;
        const baby = this.addBlob(blob.group, { x: blob.x + (this.random() - 0.5) * 5, y: blob.y + (this.random() - 0.5) * 5 }, cost * 0.65, false, blob);
        newborns.push(baby);
        this.effects.push({ x: blob.x, y: blob.y, group: blob.group, kind: 'birth', age: 0 });
      }
    }
    this.blobs = this.blobs.filter(blob => blob.energy > 0 && blob.age < (blob.group === 'blue' ? 175 : 165));
    for (const effect of this.effects) effect.age += dt;
    this.effects = this.effects.filter(effect => effect.age < 1.1);
    this.recordClock += dt;
    if (this.recordClock >= 1.5) {
      this.recordClock = 0;
      this.record();
    }
  }

  growFruit(dt) {
    for (const tree of this.trees) {
      for (const fruit of tree.fruits) {
        if (fruit.delay > 0) fruit.delay = Math.max(0, fruit.delay - dt);
        else fruit.ripe = Math.min(1, fruit.ripe + dt * this.config.fruitGrowth / 22);
      }
    }
  }

  moveBlue(blob, dt, blueCount) {
    const vision = this.config.blueVision * blob.visionTrait;
    let nearestRed = null, redDistance = Infinity;
    for (const other of this.blobs) {
      if (other.group !== 'red' || other.energy <= 0) continue;
      const d = distance(blob, other);
      if (d < redDistance) { redDistance = d; nearestRed = other; }
    }
    const alertness = clamp((16 - blueCount) / 12, 0, 1);
    if (nearestRed && redDistance < Math.min(vision, 10 + alertness * 9)) {
      blob.action = 'Fleeing red';
      const a = Math.atan2(blob.y - nearestRed.y, blob.x - nearestRed.x);
      this.steer(blob, a, this.config.blueSpeed * blob.speedTrait * (1.04 + alertness * 0.2), dt);
      return;
    }
    let target = null, best = Infinity;
    for (const tree of this.trees) {
      if (!tree.fruits.some(fruit => fruit.ripe >= 0.72)) continue;
      const d = distance(blob, tree);
      if (d < best && d < vision) { best = d; target = tree; }
    }
    if (target) {
      if (best < 4.3 && blob.cooldown === 0) {
        const fruit = target.fruits.find(item => item.ripe >= 0.72);
        fruit.ripe = 0;
        fruit.delay = this.config.fruitDelay;
        blob.energy = Math.min(155, blob.energy + 39);
        blob.timer = this.config.blueEatTime;
        blob.cooldown = this.config.blueEatTime + 0.45;
        blob.action = 'Eating fruit';
        blob.vx = blob.vy = 0;
        this.events.fruitEaten++;
        this.effects.push({ x: target.x, y: target.y, group: 'fruit', kind: 'eat', age: 0 });
      } else {
        blob.action = 'Seeking fruit';
        const angle = Math.atan2(target.y - blob.y, target.x - blob.x);
        this.steer(blob, angle, this.config.blueSpeed * blob.speedTrait, dt);
      }
    } else this.wander(blob, dt);
  }

  moveRed(blob, blues, dt) {
    const vision = this.config.redVision * blob.visionTrait;
    let target = null, best = Infinity;
    for (const blue of blues) {
      if (blue.energy <= 0 || blue.contactShield > 0) continue;
      const d = distance(blob, blue);
      if (d < best && d < vision) { best = d; target = blue; }
    }
    if (!target) return this.wander(blob, dt);
    if (best < 3.5 && blob.cooldown === 0) {
      const drain = Math.min(target.energy, this.config.redStrength);
      target.energy -= drain;
      target.contactShield = 4.5;
      blob.energy = Math.min(155, blob.energy + drain * 0.88);
      blob.timer = this.config.redPause;
      blob.cooldown = this.config.redPause + 1.1;
      blob.action = 'Resting after contact';
      blob.vx = blob.vy = 0;
      target.vx += (target.x - blob.x) * 1.2;
      target.vy += (target.y - blob.y) * 1.2;
      this.events.contacts++;
      this.effects.push({ x: (blob.x + target.x) / 2, y: (blob.y + target.y) / 2, group: 'red', kind: 'contact', age: 0 });
    } else {
      blob.action = 'Looking for blue';
      this.steer(blob, Math.atan2(target.y - blob.y, target.x - blob.x), this.config.redSpeed * blob.speedTrait, dt);
    }
  }

  wander(blob, dt) {
    blob.wanderTimer -= dt;
    if (blob.wanderTimer <= 0) {
      blob.wanderAngle += (this.random() - 0.5) * 2.8;
      blob.wanderTimer = 1.5 + this.random() * 3.5;
    }
    const edge = Math.hypot(blob.x, blob.y) / this.config.worldSize;
    const angle = edge > 0.75 ? Math.atan2(-blob.y, -blob.x) : blob.wanderAngle;
    blob.action = 'Wandering';
    this.steer(blob, angle, (blob.group === 'blue' ? this.config.blueSpeed : this.config.redSpeed) * blob.speedTrait * 0.48, dt);
  }

  steer(blob, angle, speed, dt) {
    const targetX = Math.cos(angle) * speed;
    const targetY = Math.sin(angle) * speed;
    const response = Math.min(1, dt * 4);
    blob.vx += (targetX - blob.vx) * response;
    blob.vy += (targetY - blob.vy) * response;
    blob.x += blob.vx * dt;
    blob.y += blob.vy * dt;
    if (Math.hypot(blob.vx, blob.vy) > 0.5) blob.heading = Math.atan2(blob.vy, blob.vx);
  }

  keepInside(blob) {
    const radius = this.config.worldSize * 0.93;
    const d = Math.hypot(blob.x, blob.y);
    if (d > radius) {
      blob.x = blob.x / d * radius;
      blob.y = blob.y / d * radius;
      blob.vx *= -0.25;
      blob.vy *= -0.25;
    }
  }
}
