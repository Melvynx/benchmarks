export const DEFAULTS = {
  growth: 0.8, fruitLimit: 6, returnDelay: 5,
  blueEnergy: 0.8, blueSpeed: 1, blueVision: 5, blueThreshold: 88, eatingTime: 1.6,
  redEnergy: 0.9, redSpeed: 1.05, redVision: 5, contactStrength: 25, redThreshold: 105, pauseTime: 5,
  trees: 12, blues: 24, reds: 6, worldSize: 10, seed: 42,
};

export const PRESETS = {
  balanced: { name: 'Balanced garden', description: 'A little of everything. Room to find a rhythm.', icon: 'sprout', settings: {} },
  rich: { name: 'Fruit-rich garden', description: 'A generous harvest for hungry little blues.', icon: 'leaf', settings: { growth: 1.6, fruitLimit: 9, returnDelay: 3, trees: 16, reds: 4 } },
  red: { name: 'Red-heavy garden', description: 'More reds, fewer quiet moments. What happens next?', icon: 'flame', settings: { reds: 16, blues: 26, contactStrength: 38 } },
  fragile: { name: 'Fragile balance', description: 'A small garden, where every little life matters.', icon: 'sparkles', settings: { trees: 8, blues: 15, reds: 4, growth: 0.55, blueEnergy: 1, redEnergy: 0.85 } },
  low: { name: 'Low-fruit garden', description: 'Slow-growing fruit makes for a quieter world.', icon: 'leaf', settings: { trees: 7, growth: 0.25, fruitLimit: 3, returnDelay: 10, blues: 16, reds: 4 } },
};

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Garden {
  constructor(settings = DEFAULTS) { this.reset(settings); }

  reset(settings) {
    this.settings = { ...DEFAULTS, ...settings };
    this.random = seededRandom(this.settings.seed);
    this.time = 0;
    this.nextId = 1;
    this.lastRecord = -1;
    this.blobs = [];
    this.plants = [];
    this.particles = [];
    this.history = [];
    this.events = [];
    this.births = { blue: 0, red: 0 };
    this.faded = { blue: 0, red: 0 };
    this.meals = 0;
    this.contacts = 0;
    for (let i = 0; i < this.settings.trees; i++) {
      const angle = i * 2.39996 + this.random() * 0.3;
      const radius = Math.sqrt((i + 1) / (this.settings.trees + 1)) * this.settings.worldSize * 0.79;
      this.plants.push({ id: i, x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, fruit: this.settings.fruitLimit, regrowth: 0, cooldown: 0, variation: this.random(), pulse: 0 });
    }
    for (let i = 0; i < this.settings.blues; i++) this.addBlob('blue');
    for (let i = 0; i < this.settings.reds; i++) this.addBlob('red');
    this.record();
  }

  position() {
    const angle = this.random() * Math.PI * 2;
    const radius = Math.sqrt(this.random()) * this.settings.worldSize * 0.89;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }

  addBlob(kind, parent) {
    const p = parent ? { x: parent.x + (this.random() - 0.5) * 0.5, z: parent.z + (this.random() - 0.5) * 0.5 } : this.position();
    const trait = parent ? clamp(parent.trait + (this.random() - 0.5) * 0.05, 0.8, 1.2) : 0.93 + this.random() * 0.14;
    const blob = { id: this.nextId++, kind, ...p, energy: parent ? 34 : 48 + this.random() * 22, age: 0, trait, parent: parent?.id ?? null, generation: parent ? parent.generation + 1 : 1, action: 'Exploring', timer: 0, birthCooldown: parent ? 10 : 4 + this.random() * 8, target: this.position(), angle: this.random() * Math.PI * 2, phase: this.random() * Math.PI * 2, pulse: parent ? 1 : 0, immune: parent ? 4 : 0 };
    this.blobs.push(blob);
    if (parent) {
      this.births[kind]++;
      this.emit(blob, 'birth');
    }
    return blob;
  }

  emit(blob, type) {
    this.particles.push({ x: blob.x, z: blob.z, age: 0, type, kind: blob.kind });
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    if (key === 'fruitLimit') for (const plant of this.plants) plant.fruit = Math.min(plant.fruit, value);
  }

  tick(dt = 0.1) {
    const s = this.settings;
    this.time += dt;
    for (const plant of this.plants) {
      plant.pulse = Math.max(0, plant.pulse - dt * 2);
      plant.cooldown = Math.max(0, plant.cooldown - dt);
      if (plant.fruit >= s.fruitLimit || plant.cooldown > 0) continue;
      plant.regrowth += dt * s.growth * 0.38;
      if (plant.regrowth >= 1) {
        plant.fruit++;
        plant.regrowth -= 1;
      }
    }
    const blue = this.blobs.filter(b => b.kind === 'blue' && b.energy > 0);
    const red = this.blobs.filter(b => b.kind === 'red' && b.energy > 0);
    const newborns = [];
    for (const blob of this.blobs) {
      if (blob.energy <= 0) continue;
      blob.age += dt;
      blob.birthCooldown -= dt;
      blob.immune = Math.max(0, blob.immune - dt);
      blob.pulse = Math.max(0, blob.pulse - dt * 1.4);
      const isBlue = blob.kind === 'blue';
      const energyUse = isBlue ? s.blueEnergy : s.redEnergy;
      blob.energy -= dt * energyUse * (blob.timer > 0 ? 0.42 : 1) * (0.8 + blob.trait * 0.2);
      if (blob.timer > 0) {
        blob.timer = Math.max(0, blob.timer - dt);
        continue;
      }
      let target = null;
      let flee = false;
      let nearest = Infinity;
      const vision = (isBlue ? s.blueVision : s.redVision) * blob.trait;
      if (isBlue) {
        const danger = red.find(r => r.energy > 0 && r.timer <= 0 && distance(r, blob) < 2.1);
        if (danger && blob.energy > 20) {
          target = { x: blob.x + (blob.x - danger.x) * 3, z: blob.z + (blob.z - danger.z) * 3 };
          blob.action = 'A little getaway';
          flee = true;
        } else if (blob.energy < s.blueThreshold + 10) {
          for (const plant of this.plants) {
            const d = distance(plant, blob);
            if (plant.fruit > 0 && d < vision && d < nearest) { target = plant; nearest = d; }
          }
          blob.action = target ? 'Finding fruit' : 'Exploring';
          if (target && nearest < 0.75) {
            if (target.fruit === s.fruitLimit) target.cooldown = s.returnDelay;
            target.fruit--;
            target.pulse = 1;
            blob.energy = Math.min(140, blob.energy + 25);
            blob.timer = s.eatingTime;
            blob.action = 'Happy munching';
            blob.pulse = 1;
            this.meals++;
            this.emit(blob, 'food');
            continue;
          }
        }
      } else {
        for (const other of blue) {
          if (other.energy <= 0 || other.immune > 0) continue;
          const d = distance(blob, other);
          if (d < vision && d < nearest) { target = other; nearest = d; }
        }
        blob.action = target ? 'Following a blue' : 'Exploring';
        if (target && nearest < 0.65) {
          const transfer = Math.min(s.contactStrength, Math.max(0, target.energy));
          target.energy -= transfer;
          target.immune = 6;
          target.pulse = 1;
          blob.energy = Math.min(150, blob.energy + transfer * 0.48);
          blob.timer = s.pauseTime;
          blob.action = 'A happy little rest';
          blob.pulse = 1;
          this.contacts++;
          this.emit(blob, 'contact');
          continue;
        }
      }
      if (!target) {
        if (distance(blob, blob.target) < 0.6) blob.target = this.position();
        target = blob.target;
        blob.action = 'Exploring';
      }
      let dx = target.x - blob.x;
      let dz = target.z - blob.z;
      const length = Math.hypot(dx, dz) || 1;
      dx /= length; dz /= length;
      // Gentle separation makes room at trees without forcing population changes.
      for (const other of isBlue ? blue : red) {
        if (other.id === blob.id) continue;
        const d = distance(other, blob);
        if (d > 0 && d < 0.5) {
          dx += (blob.x - other.x) / d * 0.55;
          dz += (blob.z - other.z) / d * 0.55;
        }
      }
      const speed = (isBlue ? s.blueSpeed : s.redSpeed) * blob.trait * (flee ? 1.12 : 1);
      const norm = Math.hypot(dx, dz) || 1;
      blob.x += dx / norm * speed * dt;
      blob.z += dz / norm * speed * dt;
      blob.angle = Math.atan2(dz, dx);
      blob.energy -= dt * speed * energyUse * 0.2;
      const radius = Math.hypot(blob.x, blob.z);
      if (radius > s.worldSize * 0.94) {
        blob.x *= s.worldSize * 0.94 / radius;
        blob.z *= s.worldSize * 0.94 / radius;
        blob.target = this.position();
      }
      const threshold = isBlue ? s.blueThreshold : s.redThreshold;
      if (blob.energy >= threshold && blob.birthCooldown <= 0) {
        // Creating a child costs more energy than the child receives.
        blob.energy -= 46;
        blob.birthCooldown = 12;
        blob.timer = 0.8;
        blob.action = 'Welcoming a little one';
        newborns.push(blob);
      }
    }
    this.blobs = this.blobs.filter(blob => {
      if (blob.energy > 0) return true;
      this.faded[blob.kind]++;
      this.emit(blob, 'fade');
      return false;
    });
    for (const parent of newborns) this.addBlob(parent.kind, parent);
    for (const particle of this.particles) particle.age += dt;
    this.particles = this.particles.filter(p => p.age < 1.8);
    if (Math.floor(this.time) > this.lastRecord) this.record();
  }

  record() {
    const counts = this.counts();
    this.history.push({ time: this.time, ...counts });
    if (this.history.length > 2400) this.history.splice(1, 1);
    this.lastRecord = Math.floor(this.time);
  }

  counts() {
    return { fruit: this.plants.reduce((sum, p) => sum + p.fruit, 0), blue: this.blobs.filter(b => b.kind === 'blue').length, red: this.blobs.filter(b => b.kind === 'red').length };
  }

  summary() {
    const { blue, red, fruit } = this.counts();
    if (this.time < 12) return { title: 'Every garden starts somewhere.', text: 'A few trees, a handful of residents, and a world of possibilities. Let’s see what grows.', state: 'Finding a rhythm' };
    if (blue === 0 && red === 0) return { title: 'A moment of quiet.', text: 'The blobs have faded, leaving the fruit to flourish. Try a fresh start with more food or lower energy use.', state: 'A quiet garden' };
    if (blue === 0) return { title: 'The reds have outgrown their food.', text: 'With no blues left to find, red energy is falling. The garden is settling into a simpler state.', state: 'A changing garden' };
    if (red === 0) return { title: 'A little blue world.', text: 'The reds have faded. Blues now grow and settle with the rhythm of the fruit supply.', state: 'A simpler rhythm' };
    if (fruit < this.plants.length * 1.2) return { title: 'A small harvest shapes the garden.', text: 'Fruit is in demand. Slower growth keeps the blue group small, and the reds follow their lead.', state: 'Fruit in demand' };
    const half = this.history[Math.max(0, this.history.length - 20)];
    if (blue > half.blue + 3) return { title: 'The blues are having their moment.', text: 'A healthy harvest is helping blues grow. More blues means more energy for the reds to follow.', state: 'Room to grow' };
    if (red > half.red + 2) return { title: 'Here come the reds.', text: 'The red group is growing as it finds more blues. Watch for the blue population to dip next.', state: 'Reds on the rise' };
    return { title: 'A little give. A little grow.', text: 'Fruit feeds the blues. Blues sustain the reds. Every small interaction helps write the garden’s story.', state: 'Life in balance' };
  }
}
