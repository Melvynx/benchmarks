import { Garden, defaultSettings, presets } from './simulation.js';
import { World } from './world.js';
import { Charts } from './charts.js';

const paths = {
  sprout: '<path d="M12 21v-9m0 4C4 16 3 6 3 6s9-1 9 10Zm0-5C12 3 21 3 21 3s0 8-9 8Z"/>',
  leaf: '<path d="M20 4C9 2 3 7 4 14c1 6 10 8 14 1 2-4 2-7 2-11ZM4 20l10-10"/>',
  sliders: '<path d="M4 7h5m4 0h7M4 17h11m4 0h1M9 4v6m6 4v6"/><circle cx="11" cy="7" r="2"/><circle cx="17" cy="17" r="2"/>',
  down: '<path d="m7 10 5 5 5-5"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  shuffle: '<path d="m17 3 4 4-4 4m0 2 4 4-4 4M3 7h3c5 0 5 10 10 10h5M3 17h3c2 0 3-2 4-4m4-4c1-2 2-2 4-2h3"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  step: '<path d="m5 5 10 7-10 7ZM19 5v14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 1c0 2-3 2-3 4m0 3h.01"/>',
  book: '<path d="M12 6C8 3 3 4 3 4v15s5-1 9 2c4-3 9-2 9-2V4s-5-1-9 2Zm0 0v15"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  rotate: '<path d="M4 10a8 8 0 0 1 14-5l3 3M21 3v5h-5M20 14A8 8 0 0 1 6 19l-3-3M3 21v-5h5"/>',
  pointer: '<path d="m5 3 14 9-7 2-3 7Z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  sparkle: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Zm7-1v4m-2-2h4"/>',
  mountain: '<path d="m3 20 7-15 4 8 3-5 5 12ZM7 11l3 2 2-2"/>',
  arrow: '<path d="M6 18 18 6M6 6h12v12"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
};
const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.leaf}</svg>`;
const miniBlob = species => `<span class="mini-blob ${species}" aria-hidden="true"><i></i><i></i></span>`;
let settings = { ...defaultSettings };
let garden = new Garden(settings);
for (let index = 0; index < 280; index++) garden.step(0.1);
let playing = false;
let speed = 1;
let selectedPreset = 'balanced';
let selectedBlob = null;
let lastUi = 0;
let lastFrame = 0;
let accumulator = 0;
let modalType = null;

const groups = [
  { id: 'environment', name: 'Fruit & trees', icon: 'leaf', class: 'fruit', open: true, fields: [
    ['growth', 'Fruit growth', 0.05, 0.8, 0.01, '×', 'How quickly new fruit ripens after its return delay.'],
    ['fruitLimit', 'Fruit per tree', 1, 10, 1, '', 'Maximum attached fruit on each tree.'],
    ['returnDelay', 'Regrowth delay', 1, 40, 1, 's', 'How long a picked fruit rests before regrowing.'],
  ] },
  { id: 'blue', name: 'Blue blobs', class: 'blue', open: true, fields: [
    ['blueEnergy', 'Energy use', 0.2, 3, 0.05, '/s', 'Energy used while moving. Waiting uses less.'],
    ['blueSpeed', 'Moving speed', 0.2, 1.8, 0.05, '×', 'How quickly a blue blob moves through the garden.'],
    ['blueVision', 'Sensing range', 1, 9, 0.1, '', 'How far a blob can see ripe fruit.'],
    ['blueThreshold', 'Copy threshold', 55, 150, 1, '⚡', 'Stored energy needed to make a baby. Copying costs 44 energy; the baby starts with 30.'],
    ['eatingTime', 'Eating time', 0.4, 5, 0.1, 's', 'A real pause to chew, not just an animation.'],
  ] },
  { id: 'red', name: 'Red blobs', class: 'red', open: false, fields: [
    ['redEnergy', 'Energy use', 0.2, 3, 0.05, '/s', 'Energy red blobs use while moving.'],
    ['redSpeed', 'Moving speed', 0.2, 1.8, 0.05, '×', 'How quickly red blobs move toward blue friends.'],
    ['redVision', 'Sensing range', 1, 9, 0.1, '', 'How far a red blob can see blue friends.'],
    ['contactStrength', 'Contact strength', 10, 70, 1, '⚡', 'Energy taken from a blue blob on contact; 85% restores the red blob.'],
    ['redThreshold', 'Copy threshold', 60, 180, 1, '⚡', 'Energy required to grow the red family.'],
    ['pauseTime', 'After-contact pause', 1, 12, 0.5, 's', 'A real resting period after each successful interaction.'],
  ] },
  { id: 'starting', name: 'Starting world', icon: 'mountain', class: 'neutral', open: false, fields: [
    ['trees', 'Fruit trees', 2, 20, 1, '', 'Starting tree count. Apply with Reset.'],
    ['blues', 'Blue blobs', 0, 60, 1, '', 'Starting blue population. Apply with Reset.'],
    ['reds', 'Red blobs', 0, 50, 1, '', 'Starting red population. Apply with Reset.'],
    ['worldSize', 'World radius', 5, 12, 0.5, '', 'Starting world radius. Apply with Reset.'],
  ] },
];

function displayValue(value, unit) {
  return `${Number.isInteger(value) ? value : Number(value.toFixed(2))}${unit ? `<span>${unit}</span>` : ''}`;
}

function sectionMarkup(group) {
  return `<details class="settings-section ${group.class}" ${group.open ? 'open' : ''}>
    <summary><span class="section-label">${group.icon ? icon(group.icon) : miniBlob(group.class)}${group.name}</span>${icon('down', 'chevron')}</summary>
    <div class="section-content">${group.fields.map(([key, label, min, max, step, unit, description]) => `<div class="slider-field"><label for="${key}" title="${description}">${label}<output for="${key}" id="value-${key}">${displayValue(settings[key], unit)}</output></label><input type="range" id="${key}" data-setting="${key}" min="${min}" max="${max}" step="${step}" value="${settings[key]}" aria-label="${label}" title="${description}" style="--progress:${(settings[key] - min) / (max - min) * 100}%"/></div>`).join('')}${group.id === 'starting' ? '<div class="seed-field"><label for="seed">Random seed</label><input id="seed" type="number" min="0" max="999999" value="42" data-setting="seed"/></div><p class="settings-note">Starting settings take effect on reset.</p>' : ''}</div></details>`;
}

document.querySelector('#root').innerHTML = `
  <header class="app-header"><a class="brand" href="/" aria-label="ChatGPT home"><span class="brand-mark">${icon('sprout')}</span><div><h1>ChatGPT</h1><span>A tiny world. A living story.</span></div></a>
    <nav aria-label="Main navigation"><button class="nav-link active" id="garden-nav">The garden<span class="nav-dot"></span></button><button class="nav-link" id="notes-nav">Field notes</button></nav>
    <button class="help-button" id="help-button">${icon('help')}<span>How it works</span></button>
  </header>
  <div class="app-layout">
    <aside class="sidebar"><div class="sidebar-heading"><span>${icon('sliders')}Tune the garden</span><span class="live-label"><i></i>LIVE</span></div>
      <div class="preset-block"><label class="eyebrow" for="preset">A PLACE TO START</label><div class="preset-select">${icon('sprout')}<select id="preset" aria-label="Garden preset">${presets.map(preset => `<option value="${preset.id}">${preset.name}</option>`).join('')}</select>${icon('down')}</div><p id="preset-description">A little of everything, in harmony.</p></div>
      <div class="settings-groups">${groups.map(sectionMarkup).join('')}</div>
      <div class="sidebar-bottom">${icon('sprout')}<p>Small changes.<br/><strong>Big little stories.</strong></p><span class="handwritten">let it grow.</span></div>
    </aside>
    <main>
      <div class="page-heading"><div><div class="eyebrow">YOUR LIVING SANDBOX</div><h2>Life, in a little loop<span>.</span></h2><p>Plant a world. Nudge the rules. See what grows.</p></div><div class="heading-actions"><button class="subtle-button" id="randomize">${icon('shuffle')}Randomize</button><button class="outline-button" id="reset">${icon('reset')}Reset world</button></div></div>
      <section class="world-panel" aria-label="Interactive living garden">
        <div class="world-top"><div class="population-stats">
          <div class="stat fruit-stat"><span class="stat-icon">${icon('leaf')}</span><div><span class="stat-label">Ripe fruit</span><div class="stat-value"><strong id="count-fruit">72</strong><span class="stat-unit">on the trees</span></div></div></div>
          <div class="stat blue-stat"><span class="stat-icon">${miniBlob('blue')}</span><div><span class="stat-label">Blue blobs</span><div class="stat-value"><strong id="count-blue">24</strong><span class="stat-unit">little grazers</span></div></div></div>
          <div class="stat red-stat"><span class="stat-icon">${miniBlob('red')}</span><div><span class="stat-label">Red blobs</span><div class="stat-value"><strong id="count-red">8</strong><span class="stat-unit">little chasers</span></div></div></div>
        </div><div class="world-status"><span class="day" id="day">DAY 01</span><span class="status-text" id="status-text"><i></i>Ready to grow</span></div></div>
        <div class="canvas-wrap"><canvas id="world" role="img" aria-label="Round garden with green fruit trees and blue and red blobs. Drag to rotate. Click a blob to inspect it." tabindex="0"></canvas>
          <div class="world-tools"><button class="icon-button" id="camera-reset" title="Reset garden view" aria-label="Reset garden view">${icon('rotate')}</button><button class="icon-button" id="fullscreen" title="Expand garden" aria-label="Expand garden">${icon('expand')}</button></div>
          <div id="inspector" class="inspector" hidden></div>
          <div class="garden-caption"><span>${icon('rotate')}Drag to rotate</span><i></i><span>${icon('pointer')}Click a blob to say hello</span></div>
          <span class="garden-coordinate">a world of possibilities</span>
        </div>
        <div class="playback-bar"><div class="playback-actions"><button class="play-button" id="play">${icon('play')}<span>Play garden</span></button><button class="step-button" id="step" title="Pause and advance one simulated second" aria-label="Step forward">${icon('step')}</button><span class="keyboard-hint">space to play</span></div>
          <div class="speed-control"><span class="eyebrow">SPEED</span><div class="speed-options">${[1, 2, 5, 10].map(value => `<button data-speed="${value}" class="${value === 1 ? 'selected' : ''}" aria-label="${value} times simulation speed" aria-pressed="${value === 1}">${value}<span>×</span></button>`).join('')}</div></div>
          <div class="elapsed">${icon('clock')}<span id="elapsed">00:00</span></div>
        </div>
      </section>
      <section class="chart-card" aria-label="Garden history"><div class="chart-header"><div><h3>The story so far${icon('sparkle')}</h3><p>Little lives, big connections.</p></div><div class="chart-header-right"><div class="chart-tabs" role="tablist" aria-label="Chart view"><button id="population-tab" class="selected" role="tab" aria-selected="true">Population</button><button id="phase-tab" role="tab" aria-selected="false">Phase plot</button></div><button class="icon-button" id="download" title="Download recorded history as CSV" aria-label="Download recorded history">${icon('download')}</button></div></div>
        <div class="chart-legend">${[['fruit', 'Ripe fruit'], ['blue', 'Blue blobs'], ['red', 'Red blobs']].map(([key, label]) => `<button data-series="${key}" aria-pressed="true"><i class="dot ${key}"></i>${label}</button>`).join('')}<span id="chart-note">Real lives. Real data.</span></div>
        <div id="chart" class="chart"></div><div class="chart-axis-label" id="axis-label">SIMULATION DAYS</div>
      </section>
      <section class="story-strip"><span class="story-icon">${icon('sprout')}</span><div><h4 id="story-title">Every little life is connected.</h4><p id="story-text">Fruit feeds blue blobs. Blue blobs help red blobs.</p></div><button id="story-more" aria-label="Read garden field notes">${icon('arrow')}</button></section>
      <footer class="main-footer"><span><i class="tiny-dot"></i>Nothing is scripted. Everything is connected.</span><span>Made for a little curiosity${icon('sprout')}</span></footer>
    </main>
  </div>
  <dialog id="modal"><button class="dialog-close icon-button" id="close-modal" aria-label="Close dialog">${icon('close')}</button><div id="modal-content"></div></dialog>
  <div id="toast" class="toast" role="status" hidden></div>
`;

const world = new World(document.querySelector('#world'), () => garden, id => { selectedBlob = id; updateInspector(); });
const charts = new Charts(document.querySelector('#chart'), () => garden);

function notify(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(notify.timeout);
  notify.timeout = setTimeout(() => { toast.hidden = true; }, 3000);
}

function refreshControls() {
  for (const input of document.querySelectorAll('[data-setting]')) {
    const key = input.dataset.setting;
    input.value = settings[key];
    if (input.type === 'range') {
      input.style.setProperty('--progress', `${(settings[key] - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
      const field = groups.flatMap(group => group.fields).find(item => item[0] === key);
      document.querySelector(`#value-${key}`).innerHTML = displayValue(settings[key], field[5]);
    }
  }
}

function reset() {
  garden = new Garden(settings);
  selectedBlob = null;
  world.selected = null;
  accumulator = 0;
  setPlaying(false);
  updateUi();
}

function setPlaying(value) {
  playing = value;
  document.querySelector('#play').innerHTML = `${icon(playing ? 'pause' : 'play')}<span>${playing ? 'Pause garden' : 'Play garden'}</span>`;
  document.querySelector('#status-text').innerHTML = `<i class="${playing ? 'running' : ''}"></i>${playing ? 'Life is happening' : garden.time > 0 ? 'Taking a little pause' : 'Ready to grow'}`;
  document.querySelector('#world').setAttribute('aria-label', `Round interactive garden. ${garden.counts().blue} blue blobs and ${garden.counts().red} red blobs. Drag to rotate; click a blob to inspect.`);
}

function updateInspector() {
  const inspector = document.querySelector('#inspector');
  inspector.hidden = selectedBlob === null;
  if (selectedBlob === null) return;
  const blob = garden.blobs.find(item => item.id === selectedBlob);
  if (!blob) { inspector.innerHTML = `<button class="inspector-close" id="close-inspector" aria-label="Close inspector">${icon('close')}</button><div class="inspector-heading">${icon('sprout')}Back to the garden</div><p>This little blob ran out of energy and faded. Every life leaves a little story.</p>`; return; }
  const speciesName = blob.species === 'blue' ? 'Blue' : 'Red';
  const energyPercentage = Math.min(100, blob.energy / settings[blob.species === 'blue' ? 'blueThreshold' : 'redThreshold'] * 100);
  inspector.innerHTML = `<button class="inspector-close" id="close-inspector" aria-label="Close inspector">${icon('close')}</button><div class="inspector-heading">${miniBlob(blob.species)}${speciesName} blob <span>#${blob.id}</span></div><span class="blob-action">${blob.action}</span><div class="energy-label"><span>Energy</span><strong>${blob.energy.toFixed(1)} ⚡</strong></div><div class="energy-track"><i style="width:${energyPercentage}%;background:${blob.species === 'blue' ? '#77aac0' : '#d98f80'}"></i></div><dl><div><dt>Age</dt><dd>${(blob.age / 12).toFixed(1)} days</dd></div><div><dt>Speed</dt><dd>${(settings[blob.species === 'blue' ? 'blueSpeed' : 'redSpeed'] * blob.trait).toFixed(2)}×</dd></div><div><dt>Sensing range</dt><dd>${(settings[blob.species === 'blue' ? 'blueVision' : 'redVision'] * blob.trait).toFixed(1)}</dd></div><div><dt>Pause left</dt><dd>${blob.pause.toFixed(1)}s</dd></div><div><dt>Generation</dt><dd>${blob.generation}</dd></div><div><dt>Parent</dt><dd>${blob.parent ? `#${blob.parent}` : 'First family'}</dd></div></dl>`;
}

function updateUi() {
  const counts = garden.counts();
  for (const key of ['fruit', 'blue', 'red']) document.querySelector(`#count-${key}`).textContent = counts[key];
  document.querySelector('#day').textContent = `DAY ${String(Math.floor(garden.time / 12) + 1).padStart(2, '0')}`;
  document.querySelector('#elapsed').textContent = `${String(Math.floor(garden.time / 60)).padStart(2, '0')}:${String(Math.floor(garden.time % 60)).padStart(2, '0')}`;
  const summary = garden.summary();
  document.querySelector('#story-title').textContent = summary.title;
  document.querySelector('#story-text').textContent = summary.text;
  charts.draw();
  updateInspector();
}

function openModal(type) {
  modalType = type;
  const content = document.querySelector('#modal-content');
  if (type === 'help') {
    content.innerHTML = `<div class="modal-mark">${icon('sprout')}</div><div class="eyebrow">A LITTLE GUIDE TO LIFE</div><h2>A garden of give & grow.</h2><p class="modal-intro">No winning. No losing. Just a little world finding its way.</p><div class="help-step"><span class="help-step-icon fruit">${icon('leaf')}</span><div><h3>It all starts with a snack.</h3><p>Fruit grows on the trees. Blue blobs find it, stop to chew, and gain 24 energy. Picked fruit waits, then visibly regrows.</p></div></div><div class="help-step"><span class="help-step-icon blue">${miniBlob('blue')}</span><div><h3>A little energy goes a long way.</h3><p>Blue blobs spend energy moving and resting. With enough saved, they make a baby. Copying costs 44 energy and a baby starts with 30—nothing grows for free.</p></div></div><div class="help-step"><span class="help-step-icon red">${miniBlob('red')}</span><div><h3>Everyone needs someone.</h3><p>Red blobs gently bump blue friends to share their energy. Then they rest. If blues become rare, reds eventually run out of energy and fade.</p></div></div><div class="help-tip">${icon('sliders')}Tune any rule live. Starting counts and seed apply on reset. One garden day is 12 simulated seconds. Press Space to play; right arrow to step.</div><button class="play-button modal-done" id="modal-done">${icon('check')}Got it. Let's grow.</button>`;
  } else {
    const summary = garden.summary();
    const bluePeak = Math.max(...garden.history.map(sample => sample.blue));
    const redPeak = Math.max(...garden.history.map(sample => sample.red));
    content.innerHTML = `<div class="modal-mark">${icon('book')}</div><div class="eyebrow">FIELD NOTES · SEED ${settings.seed}</div><h2>${summary.title}</h2><p class="modal-intro">${summary.text}</p><div class="notes-grid"><div><strong>${garden.births}</strong><span>little lives born</span></div><div><strong>${garden.meals}</strong><span>fruit enjoyed</span></div><div><strong>${garden.contacts}</strong><span>friendly contacts</span></div><div><strong>${garden.faded}</strong><span>lives faded</span></div></div><div class="notes-peaks">${miniBlob('blue')}Blue peak <b>${bluePeak}</b>${miniBlob('red')}Red peak <b>${redPeak}</b></div><h3 class="notes-heading">Moments in the garden</h3><div class="event-list">${garden.events.slice(-7).reverse().map(event => `<div><i class="dot ${event.kind}"></i><p>${event.text}</p><span>Day ${(event.time / 12).toFixed(1)}</span></div>`).join('')}</div><p class="notes-disclaimer">All charts are recorded from individual blobs—not scripted curves. Speed and sensing traits pass from parents to babies with small seeded variations. The opening garden has 28 seconds of real recorded history; Reset begins at zero.</p>`;
  }
  document.querySelector('#modal').showModal();
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.id === 'play') setPlaying(!playing);
  if (button.id === 'reset') { reset(); notify('A fresh start for your little world.'); }
  if (button.id === 'step') { setPlaying(false); for (let index = 0; index < 10; index++) garden.step(0.1); garden.record(); updateUi(); }
  if (button.id === 'randomize') {
    const preset = presets[Math.floor(Math.random() * presets.length)];
    settings = { ...preset.settings, seed: Math.floor(Math.random() * 99999) };
    selectedPreset = preset.id;
    document.querySelector('#preset').value = selectedPreset;
    document.querySelector('#preset-description').textContent = preset.subtitle;
    refreshControls(); reset(); notify(`A new ${preset.name.toLowerCase()}. Seed ${settings.seed}.`);
  }
  if (button.dataset.speed) {
    speed = Number(button.dataset.speed);
    for (const option of document.querySelectorAll('[data-speed]')) { option.classList.toggle('selected', option === button); option.setAttribute('aria-pressed', String(option === button)); }
  }
  if (button.id === 'camera-reset') { world.rotation = -0.18; world.zoom = 1; notify('Back to the sunny side.'); }
  if (button.id === 'fullscreen') {
    const panel = document.querySelector('.world-panel');
    if (document.fullscreenElement) document.exitFullscreen();
    else if (panel.requestFullscreen) panel.requestFullscreen().catch(() => { panel.classList.toggle('expanded'); world.resize(); });
    else { panel.classList.toggle('expanded'); world.resize(); }
  }
  if (['help-button', 'modal-done', 'close-modal'].includes(button.id)) {
    if (button.id === 'help-button') openModal('help');
    else { document.querySelector('#modal').close(); modalType = null; }
  }
  if (['notes-nav', 'story-more'].includes(button.id)) openModal('notes');
  if (button.id === 'garden-nav') document.querySelector('.world-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (button.id === 'close-inspector') { selectedBlob = null; world.selected = null; updateInspector(); }
  if (button.id === 'population-tab' || button.id === 'phase-tab') {
    charts.view = button.id === 'population-tab' ? 'population' : 'phase';
    for (const tab of document.querySelectorAll('[role="tab"]')) { tab.classList.toggle('selected', tab === button); tab.setAttribute('aria-selected', String(tab === button)); }
    document.querySelector('#axis-label').textContent = charts.view === 'population' ? 'SIMULATION DAYS' : 'BLUE BLOBS →    ·    RED BLOBS ↑';
    document.querySelector('#chart-note').textContent = charts.view === 'population' ? 'Real lives. Real data.' : 'A changing balance, traced in time.';
    charts.draw();
  }
  if (button.dataset.series) {
    const key = button.dataset.series;
    if (charts.visible[key] && Object.values(charts.visible).filter(Boolean).length === 1) return;
    charts.visible[key] = !charts.visible[key];
    button.classList.toggle('muted', !charts.visible[key]); button.setAttribute('aria-pressed', String(charts.visible[key])); charts.draw();
  }
  if (button.id === 'download') {
    const csv = 'seconds,day,ripe_fruit,blue_blobs,red_blobs\n' + garden.history.map(sample => `${sample.time.toFixed(2)},${(sample.time / 12).toFixed(2)},${sample.fruit},${sample.blue},${sample.red}`).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url; link.download = `garden-seed-${settings.seed}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify('Your little story, saved as CSV.');
  }
});

document.addEventListener('input', event => {
  const input = event.target;
  if (!input.dataset.setting) return;
  const value = Number(input.value);
  if (!Number.isFinite(value)) return;
  const key = input.dataset.setting;
  settings[key] = key === 'seed' ? Math.max(0, Math.min(999999, Math.floor(value))) : value;
  if (!['trees', 'blues', 'reds', 'worldSize', 'seed'].includes(key)) garden.updateSettings({ ...settings, trees: garden.settings.trees, blues: garden.settings.blues, reds: garden.settings.reds, worldSize: garden.settings.worldSize, seed: garden.settings.seed });
  refreshControls();
  if (['trees', 'blues', 'reds', 'worldSize', 'seed'].includes(key)) document.querySelector('.settings-note').textContent = 'Changes ready. Reset to plant this world.';
});

document.querySelector('#preset').addEventListener('change', event => {
  const preset = presets.find(item => item.id === event.target.value);
  selectedPreset = preset.id;
  settings = { ...preset.settings };
  document.querySelector('#preset-description').textContent = preset.subtitle;
  refreshControls(); reset(); notify(`${preset.name} is ready. Let's see what grows.`);
});

document.addEventListener('keydown', event => {
  if (event.target.matches('input,select,textarea,button') || document.querySelector('#modal').open) return;
  if (event.code === 'Space') { event.preventDefault(); setPlaying(!playing); }
  if (event.code === 'ArrowRight') { event.preventDefault(); document.querySelector('#step').click(); }
  if (event.code === 'Escape') { selectedBlob = null; world.selected = null; updateInspector(); }
});
document.querySelector('#modal').addEventListener('click', event => {
  if (event.target === event.currentTarget) { event.currentTarget.close(); modalType = null; }
});
document.querySelector('#modal').addEventListener('close', () => { modalType = null; });
document.addEventListener('visibilitychange', () => { lastFrame = 0; accumulator = 0; });

function frame(now) {
  const delta = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
  lastFrame = now;
  if (playing && !document.hidden) {
    accumulator += delta * speed * 2;
    while (accumulator >= 0.1) { garden.step(0.1); accumulator -= 0.1; }
  }
  world.draw(now, playing);
  if (now - lastUi > 250) { updateUi(); lastUi = now; }
  requestAnimationFrame(frame);
}
updateUi();
setPlaying(false);
requestAnimationFrame(frame);
window.gardenApp = { get garden() { return garden; }, get playing() { return playing; }, get settings() { return { ...settings }; }, get modal() { return modalType; }, world };
