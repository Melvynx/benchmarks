import './style.css';
import { ALL_DEFS, DEFAULTS, PARAM_GROUPS, PRESETS, clampParam, presetParams, type ParamDef, type ParamKey, type Params } from './params.ts';
import { DT, Simulation, type Action, type Blob } from './sim.ts';
import { Renderer } from './render.ts';
import { drawPhase, drawTimeline, drawTraits, summarize } from './charts.ts';

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 16, 32];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let params: Params = presetParams('balanced');
let activePreset: string | null = 'balanced';
let sim = new Simulation(params);
let playing = false;
let speedIdx = 2;
let acc = 0;

const worldCanvas = $<HTMLCanvasElement>('world');
const renderer = new Renderer(worldCanvas);
const timelineCanvas = $<HTMLCanvasElement>('chart-timeline');
const phaseCanvas = $<HTMLCanvasElement>('chart-phase');
const traitsCanvas = $<HTMLCanvasElement>('chart-traits');

// ---------------------------------------------------------------- controls

const inputs = new Map<ParamKey, { input: HTMLInputElement; out: HTMLOutputElement; wrap: HTMLElement; def: ParamDef }>();

function decimals(step: number) {
  const s = String(step);
  return s.includes('.') ? s.split('.')[1].length : 0;
}

function fmt(def: ParamDef, v: number) {
  return `${v.toFixed(decimals(def.step))}${def.unit ?? ''}`;
}

function paintRange(input: HTMLInputElement) {
  const min = Number(input.min);
  const max = Number(input.max);
  input.style.setProperty('--p', `${((Number(input.value) - min) / (max - min)) * 100}%`);
}

function buildControls() {
  const root = $('controls');
  root.innerHTML = '';
  const blurb = document.createElement('p');
  blurb.className = 'preset-blurb';
  blurb.id = 'preset-blurb';
  root.append(blurb);
  for (const g of PARAM_GROUPS) {
    const sec = document.createElement('section');
    sec.className = `group ${g.accent}`;
    const h = document.createElement('h3');
    h.innerHTML = `<span class="dot"></span>${g.title}${g.id === 'start' ? '<small>applies on reset</small>' : '<small>live</small>'}`;
    sec.append(h);
    for (const def of g.defs) {
      const wrap = document.createElement('label');
      wrap.className = 'ctl';
      const top = document.createElement('div');
      top.className = 'top';
      const name = document.createElement('span');
      name.textContent = def.label;
      const out = document.createElement('output');
      top.append(name, out);
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(def.min);
      input.max = String(def.max);
      input.step = String(def.step);
      input.setAttribute('aria-label', `${g.title}: ${def.label}`);
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = def.hint;
      wrap.append(top, input, hint);
      sec.append(wrap);
      input.addEventListener('input', () => {
        const v = clampParam(def, Number(input.value));
        params = { ...params, [def.key]: v };
        activePreset = null;
        if (!def.onReset) sim.p[def.key] = v;
        syncControls();
      });
      inputs.set(def.key, { input, out, wrap, def });
    }
    root.append(sec);
  }
}

function syncControls() {
  const base = activePreset ? presetParams(activePreset, params.seed) : null;
  for (const [key, c] of inputs) {
    const v = params[key];
    if (Number(c.input.value) !== v) c.input.value = String(v);
    c.out.textContent = fmt(c.def, v);
    paintRange(c.input);
    const ref = base ?? DEFAULTS;
    c.wrap.classList.toggle('changed', Math.abs(ref[key] - v) > 1e-9 && key !== 'seed');
  }
  const pending = ALL_DEFS.some((d) => d.onReset && Math.abs(params[d.key] - sim.p[d.key]) > 1e-9);
  $('btn-reset').classList.toggle('pending', pending);
  $('btn-reset').title = pending ? 'Starting-world settings changed — reset to apply' : 'Rebuild the world with current settings (R)';
  for (const b of document.querySelectorAll<HTMLButtonElement>('.preset')) b.setAttribute('aria-checked', String(b.dataset.id === activePreset));
  const pr = PRESETS.find((p) => p.id === activePreset);
  $('preset-blurb').textContent = pr ? `${pr.emoji} ${pr.blurb}` : '🛠 Custom garden. Tweak the rules and watch what changes.';
}

function buildPresets() {
  const root = $('presets');
  for (const p of PRESETS) {
    const b = document.createElement('button');
    b.className = 'preset';
    b.dataset.id = p.id;
    b.setAttribute('role', 'radio');
    b.title = p.blurb;
    b.textContent = `${p.emoji} ${p.name}`;
    b.addEventListener('click', () => {
      activePreset = p.id;
      params = presetParams(p.id, params.seed);
      reset();
      setPlaying(true);
    });
    root.append(b);
  }
}

// ---------------------------------------------------------------- transport

function reset() {
  sim = new Simulation(params);
  renderer.selected = -1;
  renderer.clearParticles();
  acc = 0;
  syncControls();
  refreshPanels(true);
}

function setPlaying(v: boolean) {
  playing = v;
  const b = $('btn-play');
  b.classList.toggle('playing', v);
  b.querySelector('.ico')!.textContent = v ? '❚❚' : '▶';
  b.querySelector('.lbl')!.textContent = v ? 'Pause' : 'Play';
}

function stepOnce() {
  setPlaying(false);
  const n = Math.round(1 / DT);
  for (let i = 0; i < n; i++) sim.step();
  refreshPanels(true);
}

function randomize() {
  const r = Math.random;
  const next: Params = { ...params, seed: 1 + Math.floor(r() * 9999) };
  for (const def of ALL_DEFS) {
    if (def.key === 'seed') continue;
    const span = def.max - def.min;
    next[def.key] = clampParam(def, params[def.key] + (r() * 2 - 1) * span * 0.12);
  }
  params = next;
  activePreset = null;
  reset();
}

$('btn-play').addEventListener('click', () => setPlaying(!playing));
$('btn-step').addEventListener('click', stepOnce);
$('btn-reset').addEventListener('click', reset);
$('btn-random').addEventListener('click', randomize);
$('add-blue').addEventListener('click', () => sim.addBlobs('blue', 5));
$('add-red').addEventListener('click', () => sim.addBlobs('red', 3));

const speedInput = $<HTMLInputElement>('speed');
function syncSpeed() {
  speedInput.value = String(speedIdx);
  $('speed-out').textContent = `${SPEEDS[speedIdx]}×`;
  paintRange(speedInput);
}
speedInput.addEventListener('input', () => {
  speedIdx = Number(speedInput.value);
  syncSpeed();
});

window.addEventListener('keydown', (e) => {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' && (e.target as HTMLInputElement).type !== 'range') return;
  if (e.code === 'Space') {
    e.preventDefault();
    setPlaying(!playing);
  } else if (e.key === 's' || e.key === 'S') stepOnce();
  else if (e.key === 'r' || e.key === 'R') reset();
  else if (e.key === 'Escape') renderer.selected = -1;
});

// ---------------------------------------------------------------- world input

let drag: { x: number; y: number; moved: number; yaw: number; elev: number; shift: boolean } | null = null;

worldCanvas.addEventListener('pointerdown', (e) => {
  worldCanvas.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, moved: 0, yaw: renderer.yaw, elev: renderer.elev, shift: e.shiftKey };
});

worldCanvas.addEventListener('pointermove', (e) => {
  const rect = worldCanvas.getBoundingClientRect();
  if (drag) {
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (drag.moved > 3) {
      worldCanvas.classList.add('dragging');
      renderer.yaw = drag.yaw + dx * 0.008;
      renderer.elev = Math.min(1.4, Math.max(0.45, drag.elev + dy * (drag.shift ? 0.006 : 0.0025)));
    }
  } else {
    const id = renderer.pick(e.clientX - rect.left, e.clientY - rect.top);
    renderer.hovered = id;
    worldCanvas.classList.toggle('hovering', id >= 0);
  }
});

worldCanvas.addEventListener('pointerup', (e) => {
  const rect = worldCanvas.getBoundingClientRect();
  if (drag && drag.moved <= 3) {
    const id = renderer.pick(e.clientX - rect.left, e.clientY - rect.top);
    renderer.selected = id;
    refreshInspector();
  }
  drag = null;
  worldCanvas.classList.remove('dragging');
});

worldCanvas.addEventListener('pointerleave', () => {
  renderer.hovered = -1;
});

worldCanvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    if (e.shiftKey) renderer.elev = Math.min(1.4, Math.max(0.45, renderer.elev + e.deltaY * 0.002));
    else renderer.zoom = Math.min(2.6, Math.max(0.6, renderer.zoom * Math.exp(-e.deltaY * 0.0015)));
  },
  { passive: false },
);

// ---------------------------------------------------------------- inspector

const ACTION_LABEL: Record<Action, string> = {
  wandering: '🌼 wandering',
  'seeking fruit': '🍏 looking for fruit',
  eating: '😋 chewing fruit',
  fleeing: '💨 moving away from a red',
  budding: '✨ budding a baby',
  hunting: '👀 looking for a blue',
  roaming: '🚶 roaming',
  resting: '💤 resting after a boop',
  'catching breath': '😮‍💨 catching breath',
};

const TIMER_LABEL: Partial<Record<Action, string>> = {
  eating: 'Eating time left',
  resting: 'Pause time left',
  budding: 'Budding time left',
  'catching breath': 'Rest time left',
};

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

function refreshInspector() {
  const el = $('inspector');
  const b: Blob | undefined = renderer.selected >= 0 ? sim.find(renderer.selected) : undefined;
  if (!b) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const p = sim.p;
  const copy = b.kind === 'blue' ? p.blueCopy : p.redCopy;
  const topSpeed = (b.kind === 'blue' ? p.blueSpeed : p.redSpeed) * b.sGene;
  const vision = (b.kind === 'blue' ? p.blueVision : p.redVision) * b.vGene;
  const speedNow = Math.hypot(b.vx, b.vy);
  const parent = b.parent ? sim.find(b.parent) : undefined;
  const epct = Math.max(0, Math.min(100, (b.energy / copy) * 100));
  const timerLabel = TIMER_LABEL[b.action];
  const timer =
    b.alive && b.timer > 0 && timerLabel
      ? `<div class="row"><span>${timerLabel}</span><b>${b.timer.toFixed(1)}s</b></div>
         <div class="bar timer"><span style="width:${(b.timer / Math.max(0.01, b.timerTotal)) * 100}%"></span></div>`
      : '';
  const status = b.alive
    ? `<span class="action">${ACTION_LABEL[b.action]}</span>`
    : `<div class="gone">🫧 ${esc(b.name)} ${esc(b.deathCause)} at ${Math.round(b.diedAt)}s.</div>`;
  el.innerHTML = `
    <div class="ihead">
      <div class="avatar ${b.kind}"></div>
      <div><h3>${esc(b.name)}</h3><div class="kind">${b.kind === 'blue' ? 'Blue blob · fruit eater' : 'Red blob · booper'} · #${b.id}</div></div>
      <button class="close" aria-label="Close inspector">✕</button>
    </div>
    ${status}
    <div class="row"><span>Energy</span><b>${b.energy.toFixed(1)} / ${copy} to bud</b></div>
    <div class="bar energy"><span style="width:${epct}%"></span></div>
    ${timer}
    <dl>
      <dt>Age</dt><dd>${b.age.toFixed(0)}s <small>/ ~${b.lifespan.toFixed(0)}s</small></dd>
      <dt>Speed</dt><dd>${speedNow.toFixed(1)} <small>/ ${topSpeed.toFixed(2)} u/s</small></dd>
      <dt>Sensing range</dt><dd>${vision.toFixed(1)} u</dd>
      <dt>Speed gene</dt><dd>${b.sGene.toFixed(2)}×</dd>
      <dt>Vision gene</dt><dd>${b.vGene.toFixed(2)}×</dd>
      <dt>Generation</dt><dd>${b.generation}</dd>
      <dt>Parent</dt><dd>${b.parent ? esc(parent?.name ?? `#${b.parent}`) : 'original settler'}</dd>
      <dt>Babies</dt><dd>${b.children}</dd>
      <dt>${b.kind === 'blue' ? 'Fruit eaten' : 'Boops'}</dt><dd>${b.kind === 'blue' ? b.eaten : b.boops}</dd>
      ${b.kind === 'blue' && b.alive ? `<dt>Sprint left</dt><dd>${Math.round(b.stamina * 100)}%</dd>` : ''}
    </dl>`;
  el.querySelector('.close')!.addEventListener('click', () => {
    renderer.selected = -1;
    refreshInspector();
  });
}

// ---------------------------------------------------------------- panels

let hoverX: number | undefined;
timelineCanvas.addEventListener('pointermove', (e) => {
  hoverX = e.clientX - timelineCanvas.getBoundingClientRect().left;
  drawTimeline(timelineCanvas, sim.history, { hover: hoverX });
});
timelineCanvas.addEventListener('pointerleave', () => {
  hoverX = undefined;
  drawTimeline(timelineCanvas, sim.history);
});

let lastPanels = 0;
let lastSummary = 0;
let lastInspector = 0;

function refreshPanels(force = false) {
  const now = performance.now();
  if (force || now - lastPanels > 300) {
    lastPanels = now;
    drawTimeline(timelineCanvas, sim.history, { hover: hoverX });
    drawPhase(phaseCanvas, sim.history);
    drawTraits(traitsCanvas, sim.history);
  }
  if (force || now - lastSummary > 1000) {
    lastSummary = now;
    const lines = summarize(sim.history, sim.trees.length * Math.round(sim.p.fruitLimit));
    $('summary').innerHTML = lines.map((l) => `<li class="${l.tone}"><span class="i">${l.icon}</span><span>${esc(l.text)}</span></li>`).join('');
    const t = sim.totals;
    $('totals').innerHTML = [
      ['Blue babies', t.blueBirths],
      ['Red babies', t.redBirths],
      ['Fruit eaten', t.fruitEaten],
      ['Boops', t.boops],
      ['Blues faded', t.blueStarved],
      ['Reds faded', t.redStarved],
      ['Old age', t.oldAge],
      ['Peak blue / red', `${peak('blue')} / ${peak('red')}`],
    ]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join('');
  }
  if (force || now - lastInspector > 120) {
    lastInspector = now;
    refreshInspector();
  }
  $('hud-fruit').textContent = String(sim.ripeFruit());
  $('hud-blue').textContent = String(sim.blueCount);
  $('hud-red').textContent = String(sim.redCount);
  $('hud-time').textContent = fmtClock(sim.t);
}

function peak(k: 'blue' | 'red') {
  let m = 0;
  for (const s of sim.history) if (s[k] > m) m = s[k];
  return m;
}

function fmtClock(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

// ---------------------------------------------------------------- loop

let last = performance.now();
function frame(now: number) {
  const realDt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (playing) {
    acc += realDt * SPEEDS[speedIdx];
    const budget = performance.now() + 14;
    let steps = 0;
    while (acc >= DT && performance.now() < budget) {
      sim.step();
      acc -= DT;
      steps++;
    }
    // if we can't keep up, drop the backlog instead of spiralling
    if (acc > DT * 4) acc = 0;
    void steps;
  }
  if (sim.events.length) {
    renderer.quietText = playing && SPEEDS[speedIdx] > 4;
    renderer.ingest(sim.events);
    sim.events.length = 0;
  }
  renderer.draw(sim, now, playing ? realDt * Math.min(2, SPEEDS[speedIdx]) : realDt * 0.5);
  refreshPanels();
  requestAnimationFrame(frame);
}

function onResize() {
  renderer.resize();
  refreshPanels(true);
}

buildPresets();
buildControls();
syncControls();
syncSpeed();
window.addEventListener('resize', onResize);
new ResizeObserver(onResize).observe(worldCanvas);
onResize();
setPlaying(true);
requestAnimationFrame(frame);

declare global {
  interface Window {
    garden: { sim: () => Simulation; renderer: Renderer };
  }
}
window.garden = { sim: () => sim, renderer };
