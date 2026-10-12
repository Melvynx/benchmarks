import { Garden, BASE, PRESETS } from './simulation.js';
import { WorldRenderer } from './renderer.js';
import { historyChart, phaseChart } from './charts.js';
const ICONS = {
  sprout:'<path d="M12 21v-9M12 15C5 16 3 10 4 5c6-1 10 2 8 10ZM12 11c-1-7 3-10 9-9 1 6-3 10-9 9Z"/>',
  leaf:'<path d="M20 3C9 1 3 6 4 14c1 7 9 8 13 3 3-4 3-9 3-14ZM5 19 16 8M11 13h6"/>',
  apple:'<path d="M12 7c-6-5-12 1-8 9 2 5 4 6 8 4 4 2 6 1 8-4 4-8-2-14-8-9ZM12 7V4m0 1c1-4 4-4 6-3-1 3-3 4-6 3Z"/>',
  clover:'<path d="M12 12C4 14 1 9 4 6c2-2 4-1 5 0-1-5 5-7 7-4 2 2 1 4 0 6 5-1 8 4 5 7-2 2-4 1-6 0 1 5-4 8-7 5-2-2-2-5 4-8Zm0 0 7 9"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  book:'<path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-2-7-1-10 1Zm0 0v15"/>',
  'book-open':'<path d="M12 6C8 3 4 4 2 5v14c4-2 7-1 10 1 3-2 6-3 10-1V5c-3-2-7-1-10 1Zm0 0v14M5 9l4 1M15 10l4-1"/>',
  'arrow-up-right':'<path d="M5 19 19 5M5 5h14v14"/>',
  'arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/>',
  sparkles:'<path d="m12 3 2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2L12 3ZM21 2v4M19 4h4M3 19v4M1 21h4"/>',
  hash:'<path d="M10 3 6 21M18 3l-4 18M3 9h18M2 15h18"/>',
  expand:'<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
  rotate:'<path d="M5 7c3-4 10-4 14 0M5 7V2M5 7h5M19 17c-4 4-10 4-14 0m14 0v5m0-5h-5"/>',
  play:'<path d="m8 4 12 8-12 8Z"/>',
  pause:'<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  step:'<path d="m5 4 11 8L5 20ZM20 4v16"/>',
  reset:'<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  sliders:'<path d="M4 6h5m5 0h6M4 12h10m5 0h1M4 18h2m5 0h9"/><circle cx="11.5" cy="6" r="2.5"/><circle cx="16.5" cy="12" r="2.5"/><circle cx="8.5" cy="18" r="2.5"/>',
  'chevron-down':'<path d="m6 9 6 6 6-6"/>',
  globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  shuffle:'<path d="M3 5h2c6 0 8 14 14 14h2M3 19h2c2 0 4-3 5-5M14 9c1-2 3-4 5-4h2m-3-3 3 3-3 3m0 8 3 3-3 3"/>',
  chart:'<path d="M3 3v18h18M6 15l4-5 4 3 6-8"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  orbit:'<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/><path d="M5 6c-1 5 3 12 10 14"/>',
  flame:'<path d="M12 2c1 6 8 7 8 14a8 8 0 0 1-16 0c0-3 2-5 3-7 0 4 3 4 3 1 0-3 0-5 2-8Z"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.leaf}</svg>`;
function hydrateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon)); }
hydrateIcons();
const $ = id => document.getElementById(id);
let config = { ...BASE }, garden = new Garden(config), running = true, speed = 1, activeTab = 'fruit', presetKey = 'balanced', chartMode = 'count';
// The first garden is a recorded, deterministic preview. Reset always starts at t=0.
garden.advance(75);
let isPreview = true;
const canvas = $('garden-canvas'), renderer = new WorldRenderer(canvas);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let selectedId = null;
const RULES = {
  fruit: [
    { key:'growth', label:'Fruit growth', min:.05, max:1, step:.01, unit:'/s', lo:'Slow & steady', hi:'A fruitful feast', help:'Fruit grown per tree each second after the return delay.' },
    { key:'fruitLimit', label:'Fruit per tree', min:1, max:12, step:1, unit:'fruit', lo:'A little', hi:'A lot', help:'The maximum fruit a single tree can hold.' },
    { key:'returnDelay', label:'Regrowth delay', min:0, max:20, step:.5, unit:'s', lo:'Right away', hi:'Take your time', help:'How long a tree rests after a fruit is picked.' },
  ],
  blue: [
    { key:'blueUse', label:'Energy use', min:.25, max:3, step:.05, unit:'/s', lo:'Easy living', hi:'Hard work', help:'Base energy cost; moving uses extra energy.' },
    { key:'blueSpeed', label:'Movement speed', min:4, max:20, step:.5, unit:'u/s', lo:'A gentle stroll', hi:'Zooming', help:'Distance travelled per second, adjusted by inherited traits.' },
    { key:'blueVision', label:'Sensing range', min:15, max:120, step:1, unit:'u', lo:'Up close', hi:'Far & wide' },
    { key:'blueThreshold', label:'Copy threshold', min:55, max:120, step:1, unit:'energy', lo:'Grow sooner', hi:'Save up first', help:'Energy needed to make a baby. Each copy costs 46 energy.' },
    { key:'eatingTime', label:'Eating time', min:.2, max:5, step:.1, unit:'s', lo:'A quick bite', hi:'Savor it', help:'A blue must finish eating before it gains 23 energy.' },
  ],
  red: [
    { key:'redUse', label:'Energy use', min:.25, max:3, step:.05, unit:'/s', lo:'Easy living', hi:'Hard work' },
    { key:'redSpeed', label:'Movement speed', min:4, max:20, step:.5, unit:'u/s', lo:'A gentle stroll', hi:'Zooming' },
    { key:'redVision', label:'Sensing range', min:15, max:120, step:1, unit:'u', lo:'Up close', hi:'Far & wide' },
    { key:'contactStrength', label:'Contact strength', min:10, max:75, step:1, unit:'energy', lo:'A gentle nudge', hi:'A bigger boost', help:'Energy removed from a blue. 82% is restored to the red after its pause.' },
    { key:'redThreshold', label:'Copy threshold', min:55, max:120, step:1, unit:'energy', lo:'Grow sooner', hi:'Save up first' },
    { key:'pauseTime', label:'Pause after contact', min:.5, max:8, step:.1, unit:'s', lo:'Back to it', hi:'A little rest' },
  ],
};
const WORLD_RULES = [
  { key:'trees', label:'Starting trees', min:1, max:32, step:1, unit:'trees', lo:'A tiny grove', hi:'A little forest' },
  { key:'blues', label:'Starting blues', min:0, max:80, step:1, unit:'blobs', lo:'Nobody', hi:'A whole crowd' },
  { key:'reds', label:'Starting reds', min:0, max:40, step:1, unit:'blobs', lo:'Nobody', hi:'Lots of company' },
  { key:'worldSize', label:'World radius', min:60, max:150, step:5, unit:'u', lo:'Cozy', hi:'Room to roam' },
];
const notes = {
  fruit: ['leaf', 'A little patience bears fruit.', 'Fruit grows back, one bite at a time.'],
  blue: ['sparkles', 'Enough to share? A new little blue.', 'Gather, eat, rest. Then grow the family.'],
  red: ['flame', 'Every connection costs a little energy.', 'Reds need blues to keep their spark alive.'],
};
const fmt = n => Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, '').replace(/\.0$/, '');
function ruleMarkup(rule) {
  const n = config[rule.key], fill = (n - rule.min) / (rule.max - rule.min) * 100;
  const color = activeTab === 'blue' && !WORLD_RULES.includes(rule) ? '#84b6cd' : activeTab === 'red' && !WORLD_RULES.includes(rule) ? '#d99a87' : '#96ad76';
  return `<div class="slider-field"><div class="slider-top"><label for="rule-${rule.key}">${rule.label}${rule.help ? `<span class="inline-info" title="${rule.help}" aria-label="${rule.help}">i</span>` : ''}</label><output class="slider-value" for="rule-${rule.key}" id="value-${rule.key}">${fmt(n)} <small>${rule.unit}</small></output></div><div class="range-track"><input id="rule-${rule.key}" type="range" min="${rule.min}" max="${rule.max}" step="${rule.step}" value="${n}" data-rule="${rule.key}" aria-valuetext="${fmt(n)} ${rule.unit}" style="--fill:${fill}%;--slider-color:${color}"></div><div class="range-labels"><span>${rule.lo}</span><span>${rule.hi}</span></div></div>`;
}
function renderControls() {
  $('control-fields').innerHTML = RULES[activeTab].map(ruleMarkup).join('');
  const note = notes[activeTab]; $('rule-note').innerHTML = `<span data-icon="${note[0]}"></span><p>${note[1]}${activeTab === 'fruit' ? '' : `<br><span>${note[2]}</span>`}</p>`; hydrateIcons($('rule-note'));
  $('world-fields').innerHTML = WORLD_RULES.map(ruleMarkup).join('') + `<label class="field-label" for="seed-input">RANDOM SEED</label><input class="seed-input" id="seed-input" type="number" min="0" max="4294967295" step="1" value="${config.seed}">`;
}
function renderPreset() {
  const p = PRESETS[presetKey]; $('preset-name').textContent = p?.name || 'Your own little garden'; $('preset-button').querySelector('.preset-icon').innerHTML = icon(p?.icon || 'sparkles');
  $('preset-menu').innerHTML = Object.entries(PRESETS).map(([key, item]) => `<button class="preset-option ${key === presetKey ? 'selected' : ''}" data-preset="${key}"><span data-icon="${item.icon}"></span><span><strong>${item.name}</strong><small>${item.description}</small></span></button>`).join(''); hydrateIcons($('preset-menu'));
}
renderControls(); renderPreset();
let toastTimer;
function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => $('toast').hidden = true, 3300); }
function setRunning(value) {
  running = value; $('play-label').textContent = value ? 'Pause' : 'Play'; $('play-button').firstElementChild.innerHTML = icon(value ? 'pause' : 'play'); $('play-button').setAttribute('aria-label', value ? 'Pause simulation' : 'Play simulation');
  $('world-status').textContent = value ? 'YOUR GARDEN IS ALIVE' : 'A LITTLE MOMENT OF STILLNESS'; $('live-dot').style.background = value ? '#8da976' : '#bdba9b';
}
function reset(showToast = true) { garden = new Garden(config); isPreview = false; selectedId = null; renderer.selected = null; $('blob-inspector').hidden = true; accumulator = 0; updateUI(); if (showToast) toast('A fresh start. Let’s see what grows.'); }
function selectBlob(id) { selectedId = id; renderer.selected = id; renderInspector(); }
function renderInspector() {
  const el = $('blob-inspector'), b = garden.blobs.find(b => b.id === selectedId);
  if (!b) { if (selectedId !== null) { toast('This little blob faded. Its story is part of the garden.'); selectedId = null; renderer.selected = null; } el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<div class="inspector-header"><span class="mini-blob ${b.group}-mini"></span><div><strong>${b.group === 'blue' ? 'Blue' : 'Red'} little #${b.id}</strong><small>Generation ${b.generation}${b.parent ? ` · child of #${b.parent}` : ' · garden original'}</small></div><button class="icon-button" id="close-inspector" aria-label="Close blob details">${icon('close')}</button></div><div class="energy-heading"><span>Energy</span><strong>${Math.round(b.energy)} / 125</strong></div><div class="energy-bar"><div style="width:${Math.min(100, b.energy / 125 * 100)}%;background:${b.group === 'blue' ? '#87b9ce' : '#dfa08c'}"></div></div><dl class="inspector-grid"><div><dt>Age</dt><dd>${Math.floor(b.age)} seconds</dd></div><div><dt>Speed</dt><dd>${b.speed.toFixed(1)} u/s</dd></div><div><dt>Sensing range</dt><dd>${garden.config[b.group + 'Vision']} units</dd></div><div><dt>Inherited trait</dt><dd>${b.trait.toFixed(2)}× speed</dd></div></dl><div class="inspector-action"><span>${b.action}</span>${b.pause > 0 ? `<b>${b.pause.toFixed(1)}s</b>` : '<span>✦</span>'}</div>`;
  $('close-inspector').onclick = () => selectBlob(null);
}
let chartGeometry;
function updateUI() {
  const counts = garden.counts(), prev = garden.history[Math.max(0, garden.history.length - 11)];
  for (const key of ['fruit', 'blue', 'red']) { $(key + '-count').textContent = counts[key]; const delta = counts[key] - prev[key]; $(key + '-trend').textContent = delta > 0 ? '↗' : delta < 0 ? '↘' : '–'; $(key + '-trend').className = 'tiny-trend ' + (delta > 0 ? 'up' : delta < 0 ? 'down' : ''); }
  $('day-count').textContent = String(Math.floor(garden.time / 10) + 1).padStart(2, '0');
  $('elapsed').textContent = `${String(Math.floor(garden.time / 60)).padStart(2, '0')}:${String(Math.floor(garden.time % 60)).padStart(2, '0')}`;
  $('seed-label').textContent = garden.config.seed;
  chartGeometry = historyChart($('history-chart'), garden.history, chartMode); phaseChart($('phase-chart'), garden.history);
  const story = garden.summary(); $('story-title').textContent = story.title; $('story-text').textContent = story.text;
  $('birth-count').textContent = garden.births.blue + garden.births.red; $('bite-count').textContent = garden.bites;
  $('history-caption').textContent = isPreview ? 'A 7-day head start · reset to begin at day 1.' : chartMode === 'index' ? 'Each group relative to its starting count.' : 'A story written by your garden.';
  if (selectedId !== null) renderInspector();
}
$('play-button').onclick = () => setRunning(!running);
$('step-button').onclick = () => { setRunning(false); garden.advance(1); updateUI(); };
$('reset-button').onclick = () => reset(); $('reset-garden').onclick = () => reset();
$('view-reset').onclick = () => { renderer.rotation = -.16; toast('Back to the sunny side of the garden.'); };
document.querySelectorAll('[data-speed]').forEach(btn => btn.onclick = () => { speed = Number(btn.dataset.speed); document.querySelectorAll('[data-speed]').forEach(b => { b.classList.toggle('selected', b === btn); b.setAttribute('aria-pressed', String(b === btn)); }); });
document.querySelectorAll('[data-tab]').forEach(btn => {
  btn.onclick = () => { activeTab = btn.dataset.tab; document.querySelectorAll('[data-tab]').forEach(b => { b.classList.toggle('active', b === btn); b.setAttribute('aria-selected', String(b === btn)); b.tabIndex = b === btn ? 0 : -1; }); renderControls(); };
  btn.onkeydown = event => { if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); const tabs = [...document.querySelectorAll('[data-tab]')]; const next = tabs[(tabs.indexOf(btn) + (event.key === 'ArrowRight' ? 1 : 2)) % 3]; next.click(); next.focus(); };
});
document.querySelector('.tuning-card').addEventListener('input', event => {
  const key = event.target.dataset.rule;
  if (!key) return;
  const value = Number(event.target.value); config[key] = value;
  if (!WORLD_RULES.some(r => r.key === key)) garden.config[key] = value;
  const rule = [...Object.values(RULES).flat(), ...WORLD_RULES].find(r => r.key === key);
  event.target.style.setProperty('--fill', (value - rule.min) / (rule.max - rule.min) * 100 + '%'); event.target.setAttribute('aria-valuetext', fmt(value) + ' ' + rule.unit);
  $('value-' + key).innerHTML = `${fmt(value)} <small>${rule.unit}</small>`;
  presetKey = 'custom'; renderPreset();
});
document.querySelector('.tuning-card').addEventListener('change', event => { if (event.target.id === 'seed-input') { config.seed = Math.min(4294967295, Math.max(0, Math.floor(Number(event.target.value) || 0))); event.target.value = config.seed; presetKey = 'custom'; renderPreset(); } });
$('preset-button').onclick = () => { const open = $('preset-menu').hidden; $('preset-menu').hidden = !open; $('preset-button').setAttribute('aria-expanded', String(open)); };
$('preset-menu').onclick = event => { const btn = event.target.closest('[data-preset]'); if (!btn) return; presetKey = btn.dataset.preset; config = { ...BASE, ...PRESETS[presetKey].values, seed: config.seed }; renderPreset(); renderControls(); $('preset-menu').hidden = true; $('preset-button').setAttribute('aria-expanded', 'false'); reset(false); toast(PRESETS[presetKey].name + ' planted. A new story begins.'); };
document.addEventListener('click', event => { if (!event.target.closest('.preset-area')) { $('preset-menu').hidden = true; $('preset-button').setAttribute('aria-expanded', 'false'); } });
$('randomize-button').onclick = () => {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0]; const keys = Object.keys(PRESETS); const chosen = keys[seed % keys.length]; config = { ...BASE, ...PRESETS[chosen].values, seed };
  config.growth = Math.round(config.growth * (.75 + (seed % 51) / 100) * 100) / 100; config.blues = 10 + seed % 31; config.reds = 3 + seed % 14; config.trees = 8 + seed % 17;
  presetKey = 'custom'; renderControls(); renderPreset(); reset(false); toast('A new seed. A whole new little world.');
};
document.querySelectorAll('[data-chart-mode]').forEach(btn => btn.onclick = () => { chartMode = btn.dataset.chartMode; document.querySelectorAll('[data-chart-mode]').forEach(b => b.classList.toggle('active', b === btn)); updateUI(); });
$('history-chart').addEventListener('pointermove', event => {
  const rect = event.currentTarget.getBoundingClientRect(); const norm = ((event.clientX - rect.left) / rect.width * 600 - chartGeometry.left) / chartGeometry.width;
  const time = Math.max(0, Math.min(1, norm)) * chartGeometry.maxTime; const h = garden.history.reduce((p, item) => Math.abs(item.time - time) < Math.abs(p.time - time) ? item : p, garden.history[0]);
  const tip = $('chart-tooltip'); tip.innerHTML = `<b>Day ${Math.floor(h.time / 10) + 1}</b> · ${Math.floor(h.time)}s<br><span style="color:#8fac69">${h.fruit} fruit</span> · <span style="color:#72a9c3">${h.blue} blue</span> · <span style="color:#d3907c">${h.red} red</span>`; tip.hidden = false; tip.style.left = Math.min(Math.max(0, event.clientX - rect.left - 65), rect.width - 165) + 'px'; tip.style.top = '8px';
});
$('history-chart').addEventListener('pointerleave', () => $('chart-tooltip').hidden = true);
$('export-button').onclick = () => { const csv = 'seconds,garden_day,fruit,blue_blobs,red_blobs\n' + garden.history.map(h => `${h.time.toFixed(1)},${(h.time / 10).toFixed(2)},${h.fruit},${h.blue},${h.red}`).join('\n'); const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); const link = document.createElement('a'); link.href = url; link.download = `garden-${garden.config.seed}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Your garden’s story, ready to keep.'); };
function openGuide() { $('guide-dialog').showModal(); }
$('guide-nav').onclick = openGuide; $('info-button').onclick = openGuide; $('controls-info').onclick = openGuide;
$('phase-info').onclick = () => toast('Blue count is horizontal; red count is vertical. The orange dot is now. Loops reveal population waves.');
$('close-guide').onclick = () => $('guide-dialog').close(); $('guide-cta').onclick = () => $('guide-dialog').close();
$('guide-dialog').addEventListener('click', event => { if (event.target === $('guide-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
$('garden-nav').onclick = () => document.querySelector('.workspace').scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'center' });
let dragging = null;
canvas.addEventListener('pointerdown', event => { dragging = { x: event.clientX, y: event.clientY, lastX: event.clientX, distance: 0 }; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', event => { if (!dragging) return; const dx = event.clientX - dragging.lastX; renderer.rotation += dx * .006; dragging.lastX = event.clientX; dragging.distance += Math.abs(dx) + Math.abs(event.clientY - dragging.y) * .1; });
canvas.addEventListener('pointerup', event => { if (dragging && dragging.distance < 5) { const r = canvas.getBoundingClientRect(); selectBlob(renderer.pick(event.clientX - r.left, event.clientY - r.top)); } dragging = null; });
canvas.addEventListener('pointercancel', () => dragging = null);
canvas.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); selectBlob(garden.blobs[0]?.id ?? null); } });
document.addEventListener('keydown', event => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  if (event.key === 'Escape') { selectBlob(null); $('preset-menu').hidden = true; }
  if ($('guide-dialog').open) return;
  if (event.code === 'Space' && !['BUTTON', 'SUMMARY'].includes(document.activeElement?.tagName)) { event.preventDefault(); setRunning(!running); }
  if (event.key.toLowerCase() === 'r') reset();
  if (event.key === 'ArrowLeft' && !event.target.closest('[role="tablist"]')) { event.preventDefault(); renderer.rotation -= .12; }
  if (event.key === 'ArrowRight' && !event.target.closest('[role="tablist"]')) { event.preventDefault(); renderer.rotation += .12; }
});
let lastTime = performance.now(), accumulator = 0, lastUI = 0;
function frame(now) {
  const delta = Math.min(.1, (now - lastTime) / 1000); lastTime = now;
  if (running && !document.hidden && !$('guide-dialog').open) { accumulator += delta * speed; while (accumulator >= .1) { garden.update(.1); accumulator -= .1; } }
  renderer.draw(garden, now / 1000, reducedMotion);
  if (now - lastUI > 230) { updateUI(); lastUI = now; }
  requestAnimationFrame(frame);
}
updateUI(); requestAnimationFrame(frame);
