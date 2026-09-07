export const defaults = { growth: 0.7, limit: 6, delay: 5, blueUse: 0.8, blueSpeed: 6, blueVision: 85, blueCopy: 105, eating: 1.2, redUse: 1.2, redSpeed: 7, redVision: 100, strength: 28, redCopy: 125, pause: 3, trees: 16, blues: 24, reds: 7, size: 180, seed: 42 };
export const presets = {
  balanced: { ...defaults },
  rich: { ...defaults, growth: 1.5, limit: 9, delay: 2, reds: 5 },
  red: { ...defaults, reds: 20, blues: 25 },
  fragile: { ...defaults, trees: 10, growth: 0.5, blues: 16, reds: 5 },
  low: { ...defaults, trees: 6, limit: 3, growth: 0.2, delay: 12, blues: 15, reds: 4 }
};
export class Garden {
  constructor(settings = defaults) { this.reset(settings); }
  random() { this.randomState = (Math.imul(1664525, this.randomState) + 1013904223) >>> 0; return this.randomState / 4294967296; }
  position() { const angle = this.random() * Math.PI * 2; const radius = Math.sqrt(this.random()) * this.settings.size * 0.86; return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }; }
  reset(settings) {
    this.settings = { ...settings }; this.randomState = settings.seed >>> 0; this.time = 0; this.nextId = 1; this.births = 0; this.faded = 0; this.history = []; this.sampleAt = 0;
    this.plants = Array.from({ length: settings.trees }, (_, index) => ({ ...this.position(), id: index, fruit: settings.limit, cooldown: 0 }));
    this.blobs = [];
    for (const group of ['blue', 'red']) for (let index = 0; index < settings[group === 'blue' ? 'blues' : 'reds']; index++) this.blobs.push(this.createBlob(group));
    this.record();
  }
  createBlob(group, parent) {
    return { ...(parent ? { x: parent.x + this.random() * 8 - 4, y: parent.y + this.random() * 8 - 4 } : this.position()), id: this.nextId++, group, energy: parent ? 40 : 55 + this.random() * 25, age: 0, timer: 0, action: 'Wandering', angle: this.random() * Math.PI * 2, generation: parent ? parent.generation + 1 : 1, parent: parent?.id ?? null, pulse: 0 };
  }
  counts() { return { fruit: Math.floor(this.plants.reduce((total, plant) => total + plant.fruit, 0)), blue: this.blobs.filter(blob => blob.group === 'blue').length, red: this.blobs.filter(blob => blob.group === 'red').length }; }
  record() { this.history.push({ time: this.time, ...this.counts() }); if (this.history.length > 1800) this.history.shift(); }
  nearest(blob, candidates, vision) {
    let nearest = null; let distance = vision;
    for (const target of candidates) { const length = Math.hypot(target.x - blob.x, target.y - blob.y); if (length < distance) { distance = length; nearest = target; } }
    return nearest ? { target: nearest, distance } : null;
  }
  tick(dt = 0.1) {
    this.time += dt;
    const rules = this.settings;
    for (const plant of this.plants) { plant.cooldown = Math.max(0, plant.cooldown - dt); if (!plant.cooldown) plant.fruit = Math.min(rules.limit, plant.fruit + rules.growth * dt * 0.18); else plant.fruit = Math.min(plant.fruit, rules.limit); }
    const blue = this.blobs.filter(blob => blob.group === 'blue' && blob.energy > 0);
    const red = this.blobs.filter(blob => blob.group === 'red' && blob.energy > 0);
    const newborns = [];
    for (const blob of this.blobs) {
      if (blob.energy <= 0) continue;
      const isBlue = blob.group === 'blue';
      blob.age += dt; blob.pulse = Math.max(0, blob.pulse - dt); blob.timer = Math.max(0, blob.timer - dt);
      blob.energy -= (isBlue ? rules.blueUse : rules.redUse) * dt * (blob.timer ? 0.35 : 1);
      if (blob.timer > 0) continue;
      const vision = isBlue ? rules.blueVision : rules.redVision;
      const food = this.nearest(blob, isBlue ? this.plants.filter(plant => plant.fruit >= 1) : blue.filter(target => target.energy > 0 && target.pulse < 0.1), vision);
      const danger = isBlue ? this.nearest(blob, red, 24) : null;
      if (food && food.distance < (isBlue ? 13 : 10)) {
        if (isBlue) { food.target.fruit -= 1; food.target.cooldown = rules.delay; blob.energy += 22; blob.timer = rules.eating; blob.action = 'Munching fruit'; }
        else { const taken = Math.min(rules.strength, food.target.energy); food.target.energy -= taken; food.target.pulse = 2; blob.energy += taken * 0.85; blob.timer = rules.pause; blob.action = 'Happy little rest'; }
        blob.pulse = 1.4;
      } else {
        if (danger) { blob.angle = Math.atan2(blob.y - danger.target.y, blob.x - danger.target.x); blob.action = 'Keeping a little distance'; }
        else if (food) { blob.angle = Math.atan2(food.target.y - blob.y, food.target.x - blob.x); blob.action = isBlue ? 'Looking for a snack' : 'Following a blue'; }
        else { blob.angle += (this.random() - 0.5) * 2 * dt; blob.action = 'Wandering'; }
        const speed = isBlue ? rules.blueSpeed : rules.redSpeed;
        blob.x += Math.cos(blob.angle) * speed * dt; blob.y += Math.sin(blob.angle) * speed * dt;
        const radius = Math.hypot(blob.x, blob.y);
        if (radius > rules.size * 0.93) { blob.x *= rules.size * 0.93 / radius; blob.y *= rules.size * 0.93 / radius; blob.angle += Math.PI * 0.7; }
      }
      const threshold = isBlue ? rules.blueCopy : rules.redCopy;
      if (blob.energy >= threshold && blob.age > 8 && this.blobs.length + newborns.length < 350) {
        blob.energy -= 48; newborns.push(this.createBlob(blob.group, blob)); this.births++; blob.pulse = 2;
      }
    }
    const alive = this.blobs.filter(blob => blob.energy > 0);
    this.faded += this.blobs.length - alive.length; this.blobs = alive.concat(newborns);
    if (this.time >= this.sampleAt + 1) { this.record(); this.sampleAt = this.time; }
  }
}
