const defaults = {
  fruitGrowth: 1,
  fruitLimit: 5,
  fruitDelay: 24,
  blueEnergy: 0.55,
  blueSpeed: 38,
  blueVision: 150,
  blueCopy: 74,
  blueEat: 2.2,
  redEnergy: 0.42,
  redSpeed: 43,
  redVision: 160,
  redStrength: 8,
  redCopy: 72,
  redPause: 3.5,
  trees: 7,
  blueStart: 12,
  redStart: 4,
  worldSize: 300,
  seed: 2741,
  simulationSpeed: 1,
};

const presets = {
  balanced: { ...defaults },
  fruitRich: { ...defaults, fruitGrowth: 1.8, fruitLimit: 8, fruitDelay: 16, trees: 10, blueStart: 17, redStart: 4, blueCopy: 70 },
  redHeavy: { ...defaults, trees: 7, blueStart: 12, redStart: 13, redVision: 205, redStrength: 12, redCopy: 66, redPause: 2.8, blueCopy: 80, seed: 7419 },
  fragile: { ...defaults, fruitGrowth: 0.7, fruitLimit: 4, fruitDelay: 38, trees: 6, blueStart: 9, redStart: 6, redStrength: 10, blueCopy: 76, redCopy: 75, seed: 1093 },
  lowFruit: { ...defaults, fruitGrowth: 0.48, fruitLimit: 2, fruitDelay: 64, trees: 5, blueStart: 13, redStart: 5, blueEnergy: 0.72, blueCopy: 82, redCopy: 80, seed: 5802 },
};

const controls = [
  {
    id: 'world', icon: '❀', label: 'Fruit & habitat', summary: 'the garden itself', className: 'group-world', open: true,
    fields: [
      ['fruitGrowth', 'Fruit growth speed', 0.35, 2.2, 0.05, '×', 2],
      ['fruitLimit', 'Fruit limit per tree', 2, 9, 1, ' berries', 0],
      ['fruitDelay', 'Fruit return delay', 8, 80, 1, ' sec', 0],
      ['trees', 'Starting fruit trees', 2, 12, 1, ' trees', 0, 'reset'],
      ['worldSize', 'World size', 180, 420, 10, ' m', 0],
    ],
  },
  {
    id: 'blue', icon: '◉', label: 'Blue blobs', summary: 'fruit-finders', className: 'group-blue',
    fields: [
      ['blueEnergy', 'Energy use', 0.15, 1.4, 0.05, ' / sec', 2],
      ['blueSpeed', 'Travel speed', 16, 78, 1, ' px / sec', 0],
      ['blueVision', 'Sensing range', 50, 240, 5, ' px', 0],
      ['blueCopy', 'Copy threshold', 48, 96, 1, '% energy', 0],
      ['blueEat', 'Eating time', 0.7, 6, 0.1, ' sec', 1],
      ['blueStart', 'Starting blue blobs', 0, 32, 1, ' blobs', 0, 'reset'],
    ],
  },
  {
    id: 'red', icon: '◉', label: 'Red blobs', summary: 'gentle greeters', className: 'group-red',
    fields: [
      ['redEnergy', 'Energy use', 0.15, 1.4, 0.05, ' / sec', 2],
      ['redSpeed', 'Travel speed', 16, 78, 1, ' px / sec', 0],
      ['redVision', 'Sensing range', 50, 240, 5, ' px', 0],
      ['redStrength', 'Contact strength', 3, 18, 1, ' energy', 0],
      ['redCopy', 'Copy threshold', 48, 96, 1, '% energy', 0],
      ['redPause', 'Pause after hello', 0.8, 9, 0.1, ' sec', 1],
      ['redStart', 'Starting red blobs', 0, 32, 1, ' blobs', 0, 'reset'],
    ],
  },
  {
    id: 'seed', icon: '✦', label: 'Seed & starting life', summary: 'a fresh beginning', className: 'group-seed',
    fields: [
      ['seed', 'Random seed', 1, 9999, 1, '', 0, 'reset'],
    ],
  },
];

const config = { ...defaults };
const canvas = document.querySelector('#garden');
const ctx = canvas.getContext('2d');
const historySvg = document.querySelector('#history-chart');
const phaseSvg = document.querySelector('#phase-chart');
const traitSvg = document.querySelector('#trait-chart');
const entityNames = ['Pip', 'Miso', 'Clover', 'Button', 'Bean', 'Pebble', 'Biscuit', 'Noodle', 'Mochi', 'Sprout', 'Tumble', 'Bubbles'];
const fruitOffsets = [
  [-0.035, -0.084], [0.007, -0.105], [0.048, -0.083], [-0.067, -0.059], [-0.021, -0.056], [0.026, -0.055], [0.068, -0.058], [-0.046, -0.027], [0.002, -0.034], [0.047, -0.029],
];
let random = () => Math.random();
let entities = [];
let plants = [];
let history = [];
let selectedId = null;
let running = false;
let simTime = 0;
let stepCount = 0;
let nextId = 1;
let nextRecord = 1;
let rotation = -0.16;
let previousFrame = 0;
let lastUiRefresh = 0;
let chartsDirty = true;
let canvasWidth = 0;
let canvasHeight = 0;
let dpr = 1;
let toastTimer;
let pointerStart = null;
let selectedTraitMetric = 'pace';

function makeRandom(seed) {
  let value = (Number(seed) >>> 0) || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}

function rand(min = 0, max = 1) { return min + random() * (max - min); }
function clamp(value, low, high) { return Math.min(high, Math.max(low, value)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function formatMultiplier(value) { return `${Number(Number(value).toFixed(2))}×`; }
function canvasRadius() { return Math.min(canvasWidth, canvasHeight) * 0.425; }
function radiusFactor() { return clamp(config.worldSize / 320, 0.62, 1.15); }
function maxPopulation() { return clamp(Math.floor(55 * (config.worldSize / 300) ** 2), 18, 140); }
function getSpecies(entity) { return entity.species === 'blue' ? 'Blue' : 'Red'; }
function countSpecies(species) { return entities.reduce((count, entity) => count + (entity.species === species ? 1 : 0), 0); }
function ripeFruitCount() { return plants.reduce((count, plant) => count + plant.fruit.reduce((n, berry) => n + (berry.ready ? 1 : 0), 0), 0); }
function totalFruitCapacity() { return plants.reduce((count, plant) => count + plant.fruit.length, 0); }
function averageTrait(species, key) {
  let sum = 0, count = 0;
  for (const entity of entities) {
    if (entity.species === species && entity.energy > 0) { sum += entity[key]; count += 1; }
  }
  return count ? sum / count : null;
}

function buildControls() {
  const host = document.querySelector('#control-groups');
  host.innerHTML = controls.map((group) => `
    <details class="control-group ${group.className}" ${group.open ? 'open' : ''}>
      <summary><span class="group-icon">${group.icon}</span><span class="group-name">${group.label}</span><span class="group-summary">${group.summary}</span><span class="group-caret">›</span></summary>
      <div class="group-controls">
        ${group.fields.map(([id, label, min, max, step, unit, digits, timing]) => `
          <div class="control-row">
            <label for="control-${id}">${label}${timing === 'reset' ? '<sup title="Applies after reset">↺</sup>' : ''}</label>
            <output id="value-${id}" for="control-${id}"></output>
            <input id="control-${id}" type="range" min="${min}" max="${max}" step="${step}" data-field="${id}" data-unit="${unit}" data-digits="${digits}" aria-label="${label}" />
          </div>`).join('')}
      </div>
    </details>`).join('');
  for (const input of host.querySelectorAll('input[type="range"]')) {
    const id = input.dataset.field;
    input.value = String(config[id]);
    updateControlOutput(input);
    input.addEventListener('input', () => {
      const value = Number(input.value);
      config[id] = value;
      updateControlOutput(input);
      if (id === 'fruitLimit') resizePlantFruitSlots();
      if (id === 'seed' || id === 'trees' || id === 'blueStart' || id === 'redStart') {
        showToast(id === 'seed' ? 'New seed ready · press reset to plant it' : 'Starting count saved · press reset to use it');
      } else {
        updateUi();
      }
      document.querySelectorAll('.preset-grid button').forEach((button) => button.classList.remove('active'));
    });
  }
}

function updateControlOutput(input) {
  const digits = Number(input.dataset.digits || 0);
  const value = Number(input.value);
  const display = Number.isInteger(value) ? String(value) : value.toFixed(digits);
  document.querySelector(`#value-${input.dataset.field}`).textContent = `${display}${input.dataset.unit}`;
}

function syncControlInputs() {
  for (const input of document.querySelectorAll('#control-groups input[data-field]')) {
    input.value = String(config[input.dataset.field]);
    updateControlOutput(input);
  }
}

function applyPreset(name) {
  Object.assign(config, presets[name]);
  syncControlInputs();
  document.querySelectorAll('.preset-grid button').forEach((button) => button.classList.toggle('active', button.dataset.preset === name));
  resetGarden();
  const names = { balanced: 'Balanced garden planted', fruitRich: 'A fruit-rich garden is ready', redHeavy: 'Red-heavy garden planted', fragile: 'A delicate balance is ready', lowFruit: 'A low-fruit garden is ready' };
  showToast(names[name]);
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 1900);
}

function randomPoint(maxRadius = 0.78) {
  const angle = rand(0, Math.PI * 2);
  const radius = Math.sqrt(random()) * maxRadius * radiusFactor();
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

function insideWorld(point, fraction = 0.92) {
  const limit = radiusFactor() * fraction;
  const length = Math.hypot(point.x, point.y);
  if (length <= limit || length === 0) return point;
  return { x: point.x * limit / length, y: point.y * limit / length };
}

function fruitPosition(plant, index) {
  const [offsetX, offsetY] = fruitOffsets[index % fruitOffsets.length];
  return { x: plant.x + offsetX * plant.size, y: plant.y + offsetY * plant.size * 0.9 / 0.83 };
}

function makePlant(index, total) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 + rand(-0.32, 0.32);
  const radius = rand(0.28, 0.68) * radiusFactor();
  const point = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  const count = Number(config.fruitLimit);
  return {
    id: index + 1,
    x: point.x,
    y: point.y,
    size: rand(0.82, 1.14),
    fruit: Array.from({ length: count }, () => ({ ready: true, progress: 1 })),
  };
}

function makeEntity(species, point, parent = null) {
  const sameGroup = countSpecies(species);
  const inheritedSpeed = parent ? clamp(parent.speedTrait + rand(-0.1, 0.1), 0.78, 1.25) : rand(0.86, 1.15);
  const inheritedVision = parent ? clamp(parent.visionTrait + rand(-0.12, 0.12), 0.75, 1.3) : rand(0.86, 1.16);
  const entity = {
    id: nextId++, species,
    name: `${entityNames[(nextId + Math.floor(rand(0, entityNames.length))) % entityNames.length]} ${String(sameGroup + 1).padStart(2, '0')}`,
    x: point.x, y: point.y,
    heading: rand(-Math.PI, Math.PI),
    energy: parent ? rand(42, 58) : rand(60, 92),
    age: 0,
    speedTrait: inheritedSpeed,
    visionTrait: inheritedVision,
    sizeTrait: rand(0.91, 1.1),
    generation: parent ? parent.generation + 1 : 1,
    parentName: parent ? parent.name : null,
    thinkIn: rand(0.1, 1.2),
    reproduceIn: rand(5, 22),
    pause: 0,
    pauseKind: '',
    fadeTime: 0,
    action: species === 'blue' ? 'looking around' : 'searching the meadow',
    target: null,
    bobSeed: rand(0, Math.PI * 2),
    blinkIn: rand(1.2, 5),
    blink: 0,
    glow: 0,
    scalePulse: 0,
    facing: 1,
  };
  entities.push(entity);
  return entity;
}

function resizePlantFruitSlots() {
  for (const plant of plants) {
    const target = Number(config.fruitLimit);
    if (plant.fruit.length > target) plant.fruit.length = target;
    while (plant.fruit.length < target) plant.fruit.push({ ready: true, progress: 1 });
  }
}

function resetGarden() {
  random = makeRandom(config.seed);
  simTime = 0;
  stepCount = 0;
  nextRecord = 1;
  nextId = 1;
  selectedId = null;
  history = [];
  plants = Array.from({ length: Number(config.trees) }, (_, index) => makePlant(index, Number(config.trees)));
  entities = [];
  const initialPoints = [];
  for (let i = 0; i < Number(config.blueStart); i++) {
    const point = randomPoint(0.72);
    initialPoints.push(point);
    makeEntity('blue', point);
  }
  for (let i = 0; i < Number(config.redStart); i++) {
    let point = randomPoint(0.72);
    if (initialPoints.length) {
      const nearestBlue = initialPoints[Math.floor(rand(0, initialPoints.length))];
      point = insideWorld({ x: nearestBlue.x + rand(-0.21, 0.21), y: nearestBlue.y + rand(-0.21, 0.21) }, 0.82);
    }
    makeEntity('red', point);
  }
  pushHistory();
  setRunning(false);
  renderInspector();
  updateUi();
}

function pushHistory(countStep = false) {
  history.push({
    t: simTime,
    fruit: ripeFruitCount(),
    blue: countSpecies('blue'),
    red: countSpecies('red'),
    bluePace: averageTrait('blue', 'speedTrait'),
    redPace: averageTrait('red', 'speedTrait'),
    blueSensing: averageTrait('blue', 'visionTrait'),
    redSensing: averageTrait('red', 'visionTrait'),
  });
  if (history.length > 240) history.shift();
  chartsDirty = true;
  if (countStep) stepCount += 1;
}

function setRunning(value) {
  running = value;
  const button = document.querySelector('#play-button');
  button.innerHTML = running ? '<span class="play-symbol">Ⅱ</span><span>Pause</span>' : '<span class="play-symbol">▶</span><span>Play</span>';
  button.setAttribute('aria-label', running ? 'Pause simulation' : 'Play simulation');
  document.querySelector('#run-status').textContent = running ? 'GROWING' : 'PAUSED';
  document.querySelector('.live-indicator').classList.toggle('running', running);
}

function findNearest(entity, candidates, maxDistance = Infinity) {
  let best = null;
  let bestDistance = maxDistance;
  for (const target of candidates) {
    if (target === entity) continue;
    const d = distance(entity, target);
    if (d < bestDistance) { best = target; bestDistance = d; }
  }
  return best ? { item: best, distance: bestDistance } : null;
}

function allReadyFruit() {
  const list = [];
  for (const plant of plants) {
    plant.fruit.forEach((berry, index) => {
      if (berry.ready) list.push({ plant, berry, index, ...fruitPosition(plant, index) });
    });
  }
  return list;
}

function pickWanderTarget() {
  const angle = rand(-Math.PI, Math.PI);
  const spread = rand(0.18, 0.68) * radiusFactor();
  return { x: Math.cos(angle) * spread, y: Math.sin(angle) * spread };
}

function startEating(blue, fruit) {
  fruit.berry.ready = false;
  fruit.berry.progress = 0;
  blue.energy = Math.min(100, blue.energy + 34);
  blue.pause = config.blueEat;
  blue.pauseKind = 'eat';
  blue.action = 'having a snack';
  blue.target = null;
  blue.glow = 1;
  blue.scalePulse = 1;
}

function startContact(red, blue) {
  const amount = Math.min(config.redStrength, blue.energy);
  if (amount <= 0) return;
  red.energy = Math.min(100, red.energy + amount * 0.95);
  red.pause = config.redPause;
  red.pauseKind = 'contact';
  red.action = 'a gentle hello';
  red.glow = 1;
  red.scalePulse = 1;
  red.target = null;
  blue.energy = Math.max(0, blue.energy - amount);
  blue.pause = Math.max(blue.pause, 0.8);
  blue.pauseKind = 'startle';
  blue.action = 'startled, then okay';
  blue.glow = 0.8;
  blue.scalePulse = 0.8;
}

function attemptReproduction(entity, dt) {
  entity.reproduceIn -= dt;
  if (entity.reproduceIn > 0 || entities.length >= maxPopulation()) return;
  const threshold = entity.species === 'blue' ? config.blueCopy : config.redCopy;
  if (entity.energy < threshold) return;
  const nearby = entities.filter((other) => other.species === entity.species && distance(entity, other) < 0.25).length;
  if (nearby >= 6) { entity.reproduceIn = 2; return; }
  if (random() > dt * 0.035) return;
  entity.energy = Math.max(0, entity.energy - 45);
  entity.reproduceIn = rand(24, 39);
  const point = insideWorld({ x: entity.x + rand(-0.085, 0.085), y: entity.y + rand(-0.085, 0.085) }, 0.91);
  const baby = makeEntity(entity.species, point, entity);
  baby.energy = 40;
  baby.action = 'a new little sprout';
  baby.pause = 1.25;
  baby.pauseKind = 'birth';
  entity.pause = 0.7;
  entity.pauseKind = 'birth';
  entity.action = 'welcoming someone new';
  entity.glow = 1;
  showToast(`${getSpecies(entity)} blob family grew by one`);
}

function chooseAction(entity, readyFruit) {
  const isBlue = entity.species === 'blue';
  const visionPx = (isBlue ? config.blueVision : config.redVision) * entity.visionTrait;
  const vision = visionPx / Math.max(canvasRadius(), 100);
  if (isBlue) {
    const nearestRed = findNearest(entity, entities.filter((other) => other.species === 'red'), vision);
    if (nearestRed && nearestRed.distance < 0.2) {
      const danger = nearestRed.item;
      entity.target = insideWorld({ x: entity.x + (entity.x - danger.x) * 1.7 + rand(-0.05, 0.05), y: entity.y + (entity.y - danger.y) * 1.7 + rand(-0.05, 0.05) }, 0.94);
      entity.action = 'keeping an eye out';
      return;
    }
    let nearestFood = null;
    let nearestFoodDistance = vision;
    for (const fruit of readyFruit) {
      const d = Math.hypot(entity.x - fruit.x, entity.y - fruit.y);
      if (d < nearestFoodDistance) { nearestFood = fruit; nearestFoodDistance = d; }
    }
    if (nearestFood) {
      entity.target = { x: nearestFood.x, y: nearestFood.y, food: nearestFood };
      entity.action = 'looking for fruit';
      return;
    }
    const nearestTree = findNearest(entity, plants, vision);
    if (nearestTree) {
      entity.target = { x: nearestTree.item.x + rand(-0.11, 0.11), y: nearestTree.item.y + rand(-0.08, 0.08) };
      entity.action = 'gathering near a tree';
      return;
    }
    entity.target = pickWanderTarget();
    entity.action = 'wandering in the sun';
  } else {
    const nearestBlue = findNearest(entity, entities.filter((other) => other.species === 'blue'), vision);
    if (nearestBlue) {
      entity.target = { x: nearestBlue.item.x, y: nearestBlue.item.y, blue: nearestBlue.item };
      entity.action = 'looking for blue';
      return;
    }
    entity.target = pickWanderTarget();
    entity.action = 'searching the meadow';
  }
}

function advanceEntity(entity, dt, readyFruit) {
  entity.age += dt;
  entity.thinkIn -= dt;
  entity.glow = Math.max(0, entity.glow - dt * 0.55);
  entity.scalePulse = Math.max(0, entity.scalePulse - dt * 1.4);
  entity.blinkIn -= dt;
  if (entity.blinkIn < 0) {
    entity.blink = Math.min(1, entity.blink + dt * 12);
    if (entity.blink >= 1) { entity.blink = 0; entity.blinkIn = rand(1.5, 5.5); }
  } else {
    entity.blink = Math.max(0, entity.blink - dt * 12);
  }
  if (entity.energy <= 0) {
    entity.fadeTime += dt;
    entity.action = 'fading into a nap';
    if (entity.fadeTime > 9) {
      entities = entities.filter((item) => item !== entity);
      if (selectedId === entity.id) {
        selectedId = null;
        renderInspector();
      }
    }
    return;
  }
  entity.fadeTime = 0;
  if (entity.pause > 0) {
    entity.pause = Math.max(0, entity.pause - dt);
    entity.energy = Math.max(0, entity.energy - (entity.species === 'blue' ? config.blueEnergy : config.redEnergy) * dt * 0.22);
    if (entity.pause === 0) {
      entity.pauseKind = '';
      entity.thinkIn = 0;
    }
    return;
  }

  if (entity.thinkIn <= 0 || !entity.target) {
    entity.thinkIn = rand(0.55, 1.15);
    chooseAction(entity, readyFruit);
  }

  let isMoving = false;
  if (entity.target) {
    const target = entity.target;
    const dx = target.x - entity.x;
    const dy = target.y - entity.y;
    const targetDistance = Math.hypot(dx, dy) || 0.001;
    const sameGroup = entities.filter((other) => other !== entity && other.species === entity.species);
    const nearby = findNearest(entity, sameGroup, 0.11);
    let steerX = dx / targetDistance;
    let steerY = dy / targetDistance;
    if (nearby && nearby.distance > 0.005) {
      steerX += ((entity.x - nearby.item.x) / nearby.distance) * 0.42;
      steerY += ((entity.y - nearby.item.y) / nearby.distance) * 0.42;
    }
    const steerLength = Math.hypot(steerX, steerY) || 1;
    steerX /= steerLength;
    steerY /= steerLength;
    const desiredHeading = Math.atan2(steerY, steerX);
    let turn = ((desiredHeading - entity.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    entity.heading += clamp(turn, -dt * 5.2, dt * 5.2);
    entity.facing = Math.cos(entity.heading) < 0 ? -1 : 1;

    if (target.food && !target.food.berry.ready) {
      entity.target = null;
      entity.energy = Math.max(0, entity.energy - config.blueEnergy * dt * 0.32);
      attemptReproduction(entity, dt);
      return;
    } else if (target.food && targetDistance < 0.085) {
      startEating(entity, target.food);
      return;
    }
    if (target.blue && distance(entity, target.blue) < 0.09 && !target.blue.pause && target.blue.energy > 0) {
      startContact(entity, target.blue);
      return;
    }
    const travelPx = (entity.species === 'blue' ? config.blueSpeed : config.redSpeed) * entity.speedTrait;
    const energyFactor = 0.58 + entity.energy / 235;
    const step = Math.min(targetDistance, travelPx * energyFactor * dt / Math.max(canvasRadius() * 2, 120));
    if (step > 0.0002) {
      entity.x += Math.cos(entity.heading) * step;
      entity.y += Math.sin(entity.heading) * step;
      isMoving = true;
    }
    const limit = radiusFactor() * 0.945;
    const distanceFromCenter = Math.hypot(entity.x, entity.y);
    if (distanceFromCenter > limit) {
      entity.x *= limit / distanceFromCenter;
      entity.y *= limit / distanceFromCenter;
      entity.heading = Math.atan2(-entity.y, -entity.x) + rand(-0.35, 0.35);
      entity.target = { x: Math.cos(entity.heading) * limit * 0.78, y: Math.sin(entity.heading) * limit * 0.78 };
    }
  }
  entity.energy = Math.max(0, entity.energy - (entity.species === 'blue' ? config.blueEnergy : config.redEnergy) * dt * (isMoving ? 1 : 0.32));
  attemptReproduction(entity, dt);
}

function advance(dt) {
  if (!(dt > 0)) return;
  const grownSlots = [];
  for (const plant of plants) {
    plant.fruit.forEach((berry) => {
      if (!berry.ready) {
        berry.progress = clamp(berry.progress + dt * config.fruitGrowth / config.fruitDelay, 0, 1);
        if (berry.progress >= 1) {
          berry.ready = true;
          berry.progress = 1;
          grownSlots.push(plant.id);
        }
      }
    });
  }
  if (grownSlots.length) showToast('A little fruit is back on the branches');
  const readyFruit = allReadyFruit();
  const before = [...entities];
  for (const entity of before) advanceEntity(entity, dt, readyFruit);
  simTime += dt;
  let recordDue = false;
  while (simTime >= nextRecord) { recordDue = true; nextRecord += 1; }
  if (recordDue) pushHistory(true);
}

function formatTime(seconds) {
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  return `${String(minutes).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

function updateUi() {
  document.querySelector('#time-label').textContent = formatTime(simTime);
  document.querySelector('#step-label').textContent = `${stepCount} ${stepCount === 1 ? 'step' : 'steps'}`;
  document.querySelector('#day-count').textContent = String(Math.floor(simTime / 60) + 1).padStart(2, '0');
  document.querySelector('#fruit-count').textContent = ripeFruitCount();
  document.querySelector('#fruit-capacity').textContent = `${totalFruitCapacity()} tucked in the trees`;
  document.querySelector('#blue-count').textContent = countSpecies('blue');
  document.querySelector('#red-count').textContent = countSpecies('red');
  const blue = countSpecies('blue');
  const red = countSpecies('red');
  document.querySelector('#blue-mood').textContent = blue === 0 ? 'taking a little rest' : blue > 18 ? 'a busy little bunch' : blue < 5 ? 'a small gathering' : 'finding their feet';
  document.querySelector('#red-mood').textContent = red === 0 ? 'taking a little rest' : red > blue ? 'quite the crowd' : red < 3 ? 'a few curious friends' : 'taking it slow';
  document.querySelector('#speed-value').textContent = formatMultiplier(config.simulationSpeed);
  document.querySelector('#legend-fruit').textContent = ripeFruitCount();
  document.querySelector('#legend-blue').textContent = blue;
  document.querySelector('#legend-red').textContent = red;
  const traitKey = selectedTraitMetric === 'pace' ? 'speedTrait' : 'visionTrait';
  const traitHistoryKey = selectedTraitMetric === 'pace' ? ['bluePace', 'redPace'] : ['blueSensing', 'redSensing'];
  const latestHistory = history[history.length - 1];
  const blueTrait = latestHistory?.[traitHistoryKey[0]] ?? null;
  const redTrait = latestHistory?.[traitHistoryKey[1]] ?? null;
  document.querySelector('#trait-blue-value').textContent = blueTrait === null ? '—' : `${blueTrait.toFixed(2)}×`;
  document.querySelector('#trait-red-value').textContent = redTrait === null ? '—' : `${redTrait.toFixed(2)}×`;
  document.querySelector('#chart-midpoint').textContent = history.length > 1 ? formatTime((history[0].t + history[history.length - 1].t) / 2) : '00:00';
  document.querySelector('#chart-endpoint').textContent = history.length > 1 ? formatTime(history[history.length - 1].t) : 'NOW';
  document.querySelector('#summary-time').textContent = history.length > 1 ? `· ${formatTime(simTime)}` : '· JUST NOW';
  if (chartsDirty) {
    drawHistoryChart();
    drawPhaseChart();
    drawTraitChart();
    updateSummary();
    chartsDirty = false;
  }
}

function drawHistoryChart() {
  const left = 35, right = 692, top = 15, bottom = 195;
  const allValues = history.flatMap((point) => [point.fruit, point.blue, point.red]);
  const max = Math.max(8, ...allValues) * 1.12;
  let markup = '';
  for (let i = 0; i <= 4; i++) {
    const y = top + ((bottom - top) * i) / 4;
    const label = Math.round(max * (1 - i / 4));
    markup += `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#edf0e7" stroke-width="1" stroke-dasharray="2 4"/><text x="${left - 8}" y="${y + 2.5}" text-anchor="end" font-size="8" fill="#a7ada3">${label}</text>`;
  }
  markup += `<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="#eaede4"/><line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="#eaede4"/>`;
  if (history.length) {
    const series = [['fruit', '#a4b850'], ['blue', '#52a9eb'], ['red', '#ed786a']];
    for (const [key, color] of series) {
      const points = history.map((point, index) => {
        const firstTime = history[0].t;
        const lastTime = history[history.length - 1].t;
        const x = history.length === 1 || lastTime === firstTime ? (left + right) / 2 : left + ((point.t - firstTime) / (lastTime - firstTime)) * (right - left);
        const y = bottom - (point[key] / max) * (bottom - top);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      if (points.length === 1) {
        const [x, y] = points[0].split(',');
        markup += `<circle cx="${x}" cy="${y}" r="3" fill="${color}"/>`;
      } else {
        markup += `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
        const [x, y] = points[points.length - 1].split(',');
        markup += `<circle cx="${x}" cy="${y}" r="3.5" fill="#fffefa" stroke="${color}" stroke-width="2"/>`;
      }
    }
  }
  historySvg.innerHTML = markup;
}

function drawPhaseChart() {
  const left = 37, right = 286, top = 10, bottom = 187;
  const maxX = Math.max(10, ...history.map((point) => point.blue)) * 1.12;
  const maxY = Math.max(10, ...history.map((point) => point.red)) * 1.12;
  let markup = '';
  for (let i = 0; i <= 4; i++) {
    const x = left + ((right - left) * i) / 4;
    const y = top + ((bottom - top) * i) / 4;
    markup += `<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="#edf0e7" stroke-dasharray="2 4"/><line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#edf0e7" stroke-dasharray="2 4"/><text x="${x}" y="198" text-anchor="middle" font-size="7" fill="#a7ada3">${Math.round(maxX * i / 4)}</text><text x="${left - 6}" y="${y + 2.5}" text-anchor="end" font-size="7" fill="#a7ada3">${Math.round(maxY * (1 - i / 4))}</text>`;
  }
  markup += `<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="#e6eae0"/><line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="#e6eae0"/>`;
  markup += `<text x="${(left + right) / 2}" y="211" text-anchor="middle" font-size="8" letter-spacing="1" fill="#9aa297">BLUE BLOBS →</text><text x="9" y="100" text-anchor="middle" font-size="8" letter-spacing="1" fill="#9aa297" transform="rotate(-90 9 100)">RED BLOBS →</text>`;
  if (history.length) {
    const points = history.map((point) => `${(left + (point.blue / maxX) * (right - left)).toFixed(1)},${(bottom - (point.red / maxY) * (bottom - top)).toFixed(1)}`);
    if (points.length > 1) markup += `<polyline points="${points.join(' ')}" fill="none" stroke="#adc77c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>`;
    const [x, y] = points[points.length - 1].split(',');
    markup += `<circle cx="${x}" cy="${y}" r="5" fill="#fffefa" stroke="#719763" stroke-width="2.4"/><circle cx="${x}" cy="${y}" r="2" fill="#719763"/>`;
  }
  phaseSvg.innerHTML = markup;
}

function drawTraitChart() {
  const left = 36, right = 692, top = 8, bottom = 122;
  const low = 0.7, high = 1.3;
  const suffix = selectedTraitMetric === 'pace' ? 'Pace' : 'Sensing';
  const keys = selectedTraitMetric === 'pace' ? ['bluePace', 'redPace'] : ['blueSensing', 'redSensing'];
  let markup = '';
  for (let i = 0; i <= 4; i++) {
    const y = top + ((bottom - top) * i) / 4;
    const value = (high - (i / 4) * (high - low)).toFixed(2);
    markup += `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="#edf0e7" stroke-dasharray="2 4"/><text x="${left - 7}" y="${y + 2.5}" text-anchor="end" font-size="7" fill="#a7ada3">${value}×</text>`;
  }
  markup += `<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="#eaede4"/><line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="#eaede4"/>`;
  const series = [[keys[0], '#52a9eb'], [keys[1], '#ed786a']];
  const firstTime = history[0]?.t ?? 0;
  const lastTime = history[history.length - 1]?.t ?? firstTime;
  for (const [key, color] of series) {
    const points = history.filter((point) => point[key] !== null).map((point) => {
      const x = firstTime === lastTime ? (left + right) / 2 : left + ((point.t - firstTime) / (lastTime - firstTime)) * (right - left);
      const y = bottom - (clamp(point[key], low, high) - low) / (high - low) * (bottom - top);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    if (points.length === 1) {
      const [x, y] = points[0].split(',');
      markup += `<circle cx="${x}" cy="${y}" r="3" fill="${color}"/>`;
    } else if (points.length > 1) {
      markup += `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`;
      const [x, y] = points[points.length - 1].split(',');
      markup += `<circle cx="${x}" cy="${y}" r="3.2" fill="#fffefa" stroke="${color}" stroke-width="1.8"/>`;
    }
  }
  traitSvg.setAttribute('aria-label', `Recorded mean inherited ${suffix.toLowerCase()} trait for blue and red blobs`);
  traitSvg.innerHTML = markup;
}

function updateSummary() {
  const p = document.querySelector('#run-summary');
  if (history.length < 14) {
    p.textContent = 'The little world is ready when you are. Press play and see who shows up.';
    return;
  }
  const latest = history.slice(-28);
  const average = (key) => latest.reduce((sum, point) => sum + point[key], 0) / latest.length;
  const avgFruit = average('fruit'), avgBlue = average('blue'), avgRed = average('red');
  const first = history[0], bluePeak = history.reduce((best, point, index) => point.blue > best.value ? { value: point.blue, index } : best, { value: -1, index: 0 });
  const redPeak = history.reduce((best, point, index) => point.red > best.value ? { value: point.red, index } : best, { value: -1, index: 0 });
  const recent = history.slice(-10);
  const trend = (key) => recent.length > 1 ? recent[recent.length - 1][key] - recent[0][key] : 0;
  const popPeak = Math.max(1, ...history.map((point) => point.blue + point.red));
  if (avgBlue + avgRed < 4 && simTime > 35) p.textContent = 'The busy season passed; the garden has settled into a much quieter little world.';
  else if (avgFruit < Math.max(3, totalFruitCapacity() * 0.16) && avgBlue < 10) p.textContent = 'Low fruit kept the garden small. A few extra berries could change the whole story.';
  else if (bluePeak.index < redPeak.index && redPeak.index - bluePeak.index > 3 && history[bluePeak.index].blue > first.blue + 2) p.textContent = 'Blue blobs found their footing first, then the red visitors followed a little later.';
  else if (avgRed > avgBlue * 0.75 && trend('blue') < -2 && trend('red') < 0) p.textContent = 'Red visitors got plentiful for a while. Blue dipped first, and now both groups are easing back.';
  else if (latest[latest.length - 1].blue + latest[latest.length - 1].red > popPeak * 0.78 && Math.abs(trend('blue')) + Math.abs(trend('red')) < 4) p.textContent = 'The garden found a comfortable rhythm, with both little groups holding steady.';
  else if (avgFruit > 15 && trend('blue') > 1) p.textContent = 'Plenty of ripe fruit is giving the blue blobs a lively start.';
  else if (trend('red') > 1 && trend('blue') < 1) p.textContent = 'More red blobs are arriving, and the blue bunch is beginning to feel the company.';
  else p.textContent = 'The groups are trading places in the garden. Give it a little time and watch the curve unfold.';
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvasWidth = rect.width;
  canvasHeight = rect.height;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawWorld(performance.now() / 1000);
}

function project(x, y, radius = canvasRadius()) {
  const rotatedX = x * Math.cos(rotation) - y * Math.sin(rotation);
  const rotatedY = x * Math.sin(rotation) + y * Math.cos(rotation);
  return { x: canvasWidth / 2 + rotatedX * radius, y: canvasHeight / 2 + rotatedY * radius * 0.83 };
}

function drawWorld(visualTime) {
  if (!canvasWidth || !canvasHeight) return;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2 + 4;
  const radius = canvasRadius();
  const ry = radius * 0.83;

  ctx.save();
  ctx.shadowColor = 'rgba(50, 75, 51, .2)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 12;
  ctx.beginPath(); ctx.ellipse(centerX, centerY + 8, radius * 1.015, ry * 1.015, 0, 0, Math.PI * 2); ctx.fillStyle = '#8c9a72'; ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.ellipse(centerX, centerY + 6, radius, ry, 0, 0, Math.PI * 2); ctx.fillStyle = '#a9b985'; ctx.fill();
  const ground = ctx.createRadialGradient(centerX - radius * 0.2, centerY - ry * 0.35, radius * 0.05, centerX, centerY, radius * 1.08);
  ground.addColorStop(0, '#e7edcf'); ground.addColorStop(0.68, '#d3e0ad'); ground.addColorStop(1, '#c3d293');
  ctx.beginPath(); ctx.ellipse(centerX, centerY, radius * 0.985, ry * 0.985, 0, 0, Math.PI * 2); ctx.fillStyle = ground; ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.ellipse(centerX, centerY, radius * 0.965, ry * 0.965, 0, 0, Math.PI * 2); ctx.clip();
  drawTerrain(visualTime, radius);

  const actors = [
    ...plants.map((plant) => ({ y: plant.y + 0.075, kind: 'plant', item: plant })),
    ...entities.map((entity) => ({ y: entity.y, kind: 'blob', item: entity })),
  ].sort((a, b) => a.y - b.y);
  for (const actor of actors) {
    if (actor.kind === 'plant') drawPlant(actor.item, visualTime, radius);
    else drawBlob(actor.item, visualTime, radius);
  }
  drawSparkles(visualTime, radius);
  ctx.restore();

  ctx.beginPath(); ctx.ellipse(centerX, centerY, radius * 0.988, ry * 0.988, 0, 0, Math.PI * 2); ctx.strokeStyle = '#f5f3da'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(centerX, centerY, radius * 0.998, ry * 0.998, 0, 0, Math.PI * 2); ctx.strokeStyle = '#9daf79'; ctx.lineWidth = 1; ctx.stroke();
}

function drawTerrain(t, r) {
  // A softly dappled moss floor gives the little island a sense of scale.
  ctx.globalAlpha = 0.32;
  for (let i = 0; i < 24; i++) {
    const angle = (i * 2.399) % (Math.PI * 2);
    const distanceFromCenter = 0.1 + ((i * 41) % 77) / 100;
    const p = project(Math.cos(angle) * distanceFromCenter, Math.sin(angle) * distanceFromCenter);
    const size = 1 + (i % 3) * 0.7;
    ctx.fillStyle = i % 2 ? '#faf7d9' : '#a1bb79';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, size, size * 0.58, angle, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // A tiny winding footpath.
  ctx.save();
  ctx.strokeStyle = 'rgba(226, 203, 147, .42)'; ctx.lineWidth = Math.max(7, r * 0.025); ctx.lineCap = 'round';
  const pathStart = project(-0.48, 0.57), pathMiddle = project(-0.17, 0.42), pathEnd = project(0.12, 0.65);
  ctx.beginPath(); ctx.moveTo(pathStart.x, pathStart.y); ctx.quadraticCurveTo(pathMiddle.x, pathMiddle.y - 5, pathEnd.x, pathEnd.y); ctx.stroke();
  ctx.restore();
  // A shallow pond and tiny stepping stones.
  const pond = project(0.61, 0.38);
  ctx.save(); ctx.translate(pond.x, pond.y); ctx.rotate(-0.18);
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.115, r * 0.056, 0, 0, Math.PI * 2); ctx.fillStyle = '#91c9c0'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(-r * 0.015, -r * 0.008, r * 0.07, r * 0.024, 0, 0, Math.PI * 2); ctx.fillStyle = '#b6ddd0'; ctx.fill();
  ctx.restore();
  for (const [x, y, size] of [[0.75, 0.43, 3], [0.79, 0.46, 2], [0.71, 0.46, 2.2]]) {
    const p = project(x, y); ctx.beginPath(); ctx.ellipse(p.x, p.y, size, size * 0.66, 0, 0, Math.PI * 2); ctx.fillStyle = '#a7a78b'; ctx.fill();
  }
  // Low wild flowers dotted around the meadow.
  const blooms = [[-0.75, -0.2], [0.73, -0.35], [-0.65, 0.35], [0.24, -0.75], [-0.1, 0.77], [0.79, 0.1]];
  blooms.forEach(([x, y], index) => {
    const p = project(x, y);
    const bob = Math.sin(t * 1.6 + index) * 1.2;
    ctx.fillStyle = '#e9f0d1';
    for (let petal = 0; petal < 4; petal++) {
      const a = (petal / 4) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(p.x + Math.cos(a) * 2.5, p.y + Math.sin(a) * 2 + bob, 2.1, 1.7, a, 0, Math.PI * 2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(p.x, p.y + bob, 1.4, 0, Math.PI * 2); ctx.fillStyle = '#d2a94e'; ctx.fill();
  });
}

function drawPlant(plant, t, r) {
  const p = project(plant.x, plant.y);
  const scale = plant.size * r;
  const sway = Math.sin(t * 0.82 + plant.id) * 0.025;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(1, 0.9);
  ctx.fillStyle = 'rgba(53, 83, 44, .18)';
  ctx.beginPath(); ctx.ellipse(0, scale * 0.077, scale * 0.12, scale * 0.035, 0, 0, Math.PI * 2); ctx.fill();
  // trunk and two little branch arms
  ctx.strokeStyle = '#956e48'; ctx.lineWidth = Math.max(3, scale * 0.034); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, scale * 0.06); ctx.lineTo(sway * scale, -scale * 0.11); ctx.stroke();
  ctx.lineWidth = Math.max(2, scale * 0.022);
  ctx.beginPath(); ctx.moveTo(sway * scale, -scale * 0.04); ctx.lineTo(-scale * 0.075, -scale * 0.105); ctx.moveTo(sway * scale, -scale * 0.075); ctx.lineTo(scale * 0.07, -scale * 0.14); ctx.stroke();
  const leafColors = ['#5d9b58', '#72a85f', '#81b36d', '#568e4f', '#92bc73'];
  const crown = [[-0.075, -0.13, 0.086], [0, -0.18, 0.105], [0.08, -0.14, 0.085], [-0.035, -0.245, 0.087], [0.062, -0.23, 0.075], [-0.1, -0.205, 0.06]];
  crown.forEach(([x, y, size], index) => {
    const cx = x * scale + sway * scale * 0.4;
    const cy = y * scale;
    const radius = size * scale;
    const gradient = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.38, radius * 0.08, cx, cy, radius * 1.2);
    gradient.addColorStop(0, leafColors[(index + 2) % leafColors.length]); gradient.addColorStop(1, leafColors[index % leafColors.length]);
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
    ctx.beginPath(); ctx.arc(cx - radius * 0.25, cy - radius * 0.28, radius * 0.18, 0, Math.PI * 2); ctx.fillStyle = 'rgba(230, 245, 177, .24)'; ctx.fill();
  });
  plant.fruit.forEach((berry, index) => {
    const berryPosition = fruitPosition(plant, index);
    const berryPoint = project(berryPosition.x, berryPosition.y);
    const bx = berryPoint.x - p.x + sway * scale * 0.32;
    const by = (berryPoint.y - p.y) / 0.9;
    if (berry.ready) {
      const radius = scale * 0.019;
      ctx.beginPath(); ctx.ellipse(bx, by, radius * 1.02, radius * 1.2, -0.2, 0, Math.PI * 2);
      const fruitGradient = ctx.createRadialGradient(bx - radius * 0.4, by - radius * 0.5, 1, bx, by, radius * 1.3);
      fruitGradient.addColorStop(0, '#d4e778'); fruitGradient.addColorStop(0.5, '#a4c744'); fruitGradient.addColorStop(1, '#789f35');
      ctx.fillStyle = fruitGradient; ctx.fill();
      ctx.beginPath(); ctx.arc(bx - radius * 0.27, by - radius * 0.3, Math.max(0.8, radius * 0.22), 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,225,.8)'; ctx.fill();
      ctx.strokeStyle = '#678643'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(bx, by - radius); ctx.lineTo(bx + 1.2, by - radius * 1.5); ctx.stroke();
    } else if (berry.progress > 0.15) {
      ctx.beginPath(); ctx.arc(bx, by, scale * 0.01 * berry.progress, 0, Math.PI * 2); ctx.fillStyle = `rgba(181, 198, 111, ${0.25 + berry.progress * 0.42})`; ctx.fill();
    }
  });
  ctx.restore();
}

function drawBlob(entity, t, r) {
  const p = project(entity.x, entity.y);
  const size = r * 0.068 * entity.sizeTrait;
  const idleBob = Math.sin(t * 4.1 + entity.bobSeed) * size * (entity.pause > 0 ? 0.035 : 0.1);
  const actionBounce = entity.pauseKind === 'eat' || entity.pauseKind === 'contact' ? Math.sin((entity.pause + t) * 10) * size * 0.035 : 0;
  const alpha = entity.energy <= 0 ? clamp(1 - entity.fadeTime / 9, 0.15, 1) : 1;
  const isBlue = entity.species === 'blue';
  const main = isBlue ? '#58b2f2' : '#f47668';
  const light = isBlue ? '#a1e0ff' : '#ffb5a0';
  const dark = isBlue ? '#3388d3' : '#dc5c55';
  const scaleY = entity.pauseKind === 'eat' ? 0.84 + Math.sin(t * 12 + entity.id) * 0.08 : 1 + entity.scalePulse * 0.11;

  ctx.save();
  ctx.globalAlpha = alpha;
  if (entity.glow > 0.05) {
    const glow = ctx.createRadialGradient(p.x, p.y, size * 0.2, p.x, p.y, size * 1.55);
    glow.addColorStop(0, isBlue ? `rgba(160, 225, 255, ${entity.glow * 0.24})` : `rgba(255, 188, 153, ${entity.glow * 0.27})`);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, size * 1.55, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(39, 65, 50, .18)';
  ctx.beginPath(); ctx.ellipse(p.x, p.y + size * 0.69, size * 0.65, size * 0.21, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(p.x, p.y + idleBob + actionBounce);
  ctx.rotate(entity.heading * 0.035);
  ctx.scale(entity.facing, scaleY);
  const body = new Path2D();
  body.moveTo(0, -size * 0.88);
  body.bezierCurveTo(size * 0.6, -size * 0.88, size * 0.83, -size * 0.27, size * 0.77, size * 0.22);
  body.bezierCurveTo(size * 0.71, size * 0.72, size * 0.34, size * 0.94, -size * 0.04, size * 0.88);
  body.bezierCurveTo(-size * 0.55, size * 0.87, -size * 0.83, size * 0.49, -size * 0.79, size * 0.02);
  body.bezierCurveTo(-size * 0.75, -size * 0.48, -size * 0.42, -size * 0.86, 0, -size * 0.88);
  body.closePath();
  const fill = ctx.createLinearGradient(-size * 0.5, -size, size * 0.65, size * 0.8);
  fill.addColorStop(0, light); fill.addColorStop(0.38, main); fill.addColorStop(1, dark);
  ctx.shadowColor = 'rgba(40, 55, 50, .18)'; ctx.shadowBlur = size * 0.16; ctx.shadowOffsetY = size * 0.075;
  ctx.fillStyle = fill; ctx.fill(body); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = isBlue ? '#3388cc' : '#dd665b'; ctx.lineWidth = Math.max(0.65, size * 0.027); ctx.stroke(body);
  ctx.beginPath(); ctx.ellipse(-size * 0.2, -size * 0.48, size * 0.24, size * 0.1, -0.25, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.33)'; ctx.fill();

  const blinkScale = Math.max(0.12, 1 - entity.blink * 0.92);
  const eyeY = size * 0.01;
  for (const eyeX of [-size * 0.26, size * 0.26]) {
    ctx.fillStyle = 'rgba(35, 57, 66, .9)';
    ctx.beginPath(); ctx.ellipse(eyeX, eyeY, size * 0.07, size * 0.118 * blinkScale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeX + size * 0.018, eyeY - size * 0.035, size * 0.025, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  }
  ctx.beginPath(); ctx.ellipse(0, size * 0.28, size * 0.075, size * (entity.pauseKind === 'eat' && entity.pause > 0 ? 0.052 : 0.025), 0, 0, Math.PI * 2); ctx.fillStyle = '#805758'; ctx.fill();
  ctx.fillStyle = isBlue ? 'rgba(237, 129, 138, .4)' : 'rgba(255, 213, 164, .43)';
  ctx.beginPath(); ctx.ellipse(-size * 0.48, size * 0.19, size * 0.11, size * 0.055, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(size * 0.48, size * 0.19, size * 0.11, size * 0.055, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  if (selectedId === entity.id) {
    ctx.save(); ctx.strokeStyle = '#668f59'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.ellipse(p.x, p.y + size * 0.83, size * 0.9, size * 0.31, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
}

function drawSparkles(t, r) {
  for (const entity of entities) {
    if (entity.glow <= 0.1) continue;
    const p = project(entity.x, entity.y);
    for (let i = 0; i < 3; i++) {
      const angle = t * 2.6 + i * Math.PI * 2 / 3 + entity.bobSeed;
      const radius = r * (0.095 + (1 - entity.glow) * 0.025);
      const x = p.x + Math.cos(angle) * radius;
      const y = p.y + Math.sin(angle) * radius * 0.6 - r * 0.01;
      ctx.globalAlpha = entity.glow * (0.5 + Math.sin(t * 5 + i) * 0.3);
      ctx.fillStyle = entity.species === 'blue' ? '#fff8bd' : '#fff4c9';
      ctx.beginPath(); ctx.arc(x, y, 1.2 + Math.sin(t * 5 + i) * 0.4, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function renderInspector() {
  const inspector = document.querySelector('#inspector');
  const entity = entities.find((item) => item.id === selectedId);
  if (!entity) {
    delete inspector.dataset.entityId;
    inspector.innerHTML = '<div class="inspector-empty"><span class="inspector-orbit">◎</span><div><b>Curious about someone?</b><p>Tap a little blob in the garden to meet them.</p></div><span class="inspector-arrow">↖</span></div>';
    return;
  }
  const speciesClass = entity.species === 'blue' ? 'blue' : 'red';
  const actionColor = entity.pauseKind === 'eat' ? '#a7ba64' : entity.species === 'blue' ? '#69addc' : '#e98a76';
  const remaining = entity.pause > 0 ? `${entity.pause.toFixed(1)}s` : '—';
  const speed = Math.round((entity.species === 'blue' ? config.blueSpeed : config.redSpeed) * entity.speedTrait);
  const sensing = Math.round((entity.species === 'blue' ? config.blueVision : config.redVision) * entity.visionTrait);
  const actionText = `${entity.action}${entity.parentName ? ` · child of ${entity.parentName}` : ''}`;
  if (inspector.dataset.entityId === String(entity.id)) {
    const action = inspector.querySelector('.inspect-action');
    const dot = action.querySelector('.action-dot');
    dot.style.background = actionColor;
    action.replaceChildren(dot, document.createTextNode(actionText));
    const values = inspector.querySelectorAll('.inspect-metric b');
    values[0].textContent = `${Math.round(entity.energy)}%`;
    values[1].textContent = formatTime(entity.age);
    values[2].textContent = `${speed} px/s`;
    values[3].textContent = `${sensing} px`;
    values[4].textContent = remaining;
    const energyFill = inspector.querySelector('.energy-fill');
    energyFill.style.width = `${clamp(entity.energy, 0, 100)}%`;
    energyFill.style.background = entity.species === 'blue' ? '#6eb6e7' : '#eb8a77';
    return;
  }
  inspector.dataset.entityId = String(entity.id);
  inspector.innerHTML = `<div class="inspector-live">
    <div class="inspect-avatar ${speciesClass}">${entity.species === 'blue' ? '◉' : '●'}</div>
    <div class="inspect-main"><div class="inspect-topline"><b>${entity.name}</b><span>${getSpecies(entity)} blob · gen ${entity.generation}</span></div><div class="inspect-action"><i class="action-dot" style="background:${actionColor}"></i>${actionText}</div></div>
    <div class="inspect-metrics"><div class="inspect-metric"><span>ENERGY</span><b>${Math.round(entity.energy)}%</b><div class="energy-track"><div class="energy-fill" style="width:${clamp(entity.energy, 0, 100)}%;background:${entity.species === 'blue' ? '#6eb6e7' : '#eb8a77'}"></div></div></div><div class="inspect-metric"><span>AGE</span><b>${formatTime(entity.age)}</b></div><div class="inspect-metric"><span>SPEED</span><b>${speed} px/s</b></div><div class="inspect-metric"><span>SENSE</span><b>${sensing} px</b></div><div class="inspect-metric"><span>PAUSE</span><b>${remaining}</b></div></div>
    <button class="inspect-close" type="button" aria-label="Close blob inspection">×</button>
  </div>`;
  inspector.querySelector('.inspect-close').addEventListener('click', () => { selectedId = null; renderInspector(); drawWorld(performance.now() / 1000); });
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function nearestEntityAt(point) {
  let nearest = null, minDistance = 24;
  for (const entity of entities) {
    const projected = project(entity.x, entity.y);
    const d = Math.hypot(projected.x - point.x, projected.y - point.y);
    if (d < minDistance) { nearest = entity; minDistance = d; }
  }
  return nearest;
}

function frame(now) {
  const elapsed = previousFrame ? Math.min((now - previousFrame) / 1000, 0.06) : 0;
  previousFrame = now;
  if (running && elapsed > 0) advance(elapsed * config.simulationSpeed);
  drawWorld(now / 1000);
  if (now - lastUiRefresh > 250) {
    updateUi();
    if (selectedId !== null) renderInspector();
    lastUiRefresh = now;
  }
  requestAnimationFrame(frame);
}

document.querySelector('#play-button').addEventListener('click', () => setRunning(!running));
document.querySelector('#step-button').addEventListener('click', () => {
  setRunning(false);
  advance(1 * config.simulationSpeed);
  if (history[history.length - 1].t !== simTime) pushHistory(true);
  updateUi(); renderInspector();
});
document.querySelector('#reset-button').addEventListener('click', () => { resetGarden(); showToast('Fresh garden, fresh possibilities'); });
document.querySelector('#random-button').addEventListener('click', () => {
  config.seed = Math.floor(Math.random() * 9999) + 1;
  syncControlInputs();
  document.querySelectorAll('.preset-grid button').forEach((button) => button.classList.remove('active'));
  resetGarden();
  showToast(`A new little world · seed ${config.seed}`);
});
document.querySelector('#speed-control').addEventListener('input', (event) => {
  config.simulationSpeed = Number(event.target.value);
  document.querySelector('#speed-value').textContent = formatMultiplier(config.simulationSpeed);
});
document.querySelector('#presets').addEventListener('click', (event) => {
  const button = event.target.closest('[data-preset]');
  if (button) applyPreset(button.dataset.preset);
});
document.querySelector('.trait-tabs').addEventListener('click', (event) => {
  const button = event.target.closest('[data-trait]');
  if (!button) return;
  selectedTraitMetric = button.dataset.trait;
  chartsDirty = true;
  document.querySelectorAll('.trait-tabs [data-trait]').forEach((tab) => {
    const active = tab === button;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-pressed', String(active));
  });
  updateUi();
});
canvas.addEventListener('pointerdown', (event) => {
  pointerStart = { ...canvasPoint(event), rotation };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (!pointerStart || !(event.buttons & 1)) return;
  const point = canvasPoint(event);
  const deltaX = point.x - pointerStart.x;
  const deltaY = point.y - pointerStart.y;
  if (Math.hypot(deltaX, deltaY) > 5) rotation = pointerStart.rotation + deltaX / Math.max(canvasRadius(), 100) - deltaY / Math.max(canvasRadius(), 100) * 0.35;
});
canvas.addEventListener('pointerup', (event) => {
  if (!pointerStart) return;
  const point = canvasPoint(event);
  const moved = Math.hypot(point.x - pointerStart.x, point.y - pointerStart.y);
  if (moved < 6) {
    const entity = nearestEntityAt(point);
    selectedId = entity ? entity.id : null;
    renderInspector();
    if (entity) showToast(`Hello, ${entity.name}!`);
  }
  pointerStart = null;
});
canvas.addEventListener('pointercancel', () => { pointerStart = null; });
canvas.addEventListener('keydown', (event) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1;
    rotation += direction * 0.12;
    drawWorld(performance.now() / 1000);
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (!entities.length) return;
    const ordered = [...entities].sort((a, b) => a.id - b.id);
    const currentIndex = ordered.findIndex((entity) => entity.id === selectedId);
    selectedId = ordered[(currentIndex + 1) % ordered.length].id;
    renderInspector();
    drawWorld(performance.now() / 1000);
    showToast(`Hello, ${entities.find((entity) => entity.id === selectedId).name}!`);
  }
});
window.addEventListener('resize', resizeCanvas);

buildControls();
document.querySelector('#speed-control').value = String(config.simulationSpeed);
resetGarden();
new ResizeObserver(resizeCanvas).observe(canvas);
requestAnimationFrame(frame);
