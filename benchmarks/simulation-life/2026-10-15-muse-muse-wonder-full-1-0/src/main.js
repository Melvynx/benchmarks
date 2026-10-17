// Living garden simulator — energy-driven fruit / blue / red ecology.
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEFAULTS = {
  fruitGrowth: 0.27, fruitLimit: 6, fruitDelay: 3,
  blueEnergyUse: 0.88, blueSpeed: 38, blueVision: 150, blueCopy: 86, blueEatTime: 1.1,
  redEnergyUse: 1.0, redSpeed: 46, redVision: 165, redContact: 19, redCopy: 80, redPause: 2.2,
  startTrees: 8, startBlue: 18, startRed: 6, worldSize: 300, seed: 7,
};
export const PRESETS = {
  balanced: { desc: 'Gentle waves: fruit feeds blue, blue feeds red, too many reds starve themselves.', p: {} },
  fruitRich: { desc: 'Fast fruit and big trees — blue blobs boom first, then reds follow the feast.', p: { fruitGrowth: 0.34, fruitLimit: 10, fruitDelay: 1.2, startTrees: 11 } },
  redHeavy: { desc: 'Lots of hungry reds at the start — watch blue dip first, then red fade for lack of blue.', p: { startRed: 16, startBlue: 20, redContact: 25, redSpeed: 50, redPause: 1.6 } },
  fragile: { desc: 'Thin margins everywhere — small nudges can tip the whole garden over.', p: { fruitGrowth: 0.11, fruitLimit: 4, blueEnergyUse: 1.2, redEnergyUse: 1.15, startBlue: 14, startRed: 5 } },
  lowFruit: { desc: 'Sparse, slow fruit keeps every group small — a quiet, hungry garden.', p: { fruitGrowth: 0.07, fruitLimit: 3, fruitDelay: 6, startTrees: 5, startBlue: 12, startRed: 3 } },
};
const CONTROLS = [
  ['Fruit', [['fruitGrowth','Fruit growth speed',0.02,0.5,0.01],['fruitLimit','Fruit limit per tree',1,14,1],['fruitDelay','Fruit return delay (s)',0,12,0.5]]],
  ['Blue blobs', [['blueEnergyUse','Blue energy use',0.4,2.2,0.05],['blueSpeed','Blue speed',15,80,1],['blueVision','Blue vision',60,320,5],['blueCopy','Blue copy threshold',55,105,1],['blueEatTime','Blue eating time (s)',0.2,3,0.1]]],
  ['Red blobs', [['redEnergyUse','Red energy use',0.4,2.2,0.05],['redSpeed','Red speed',15,85,1],['redVision','Red vision',60,340,5],['redContact','Red contact strength',4,40,1],['redCopy','Red copy threshold',55,105,1],['redPause','Red pause time (s)',0.2,4,0.1]]],
  ['World (applies on Reset)', [['startTrees','Starting fruit trees',2,16,1],['startBlue','Starting blue blobs',2,45,1],['startRed','Starting red blobs',0,35,1],['worldSize','World size',220,400,5]]],
];

let params = { ...DEFAULTS };
let S = null;
let nextId = 1;

function makeBlob(kind, rng, parent) {
  const R = params.worldSize;
  const ang = rng() * Math.PI * 2, rad = Math.sqrt(rng()) * R * 0.82;
  const mut = () => 1 + (rng() - 0.5) * 0.16;
  return {
    id: nextId++, kind,
    x: parent ? parent.x + (rng() - 0.5) * 18 : Math.cos(ang) * rad,
    y: parent ? parent.y + (rng() - 0.5) * 18 : Math.sin(ang) * rad,
    vx: 0, vy: 0, dir: rng() * Math.PI * 2,
    energy: parent ? 30 : 45 + rng() * 25,
    age: 0, state: 'wander', pause: 0, pauseTotal: 0, immune: 0, breedCd: 1 + rng() * 2,
    target: null, wanderT: rng() * 2, blink: 2 + rng() * 3, phase: rng() * Math.PI * 2,
    speedMul: parent ? clamp(parent.speedMul * mut(), 0.6, 1.6) : 0.9 + rng() * 0.2,
    visionMul: parent ? clamp(parent.visionMul * mut(), 0.6, 1.6) : 0.9 + rng() * 0.2,
    metaMul: parent ? clamp(parent.metaMul * mut(), 0.6, 1.6) : 0.9 + rng() * 0.2,
    gen: parent ? parent.gen + 1 : 0, kids: 0, chew: 0, glow: 0,
  };
}

export function createWorld(p) {
  const rng = mulberry32(p.seed * 2654435761 >>> 0);
  nextId = 1;
  const trees = [];
  let tries = 0;
  while (trees.length < p.startTrees && tries++ < 600) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * p.worldSize * 0.8;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (trees.every((t) => Math.hypot(t.x - x, t.y - y) > 62)) trees.push({ x, y, fruit: 2 + rng() * (p.fruitLimit - 2), delay: 0, sway: rng() * 6.28, size: 0.85 + rng() * 0.35, fruitSeeds: Array.from({length:14},()=>rng()) });
  }
  const blues = [], reds = [];
  for (let i = 0; i < p.startBlue; i++) blues.push(makeBlob('blue', rng, null));
  for (let i = 0; i < p.startRed; i++) reds.push(makeBlob('red', rng, null));
  return { rng, trees, blues, reds, particles: [], time: 0, births: 0, deaths: 0, peakBlue: blues.length, peakRed: reds.length, minBlue: blues.length, history: [], sampleT: 0, selectedId: null };
}

function steer(b, tx, ty, speed, dt, arrive = 4) {
  const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1;
  const sp = d < arrive * 3 ? speed * Math.max(0.25, d / (arrive * 3)) : speed;
  b.vx += ((dx / d) * sp - b.vx) * Math.min(1, dt * 5);
  b.vy += ((dy / d) * sp - b.vy) * Math.min(1, dt * 5);
  return d;
}

function spawnParticles(x, y, color, n = 8) {
  for (let i = 0; i < n; i++) S.particles.push({ x, y, vx: (S.rng() - 0.5) * 50, vy: (S.rng() - 0.5) * 50, life: 0.6 + S.rng() * 0.4, color, r: 1.5 + S.rng() * 2.5 });
}

export function stepWorld(S, p, dt) {
  S.time += dt;
  const R = p.worldSize;
  // Fruit regrowth after per-tree delay
  for (const t of S.trees) {
    if (t.delay > 0) t.delay -= dt;
    else t.fruit = Math.min(p.fruitLimit, t.fruit + p.fruitGrowth * dt);
  }
  const all = [...S.blues, ...S.reds];
  const newborns = [];
  const FRUIT_ENERGY = 34;

  for (const b of all) {
    b.age += dt; b.blink -= dt; if (b.blink < -0.12) b.blink = 1.6 + S.rng() * 3.2;
    b.immune = Math.max(0, b.immune - dt); b.breedCd = Math.max(0, b.breedCd - dt);
    b.glow = Math.max(0, b.glow - dt * 1.6);
    const isBlue = b.kind === 'blue';
    const baseSpeed = (isBlue ? p.blueSpeed : p.redSpeed) * b.speedMul;
    const vision = (isBlue ? p.blueVision : p.redVision) * b.visionMul;
    const moving = Math.hypot(b.vx, b.vy) > 4;
    // Energy drain: resting + moving
    b.energy -= ((moving ? 1.65 : 0.55)) * (isBlue ? p.blueEnergyUse : p.redEnergyUse) * b.metaMul * dt * (baseSpeed / 42) ** 0.35;

    if (b.pause > 0) { // eating / contact pause — cannot act
      b.pause -= dt; b.vx *= 0.8; b.vy *= 0.8; b.chew = Math.max(0, b.pause);
      if (b.pause <= 0 && b.state === 'eating' && b.target && b.target.fruit >= 1) {
        b.target.fruit -= 1; b.target.delay = p.fruitDelay;
        b.energy = Math.min(110, b.energy + FRUIT_ENERGY); b.glow = 1;
        spawnParticles(b.x, b.y, '#7ed957', 7);
      }
      if (b.pause <= 0) { b.state = 'wander'; b.target = null; }
    } else if (isBlue) {
      // Flee nearest red
      let fleeX = 0, fleeY = 0, fleeD = 1e9;
      for (const r of S.reds) { const d = Math.hypot(r.x - b.x, r.y - b.y); if (d < vision * 0.4 && d < fleeD) { fleeD = d; fleeX = b.x - r.x; fleeY = b.y - r.y; } }
      if (fleeD < vision * 0.4) {
        b.state = 'fleeing red'; steer(b, b.x + fleeX, b.y + fleeY, baseSpeed * 1.07, dt);
      } else {
        // Seek best tree within vision (hungrier = look farther)
        let best = null, bestScore = 1e9;
        for (const t of S.trees) { if (t.fruit < 1) continue; const d = Math.hypot(t.x - b.x, t.y - b.y); const score = d - t.fruit * 6; if (d < vision * (b.energy < 45 ? 2.2 : 1) && score < bestScore) { bestScore = score; best = t; } }
        if (best && b.energy < 96) {
          b.state = 'seeking fruit'; b.target = best;
          if (steer(b, best.x, best.y + 10, baseSpeed, dt) < 20) { b.state = 'eating'; b.pause = b.pauseTotal = p.blueEatTime; b.vx = b.vy = 0; }
        } else {
          b.state = b.energy >= 96 ? 'resting (full)' : 'wandering';
          b.wanderT -= dt; if (b.wanderT <= 0) { b.wanderT = 1 + S.rng() * 2; b.dir += (S.rng() - 0.5) * 1.6; }
          steer(b, b.x + Math.cos(b.dir) * 60, b.y + Math.sin(b.dir) * 60, baseSpeed * 0.55, dt);
        }
      }
    } else {
      // Red: hunt nearest blue in vision — but a full red rests, and blues sheltered
      // under a tree canopy cannot be contacted (a refuge that lets rare blues recover).
      let prey = null, pd = 1e9;
      if (b.energy < 72) for (const bl of S.blues) { if (bl.energy <= 14) continue; const d = Math.hypot(bl.x - b.x, bl.y - b.y); if (d < vision && d < pd) { pd = d; prey = bl; } }
      if (prey) {
        b.state = 'chasing blue'; b.target = prey;
        steer(b, prey.x + prey.vx * 0.18, prey.y + prey.vy * 0.18, baseSpeed, dt);
        const sheltered = S.trees.some((t) => Math.hypot(t.x - prey.x, t.y - prey.y) < 34);
        if (sheltered && pd < 40) b.state = 'waiting by tree';
        if (pd < 17 && prey.immune <= 0 && !sheltered) {
          const stolen = Math.min(p.redContact, Math.max(0, prey.energy));
          prey.energy -= stolen; b.energy = Math.min(110, b.energy + stolen * 0.85);
          prey.immune = 1.1; prey.vx += (prey.x - b.x) * 1.3; prey.vy += (prey.y - b.y) * 1.3;
          b.state = 'contact pause'; b.pause = b.pauseTotal = p.redPause; b.glow = 1; b.vx = b.vy = 0;
          spawnParticles(b.x, b.y, '#ff8a75', 9);
        }
      } else {
        b.state = b.energy >= 72 ? 'resting (full)' : 'wandering';
        b.wanderT -= dt; if (b.wanderT <= 0) { b.wanderT = 1 + S.rng() * 2; b.dir += (S.rng() - 0.5) * 1.6; }
        steer(b, b.x + Math.cos(b.dir) * 60, b.y + Math.sin(b.dir) * 60, baseSpeed * 0.6, dt);
      }
    }
    // Separation (avoid crowding)
    for (const o of all) { if (o === b) continue; const dx = b.x - o.x, dy = b.y - o.y, d2 = dx * dx + dy * dy; if (d2 > 0.01 && d2 < 320) { const d = Math.sqrt(d2); b.vx += (dx / d) * 26 * dt; b.vy += (dy / d) * 26 * dt; } }
    b.x += b.vx * dt; b.y += b.vy * dt;
    const dc = Math.hypot(b.x, b.y);
    if (dc > R - 14) { b.x *= (R - 14) / dc; b.y *= (R - 14) / dc; b.dir = Math.atan2(-b.y, -b.x) + (S.rng() - 0.5); }
    // Reproduce: costs stored energy
    const thresh = isBlue ? p.blueCopy : p.redCopy;
    if (b.energy > thresh && b.breedCd <= 0 && b.pause <= 0) {
      b.energy -= 44; b.kids++; b.breedCd = 4; S.births++;
      const child = makeBlob(b.kind, S.rng, b); newborns.push(child);
      spawnParticles(b.x, b.y, isBlue ? '#7db8ff' : '#ff9a8a', 6);
    }
  }
  for (const n of newborns) (n.kind === 'blue' ? S.blues : S.reds).push(n);
  const beforeB = S.blues.length, beforeR = S.reds.length;
  for (const b of all) if (b.energy <= 0) spawnParticles(b.x, b.y, '#c9c9b8', 5);
  S.blues = S.blues.filter((b) => b.energy > 0);
  S.reds = S.reds.filter((b) => b.energy > 0);
  S.deaths += (beforeB - S.blues.length) + (beforeR - S.reds.length);
  S.peakBlue = Math.max(S.peakBlue, S.blues.length); S.peakRed = Math.max(S.peakRed, S.reds.length);
  if (S.time > 5) S.minBlue = Math.min(S.minBlue, S.blues.length);
  for (const pt of S.particles) { pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; }
  S.particles = S.particles.filter((pt) => pt.life > 0);
  S.sampleT -= dt;
  if (S.sampleT <= 0) {
    S.sampleT = 0.5;
    const fruit = S.trees.reduce((s, t) => s + t.fruit, 0);
    const avg = (arr, k) => arr.length ? arr.reduce((s, b) => s + b[k], 0) / arr.length : 0;
    S.history.push({ t: S.time, fruit, blue: S.blues.length, red: S.reds.length, bSpeed: avg(S.blues, 'speedMul'), rSpeed: avg(S.reds, 'speedMul'), bEnergy: avg(S.blues, 'energy') });
    if (S.history.length > 2400) S.history.shift();
  }
}

// ---------- Rendering: round tilting dish, pseudo-3D ----------
const canvas = $('world'), ctx = canvas.getContext('2d');
let rotation = 0.4, dragging = false, dragMoved = 0, lastX = 0;
const TILT = 0.62;
function project(x, y, z = 0) {
  const c = Math.cos(rotation), s = Math.sin(rotation);
  const rx = x * c - y * s, ry = x * s + y * c;
  const scale = (canvas.width * 0.46) / params.worldSize;
  return { sx: canvas.width / 2 + rx * scale, sy: canvas.height / 2 + 16 + ry * scale * TILT - z, depth: ry, scale };
}
function drawBlob(b, tNow) {
  const hop = reducedMotion ? 0 : Math.abs(Math.sin(tNow * 6 + b.phase)) * (Math.hypot(b.vx, b.vy) > 5 ? 5 : 1.6);
  const p = project(b.x, b.y, hop);
  const sc = p.scale * (0.92 + (p.depth / params.worldSize) * 0.14);
  const w = 15 * sc, h = 19 * sc * (b.state === 'eating' ? 1 + Math.sin(tNow * 14) * 0.05 : 1);
  // shadow
  ctx.fillStyle = 'rgba(60,70,30,.25)';
  ctx.beginPath(); ctx.ellipse(p.sx, project(b.x, b.y, 0).sy + h * 0.52, w * 0.75, w * 0.3, 0, 0, 7); ctx.fill();
  const lean = clamp(b.vx * 0.004, -0.22, 0.22);
  ctx.save(); ctx.translate(p.sx, p.sy); ctx.rotate(lean);
  const isBlue = b.kind === 'blue';
  const grad = ctx.createRadialGradient(-w * 0.3, -h * 0.35, 2, 0, 0, w * 1.25);
  grad.addColorStop(0, isBlue ? '#bfe1ff' : '#ffd0c4'); grad.addColorStop(0.45, isBlue ? '#4a9cf0' : '#f26a56'); grad.addColorStop(1, isBlue ? '#1f66bd' : '#c93a2a');
  if (b.glow > 0) { ctx.shadowColor = isBlue ? '#7db8ff' : '#ff9a8a'; ctx.shadowBlur = 18 * b.glow; }
  ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.62, h * 0.62, 0, 0, 7); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.beginPath(); ctx.ellipse(-w * 0.22, -h * 0.3, w * 0.16, h * 0.1, -0.5, 0, 7); ctx.fill();
  // face: blink + mouth
  const blinking = b.blink < 0;
  ctx.fillStyle = '#1d2b3a';
  for (const ex of [-w * 0.2, w * 0.2]) {
    if (blinking) { ctx.fillRect(ex - 2.4 * sc, -h * 0.1, 4.8 * sc, 1.6 * sc); }
    else { ctx.beginPath(); ctx.ellipse(ex, -h * 0.1, 2.4 * sc, 3.2 * sc, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 0.8 * sc, -h * 0.14, 0.9 * sc, 0, 7); ctx.fill(); ctx.fillStyle = '#1d2b3a'; }
  }
  ctx.strokeStyle = '#1d2b3a'; ctx.lineWidth = 1.6 * sc; ctx.beginPath();
  if (b.state === 'eating') ctx.arc(0, h * 0.1, 3.4 * sc, 0, 7); else ctx.arc(0, h * 0.04, 4.4 * sc, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // energy ring when low
  if (b.energy < 25) { ctx.strokeStyle = 'rgba(180,60,40,.8)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.ellipse(0, 0, w * 0.72, h * 0.72, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
  ctx.restore();
  if (S.selectedId === b.id) { ctx.strokeStyle = '#8a6d1f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(p.sx, project(b.x, b.y, 0).sy + h * 0.52, w * 0.95, w * 0.4, 0, 0, 7); ctx.stroke(); }
}
function drawTree(t, tNow) {
  const base = project(t.x, t.y, 0), sc = base.scale * t.size;
  const sway = reducedMotion ? 0 : Math.sin(tNow * 1.3 + t.sway) * 2.2 * sc;
  ctx.fillStyle = 'rgba(60,70,30,.22)'; ctx.beginPath(); ctx.ellipse(base.sx, base.sy + 3, 26 * sc, 8 * sc, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#8a5a33'; ctx.lineWidth = 6 * sc; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(base.sx, base.sy); ctx.lineTo(base.sx + sway * 0.4, base.sy - 22 * sc); ctx.stroke();
  const cx = base.sx + sway, cy = base.sy - 34 * sc;
  for (const [ox, oy, r] of [[-15, 2, 17], [15, 2, 17], [0, -10, 20], [0, 5, 16]]) {
    const g = ctx.createRadialGradient(cx + ox * sc - 5, cy + oy * sc - 5, 2, cx + ox * sc, cy + oy * sc, r * sc);
    g.addColorStop(0, '#8fd67a'); g.addColorStop(1, '#3d8a3a'); ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx + ox * sc, cy + oy * sc, r * sc, 0, 7); ctx.fill();
  }
  // fruit dots attached to canopy — count = floor(fruit), visibly shrinks when eaten
  const n = Math.floor(t.fruit);
  ctx.fillStyle = '#c6f542';
  for (let i = 0; i < n && i < t.fruitSeeds.length; i++) {
    const a = t.fruitSeeds[i] * 6.28, rr = (0.35 + t.fruitSeeds[(i + 5) % 14] * 0.55) * 20 * sc;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.75, 3.4 * sc, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr - 1, cy + Math.sin(a) * rr * 0.75 - 1, 1.1 * sc, 0, 7); ctx.fill(); ctx.fillStyle = '#c6f542';
  }
  if (n === 0) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = `${10 * sc}px sans-serif`; ctx.fillText('· regrowing ·', cx - 26 * sc, cy + 34 * sc); }
}
function render(tNow) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2, cy = canvas.height / 2 + 16, Rpx = canvas.width * 0.46;
  // dish side + rim + grass
  ctx.fillStyle = '#c98f4e'; ctx.beginPath(); ctx.ellipse(cx, cy + 26, Rpx + 14, (Rpx + 14) * TILT, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#e0aa63'; ctx.beginPath(); ctx.ellipse(cx, cy + 10, Rpx + 14, (Rpx + 14) * TILT, 0, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(cx - 60, cy - 70, 40, cx, cy, Rpx);
  g.addColorStop(0, '#b7e28c'); g.addColorStop(0.7, '#8fce6e'); g.addColorStop(1, '#6fb457');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, Rpx, Rpx * TILT, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
  for (const f of [0.35, 0.65]) { ctx.beginPath(); ctx.ellipse(cx, cy, Rpx * f, Rpx * f * TILT, 0, 0, 7); ctx.stroke(); }
  const drawables = [
    ...S.trees.map((t) => ({ d: project(t.x, t.y).depth, fn: () => drawTree(t, tNow) })),
    ...[...S.blues, ...S.reds].map((b) => ({ d: project(b.x, b.y).depth, fn: () => drawBlob(b, tNow) })),
  ].sort((a, b2) => a.d - b2.d);
  for (const d of drawables) d.fn();
  for (const pt of S.particles) { const p = project(pt.x, pt.y, 14); ctx.globalAlpha = clamp(pt.life, 0, 1); ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(p.sx, p.sy, pt.r * p.scale, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
}
// charts
function lineChart(cv, series, colors) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H); c.fillStyle = '#fffdf4'; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#e3e9d2'; for (let i = 0; i <= 4; i++) { const y = 12 + (H - 36) * i / 4; c.beginPath(); c.moveTo(34, y); c.lineTo(W - 8, y); c.stroke(); }
  if (!S.history.length) return;
  series.forEach((key, si) => {
    const max = Math.max(4, ...S.history.map((h) => h[key])) * 1.08;
    c.strokeStyle = colors[si]; c.lineWidth = 2.2; c.beginPath();
    S.history.forEach((h, i) => { const x = 34 + (W - 44) * (S.history.length < 2 ? 0 : i / (S.history.length - 1)); const y = 12 + (H - 36) * (1 - h[key] / max); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.stroke();
    const last = S.history[S.history.length - 1][key];
    c.fillStyle = colors[si]; c.font = 'bold 12px sans-serif'; c.fillText(String(Math.round(last)), W - 42, 24 + si * 15);
  });
  c.fillStyle = '#7a7a6a'; c.font = '11px sans-serif'; c.fillText('time →', W - 52, H - 6);
}
function phaseChart() {
  const cv = $('phaseChart'), c = cv.getContext('2d'), W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H); c.fillStyle = '#fffdf4'; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#d8e0c3'; c.strokeRect(30, 10, W - 44, H - 36);
  c.fillStyle = '#7a7a6a'; c.font = '11px sans-serif'; c.fillText('blue →', W - 70, H - 10); c.fillText('red ↑', 34, 22);
  if (S.history.length < 3) return;
  const mx = Math.max(8, ...S.history.map((h) => h.blue)) * 1.1, my = Math.max(6, ...S.history.map((h) => h.red)) * 1.1;
  c.strokeStyle = '#8a6d1f'; c.lineWidth = 1.8; c.beginPath();
  S.history.forEach((h, i) => { const x = 30 + (W - 44) * h.blue / mx, y = 10 + (H - 36) * (1 - h.red / my); i ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.globalAlpha = 0.75; c.stroke(); c.globalAlpha = 1;
  const last = S.history[S.history.length - 1];
  c.fillStyle = '#c93a2a'; c.beginPath(); c.arc(30 + (W - 44) * last.blue / mx, 10 + (H - 36) * (1 - last.red / my), 5, 0, 7); c.fill();
}
function traitChart() {
  const cv = $('traitChart'), c = cv.getContext('2d'), W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  if (S.history.length < 3) return;
  for (const [key, col] of [['bSpeed', '#2f7fe0'], ['rSpeed', '#e84a3c']]) {
    c.strokeStyle = col; c.lineWidth = 2; c.beginPath();
    S.history.forEach((h, i) => { const x = 6 + (W - 12) * i / (S.history.length - 1); const y = H - 10 - (H - 24) * clamp((h[key] - 0.6) / 0.9, 0, 1); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.stroke();
  }
  c.fillStyle = '#7a7a6a'; c.font = '10px sans-serif'; c.fillText('avg speed trait ×', 8, 12);
}
function summarize() {
  const h = S.history; if (h.length < 20) return 'Press play and let the garden run — a story will appear here.';
  const first = h[Math.min(10, h.length - 1)], last = h[h.length - 1];
  const blueGone = S.blues.length === 0, redGone = S.reds.length === 0;
  if (blueGone && redGone) return 'Both groups faded — the garden ran out of energy. Try faster fruit or gentler energy use.';
  if (blueGone) return 'Blue blobs faded, and with no blue left the reds will run low and follow. The world settled into a simpler, emptier state.';
  if (redGone) return S.time > 40 ? 'Red blobs faded away. Blue blobs now munch fruit in peace and level out at what the trees can feed.' : 'Red blobs are gone for now — blue blobs graze undisturbed.';
  // count blue peaks as a wave signal
  let peaks = 0; for (let i = 4; i < h.length - 4; i++) if (h[i].blue >= h[i - 4].blue && h[i].blue >= h[i + 4].blue && h[i].blue > h[i - 1].blue) peaks++;
  if (S.peakBlue <= first.blue + 4 && last.fruit < 6) return 'Low fruit kept the garden small — nobody stored enough energy to grow much.';
  if (peaks >= 3) return 'The garden stayed balanced in waves: blue blobs grew first, red blobs followed, then blue dipped and red faded back — a living see-saw.';
  if (last.blue > first.blue + 6) return 'Blue blobs are booming on the fruit — if reds keep up, expect them to follow the feast soon.';
  if (last.red > first.red + 4) return 'Red blobs are thriving on all that blue. Watch for blue to dip — and then red to go hungry.';
  return 'The garden is holding a gentle balance so far. Let it run longer to see the waves develop.';
}

// ---------- UI wiring ----------
let playing = false, simSpeed = 1;
function resetWorld() { S = createWorld(params); updateInspector(true); refreshStats(); }
function buildControls() {
  const host = $('controlsHost'); host.innerHTML = '';
  for (const [group, items] of CONTROLS) {
    const h = document.createElement('div'); h.className = 'ctl-group'; h.textContent = group; host.appendChild(h);
    for (const [key, label, min, max, step] of items) {
      const div = document.createElement('div'); div.className = 'ctl';
      div.innerHTML = `<label for="ctl-${key}">${label}</label><output id="out-${key}">${params[key]}</output><input id="ctl-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${params[key]}">`;
      host.appendChild(div);
      div.querySelector('input').addEventListener('input', (e) => { params[key] = parseFloat(e.target.value); $('out-' + key).textContent = e.target.value; });
    }
  }
  const h = document.createElement('div'); h.className = 'ctl-group'; h.textContent = 'Random seed (applies on Reset)'; host.appendChild(h);
  const div = document.createElement('div'); div.className = 'ctl';
  div.innerHTML = `<label for="ctl-seed">Seed</label><output></output><input id="ctl-seed" type="number" value="${params.seed}">`;
  host.appendChild(div);
  div.querySelector('input').addEventListener('change', (e) => { params.seed = parseInt(e.target.value || '7', 10); });
}
function syncControls() {
  for (const [, items] of CONTROLS) for (const [key] of items) { const el = $('ctl-' + key); if (el) { el.value = params[key]; $('out-' + key).textContent = params[key]; } }
  const seedEl = $('ctl-seed'); if (seedEl) seedEl.value = params.seed;
}
function refreshStats() {
  $('statFruit').textContent = Math.floor(S.trees.reduce((s, t) => s + t.fruit, 0));
  $('statBlue').textContent = S.blues.length; $('statRed').textContent = S.reds.length;
  $('statTime').textContent = Math.floor(S.time) + 's'; $('statGen').textContent = S.births;
  $('hudState').textContent = playing ? `Playing ${simSpeed}×` : 'Paused';
  $('summaryText').textContent = summarize();
  $('summaryFacts').innerHTML = `<li>Peak blue: ${S.peakBlue} · Peak red: ${S.peakRed} · Lowest blue: ${S.minBlue}</li><li>Births: ${S.births} · Faded: ${S.deaths} · Trees: ${S.trees.length}</li><li>History samples: ${S.history.length} (every 0.5s of garden time)</li>`;
}
function selectedBlob() { return [...S.blues, ...S.reds].find((b) => b.id === S.selectedId) || null; }
function updateInspector(clear = false) {
  const b = clear ? null : selectedBlob();
  $('inspectorEmpty').hidden = !!b; $('inspectorBody').hidden = !b;
  if (!b) return;
  const isBlue = b.kind === 'blue';
  $('inspSwatch').style.background = isBlue ? '#2f7fe0' : '#e84a3c';
  $('inspName').textContent = `${isBlue ? 'Blue' : 'Red'} blob #${b.id}`;
  $('inspAction').textContent = b.state;
  $('inspEnergyFill').style.width = clamp(b.energy, 0, 110) / 1.1 + '%';
  $('inspEnergyFill').style.background = b.energy < 25 ? '#e84a3c' : isBlue ? '#2f7fe0' : '#e8843c';
  $('inspEnergy').textContent = b.energy.toFixed(1);
  $('inspAge').textContent = b.age.toFixed(0) + 's';
  $('inspSpeed').textContent = ((isBlue ? params.blueSpeed : params.redSpeed) * b.speedMul).toFixed(0) + ` (×${b.speedMul.toFixed(2)})`;
  $('inspVision').textContent = ((isBlue ? params.blueVision : params.redVision) * b.visionMul).toFixed(0);
  $('inspPause').textContent = b.pause > 0 ? b.pause.toFixed(1) + 's' : '—';
  $('inspGen').textContent = b.gen; $('inspKids').textContent = b.kids; $('inspMeta').textContent = '×' + b.metaMul.toFixed(2);
}
canvas.addEventListener('pointerdown', (e) => { dragging = true; dragMoved = 0; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; dragMoved += Math.abs(dx); rotation += dx * 0.008; });
canvas.addEventListener('pointerup', (e) => {
  dragging = false;
  if (dragMoved > 6) return;
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * canvas.width / rect.width, my = (e.clientY - rect.top) * canvas.height / rect.height;
  let best = null, bd = 34;
  for (const b of [...S.blues, ...S.reds]) { const p = project(b.x, b.y, 6); const d = Math.hypot(p.sx - mx, p.sy - my); if (d < bd) { bd = d; best = b; } }
  S.selectedId = best ? best.id : null; updateInspector();
});
$('btnPlay').onclick = () => { playing = true; refreshStats(); };
$('btnPause').onclick = () => { playing = false; refreshStats(); };
$('btnStep').onclick = () => { for (let i = 0; i < 20; i++) stepWorld(S, params, 1 / 60); refreshStats(); updateInspector(); };
$('btnReset').onclick = () => resetWorld();
$('btnRandom').onclick = () => {
  params.seed = Math.floor(Math.random() * 99999);
  params.fruitGrowth = +(0.06 + Math.random() * 0.3).toFixed(2);
  params.startBlue = 10 + Math.floor(Math.random() * 22); params.startRed = 2 + Math.floor(Math.random() * 12);
  syncControls(); resetWorld();
};
$('simSpeed').addEventListener('input', (e) => { simSpeed = parseFloat(e.target.value); $('simSpeedVal').textContent = simSpeed + '×'; });
$('presetRow').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-preset]'); if (!btn) return;
  document.querySelectorAll('.preset').forEach((el) => el.classList.toggle('active', el === btn));
  const pr = PRESETS[btn.dataset.preset];
  params = { ...DEFAULTS, seed: params.seed, ...pr.p };
  $('presetDesc').textContent = pr.desc; syncControls(); resetWorld();
});
buildControls(); resetWorld();
window.__garden = { get state() { return S; }, get params() { return params; }, setParams(p) { Object.assign(params, p); syncControls(); }, reset: resetWorld, step: (n = 60, dt = 1 / 30) => { for (let i = 0; i < n; i++) stepWorld(S, params, dt); }, play: () => { playing = true; }, pause: () => { playing = false; }, get playing() { return playing; }, PRESETS, DEFAULTS };
let last = performance.now(), statT = 0;
function frame(now) {
  const dtReal = Math.min(0.05, (now - last) / 1000); last = now;
  if (playing) { let simDt = dtReal * simSpeed; const sub = Math.max(1, Math.ceil(simDt / (1 / 30))); for (let i = 0; i < sub; i++) stepWorld(S, params, simDt / sub); }
  render(now / 1000);
  statT -= dtReal;
  if (statT <= 0) { statT = 0.25; refreshStats(); updateInspector(); lineChart($('historyChart'), ['fruit', 'blue', 'red'], ['#57b84c', '#2f7fe0', '#e84a3c']); phaseChart(); traitChart(); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

