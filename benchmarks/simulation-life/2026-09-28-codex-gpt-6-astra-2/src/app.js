import { Garden, DEFAULTS, PRESETS } from './simulation.js';
import { WorldRenderer } from './world.js';
import { icon } from './icons.js';
import { timeline, phasePlot } from './charts.js';

const root = document.querySelector('#root');
let settings = { ...DEFAULTS };
const garden = new Garden(settings);
let running = true;
let speed = 1;
let activeTab = 'fruit';
let preset = 'balanced';
let chartMode = 'timeline';
let selectedId = null;
let toastTimeout;
let resetCount = 0;
const visible = { fruit: true, blue: true, red: true };

const blobFace = (color, cls = '') => `<span class="blob-face ${color} ${cls}" aria-hidden="true"><i></i><i></i><b></b></span>`;

root.innerHTML = `
  <header class="site-header">
    <a class="brand" href="/" aria-label="GPT-6 home"><span class="brand-mark">${icon('sprout')}</span><span>GPT-6<span class="brand-dot">.</span></span></a>
    <nav class="header-nav" aria-label="Main navigation"><a class="nav-link active" href="#garden">${icon('sprout')}The garden</a><button class="nav-link" id="how-it-works">${icon('book')}How it works</button></nav>
    <span class="header-note"><span class="little-sun">${icon('sun')}</span>A small world, full of life.</span>
  </header>
  <main>
    <section class="intro">
      <div><div class="eyebrow"><span></span>MAKE ROOM FOR A LITTLE WONDER</div><h1>GPT-6</h1><p>Plant a possibility. Press play. See what grows.</p></div>
      <div class="intro-note"><div class="mini-residents">${blobFace('blue')}${blobFace('red')}<span class="mini-leaf">${icon('sprout')}</span></div><span>A living world.<br><em>A little different every time.</em></span></div>
    </section>
    <div class="workspace">
      <div class="main-column">
        <section class="garden-card card" id="garden" aria-label="Living garden simulation">
          <div class="world-header"><div class="section-heading"><h2>The garden</h2><span class="status-pill" id="live-status"><span></span>LIVE</span></div><div class="world-header-right"><span class="time-readout">${icon('clock')}<span id="elapsed">00:00</span></span><span class="divider"></span><button class="icon-button" id="expand" title="Expand garden" aria-label="Expand garden">${icon('expand')}</button></div></div>
          <div class="world-stage">
            <div class="world-weather">${icon('sun')}<span>A good day to grow</span></div>
            <canvas id="world" tabindex="0" role="img" aria-label="An interactive round garden. Drag to rotate; click a blob to inspect. Keyboard: left and right to rotate, plus and minus to zoom, Enter to select a resident."></canvas>
            <div class="world-caption"><span class="caption-dot"></span><span id="world-state">Finding a rhythm</span></div>
            <div class="world-tools"><button class="icon-button" id="zoom-in" aria-label="Zoom in" title="Zoom in">${icon('plus')}</button><button class="icon-button" id="zoom-out" aria-label="Zoom out" title="Zoom out">${icon('minus')}</button></div>
            <div class="world-hint">${icon('mouse')}Drag to rotate<span>·</span>Click a little resident</div>
            <div class="inspection" id="inspection" hidden></div>
          </div>
          <div class="population-strip">
            <div class="population-stat fruit-stat"><span class="stat-symbol">${icon('leaf')}</span><div><span class="stat-label">Available fruit</span><span class="stat-value" id="fruit-count">72</span></div><span class="stat-description">Fresh from the trees</span><span class="stat-mini" id="fruit-trend">${icon('leaf')}</span></div>
            <div class="population-stat blue-stat">${blobFace('blue')}<div><span class="stat-label">Blue blobs</span><span class="stat-value" id="blue-count">24</span></div><span class="stat-description">The gentle gatherers</span><span class="stat-mini" id="blue-trend"></span></div>
            <div class="population-stat red-stat">${blobFace('red')}<div><span class="stat-label">Red blobs</span><span class="stat-value" id="red-count">6</span></div><span class="stat-description">The curious chasers</span><span class="stat-mini" id="red-trend"></span></div>
          </div>
          <div class="playback-bar">
            <div class="playback-controls"><button id="play-pause" class="play-button">${icon('pause')}<span>Pause</span></button><button class="icon-button" id="step" aria-label="Advance one second" title="Pause and advance one second">${icon('step')}</button><span class="control-divider"></span><button class="icon-button" id="reset" aria-label="Reset garden" title="Reset garden with the same seed">${icon('reset')}</button><button class="icon-button" id="randomize" aria-label="Randomize garden" title="Grow a garden with a new random seed">${icon('shuffle')}</button></div>
            <div class="speed-control"><span>Life at</span><div class="speed-options" role="group" aria-label="Simulation speed"><button data-speed="0.5">½×</button><button class="selected" data-speed="1">1×</button><button data-speed="2">2×</button><button data-speed="5">5×</button></div></div>
          </div>
        </section>
        <section class="story-card card" aria-label="Population history">
          <div class="story-heading"><div><h2>${icon('chart')}The story so far</h2><p>Small interactions. Ever-changing populations.</p></div><div class="chart-tabs" role="tablist" aria-label="Chart type"><button class="selected" data-chart="timeline" role="tab" aria-selected="true">Timeline</button><button data-chart="phase" role="tab" aria-selected="false">Phase plot</button></div></div>
          <div class="chart-legend"><span class="chart-label" id="chart-axis-label">POPULATION</span><div><button data-series="fruit" aria-pressed="true"><span class="legend-dot fruit"></span>Fruit</button><button data-series="blue" aria-pressed="true"><span class="legend-dot blue"></span>Blue blobs</button><button data-series="red" aria-pressed="true"><span class="legend-dot red"></span>Red blobs</button></div><button class="export-button" id="export" title="Download recorded history" aria-label="Download recorded history as CSV">${icon('download')}</button></div>
          <div id="chart" class="chart"></div>
          <div class="chart-footer"><span><span class="recording-dot"></span>Every point is a moment from your garden.</span><span id="chart-time">0 seconds of life</span></div>
        </section>
      </div>
      <aside class="sidebar">
        <section class="settings-card card">
          <div class="settings-header"><div><h2>Your garden, your rules.</h2><p>A small change can change everything.</p></div><span class="settings-icon">${icon('sliders')}</span></div>
          <div class="preset-section"><label class="field-label" for="preset">START WITH A FEELING</label><div class="preset-select"><span id="preset-icon">${icon('sprout')}</span><select id="preset">${Object.entries(PRESETS).map(([key, value]) => `<option value="${key}">${value.name}</option>`).join('')}</select>${icon('chevron')}</div><p id="preset-description">${PRESETS.balanced.description}</p></div>
          <div class="settings-tabs" role="tablist" aria-label="Garden controls"><button data-tab="fruit" class="selected" role="tab" aria-selected="true">${icon('leaf')}Fruit</button><button data-tab="blue" role="tab" aria-selected="false">${icon('blue')}Blue</button><button data-tab="red" role="tab" aria-selected="false">${icon('blue')}Red</button><button data-tab="world" role="tab" aria-selected="false">${icon('globe')}World</button></div>
          <div id="controls" class="controls-panel" role="tabpanel"></div>
          <div class="live-note">${icon('sparkle')}<span id="settings-note">Little adjustments, live in your world.</span></div>
          <div class="ecosystem-note"><div class="ecosystem-chain"><span class="chain-leaf">${icon('leaf')}</span><span class="chain-arrow">···${icon('chevronRight')}</span>${blobFace('blue')}<span class="chain-arrow">···${icon('chevronRight')}</span>${blobFace('red')}<span class="chain-spark">${icon('sparkle')}</span></div><p>A little fruit. A little chase.<br><strong>Everything is connected.</strong></p></div>
        </section>
        <section class="field-note card"><div class="field-note-label">${icon('book')}A NOTE FROM THE GARDEN</div><h3 id="summary-title">Every garden starts somewhere.</h3><p id="summary-text">A few trees, a handful of residents, and a world of possibilities. Let’s see what grows.</p><button id="meet-resident">Meet a resident${icon('arrow')}</button><div class="note-decoration">${icon('sprout')}</div></section>
      </aside>
    </div>
    <footer class="page-footer"><span>${icon('sprout')}No scores. No rush. Just a little life.</span><span>GARDEN <span id="seed-label">#0042</span><i>·</i><span id="tree-label">12 trees</span><i>·</i><button id="keyboard-help">Space to pause${icon('circleHelp')}</button></span></footer>
  </main>
  <div class="toast" id="toast" role="status" hidden></div>
  <dialog id="help-dialog"><div class="dialog-header"><span class="brand-mark">${icon('sprout')}</span><button class="icon-button" id="close-help" aria-label="Close help">${icon('x')}</button></div><div class="eyebrow">WELCOME TO YOUR LITTLE WORLD</div><h2>A garden with a life of its own.</h2><p class="dialog-intro">A few simple rules. A thousand little stories.</p><div class="help-rule"><span class="help-icon green">${icon('leaf')}</span><div><h3>It all starts with fruit.</h3><p>Trees slowly grow fruit. Blue blobs find it, take a bite, and turn it into energy. You’ll see each harvest disappear from the branches.</p></div></div><div class="help-rule"><span class="help-icon blue">${icon('blue')}</span><div><h3>Energy makes life happen.</h3><p>Moving costs energy. With enough saved up, a blob can make a little copy of itself. The parent pays the energy cost.</p></div></div><div class="help-rule"><span class="help-icon red">${icon('heart')}</span><div><h3>A gentle chase keeps things moving.</h3><p>Reds gain energy through contact with blues. Too many reds means fewer blues, then less energy for reds. Populations rise and fall together.</p></div></div><div class="help-bottom">${icon('mouse')}Drag to turn your world. Click a blob to get to know it.<br><span>Space: play / pause · →: step while paused · R: reset · Esc: close</span></div><button class="dialog-cta" id="start-exploring">Let’s see what grows${icon('arrow')}</button></dialog>
`;

const $ = selector => document.querySelector(selector);
const renderer = new WorldRenderer($('#world'), garden, selectBlob);
const controlDefinitions = {
  fruit: [
    { key: 'growth', label: 'Fruit growth', min: 0.1, max: 2, step: 0.1, unit: '×', low: 'Slow & steady', high: 'A little abundant', hint: 'How quickly each tree grows a new fruit.' },
    { key: 'fruitLimit', label: 'Fruit per tree', min: 1, max: 12, step: 1, unit: '', low: 'A few', high: 'A feast', hint: 'The most fruit a single tree can hold.' },
    { key: 'returnDelay', label: 'Time to regrow', min: 0, max: 20, step: 1, unit: ' s', low: 'Soon', high: 'Take your time', hint: 'How long a tree rests after a harvest.' },
  ],
  blue: [
    { key: 'blueEnergy', label: 'Energy use', min: 0.2, max: 2, step: 0.1, unit: ' /s' },
    { key: 'blueSpeed', label: 'Wandering speed', min: 0.3, max: 2, step: 0.1, unit: '×' },
    { key: 'blueVision', label: 'Sensing range', min: 1, max: 12, step: 0.5, unit: '' },
    { key: 'blueThreshold', label: 'Energy to make a copy', min: 55, max: 130, step: 1, unit: '' },
    { key: 'eatingTime', label: 'Time to enjoy a bite', min: 0.4, max: 5, step: 0.2, unit: ' s' },
  ],
  red: [
    { key: 'redEnergy', label: 'Energy use', min: 0.2, max: 2, step: 0.1, unit: ' /s' },
    { key: 'redSpeed', label: 'Chasing speed', min: 0.3, max: 2, step: 0.1, unit: '×' },
    { key: 'redVision', label: 'Sensing range', min: 1, max: 12, step: 0.5, unit: '' },
    { key: 'contactStrength', label: 'Contact energy', min: 8, max: 60, step: 1, unit: '' },
    { key: 'redThreshold', label: 'Energy to make a copy', min: 55, max: 140, step: 1, unit: '' },
    { key: 'pauseTime', label: 'A little rest after contact', min: 0.5, max: 8, step: 0.5, unit: ' s' },
  ],
  world: [
    { key: 'trees', label: 'Starting trees', min: 3, max: 24, step: 1, unit: '' },
    { key: 'blues', label: 'Starting blue blobs', min: 0, max: 60, step: 1, unit: '' },
    { key: 'reds', label: 'Starting red blobs', min: 0, max: 30, step: 1, unit: '' },
    { key: 'worldSize', label: 'World size', min: 6, max: 15, step: 1, unit: '' },
  ],
};

function renderControls() {
  const defs = controlDefinitions[activeTab];
  $('#controls').className = `controls-panel ${activeTab === 'fruit' ? 'spacious' : 'compact'} ${activeTab}`;
  $('#controls').innerHTML = defs.map(d => `<div class="slider-field"><div class="slider-label"><label for="control-${d.key}">${d.label}${d.hint ? `<span class="label-help" tabindex="0" aria-label="${d.hint}" title="${d.hint}">${icon('circleHelp')}</span>` : ''}</label><output id="value-${d.key}" for="control-${d.key}">${formatValue(settings[d.key], d.unit)}</output></div><input id="control-${d.key}" type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${settings[d.key]}" data-setting="${d.key}" style="--range-progress:${(settings[d.key] - d.min) / (d.max - d.min) * 100}%" aria-label="${d.label}"/>${d.low ? `<div class="range-captions"><span>${d.low}</span><span>${d.high}</span></div>` : ''}</div>`).join('') + (activeTab === 'world' ? `<div class="seed-field"><label for="seed">Random seed</label><div><span>#</span><input id="seed" type="number" min="0" max="999999" value="${settings.seed}" aria-label="Random seed"/><button id="roll-seed" class="icon-button" aria-label="Choose a random seed">${icon('shuffle')}</button></div></div><button class="apply-button" id="apply-world">${icon('sprout')}Plant a new garden</button>` : '');
  $('#settings-note').textContent = activeTab === 'world' ? 'Starting settings apply to your next garden.' : 'Little adjustments, live in your world.';
  $('[data-tab="fruit"]').parentElement.querySelectorAll('button').forEach(button => {
    const selected = button.dataset.tab === activeTab;
    button.classList.toggle('selected', selected); button.setAttribute('aria-selected', selected);
  });
  $('#controls').querySelectorAll('input[type="range"]').forEach(input => input.addEventListener('input', () => {
    const key = input.dataset.setting;
    const d = defs.find(def => def.key === key);
    settings[key] = Number(input.value);
    if (activeTab !== 'world') garden.updateSetting(key, settings[key]);
    $(`#value-${key}`).textContent = formatValue(settings[key], d.unit);
    input.style.setProperty('--range-progress', `${(settings[key] - d.min) / (d.max - d.min) * 100}%`);
    $('#preset-description').textContent = 'A garden with your own little adjustments.';
    updateUI();
  }));
  $('#seed')?.addEventListener('change', e => {
    settings.seed = Math.max(0, Math.min(999999, Math.floor(Number(e.target.value) || 0)));
    e.target.value = settings.seed;
  });
  $('#roll-seed')?.addEventListener('click', () => { settings.seed = Math.floor(Math.random() * 999999); $('#seed').value = settings.seed; });
  $('#apply-world')?.addEventListener('click', () => resetGarden('A new little world is ready to grow.'));
}

function formatValue(value, unit) { return `${Number.isInteger(value) ? value : value.toFixed(1)}${unit}`; }
function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }

function setRunning(value) {
  running = value;
  $('#play-pause').innerHTML = `${icon(running ? 'pause' : 'play')}<span>${running ? 'Pause' : 'Play'}</span>`;
  $('#play-pause').setAttribute('aria-label', running ? 'Pause simulation' : 'Play simulation');
  $('#live-status').innerHTML = `<span></span>${running ? 'LIVE' : 'PAUSED'}`;
  $('#live-status').classList.toggle('paused', !running);
}

function resetGarden(message) {
  garden.reset(settings);
  renderer.seed = null;
  resetCount++;
  selectedId = null;
  renderer.selected = null;
  $('#inspection').hidden = true;
  updateUI();
  if (message) toast(message);
}

function selectBlob(id) {
  selectedId = id;
  renderer.selected = id;
  updateInspection();
}

function updateInspection() {
  if (!selectedId) return;
  const panel = $('#inspection');
  const blob = garden.blobs.find(b => b.id === selectedId);
  panel.hidden = false;
  if (!blob) {
    panel.innerHTML = `<button class="inspection-close icon-button" aria-label="Close resident details">${icon('x')}</button><span class="inspection-eyebrow">A LITTLE LIFE, WELL LIVED</span><h3>This resident has faded.</h3><p>Its story is part of your garden now.</p><button class="inspection-meet">Meet another resident ${icon('arrow')}</button>`;
  } else {
    const blue = blob.kind === 'blue';
    const energy = Math.max(0, blob.energy);
    panel.innerHTML = `<button class="inspection-close icon-button" aria-label="Close resident details">${icon('x')}</button><div class="resident-title">${blobFace(blob.kind)}<div><span class="inspection-eyebrow">A LITTLE ${blob.kind.toUpperCase()} LIFE</span><h3>${blue ? 'Blue' : 'Red'} #${String(blob.id).padStart(2, '0')}</h3></div></div><div class="resident-action"><span class="legend-dot ${blob.kind}"></span>${blob.action}</div><div class="energy-label"><span>Energy</span><strong>${Math.round(energy)} <span>/ 150</span></strong></div><div class="energy-track"><div class="${blob.kind}" style="width:${Math.min(100, energy / 150 * 100)}%"></div></div><dl><div><dt>Age</dt><dd>${formatTime(blob.age)}</dd></div><div><dt>Speed</dt><dd>${((blue ? garden.settings.blueSpeed : garden.settings.redSpeed) * blob.trait).toFixed(2)}×</dd></div><div><dt>Sensing range</dt><dd>${((blue ? garden.settings.blueVision : garden.settings.redVision) * blob.trait).toFixed(1)}</dd></div><div><dt>Rest remaining</dt><dd>${blob.timer.toFixed(1)} s</dd></div><div><dt>Generation</dt><dd>${blob.generation}</dd></div><div><dt>Parent</dt><dd>${blob.parent ? `#${blob.parent}` : 'First little one'}</dd></div></dl>`;
  }
  panel.querySelector('.inspection-close').addEventListener('click', closeInspection);
  panel.querySelector('.inspection-meet')?.addEventListener('click', meetResident);
}

function closeInspection() { selectedId = null; renderer.selected = null; $('#inspection').hidden = true; }
function meetResident() {
  if (!garden.blobs.length) { toast('A quiet garden. Reset to welcome some new residents.'); return; }
  selectBlob(garden.blobs[Math.floor(Math.random() * garden.blobs.length)].id);
  $('#world').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateUI() {
  const counts = garden.counts();
  for (const key of ['fruit', 'blue', 'red']) $(`#${key}-count`).textContent = counts[key];
  const previous = garden.history[Math.max(0, garden.history.length - 15)];
  for (const kind of ['blue', 'red']) {
    const delta = counts[kind] - previous[kind];
    $(`#${kind}-trend`).textContent = delta === 0 ? '—' : `${delta > 0 ? '↗' : '↘'} ${Math.abs(delta)}`;
    $(`#${kind}-trend`).title = 'Change over the last 15 recorded moments';
  }
  $('#elapsed').textContent = formatTime(garden.time);
  $('#seed-label').textContent = `#${String(garden.settings.seed).padStart(4, '0')}`;
  $('#tree-label').textContent = `${garden.plants.length} trees`;
  $('#chart-time').textContent = `${Math.floor(garden.time)} seconds of life`;
  const summary = garden.summary();
  $('#summary-title').textContent = summary.title;
  $('#summary-text').textContent = summary.text;
  $('#world-state').textContent = summary.state;
  $('#chart').innerHTML = chartMode === 'timeline' ? timeline(garden.history, visible) : phasePlot(garden.history);
  updateInspection();
}

function toast(message) {
  clearTimeout(toastTimeout);
  $('#toast').innerHTML = `${icon('sprout')}<span>${message}</span>`;
  $('#toast').hidden = false;
  toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 3500);
}

$('#play-pause').addEventListener('click', () => setRunning(!running));
$('#step').addEventListener('click', () => { setRunning(false); for (let i = 0; i < 10; i++) garden.tick(0.1); updateUI(); });
$('#reset').addEventListener('click', () => resetGarden('Same seed. A fresh beginning.'));
$('#randomize').addEventListener('click', () => { settings.seed = Math.floor(Math.random() * 999999); resetGarden('A new seed. A new story.'); if (activeTab === 'world') renderControls(); });
$('#preset').addEventListener('change', e => {
  preset = e.target.value;
  settings = { ...DEFAULTS, ...PRESETS[preset].settings, seed: settings.seed };
  $('#preset-description').textContent = PRESETS[preset].description;
  $('#preset-icon').innerHTML = icon(PRESETS[preset].icon);
  resetGarden(`${PRESETS[preset].name}. Let’s see what grows.`);
  renderControls();
});
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => { activeTab = button.dataset.tab; renderControls(); }));
document.querySelectorAll('[data-speed]').forEach(button => button.addEventListener('click', () => {
  speed = Number(button.dataset.speed);
  document.querySelectorAll('[data-speed]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', b === button); });
}));
document.querySelectorAll('[data-chart]').forEach(button => button.addEventListener('click', () => {
  chartMode = button.dataset.chart;
  document.querySelectorAll('[data-chart]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-selected', b === button); });
  $('#chart-axis-label').textContent = chartMode === 'timeline' ? 'POPULATION' : 'THE POPULATION DANCE';
  document.querySelector('.chart-legend > div').style.visibility = chartMode === 'timeline' ? 'visible' : 'hidden';
  updateUI();
}));
document.querySelectorAll('[data-series]').forEach(button => button.addEventListener('click', () => {
  const series = button.dataset.series;
  if (visible[series] && Object.values(visible).filter(Boolean).length === 1) return;
  visible[series] = !visible[series];
  button.setAttribute('aria-pressed', visible[series]);
  button.classList.toggle('muted', !visible[series]);
  updateUI();
}));
$('#zoom-in').addEventListener('click', () => renderer.setZoom(renderer.zoom + 0.1));
$('#zoom-out').addEventListener('click', () => renderer.setZoom(renderer.zoom - 0.1));
$('#expand').addEventListener('click', () => {
  const expanded = $('#garden').classList.toggle('expanded');
  document.body.classList.toggle('world-expanded', expanded);
  $('#expand').setAttribute('aria-label', expanded ? 'Exit expanded garden' : 'Expand garden');
  $('#expand').title = expanded ? 'Exit expanded garden' : 'Expand garden';
});
$('#meet-resident').addEventListener('click', meetResident);
function openHelp() { $('#help-dialog').showModal(); }
$('#how-it-works').addEventListener('click', openHelp);
$('#keyboard-help').addEventListener('click', openHelp);
$('#close-help').addEventListener('click', () => $('#help-dialog').close());
$('#start-exploring').addEventListener('click', () => $('#help-dialog').close());
$('#help-dialog').addEventListener('click', e => { if (e.target === $('#help-dialog')) $('#help-dialog').close(); });
$('#export').addEventListener('click', () => {
  const csv = 'time_seconds,fruit,blue_blobs,red_blobs\n' + garden.history.map(d => `${d.time.toFixed(1)},${d.fruit},${d.blue},${d.red}`).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a'); link.href = url; link.download = `garden-${garden.settings.seed}-history.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('A little piece of your garden, saved.');
});
document.addEventListener('keydown', e => {
  if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName) || $('#help-dialog').open) return;
  if (e.code === 'Space') { e.preventDefault(); setRunning(!running); }
  if (e.key.toLowerCase() === 'r') resetGarden('Same seed. A fresh beginning.');
  if (e.key === 'ArrowRight' && !running && e.target !== $('#world')) $('#step').click();
  if (e.key === 'Escape') {
    closeInspection();
    if ($('#garden').classList.contains('expanded')) $('#expand').click();
  }
});

renderControls();
setRunning(true);
updateUI();
let lastTime = performance.now();
let accumulator = 0;
let lastUI = 0;
function frame(now) {
  const elapsed = Math.min((now - lastTime) / 1000, 0.2);
  lastTime = now;
  if (running && !document.hidden) {
    accumulator += elapsed * speed;
    while (accumulator >= 0.1) { garden.tick(0.1); accumulator -= 0.1; }
  }
  renderer.draw();
  if (now - lastUI > 250) { updateUI(); lastUI = now; }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Read-only diagnostics make runtime behavior observable without bypassing the UI.
Object.defineProperty(window, 'gardenDiagnostics', { get: () => ({ time: garden.time, running, speed, preset, counts: garden.counts(), settings: { ...garden.settings }, history: garden.history.map(p => ({ ...p })), births: { ...garden.births }, faded: { ...garden.faded }, meals: garden.meals, contacts: garden.contacts, selectedId, rotation: renderer.rotation, zoom: renderer.zoom, resetCount, blobPositions: renderer.hitAreas.map(p => ({ ...p })) }) });
