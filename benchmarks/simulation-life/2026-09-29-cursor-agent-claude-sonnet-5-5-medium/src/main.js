import './style.css';
import { Sim, BASE, PRESETS, PARAM_DEFS, MAXE } from './sim.js';
import { WorldView } from './render.js';
import { drawTimeline, drawPhase, drawTraits, summarize, fmtT } from './charts.js';

const DT = 0.05;
const $ = (id) => document.getElementById(id);
const params = { ...BASE };
let presetName = 'Balanced garden';
let playing = true;
let sim = new Sim(params);
const view = new WorldView($('world'));
let acc = 0, alpha = 1;

const controls = new Map();
const groupOrder = ['Fruit', 'Blue blobs', 'Red blobs', 'World'];
const groupCls = { Fruit: 'fruit', 'Blue blobs': 'blue', 'Red blobs': 'red', World: 'world' };
let resetTimer = 0;

function buildPanel() {
  const host = $('sliders');
  for (const gname of groupOrder) {
    const sec = document.createElement('section');
    sec.className = `sgroup ${groupCls[gname]}`;
    sec.innerHTML = `<h3>${gname}</h3>`;
    for (const d of PARAM_DEFS.filter((x) => x.g === gname)) {
      const wrap = document.createElement('div');
      wrap.className = `ctl ${d.cls || ''}`;
      const id = `p-${d.key}`;
      wrap.innerHTML = `<div class="top-row"><label for="${id}">${d.label}${d.reset ? '<span class="tag">restarts</span>' : ''}</label><output></output></div><input type="range" id="${id}" min="${d.min}" max="${d.max}" step="${d.step}" />`;
      if (d.tip) wrap.title = d.tip;
      const input = wrap.querySelector('input'), out = wrap.querySelector('output');
      input.addEventListener('input', () => {
        params[d.key] = Number(input.value);
        out.textContent = d.fmt(params[d.key]);
        setPreset(null);
        if (d.reset) { clearTimeout(resetTimer); resetTimer = setTimeout(doReset, 180); }
      });
      controls.set(d.key, { input, out, d });
      sec.appendChild(wrap);
    }
    host.appendChild(sec);
  }
  const box = $('presets');
  for (const name of Object.keys(PRESETS)) {
    const b = document.createElement('button');
    b.textContent = name; b.dataset.name = name;
    b.addEventListener('click', () => applyPreset(name));
    box.appendChild(b);
  }
  $('seed').addEventListener('change', (e) => { params.seed = Math.floor(Number(e.target.value)) || 0; doReset(); });
  $('visitors').addEventListener('change', (e) => { params.visitors = e.target.checked; });
}

function syncControls() {
  for (const { input, out, d } of controls.values()) {
    input.value = params[d.key];
    out.textContent = d.fmt(params[d.key]);
  }
  $('seed').value = params.seed;
  $('visitors').checked = !!params.visitors;
}

function setPreset(name) {
  presetName = name;
  document.querySelectorAll('#presets button').forEach((b) => b.classList.toggle('on', b.dataset.name === name));
}

function applyPreset(name) {
  const keep = { seed: params.seed, speed: params.speed, visitors: params.visitors };
  Object.assign(params, BASE, PRESETS[name], keep);
  syncControls(); setPreset(name); doReset();
}

function doReset() {
  clearTimeout(resetTimer);
  sim.reset(params);
  view.selectedId = null; view.parts.length = 0; view.anim.clear();
  acc = 0; alpha = 1; lastChartLen = -1;
  renderInspector(true);
  refreshCharts(true);
}

function randomize() {
  params.seed = Math.floor(Math.random() * 100000);
  params.trees = 10 + Math.floor(Math.random() * 16);
  params.blues = 20 + Math.floor(Math.random() * 50);
  params.reds = 2 + Math.floor(Math.random() * 10);
  syncControls(); setPreset(null); doReset();
}

const SPEEDS = [1, 2, 4, 8, 16, 32, 64];
function buildSpeed() {
  const host = $('speed');
  for (const s of SPEEDS) {
    const b = document.createElement('button');
    b.textContent = `${s}×`; b.dataset.s = s; b.setAttribute('aria-label', `Speed ${s} times`);
    b.addEventListener('click', () => { params.speed = s; markSpeed(); });
    host.appendChild(b);
  }
  markSpeed();
}
function markSpeed() { document.querySelectorAll('#speed button').forEach((b) => b.classList.toggle('on', Number(b.dataset.s) === params.speed)); }

function setPlaying(v) { playing = v; $('btn-play').textContent = v ? 'Pause' : 'Play'; }
$('btn-play').addEventListener('click', () => setPlaying(!playing));
$('btn-step').addEventListener('click', () => { setPlaying(false); for (let i = 0; i < 20; i++) sim.step(DT); alpha = 1; });
$('btn-reset').addEventListener('click', doReset);
$('btn-random').addEventListener('click', randomize);
$('btn-view').addEventListener('click', () => { view.yaw = 0.55; view.el = 0.92; view.zoom = 1; });
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
  if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
});

const cv = $('world');
let drag = null, toastTimer = 0;
cv.addEventListener('pointerdown', (e) => {
  cv.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, moved: 0 };
});
cv.addEventListener('pointermove', (e) => {
  const r = cv.getBoundingClientRect();
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    drag.x = e.clientX; drag.y = e.clientY;
    if (drag.moved > 5) {
      view.yaw += dx * 0.008;
      view.el = Math.min(1.35, Math.max(0.35, view.el + dy * 0.005));
      cv.classList.add('dragging');
    }
  } else {
    const b = view.pick(sim, e.clientX - r.left, e.clientY - r.top, alpha);
    view.hoverId = b ? b.id : null;
    cv.classList.toggle('hovering', !!b);
  }
});
cv.addEventListener('pointerup', (e) => {
  const wasClick = drag && drag.moved <= 5;
  drag = null; cv.classList.remove('dragging');
  if (wasClick) {
    const r = cv.getBoundingClientRect();
    const b = view.pick(sim, e.clientX - r.left, e.clientY - r.top, alpha);
    view.selectedId = b ? b.id : null;
    renderInspector(true);
  }
});
cv.addEventListener('pointerleave', () => { view.hoverId = null; });
cv.addEventListener('wheel', (e) => { e.preventDefault(); view.zoom = Math.min(2.4, Math.max(0.6, view.zoom * (e.deltaY < 0 ? 1.08 : 0.926))); }, { passive: false });
cv.addEventListener('dblclick', () => { view.yaw = 0.55; view.el = 0.92; view.zoom = 1; });

view.onSpecial = (e) => {
  const t = $('toast');
  t.textContent = `A lone ${e.c} wanderer arrived at the garden edge`;
  t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3200);
};

const ins = $('inspector');
let insId = null, insGoneAt = 0, insLast = null;
function findBlob(id) { return sim.blues.find((b) => b.id === id) || sim.reds.find((b) => b.id === id); }
function renderInspector(force) {
  const id = view.selectedId;
  if (id == null) { ins.hidden = true; insId = null; return; }
  const b = findBlob(id);
  if (b) { insLast = b; insGoneAt = 0; } else if (!insGoneAt) insGoneAt = performance.now();
  if (!b && insGoneAt && performance.now() - insGoneAt > 3500) { view.selectedId = null; ins.hidden = true; return; }
  const o = b || insLast;
  const col = o.kind === 'blue' ? '#2f7bff' : '#ee4347';
  const p = sim.p, sight = (o.kind === 'blue' ? p.blueVision : p.redVision) * o.vi, maxSp = (o.kind === 'blue' ? p.blueSpeed : p.redSpeed) * o.sp;
  const busy = b && b.busy > 0;
  const action = !b ? 'faded away' : busy ? b.busyKind : b.action;
  const timerTxt = busy ? `${b.busy.toFixed(1)}s of ${b.busyMax.toFixed(1)}s` : 'none';
  const pct = busy ? (1 - b.busy / b.busyMax) * 100 : 0;
  const ecol = o.energy < 25 ? '#ee6b4b' : o.energy < 60 ? '#f0b83a' : '#6fc043';
  if (force || insId !== id) {
    ins.hidden = false; insId = id;
    ins.innerHTML = `<header><span class="dot" style="background:${col}"></span><div><div class="nm"></div><div class="grp"></div></div><button class="x" aria-label="Close">×</button></header>
      <span class="act"></span>
      <div class="lbl"><span>Energy</span><b class="e"></b></div><div class="bar"><span class="ebar"></span></div>
      <div class="lbl"><span>Eating / pause timer</span><b class="tm"></b></div><div class="bar"><span class="tbar" style="background:#f0b83a"></span></div>
      <div style="margin-top:8px" class="rows"></div>`;
    ins.querySelector('.x').addEventListener('click', () => { view.selectedId = null; ins.hidden = true; });
  }
  ins.querySelector('.nm').textContent = o.name;
  ins.querySelector('.grp').textContent = `${o.kind === 'blue' ? 'Blue' : 'Red'} blob`;
  ins.querySelector('.act').textContent = action;
  ins.querySelector('.e').textContent = `${Math.max(0, o.energy).toFixed(0)} / ${MAXE}`;
  const eb = ins.querySelector('.ebar'); eb.style.width = `${Math.max(0, o.energy)}%`; eb.style.background = ecol;
  ins.querySelector('.tm').textContent = timerTxt;
  ins.querySelector('.tbar').style.width = `${pct}%`;
  const fam = o.parent ? `${o.parentName} (gen ${o.gen})` : 'original';
  const rows = [
    ['Age', `${o.age.toFixed(0)}s`], ['Speed now / max', `${o.speedNow.toFixed(1)} / ${maxSp.toFixed(1)} u/s`],
    ['Sensing range', `${sight.toFixed(1)} u`], ['Inherited speed / vision', `×${o.sp.toFixed(2)} / ×${o.vi.toFixed(2)}`],
    ['Parent', fam], ['Copies made', `${o.kids}`], [o.kind === 'blue' ? 'Fruit eaten' : 'Contacts made', `${o.kind === 'blue' ? o.eaten : o.contacts}`],
  ];
  ins.querySelector('.rows').innerHTML = rows.map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`).join('');
}

let lastChartLen = -1, hoverX = null;
const mainC = $('chart-main');
mainC.addEventListener('pointermove', (e) => { hoverX = e.clientX - mainC.getBoundingClientRect().left; refreshCharts(true); });
mainC.addEventListener('pointerleave', () => { hoverX = null; refreshCharts(true); });

function refreshCharts(force) {
  const n = sim.history.length;
  if (!force && n === lastChartLen) return;
  lastChartLen = n;
  const h = sim.history;
  drawTimeline(mainC, h, sim.p.trees * sim.p.fruitLimit, hoverX);
  drawPhase($('chart-phase'), h);
  drawTraits($('chart-traits'), h);
  const s = summarize(sim);
  const mood = $('mood'); mood.textContent = s.mood[0]; mood.className = `mood ${s.mood[1]}`;
  $('summary-lines').innerHTML = s.lines.map((l) => `<li>${l}</li>`).join('');
  $('summary-stats').innerHTML = s.stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}

let last = performance.now(), chartClock = 0, insClock = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (playing) {
    acc += dt * params.speed;
    let steps = 0;
    const cap = 90;
    while (acc >= DT && steps < cap) { sim.step(DT); acc -= DT; steps++; }
    if (steps >= cap) acc = 0;
    alpha = acc / DT;
  }
  view.ingest(sim);
  view.draw(sim, alpha, dt);
  $('n-fruit').textContent = sim.totalFruit();
  $('n-blue').textContent = sim.blues.length;
  $('n-red').textContent = sim.reds.length;
  $('clock').textContent = `${fmtT(sim.t)} garden time · ${params.speed}×${playing ? '' : ' · paused'}`;
  chartClock += dt; insClock += dt;
  if (chartClock > 0.25) { chartClock = 0; refreshCharts(false); }
  if (insClock > 0.1) { insClock = 0; renderInspector(false); }
  requestAnimationFrame(frame);
}

buildPanel();
buildSpeed();
syncControls();
setPreset(presetName);
window.addEventListener('resize', () => refreshCharts(true));
refreshCharts(true);
requestAnimationFrame(frame);
window.__garden = { get sim() { return sim; }, view, params };
