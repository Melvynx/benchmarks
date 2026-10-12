import { defaults, Garden, presets } from './simulation.js';
import { renderWorld } from './renderWorld.js';

const groups = {
  fruit: { color: '#91b956', label: 'Fruit' },
  blue: { color: '#648ee9', label: 'Blue blobs' },
  red: { color: '#e77975', label: 'Red blobs' },
};

const sections = [
  { title: 'The garden', icon: '✿', items: [
    ['fruitGrowth', 'Fruit growth speed', .2, 2.5, .05, '×'], ['fruitLimit', 'Fruit limit per tree', 1, 9, 1, ''], ['fruitDelay', 'Fruit return delay', 2, 26, 1, 's'],
  ] },
  { title: 'Blue blobs', icon: '●', tone: 'blue', items: [
    ['blueUse', 'Energy use', .8, 5, .05, '/s'], ['blueSpeed', 'Move speed', 5, 24, .5, ''], ['blueVision', 'Sensing range', 10, 48, 1, ''], ['blueCopy', 'Copy threshold', 80, 150, 1, ''], ['blueEatTime', 'Eating time', .3, 4, .05, 's'],
  ] },
  { title: 'Red blobs', icon: '●', tone: 'red', items: [
    ['redUse', 'Energy use', 1, 5.5, .05, '/s'], ['redSpeed', 'Move speed', 5, 25, .5, ''], ['redVision', 'Sensing range', 10, 52, 1, ''], ['redStrength', 'Contact strength', 12, 46, 1, ''], ['redCopy', 'Copy threshold', 82, 150, 1, ''], ['redPause', 'Pause after contact', .5, 6, .1, 's'],
  ] },
  { title: 'Starting world', icon: '◇', items: [
    ['startTrees', 'Fruit trees', 3, 26, 1, ''], ['startBlue', 'Blue blobs', 2, 35, 1, ''], ['startRed', 'Red blobs', 0, 20, 1, ''], ['worldSize', 'World size', 35, 75, 1, ''],
  ] },
];

const iconPaths = {
  play: '<path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  step: '<path d="m5 5 9 7-9 7V5ZM18 5v14"/>',
  reset: '<path d="M4 11a8 8 0 1 1 2.4 6M4 5v6h6"/>',
  shuffle: '<path d="M3 6h2c5 0 7 12 12 12h4M18 15l3 3-3 3M3 18h2c2.3 0 4-2.5 5.3-5M14 8c.9-1.2 1.9-2 3-2h4M18 3l3 3-3 3"/>',
  rotate: '<path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5M18 3v4h-4M6 21v-4h4"/>',
  close: '<path d="M5 5 19 19M19 5 5 19"/>',
};
const icon = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
const valueText = (value, suffix) => `${Number.isInteger(value) ? value : Number(value.toFixed(2))}${suffix}`;

document.getElementById('root').innerHTML = `
  <div class="app-shell">
    <header class="site-header"><div class="brand"><div class="brand-mark"><span class="brand-sprout">✿</span></div><div><h1>GPT-6</h1><p>A living little garden</p></div></div><div class="header-right"><span class="header-dot"></span><span>ECOSYSTEM PLAYGROUND</span><span class="header-divider"></span><span>EST. RIGHT NOW</span></div></header>
    <main>
      <section class="intro"><div><div class="eyebrow"><span>✦</span> GROW • WANDER • REPEAT</div><h2>Life finds a <em>little</em> way.</h2><p>Give the garden a nudge, then watch its tiny residents make the rest of the story.</p></div><div class="intro-sticker"><span>✿</span><strong>100%<br>living</strong><small>no scripted waves</small></div></section>
      <div class="main-grid">
        <section class="world-card card"><div class="world-heading"><div><div class="section-kicker"><span class="status-light"></span> THE TABLETOP WORLD</div><h3>Garden view <span class="world-subtitle">/ drag to spin</span></h3></div><div class="world-clock"><span class="clock-orbit">◌</span><strong id="clock">00:00</strong><small>garden time</small></div></div>
          <div class="world-stage"><canvas id="world" aria-label="Interactive round garden. Drag to rotate; click a blob to inspect it."></canvas><div class="stage-label stage-label-left">${icon('rotate', 14)} DRAG TO ROTATE</div><div class="stage-label stage-label-right"><span class="tiny-click">↖</span> TAP A BLOB</div><div id="inspector"></div></div>
          <div class="world-footer"><div id="live-pill" class="live-pill"><span class="sleep-dot"></span>GARDEN IS PAUSED</div><span>Every fruit, move, and encounter changes the numbers.</span></div>
        </section>
        <aside class="control-card card"><div class="control-head"><div><div class="section-kicker">YOUR GARDEN, YOUR RULES</div><h3>Tune the world <span>✳</span></h3></div><div class="control-head-icon">⚙</div></div><div id="control-scroll" class="control-scroll"></div></aside>
      </div>
      <section class="story-grid"><div class="history-card card"><div class="card-heading"><div><div class="section-kicker">THE STORY SO FAR</div><h3>Life in motion <span class="heading-flourish">〰</span></h3></div><span class="subtle-badge">LIVE HISTORY</span></div><div id="chart-area" class="chart-wrap"></div></div>
        <div class="insights-column"><div class="summary-card card"><div class="section-kicker">FIELD NOTES <span>✎</span></div><h3 id="story-title"></h3><p id="story-body"></p><div id="summary-stats" class="summary-stats"></div></div><div class="phase-card card"><div><div class="section-kicker">A DIFFERENT VIEW</div><h3>Their little dance</h3><p>Each turn traces blue against red.</p></div><div id="phase-area"></div></div></div>
      </section><footer class="site-footer"><span>✿ &nbsp; Made for curious gardeners</span><span>A small world with real consequences.</span></footer>
    </main>
  </div>`;

let config = { ...defaults };
let preset = 'Balanced';
let garden = new Garden(config);
let playing = false;
let rotation = -.22;
let selectedId = null;
let hits = [];
let pointer = null;
let lastFrame = 0;
let accumulator = 0;
let lastUI = 0;
let chartHover = null;
const canvas = document.getElementById('world');
const controlsEl = document.getElementById('control-scroll');

function sliderHTML([key, label, min, max, step, suffix]) {
  const progress = (config[key] - min) / (max - min) * 100;
  return `<label class="slider-row"><span class="slider-top"><span>${label}</span><strong data-value="${key}">${valueText(config[key], suffix)}</strong></span><input type="range" data-key="${key}" data-suffix="${suffix}" min="${min}" max="${max}" step="${step}" value="${config[key]}" style="--progress:${progress}%"></label>`;
}

function renderControls() {
  controlsEl.innerHTML = `
    <div class="control-section first-control"><div class="control-section-title"><span class="control-icon">✦</span><strong>Choose a starting mood</strong></div><div class="preset-wrap"><select id="preset" aria-label="Garden preset">${Object.keys(presets).map(name => `<option ${preset === name ? 'selected' : ''}>${name}</option>`).join('')}<option ${preset === 'Custom' ? 'selected' : ''}>Custom</option></select><span>⌄</span></div><p class="preset-note">Rule sliders are live. Starting values take effect on reset.</p></div>
    <div class="control-section transport-section"><div class="transport"><button id="play" class="primary-button">${icon(playing ? 'pause' : 'play')}<span>${playing ? 'Pause' : 'Play'}</span></button><button id="step" title="Advance one garden second" aria-label="Step one garden second">${icon('step')}</button><button id="reset" title="Reset world" aria-label="Reset world">${icon('reset')}</button><button id="randomize" title="New random seed" aria-label="Randomize world">${icon('shuffle')}</button></div><div class="speed-row"><span>Simulation speed</span><div class="speed-buttons">${[.5, 1, 2, 4].map(value => `<button data-speed="${value}" class="${config.speed === value ? 'active' : ''}">${value}×</button>`).join('')}</div></div></div>
    ${sections.map(section => `<div class="control-section ${section.tone || ''}"><div class="control-section-title"><span class="control-icon">${section.icon}</span><strong>${section.title}</strong></div>${section.items.map(sliderHTML).join('')}</div>`).join('')}
    <div class="control-section seed-section"><div class="control-section-title"><span class="control-icon">#</span><strong>Random seed</strong></div><div class="seed-input-wrap"><input id="seed" type="number" value="${config.seed}" aria-label="Random seed"><button id="apply-seed" title="Apply seed with a fresh world">Apply seed</button></div><p class="preset-note">Same seed + settings, same tiny beginning.</p></div>`;
  controlsEl.querySelector('#preset').addEventListener('change', event => {
    if (!presets[event.target.value]) return;
    config = { ...presets[event.target.value], seed: config.seed };
    preset = event.target.value;
    restart();
    renderControls();
  });
  controlsEl.querySelectorAll('.slider-row input').forEach(input => input.addEventListener('input', event => {
    const key = event.target.dataset.key;
    const value = Number(event.target.value);
    config[key] = value;
    garden.setConfig(config);
    event.target.style.setProperty('--progress', `${(value - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
    controlsEl.querySelector(`[data-value="${key}"]`).textContent = valueText(value, input.dataset.suffix);
    preset = 'Custom';
    controlsEl.querySelector('#preset').value = 'Custom';
  }));
  controlsEl.querySelectorAll('[data-speed]').forEach(button => button.addEventListener('click', () => {
    config.speed = Number(button.dataset.speed);
    garden.setConfig(config);
    controlsEl.querySelectorAll('[data-speed]').forEach(other => other.classList.toggle('active', other === button));
  }));
  controlsEl.querySelector('#play').addEventListener('click', togglePlay);
  controlsEl.querySelector('#step').addEventListener('click', step);
  controlsEl.querySelector('#reset').addEventListener('click', () => restart());
  controlsEl.querySelector('#randomize').addEventListener('click', () => {
    config.seed = Math.floor(Math.random() * 900000) + 100000;
    restart();
    renderControls();
  });
  controlsEl.querySelector('#seed').addEventListener('change', event => { config.seed = Number(event.target.value) || 1; });
  controlsEl.querySelector('#apply-seed').addEventListener('click', () => { config.seed = Number(controlsEl.querySelector('#seed').value) || 1; restart(); });
}

function restart() {
  garden = new Garden(config);
  accumulator = 0;
  playing = false;
  selectedId = null;
  chartHover = null;
  updateUI();
}
function togglePlay() { playing = !playing; updateTransport(); }
function updateTransport() {
  const button = controlsEl.querySelector('#play');
  button.innerHTML = `${icon(playing ? 'pause' : 'play')}<span>${playing ? 'Pause' : 'Play'}</span>`;
  document.getElementById('live-pill').innerHTML = `<span class="${playing ? 'pulse-dot' : 'sleep-dot'}"></span>${playing ? 'GARDEN IS GROWING' : 'GARDEN IS PAUSED'}`;
}
function step() {
  playing = false;
  updateTransport();
  for (let i = 0; i < 13; i++) garden.step(.08);
  garden.record();
  updateUI();
}

canvas.addEventListener('pointerdown', event => {
  canvas.setPointerCapture(event.pointerId);
  pointer = { x: event.clientX, y: event.clientY, lastX: event.clientX, moved: false };
});
canvas.addEventListener('pointermove', event => {
  if (!pointer) return;
  if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 4) pointer.moved = true;
  if (pointer.moved) rotation += (event.clientX - pointer.lastX) * .009;
  pointer.lastX = event.clientX;
});
canvas.addEventListener('pointerup', event => {
  const oldPointer = pointer;
  pointer = null;
  if (!oldPointer || oldPointer.moved) return;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left, y = event.clientY - rect.top;
  const hit = [...hits].reverse().find(item => Math.hypot(item.x - x, item.y - y) < item.r);
  selectedId = hit?.id ?? null;
  updateInspector();
});
canvas.addEventListener('pointercancel', () => { pointer = null; });
document.getElementById('inspector').addEventListener('click', event => {
  if (event.target.closest('.inspect-close')) { selectedId = null; updateInspector(); }
});

function updateInspector() {
  const selected = garden.blobs.find(blob => blob.id === selectedId);
  const el = document.getElementById('inspector');
  if (!selected) { el.innerHTML = ''; return; }
  const speed = (selected.group === 'blue' ? config.blueSpeed : config.redSpeed) * selected.speedTrait;
  const vision = (selected.group === 'blue' ? config.blueVision : config.redVision) * selected.visionTrait;
  const details = [
    ['Age', `${Math.round(selected.age)}s`], ['Doing', selected.action], ['Speed', speed.toFixed(1)], ['Sensing', Math.round(vision)], ['Action left', selected.timer > 0 ? `${selected.timer.toFixed(1)}s` : '—'], ['Family', `Gen ${selected.generation}${selected.parentId ? ` · #${selected.parentId}` : ''}`],
  ];
  el.innerHTML = `<div class="inspect-card"><button class="inspect-close" aria-label="Close inspection">${icon('close', 16)}</button><div class="inspect-top"><span class="inspect-avatar ${selected.group}">●</span><div><small>RESIDENT #${selected.id}</small><strong>${selected.group === 'blue' ? 'Blue blob' : 'Red blob'}</strong></div></div><div class="energy-line"><span>Energy</span><strong>${Math.max(0, Math.round(selected.energy))} / 155</strong></div><div class="energy-track"><i style="width:${Math.max(0, selected.energy / 155 * 100)}%;background:${selected.group === 'blue' ? '#6c91e8' : '#e87e78'}"></i></div><dl>${details.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl></div>`;
}

function getStory() {
  const data = garden.history, now = garden.counts();
  if (garden.time < 12) return ['The story is just beginning', 'Press play and watch fruit draw the blue blobs around the trees. Red blobs follow wherever blue blobs gather.'];
  if (!now.blue && !now.red) return ['The garden is quiet now', 'Both blob groups faded away. Fruit keeps growing on the trees; try a gentler preset and start again.'];
  if (!now.blue) return ['Blue blobs faded first', 'With no blue blobs to meet, the red group is living on its stored energy. It will fade unless the garden starts anew.'];
  if (!now.red) return ['A blue garden remains', 'The red group faded. Blue blobs and fruit are finding their own rhythm around the trees.'];
  const half = data[Math.floor(data.length / 2)];
  const peakBlue = data.reduce((best, d) => d.blue > best.blue ? d : best, data[0]);
  const peakRed = data.reduce((best, d) => d.red > best.red ? d : best, data[0]);
  if (peakRed.time > peakBlue.time + 4 && peakRed.red >= 4) return ['Blue grew, then red followed', 'Fruit fed a blue rise. The red group followed later, drawing energy from close encounters.'];
  if (now.fruit < garden.trees.length && now.blue < config.startBlue) return ['Food is keeping things small', 'Ripe fruit is scarce, so blue growth is limited. Red blobs feel that shortage soon after.'];
  if (now.blue > half.blue * 1.25) return ['Blue blobs are blooming', 'The trees are feeding new blue blobs. Watch whether red blobs catch up as encounters become more common.'];
  return ['A lively little balance', 'Fruit, blue blobs, and red blobs are trading momentum. Their next turn depends on food and stored energy.'];
}

function chartHTML() {
  const counts = garden.counts();
  const history = garden.history;
  const data = history.length > 1 ? history : [history[0], { time: history[0].time + 1, ...counts }];
  const width = 880, height = 225, left = 44, right = 42, top = 18, bottom = 29;
  const plotW = width - left - right, plotH = height - top - bottom;
  const start = data[0].time, end = Math.max(start + 1, data[data.length - 1].time);
  const popCeiling = Math.ceil(Math.max(10, ...data.map(d => Math.max(d.blue, d.red))) / 5) * 5;
  const fruitCeiling = Math.ceil(Math.max(10, ...data.map(d => d.fruit)) / 10) * 10;
  const px = time => left + (time - start) / (end - start) * plotW;
  const py = (value, max) => top + plotH - value / max * plotH;
  const path = (key, max) => data.map((d, i) => `${i ? 'L' : 'M'}${px(d.time).toFixed(1)},${py(d[key], max).toFixed(1)}`).join(' ');
  const hoverIndex = chartHover == null ? null : Math.max(0, Math.min(data.length - 1, Math.round(chartHover * (data.length - 1))));
  const hovered = hoverIndex == null ? null : data[hoverIndex];
  return `<div class="chart-legend">${Object.entries(groups).map(([key, group]) => `<div class="legend-item"><i style="background:${group.color}"></i><span>${group.label}</span><strong>${counts[key]}</strong></div>`).join('')}</div><svg viewBox="0 0 ${width} ${height}" class="timeline-chart" role="img" aria-label="Fruit, blue blob, and red blob populations over simulation time">
    ${[0, .25, .5, .75, 1].map(n => `<g><line x1="${left}" x2="${width - right}" y1="${top + plotH * n}" y2="${top + plotH * n}" class="grid-line"/><text x="${left - 10}" y="${top + plotH * n + 4}" text-anchor="end" class="axis-text">${Math.round(popCeiling * (1 - n))}</text><text x="${width - right + 9}" y="${top + plotH * n + 4}" class="axis-text fruit-axis">${Math.round(fruitCeiling * (1 - n))}</text></g>`).join('')}
    ${[0, .25, .5, .75, 1].map(n => `<text x="${left + plotW * n}" y="${height - 6}" text-anchor="${n === 0 ? 'start' : n === 1 ? 'end' : 'middle'}" class="axis-text">${Math.round(start + (end - start) * n)}s</text>`).join('')}
    ${Object.entries(groups).map(([key, group]) => `<path d="${path(key, key === 'fruit' ? fruitCeiling : popCeiling)}" fill="none" stroke="${group.color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}
    ${hovered ? `<line x1="${px(hovered.time)}" x2="${px(hovered.time)}" y1="${top}" y2="${top + plotH}" stroke="#9ca797" stroke-dasharray="4 4"/>${Object.entries(groups).map(([key, group]) => `<circle cx="${px(hovered.time)}" cy="${py(hovered[key], key === 'fruit' ? fruitCeiling : popCeiling)}" r="5" fill="${group.color}" stroke="white" stroke-width="2"/>`).join('')}` : ''}
    <rect x="${left}" y="${top}" width="${plotW}" height="${plotH}" fill="transparent"/></svg><div class="chart-foot"><span>Blue + red use the left scale · Fruit uses the right scale</span>${hovered ? `<strong>${Math.round(hovered.time)}s · ${hovered.fruit} fruit · ${hovered.blue} blue · ${hovered.red} red</strong>` : ''}</div>`;
}

function phaseHTML() {
  const data = garden.history;
  const maxBlue = Math.max(8, ...data.map(d => d.blue)), maxRed = Math.max(5, ...data.map(d => d.red));
  const x = d => 25 + d.blue / maxBlue * 205, y = d => 136 - d.red / maxRed * 112;
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(d).toFixed(1)},${y(d).toFixed(1)}`).join(' ');
  const last = data[data.length - 1];
  return `<svg class="phase-chart" viewBox="0 0 255 158" role="img" aria-label="Blue versus red blob phase plot">${[0, 1, 2, 3].map(i => `<g><line x1="${25 + i * 205 / 3}" x2="${25 + i * 205 / 3}" y1="20" y2="136" class="grid-line"/><line x1="25" x2="230" y1="${24 + i * 112 / 3}" y2="${24 + i * 112 / 3}" class="grid-line"/></g>`).join('')}<path d="${path}" fill="none" stroke="#9089b9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/><circle cx="${x(last)}" cy="${y(last)}" r="5.5" fill="#e77c76" stroke="white" stroke-width="2"/><text x="128" y="155" text-anchor="middle" class="axis-text">Blue blobs →</text><text x="6" y="84" transform="rotate(-90 6 84)" text-anchor="middle" class="axis-text">Red blobs →</text></svg>`;
}

const chartArea = document.getElementById('chart-area');
chartArea.addEventListener('pointermove', event => {
  const svg = event.target.closest('svg');
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / rect.width;
  chartHover = Math.max(0, Math.min(1, (ratio * 880 - 44) / (880 - 44 - 42)));
  chartArea.innerHTML = chartHTML();
});
chartArea.addEventListener('pointerleave', () => { chartHover = null; chartArea.innerHTML = chartHTML(); });

function updateUI() {
  document.getElementById('clock').textContent = `${Math.floor(garden.time / 60).toString().padStart(2, '0')}:${Math.floor(garden.time % 60).toString().padStart(2, '0')}`;
  updateTransport();
  updateInspector();
  chartArea.innerHTML = chartHTML();
  document.getElementById('phase-area').innerHTML = phaseHTML();
  const [title, body] = getStory();
  document.getElementById('story-title').textContent = title;
  document.getElementById('story-body').textContent = body;
  document.getElementById('summary-stats').innerHTML = `<div><strong>${garden.events.fruitEaten}</strong><span>fruit eaten</span></div><div><strong>${garden.events.contacts}</strong><span>gentle contacts</span></div><div><strong>${garden.events.blueBorn + garden.events.redBorn}</strong><span>new little lives</span></div>`;
}

function loop(timestamp) {
  const dt = lastFrame ? Math.min(.1, (timestamp - lastFrame) / 1000) : 0;
  lastFrame = timestamp;
  if (playing) {
    accumulator += dt * config.speed;
    let steps = 0;
    while (accumulator >= .08 && steps < 14) { garden.step(.08); accumulator -= .08; steps++; }
  }
  hits = renderWorld(canvas, garden, rotation, timestamp / 1000, selectedId);
  if (timestamp - lastUI > 240) { lastUI = timestamp; updateUI(); }
  requestAnimationFrame(loop);
}

renderControls();
updateUI();
requestAnimationFrame(loop);
