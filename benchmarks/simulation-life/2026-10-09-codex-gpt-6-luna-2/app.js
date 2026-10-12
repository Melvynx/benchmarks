const $ = (selector) => document.querySelector(selector);
const canvas = $('#world');
const ctx = canvas.getContext('2d');
const TAU = Math.PI * 2;
const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
const round = (n, places = 0) => Number(n.toFixed(places));

const DEFAULTS = {
  fruitGrowth: 1.2, fruitLimit: 5, fruitDelay: 58,
  blueUse: 0.075, blueSpeed: 42, blueVision: 39, blueCopy: 0.77, blueEat: 24,
  redUse: 0.06, redSpeed: 44, redVision: 48, redStrength: 0.32, redCopy: 0.76, redPause: 48,
  trees: 12, blueStart: 9, redStart: 5, worldSize: 100, seed: 6842, simSpeed: 1,
};
const PRESETS = {
  balanced: { ...DEFAULTS },
  orchard: { ...DEFAULTS, fruitGrowth: 2.3, fruitLimit: 8, trees: 18, blueStart: 11, redStart: 4, seed: 2891 },
  predators: { ...DEFAULTS, fruitGrowth: .82, blueStart: 7, redStart: 13, redSpeed: 53, redVision: 62, redStrength: .42, seed: 7173 },
  fragile: { ...DEFAULTS, fruitGrowth: .77, fruitLimit: 3, blueStart: 5, redStart: 6, blueUse: .095, redStrength: .38, trees: 9, seed: 4788 },
  sparse: { ...DEFAULTS, fruitGrowth: .48, fruitLimit: 3, blueStart: 6, redStart: 4, trees: 6, worldSize: 118, seed: 1972 },
};
const DEFINITIONS = [
  { title: 'Fruit & trees', type: 'neutral', tag: 'THE SETTING', rows: [
    ['fruitGrowth', 'Fruit growth', .2, 3, .1, 'fruit / hour', 1],
    ['fruitLimit', 'Fruit on each tree', 2, 10, 1, 'fruit', 0],
    ['fruitDelay', 'Fruit return delay', 10, 180, 5, 'min', 0],
    ['trees', 'Starting fruit trees', 3, 24, 1, 'trees', 0],
  ] },
  { title: 'Blue foragers', type: 'blue', tag: 'GATHER & GROW', rows: [
    ['blueUse', 'Energy use', .025, .16, .005, '/ hour', 3],
    ['blueSpeed', 'Wander speed', 18, 80, 1, 'pace', 0],
    ['blueVision', 'Sensing range', 12, 82, 1, 'steps', 0],
    ['blueCopy', 'Copy when energy is', .52, .98, .01, 'energy', 2],
    ['blueEat', 'Eating time', 5, 90, 1, 'min', 0],
  ] },
  { title: 'Red bouncers', type: 'red', tag: 'SEEK & SHARE', rows: [
    ['redUse', 'Energy use', .025, .15, .005, '/ hour', 3],
    ['redSpeed', 'Wander speed', 18, 80, 1, 'pace', 0],
    ['redVision', 'Sensing range', 12, 90, 1, 'steps', 0],
    ['redStrength', 'Contact strength', .1, .55, .01, 'energy', 2],
    ['redCopy', 'Copy when energy is', .52, .98, .01, 'energy', 2],
    ['redPause', 'Pause after a hello', 8, 180, 2, 'min', 0],
  ] },
  { title: 'A fresh beginning', type: 'neutral', tag: 'RESET-ONLY', rows: [
    ['blueStart', 'Starting blue blobs', 1, 30, 1, 'friends', 0],
    ['redStart', 'Starting red blobs', 0, 24, 1, 'friends', 0],
    ['worldSize', 'World size', 70, 135, 1, 'acres', 0],
    ['seed', 'Random seed', 1, 9999, 1, 'seed', 0],
    ['simSpeed', 'Simulation speed', .25, 4, .25, '× speed', 2],
  ] },
];

let settings = { ...DEFAULTS };
let randomState = settings.seed;
let plants = [];
let blue = [];
let red = [];
let elapsed = 0;
let history = [];
let running = false;
let selected = null;
let serial = 0;
let worldAngle = -.08;
let dragging = false;
let dragMoved = false;
let lastPointerAngle = 0;
let animationTime = 0;
let lastFrame = performance.now();
let sampleClock = 0;
let uiClock = 0;
let toastTimer;
let activePreset = 'balanced';
let lastResetReason = 'start';
const namePool = ['Pip', 'Miso', 'Moss', 'Bean', 'Nori', 'Bibi', 'Clover', 'Peep', 'Dew', 'Sprout'];

function random() {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
  return randomState / 4294967296;
}
function randomDisk(max = .82) {
  const angle = random() * TAU;
  const radius = Math.sqrt(random()) * max;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
function makeCreature(kind, parent = null) {
  const id = ++serial;
  const point = parent ? { x: parent.x + (random() - .5) * .1, y: parent.y + (random() - .5) * .1 } : randomDisk(.77);
  const speedTrait = parent ? clamp(parent.speedTrait * (.94 + random() * .12), .72, 1.32) : .87 + random() * .25;
  const visionTrait = parent ? clamp(parent.visionTrait * (.94 + random() * .12), .72, 1.32) : .88 + random() * .24;
  return {
    id, kind, name: namePool[Math.floor(random() * namePool.length)],
    x: point.x, y: point.y, vx: (random() - .5) * .003, vy: (random() - .5) * .003,
    energy: parent ? .59 + random() * .06 : .56 + random() * .36,
    age: parent ? 0 : random() * 460, speedTrait, visionTrait,
    generation: parent ? parent.generation + 1 : 1,
    family: parent ? parent.family : id,
    target: null, goalTimer: random() * 18, eatTimer: 0, pauseTimer: 0, stunTimer: 0,
    animation: 0, blink: random() * 5, wanderAngle: random() * TAU,
    action: 'wandering', actionUntil: 0, bob: random() * TAU, glow: 0,
  };
}

function addControlMarkup() {
  $('#controls').innerHTML = DEFINITIONS.map((group) => `
    <section class="range-group ${group.type}">
      <div class="group-head"><div class="group-title ${group.type === 'neutral' ? 'neutral' : ''}"><i></i>${group.title}</div><span class="group-tag">${group.tag}</span></div>
      ${group.rows.map(([key, label, min, max, step, unit, decimals]) => `
        <label class="control-row" for="setting-${key}">
          <span class="range-label"><span>${label}</span><span class="range-value" id="value-${key}"></span></span>
          <span class="range-row"><span class="range-edge">${min}</span><input class="range-input" id="setting-${key}" type="range" min="${min}" max="${max}" step="${step}" data-key="${key}" data-unit="${unit}" data-decimals="${decimals}"/><span class="range-edge">${max}</span></span>
        </label>`).join('')}
    </section>`).join('');
}

function formatControl(key, value) {
  const input = $(`#setting-${key}`);
  const decimals = Number(input.dataset.decimals);
  const rounded = Number(value.toFixed(decimals));
  const unit = input.dataset.unit;
  return unit === 'energy' ? `${Math.round(rounded * 100)}%` : `${rounded}${unit === '× speed' ? '×' : ` ${unit}`}`;
}
function updateControl(key) {
  const input = $(`#setting-${key}`);
  input.value = settings[key];
  const pct = (settings[key] - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100;
  input.style.setProperty('--fill', `${pct}%`);
  $(`#value-${key}`).textContent = formatControl(key, settings[key]);
}
function syncControls() { Object.keys(settings).forEach(updateControl); }

function createPlants() {
  plants = [];
  for (let i = 0; i < settings.trees; i++) {
    const point = randomDisk(.78);
    plants.push({ id: i + 1, x: point.x, y: point.y, fruit: Math.max(1, settings.fruitLimit * (.55 + random() * .45)), cooldown: random() * settings.fruitDelay, size: .82 + random() * .38, hue: random() });
  }
}
function newRun(reason = 'reset') {
  running = false;
  elapsed = 0;
  serial = 0;
  randomState = settings.seed >>> 0;
  createPlants();
  blue = Array.from({ length: settings.blueStart }, () => makeCreature('blue'));
  red = Array.from({ length: settings.redStart }, () => makeCreature('red'));
  history = [];
  sampleClock = 0;
  selected = null;
  activePreset = Object.keys(PRESETS).find((key) => Object.keys(PRESETS[key]).every((field) => PRESETS[key][field] === settings[field])) || activePreset;
  lastResetReason = reason;
  updatePresetButtons();
  recordHistory();
  refreshUI(true);
  showToast(reason === 'random' ? 'A new little world has arrived.' : 'The garden has a fresh start.');
}
function updatePresetButtons() {
  document.querySelectorAll('.preset').forEach((button) => button.classList.toggle('active', button.dataset.preset === activePreset));
}

function populationCap(kind) {
  const area = (settings.worldSize / 100) ** 2;
  return kind === 'blue'
    ? Math.round(Math.max(5, (plants.length * 1.55 + 9) * area))
    : Math.round(Math.max(5, (blue.length * .98 + 5) * area));
}
function nearestAvailablePlant(creature, vision) {
  let best = null;
  let bestDistance = Infinity;
  for (const plant of plants) {
    if (plant.fruit < .42) continue;
    const distance = Math.hypot(plant.x - creature.x, plant.y - creature.y);
    if (distance < bestDistance && distance < vision) { best = plant; bestDistance = distance; }
  }
  return best;
}
function nearestBlue(creature, vision) {
  let best = null;
  let bestDistance = Infinity;
  for (const target of blue) {
    if (target.energy <= 0) continue;
    const distance = Math.hypot(target.x - creature.x, target.y - creature.y);
    if (distance < bestDistance && distance < vision) { best = target; bestDistance = distance; }
  }
  return best;
}
function setAction(creature, name, duration = 0) {
  creature.action = name;
  creature.actionUntil = elapsed + duration;
}
function tendPlant(plant, dt) {
  if (plant.fruit >= settings.fruitLimit - .001) { plant.fruit = settings.fruitLimit; return; }
  if (plant.cooldown > 0) { plant.cooldown = Math.max(0, plant.cooldown - dt); return; }
  plant.fruit = Math.min(settings.fruitLimit, plant.fruit + settings.fruitGrowth * dt / 60);
}
function beginEating(creature, plant) {
  if (creature.eatTimer > 0 || plant.fruit < .42) return;
  plant.fruit = Math.max(0, plant.fruit - 1);
  plant.cooldown = Math.max(plant.cooldown, settings.fruitDelay);
  creature.energy = clamp(creature.energy + .43 + Math.min(.08, settings.fruitGrowth * .025), 0, 1);
  creature.eatTimer = settings.blueEat;
  creature.glow = 1;
  creature.animation = 1;
  creature.target = null;
  setAction(creature, 'munching', creature.eatTimer);
}
function contact(redCreature, blueCreature) {
  const strength = settings.redStrength;
  blueCreature.energy = clamp(blueCreature.energy - strength * .38, 0, 1);
  redCreature.energy = clamp(redCreature.energy + strength * .67, 0, 1);
  redCreature.pauseTimer = settings.redPause;
  blueCreature.stunTimer = Math.max(blueCreature.stunTimer, 6);
  redCreature.glow = 1;
  blueCreature.glow = .65;
  redCreature.animation = 1;
  blueCreature.animation = .7;
  redCreature.target = null;
  setAction(redCreature, 'a hello!', redCreature.pauseTimer);
  setAction(blueCreature, 'startled', blueCreature.stunTimer);
}
function updateCreature(creature, kind, dt) {
  creature.age += dt;
  creature.blink += dt / 60;
  creature.animation = Math.max(0, creature.animation - dt / 9);
  creature.glow = Math.max(0, creature.glow - dt / 12);
  creature.eatTimer = Math.max(0, creature.eatTimer - dt);
  creature.pauseTimer = Math.max(0, creature.pauseTimer - dt);
  creature.stunTimer = Math.max(0, creature.stunTimer - dt);
  creature.goalTimer -= dt;

  if (creature.energy <= 0) return;
  if (creature.eatTimer > 0) { setAction(creature, 'munching', creature.eatTimer); creature.vx *= .88; creature.vy *= .88; return; }
  if (creature.pauseTimer > 0) { setAction(creature, 'a hello!', creature.pauseTimer); creature.vx *= .82; creature.vy *= .82; return; }
  if (creature.stunTimer > 0) { setAction(creature, 'startled', creature.stunTimer); creature.vx *= .78; creature.vy *= .78; return; }

  const vision = (kind === 'blue' ? settings.blueVision : settings.redVision) / 100 * 1.9 * creature.visionTrait;
  const speed = (kind === 'blue' ? settings.blueSpeed : settings.redSpeed) * creature.speedTrait;
  let target = null;
  let targetKind = null;
  if (creature.goalTimer <= 0 || !creature.target) {
    creature.goalTimer = 5 + random() * 12;
    if (kind === 'blue') {
      const plant = nearestAvailablePlant(creature, vision);
      if (plant) { creature.target = plant.id; targetKind = 'fruit'; }
      else creature.target = null;
      if (!plant) setAction(creature, random() < .46 ? 'wandering' : 'hanging out');
    } else {
      const prey = nearestBlue(creature, vision);
      if (prey) { creature.target = prey.id; targetKind = 'friend'; }
      else { creature.target = null; setAction(creature, 'looking around'); }
    }
  }
  if (creature.target != null) {
    target = kind === 'blue' ? plants.find((plant) => plant.id === creature.target && plant.fruit >= .42) : blue.find((blob) => blob.id === creature.target && blob.energy > 0);
    targetKind = kind === 'blue' ? 'fruit' : 'friend';
    if (!target) { creature.target = null; creature.goalTimer = 0; }
  }

  let dx = 0;
  let dy = 0;
  if (target) {
    dx = target.x - creature.x;
    dy = target.y - creature.y;
    const distance = Math.hypot(dx, dy);
    if (kind === 'blue' && distance < .105) { beginEating(creature, target); return; }
    if (kind === 'red' && distance < .055) { contact(creature, target); return; }
    setAction(creature, kind === 'blue' ? 'foraging' : 'on the lookout');
  } else {
    creature.wanderAngle += (random() - .5) * Math.min(.35, dt * .04);
    dx = Math.cos(creature.wanderAngle) * .5;
    dy = Math.sin(creature.wanderAngle) * .5;
  }

  // Both groups give one another a little room. Blue blobs also spread around the orchard.
  let avoidX = 0;
  let avoidY = 0;
  const sameGroup = kind === 'blue' ? blue : red;
  for (const other of sameGroup) {
    if (other.id === creature.id) continue;
    const ox = creature.x - other.x;
    const oy = creature.y - other.y;
    const distance = Math.hypot(ox, oy);
    if (distance > 0 && distance < .17) { avoidX += ox / distance * (.17 - distance); avoidY += oy / distance * (.17 - distance); }
  }
  if (kind === 'blue') {
    for (const predator of red) {
      const ox = creature.x - predator.x;
      const oy = creature.y - predator.y;
      const distance = Math.hypot(ox, oy);
      if (distance > 0 && distance < .2) { avoidX += ox / distance * (.2 - distance) * 1.55; avoidY += oy / distance * (.2 - distance) * 1.55; }
    }
  }
  dx += avoidX * 2.5;
  dy += avoidY * 2.5;
  const edgeDistance = Math.hypot(creature.x, creature.y);
  if (edgeDistance > .71) { dx -= creature.x * 2.3; dy -= creature.y * 2.3; }
  const magnitude = Math.hypot(dx, dy) || 1;
  const velocity = speed / 27000 * (target ? 1 : .8);
  const desiredX = dx / magnitude * velocity;
  const desiredY = dy / magnitude * velocity;
  creature.vx += (desiredX - creature.vx) * Math.min(1, dt * .16);
  creature.vy += (desiredY - creature.vy) * Math.min(1, dt * .16);
  const moving = Math.hypot(creature.vx, creature.vy) > velocity * .25;
  creature.x += creature.vx * dt;
  creature.y += creature.vy * dt;
  if (moving && !target) setAction(creature, random() < .2 ? 'wandering' : 'stretching its legs');
  else if (moving && !creature.target) setAction(creature, 'wandering');

  const radius = Math.hypot(creature.x, creature.y);
  if (radius > .9) {
    creature.x *= .9 / radius;
    creature.y *= .9 / radius;
    creature.vx -= creature.x * .02;
    creature.vy -= creature.y * .02;
    creature.wanderAngle += Math.PI * (.45 + random() * .1);
  }
  creature.energy -= (kind === 'blue' ? settings.blueUse : settings.redUse) * dt / 60 * (moving ? 1.85 : .62);
  creature.energy = clamp(creature.energy, 0, 1);
}
function reproduce(kind, dt) {
  const group = kind === 'blue' ? blue : red;
  if (group.length >= populationCap(kind)) return;
  for (const creature of group) {
    const threshold = kind === 'blue' ? settings.blueCopy : settings.redCopy;
    if (creature.energy < threshold || creature.age < 100) continue;
    const chancePerMinute = kind === 'blue' ? .0011 : .00085;
    if (random() > 1 - Math.pow(1 - chancePerMinute, dt)) continue;
    creature.energy -= .38;
    const baby = makeCreature(kind, creature);
    baby.x = clamp(creature.x + (random() - .5) * .12, -.85, .85);
    baby.y = clamp(creature.y + (random() - .5) * .12, -.85, .85);
    baby.energy = .60;
    group.push(baby);
    if (group.length >= populationCap(kind)) break;
  }
}
function advance(dt) {
  if (dt <= 0) return;
  elapsed += dt;
  plants.forEach((plant) => tendPlant(plant, dt));
  // Run blue first, then let red respond to their resulting positions.
  for (const creature of [...blue]) updateCreature(creature, 'blue', dt);
  for (const creature of [...red]) updateCreature(creature, 'red', dt);
  reproduce('blue', dt);
  reproduce('red', dt);
  blue = blue.filter((creature) => creature.energy > .005);
  red = red.filter((creature) => creature.energy > .005);
  if (selected && ![...blue, ...red].some((blob) => blob.id === selected)) selected = null;
  sampleClock += dt;
  if (sampleClock >= 15) {
    sampleClock %= 15;
    recordHistory();
  }
}
function totalFruit() { return plants.reduce((sum, plant) => sum + plant.fruit, 0); }
function avgEnergy(group) { return group.length ? group.reduce((sum, blob) => sum + blob.energy, 0) / group.length : 0; }
function recordHistory() {
  history.push({ t: elapsed, fruit: round(totalFruit(), 1), blue: blue.length, red: red.length });
  if (history.length > 420) history.shift();
  drawCharts();
}
function stepOnce() {
  const end = elapsed + 60;
  while (elapsed < end) advance(Math.min(.5, end - elapsed));
  if (history.at(-1)?.t !== elapsed) recordHistory();
  refreshUI(true);
}
function getSummary() {
  if (history.length < 5) return lastResetReason === 'random' ? 'A brand-new garden, full of maybes. Let it grow for a little while and see which way it leans.' : 'Your garden is ready. Press play and see who finds their footing.';
  const first = history[0];
  const last = history.at(-1);
  const maxFruit = Math.max(1, plants.length * settings.fruitLimit);
  const fruitRatio = last.fruit / maxFruit;
  const peakBlue = history.reduce((best, point) => point.blue > best.blue ? point : best, history[0]);
  const peakRed = history.reduce((best, point) => point.red > best.red ? point : best, history[0]);
  const averageSize = (last.blue + last.red) / 2;
  if (!last.blue && !last.red) return 'The garden went quiet. A very small world can only carry so much life.';
  if (!last.blue && last.red) return 'The fruit-foragers faded first. The red blobs still have a little energy left, but the garden has tipped.';
  if (!last.red && last.blue) return 'Blue found the fruit and kept the garden going. With no red blobs left, the orchard has settled into a calmer rhythm.';
  if (fruitRatio < .15 && averageSize < 8) return 'Low fruit kept the whole garden small. The trees are taking their time, so the blue group cannot grow very far.';
  if (peakBlue.t < peakRed.t && peakBlue.blue > first.blue + 2 && peakRed.red > first.red + 1) return 'Blue found the orchard first. Red numbers rose a little later, following the extra foragers.';
  if (first.red > first.blue * 1.15 && last.blue < first.blue * .75 && last.red < first.red * .8) return 'The red group crowded the foragers early. Blue dipped first, and red began to run out of energy after it.';
  const blueChange = Math.abs(last.blue - first.blue) / Math.max(1, first.blue);
  const redChange = Math.abs(last.red - first.red) / Math.max(1, first.red);
  if (fruitRatio > .12 && blueChange < .5 && redChange < .6) return 'The garden found a steady balance. Both groups are still here, trading small rises and falls.';
  if (last.blue > first.blue * 1.4 && last.red < first.red) return 'Fruit helped the blue foragers grow. The red group has not caught up yet, so the balance is tilting blue.';
  if (last.blue < first.blue * .65 && last.red > first.red * 1.2) return 'The red group is up while blue is down. Watch what happens as easy fruit gets harder to find.';
  if (fruitRatio < .3) return 'The trees are running low on fruit. The foragers are moving farther between meals, and the garden is feeling it.';
  return 'The garden is finding its rhythm. Small changes in fruit and energy are rippling through both groups.';
}
function formatTime(minutes) {
  const day = Math.floor(minutes / 1440) + 1;
  const dayMinutes = Math.floor(minutes % 1440);
  const hour = Math.floor((dayMinutes + 360) / 60) % 24;
  const minute = dayMinutes % 60;
  return `DAY ${String(day).padStart(2, '0')} · ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
function describeAge(minutes) {
  if (minutes < 60) return `${Math.max(1, Math.floor(minutes))} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${round(hours, 1)} hr`;
  return `${round(hours / 24, 1)} days`;
}
function refreshUI(force = false) {
  if (!force && uiClock < .12) return;
  uiClock = 0;
  $('#clock').textContent = formatTime(elapsed);
  $('#liveDot').classList.toggle('running', running);
  $('#runStatus').textContent = running ? 'Garden is growing' : elapsed > 0 ? 'Garden paused' : 'Garden at rest';
  $('#playButton').classList.toggle('paused', running);
  $('.play-glyph').textContent = running ? 'Ⅱ' : '▶';
  $('#playLabel').textContent = running ? 'Take a breath' : elapsed > 0 ? 'Keep growing' : 'Let it grow';
  $('#treeCount').textContent = plants.length;
  $('#worldScale').textContent = settings.worldSize;
  const fruit = totalFruit();
  const fruitMax = Math.max(1, plants.length * settings.fruitLimit);
  $('#fruitStat').textContent = Math.round(fruit);
  $('#fruitMeta').textContent = `of ${fruitMax} possible`;
  $('#fruitMeter').style.width = `${clamp(fruit / fruitMax * 100, 0, 100)}%`;
  $('#blueStat').textContent = blue.length;
  $('#redStat').textContent = red.length;
  $('#blueMeta').textContent = blue.length ? `avg. energy ${Math.round(avgEnergy(blue) * 100)}%` : 'no blue blobs left';
  $('#redMeta').textContent = red.length ? `avg. energy ${Math.round(avgEnergy(red) * 100)}%` : 'no red blobs left';
  $('#blueMeter').style.width = `${avgEnergy(blue) * 100}%`;
  $('#redMeter').style.width = `${avgEnergy(red) * 100}%`;
  $('#seasonLabel').textContent = ['Early spring', 'Late spring', 'High summer', 'Soft autumn', 'Winter light'][Math.floor((elapsed / 1440) % 5)];
  $('#summary').textContent = getSummary();
  $('#runLength').textContent = elapsed < 1 ? 'A fresh start' : `${round(elapsed / 60, 1)} simulated hours in`;
  $('#chartFruitNow').textContent = Math.round(fruit);
  $('#chartBlueNow').textContent = blue.length;
  $('#chartRedNow').textContent = red.length;
  const selectedBlob = selected ? [...blue, ...red].find((blob) => blob.id === selected) : null;
  drawInspection(selectedBlob);
}

function drawInspection(creature) {
  if (!creature) {
    $('#inspectionCard').innerHTML = '<div class="inspection-placeholder"><span class="magnify">⌕</span><p>Pick a blue or red bean<br />to meet someone.</p><small>YOUR FRIENDS HAVE THEIR OWN LITTLE STORIES</small></div>';
    return;
  }
  const kind = creature.kind;
  const action = creature.eatTimer > 0 ? 'Munching' : creature.pauseTimer > 0 ? 'Taking a little pause' : creature.stunTimer > 0 ? 'Still a bit startled' : creature.action.replace(/\b\w/g, (letter) => letter.toUpperCase());
  const left = creature.eatTimer > 0 ? creature.eatTimer : creature.pauseTimer > 0 ? creature.pauseTimer : creature.stunTimer > 0 ? creature.stunTimer : 0;
  const family = kind === 'blue' ? 'Blueberry' : 'Raspberry';
  const speed = Math.round((kind === 'blue' ? settings.blueSpeed : settings.redSpeed) * creature.speedTrait);
  const vision = Math.round((kind === 'blue' ? settings.blueVision : settings.redVision) * creature.visionTrait);
  $('#inspectionCard').innerHTML = `<div class="inspected ${kind === 'red' ? 'red' : ''}">
    <div class="inspected-top"><span class="inspected-avatar ${kind === 'red' ? 'red' : ''}"></span><div><h3 class="inspected-name">${creature.name} <span style="font:9px var(--mono);color:#a3ad9d">#${creature.id}</span></h3><div class="inspected-sub">${kind === 'blue' ? 'Blue forager' : 'Red bouncer'} · ${family} family</div></div></div>
    <div class="energy-line"><span>Energy</span><b>${Math.round(creature.energy * 100)}%</b></div><div class="energy-meter"><i style="width:${creature.energy * 100}%"></i></div>
    <div class="inspect-grid"><div><span>AGE</span><b>${describeAge(creature.age)}</b></div><div><span>RIGHT NOW</span><b>${action}</b></div><div><span>WANDER SPEED</span><b>${speed} pace</b></div><div><span>SENSING RANGE</span><b>${vision} steps</b></div><div><span>FAMILY LINE</span><b>${family} · Gen ${creature.generation}</b></div><div><span>PAUSE LEFT</span><b>${left ? `${round(left, 1)} min` : 'Ready to go'}</b></div></div>
    <div class="inspect-action"><i></i>${creature.target ? 'Following a scent' : 'Making up their own mind'}</div>
  </div>`;
}

function niceMax(value) {
  const max = Math.max(1, value);
  const power = 10 ** Math.floor(Math.log10(max));
  const norm = max / power;
  return Math.ceil((norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * power);
}
function svgPath(points) {
  if (!points.length) return '';
  return points.map((point, index) => `${index ? 'L' : 'M'}${point[0].toFixed(2)},${point[1].toFixed(2)}`).join(' ');
}
function drawCharts() {
  const chart = $('#historyChart');
  const width = 900;
  const bands = [
    { key: 'fruit', color: '#9abb5e', fill: '#9abb5e1a', top: 8, bottom: 57, max: niceMax(Math.max(plants.length * settings.fruitLimit, ...history.map((point) => point.fruit))) },
    { key: 'blue', color: '#5b9ecb', fill: '#5b9ecb1a', top: 72, bottom: 121, max: niceMax(Math.max(5, ...history.map((point) => point.blue))) },
    { key: 'red', color: '#db7c70', fill: '#db7c701a', top: 136, bottom: 185, max: niceMax(Math.max(5, ...history.map((point) => point.red))) },
  ];
  const data = history.length ? history : [{ t: 0, fruit: 0, blue: 0, red: 0 }];
  const timeSpan = Math.max(60, data.at(-1).t - data[0].t);
  const leftTime = data.at(-1).t - timeSpan;
  const xFor = (time) => (time - leftTime) / timeSpan * width;
  const grid = [];
  bands.forEach((band) => {
    for (let i = 0; i <= 2; i++) {
      const y = band.top + i * (band.bottom - band.top) / 2;
      grid.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#e9ede2" stroke-width="1" ${i === 1 ? 'stroke-dasharray="2 4"' : ''}/>`);
    }
  });
  for (let i = 0; i <= 6; i++) {
    const x = i * width / 6;
    grid.push(`<line x1="${x}" y1="3" x2="${x}" y2="190" stroke="#eff1e9" stroke-width="1" stroke-dasharray="2 5"/>`);
  }
  const traces = bands.map((band) => {
    const pts = data.map((point) => [xFor(point.t), band.bottom - clamp(point[band.key] / band.max, 0, 1) * (band.bottom - band.top)]);
    const line = svgPath(pts);
    const area = `${line} L${pts.at(-1)[0].toFixed(2)},${band.bottom} L${pts[0][0].toFixed(2)},${band.bottom} Z`;
    const end = pts.at(-1);
    return `<path d="${area}" fill="${band.fill}"/><path d="${line}" fill="none" stroke="${band.color}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>${pts.length === 1 ? `<circle cx="${end[0]}" cy="${end[1]}" r="3" fill="${band.color}"/>` : `<circle cx="${end[0]}" cy="${end[1]}" r="3.1" fill="white" stroke="${band.color}" stroke-width="1.8"/>`}`;
  }).join('');
  chart.innerHTML = `<g>${grid.join('')}</g><g>${traces}</g>`;
  $('#fruitAxis').textContent = `0–${bands[0].max}`;
  $('#blueAxis').textContent = `0–${bands[1].max}`;
  $('#redAxis').textContent = `0–${bands[2].max}`;
  const start = data[0].t;
  const end = data.at(-1).t;
  $('#chartStart').textContent = data.length < 2 ? 'NOW' : `${round((end - start) / 60, 1)} HR AGO`;
  $('#chartMid').textContent = data.length < 2 ? 'TIME PASSES' : `${round((end - (start + end) / 2) / 60, 1)} HR AGO`;
  $('#chartEnd').textContent = data.length < 2 ? 'LIVE' : 'NOW · LIVE';

  const phase = $('#phaseChart');
  const phaseWidth = 300;
  const phaseHeight = 148;
  const pad = { x: 26, y: 12, right: 12, bottom: 22 };
  const innerW = phaseWidth - pad.x - pad.right;
  const innerH = phaseHeight - pad.y - pad.bottom;
  const blueMax = niceMax(Math.max(4, ...data.map((point) => point.blue)));
  const redMax = niceMax(Math.max(4, ...data.map((point) => point.red)));
  const phasePoints = data.map((point) => [pad.x + point.blue / blueMax * innerW, pad.y + innerH - point.red / redMax * innerH]);
  const phaseGrid = [];
  for (let i = 0; i <= 4; i++) {
    const x = pad.x + i * innerW / 4;
    const y = pad.y + i * innerH / 4;
    phaseGrid.push(`<line x1="${x}" y1="${pad.y}" x2="${x}" y2="${pad.y + innerH}" stroke="#e8ece2" stroke-dasharray="2 4"/>`);
    phaseGrid.push(`<line x1="${pad.x}" y1="${y}" x2="${pad.x + innerW}" y2="${y}" stroke="#e8ece2" stroke-dasharray="2 4"/>`);
  }
  const phaseEnd = phasePoints.at(-1);
  phase.innerHTML = `<g>${phaseGrid.join('')}<path d="${svgPath(phasePoints)}" fill="none" stroke="#acae97" stroke-opacity=".8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>${phasePoints.length > 1 ? `<circle cx="${phasePoints[0][0]}" cy="${phasePoints[0][1]}" r="2.5" fill="#a8b992"/>` : ''}<circle cx="${phaseEnd[0]}" cy="${phaseEnd[1]}" r="4" fill="white" stroke="#7e966e" stroke-width="2"/></g><text x="${pad.x + innerW / 2}" y="145" text-anchor="middle" fill="#b0b8ab" font-size="7" font-family="DM Mono">BLUE FORAGERS · 0–${blueMax}</text><text transform="translate(9 ${pad.y + innerH / 2}) rotate(-90)" text-anchor="middle" fill="#b0b8ab" font-size="7" font-family="DM Mono">RED · 0–${redMax}</text>`;
}

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(bounds.width * dpr));
  canvas.height = Math.max(1, Math.round(bounds.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function worldGeometry() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const scale = settings.worldSize / 100;
  const radius = Math.min(width * .41, height * .47) * scale;
  return { width, height, cx: width / 2, cy: height / 2 + 2, radius: Math.min(radius, width * .48, height * .5) };
}
function dishPoint(x, y, geometry, angle = worldAngle) {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const rx = x * cos - y * sin;
  const ry = x * sin + y * cos;
  return { x: geometry.cx + rx * geometry.radius, y: geometry.cy + ry * geometry.radius * .78 };
}
function ellipse(x, y, rx, ry, fill, shadow = null) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  if (shadow) { ctx.shadowColor = shadow.color; ctx.shadowBlur = shadow.blur; ctx.shadowOffsetY = shadow.y || 0; }
  ctx.fillStyle = fill; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
}
function drawDish(g) {
  const r = g.radius;
  ellipse(g.cx, g.cy + r * .12, r * 1.02, r * .81, '#d0d8bd', { color: '#59634b31', blur: 17, y: 10 });
  ellipse(g.cx, g.cy + r * .035, r, r * .79, '#dce3ca');
  const surface = ctx.createRadialGradient(g.cx - r * .2, g.cy - r * .31, r * .05, g.cx, g.cy, r * .99);
  surface.addColorStop(0, '#f1f3dd'); surface.addColorStop(.67, '#e8edd5'); surface.addColorStop(1, '#dce4c5');
  ellipse(g.cx, g.cy, r * .98, r * .77, surface);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(g.cx, g.cy, r * .94, r * .735, 0, 0, TAU); ctx.clip();
  // A faint curled footpath and tiny wildflowers add scale without crowding the little residents.
  ctx.strokeStyle = '#cdd7b4a3'; ctx.lineWidth = Math.max(2, r * .027); ctx.setLineDash([r * .045, r * .038]);
  ctx.beginPath(); ctx.ellipse(g.cx + r * .04, g.cy + r * .04, r * .6, r * .45, -.55, .12, Math.PI * 1.78); ctx.stroke(); ctx.setLineDash([]);
  for (let i = 0; i < 23; i++) {
    const a = i * 2.399;
    const rr = r * (.27 + ((i * 19) % 63) / 100);
    const x = g.cx + Math.cos(a) * rr;
    const y = g.cy + Math.sin(a) * rr * .72;
    ellipse(x, y, 1.2, 1.2, i % 3 === 0 ? '#a8bd7d80' : '#faf9e88a');
  }
  ctx.restore();
  ctx.strokeStyle = '#bdcaa5'; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.ellipse(g.cx, g.cy, r * .99, r * .785, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = '#ffffff5e'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(g.cx, g.cy - r * .013, r * .957, r * .75, 0, Math.PI * 1.04, Math.PI * 1.91); ctx.stroke();
}
function drawTree(plant, g) {
  const p = dishPoint(plant.x, plant.y, g);
  const s = g.radius * .1 * plant.size;
  const fruitVisible = plant.fruit;
  ctx.save();
  // Cast shadow and tiny trunk sit behind the rounded canopy.
  ellipse(p.x + 1, p.y + s * .25, s * .62, s * .22, '#75865a33');
  ctx.fillStyle = '#977251';
  ctx.beginPath(); ctx.moveTo(p.x - s * .1, p.y + s * .13); ctx.lineTo(p.x - s * .065, p.y - s * .5); ctx.lineTo(p.x + s * .09, p.y - s * .5); ctx.lineTo(p.x + s * .13, p.y + s * .18); ctx.closePath(); ctx.fill();
  const hue = Math.round(plant.hue * 12);
  const green = ['#78a967', '#82af70', '#7ea76c', '#8eb473'][hue % 4];
  const crown = ctx.createRadialGradient(p.x - s * .23, p.y - s * .8, s * .03, p.x, p.y - s * .45, s * .75);
  crown.addColorStop(0, '#b6d28b'); crown.addColorStop(.57, green); crown.addColorStop(1, '#5d8a59');
  ellipse(p.x, p.y - s * .48, s * .68, s * .56, crown, { color: '#52684122', blur: 5, y: 2 });
  ellipse(p.x - s * .24, p.y - s * .39, s * .32, s * .3, '#c2d99b55');
  const fruitSlots = [[-.47,-.58],[-.04,-.83],[.42,-.59],[-.4,-.3],[.1,-.41],[.49,-.25],[-.14,-.1],[.3,-.93],[-.62,-.45],[.18,-.63]];
  for (let i = 0; i < Math.min(settings.fruitLimit, fruitSlots.length); i++) {
    const [fx, fy] = fruitSlots[i];
    const amount = clamp(fruitVisible - i, 0, 1);
    if (amount <= 0) continue;
    const size = s * (.12 + .075 * amount);
    const x = p.x + fx * s;
    const y = p.y + fy * s;
    ctx.globalAlpha = .55 + amount * .45;
    ellipse(x, y, size, size * .94, i % 2 ? '#b7d965' : '#a5ce50', { color: '#e9f89c7c', blur: 4 });
    ellipse(x - size * .22, y - size * .25, size * .24, size * .24, '#eff9bc');
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#658e4f'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x + size * .2, y - size * 1.45); ctx.stroke();
  }
  if (plant.cooldown > 0 && plant.fruit < settings.fruitLimit - .1) {
    ctx.globalAlpha = .44 + Math.sin(animationTime * 2 + plant.id) * .12;
    ctx.fillStyle = '#f4dd88'; ctx.font = `${Math.max(8, s * .4)}px serif`; ctx.fillText('✦', p.x + s * .49, p.y - s * 1.1);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function drawBlob(creature, g) {
  const p = dishPoint(creature.x, creature.y, g);
  const velocity = Math.hypot(creature.vx, creature.vy);
  const dir = creature.vx >= 0 ? 1 : -1;
  const bob = Math.sin(animationTime * 5 + creature.bob) * (creature.eatTimer > 0 ? 1.5 : 2.6);
  const scale = g.radius / 205;
  const rx = 11.2 * scale;
  const ry = 14.2 * scale * (1 + Math.sin(animationTime * 8 + creature.bob) * Math.min(.07, velocity * 4));
  const blueBlob = creature.kind === 'blue';
  const base = blueBlob ? '#62a9d9' : '#e78377';
  const dark = blueBlob ? '#367fab' : '#be5d57';
  const body = ctx.createRadialGradient(p.x - rx * .4, p.y + bob - ry * .55, rx * .12, p.x, p.y + bob, ry * 1.3);
  body.addColorStop(0, blueBlob ? '#b6e2f3' : '#ffd0ae');
  body.addColorStop(.36, base);
  body.addColorStop(1, dark);
  if (creature.glow > 0) {
    ctx.globalAlpha = creature.glow * .58;
    ellipse(p.x, p.y + bob, rx * 1.85, ry * 1.65, blueBlob ? '#c8ecff' : '#ffd4b4');
    ctx.globalAlpha = 1;
  }
  ellipse(p.x + 1, p.y + ry * .65, rx * 1.03, ry * .33, '#4a5c4134');
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.scale(dir, 1);
  ctx.beginPath();
  ctx.moveTo(-rx * .93, ry * .13);
  ctx.bezierCurveTo(-rx * 1.1, -ry * .7, -rx * .52, -ry * 1.04, -rx * .1, -ry * .91);
  ctx.bezierCurveTo(rx * .58, -ry * 1.08, rx * 1.01, -ry * .54, rx * .91, ry * .1);
  ctx.bezierCurveTo(rx * .85, ry * .65, rx * .42, ry * .97, 0, ry * .94);
  ctx.bezierCurveTo(-rx * .57, ry * .9, -rx * 1.03, ry * .65, -rx * .93, ry * .13);
  ctx.closePath(); ctx.fillStyle = body;
  ctx.shadowColor = '#49634a27'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ellipse(-rx * .35, -ry * .48, rx * .31, ry * .16, '#ffffff63');
  const blinkClock = (animationTime * .67 + creature.id * .731) % 4.8;
  const blinking = blinkClock > 4.68;
  const eyeY = -ry * .06;
  if (blinking) {
    ctx.strokeStyle = '#31423b'; ctx.lineWidth = Math.max(1, scale * 1.25);
    ctx.beginPath(); ctx.moveTo(-rx * .42, eyeY); ctx.lineTo(-rx * .15, eyeY + 1); ctx.moveTo(rx * .25, eyeY); ctx.lineTo(rx * .51, eyeY - 1); ctx.stroke();
  } else {
    ellipse(-rx * .28, eyeY, rx * .09, ry * .105, '#30413e');
    ellipse(rx * .37, eyeY - 1, rx * .09, ry * .105, '#30413e');
    ellipse(-rx * .30, eyeY - ry * .035, rx * .025, ry * .028, '#fff');
    ellipse(rx * .35, eyeY - ry * .035, rx * .025, ry * .028, '#fff');
  }
  ellipse(-rx * .63, ry * .13, rx * .16, ry * .1, blueBlob ? '#eaa3a16f' : '#ffca9a72');
  ellipse(rx * .64, ry * .13, rx * .14, ry * .09, blueBlob ? '#eaa3a16f' : '#ffca9a72');
  ctx.strokeStyle = '#4b5147'; ctx.lineWidth = Math.max(1, scale * 1.2); ctx.lineCap = 'round';
  ctx.beginPath();
  if (creature.eatTimer > 0 || creature.animation > .55) ctx.ellipse(rx * .08, ry * .25, rx * .105, ry * .11, 0, 0, TAU);
  else { ctx.moveTo(-rx * .07, ry * .22); ctx.quadraticCurveTo(rx * .12, ry * .37, rx * .3, ry * .2); }
  ctx.stroke();
  ctx.restore();
  if (selected === creature.id) {
    ctx.strokeStyle = blueBlob ? '#4d94bd92' : '#da786d92'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + ry * 1.1, rx * 1.28, ry * .34, 0, 0, TAU); ctx.stroke();
  }
}
function drawScene() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);
  const geometry = worldGeometry();
  drawDish(geometry);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(geometry.cx, geometry.cy, geometry.radius * .94, geometry.radius * .735, 0, 0, TAU); ctx.clip();
  const layers = [...plants.map((item) => ({ type: 'plant', item })), ...blue.map((item) => ({ type: 'blob', item })), ...red.map((item) => ({ type: 'blob', item }))];
  layers.sort((a, b) => a.item.y - b.item.y);
  for (const layer of layers) layer.type === 'plant' ? drawTree(layer.item, geometry) : drawBlob(layer.item, geometry);
  ctx.restore();
}
function animationLoop(now) {
  const realMinutes = Math.min(.12, Math.max(0, (now - lastFrame) / 1000)) * 60 * settings.simSpeed;
  lastFrame = now;
  animationTime += (now / 1000 - animationTime) * .05;
  if (running) {
    let remaining = realMinutes;
    while (remaining > 0) { const piece = Math.min(.35, remaining); advance(piece); remaining -= piece; }
  }
  uiClock += Math.min(.12, (now - (animationLoop.lastUI || now)) / 1000);
  animationLoop.lastUI = now;
  refreshUI();
  drawScene();
  requestAnimationFrame(animationLoop);
}
function getPointerAngle(event) {
  const rect = canvas.getBoundingClientRect();
  return Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2);
}
function setSelectedByPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const geometry = worldGeometry();
  let best = null;
  let bestDistance = 23;
  for (const creature of [...blue, ...red]) {
    const p = dishPoint(creature.x, creature.y, geometry);
    const distance = Math.hypot(p.x - x, p.y - y);
    if (distance < bestDistance) { best = creature; bestDistance = distance; }
  }
  selected = best?.id || null;
  refreshUI(true);
}
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 2100);
}
function randomize() {
  const seed = Math.floor(Math.random() * 9999) + 1;
  settings = { ...settings, seed, fruitGrowth: round(.5 + Math.random() * 1.9, 1), fruitLimit: 3 + Math.floor(Math.random() * 6), trees: 5 + Math.floor(Math.random() * 17), blueStart: 4 + Math.floor(Math.random() * 13), redStart: 2 + Math.floor(Math.random() * 11) };
  activePreset = '';
  syncControls();
  newRun('random');
}

addControlMarkup();
syncControls();
document.querySelectorAll('.range-input').forEach((input) => input.addEventListener('input', () => {
  const key = input.dataset.key;
  settings[key] = Number(input.value);
  updateControl(key);
  activePreset = '';
  updatePresetButtons();
  if (key === 'simSpeed') {
    document.querySelectorAll('[data-speed]').forEach((button) => button.classList.toggle('selected', Number(button.dataset.speed) === settings.simSpeed));
  }
  if (key === 'worldSize') { refreshUI(true); drawScene(); }
}));
document.querySelectorAll('.preset').forEach((button) => button.addEventListener('click', () => {
  settings = { ...PRESETS[button.dataset.preset] };
  activePreset = button.dataset.preset;
  syncControls();
  document.querySelectorAll('[data-speed]').forEach((speed) => speed.classList.toggle('selected', Number(speed.dataset.speed) === settings.simSpeed));
  newRun('preset');
}));
document.querySelectorAll('[data-speed]').forEach((button) => button.addEventListener('click', () => {
  settings.simSpeed = Number(button.dataset.speed);
  updateControl('simSpeed');
  document.querySelectorAll('[data-speed]').forEach((speed) => speed.classList.toggle('selected', speed === button));
}));
$('#playButton').addEventListener('click', () => { running = !running; refreshUI(true); });
$('#stepButton').addEventListener('click', () => { const wasRunning = running; running = false; stepOnce(); if (wasRunning) showToast('Paused for one garden hour.'); });
$('#resetIcon').addEventListener('click', () => newRun());
$('#randomizeButton').addEventListener('click', randomize);
$('#clearHistoryButton').addEventListener('click', () => newRun('reset'));
$('#closeInspector').addEventListener('click', () => { selected = null; refreshUI(true); });
canvas.addEventListener('pointerdown', (event) => { dragging = true; dragMoved = false; lastPointerAngle = getPointerAngle(event); canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  const angle = getPointerAngle(event);
  let delta = angle - lastPointerAngle;
  if (delta > Math.PI) delta -= TAU;
  if (delta < -Math.PI) delta += TAU;
  if (Math.abs(delta) > .01) dragMoved = true;
  worldAngle += delta;
  lastPointerAngle = angle;
});
canvas.addEventListener('pointerup', (event) => {
  if (dragging && !dragMoved) setSelectedByPoint(event);
  dragging = false;
});
canvas.addEventListener('pointercancel', () => { dragging = false; });
window.addEventListener('resize', resizeCanvas);
new ResizeObserver(resizeCanvas).observe(canvas);
resizeCanvas();
newRun('start');
requestAnimationFrame(animationLoop);
