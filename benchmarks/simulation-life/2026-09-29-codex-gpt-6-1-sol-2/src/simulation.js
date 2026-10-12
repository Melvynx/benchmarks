export const defaultSettings = {
  growth: 0.28, fruitLimit: 6, returnDelay: 12,
  blueEnergy: 0.9, blueSpeed: 0.75, blueVision: 4.5, blueThreshold: 85, eatingTime: 1.4,
  redEnergy: 1.05, redSpeed: 0.87, redVision: 5, contactStrength: 32, redThreshold: 105, pauseTime: 4,
  trees: 12, blues: 24, reds: 8, worldSize: 8, seed: 42,
};

export const presets = [
  { id: 'balanced', name: 'Balanced garden', subtitle: 'A little of everything, in harmony.', settings: defaultSettings },
  { id: 'rich', name: 'Fruit-rich garden', subtitle: 'An all-you-can-eat green buffet.', settings: { ...defaultSettings, growth: 0.65, returnDelay: 5, trees: 16, fruitLimit: 8, reds: 5 } },
  { id: 'red', name: 'Red-heavy garden', subtitle: 'Lots of company. Not enough snacks.', settings: { ...defaultSettings, reds: 24, blues: 28, redEnergy: 1.4, contactStrength: 42, redThreshold: 120 } },
  { id: 'fragile', name: 'Fragile balance', subtitle: 'Small changes make a big difference.', settings: { ...defaultSettings, trees: 8, blues: 16, reds: 5, returnDelay: 18, contactStrength: 38 } },
  { id: 'low', name: 'Low-fruit garden', subtitle: 'A slower, smaller kind of life.', settings: { ...defaultSettings, trees: 5, fruitLimit: 3, growth: 0.12, returnDelay: 22, blues: 14, reds: 3 } },
];

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = Math.imul(state ^ state >>> 15, 1 | state);
    value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export class Garden {
  blobs = [];
  trees = [];
  history = [];
  events = [];
  time = 0;
  births = 0;
  faded = 0;
  meals = 0;
  contacts = 0;
  nextId = 1;
  nextSample = 1;

  constructor(settings = defaultSettings) {
    this.settings = { ...settings };
    this.random = seededRandom(settings.seed);
    for (let index = 0; index < settings.trees; index++) {
      const angle = index * 2.39996 + this.random() * 0.35;
      const radius = Math.sqrt((index + 0.7) / settings.trees) * settings.worldSize * 0.78;
      this.trees.push({ id: index, x: Math.cos(angle) * radius, z: Math.sin(angle) * radius,
        fruit: Array.from({ length: settings.fruitLimit }, () => 1), delays: Array.from({ length: settings.fruitLimit }, () => 0) });
    }
    for (let index = 0; index < settings.blues; index++) this.addBlob('blue');
    for (let index = 0; index < settings.reds; index++) this.addBlob('red');
    this.record();
    this.events.push({ time: 0, kind: 'fruit', text: 'A new little world is planted.' });
  }

  updateSettings(settings) {
    this.settings = { ...settings };
    for (const tree of this.trees) {
      while (tree.fruit.length < settings.fruitLimit) { tree.fruit.push(0); tree.delays.push(0); }
      tree.fruit.length = settings.fruitLimit;
      tree.delays.length = settings.fruitLimit;
    }
  }

  addBlob(species, parent) {
    const angle = this.random() * Math.PI * 2;
    const radius = Math.sqrt(this.random()) * this.settings.worldSize * 0.85;
    const blob = {
      id: this.nextId++, species,
      x: parent ? parent.x + Math.cos(angle) * 0.4 : Math.cos(angle) * radius,
      z: parent ? parent.z + Math.sin(angle) * 0.4 : Math.sin(angle) * radius,
      energy: parent ? 30 : 48 + this.random() * 22,
      age: 0, heading: angle, action: 'Wandering', pause: parent ? 1.1 : 0,
      immunity: parent ? 4 : this.random() * 5,
      copyCooldown: 8 + this.random() * 10,
      generation: parent ? parent.generation + 1 : 0, parent: parent?.id ?? null,
      trait: parent ? Math.max(0.8, Math.min(1.2, parent.trait + (this.random() - 0.5) * 0.06)) : 0.9 + this.random() * 0.2,
      pulse: parent ? 1 : 0, wander: this.random() * 3,
    };
    this.blobs.push(blob);
    return blob;
  }

  counts() {
    return { time: this.time, fruit: this.trees.reduce((sum, tree) => sum + tree.fruit.filter(value => value >= 1).length, 0),
      blue: this.blobs.filter(blob => blob.species === 'blue').length, red: this.blobs.filter(blob => blob.species === 'red').length };
  }

  record() {
    this.history.push(this.counts());
    if (this.history.length > 1600) this.history.splice(0, 400);
  }

  event(kind, text) {
    this.events.push({ time: this.time, kind, text });
    if (this.events.length > 20) this.events.shift();
  }

  step(delta = 0.1) {
    const elapsed = Math.min(0.2, Math.max(0, delta));
    this.time += elapsed;
    const settings = this.settings;
    for (const tree of this.trees) {
      for (let index = 0; index < tree.fruit.length; index++) {
        if (tree.delays[index] > 0) tree.delays[index] -= elapsed;
        else tree.fruit[index] = Math.min(1, tree.fruit[index] + elapsed * settings.growth * (0.8 + index * 0.07));
      }
    }
    const blues = this.blobs.filter(blob => blob.species === 'blue' && blob.energy > 0);
    const reds = this.blobs.filter(blob => blob.species === 'red' && blob.energy > 0);
    const newborns = [];
    for (const blob of this.blobs) {
      if (blob.energy <= 0) continue;
      blob.age += elapsed;
      blob.immunity = Math.max(0, blob.immunity - elapsed);
      blob.copyCooldown -= elapsed;
      blob.pulse = Math.max(0, blob.pulse - elapsed);
      const isBlue = blob.species === 'blue';
      const energyUse = isBlue ? settings.blueEnergy : settings.redEnergy;
      const speed = (isBlue ? settings.blueSpeed : settings.redSpeed) * blob.trait;
      const vision = (isBlue ? settings.blueVision : settings.redVision) * blob.trait;
      blob.energy -= elapsed * energyUse * (blob.pause > 0 ? 0.38 : 1 + speed * 0.18);
      if (blob.pause > 0) { blob.pause = Math.max(0, blob.pause - elapsed); continue; }
      let targetX = 0;
      let targetZ = 0;
      let nearestDistance = vision;
      let found = false;
      if (isBlue) {
        let targetTree;
        for (const tree of this.trees) {
          if (!tree.fruit.some(value => value >= 1)) continue;
          const distance = Math.hypot(tree.x - blob.x, tree.z - blob.z);
          if (distance < nearestDistance) { nearestDistance = distance; targetTree = tree; }
        }
        if (targetTree) {
          targetX = targetTree.x - blob.x;
          targetZ = targetTree.z - blob.z;
          found = true;
          blob.action = 'Finding fruit';
          if (nearestDistance < 0.65) {
            const fruitIndex = targetTree.fruit.findIndex(value => value >= 1);
            if (fruitIndex >= 0) {
              targetTree.fruit[fruitIndex] = 0;
              targetTree.delays[fruitIndex] = settings.returnDelay * (0.8 + this.random() * 0.4);
              blob.energy = Math.min(settings.blueThreshold + 30, blob.energy + 24);
              blob.pause = settings.eatingTime;
              blob.action = 'Eating fruit';
              blob.pulse = 1;
              this.meals++;
              continue;
            }
          }
        }
        const nearbyRed = reds.find(red => Math.hypot(red.x - blob.x, red.z - blob.z) < 1.35 && red.pause <= 0);
        if (nearbyRed && blob.immunity <= 0 && blob.energy > 28) {
          targetX += (blob.x - nearbyRed.x) * 1.8;
          targetZ += (blob.z - nearbyRed.z) * 1.8;
          found = true;
          blob.action = 'Moving away';
        }
      } else {
        let targetBlob;
        for (const blue of blues) {
          if (blue.energy <= 0 || blue.immunity > 0) continue;
          const distance = Math.hypot(blue.x - blob.x, blue.z - blob.z);
          if (distance < nearestDistance) { nearestDistance = distance; targetBlob = blue; }
        }
        if (targetBlob) {
          targetX = targetBlob.x - blob.x;
          targetZ = targetBlob.z - blob.z;
          found = true;
          blob.action = 'Finding a friend';
          if (nearestDistance < 0.62) {
            const transferred = Math.min(targetBlob.energy, settings.contactStrength);
            targetBlob.energy -= transferred;
            targetBlob.immunity = settings.pauseTime + 2;
            targetBlob.pulse = 0.6;
            blob.energy = Math.min(settings.redThreshold + 25, blob.energy + transferred * 0.85);
            blob.pause = settings.pauseTime;
            blob.action = 'Taking a breather';
            blob.pulse = 1;
            this.contacts++;
            continue;
          }
        }
      }
      if (!found) {
        blob.wander -= elapsed;
        if (blob.wander <= 0) { blob.heading += (this.random() - 0.5) * 1.8; blob.wander = 1.5 + this.random() * 3; }
        targetX = Math.cos(blob.heading);
        targetZ = Math.sin(blob.heading);
        blob.action = 'Wandering';
      }
      for (const neighbor of isBlue ? blues : reds) {
        if (neighbor.id === blob.id) continue;
        const distance = Math.hypot(blob.x - neighbor.x, blob.z - neighbor.z);
        if (distance > 0.001 && distance < 0.48) {
          targetX += (blob.x - neighbor.x) / distance * 0.65;
          targetZ += (blob.z - neighbor.z) / distance * 0.65;
        }
      }
      const length = Math.hypot(targetX, targetZ) || 1;
      blob.x += targetX / length * speed * elapsed;
      blob.z += targetZ / length * speed * elapsed;
      blob.heading = Math.atan2(targetZ, targetX);
      const radius = Math.hypot(blob.x, blob.z);
      if (radius > settings.worldSize * 0.93) {
        blob.x *= settings.worldSize * 0.93 / radius;
        blob.z *= settings.worldSize * 0.93 / radius;
        blob.heading += Math.PI * 0.7;
      }
      const threshold = isBlue ? settings.blueThreshold : settings.redThreshold;
      const crowding = Math.max(0, (isBlue ? blues.length : reds.length) - settings.trees * (isBlue ? 7 : 3));
      blob.energy -= crowding * elapsed * 0.025;
      if (blob.energy >= threshold && blob.copyCooldown <= 0 && this.blobs.length + newborns.length < 250) {
        blob.energy -= 44;
        blob.copyCooldown = 15 + this.random() * 8;
        blob.pause = 0.8;
        blob.action = 'Growing a family';
        blob.pulse = 1;
        newborns.push(blob);
      }
    }
    for (const parent of newborns) {
      this.addBlob(parent.species, parent);
      this.births++;
      if (this.births <= 3 || this.births % 10 === 0) this.event(parent.species, `${parent.species === 'blue' ? 'A blue' : 'A red'} family grew. Hello, little one!`);
    }
    const lost = this.blobs.filter(blob => blob.energy <= 0);
    this.faded += lost.length;
    this.blobs = this.blobs.filter(blob => blob.energy > 0);
    if (lost.length && this.blobs.length < 8) this.event(lost[0].species, 'A tired little blob faded back into the garden.');
    if (this.time >= this.nextSample) { this.record(); this.nextSample = Math.floor(this.time) + 1; }
  }

  summary() {
    const counts = this.counts();
    if (this.time < 12) return { title: 'Every little life is connected.', text: 'Fruit feeds blue blobs. Blue blobs help red blobs. Press play and see where the garden goes.' };
    if (counts.blue === 0 && counts.red === 0) return { title: 'A quieter garden, ready to regrow.', text: 'Both families ran out of energy. The fruit is returning. Try more trees or lower energy use.' };
    if (counts.blue === 0) return { title: 'The reds are running out of company.', text: 'The blue family faded first. Without blue friends, red blobs will slowly use up their stored energy.' };
    if (counts.red === 0) return { title: 'A little blue world.', text: 'The red family faded. Blue blobs now find their own balance with the fruit supply.' };
    if (this.settings.trees <= 5) return { title: 'Less fruit, a smaller little world.', text: 'Limited snacks keep families small. Every fruit has a little more work to do.' };
    const peakBlue = Math.max(...this.history.map(sample => sample.blue));
    if (counts.blue < peakBlue * 0.65) return { title: 'A little ebb before the next flow.', text: 'Blue numbers have dipped. With fewer blue friends, the red family will feel the change next.' };
    return { title: 'A little give. A little grow.', text: 'The blue family grows with the fruit, and the reds follow. A changing balance, never a fixed script.' };
  }
}
