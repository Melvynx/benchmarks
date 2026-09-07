import { Garden, defaults, presets } from './simulation.js';
import { GardenView } from './garden.js';
const element = id => document.getElementById(id);
let settings = { ...defaults }; const garden = new Garden(settings);
let running = false; let speed = 1; let selected = null; let chartMode = 'population'; let accumulator = 0;
const view = new GardenView(element('world'), garden, id => { selected = id; updateInspector(); });
const controlGroups = {
  fruit: [['growth','Growth speed',0,2,.1,'×'],['limit','Fruit per tree',1,12,1,''],['delay','Regrow delay',0,20,1,'s']],
  blue: [['blueUse','Energy use',.1,2,.1,'×'],['blueSpeed','Movement speed',2,14,.5,''],['blueVision','Sensing range',20,200,5,''],['blueCopy','Copy threshold',65,180,5,''],['eating','Eating time',.2,5,.2,'s']],
  red: [['redUse','Energy use',.1,2,.05,'×'],['redSpeed','Movement speed',2,14,.5,''],['redVision','Sensing range',20,200,5,''],['strength','Contact strength',5,60,1,''],['redCopy','Copy threshold',65,180,5,''],['pause','Rest after contact',.5,8,.5,'s']],
  world: [['trees','Starting trees',1,30,1,''],['blues','Starting blue blobs',0,80,1,''],['reds','Starting red blobs',0,40,1,''],['size','World radius',120,260,10,'']]
};
function buildControls() {
  for (const [group, controls] of Object.entries(controlGroups)) {
    element(`${group}-controls`).innerHTML = controls.map(([key,label,min,max,step,unit], index) => `${group === 'blue' && index === 3 ? '<details class="extra-controls"><summary>More blue traits</summary>' : ''}<div class="control"><label class="control-label" for="${key}">${label}<output id="${key}-value">${settings[key]}${unit}</output></label><input id="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${settings[key]}" data-unit="${unit}" data-world="${group === 'world'}"></div>`).join('') + (group === 'blue' ? '</details>' : '');
  }
  element('world-controls').insertAdjacentHTML('beforeend', `<div class="control"><label class="control-label" for="seed">Random seed<input id="seed" class="number-input" type="number" min="0" max="999999" value="${settings.seed}"></label></div><p class="small-description">Starting settings apply on reset.</p>`);
  for (const input of document.querySelectorAll('input[type=range]')) input.addEventListener('input', () => {
    settings[input.id] = Number(input.value); element(`${input.id}-value`).textContent = input.value + input.dataset.unit;
    if (input.dataset.world !== 'true') garden.settings[input.id] = Number(input.value);
    else element('status-text').textContent = 'Starting settings changed · reset to apply';
  });
  element('seed').addEventListener('change', event => { settings.seed = Math.max(0, Math.min(999999, Number(event.target.value) || 0)); event.target.value = settings.seed; });
}
buildControls();
for (const toggle of document.querySelectorAll('.group-toggle')) toggle.addEventListener('click', () => { const expanded = toggle.getAttribute('aria-expanded') === 'true'; toggle.setAttribute('aria-expanded', String(!expanded)); toggle.nextElementSibling.classList.toggle('hidden', expanded); toggle.querySelector('.chevron').textContent = expanded ? '+' : '−'; });
function setRunning(value) { running = value; element('play').innerHTML = value ? '<span>Ⅱ</span> Pause garden' : '<span>▶</span> Let it grow'; element('status-text').textContent = value ? 'A little world in motion' : garden.time ? 'Taking a little breather' : 'Ready when you are'; }
element('play').addEventListener('click', () => setRunning(!running));
element('step').addEventListener('click', () => { setRunning(false); for (let index = 0; index < 10; index++) garden.tick(.1); update(); });
function reset() { garden.reset(settings); selected = null; view.selected = null; accumulator = 0; setRunning(false); update(); }
element('reset').addEventListener('click', reset);
element('randomize').addEventListener('click', () => { settings.seed = crypto.getRandomValues(new Uint32Array(1))[0] % 999999; buildControls(); reset(); });
const descriptions = { balanced: 'A little give, a little take. Room for everyone.', rich: 'A generous harvest. Watch the blues flourish.', red: 'A crowded table. Who will find enough energy?', fragile: 'Just enough to get by. Every little life matters.', low: 'A sparse little garden. Make every snack count.' };
element('preset').addEventListener('change', event => { settings = { ...presets[event.target.value] }; buildControls(); element('preset-description').textContent = descriptions[event.target.value]; reset(); });
for (const button of document.querySelectorAll('[data-speed]')) button.addEventListener('click', () => { speed = Number(button.dataset.speed); document.querySelectorAll('[data-speed]').forEach(item => item.classList.toggle('active', item === button)); });
for (const button of document.querySelectorAll('[data-chart]')) button.addEventListener('click', () => { chartMode = button.dataset.chart; document.querySelectorAll('[data-chart]').forEach(item => item.classList.toggle('active', item === button)); element('chart-axis').textContent = chartMode === 'phase' ? 'RED VS BLUE' : 'POPULATION'; drawChart(); });
element('rotate-reset').addEventListener('click', () => { view.rotation = -.2; view.zoom = 1; });
element('zoom').addEventListener('click', () => { view.zoom = view.zoom === 1 ? 1.18 : 1; element('zoom').textContent = view.zoom === 1 ? '＋' : '−'; });
element('help').addEventListener('click', () => element('help-dialog').showModal());
for (const id of ['close-help','help-done']) element(id).addEventListener('click', () => element('help-dialog').close());
function updateInspector() {
  const panel = element('inspector'); panel.classList.toggle('hidden', selected === null);
  if (selected === null) return;
  const blob = garden.blobs.find(item => item.id === selected);
  if (!blob) { panel.innerHTML = '<button aria-label="Close inspector">×</button><h3>A gentle goodbye</h3><p class="small-description">This little blob ran out of energy and faded back into the garden.</p>'; }
  else {
    const rows = [['Energy',`${Math.round(blob.energy)} / ${garden.settings[blob.group + 'Copy']}`],['Age',`${Math.floor(blob.age)}s`],['Doing',blob.action],['Speed',garden.settings[blob.group + 'Speed']],['Vision',garden.settings[blob.group + 'Vision']],['Pause left',`${blob.timer.toFixed(1)}s`],['Generation',blob.generation],['Parent',blob.parent ? `#${blob.parent}` : 'First arrival']];
    panel.innerHTML = `<button aria-label="Close inspector">×</button><h3><i class="dot ${blob.group}"></i> ${blob.group === 'blue' ? 'Blue' : 'Red'} blob #${blob.id}</h3><div class="energy-track"><div style="width:${Math.min(100, blob.energy / garden.settings[blob.group + 'Copy'] * 100)}%"></div></div><dl>${rows.map(([label,value]) => `<dt>${label}</dt><dd>${value}</dd>`).join('')}</dl>`;
  }
  panel.querySelector('button').onclick = () => { selected = null; view.selected = null; updateInspector(); };
}
function drawChart() {
  const canvas = element('chart'); const ctx = canvas.getContext('2d'); const bounds = canvas.getBoundingClientRect(); const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = bounds.width * ratio; canvas.height = bounds.height * ratio; ctx.scale(ratio, ratio);
  const width = bounds.width; const height = bounds.height; const left = 30; const top = 12; const bottom = height - 25; const right = width - 14;
  const history = garden.history; const maximum = Math.max(20, Math.ceil(Math.max(...history.map(point => chartMode === 'phase' ? point.red : Math.max(point.fruit, point.blue, point.red))) / 20) * 20);
  ctx.font = '9px "DM Sans", sans-serif'; ctx.lineWidth = 1;
  for (let index = 0; index < 5; index++) { const positionY = top + (bottom - top) * index / 4; ctx.strokeStyle = '#e7ebe2'; ctx.setLineDash([3,4]); ctx.beginPath(); ctx.moveTo(left, positionY); ctx.lineTo(right, positionY); ctx.stroke(); ctx.fillStyle = '#7a8475'; ctx.textAlign = 'right'; ctx.fillText(Math.round(maximum * (1 - index / 4)), left - 9, positionY + 3); }
  ctx.setLineDash([]); const start = history[0]?.time || 0; const span = Math.max(60, garden.time - start); const maxBlue = Math.max(20, ...history.map(point => point.blue));
  for (let index = 0; index < 5; index++) { const positionX = left + (right - left) * index / 4; ctx.textAlign = 'center'; ctx.fillStyle = '#7a8475'; const time = start + span * index / 4; ctx.fillText(chartMode === 'phase' ? Math.round(maxBlue * index / 4) : `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2,'0')}`, positionX, height - 8); }
  const groups = chartMode === 'phase' ? ['blue'] : ['fruit','blue','red'];
  for (const group of groups) {
    ctx.strokeStyle = { fruit:'#86a950',blue:'#5ba8d5',red:'#df7968' }[group]; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.beginPath();
    history.forEach((point, index) => { const positionX = left + (chartMode === 'phase' ? point.blue / maxBlue : (point.time - start) / span) * (right - left); const positionY = bottom - (chartMode === 'phase' ? point.red : point[group]) / maximum * (bottom - top); if (!index) ctx.moveTo(positionX,positionY); else ctx.lineTo(positionX,positionY); }); ctx.stroke();
    const last = history.at(-1); if (last) { const positionX = left + (chartMode === 'phase' ? last.blue / maxBlue : (last.time - start) / span) * (right - left); const positionY = bottom - (chartMode === 'phase' ? last.red : last[group]) / maximum * (bottom - top); ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(positionX,positionY,3,0,Math.PI*2); ctx.fill(); }
  }
  if (chartMode === 'phase') { ctx.fillStyle = '#697762'; ctx.textAlign = 'right'; ctx.fillText('Blue blobs →', right, height - 8); }
  if (garden.time < 1) { ctx.fillStyle = '#7b8775'; ctx.textAlign = 'center'; ctx.fillText('The story starts when you press play', width / 2, height / 2); }
}
function update() {
  const counts = garden.counts(); for (const group of ['fruit','blue','red']) element(`${group}-count`).textContent = counts[group];
  element('time').textContent = `${String(Math.floor(garden.time / 60)).padStart(2,'0')}:${String(Math.floor(garden.time % 60)).padStart(2,'0')}`;
  element('birth-count').textContent = `${garden.births} new arrivals`;
  let story = 'A tiny world of possibilities. Press play and let nature take its course.';
  if (garden.time > 3) story = counts.blue === 0 ? 'The blues have faded. Without their energy, the reds will follow.' : counts.red === 0 ? 'A quieter chapter: the blues and trees have the garden to themselves.' : counts.fruit < garden.plants.length ? 'Snacks are getting scarce. The next harvest makes all the difference.' : counts.blue > settings.blues * 1.3 ? 'The blues are flourishing. More little lives mean more energy for the reds.' : 'Fruit feeds blue. Blue feeds red. Every little life is part of the story.';
  element('story-text').textContent = story; updateInspector(); drawChart();
}
let previous = performance.now(); let lastUpdate = 0;
function frame(timestamp) {
  const elapsed = Math.min(.1, (timestamp - previous) / 1000); previous = timestamp;
  if (running) { accumulator += elapsed * speed; while (accumulator >= .1) { garden.tick(.1); accumulator -= .1; } }
  view.draw(timestamp, running); if (timestamp - lastUpdate > 200) { update(); lastUpdate = timestamp; } requestAnimationFrame(frame);
}
update(); requestAnimationFrame(frame);
