const defaults = {
  fruitGrowth: .35, fruitLimit: 6, fruitDelay: 8, trees: 6,
  blueDrain: .36, blueSpeed: 1.1, blueVision: 7, blueCopy: 72, blueEat: 2, blueStart: 11,
  redDrain: .38, redSpeed: 1.15, redVision: 8, redStrength: 16, redCopy: 76, redPause: 2.5, redStart: 5,
  worldSize: 14, seed: 216, speed: 1.5
};

const presets = {
  balanced: { note: 'A little room for everyone to find their place.', values: {} },
  'fruit-rich': { note: 'Long summers, full branches, and plenty of curious nibblers.', values: { fruitGrowth: .75, fruitLimit: 9, fruitDelay: 4, trees: 8, blueStart: 12, redStart: 4, blueDrain: .29, redDrain: .4, seed: 184 } },
  'red-heavy': { note: 'A crowd of bold visitors arrives. The little blue gatherers feel it first.', values: { fruitGrowth: .12, fruitLimit: 3, fruitDelay: 22, trees: 4, blueStart: 6, redStart: 16, blueDrain: .48, blueSpeed: 1, blueVision: 5, blueCopy: 80, redDrain: .34, redSpeed: 1.7, redVision: 14, redStrength: 28, redCopy: 80, redPause: .75, seed: 487 } },
  fragile: { note: 'A delicate little balance. Watch closely when the fruit runs thin.', values: { fruitGrowth: .22, fruitLimit: 4, fruitDelay: 15, trees: 5, blueStart: 9, redStart: 8, blueDrain: .45, redDrain: .42, redStrength: 20, seed: 73 } },
  'low-fruit': { note: 'A quiet garden with just a few good things to share.', values: { fruitGrowth: .18, fruitLimit: 4, fruitDelay: 15, trees: 5, blueStart: 6, redStart: 2, blueDrain: .3, blueCopy: 90, redStrength: 10, redCopy: 90, seed: 631 } }
};

const outputs = Object.fromEntries([...document.querySelectorAll('[data-output]')].map(el => [el.dataset.output, el]));
const inputs = Object.fromEntries([...document.querySelectorAll('.range-field input')].map(el => [el.id, el]));
const canvas = document.querySelector('#world');
const ctx = canvas.getContext('2d');
const chart = document.querySelector('#history-chart');
const cctx = chart.getContext('2d');
const inspectCard = document.querySelector('#inspect-card');
const inspectHint = document.querySelector('#inspect-hint');
const stateLabel = document.querySelector('#state-label');
const stateDot = document.querySelector('#state-dot');

let config = { ...defaults };
let world;
let isRunning = true;
let cameraAngle = -.34;
let selectedId = null;
let lastFrame = performance.now();
let accumulator = 0;
let audioContext;
let ambience = false;
let ambientNodes = [];
let worldSize = { width: 0, height: 0, ratio: 1, radius: 0, scale: 0, centerX: 0, centerY: 0 };
let lastHudPaint = 0;
let lastChartPaint = 0;

const names = ['Pip', 'Moss', 'Nori', 'Bean', 'Clover', 'Miso', 'Fig', 'Tumble', 'Bramble', 'Pebble', 'Pollen', 'Mochi', 'Dew', 'Fern', 'Sprout', 'Button', 'Doodle', 'Waffle', 'Basil', 'Puddle'];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function makeRng(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function formatValue(key, value) {
  if (key === 'fruitGrowth') return `${Number(value).toFixed(2)} /s`;
  if (key === 'fruitDelay' || key === 'blueEat' || key === 'redPause') return `${Number(value).toFixed(key === 'redPause' ? 2 : 1)} s`;
  if (key.endsWith('Drain')) return `${Number(value).toFixed(2)} /s`;
  if (key.endsWith('Speed')) return `${Number(value).toFixed(1)} m/s`;
  if (key.endsWith('Vision')) return `${Number(value).toFixed(1)} m`;
  if (key.endsWith('Copy')) return `${Math.round(value)}%`;
  if (key === 'redStrength') return `${Math.round(value)} energy`;
  if (key === 'worldSize') return `${Math.round(value)} m`;
  if (key === 'speed') return `${Number(value).toFixed(1)}×`;
  return `${Math.round(value)}`;
}

function syncInputs() {
  for (const [key, input] of Object.entries(inputs)) {
    input.value = config[key];
    outputs[key].value = formatValue(key, config[key]);
    outputs[key].textContent = formatValue(key, config[key]);
  }
  document.querySelector('#speed-range').value = config.speed;
  document.querySelector('#speed-value').textContent = formatValue('speed', config.speed);
  document.querySelector('#world-size-label').textContent = `${config.worldSize} m across`;
}

function randomPoint(rng, radius, minRadius = 0) {
  const angle = rng() * Math.PI * 2;
  const distance = Math.sqrt(rng()) * (radius - minRadius) + minRadius;
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
}

function createTree(index, total, rng) {
  const angle = (index / total) * Math.PI * 2 + .16;
  const radius = config.worldSize * (.48 + rng() * .11);
  return {
    id: `tree-${index}`, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
    fruit: Math.max(1, Math.round(config.fruitLimit * (.58 + rng() * .36))),
    cap: config.fruitLimit, buds: [], progress: 0, phase: rng() * 9,
    shade: Math.floor(rng() * 3)
  };
}

function createBlob(group, rng, point = null, parent = null) {
  const idNumber = world.nextId++;
  const spot = point || randomPoint(rng, config.worldSize * .64, config.worldSize * .12);
  const family = parent ? parent.family : idNumber;
  const generation = parent ? parent.generation + 1 : 1;
  const inheritedPace = parent ? parent.pace * (.94 + rng() * .12) : .84 + rng() * .32;
  return {
    id: `${group}-${idNumber}`, idNumber, group, x: spot.x, y: spot.y,
    energy: parent ? 36 + rng() * 5 : 52 + rng() * 32,
    age: 0, heading: rng() * Math.PI * 2, pace: clamp(inheritedPace, .62, 1.38),
    action: 'wandering', actionTimer: .5 + rng(), busy: 0, cooldown: 2 + rng() * 5,
    eatLeft: 0, pauseLeft: 0, contactLeft: 0, family, generation,
    name: names[idNumber % names.length], phase: rng() * Math.PI * 2,
    size: .83 + rng() * .3, blink: .15 + rng() * 5, flash: 0,
    targetId: null, death: 0, lastAction: 'Wandering'
  };
}

function resetWorld() {
  config = Object.fromEntries(Object.entries(config).map(([k, v]) => [k, Number(v)]));
  const rng = makeRng(config.seed);
  world = { rng, time: 0, nextId: 1, trees: [], blue: [], red: [], history: [], events: [], totals: { births: 0, deaths: 0, eats: 0, meetings: 0 }, sampleClock: 0, eventClock: 0 };
  for (let i = 0; i < config.trees; i++) world.trees.push(createTree(i, config.trees, rng));
  for (let i = 0; i < config.blueStart; i++) world.blue.push(createBlob('blue', rng));
  for (let i = 0; i < config.redStart; i++) world.red.push(createBlob('red', rng));
  selectedId = null;
  hideInspect();
  world.history.push(snapshot());
  syncInputs();
  updateReadouts();
  draw();
  drawChart();
}

function snapshot() {
  return { t: world.time, fruit: world.trees.reduce((n, tree) => n + tree.fruit, 0), blue: world.blue.length, red: world.red.length };
}

function recordEvent(kind) {
  world.events.push({ kind, t: world.time });
  if (world.events.length > 240) world.events.shift();
  if (kind === 'birth') world.totals.births++;
  if (kind === 'death') world.totals.deaths++;
  if (kind === 'eat') world.totals.eats++;
  if (kind === 'meeting') world.totals.meetings++;
}

function nearest(from, collection, maxDistance, predicate = () => true) {
  let found = null;
  let distance = maxDistance;
  for (const item of collection) {
    if (!predicate(item)) continue;
    const d = dist(from, item);
    if (d < distance) { found = item; distance = d; }
  }
  return found ? { item: found, distance } : null;
}

function steer(blob, tx, ty, speed, dt) {
  const dx = tx - blob.x;
  const dy = ty - blob.y;
  const d = Math.hypot(dx, dy);
  if (d < .001) return 0;
  let aim = Math.atan2(dy, dx);
  let delta = Math.atan2(Math.sin(aim - blob.heading), Math.cos(aim - blob.heading));
  blob.heading += clamp(delta, -dt * 4.2, dt * 4.2);
  const amount = Math.min(d, speed * blob.pace * dt);
  blob.x += Math.cos(blob.heading) * amount;
  blob.y += Math.sin(blob.heading) * amount;
  return amount;
}

function wander(blob, dt) {
  blob.heading += (world.rng() - .5) * dt * .7;
  const amount = config[`${blob.group}Speed`] * blob.pace * dt * .52;
  blob.x += Math.cos(blob.heading) * amount;
  blob.y += Math.sin(blob.heading) * amount;
  return amount;
}

function keepInside(blob, radius = config.worldSize * .84) {
  const d = Math.hypot(blob.x, blob.y);
  if (d > radius) {
    const a = Math.atan2(-blob.y, -blob.x);
    blob.heading = a;
    blob.x *= radius / d;
    blob.y *= radius / d;
  }
}

function groupAvoidance(blob, companions, radius) {
  let ax = 0, ay = 0;
  for (const friend of companions) {
    if (friend === blob) continue;
    const dx = blob.x - friend.x;
    const dy = blob.y - friend.y;
    const d = Math.hypot(dx, dy);
    if (d > 0 && d < radius) { ax += dx / d * (radius - d); ay += dy / d * (radius - d); }
  }
  return { x: ax, y: ay };
}

function chooseBlueAction(blob, dt) {
  if (blob.eatLeft > 0) {
    blob.eatLeft = Math.max(0, blob.eatLeft - dt);
    blob.action = 'chewing a little fruit';
    blob.lastAction = 'Having a snack';
    return;
  }
  if (blob.pauseLeft > 0) {
    blob.pauseLeft = Math.max(0, blob.pauseLeft - dt);
    blob.action = 'taking a breath';
    blob.lastAction = 'Taking a breath';
    return;
  }

  const rng = world.rng;
  const threat = nearest(blob, world.red, config.blueVision * .78);
  const fruit = nearest(blob, world.trees, config.blueVision, tree => tree.fruit > 0);
  const friends = nearest(blob, world.blue, config.blueVision * .75, friend => friend !== blob);
  if (fruit) {
    const dx = fruit.item.x - blob.x;
    const dy = fruit.item.y - blob.y;
    const length = Math.hypot(dx, dy) || 1;
    let avoidance = { x: 0, y: 0 };
    if (threat && threat.distance < config.blueVision * .72) {
      if (threat.distance > .001) avoidance = { x: (blob.x - threat.item.x) / threat.distance, y: (blob.y - threat.item.y) / threat.distance };
      else avoidance = { x: Math.cos(blob.heading + Math.PI), y: Math.sin(blob.heading + Math.PI) };
    }
    const crowd = groupAvoidance(blob, world.blue, 2.2);
    const tx = fruit.item.x + avoidance.x * 2.3 + crowd.x * .9;
    const ty = fruit.item.y + avoidance.y * 2.3 + crowd.y * .9;
    const moved = steer(blob, tx, ty, config.blueSpeed, dt);
    blob.action = threat && threat.distance < config.blueVision * .65 ? 'looking for a safer snack' : 'looking for fruit';
    blob.lastAction = threat && threat.distance < config.blueVision * .65 ? 'Keeping a little distance' : 'Looking for fruit';
    if (fruit.distance < .86 && fruit.item.fruit > 0 && !threat) {
      fruit.item.fruit--;
      fruit.item.buds.push({ delay: config.fruitDelay, progress: 0 });
      blob.energy = Math.min(100, blob.energy + 27);
      blob.eatLeft = config.blueEat;
      blob.pauseLeft = config.blueEat * .36;
      blob.action = 'chewing a little fruit';
      blob.lastAction = 'Having a snack';
      blob.flash = .8;
      blob.targetId = fruit.item.id;
      recordEvent('eat');
    } else if (moved < .03 && rng() < dt * .8) blob.heading += (rng() - .5) * 1.2;
  } else if (friends && friends.distance < config.blueVision * .65) {
    const dx = friends.item.x - blob.x + (rng() - .5) * 2;
    const dy = friends.item.y - blob.y + (rng() - .5) * 2;
    const crowd = groupAvoidance(blob, world.blue, 2.3);
    steer(blob, blob.x + dx * .45 + crowd.x, blob.y + dy * .45 + crowd.y, config.blueSpeed * .75, dt);
    blob.action = 'gathering near friends'; blob.lastAction = 'Gathering with friends';
  } else {
    wander(blob, dt);
    blob.action = 'wandering between trees'; blob.lastAction = 'Wandering';
  }
}

function chooseRedAction(blob, dt) {
  if (blob.pauseLeft > 0) {
    blob.pauseLeft = Math.max(0, blob.pauseLeft - dt);
    blob.action = 'resting after a hello'; blob.lastAction = 'Resting after a hello';
    return;
  }
  const target = nearest(blob, world.blue, config.redVision);
  if (target) {
    const moved = steer(blob, target.item.x, target.item.y, config.redSpeed, dt);
    blob.action = 'looking for a blue friend'; blob.lastAction = 'Looking for blue blobs';
    if (target.distance < .56 && target.item.contactLeft <= 0) {
      const exchanged = Math.min(config.redStrength, Math.max(0, target.item.energy - 6));
      blob.energy = Math.min(100, blob.energy + exchanged);
      target.item.energy = Math.max(0, target.item.energy - exchanged);
      target.item.contactLeft = 3.4;
      target.item.pauseLeft = Math.max(target.item.pauseLeft, .7);
      target.item.flash = .55;
      target.item.action = 'startled by a hello';
      target.item.lastAction = 'Had a little surprise';
      blob.pauseLeft = config.redPause;
      blob.flash = .75;
      blob.action = 'pausing after a hello';
      blob.lastAction = 'Pausing after a hello';
      blob.targetId = target.item.id;
      recordEvent('meeting');
    } else if (moved < .025 && target.distance > .8 && world.rng() < dt * .8) blob.heading += (world.rng() - .5) * .9;
  } else {
    wander(blob, dt);
    blob.action = 'wandering, ears perked'; blob.lastAction = 'Wandering for blue blobs';
  }
}

function makeBaby(parent) {
  const list = parent.group === 'blue' ? world.blue : world.red;
  const carryingCapacity = parent.group === 'blue'
    ? Math.max(config.blueStart, Math.min(40, Math.round(config.trees * config.fruitLimit * (.42 + config.fruitGrowth * .35))))
    : Math.max(config.redStart, Math.min(30, Math.floor(2 + world.blue.length * (.55 + config.redStrength * .005))));
  if (list.length >= carryingCapacity) return;
  const away = parent.heading + Math.PI + (world.rng() - .5) * 1.4;
  const child = createBlob(parent.group, world.rng, { x: parent.x + Math.cos(away) * 1.1, y: parent.y + Math.sin(away) * 1.1 }, parent);
  child.energy = 34;
  child.cooldown = 9 + world.rng() * 6;
  parent.energy -= 45;
  parent.cooldown = 11 + world.rng() * 8;
  parent.pauseLeft = Math.max(parent.pauseLeft, 1.2);
  list.push(child);
  recordEvent('birth');
}

function updateBlob(blob, dt) {
  if (blob.death > 0) return;
  const friends = blob.group === 'blue' ? world.blue : world.red;
  blob.age += dt;
  blob.blink -= dt;
  blob.flash = Math.max(0, blob.flash - dt);
  blob.contactLeft = Math.max(0, blob.contactLeft - dt);
  blob.cooldown = Math.max(0, blob.cooldown - dt);
  const oldX = blob.x, oldY = blob.y;
  if (blob.group === 'blue') chooseBlueAction(blob, dt);
  else chooseRedAction(blob, dt);
  const moved = Math.hypot(blob.x - oldX, blob.y - oldY);
  const drain = config[`${blob.group}Drain`] * dt * (.23 + Math.min(1.8, moved / Math.max(.001, dt)) * .47);
  blob.energy -= drain;
  const threshold = config[`${blob.group}Copy`];
  if (blob.energy >= threshold && blob.cooldown <= 0 && blob.pauseLeft <= 0) makeBaby(blob);
  keepInside(blob);
  if (blob.energy <= 0) { blob.death = .8; blob.action = 'getting sleepy'; blob.lastAction = 'Getting sleepy'; }
}

function update(dt) {
  world.time += dt;
  for (const tree of world.trees) {
    const growing = [];
    for (const bud of tree.buds) {
      if (bud.delay > 0) bud.delay = Math.max(0, bud.delay - dt);
      else bud.progress += config.fruitGrowth * dt;
      if (bud.progress >= 1) tree.fruit = Math.min(tree.cap, tree.fruit + 1);
      else growing.push(bud);
    }
    tree.buds = growing;
    tree.progress = growing.length ? Math.max(...growing.map(bud => bud.progress)) : 0;
  }
  for (const blob of [...world.blue, ...world.red]) updateBlob(blob, dt);
  for (const group of [world.blue, world.red]) {
    for (let i = group.length - 1; i >= 0; i--) {
      const blob = group[i];
      if (blob.energy <= 0) {
        blob.death -= dt;
        if (blob.death <= 0) { group.splice(i, 1); recordEvent('death'); if (selectedId === blob.id) hideInspect(); }
      }
    }
  }
  world.sampleClock += dt;
  if (world.sampleClock >= 2) {
    world.sampleClock %= 2;
    world.history.push(snapshot());
    if (world.history.length > 1200) world.history.shift();
  }
}

function day() { return world.time / 20; }
function trendClass(previous, current) { return current < previous ? 'trend down' : 'trend'; }

function updateReadouts() {
  const now = snapshot();
  const prior = world.history[Math.max(0, world.history.length - 7)] || now;
  document.querySelector('#fruit-count').textContent = now.fruit;
  document.querySelector('#blue-count').textContent = now.blue;
  document.querySelector('#red-count').textContent = now.red;
  document.querySelector('#fruit-foot').textContent = `${world.trees.length} little trees`;
  document.querySelector('#blue-foot').textContent = world.blue.length ? `${Math.round(world.blue.reduce((n, b) => n + b.energy, 0) / world.blue.length)}% average energy` : 'A quiet patch';
  document.querySelector('#red-foot').textContent = world.red.length ? `${Math.round(world.red.reduce((n, b) => n + b.energy, 0) / world.red.length)}% average energy` : 'A quiet patch';
  for (const [key, cur, old] of [['fruit-trend', now.fruit, prior.fruit], ['blue-trend', now.blue, prior.blue], ['red-trend', now.red, prior.red]]) {
    const el = document.getElementById(key); el.textContent = cur > old ? '↗' : cur < old ? '↘' : '→'; el.className = trendClass(old, cur);
  }
  document.querySelector('#day-count').textContent = String(Math.floor(day())).padStart(2, '0');
  const weather = world.red.length > world.blue.length * 1.25 ? 'A bold afternoon' : now.fruit > world.trees.length * 3 ? 'A gentle morning' : now.fruit < world.trees.length ? 'A quiet, hungry hour' : 'The garden is stirring';
  document.querySelector('#weather-label').textContent = weather;
  document.querySelector('#event-count').textContent = `${world.totals.births} births · ${world.totals.deaths} fades`;
  document.querySelector('#chart-end').textContent = `DAY ${Math.floor(day())}`;
  const last = world.history[world.history.length - 1];
  const peakBlue = Math.max(0, ...world.history.map(p => p.blue));
  const peakRed = Math.max(0, ...world.history.map(p => p.red));
  let message = 'The first little lives are finding their rhythm.';
  if (day() > 3) {
    if (now.fruit <= world.trees.length * .8 && now.blue <= 6 && now.red <= 3) message = 'Low fruit kept the whole garden small.';
    else if (now.blue === 0 && now.red === 0) message = 'The little world has settled into a quiet, empty season.';
    else if (now.blue === 0 && now.red > 0) message = 'Blue blobs faded first. Red visitors are running low without their company.';
    else if (now.red === 0 && now.blue > 0) message = 'The red visitors have wandered off. Blue blobs are tending the orchard alone.';
    else if (peakBlue > 0 && peakRed > 0 && peakBlue > world.history[0].blue * 1.4 && peakRed > world.history[0].red * 1.2) message = 'Blue blobs found fruit first. Red visitors followed a little later.';
    else if (peakRed > now.red * 1.45 && now.blue < peakBlue * .72) message = 'A red-heavy spell thinned the blue crowd. The visitors may be next to feel it.';
    else if (peakBlue < 12 && peakRed < 8) message = 'The small crowd is sharing what the orchard can grow.';
    else message = 'The garden is finding a rhythm, one snack and hello at a time.';
  }
  document.querySelector('#summary-text').textContent = message;
  if (selectedId) updateInspect();
}

function resizeCanvas(target, context) {
  const box = target.getBoundingClientRect();
  if (!box.width || !box.height) return false;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (target.width !== Math.round(box.width * ratio) || target.height !== Math.round(box.height * ratio)) {
    target.width = Math.round(box.width * ratio);
    target.height = Math.round(box.height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return true;
}

function mapCoords(x, y) {
  const rx = x * Math.cos(cameraAngle) - y * Math.sin(cameraAngle);
  const ry = x * Math.sin(cameraAngle) + y * Math.cos(cameraAngle);
  return { x: worldSize.centerX + rx * worldSize.scale, y: worldSize.centerY - ry * worldSize.scale * .72 };
}

function drawDish() {
  const { centerX: cx, centerY: cy, radius: r } = worldSize;
  const rx = r * .96, ry = r * .76;
  ctx.save();
  ctx.fillStyle = '#cbd2c2';
  ctx.beginPath(); ctx.ellipse(cx, cy + r * .11, rx * 1.035, ry * 1.06, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#73866d';
  ctx.beginPath(); ctx.ellipse(cx, cy + r * .055, rx * 1.018, ry * 1.045, 0, 0, Math.PI * 2); ctx.fill();
  const rim = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  rim.addColorStop(0, '#adbd9f'); rim.addColorStop(.45, '#849a79'); rim.addColorStop(1, '#738b6d');
  ctx.fillStyle = rim;
  ctx.beginPath(); ctx.ellipse(cx, cy, rx * 1.015, ry * 1.025, 0, 0, Math.PI * 2); ctx.fill();
  const soil = ctx.createRadialGradient(cx - r * .15, cy - r * .19, r * .08, cx, cy, r);
  soil.addColorStop(0, '#e1e5d1'); soil.addColorStop(.7, '#d2dbc1'); soil.addColorStop(1, '#c4d0b7');
  ctx.fillStyle = soil; ctx.beginPath(); ctx.ellipse(cx, cy, rx * .968, ry * .966, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy, rx * .965, ry * .96, 0, 0, Math.PI * 2); ctx.clip();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8 + .25;
    const p1 = mapCoords(Math.cos(a) * config.worldSize * .3, Math.sin(a) * config.worldSize * .3);
    const p2 = mapCoords(Math.cos(a + .18) * config.worldSize * .66, Math.sin(a + .18) * config.worldSize * .66);
    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.quadraticCurveTo((p1.x + p2.x) / 2 + 8, (p1.y + p2.y) / 2, p2.x, p2.y);
    ctx.strokeStyle = '#f4f3e6'; ctx.globalAlpha = .35; ctx.lineWidth = 1.2; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 29; i++) {
    const angle = i * 2.399;
    const radius = config.worldSize * (.16 + ((i * 7) % 19) / 34);
    const p = mapCoords(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.fillStyle = i % 3 ? '#94aa7e' : '#e6d7a1'; ctx.globalAlpha = .48;
    ctx.beginPath(); ctx.arc(p.x, p.y, i % 3 ? 1.2 : 1.8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1; ctx.restore();
  ctx.strokeStyle = '#eff1e3'; ctx.globalAlpha = .65; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.ellipse(cx, cy - 1, rx * .984, ry * .984, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  ctx.restore();
}

function drawTree(tree) {
  const p = mapCoords(tree.x, tree.y);
  const s = worldSize.scale * 1.65;
  const sway = Math.sin(world.time * .7 + tree.phase) * 1.6;
  const height = s * .9;
  const greens = [['#8eae72', '#63895b'], ['#9cb77b', '#729361'], ['#86a96f', '#5d8056']][tree.shade];
  ctx.save();
  ctx.globalAlpha = .18; ctx.fillStyle = '#354735'; ctx.beginPath(); ctx.ellipse(p.x + 3, p.y + 3, s * .59, s * .23, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#987a55'; ctx.lineWidth = Math.max(3, s * .17); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + sway * .3, p.y - height * .42, p.x + sway, p.y - height * .82); ctx.stroke();
  ctx.strokeStyle = '#b18d60'; ctx.lineWidth = Math.max(1, s * .035); ctx.beginPath(); ctx.moveTo(p.x - 2, p.y - height * .12); ctx.lineTo(p.x + sway, p.y - height * .78); ctx.stroke();
  const crownX = p.x + sway, crownY = p.y - height * .8;
  const canopy = ctx.createRadialGradient(crownX - s * .15, crownY - s * .18, s * .04, crownX, crownY, s * .55);
  canopy.addColorStop(0, greens[0]); canopy.addColorStop(1, greens[1]);
  ctx.fillStyle = canopy;
  ctx.beginPath(); ctx.ellipse(crownX, crownY, s * .52, s * .37, -.1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(crownX - s * .25, crownY + s * .08, s * .28, s * .24, .25, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(crownX + s * .27, crownY + s * .06, s * .3, s * .25, -.25, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = .24; ctx.fillStyle = '#f4f3d9'; ctx.beginPath(); ctx.ellipse(crownX - s * .12, crownY - s * .12, s * .27, s * .105, -.22, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  const visible = tree.fruit;
  for (let i = 0; i < visible; i++) {
    const a = (i / Math.max(visible, tree.cap)) * Math.PI * 2 + tree.phase * .4;
    const fx = crownX + Math.cos(a) * s * .35;
    const fy = crownY + Math.sin(a) * s * .22 + s * .04;
    const fruitGradient = ctx.createRadialGradient(fx - 1.3, fy - 1.5, .3, fx, fy, Math.max(3, s * .105));
    fruitGradient.addColorStop(0, '#dcdf88'); fruitGradient.addColorStop(1, '#89a94f');
    ctx.fillStyle = fruitGradient; ctx.beginPath(); ctx.ellipse(fx, fy, Math.max(2.4, s * .1), Math.max(2.8, s * .105), -.15, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#748951'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(fx, fy - 2); ctx.lineTo(fx + .7, fy - 4.2); ctx.stroke();
  }
  if (tree.fruit < tree.cap) {
    const glimmer = (1 - tree.fruit / Math.max(1, tree.cap)) * tree.progress;
    if (glimmer > .1) { ctx.globalAlpha = .35 + glimmer * .35; ctx.fillStyle = '#f3efb4'; ctx.beginPath(); ctx.arc(crownX + s * .1, crownY - s * .27, s * .035, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  }
  ctx.restore();
}

function drawBlob(blob) {
  const p = mapCoords(blob.x, blob.y);
  const s = worldSize.scale * 1.65 * blob.size;
  const activity = blob.eatLeft > 0 ? 4 : blob.pauseLeft > 0 ? 1.5 : 0;
  const bounce = Math.abs(Math.sin(world.time * (blob.group === 'blue' ? 5.6 : 4.5) + blob.phase)) * (2.4 + activity);
  const lean = clamp(Math.sin(blob.heading - cameraAngle) * .11, -.12, .12);
  const width = Math.max(8, s * .58), height = Math.max(9, s * .43);
  const bodyY = p.y - height * .53 - bounce;
  const selected = selectedId === blob.id;
  ctx.save();
  ctx.globalAlpha = clamp(blob.energy / 34, .24, 1) * (blob.death > 0 ? .5 : 1);
  ctx.fillStyle = '#334538'; ctx.globalAlpha *= .18;
  ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, width * .75, height * .35, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = clamp(blob.energy / 34, .24, 1) * (blob.death > 0 ? .5 : 1);
  if (selected) { ctx.strokeStyle = blob.group === 'blue' ? '#61a7b7' : '#cf7c61'; ctx.globalAlpha *= .42; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y - height * .4, width * 1.32, height * .95, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = clamp(blob.energy / 34, .24, 1) * (blob.death > 0 ? .5 : 1); }
  ctx.translate(p.x, bodyY); ctx.rotate(lean);
  if (blob.flash > 0) { ctx.globalAlpha *= .3 + blob.flash * .35; ctx.fillStyle = '#fff2ad'; ctx.beginPath(); ctx.ellipse(0, 0, width * 1.3, height * 1.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = clamp(blob.energy / 34, .24, 1); }
  const blue = blob.group === 'blue';
  const colors = blue ? ['#c3edf0', '#65b4c8', '#3f859b'] : ['#ffe0c9', '#e59373', '#bd624f'];
  const body = ctx.createRadialGradient(-width * .3, -height * .65, 1, width * .1, height * .1, width * 1.4);
  body.addColorStop(0, colors[0]); body.addColorStop(.4, colors[1]); body.addColorStop(1, colors[2]);
  ctx.fillStyle = body; ctx.strokeStyle = blue ? '#458ba0' : '#bb6b57'; ctx.lineWidth = .75;
  ctx.beginPath();
  ctx.moveTo(-width * .91, height * .22);
  ctx.bezierCurveTo(-width * 1.06, -height * .6, -width * .45, -height * 1.13, width * .04, -height * .98);
  ctx.bezierCurveTo(width * .65, -height * .98, width * 1.03, -height * .42, width * .91, height * .22);
  ctx.bezierCurveTo(width * .81, height * .87, width * .12, height * 1.01, -width * .48, height * .81);
  ctx.bezierCurveTo(-width * .86, height * .7, -width * .99, height * .54, -width * .91, height * .22);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.globalAlpha *= .48; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-width * .27, -height * .5, width * .26, height * .11, -.34, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha /= .48;
  const blink = blob.blink <= 0;
  const eyeY = -height * .18;
  if (blink) { ctx.strokeStyle = '#355467'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-width * .29, eyeY); ctx.lineTo(-width * .15, eyeY); ctx.moveTo(width * .15, eyeY); ctx.lineTo(width * .29, eyeY); ctx.stroke(); blob.blink = 2.4 + ((blob.idNumber * 1.617 + world.time * .1) % 5); }
  else {
    for (const eyeX of [-width * .22, width * .21]) {
      ctx.fillStyle = '#f9fbef'; ctx.beginPath(); ctx.ellipse(eyeX, eyeY, width * .105, height * .15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#27464b'; ctx.beginPath(); ctx.arc(eyeX + Math.cos(blob.heading) * 1.2, eyeY + .3, Math.max(1.2, width * .046), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.strokeStyle = blue ? '#315f68' : '#82493e'; ctx.lineWidth = 1.15; ctx.lineCap = 'round';
  ctx.beginPath();
  if (blob.eatLeft > 0 && blob.eatLeft % .5 < .24) ctx.ellipse(0, height * .22, width * .08, height * .11, 0, 0, Math.PI * 2);
  else ctx.arc(0, height * .13, width * .105, .18, Math.PI - .18);
  ctx.stroke();
  ctx.fillStyle = blue ? '#e78f86' : '#e8847d'; ctx.globalAlpha *= .56;
  ctx.beginPath(); ctx.ellipse(-width * .42, height * .14, width * .1, height * .055, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(width * .42, height * .14, width * .1, height * .055, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha /= .56;
  if (blob.eatLeft > .3 && Math.sin(world.time * 12 + blob.phase) > .72) {
    ctx.globalAlpha = .9; ctx.fillStyle = '#f0d886'; ctx.beginPath(); ctx.arc(width * .72, -height * .94, 2.2 + Math.sin(world.time * 13) * .8, 0, Math.PI * 2); ctx.fill();
  }
  if (blob.group === 'red' && blob.pauseLeft > config.redPause * .7) {
    ctx.globalAlpha = .65; ctx.fillStyle = '#f8f1d8'; ctx.font = '9px serif'; ctx.fillText('♡', width * .72, -height * 1.1);
  }
  ctx.restore();
}

function draw() {
  if (!resizeCanvas(canvas, ctx)) return;
  const rect = canvas.getBoundingClientRect();
  worldSize.width = rect.width; worldSize.height = rect.height;
  worldSize.centerX = rect.width * .5; worldSize.centerY = rect.height * .52;
  worldSize.radius = Math.min(rect.width * .47, rect.height * .57);
  worldSize.scale = worldSize.radius * .69 / config.worldSize;
  ctx.clearRect(0, 0, rect.width, rect.height);
  drawDish();
  const objects = [
    ...world.trees.map(item => ({ type: 'tree', item, y: item.y })),
    ...world.blue.map(item => ({ type: 'blob', item, y: item.y })),
    ...world.red.map(item => ({ type: 'blob', item, y: item.y }))
  ];
  objects.sort((a, b) => (a.y * Math.cos(cameraAngle) + a.item.x * Math.sin(cameraAngle)) - (b.y * Math.cos(cameraAngle) + b.item.x * Math.sin(cameraAngle)));
  for (const object of objects) object.type === 'tree' ? drawTree(object.item) : drawBlob(object.item);
  if (selectedId && ![...world.blue, ...world.red].some(blob => blob.id === selectedId)) hideInspect();
}

function drawChart() {
  if (!resizeCanvas(chart, cctx)) return;
  const { width, height } = chart.getBoundingClientRect();
  cctx.clearRect(0, 0, width, height);
  const data = world.history;
  const pad = { left: 5, right: 5, top: 8, bottom: 9 };
  const w = width - pad.left - pad.right, h = height - pad.top - pad.bottom;
  cctx.lineWidth = 1;
  for (let i = 0; i <= 2; i++) {
    const y = pad.top + h * i / 2;
    cctx.strokeStyle = '#e9ebe2'; cctx.beginPath(); cctx.moveTo(pad.left, y); cctx.lineTo(width - pad.right, y); cctx.stroke();
    cctx.fillStyle = '#a4ab9e'; cctx.font = '8px "DM Mono", monospace'; cctx.textAlign = 'left';
    cctx.fillText(`${100 - i * 50}`, 2, y - 3);
  }
  const series = [
    { key: 'fruit', color: '#91a66a' }, { key: 'blue', color: '#58a1b8' }, { key: 'red', color: '#d47a65' }
  ];
  for (const item of series) {
    const max = Math.max(1, ...data.map(point => point[item.key]));
    cctx.strokeStyle = item.color; cctx.lineWidth = 2; cctx.lineJoin = 'round'; cctx.lineCap = 'round'; cctx.beginPath();
    data.forEach((point, index) => {
      const x = pad.left + (data.length <= 1 ? .5 : index / (data.length - 1)) * w;
      const y = pad.top + h - (point[item.key] / max) * (h * .88) - h * .04;
      if (index === 0) cctx.moveTo(x, y); else cctx.lineTo(x, y);
    });
    cctx.stroke();
    const last = data[data.length - 1];
    if (last) {
      const x = pad.left + w, y = pad.top + h - (last[item.key] / max) * (h * .88) - h * .04;
      cctx.fillStyle = item.color; cctx.beginPath(); cctx.arc(x, y, 2.5, 0, Math.PI * 2); cctx.fill();
    }
  }
  document.querySelector('#chart-start').textContent = `DAY ${Math.floor((data[0]?.t || 0) / 20)}`;
}

function updateInspect() {
  const blob = [...world.blue, ...world.red].find(item => item.id === selectedId);
  if (!blob) { hideInspect(); return; }
  inspectCard.hidden = false;
  inspectHint.classList.add('is-hidden');
  const colorName = blob.group === 'blue' ? 'Blue gatherer' : 'Red visitor';
  const idle = blob.group === 'blue' ? config.blueVision : config.redVision;
  const speed = config[`${blob.group}Speed`] * blob.pace;
  const busyTime = blob.group === 'blue' ? blob.eatLeft : blob.pauseLeft;
  const busyName = blob.group === 'blue' ? 'Snack time left' : 'Pause time left';
  inspectCard.innerHTML = `<div class="inspect-title"><span><i class="dot ${blob.group}-dot"></i> &nbsp;${blob.name}, ${colorName}</span><button aria-label="Close inspection">×</button></div>
    <div class="inspect-lines"><span>Energy</span><b>${Math.max(0, blob.energy).toFixed(0)}%</b><span>Age</span><b>${(blob.age / 20).toFixed(1)} days</b><span>Doing</span><b>${blob.lastAction}</b><span>Speed</span><b>${speed.toFixed(1)} m/s</b><span>Sensing</span><b>${idle.toFixed(1)} m</b><span>${busyName}</span><b>${Math.max(0, busyTime).toFixed(1)} s</b><span>Family / generation</span><b>${blob.family} / ${blob.generation}</b></div>`;
}

function hideInspect() {
  selectedId = null;
  inspectCard.hidden = true;
  inspectHint.classList.remove('is-hidden');
}

function findBlobAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left, y = clientY - rect.top;
  let winner = null, best = 25;
  for (const blob of [...world.blue, ...world.red]) {
    const point = mapCoords(blob.x, blob.y);
    const d = Math.hypot(point.x - x, point.y - y);
    if (d < best) { best = d; winner = blob; }
  }
  return winner;
}

function frame(now) {
  const elapsed = Math.min(.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (isRunning) {
    accumulator += elapsed * config.speed;
    while (accumulator >= .04) { update(.04); accumulator -= .04; }
  }
  draw();
  if (now - lastHudPaint > 240) { updateReadouts(); lastHudPaint = now; }
  if (now - lastChartPaint > 350) { drawChart(); lastChartPaint = now; }
  requestAnimationFrame(frame);
}

function setRunning(value) {
  isRunning = value;
  document.querySelector('#play-icon').textContent = value ? 'Ⅱ' : '▶';
  document.querySelector('#play-label').textContent = value ? 'Pause' : 'Play';
  stateDot.classList.toggle('paused', !value);
  stateLabel.textContent = value ? 'Garden is awake' : 'Garden is resting';
}

function setPreset(name) {
  const preset = presets[name];
  config = { ...defaults, ...preset.values };
  document.querySelector('#preset-note').textContent = preset.note;
  syncInputs(); resetWorld(); setRunning(true);
}

for (const [key, input] of Object.entries(inputs)) {
  input.addEventListener('input', () => {
    config[key] = Number(input.value);
    outputs[key].value = formatValue(key, config[key]);
    outputs[key].textContent = formatValue(key, config[key]);
    if (['trees', 'blueStart', 'redStart', 'worldSize', 'seed'].includes(key)) {
      document.querySelector('#preset-note').textContent = 'Starting conditions update when you apply changes.';
    } else if (key === 'fruitLimit') {
      for (const tree of world.trees) { tree.cap = config.fruitLimit; tree.fruit = Math.min(tree.fruit, tree.cap); }
    }
  });
}

document.querySelector('#speed-range').addEventListener('input', event => {
  config.speed = Number(event.target.value);
  document.querySelector('#speed-value').textContent = formatValue('speed', config.speed);
});
document.querySelector('#play-button').addEventListener('click', () => setRunning(!isRunning));
document.querySelector('#step-button').addEventListener('click', () => {
  setRunning(false);
  for (let i = 0; i < 500; i++) update(.04);
  draw(); drawChart(); updateReadouts();
});
document.querySelector('#reset-button').addEventListener('click', resetWorld);
document.querySelector('#apply-button').addEventListener('click', () => { resetWorld(); setRunning(true); });
document.querySelector('#random-button').addEventListener('click', () => {
  config.seed = 1 + Math.floor(Math.random() * 999);
  syncInputs(); resetWorld(); setRunning(true);
});
document.querySelector('#preset-select').addEventListener('change', event => setPreset(event.target.value));

let pointer = null;
canvas.addEventListener('pointerdown', event => {
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, moved: false };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const delta = event.clientX - pointer.lastX;
  if (Math.abs(event.clientX - pointer.x) + Math.abs(event.clientY - pointer.y) > 5) pointer.moved = true;
  if (pointer.moved) cameraAngle += delta * .008;
  pointer.lastX = event.clientX;
});
canvas.addEventListener('pointerup', event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  if (!pointer.moved) {
    const blob = findBlobAt(event.clientX, event.clientY);
    if (blob) { selectedId = blob.id; updateInspect(); } else hideInspect();
  }
  pointer = null;
});
canvas.addEventListener('pointercancel', () => { pointer = null; });
window.addEventListener('resize', () => { draw(); drawChart(); });

document.querySelector('#sound-button').addEventListener('click', async event => {
  try {
    audioContext ||= new AudioContext();
    if (!ambience) {
      await audioContext.resume();
      const gain = audioContext.createGain(); gain.gain.value = .012; gain.connect(audioContext.destination);
      for (const [frequency, volume] of [[196, .45], [293.66, .25], [392, .1]]) {
        const oscillator = audioContext.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        const overtone = audioContext.createGain(); overtone.gain.value = volume; oscillator.connect(overtone); overtone.connect(gain); oscillator.start(); ambientNodes.push(oscillator, overtone);
      }
      ambientNodes.push(gain); ambience = true; event.currentTarget.textContent = '♫'; event.currentTarget.style.background = '#e8eddf';
    } else {
      for (const node of ambientNodes) { if (node instanceof OscillatorNode) { try { node.stop(); } catch {} } node.disconnect(); }
      ambientNodes = []; ambience = false; event.currentTarget.style.background = '';
    }
  } catch { stateLabel.textContent = 'Sound is unavailable here'; }
});

syncInputs();
resetWorld();
setRunning(true);
inspectCard.addEventListener('click', event => { if (event.target.closest('button')) hideInspect(); });
requestAnimationFrame(frame);
