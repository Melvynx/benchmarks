import { createWorld, stepWorld, counts, DEFAULTS, MAX_ENERGY } from './sim.js';

const $ = (id) => document.getElementById(id);

const PRESETS = {
  'Balanced garden': {},
  'Fruit-rich garden': { fruitGrowth: 1.35, fruitLimit: 10, fruitDelay: 1.2, startTrees: 18, startBlue: 28, startRed: 6, redCopy: 92 },
  'Red-heavy garden': { startRed: 20, startBlue: 34, redContact: 22 },
  'Fragile balance': { fruitGrowth: 0.45, fruitLimit: 5, redContact: 23, redSpeed: 42, startBlue: 30, startRed: 9 },
  'Low-fruit garden': { fruitGrowth: 0.22, fruitLimit: 3, fruitDelay: 4, startTrees: 8, startBlue: 22, startRed: 5 },
};

const GROUPS = [
  ['Garden & fruit', [
    ['fruitGrowth', 'Fruit growth speed', 0.05, 2.5, 0.05],
    ['fruitLimit', 'Fruit per tree (limit)', 1, 14, 1],
    ['fruitDelay', 'Fruit return delay (s)', 0, 12, 0.5],
    ['startTrees', 'Starting fruit trees ↺', 3, 30, 1],
  ]],
  ['Blue blobs', [
    ['blueEnergyUse', 'Energy use', 0.4, 4, 0.1],
    ['blueSpeed', 'Speed', 10, 70, 1],
    ['blueVision', 'Vision range', 30, 220, 2],
    ['blueCopy', 'Copy threshold (energy)', 50, 108, 1],
    ['blueEatTime', 'Eating time (s)', 0.2, 3.5, 0.1],
    ['startBlue', 'Starting blue blobs ↺', 0, 90, 1],
  ]],
  ['Red blobs', [
    ['redEnergyUse', 'Energy use', 0.4, 4.5, 0.1],
    ['redSpeed', 'Speed', 10, 75, 1],
    ['redVision', 'Vision range', 30, 240, 2],
    ['redContact', 'Contact strength', 4, 45, 1],
    ['redCopy', 'Copy threshold (energy)', 50, 108, 1],
    ['redPause', 'Pause after contact (s)', 0.1, 4, 0.1],
    ['startRed', 'Starting red blobs ↺', 0, 60, 1],
  ]],
  ['World', [
    ['worldSize', 'World size ↺', 90, 230, 5],
    ['simSpeed', 'Simulation speed', 0.25, 4, 0.25],
  ]],
];

let params = { ...DEFAULTS };
let world = createWorld(params);
let playing = true;
let rotation = 0.6, rotVel = 0;
let selectedId = null;
let particles = [];
let history = [];
let histTimer = 0;
let activePreset = 'Balanced garden';

// ---------- controls UI ----------
const ctlInputs = {};
function buildControls() {
  const host = $('controls');
  host.innerHTML = '';
  for (const [gname, items] of GROUPS) {
    const g = document.createElement('div'); g.className = 'group';
    g.innerHTML = `<h3>${gname}</h3>`;
    for (const [key, label, min, max, step] of items) {
      const div = document.createElement('div'); div.className = 'ctl';
      div.innerHTML = `<label>${label}<output id="out-${key}"></output></label>
        <input type="range" id="ctl-${key}" min="${min}" max="${max}" step="${step}" value="${params[key]}">`;
      g.appendChild(div);
      const input = div.querySelector('input');
      ctlInputs[key] = input;
      input.addEventListener('input', () => {
        params[key] = parseFloat(input.value);
        world.p[key] = params[key];
        syncOutputs();
        if (key === 'simSpeed') { $('ctl-simSpeed-top').value = input.value; $('speed-val').textContent = `${params.simSpeed}×`; }
      });
    }
    host.appendChild(g);
  }
  const seedDiv = document.createElement('div'); seedDiv.className = 'ctl';
  seedDiv.innerHTML = `<label>Random seed ↺<output></output></label>
    <input type="number" id="ctl-seed" value="${params.seed}" step="1">`;
  host.lastElementChild.appendChild(seedDiv);
  seedDiv.querySelector('input').addEventListener('change', (e) => {
    params.seed = parseInt(e.target.value || '0', 10) >>> 0;
  });
  ctlInputs.seed = seedDiv.querySelector('input');
  syncOutputs();
}
function syncOutputs() {
  for (const key of Object.keys(ctlInputs)) {
    const out = $(`out-${key}`);
    if (out) out.textContent = params[key];
    if (ctlInputs[key] && document.activeElement !== ctlInputs[key]) ctlInputs[key].value = params[key];
  }
}

function buildPresets() {
  const host = $('presets'); host.innerHTML = '';
  for (const name of Object.keys(PRESETS)) {
    const b = document.createElement('button');
    b.className = 'preset' + (name === activePreset ? ' active' : '');
    b.textContent = name;
    b.onclick = () => {
      activePreset = name;
      params = { ...DEFAULTS, ...PRESETS[name], seed: params.seed, simSpeed: params.simSpeed };
      buildControls(); buildPresets(); resetWorld();
    };
    host.appendChild(b);
  }
}

function resetWorld() {
  world = createWorld(params);
  history = []; particles = []; selectedId = null; histTimer = 0;
  record(); updateStats(); updateSummary();
  $('inspector').classList.add('hidden');
}

// ---------- transport ----------
$('btn-play').onclick = () => setPlaying(!playing);
function setPlaying(v) { playing = v; $('btn-play').textContent = playing ? '⏸ Pause' : '▶ Play'; }
$('btn-step').onclick = () => { setPlaying(false); advance(0.5); };
$('btn-reset').onclick = () => resetWorld();
$('btn-random').onclick = () => {
  params.seed = Math.floor(Math.random() * 999999);
  params.fruitGrowth = +(0.25 + Math.random() * 1.2).toFixed(2);
  params.fruitLimit = 3 + Math.floor(Math.random() * 8);
  params.startTrees = 8 + Math.floor(Math.random() * 12);
  params.startBlue = 16 + Math.floor(Math.random() * 30);
  params.startRed = 3 + Math.floor(Math.random() * 14);
  params.blueSpeed = 26 + Math.floor(Math.random() * 20);
  params.redSpeed = 30 + Math.floor(Math.random() * 20);
  params.redContact = 14 + Math.floor(Math.random() * 16);
  activePreset = '';
  buildControls(); buildPresets(); resetWorld();
};
$('ctl-simSpeed-top').addEventListener('input', (e) => {
  params.simSpeed = parseFloat(e.target.value);
  world.p.simSpeed = params.simSpeed;
  $('speed-val').textContent = `${params.simSpeed}×`;
  if (ctlInputs.simSpeed) ctlInputs.simSpeed.value = params.simSpeed;
  syncOutputs();
});

// ---------- history, stats, summary ----------
function record() {
  const c = counts(world);
  history.push({ t: world.time, ...c });
  if (history.length > 1600) history.splice(0, history.length - 1600);
}
function updateStats() {
  const c = counts(world);
  $('st-fruit').textContent = c.fruit;
  $('st-blue').textContent = c.blue;
  $('st-red').textContent = c.red;
  $('st-time').textContent = Math.floor(world.time / 10);
}
function updateSummary() {
  const el = $('summary');
  if (history.length < 12) { el.textContent = 'The garden is waking up… blues are looking for their first fruit.'; return; }
  const now = history[history.length - 1];
  const peakB = Math.max(...history.map(h => h.blue));
  const peakR = Math.max(...history.map(h => h.red));
  const tPeakB = history.find(h => h.blue === peakB).t;
  const tPeakR = history.find(h => h.red === peakR).t;
  const recent = history.slice(-30);
  const avgFruit = recent.reduce((s, h) => s + h.fruit, 0) / recent.length;
  let msg;
  if (now.blue === 0 && now.red === 0) msg = 'The garden has gone quiet — both groups faded. Try more fruit, gentler reds, or press Reset for a fresh start.';
  else if (now.blue === 0) msg = 'Blue blobs faded out, so reds have nothing left to sip — watch them slowly run low on energy too. Reset with more fruit or faster blues.';
  else if (now.red === 0) msg = `Red blobs faded and the world settled into a simpler state: ${now.blue} blue blobs living on fruit alone${avgFruit < 8 ? ', kept small by scarce fruit' : ''}. Add reds on Reset to restart the dance.`;
  else if (avgFruit < 7 && now.blue < 28) msg = 'Low fruit is keeping the whole garden small — every blob lives close to the trees and growth stays gentle.';
  else if (tPeakB < tPeakR) msg = `Blue blobs grew first (peak ${peakB}), then red blobs followed (peak ${peakR}) — the classic chase. Right now: ${now.blue} blue, ${now.red} red, ${now.fruit} fruit on the trees.`;
  else msg = `The garden stayed balanced so far, with blue and red rising and falling out of phase. Peaks: ${peakB} blue, ${peakR} red. Births ${world.births}, faded ${world.deaths}.`;
  el.textContent = msg;
}

// ---------- rendering ----------
const canvas = $('world'), ctx = canvas.getContext('2d');
let view = { w: 800, h: 500, cx: 400, cy: 260, scale: 2 };
function resize() {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = r.width * dpr; canvas.height = r.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view = { w: r.width, h: r.height, cx: r.width / 2, cy: r.height / 2 + 14, scale: Math.min(r.width, r.height * 1.5) / (world.p.worldSize * 2.35) };
}
window.addEventListener('resize', resize);

const TILT = 0.62;
function project(x, y) {
  const c = Math.cos(rotation), s = Math.sin(rotation);
  const rx = x * c - y * s, ry = x * s + y * c;
  return { sx: view.cx + rx * view.scale, sy: view.cy + ry * view.scale * TILT, depth: ry };
}

function drawWorld(now) {
  const { w, h, cx, cy, scale } = view;
  const R = world.p.worldSize;
  ctx.clearRect(0, 0, w, h);
  // dish shadow + rim + soil + grass
  ctx.fillStyle = 'rgba(40,70,35,.35)';
  ctx.beginPath(); ctx.ellipse(cx, cy + R * scale * TILT * 0.16 + 16, R * scale * 1.06, R * scale * TILT * 1.06, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#8a5a33';
  ctx.beginPath(); ctx.ellipse(cx, cy + 10, R * scale * 1.05, R * scale * TILT * 1.05 + 8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#a8743f';
  ctx.beginPath(); ctx.ellipse(cx, cy + 5, R * scale * 1.02, R * scale * TILT * 1.02 + 5, 0, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(cx, cy - 20, 10, cx, cy, R * scale);
  g.addColorStop(0, '#9ede7a'); g.addColorStop(0.7, '#74c453'); g.addColorStop(1, '#57a93c');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, cy, R * scale, R * scale * TILT, 0, 0, 7); ctx.fill();
  // grass speckles (stable positions via seed-less hash)
  ctx.fillStyle = 'rgba(255,255,255,.20)';
  for (let i = 0; i < 46; i++) {
    const a = i * 2.39996 + rotation, rr = ((i * 37) % 100) / 100 * R * 0.92;
    const px = cx + Math.cos(a) * rr * scale, py = cy + Math.sin(a) * rr * scale * TILT;
    ctx.beginPath(); ctx.ellipse(px, py, 3.2, 1.7, 0, 0, 7); ctx.fill();
  }

  // depth-sorted drawables
  const items = [];
  for (const t of world.trees) items.push({ kind: 'tree', o: t, ...project(t.x, t.y) });
  for (const b of world.blobs) items.push({ kind: 'blob', o: b, ...project(b.x, b.y) });
  items.sort((a, b2) => a.depth - b2.depth);
  for (const it of items) {
    if (it.kind === 'tree') drawTree(it.o, it.sx, it.sy, now);
    else drawBlob(it.o, it.sx, it.sy);
  }
  // particles
  for (const pt of particles) {
    const pr = project(pt.x, pt.y);
    ctx.globalAlpha = Math.max(0, pt.life);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pr.sx + pt.ox, pr.sy - 14 - (1 - pt.life) * 22 + pt.oy, pt.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

const FRUIT_SPOTS = [[-9,-26],[7,-30],[0,-20],[-13,-18],[12,-21],[-4,-33],[10,-15],[-11,-30],[4,-26],[-6,-14],[14,-27],[0,-36],[-15,-24],[8,-19]];
function drawTree(t, sx, sy, now) {
  const s = view.scale * t.scale * (1 - t.eatenFlash * 0.06);
  const sway = Math.sin(now / 900 + t.sway) * 1.6;
  ctx.fillStyle = 'rgba(30,60,25,.30)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 3, 15 * s, 5 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#7a4a26';
  ctx.fillRect(sx - 2.6 * s + sway * 0.3, sy - 15 * s, 5.2 * s, 16 * s);
  const canopy = [[0, -27, 14], [-10, -20, 10], [10, -20, 10]];
  for (const [ox, oy, r] of canopy) {
    const cg = ctx.createRadialGradient(sx + (ox - 4) * s + sway, sy + (oy - 4) * s, 2, sx + ox * s + sway, sy + oy * s, r * s);
    cg.addColorStop(0, '#7ed957'); cg.addColorStop(1, '#3f9e36');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(sx + ox * s + sway, sy + oy * s, r * s, 0, 7); ctx.fill();
  }
  const n = Math.floor(t.fruit);
  for (let i = 0; i < n && i < FRUIT_SPOTS.length; i++) {
    const [ox, oy] = FRUIT_SPOTS[i];
    const fx = sx + ox * s + sway, fy = sy + oy * s;
    ctx.fillStyle = '#c6f542';
    ctx.beginPath(); ctx.arc(fx, fy, 3.1 * s, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath(); ctx.arc(fx - 1 * s, fy - 1 * s, 1.1 * s, 0, 7); ctx.fill();
  }
  if (t.fruit < world.p.fruitLimit && t.sinceEaten >= world.p.fruitDelay) {
    const frac = t.fruit % 1;
    if (frac > 0.15 && n < FRUIT_SPOTS.length) {
      const [ox, oy] = FRUIT_SPOTS[n];
      ctx.globalAlpha = 0.65; ctx.fillStyle = '#c6f542';
      ctx.beginPath(); ctx.arc(sx + ox * s + sway, sy + oy * s, 3.1 * s * frac, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawBlob(b, sx, sy) {
  const s = view.scale * 0.62;
  const isBlue = b.type === 'blue';
  const chewing = b.state === 'eat', pausing = b.state === 'pause';
  const hopY = Math.abs(Math.sin(b.hop)) * (chewing || pausing ? 1.5 : 4.5) * s;
  const squash = chewing ? 1 + Math.sin(b.hop * 6) * 0.08 : 1 + Math.sin(b.hop * 2) * 0.05;
  const bw = 11 * s * squash, bh = 12.5 * s / squash;
  const by = sy - hopY;
  // shadow
  ctx.fillStyle = 'rgba(25,50,20,.32)';
  ctx.beginPath(); ctx.ellipse(sx, sy + 3, bw * (1 - hopY * 0.012), bw * 0.36, 0, 0, 7); ctx.fill();
  // selection ring
  if (b.id === selectedId) {
    ctx.strokeStyle = '#ffcf3f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(sx, sy + 3, bw + 6, (bw + 6) * 0.38, 0, 0, 7); ctx.stroke();
  }
  // glow on energy gain
  if (b.glow > 0.05) {
    ctx.globalAlpha = b.glow * 0.5; ctx.fillStyle = isBlue ? '#bfe9ff' : '#ffd2b8';
    ctx.beginPath(); ctx.arc(sx, by - bh * 0.4, bw * 1.5, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
  }
  // body (glossy bean, leaning with movement)
  ctx.save();
  ctx.translate(sx, by); ctx.rotate(b.lean * 0.18);
  const bg = ctx.createRadialGradient(-bw * 0.35, -bh * 0.75, 2, 0, -bh * 0.35, bw * 1.5);
  if (isBlue) { bg.addColorStop(0, '#aee3ff'); bg.addColorStop(0.45, '#4db2ef'); bg.addColorStop(1, '#2679c4'); }
  else { bg.addColorStop(0, '#ffc4b8'); bg.addColorStop(0.45, '#ff7a66'); bg.addColorStop(1, '#d83a2c'); }
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(0, -bh * 0.42, bw, bh, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.ellipse(-bw * 0.38, -bh * 0.95, bw * 0.3, bh * 0.34, -0.5, 0, 7); ctx.fill();
  // face
  const tired = b.energy < 28;
  const eyeY = -bh * 0.62, eyeDx = bw * 0.36;
  ctx.fillStyle = '#20303c';
  if (b.blinkT > 0 || pausing) {
    ctx.fillRect(-eyeDx - 2 * s, eyeY, 4 * s, 1.4 * s); ctx.fillRect(eyeDx - 2 * s, eyeY, 4 * s, 1.4 * s);
  } else {
    ctx.beginPath(); ctx.arc(-eyeDx, eyeY, 2.1 * s, 0, 7); ctx.arc(eyeDx, eyeY, 2.1 * s, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-eyeDx + 0.7 * s, eyeY - 0.7 * s, 0.8 * s, 0, 7); ctx.arc(eyeDx + 0.7 * s, eyeY - 0.7 * s, 0.8 * s, 0, 7); ctx.fill();
  }
  ctx.strokeStyle = '#20303c'; ctx.lineWidth = 1.6 * s; ctx.lineCap = 'round';
  ctx.beginPath();
  if (chewing) ctx.arc(0, -bh * 0.3, 2.6 * s + Math.sin(b.hop * 6) * 0.8 * s, 0, 7);
  else if (tired) ctx.arc(0, -bh * 0.16, 3 * s, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(0, -bh * 0.38, 3.4 * s, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,150,160,.5)';
  ctx.beginPath(); ctx.arc(-bw * 0.55, -bh * 0.34, 2.2 * s, 0, 7); ctx.arc(bw * 0.55, -bh * 0.34, 2.2 * s, 0, 7); ctx.fill();
  ctx.restore();
  // tiny energy pip when selected or tired
  if (b.id === selectedId || tired) {
    const pw = 26;
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(sx - pw / 2, by - bh * 2 - 10, pw, 5);
    ctx.fillStyle = tired ? '#e05348' : '#7ac74f';
    ctx.fillRect(sx - pw / 2, by - bh * 2 - 10, pw * Math.max(0, b.energy / MAX_ENERGY), 5);
  }
}

// ---------- charts ----------
function setupChart(id) {
  const c = $(id); const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = c.getBoundingClientRect();
  c.width = r.width * dpr; c.height = c.getAttribute('height') * dpr;
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w: r.width, h: parseFloat(c.getAttribute('height')) };
}
function drawMainChart() {
  const { g, w, h } = setupChart('chart-main');
  g.clearRect(0, 0, w, h);
  if (history.length < 2) return;
  const padL = 34, padR = 8, padT = 10, padB = 18;
  const iw = w - padL - padR, ih = h - padT - padB;
  const maxV = Math.max(20, ...history.map(x => Math.max(x.fruit, x.blue, x.red))) * 1.08;
  const t0 = history[0].t, t1 = Math.max(history[history.length - 1].t, t0 + 1);
  g.strokeStyle = '#e8dfc2'; g.fillStyle = '#8a7d55'; g.font = '10px system-ui'; g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + ih - (ih * i) / 4;
    g.beginPath(); g.moveTo(padL, y); g.lineTo(w - padR, y); g.stroke();
    g.fillText(String(Math.round((maxV * i) / 4)), 4, y + 3);
  }
  g.fillText(`day ${Math.floor(t0 / 10)}`, padL, h - 4);
  const endLabel = `day ${Math.floor(t1 / 10)}`;
  g.fillText(endLabel, w - padR - g.measureText(endLabel).width, h - 4);
  const series = [['fruit', '#5da23a'], ['blue', '#2f8fd0'], ['red', '#e05348']];
  for (const [key, color] of series) {
    g.strokeStyle = color; g.lineWidth = 2.2; g.beginPath();
    history.forEach((pt, i) => {
      const x = padL + ((pt.t - t0) / (t1 - t0)) * iw;
      const y = padT + ih - (pt[key] / maxV) * ih;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    });
    g.stroke();
    const last = history[history.length - 1];
    const lx = padL + iw, ly = padT + ih - (last[key] / maxV) * ih;
    g.fillStyle = color; g.beginPath(); g.arc(lx - 2, ly, 3.5, 0, 7); g.fill();
  }
}
function drawPhase() {
  const { g, w, h } = setupChart('chart-phase');
  g.clearRect(0, 0, w, h);
  const pad = 30, iw = w - pad - 10, ih = h - pad - 10;
  const maxB = Math.max(20, ...history.map(x => x.blue)) * 1.1;
  const maxR = Math.max(12, ...history.map(x => x.red)) * 1.1;
  g.strokeStyle = '#ddd3ae'; g.strokeRect(pad, 8, iw, ih);
  g.fillStyle = '#8a7d55'; g.font = '10px system-ui';
  g.fillText('blue →', pad + iw - 38, h - 6); g.fillText('red', 4, 16);
  g.fillText(String(Math.round(maxB)), pad + iw - 14, h - 18);
  g.fillText(String(Math.round(maxR)), 4, 30);
  if (history.length < 2) return;
  const trail = history.slice(-420);
  trail.forEach((pt, i) => {
    const x = pad + (pt.blue / maxB) * iw, y = 8 + ih - (pt.red / maxR) * ih;
    g.globalAlpha = 0.12 + 0.8 * (i / trail.length);
    g.fillStyle = '#2a9d8f';
    g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill();
  });
  g.globalAlpha = 1;
  const last = history[history.length - 1];
  g.fillStyle = '#22301f';
  g.beginPath(); g.arc(pad + (last.blue / maxB) * iw, 8 + ih - (last.red / maxR) * ih, 4.5, 0, 7); g.fill();
}
function drawTraits() {
  const { g, w, h } = setupChart('chart-traits');
  g.clearRect(0, 0, w, h);
  if (history.length < 2) return;
  const padL = 30, iw = w - padL - 8, ih = h - 26;
  const lo = 0.65, hi = 1.5;
  g.strokeStyle = '#e8dfc2'; g.fillStyle = '#8a7d55'; g.font = '10px system-ui';
  for (const v of [0.75, 1.0, 1.25]) {
    const y = 8 + ih - ((v - lo) / (hi - lo)) * ih;
    g.beginPath(); g.moveTo(padL, y); g.lineTo(w - 8, y); g.stroke();
    g.fillText(v.toFixed(2), 2, y + 3);
  }
  const t0 = history[0].t, t1 = Math.max(history[history.length - 1].t, t0 + 1);
  const lines = [['bSpeed', '#2f8fd0', 'blue speed'], ['rSpeed', '#e05348', 'red speed'], ['bVis', '#7ec8f7', 'blue vision'], ['rVis', '#ff9d94', 'red vision']];
  lines.forEach(([key, color], li) => {
    g.strokeStyle = color; g.lineWidth = li < 2 ? 2 : 1.4; g.beginPath(); let started = false;
    for (const pt of history) {
      if (!pt[key]) { started = false; continue; }
      const x = padL + ((pt.t - t0) / (t1 - t0)) * iw;
      const y = 8 + ih - ((Math.min(hi, Math.max(lo, pt[key])) - lo) / (hi - lo)) * ih;
      started ? g.lineTo(x, y) : g.moveTo(x, y); started = true;
    }
    g.stroke();
  });
  g.fillStyle = '#2f8fd0'; g.fillText('— blue speed/vision', padL + 4, h - 6);
  g.fillStyle = '#e05348'; g.fillText('— red speed/vision', padL + 118, h - 6);
}

// ---------- inspector ----------
const STATE_LABEL = { wander: 'Wandering', 'seek-fruit': 'Looking for fruit', eat: 'Chewing fruit', flee: 'Fleeing a red!', chase: 'Chasing a blue', pause: 'Digesting…' };
function updateInspector() {
  const el = $('inspector');
  const b = world.blobs.find(x => x.id === selectedId);
  if (!b) { el.classList.add('hidden'); if (selectedId !== null) selectedId = null; return; }
  const isBlue = b.type === 'blue';
  const speed = (isBlue ? world.p.blueSpeed : world.p.redSpeed) * b.traits.speed;
  const vision = (isBlue ? world.p.blueVision : world.p.redVision) * b.traits.vision;
  const timed = (b.state === 'eat' || b.state === 'pause') ? `${Math.max(0, b.stateT).toFixed(1)}s left` : '—';
  el.innerHTML = `<button id="insp-close" title="Close">✕</button>
    <h3>${isBlue ? '🔵 Blue blob' : '🔴 Red blob'} #${b.id}</h3>
    <div class="bar"><i style="width:${Math.max(0, Math.min(100, (b.energy / MAX_ENERGY) * 100))}%;background:${isBlue ? '#4db2ef' : '#ff7a66'}"></i></div>
    <div class="row"><span>Energy</span><b>${b.energy.toFixed(0)} / ${MAX_ENERGY}</b></div>
    <div class="row"><span>Doing</span><b>${STATE_LABEL[b.state] || b.state}</b></div>
    <div class="row"><span>Timer</span><b>${timed}</b></div>
    <div class="row"><span>Age</span><b>${b.age.toFixed(0)}s · gen ${b.gen}</b></div>
    <div class="row"><span>Speed trait</span><b>${speed.toFixed(0)} (×${b.traits.speed.toFixed(2)})</b></div>
    <div class="row"><span>Vision trait</span><b>${vision.toFixed(0)} (×${b.traits.vision.toFixed(2)})</b></div>
    <div class="row"><span>Metabolism</span><b>×${b.traits.metab.toFixed(2)}</b></div>
    <div class="row"><span>Parent</span><b>${b.parentId ? '#' + b.parentId : 'founder'}</b></div>`;
  el.classList.remove('hidden');
  $('insp-close').onclick = () => { selectedId = null; el.classList.add('hidden'); };
}

// ---------- pointer: drag to rotate, click to inspect ----------
let dragging = false, lastPX = 0, dragMoved = 0, downX = 0, downY = 0;
canvas.addEventListener('pointerdown', (e) => {
  dragging = true; lastPX = e.clientX; dragMoved = 0; downX = e.clientX; downY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastPX; lastPX = e.clientX;
  dragMoved += Math.abs(dx);
  rotVel = dx * 0.0035; rotation += rotVel;
});
canvas.addEventListener('pointerup', (e) => {
  dragging = false;
  if (dragMoved < 6 && Math.hypot(e.clientX - downX, e.clientY - downY) < 8) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    let best = null, bestD = 1e9;
    for (const b of world.blobs) {
      const pr = project(b.x, b.y);
      const d = Math.hypot(pr.sx - mx, pr.sy - 10 - my);
      if (d < bestD) { bestD = d; best = b; }
    }
    selectedId = best && bestD < 26 ? best.id : null;
    updateInspector();
  }
});

// ---------- main loop ----------
function spawnParticles() {
  for (const ev of world.events) {
    const conf = {
      eat: ['#c6f542', 6], hit: ['#ffb14d', 7],
      birth: [ev.color === 'blue' ? '#7ec8f7' : '#ff9d94', 8],
      death: ['#cfd8c8', 6],
    }[ev.type];
    if (!conf) continue;
    for (let i = 0; i < conf[1]; i++) {
      particles.push({ x: ev.x, y: ev.y, ox: (Math.random() - 0.5) * 22, oy: (Math.random() - 0.5) * 10, r: 1.6 + Math.random() * 2, life: 1, color: conf[0] });
    }
  }
  world.events.length = 0;
  if (particles.length > 500) particles.splice(0, particles.length - 500);
}
function advance(simDt) {
  const sub = Math.max(1, Math.ceil(simDt / (1 / 30)));
  const dt = simDt / sub;
  for (let i = 0; i < sub; i++) stepWorld(world, dt);
  spawnParticles();
  histTimer += simDt;
  if (histTimer >= 0.5) { histTimer = 0; record(); updateStats(); }
}
let lastTs = performance.now(), chartTimer = 0, summaryTimer = 0;
function frame(ts) {
  const realDt = Math.min(0.05, (ts - lastTs) / 1000); lastTs = ts;
  if (playing) advance(realDt * params.simSpeed);
  if (!dragging && Math.abs(rotVel) > 0.0002) { rotation += rotVel; rotVel *= 0.94; }
  for (const pt of particles) pt.life -= realDt * 1.4;
  particles = particles.filter(p => p.life > 0);
  drawWorld(ts);
  chartTimer += realDt; summaryTimer += realDt;
  if (chartTimer > 0.35) { chartTimer = 0; drawMainChart(); drawPhase(); drawTraits(); updateInspector(); }
  if (summaryTimer > 3) { summaryTimer = 0; updateSummary(); }
  requestAnimationFrame(frame);
}

buildPresets();
buildControls();
resetWorld();
resize();
setPlaying(true);
requestAnimationFrame(frame);
