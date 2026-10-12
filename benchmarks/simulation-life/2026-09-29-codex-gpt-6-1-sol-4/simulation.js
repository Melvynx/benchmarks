export const BASE = {
  growth: 0.34, fruitLimit: 7, returnDelay: 5,
  blueUse: 1.05, blueSpeed: 10, blueVision: 52, blueThreshold: 82, eatingTime: 1.1,
  redUse: 1.85, redSpeed: 11.5, redVision: 64, contactStrength: 38, redThreshold: 88, pauseTime: 2.8,
  trees: 16, blues: 28, reds: 7, worldSize: 100, seed: 4268,
};
export const PRESETS = {
  balanced: { name: 'Balanced garden', description: 'A little of everything. Let nature find its rhythm.', icon: 'clover', values: {} },
  abundant: { name: 'Fruit-rich garden', description: 'An all-you-can-eat buffet for the blue blobs.', icon: 'sprout', values: { growth: 0.6, trees: 21, fruitLimit: 9, returnDelay: 2, reds: 5 } },
  redheavy: { name: 'Red-heavy garden', description: 'Lots of hungry reds. What happens next?', icon: 'flame', values: { reds: 23, blues: 32, redUse: 1.55, contactStrength: 48 } },
  fragile: { name: 'Fragile balance', description: 'A small garden, walking a very fine line.', icon: 'sparkles', values: { trees: 10, blues: 18, reds: 5, growth: 0.26, blueUse: 1.2, returnDelay: 7 } },
  scarce: { name: 'Low-fruit garden', description: 'Slow-growing fruit makes every bite count.', icon: 'leaf', values: { growth: 0.14, trees: 8, fruitLimit: 5, returnDelay: 8, blues: 12, reds: 3, blueUse: 0.8 } },
};
export function seededRandom(seed) {
  let a = Number(seed) >>> 0;
  return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export class Garden {
  constructor(config = BASE) {
    this.config = { ...BASE, ...config };
    this.random = seededRandom(this.config.seed);
    this.time = 0; this.nextId = 1; this.history = []; this.events = [];
    this.trees = []; this.blobs = []; this.particles = [];
    this.births = { blue: 0, red: 0 }; this.deaths = { blue: 0, red: 0 }; this.bites = 0; this.contacts = 0;
    const r = this.config.worldSize;
    for (let i = 0; i < this.config.trees; i++) {
      const angle = i * 2.39996 + this.random() * 0.4;
      const radius = Math.sqrt((i + 0.6) / this.config.trees) * r * 0.81;
      this.trees.push({ id: i, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, fruit: this.config.fruitLimit * (0.65 + this.random() * 0.35), delay: 0, variant: this.random(), pulse: 0 });
    }
    for (let i = 0; i < this.config.blues; i++) this.spawn('blue');
    for (let i = 0; i < this.config.reds; i++) this.spawn('red');
    this.record();
  }
  point() { const a = this.random() * Math.PI * 2, r = Math.sqrt(this.random()) * this.config.worldSize * 0.88; return { x: Math.cos(a) * r, y: Math.sin(a) * r }; }
  spawn(group, parent = null) {
    const point = parent ? { x: parent.x + (this.random() - 0.5) * 8, y: parent.y + (this.random() - 0.5) * 8 } : this.point();
    const prefix = group === 'blue' ? 'blue' : 'red';
    const variation = parent ? Math.max(0.8, Math.min(1.2, parent.trait + (this.random() - 0.5) * 0.08)) : 0.9 + this.random() * 0.2;
    const blob = { ...point, id: this.nextId++, group, energy: parent ? 32 : 40 + this.random() * 27,
      age: 0, trait: variation, generation: parent ? parent.generation + 1 : 1, parent: parent?.id ?? null,
      action: 'Wandering', pause: 0, immunity: 0, reproduction: 10 + this.random() * 8,
      angle: this.random() * Math.PI * 2, wander: this.point(), phase: this.random() * Math.PI * 2,
      speed: this.config[`${prefix}Speed`] * variation, moving: false, pulse: parent ? 1 : 0, meal: null,
      lifespan: 240 + this.random() * 150,
    };
    this.blobs.push(blob);
    if (parent) { this.births[group]++; this.emit(blob.x, blob.y, group, 'birth'); }
    return blob;
  }
  emit(x, y, group, type) { this.particles.push({ x, y, group, type, life: 1, id: this.nextId++ }); }
  update(dt) {
    const c = this.config;
    const previousTime = this.time;
    this.time = Math.round((this.time + dt) * 1e9) / 1e9;
    this.particles.forEach(p => p.life -= dt * 0.9); this.particles = this.particles.filter(p => p.life > 0);
    for (const tree of this.trees) {
      tree.delay = Math.max(0, tree.delay - dt); tree.pulse = Math.max(0, tree.pulse - dt * 2);
      if (!tree.delay) tree.fruit = Math.min(c.fruitLimit, tree.fruit + c.growth * dt);
      else tree.fruit = Math.min(c.fruitLimit, tree.fruit);
    }
    const blue = this.blobs.filter(b => b.group === 'blue');
    const red = this.blobs.filter(b => b.group === 'red');
    const treeCrowds = new Map(this.trees.map(tree => [tree.id, blue.reduce((n, b) => n + (distance(b, tree) < 13 ? 1 : 0), 0)]));
    const children = [];
    for (const b of this.blobs) {
      if (b.energy <= 0) continue;
      const isBlue = b.group === 'blue';
      b.age += dt; b.immunity = Math.max(0, b.immunity - dt); b.reproduction -= dt; b.pulse = Math.max(0, b.pulse - dt * 1.6);
      b.speed = c[isBlue ? 'blueSpeed' : 'redSpeed'] * b.trait;
      const oldPause = b.pause;
      b.pause = Math.max(0, b.pause - dt);
      b.moving = false;
      const use = c[isBlue ? 'blueUse' : 'redUse'];
      b.energy -= use * dt * (0.45 + (isBlue ? blue.length : red.length) * 0.0025);
      if (b.age > b.lifespan) b.energy -= 5 * dt;
      if (oldPause > 0) {
        if (!b.pause && b.meal) { b.energy = Math.min(125, b.energy + b.meal); b.meal = null; b.pulse = 1; this.emit(b.x, b.y, b.group, 'meal'); }
        continue;
      }
      let target = null;
      let action = 'Wandering';
      if (isBlue) {
        let nearestRed = null, dangerDist = 26;
        for (const other of red) { const d = distance(b, other); if (d < dangerDist && !other.pause) { dangerDist = d; nearestRed = other; } }
        if (nearestRed && !b.immunity) {
          target = { x: b.x + (b.x - nearestRed.x) * 2, y: b.y + (b.y - nearestRed.y) * 2 }; action = 'Escaping a red';
        } else {
          let best = Infinity;
          for (const tree of this.trees) {
            if (tree.fruit < 1) continue;
            const d = distance(b, tree);
            if (d > c.blueVision) continue;
            const crowd = Math.max(0, treeCrowds.get(tree.id) - (d < 13 ? 1 : 0));
            const score = d + crowd * 4;
            if (score < best) { best = score; target = tree; action = 'Looking for fruit'; }
          }
          if (target && distance(b, target) < 6) {
            target.fruit -= 1; target.delay = c.returnDelay; target.pulse = 1;
            b.pause = c.eatingTime; b.meal = 23; b.action = 'Eating fruit'; this.bites++; b.pulse = 1;
            continue;
          }
        }
      } else {
        let closest = c.redVision;
        for (const other of blue) { if (other.energy <= 0 || other.immunity > 0) continue; const d = distance(b, other); if (d < closest) { closest = d; target = other; action = 'Looking for a blue'; } }
        if (target && closest < 5.5) {
          const transferred = Math.min(target.energy, c.contactStrength);
          target.energy -= transferred;
          target.immunity = 8;
          target.pulse = 1;
          b.meal = transferred * 0.82;
          b.pause = c.pauseTime;
          b.action = 'Taking a little break'; b.pulse = 1;
          this.contacts++; this.emit(b.x, b.y, 'red', 'contact');
          continue;
        }
      }
      if (!target) { if (distance(b, b.wander) < 6 || this.random() < dt * 0.12) b.wander = this.point(); target = b.wander; }
      let dx = target.x - b.x, dy = target.y - b.y;
      // Gentle local separation avoids piles without creating a population cap.
      for (const other of (isBlue ? blue : red)) {
        if (other.id === b.id) continue;
        const d = distance(b, other);
        if (d < 7 && d > 0.1) { dx += (b.x - other.x) / d * (7 - d) * 1.4; dy += (b.y - other.y) / d * (7 - d) * 1.4; }
      }
      const norm = Math.hypot(dx, dy);
      if (norm > 0.1) {
        const step = Math.min(norm, b.speed * dt);
        b.x += dx / norm * step; b.y += dy / norm * step;
        b.angle = Math.atan2(dy, dx); b.moving = true;
        b.energy -= use * dt * 0.62 * (b.speed / 10);
        const r = Math.hypot(b.x, b.y), bound = c.worldSize * 0.93;
        if (r > bound) { b.x *= bound / r; b.y *= bound / r; b.wander = this.point(); }
      }
      b.action = action;
      const threshold = c[isBlue ? 'blueThreshold' : 'redThreshold'];
      if (b.energy >= threshold && b.reproduction <= 0) {
        b.energy -= 46; b.reproduction = 14;
        children.push(b); b.pulse = 1;
      }
    }
    const fading = this.blobs.filter(b => b.energy <= 0);
    for (const b of fading) { this.deaths[b.group]++; this.emit(b.x, b.y, b.group, 'fade'); }
    this.blobs = this.blobs.filter(b => b.energy > 0);
    for (const parent of children) this.spawn(parent.group, parent);
    if (Math.floor(this.time) > Math.floor(previousTime)) this.record();
  }
  advance(seconds) { for (let t = 0; t < seconds - 0.00001; t += 0.1) this.update(Math.min(0.1, seconds - t)); }
  counts() { return { fruit: Math.floor(this.trees.reduce((sum, t) => sum + t.fruit, 0)), blue: this.blobs.filter(b => b.group === 'blue').length, red: this.blobs.filter(b => b.group === 'red').length }; }
  record() { this.history.push({ time: this.time, ...this.counts() }); if (this.history.length > 1801) this.history.splice(1, 1); }
  summary() {
    const n = this.counts();
    if (this.time < 25) return { title: 'Every garden has a beginning.', text: 'Fruit feeds the blues. Blues feed the reds. Press play and see where this little world goes.' };
    if (!n.blue && !n.red) return { title: 'A quiet garden, growing again.', text: 'Both groups faded. The trees are replenishing their fruit. Try more food or lower energy use.' };
    if (!n.red) return { title: 'The blues have the garden to themselves.', text: 'The reds ran out of energy. Fruit and the cost of moving now shape the blue population.' };
    if (!n.blue) return { title: 'The reds are running out of company.', text: 'The blue group faded first. Without contact energy, the remaining reds will slowly fade too.' };
    if (cLow(this.config)) return { title: 'A small garden makes every fruit count.', text: 'Slow regrowth limits the energy available to both groups. Smaller populations leave room to recover.' };
    const peak = this.history.reduce((p, h) => h.blue > p.blue ? h : p, this.history[0]);
    if (this.time > 70 && this.births.red > 0) return { title: 'A little give. A little take.', text: `The blues reached ${peak.blue}, giving the reds room to grow. As food and energy change, the balance keeps moving.` };
    return { title: 'The garden is finding its rhythm.', text: 'The blues gather energy from fruit. The reds follow, and each new blob costs its parent energy.' };
  }
}
function cLow(c) { return c.growth * c.trees < 1.3; }
