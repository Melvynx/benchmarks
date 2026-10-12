import './style.css';
import { Sim, DEFAULTS, PRESETS } from './sim.js';
import { WorldView } from './render.js';
import { drawMain, drawPhase, drawTraits } from './charts.js';

const DT = 0.05;
const SPEEDS = [0, 0.5, 1, 2, 4, 8];
const SPEED_LABELS = ['0×', '½×', '1×', '2×', '4×', '8×'];

const GROUPS = [
  {
    title: 'Fruit trees',
    cls: 'fruit',
    color: '#7cc94a',
    items: [
      ['fruitGrowth', 'Fruit growth speed', 0.02, 0.5, 0.01, (v) => v.toFixed(2) + '/s'],
      ['fruitLimit', 'Fruit limit per tree', 1, 14, 1, (v) => v],
      ['fruitDelay', 'Fruit return delay', 0, 30, 0.5, (v) => v + 's'],
      ['trees', 'Starting fruit trees', 1, 30, 1, (v) => v, true],
    ],
  },
  {
    title: 'Blue blobs',
    cls: 'blue',
    color: '#2f86ff',
    items: [
      ['blueUse', 'Energy use', 0.3, 2.5, 0.05, (v) => v.toFixed(2) + '×'],
      ['blueSpeed', 'Speed', 1, 10, 0.1, (v) => v.toFixed(1)],
      ['blueVision', 'Vision', 4, 30, 0.5, (v) => v.toFixed(1)],
      ['blueCopy', 'Copy threshold', 45, 115, 1, (v) => v + ' e'],
      ['blueEat', 'Eating time', 0.3, 5, 0.1, (v) => v.toFixed(1) + 's'],
      ['blues', 'Starting blobs', 0, 80, 1, (v) => v, true],
    ],
  },
  {
    title: 'Red blobs',
    cls: 'red',
    color: '#f0405a',
    items: [
      ['redUse', 'Energy use', 0.3, 2.5, 0.05, (v) => v.toFixed(2) + '×'],
      ['redSpeed', 'Speed', 1, 10, 0.1, (v) => v.toFixed(1)],
      ['redVision', 'Vision', 4, 30, 0.5, (v) => v.toFixed(1)],
      ['redContact', 'Contact strength', 5, 60, 1, (v) => v + ' e'],
      ['redCopy', 'Copy threshold', 45, 115, 1, (v) => v + ' e'],
      ['redPause', 'Pause time', 0.3, 8, 0.1, (v) => v.toFixed(1) + 's'],
      ['reds', 'Starting blobs', 0, 60, 1, (v) => v, true],
    ],
  },
  {
    title: 'World',
    cls: 'world',
    color: '#ff9f43',
    items: [['worldSize', 'World size', 30, 80, 1, (v) => v, true]],
  },
];

const $ = (id) => document.getElementById(id);
const params = { ...DEFAULTS };
let sim = new Sim(params);
const view = new WorldView($('world'), sim);
let running = false;
let acc = 0;
let speedIdx = 2;
let activePreset = 'balanced';
let pendingReset = false;
let lastTs = performance.now();
let lastUi = 0;

// ---------- controls ----------
const inputs = {};
const outs = {};
const controls = $('controls');
for (const g of GROUPS) {
  const h = document.createElement('h3');
  h.innerHTML = `<i style="background:${g.color}"></i>${g.title}`;
  controls.appendChild(h);
  const wrap = document.createElement('div');
  wrap.className = 'grp-' + g.cls;
  for (const [key, label, min, max, step, fmt, reset] of g.items) {
    const d = document.createElement('div');
    d.className = 'ctl';
    d.innerHTML = `<label for="c-${key}">${label}${reset ? '<span class="tag">on reset</span>' : ''}</label><output id="o-${key}"></output><input id="c-${key}" type="range" min="${min}" max="${max}" step="${step}" />`;
    wrap.appendChild(d);
    const inp = d.querySelector('input');
    const out = d.querySelector('output');
    inputs[key] = inp;
    outs[key] = [out, fmt];
    inp.addEventListener('input', () => {
      params[key] = Number(inp.value);
      out.textContent = fmt(params[key]);
      clearPreset();
      if (reset) {
        pendingReset = true;
      } else sim.setParams({ [key]: params[key] });
    });
  }
  controls.appendChild(wrap);
}
{
  const h = document.createElement('h3');
  h.innerHTML = '<i style="background:#a08bd8"></i>Randomness';
  controls.appendChild(h);
  const d = document.createElement('div');
  d.className = 'ctl';
  d.innerHTML = `<label for="c-seed">Random seed<span class="tag">on reset</span></label><output></output><div class="seed-row"><input id="c-seed" type="number" min="1" max="999999" step="1" /><button id="btn-dice" title="Pick a new seed">Dice</button></div>`;
  controls.appendChild(d);
  inputs.seed = d.querySelector('input');
  inputs.seed.addEventListener('change', () => {
    params.seed = Math.max(1, Math.floor(Number(inputs.seed.value) || 1));
    inputs.seed.value = params.seed;
    clearPreset();
    pendingReset = true;
  });
  d.querySelector('#btn-dice').addEventListener('click', () => {
    params.seed = 1 + Math.floor(Math.random() * 99999);
    inputs.seed.value = params.seed;
    doReset();
  });
}

function syncInputs() {
  for (const k of Object.keys(inputs)) {
    if (k === 'seed') {
      inputs.seed.value = params.seed;
      continue;
    }
    inputs[k].value = params[k];
    const [out, fmt] = outs[k];
    out.textContent = fmt(params[k]);
  }
  $('sim-speed').value = speedIdx;
  $('sim-speed-out').textContent = SPEED_LABELS[speedIdx];
}

// ---------- presets ----------
const presetBox = $('presets');
for (const [key, pr] of Object.entries(PRESETS)) {
  const b = document.createElement('button');
  b.className = 'preset';
  b.dataset.key = key;
  b.textContent = pr.label;
  b.addEventListener('click', () => applyPreset(key));
  presetBox.appendChild(b);
}
function markPreset() {
  for (const b of presetBox.children) b.classList.toggle('active', b.dataset.key === activePreset);
}
function clearPreset() {
  if (activePreset) {
    activePreset = null;
    markPreset();
  }
}
function applyPreset(key) {
  const keep = { seed: params.seed };
  Object.assign(params, DEFAULTS, keep, PRESETS[key].p);
  activePreset = key;
  markPreset();
  doReset();
  syncInputs();
}

// ---------- transport ----------
function setRunning(v) {
  running = v;
  $('btn-play').textContent = v ? 'Pause' : 'Play';
  if (v && pendingReset) doReset();
}
function doReset() {
  pendingReset = false;
  sim = new Sim(params);
  view.setSim(sim);
  acc = 0;
  banner(null);
  syncInputs();
  renderInspector(true);
  updateUi(true);
}
function stepOnce() {
  if (pendingReset) doReset();
  for (const b of sim.blobs) {
    b.px = b.x;
    b.py = b.y;
  }
  for (let i = 0; i < 20; i++) sim.step(DT);
  view.consumeEvents(sim.events);
  view.alpha = 1;
  updateUi(true);
}
$('btn-play').addEventListener('click', () => setRunning(!running));
$('btn-step').addEventListener('click', () => {
  setRunning(false);
  stepOnce();
});
$('btn-reset').addEventListener('click', doReset);
$('btn-random').addEventListener('click', () => {
  const r = (a, b) => a + Math.random() * (b - a);
  params.seed = 1 + Math.floor(Math.random() * 99999);
  params.trees = Math.round(r(8, 20));
  params.blues = Math.round(r(14, 40));
  params.reds = Math.round(r(3, 14));
  params.worldSize = Math.round(r(40, 58));
  params.fruitGrowth = +r(0.08, 0.22).toFixed(2);
  params.fruitLimit = Math.round(r(4, 9));
  params.redContact = Math.round(r(24, 40));
  clearPreset();
  doReset();
});
$('sim-speed').addEventListener('input', (e) => {
  speedIdx = Number(e.target.value);
  params.simSpeed = SPEEDS[speedIdx];
  $('sim-speed-out').textContent = SPEED_LABELS[speedIdx];
});
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type !== 'range') return;
  if (e.code === 'Space') {
    e.preventDefault();
    setRunning(!running);
  }
});

// ---------- inspector ----------
const insp = $('inspector');
const fmt1 = (v) => v.toFixed(1);
function renderInspector(force) {
  const id = view.selected;
  const b = id != null ? sim.blobs.find((o) => o.id === id) : null;
  if (id == null) {
    if (force || insp.dataset.k !== 'none') {
      insp.dataset.k = 'none';
      insp.innerHTML = '<h2>Inspector</h2><p class="empty">Click a blob on the map to see how it is doing.</p>';
    }
    return;
  }
  if (!b) {
    insp.dataset.k = 'gone';
    insp.innerHTML = `<h2>Inspector</h2><p class="empty">Blob #${id} is gone.</p><button id="insp-clear">Clear</button>`;
    $('insp-clear').onclick = () => {
      view.selected = null;
      renderInspector(true);
    };
    return;
  }
  const maxE = 120;
  const timer = b.timer > 0 ? b.timer : 0;
  const cop = b.kind === 'blue' ? params.blueCopy : params.redCopy;
  const parent = b.parent != null ? `<button class="linkish" data-pick="${b.parent}">#${b.parent}</button>` : 'founder';
  const timerLabel = b.kind === 'blue' ? 'Eating' : 'Pause';
  insp.dataset.k = 'blob' + id;
  insp.innerHTML = `
    <div class="insp-head"><span class="swatch ${b.kind}"></span><div><div class="insp-title">${b.kind === 'blue' ? 'Blue' : 'Red'} blob #${b.id}</div><div class="insp-sub">${b.action}</div></div></div>
    <dl class="kv">
      <dt>Energy</dt><dd>${Math.round(b.energy)} / ${maxE}</dd>
    </dl>
    <div class="bar energy"><i style="width:${Math.min(100, (b.energy / maxE) * 100)}%"></i></div>
    <dl class="kv">
      <dt>Copies at</dt><dd>${cop} energy</dd>
      <dt>Age</dt><dd>${b.age.toFixed(0)}s</dd>
      <dt>Speed</dt><dd>${fmt1(b.speedNow)} of ${fmt1(sim.speedOf(b))}</dd>
      <dt>Sensing range</dt><dd>${fmt1(sim.visionOf(b))}</dd>
      <dt>${timerLabel} time left</dt><dd>${timer > 0 ? timer.toFixed(1) + 's' : '–'}</dd>
    </dl>
    <div class="bar timer"><i style="width:${timer > 0 && b.timerMax ? (timer / b.timerMax) * 100 : 0}%"></i></div>
    <dl class="kv">
      <dt>Speed trait</dt><dd>${b.tSpeed.toFixed(2)}×</dd>
      <dt>Vision trait</dt><dd>${b.tVision.toFixed(2)}×</dd>
      <dt>Parent</dt><dd>${parent}</dd>
      <dt>Generation</dt><dd>${b.gen}</dd>
      <dt>Children</dt><dd>${b.children}</dd>
    </dl>`;
}
insp.addEventListener('click', (e) => {
  const t = e.target.closest('[data-pick]');
  if (t) {
    const id = Number(t.dataset.pick);
    if (sim.blobs.some((o) => o.id === id)) view.selected = id;
    else insp.querySelector('.insp-sub').textContent = 'parent has faded away';
  }
});
view.onSelect = () => renderInspector(true);

// ---------- summary ----------
function summarize() {
  const h = sim.history;
  const last = h[h.length - 1];
  const items = [];
  if (h.length < 20) return { items: ['Press play and let the garden run for a bit.'], stats: null };
  let bp = h[0],
    rp = h[0],
    fMin = Infinity;
  for (const s of h) {
    if (s.blue > bp.blue) bp = s;
    if (s.red > rp.red) rp = s;
    fMin = Math.min(fMin, s.fruit);
  }
  const half = h.slice(Math.floor(h.length / 2));
  const avg = (a, k) => a.reduce((x, s) => x + s[k], 0) / a.length;
  const mean = (k) => avg(half, k);
  const sd = (k) => Math.sqrt(avg(half.map((s) => ({ v: (s[k] - mean(k)) ** 2 })), 'v'));
  const bStart = h[0].blue;
  const recentBlue = mean('blue'),
    recentRed = mean('red');

  if (last.blue === 0 && last.red === 0) items.push('Both groups faded. Only the trees are left.');
  else if (last.blue === 0) items.push('Blue blobs died out, and the red blobs followed.');
  else if (last.red === 0) items.push(`The red blobs faded out. Blue blobs settled at about ${Math.round(recentBlue)} with fruit to spare.`);
  else {
    if (bp.t < rp.t - 5 && bp.blue > bStart * 1.3) items.push(`Blue blobs grew first (peak ${bp.blue} at ${fmtT(bp.t)}), then red blobs followed (peak ${rp.red} at ${fmtT(rp.t)}).`);
    else items.push(`Blue peaked at ${bp.blue} (${fmtT(bp.t)}), red peaked at ${rp.red} (${fmtT(rp.t)}).`);
    const cvB = sd('blue') / Math.max(1, recentBlue),
      cvR = sd('red') / Math.max(1, recentRed);
    if (h[h.length - 1].t > 240) {
      if (cvB < 0.12 && cvR < 0.2) items.push('The garden stayed balanced: both groups levelled out.');
      else if (cvB > 0.25) items.push('Both groups keep rising and falling in waves, with red trailing blue.');
      else items.push('The groups wobble a little but stay in the same range.');
    }
  }
  if (last.blue + last.red < 12 && last.blue + last.red > 0 && fMin < Infinity && avg(half, 'fruit') < sim.trees.length * 1.2) items.push('Low fruit kept the garden small.');
  if (last.blue > 0 && last.red > 0 && last.red > last.blue * 1.2) items.push('Red blobs outnumber blue blobs; blue is under pressure.');
  const fr = last.fruit / Math.max(1, sim.trees.length * Math.round(params.fruitLimit));
  items.push(fr > 0.6 ? 'The trees are heavy with fruit.' : fr < 0.15 ? 'The trees are nearly bare.' : 'Trees are partly picked and slowly regrowing.');
  return {
    items: items.slice(0, 4),
    stats: [
      [sim.eaten, 'fruit eaten'],
      [sim.contacts, 'contacts'],
      [`${sim.births.blue}/${sim.births.red}`, 'births b/r'],
      [`${sim.deaths.blue}/${sim.deaths.red}`, 'fades b/r'],
      [bp.blue, 'blue peak'],
      [rp.red, 'red peak'],
    ],
  };
}
function fmtT(t) {
  return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
}

// ---------- ui refresh ----------
function banner(msg) {
  const el = $('banner');
  el.hidden = !msg;
  if (msg) el.textContent = msg;
}
let extinctNoted = false;
function updateUi(force) {
  const st = sim.stats;
  $('hud-fruit').textContent = st.fruit;
  $('hud-blue').textContent = sim.blobs.reduce((n, b) => n + (b.kind === 'blue'), 0);
  $('hud-red').textContent = sim.blobs.reduce((n, b) => n + (b.kind === 'red'), 0);
  $('lg-fruit').textContent = st.fruit;
  $('lg-blue').textContent = $('hud-blue').textContent;
  $('lg-red').textContent = $('hud-red').textContent;
  $('clock').textContent = fmtT(sim.t);
  const nb = Number($('hud-blue').textContent),
    nr = Number($('hud-red').textContent);
  if (nb === 0 && nr === 0) banner('Everyone faded. Reset or pick a preset to try again.');
  else if (nb === 0) banner('No blue blobs left. Red will fade soon.');
  else if (nr === 0 && sim.t > 30 && sim.births.red + params.reds > 0 && sim.deaths.red > 0) banner('Red blobs have faded. Blue grows freely.');
  else banner(null);

  drawMain($('chart-main'), sim.history);
  drawPhase($('chart-phase'), sim.history);
  drawTraits($('chart-traits'), sim.history);
  const s = summarize();
  $('summary').innerHTML =
    '<h2>Run summary</h2><ul>' +
    s.items.map((t) => `<li>${t}</li>`).join('') +
    '</ul>' +
    (s.stats ? '<div class="stats">' + s.stats.map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join('') + '</div>' : '');
  renderInspector(force);
}

// ---------- main loop ----------
function frame(ts) {
  const real = Math.min(0.1, (ts - lastTs) / 1000);
  lastTs = ts;
  if (running && SPEEDS[speedIdx] > 0) {
    acc += real * SPEEDS[speedIdx];
    let n = 0;
    while (acc >= DT && n < 40) {
      for (const b of sim.blobs) {
        b.px = b.x;
        b.py = b.y;
      }
      sim.step(DT);
      acc -= DT;
      n++;
    }
    if (n === 40) acc = 0;
    view.consumeEvents(sim.events);
    view.alpha = Math.min(1, acc / DT);
    if (ts - lastUi > 250) {
      lastUi = ts;
      updateUi(false);
    }
  } else {
    view.alpha = 1;
    if (ts - lastUi > 500) {
      lastUi = ts;
      renderInspector(false);
    }
  }
  view.draw(real * (running ? Math.max(0.5, Math.min(2, SPEEDS[speedIdx])) : 0.6));
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => updateUi(false));
new ResizeObserver(() => updateUi(false)).observe($('chart-main').parentElement);

Object.assign(window, { __garden: { get sim() { return sim; }, view, setRunning, applyPreset } });

markPreset();
syncInputs();
updateUi(true);
requestAnimationFrame(frame);
