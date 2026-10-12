export const defaults = {
  fruitGrowth: 0.37, fruitLimit: 7, fruitDelay: 3.2,
  blueUse: 1.25, blueSpeed: 1, blueVision: 1, blueCopy: 76, blueEat: 0.9,
  redUse: 1.35, redSpeed: 1.04, redVision: 1, redStrength: 18, redCopy: 80, redPause: 1.4,
  trees: 13, blue: 20, red: 6, worldSize: 1, seed: 42, speed: 1
};

export const presets = {
  balanced: { ...defaults },
  rich: { ...defaults, fruitGrowth: 0.4, fruitLimit: 9, trees: 17, blue: 20, red: 5 },
  red: { ...defaults, red: 15, blue: 19, redStrength: 23, redUse: 1.8 },
  fragile: { ...defaults, fruitGrowth: 0.18, trees: 11, blue: 16, red: 7, redStrength: 19 },
  low: { ...defaults, fruitGrowth: 0.11, fruitLimit: 4, trees: 9, blue: 14, red: 1 }
};

function seeded(seed) {
  let value = (Math.floor(seed) || 1) >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export class Garden {
  constructor(settings = defaults) { this.reset(settings); }

  reset(settings) {
    this.settings = { ...settings };
    this.random = seeded(settings.seed);
    this.time = 0;
    this.nextId = 1;
    this.events = [];
    this.history = [];
    this.trees = [];
    this.blobs = [];
    const count = Number(settings.trees);
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996 + this.random() * .55;
      const radius = Math.sqrt((i + .5) / (count + 1)) * .76 * settings.worldSize;
      this.trees.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
        fruit: Math.max(1, settings.fruitLimit * (.44 + this.random() * .42)),
        wait: 0, size: .82 + this.random() * .36, sway: this.random() * 6.28, id: i });
    }
    for (let i = 0; i < settings.blue; i++) this.addBlob('blue', true);
    for (let i = 0; i < settings.red; i++) this.addBlob('red', true);
    this.record();
  }

  addBlob(type, initial = false, parent = null) {
    const angle = this.random() * Math.PI * 2;
    const radius = Math.sqrt(this.random()) * .83 * this.settings.worldSize;
    const blob = { id: this.nextId++, type, x: parent ? parent.x + (this.random() - .5) * .09 : Math.cos(angle) * radius,
      y: parent ? parent.y + (this.random() - .5) * .09 : Math.sin(angle) * radius,
      tx: null, ty: null, energy: initial ? 48 + this.random() * 21 : 34,
      age: initial ? this.random() * 9 : 0, action: 'Wandering', timer: 0,
      cooldown: initial ? this.random() * 5 : 8, phase: this.random() * 6.28,
      speedTrait: .85 + this.random() * .3, visionTrait: .88 + this.random() * .24,
      parent: parent?.id ?? null, generation: parent ? parent.generation + 1 : 1,
      pulse: 0, facing: 1 };
    this.blobs.push(blob);
    return blob;
  }

  chooseTarget(blob, blues, reds) {
    const s = this.settings;
    if (blob.type === 'blue') {
      const danger = reds.filter(b => b.energy > 4 && distance(blob, b) < .28 * s.redVision);
      if (danger.length) {
        const nearest = danger.reduce((a, b) => distance(blob, a) < distance(blob, b) ? a : b);
        const dx = blob.x - nearest.x, dy = blob.y - nearest.y, len = Math.hypot(dx, dy) || 1;
        blob.tx = blob.x + dx / len * .32; blob.ty = blob.y + dy / len * .32;
        blob.action = 'Dodging red'; return;
      }
      const available = this.trees.filter(t => t.fruit >= .98 && distance(blob, t) < .68 * s.blueVision);
      if (available.length && blob.energy < 89) {
        const tree = available.reduce((a, b) => (distance(blob, a) - a.fruit * .015) < (distance(blob, b) - b.fruit * .015) ? a : b);
        blob.tx = tree.x; blob.ty = tree.y + .04; blob.targetId = tree.id;
        blob.action = 'Seeking fruit'; return;
      }
    } else {
      const visible = blues.filter(b => b.energy > 8 && distance(blob, b) < .7 * s.redVision);
      if (visible.length && blob.energy < 91) {
        const prey = visible.reduce((a, b) => distance(blob, a) < distance(blob, b) ? a : b);
        blob.tx = prey.x; blob.ty = prey.y; blob.targetId = prey.id;
        blob.action = 'Following blue'; return;
      }
    }
    if (blob.action === 'Wandering' && blob.tx !== null && Math.hypot(blob.tx - blob.x, blob.ty - blob.y) > .025) return;
    const a = this.random() * 6.283, r = .16 + this.random() * .34;
    blob.tx = blob.x + Math.cos(a) * r; blob.ty = blob.y + Math.sin(a) * r;
    blob.action = 'Wandering';
  }

  tick(dt = .12) {
    const s = this.settings;
    this.time += dt;
    this.events = this.events.filter(e => this.time - e.time < 1.25);
    for (const tree of this.trees) {
      if (tree.wait > 0) tree.wait = Math.max(0, tree.wait - dt);
      else tree.fruit = Math.min(s.fruitLimit, tree.fruit + s.fruitGrowth * dt);
    }
    const blues = this.blobs.filter(b => b.type === 'blue');
    const reds = this.blobs.filter(b => b.type === 'red');
    const newborns = [];
    for (const blob of this.blobs) {
      blob.age += dt; blob.cooldown = Math.max(0, blob.cooldown - dt);
      blob.pulse = Math.max(0, blob.pulse - dt * 1.4);
      const use = blob.type === 'blue' ? s.blueUse : s.redUse;
      blob.energy -= use * dt * (blob.timer > 0 ? .45 : 1);
      if (blob.timer > 0) {
        blob.timer = Math.max(0, blob.timer - dt);
        if (blob.timer === 0) blob.action = 'Wandering';
        continue;
      }
      this.chooseTarget(blob, blues, reds);
      const dx = blob.tx - blob.x, dy = blob.ty - blob.y;
      const d = Math.hypot(dx, dy);
      const speed = (blob.type === 'blue' ? s.blueSpeed : s.redSpeed) * blob.speedTrait * .12;
      const step = Math.min(d, speed * dt);
      if (d > .001) {
        blob.x += dx / d * step; blob.y += dy / d * step;
        blob.facing = dx >= 0 ? 1 : -1;
        blob.energy -= use * dt * .28;
      }
      const edge = .91 * s.worldSize;
      const radius = Math.hypot(blob.x, blob.y);
      if (radius > edge) { blob.x *= edge / radius; blob.y *= edge / radius; blob.tx = null; }
      if (blob.type === 'blue') {
        const tree = this.trees.find(t => t.fruit >= 1 && distance(blob, t) < .13);
        if (tree && blob.energy < 91) {
          tree.fruit -= 1; tree.wait = s.fruitDelay;
          blob.energy = Math.min(100, blob.energy + 19);
          blob.timer = s.blueEat; blob.pulse = 1;
          blob.action = 'Nibbling fruit'; blob.tx = null;
          this.events.push({ x: tree.x, y: tree.y, type: 'fruit', time: this.time });
        }
      } else if (blob.cooldown === 0) {
        const prey = blues.find(b => b.energy > 9 && distance(blob, b) < .085);
        if (prey) {
          const taken = Math.min(prey.energy - 3, s.redStrength);
          prey.energy -= taken;
          prey.pulse = 1; prey.action = 'Startled!'; prey.timer = .28;
          blob.energy = Math.min(100, blob.energy + taken * .84);
          blob.timer = s.redPause; blob.cooldown = s.redPause + 2.2;
          blob.pulse = 1; blob.action = 'Happy bounce'; blob.tx = null;
          this.events.push({ x: blob.x, y: blob.y, type: 'contact', time: this.time });
        }
      }
      const threshold = blob.type === 'blue' ? s.blueCopy : s.redCopy;
      const count = blob.type === 'blue' ? blues.length : reds.length;
      if (blob.energy >= threshold && blob.age > 6 && blob.cooldown === 0 && count + newborns.filter(b => b.type === blob.type).length < 110) {
        blob.energy -= 38; blob.cooldown = 9; blob.pulse = 1;
        newborns.push(blob);
      }
    }
    this.blobs = this.blobs.filter(b => b.energy > 0 && b.age < 250);
    for (const parent of newborns) this.addBlob(parent.type, false, parent);
    if (this.history.length === 0 || this.time - this.history[this.history.length - 1].t >= .75) this.record();
  }

  record() {
    this.history.push({ t: this.time, fruit: this.trees.reduce((sum, t) => sum + t.fruit, 0),
      blue: this.blobs.filter(b => b.type === 'blue').length,
      red: this.blobs.filter(b => b.type === 'red').length });
    if (this.history.length > 500) this.history.shift();
  }

  get counts() {
    return { fruit: Math.round(this.trees.reduce((sum, t) => sum + t.fruit, 0)),
      blue: this.blobs.filter(b => b.type === 'blue').length,
      red: this.blobs.filter(b => b.type === 'red').length };
  }
}
