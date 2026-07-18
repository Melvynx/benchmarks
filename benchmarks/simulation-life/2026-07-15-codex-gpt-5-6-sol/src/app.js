import { DEFAULT_CONFIG, GardenSimulation, PRESETS, summarize } from './simulation.js'

const icon = (name, size = 18) => {
  const paths = {
    play: '<path d="m8 5 11 7-11 7Z"/>',
    pause: '<path d="M9 5v14"/><path d="M15 5v14"/>',
    step: '<path d="m6 5 9 7-9 7Z"/><path d="M18 5v14"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01"/>',
    leaf: '<path d="M20 4c-8 0-14 4.5-14 10 0 3 2 5 5 5 5.5 0 9-7 9-15Z"/><path d="M4 21c2-5 6-9 12-12"/>',
    rotate: '<path d="M3 12a9 9 0 0 1 15.8-5.9L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.8 5.9L3 16"/><path d="M3 21v-5h5"/>',
    close: '<path d="m7 7 10 10"/><path d="m17 7-10 10"/>',
  }
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`
}

const CONTROL_GROUPS = {
  world: [
    { key: 'fruitGrowth', label: 'Growth speed', min: 0.05, max: 0.9, step: 0.01, format: (v) => `${v.toFixed(2)}/s` },
    { key: 'fruitLimit', label: 'Fruit limit', min: 10, max: 100, step: 1 },
    { key: 'fruitDelay', label: 'Return delay', min: 2, max: 20, step: 0.5, format: (v) => `${v}s` },
    { key: 'trees', label: 'Starting trees', min: 3, max: 14, step: 1, reset: true },
    { key: 'worldSize', label: 'World size', min: 150, max: 280, step: 5, reset: true },
    { key: 'seed', label: 'Random seed', min: 1, max: 9999, step: 1, reset: true },
    { key: 'simSpeed', label: 'Simulation speed', min: 0.25, max: 4, step: 0.25, format: (v) => `${v}×` },
  ],
  blue: [
    { key: 'blueUse', label: 'Energy use', min: 0.25, max: 1.4, step: 0.01, format: (v) => `${v.toFixed(2)}/s` },
    { key: 'blueSpeed', label: 'Move speed', min: 8, max: 30, step: 1 },
    { key: 'blueVision', label: 'Sensing range', min: 35, max: 150, step: 5 },
    { key: 'blueCopy', label: 'Copy threshold', min: 58, max: 100, step: 1 },
    { key: 'blueEatTime', label: 'Eating time', min: 0.4, max: 3, step: 0.1, format: (v) => `${v.toFixed(1)}s` },
    { key: 'blueStart', label: 'Starting blue', min: 2, max: 32, step: 1, reset: true },
  ],
  red: [
    { key: 'redUse', label: 'Energy use', min: 0.25, max: 1.4, step: 0.01, format: (v) => `${v.toFixed(2)}/s` },
    { key: 'redSpeed', label: 'Move speed', min: 8, max: 30, step: 1 },
    { key: 'redVision', label: 'Sensing range', min: 35, max: 160, step: 5 },
    { key: 'redContact', label: 'Contact strength', min: 12, max: 52, step: 1 },
    { key: 'redCopy', label: 'Copy threshold', min: 58, max: 105, step: 1 },
    { key: 'redPause', label: 'Contact pause', min: 0.5, max: 3.5, step: 0.1, format: (v) => `${v.toFixed(1)}s` },
    { key: 'redStart', label: 'Starting red', min: 1, max: 24, step: 1, reset: true },
  ],
}

const root = document.querySelector('#root')
root.innerHTML = `
  <div class="app-shell">
    <header class="topbar">
      <div class="brand"><span class="brand-sprout">${icon('leaf', 17)}</span><div><span class="brand-kicker">Living garden study № 04</span><h1>gpt-5.6-sol</h1></div></div>
      <div class="metrics">
        <div class="metric fruit"><span class="metric-mark">${icon('leaf', 15)}</span><div><strong id="metric-fruit">0</strong><small>fruit</small></div></div>
        <div class="metric blue"><span class="metric-mark"></span><div><strong id="metric-blue">0</strong><small id="detail-blue">blue</small></div></div>
        <div class="metric red"><span class="metric-mark"></span><div><strong id="metric-red">0</strong><small id="detail-red">red</small></div></div>
      </div>
      <div class="transport">
        <span class="status-label running" id="status"><i></i><span>garden running</span><b>00:00</b></span>
        <button class="icon-button" id="step" aria-label="Step simulation" title="Step">${icon('step')}</button>
        <button class="play-button" id="play" aria-label="Pause simulation">${icon('pause', 19)}<span>Pause</span></button>
      </div>
    </header>
    <main class="workspace">
      <section class="left-stack">
        <div class="world-panel">
          <div class="world-label"><span class="eyebrow">Tabletop view</span><h2 id="garden-name">Balanced garden</h2><p id="garden-note">A gentle, repeating chase</p></div>
          <div class="garden-canvas" id="garden-canvas"><canvas></canvas><div class="rotate-hint">${icon('rotate', 15)} drag to turn · tap a blob</div></div>
          <div class="story-note"><span class="story-icon">⌁</span><div><strong id="story-title">The garden is waking up</strong><p id="story-text">Let it run a little longer and its rhythm will appear here.</p></div></div>
          <div id="inspector-root"></div>
        </div>
        <div class="charts-grid">
          <div class="chart-card timeline-card">
            <div class="card-heading"><div><span class="eyebrow">Recorded history</span><h2>Garden rhythm</h2></div><div class="legend"><span class="fruit">Fruit</span><span class="blue">Blue</span><span class="red">Red</span></div></div>
            <div class="chart-wrap"><svg id="timeline" viewBox="0 0 720 150" preserveAspectRatio="none" role="img" aria-label="Timeline of real simulation fruit, blue, and red populations"></svg></div>
            <div class="chart-caption"><span>← earlier</span><span>Each line scales to its own peak</span><span>now →</span></div>
          </div>
          <div class="chart-card phase-card">
            <div class="card-heading"><div><span class="eyebrow">Population orbit</span><h2>Blue × red</h2></div><span class="live-dot">live</span></div>
            <svg id="phase" viewBox="0 0 245 130" preserveAspectRatio="none" role="img" aria-label="Blue versus red phase plot"></svg>
          </div>
        </div>
      </section>
      <aside class="control-panel">
        <div class="control-top"><div><span class="eyebrow">Garden rules</span><h2>Tune the habitat</h2></div><div class="utility-actions"><button class="icon-button" id="reset" aria-label="Reset garden" title="Reset">${icon('reset', 17)}</button><button class="icon-button" id="randomize" aria-label="Randomize garden" title="Randomize">${icon('dice', 17)}</button></div></div>
        <div class="preset-scroller" id="presets" aria-label="Garden presets"></div>
        <div class="rule-tabs" id="tabs" role="tablist"><button class="world active" data-tab="world" role="tab">Habitat</button><button class="blue" data-tab="blue" role="tab">Blue blobs</button><button class="red" data-tab="red" role="tab">Red blobs</button></div>
        <div class="controls-list"><div class="rule-description" id="rule-description"></div><div id="controls"></div></div>
        <div class="control-footer"><span>↺ applies on reset</span><span id="seed-label">seed 3729</span></div>
      </aside>
    </main>
  </div>`

let config = { ...DEFAULT_CONFIG }
let simulation = new GardenSimulation(config)
let running = true
let selectedId = null
let activeTab = 'world'
let activePreset = 'balanced'
let lastSnapshot = simulation.snapshot()

const $ = (selector) => document.querySelector(selector)
const canvasHost = $('#garden-canvas')
const canvas = canvasHost.querySelector('canvas')
const ctx = canvas.getContext('2d')

function renderPresets() {
  $('#presets').innerHTML = Object.entries(PRESETS).map(([key, item]) => `<button data-preset="${key}" class="${activePreset === key ? 'active' : ''}"><span>${item.label}</span><small>${item.note}</small></button>`).join('')
  $('#presets').querySelectorAll('button').forEach((button) => button.addEventListener('click', () => choosePreset(button.dataset.preset)))
}

function renderControls() {
  const descriptions = {
    world: ['Fruit & time', 'Plants regrow only after their return delay.'],
    blue: ['Forage & flee', 'Blue spends energy to move and restores it by eating.'],
    red: ['Follow & recharge', 'Red trades a little blue energy for a warm recharge.'],
  }
  $('#rule-description').innerHTML = `<strong>${descriptions[activeTab][0]}</strong><span>${descriptions[activeTab][1]}</span>`
  $('#controls').innerHTML = CONTROL_GROUPS[activeTab].map((definition) => {
    const value = config[definition.key]
    const shown = definition.format ? definition.format(value) : value
    const percent = ((value - definition.min) / (definition.max - definition.min)) * 100
    return `<label class="control-row"><span class="control-label"><span>${definition.label}${definition.reset ? '<i title="Applies after reset">↺</i>' : ''}</span><output>${shown}</output></span><input data-key="${definition.key}" type="range" min="${definition.min}" max="${definition.max}" step="${definition.step}" value="${value}" style="--range:${percent}%"></label>`
  }).join('')
  $('#controls').querySelectorAll('input').forEach((input) => input.addEventListener('input', () => {
    const key = input.dataset.key
    const previous = config[key]
    const value = Number(input.value)
    config[key] = value
    if (key === 'blueSpeed' || key === 'blueVision' || key === 'redSpeed' || key === 'redVision') {
      const type = key.startsWith('blue') ? 'blue' : 'red'
      const trait = key.endsWith('Speed') ? 'speedTrait' : 'visionTrait'
      simulation.blobs.filter((blob) => blob.type === type).forEach((blob) => { blob[trait] *= value / previous })
    }
    simulation.config = config
    activePreset = 'custom'
    const definition = CONTROL_GROUPS[activeTab].find((item) => item.key === key)
    input.style.setProperty('--range', `${((value - definition.min) / (definition.max - definition.min)) * 100}%`)
    input.closest('.control-row').querySelector('output').textContent = definition.format ? definition.format(value) : value
    $('#seed-label').textContent = `seed ${config.seed}`
    renderPresets()
  }))
  $('#seed-label').textContent = `seed ${config.seed}`
}

function reset(next = config) {
  config = { ...next }
  simulation.reset(config)
  selectedId = null
  lastSnapshot = simulation.snapshot()
  renderControls()
  renderInspector()
  updateUI()
}

function choosePreset(key) {
  activePreset = key
  const next = { ...DEFAULT_CONFIG, ...PRESETS[key].values, simSpeed: config.simSpeed }
  reset(next)
  running = true
  syncTransport()
  renderPresets()
}

function randomize() {
  const keys = Object.keys(PRESETS)
  const key = keys[Math.floor(Math.random() * keys.length)]
  activePreset = 'custom'
  reset({
    ...DEFAULT_CONFIG,
    ...PRESETS[key].values,
    seed: Math.floor(1 + Math.random() * 9998),
    fruitGrowth: Number((0.12 + Math.random() * 0.58).toFixed(2)),
    blueStart: 7 + Math.floor(Math.random() * 14),
    redStart: 2 + Math.floor(Math.random() * 10),
    simSpeed: config.simSpeed,
  })
  running = true
  syncTransport()
  renderPresets()
}

function syncTransport() {
  const play = $('#play')
  play.innerHTML = `${icon(running ? 'pause' : 'play', 19)}<span>${running ? 'Pause' : 'Play'}</span>`
  play.setAttribute('aria-label', running ? 'Pause simulation' : 'Play simulation')
  $('#status').classList.toggle('running', running)
  $('#status span').textContent = running ? 'garden running' : 'garden paused'
}

$('#play').addEventListener('click', () => { running = !running; syncTransport() })
$('#step').addEventListener('click', () => {
  running = false
  for (let i = 0; i < 18; i++) simulation.update(0.045)
  syncTransport(); updateUI()
})
$('#reset').addEventListener('click', () => reset())
$('#randomize').addEventListener('click', randomize)
$('#tabs').querySelectorAll('button').forEach((button) => button.addEventListener('click', () => {
  activeTab = button.dataset.tab
  $('#tabs').querySelectorAll('button').forEach((tab) => tab.classList.toggle('active', tab === button))
  renderControls()
}))

function makePath(values, width, height, fixedMax) {
  if (!values.length) return ''
  const max = fixedMax || Math.max(1, ...values)
  return values.map((value, index) => {
    const x = 8 + (index / Math.max(1, values.length - 1)) * (width - 16)
    const y = height - 10 - (value / max) * (height - 20)
    return `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

function renderCharts(history) {
  const slice = history.slice(-110)
  const maxFruit = Math.max(1, ...slice.map((p) => p.fruit))
  const maxBlue = Math.max(1, ...slice.map((p) => p.blue))
  const maxRed = Math.max(1, ...slice.map((p) => p.red))
  const fruit = makePath(slice.map((p) => p.fruit), 720, 150, maxFruit)
  const blue = makePath(slice.map((p) => p.blue), 720, 150, maxBlue)
  const red = makePath(slice.map((p) => p.red), 720, 150, maxRed)
  $('#timeline').innerHTML = `<defs><linearGradient id="fruitFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b7c94b" stop-opacity=".22"/><stop offset="1" stop-color="#b7c94b" stop-opacity="0"/></linearGradient></defs>${[35,70,105,140].map((y) => `<line x1="8" x2="712" y1="${y}" y2="${y}" class="chart-grid"/>`).join('')}<path d="${fruit} L712,140 L8,140 Z" fill="url(#fruitFade)"/><path d="${fruit}" class="chart-line fruit-line"/><path d="${blue}" class="chart-line blue-line"/><path d="${red}" class="chart-line red-line"/>`

  const points = history.slice(-90)
  const phaseMaxBlue = Math.max(1, ...points.map((p) => p.blue))
  const phaseMaxRed = Math.max(1, ...points.map((p) => p.red))
  const coords = points.map((p) => ({ x: 20 + (p.blue / phaseMaxBlue) * 205, y: 116 - (p.red / phaseMaxRed) * 96 }))
  const path = coords.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const last = coords.at(-1)
  $('#phase').innerHTML = `<line x1="20" x2="230" y1="116" y2="116" class="axis"/><line x1="20" x2="20" y1="14" y2="116" class="axis"/><path d="${path}" class="phase-line"/>${coords.filter((_,i) => i % 8 === 0).map((p,i,a) => `<circle cx="${p.x}" cy="${p.y}" r="2" class="phase-point" style="opacity:${.2 + i / Math.max(1,a.length)}"/>`).join('')}${last ? `<circle cx="${last.x}" cy="${last.y}" r="4" class="phase-now"/>` : ''}<text x="122" y="128">more blue →</text><text transform="translate(8 88) rotate(-90)">more red →</text>`
}

function renderInspector() {
  const blob = simulation.blobs.find((item) => item.id === selectedId)
  const host = $('#inspector-root')
  if (!blob) { selectedId = null; host.innerHTML = ''; delete host.dataset.id; return }
  const fields = [
    ['Energy', `${Math.max(0, blob.energy).toFixed(0)} / 110`], ['Age', `${blob.age.toFixed(1)}s`], ['Current action', blob.state],
    ['Move speed', blob.speedTrait.toFixed(1)], ['Sensing range', blob.visionTrait.toFixed(0)], ['Action time left', blob.timer > 0 ? `${blob.timer.toFixed(1)}s` : 'ready'],
    ['Family', blob.parent ? `child of #${blob.parent}` : 'garden founder'], ['Generation', `G${blob.generation}`],
  ]
  if (host.dataset.id === String(blob.id)) {
    host.querySelector('.energy-track span').style.width = `${Math.max(0, Math.min(100, blob.energy / 1.1))}%`
    host.querySelectorAll('dd').forEach((element, index) => { element.textContent = fields[index][1] })
    return
  }
  host.dataset.id = blob.id
  host.innerHTML = `<aside class="inspector ${blob.type}"><div class="inspector-head"><div><span class="eyebrow">Selected neighbor</span><h3>${blob.type} blob <small>#${blob.id}</small></h3></div><button class="icon-button" aria-label="Close inspector" title="Close">${icon('close', 16)}</button></div><div class="energy-track"><span style="width:${Math.max(0, Math.min(100, blob.energy / 1.1))}%"></span></div><dl>${fields.map(([label,value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl></aside>`
  host.querySelector('button').addEventListener('click', () => { selectedId = null; renderInspector() })
}

function updateUI() {
  lastSnapshot = simulation.snapshot()
  const snapshot = lastSnapshot
  $('#metric-fruit').textContent = snapshot.fruit
  $('#metric-blue').textContent = snapshot.blue
  $('#metric-red').textContent = snapshot.red
  $('#detail-blue').textContent = `blue · ${snapshot.avgBlueEnergy.toFixed(0)}e`
  $('#detail-red').textContent = `red · ${snapshot.avgRedEnergy.toFixed(0)}e`
  const minutes = String(Math.floor(snapshot.time / 60)).padStart(2, '0')
  const seconds = String(Math.floor(snapshot.time % 60)).padStart(2, '0')
  $('#status b').textContent = `${minutes}:${seconds}`
  const item = PRESETS[activePreset]
  $('#garden-name').textContent = item?.label || 'Custom garden'
  $('#garden-note').textContent = item?.note || 'A one-of-a-kind ecology'
  const story = summarize(snapshot.history)
  $('#story-title').textContent = story.title
  $('#story-text').textContent = story.text
  renderCharts(snapshot.history)
  renderInspector()
}

let rotation = -0.18
let dragging = null
let hits = []
canvasHost.addEventListener('pointerdown', (event) => {
  canvasHost.setPointerCapture(event.pointerId)
  dragging = { x: event.clientX, startX: event.clientX, angle: rotation }
  canvasHost.classList.add('dragging')
})
canvasHost.addEventListener('pointermove', (event) => {
  if (dragging) rotation = dragging.angle + (event.clientX - dragging.x) * .008
})
canvasHost.addEventListener('pointerup', (event) => {
  if (!dragging) return
  if (Math.abs(event.clientX - dragging.startX) < 6) {
    const rect = canvasHost.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const hit = [...hits].reverse().find((item) => Math.hypot(item.x - x, item.y - y) < item.r)
    selectedId = hit?.id || null
    renderInspector()
  }
  dragging = null
  canvasHost.classList.remove('dragging')
})
canvasHost.addEventListener('pointercancel', () => { dragging = null; canvasHost.classList.remove('dragging') })

const speckCache = new Map()
function seededSpecks(seed) {
  if (speckCache.has(seed)) return speckCache.get(seed)
  let value = Number(seed) || 1
  const rnd = () => { value = (value * 1664525 + 1013904223) % 4294967296; return value / 4294967296 }
  const result = Array.from({ length: 135 }, () => {
    const angle = rnd() * Math.PI * 2
    const radius = Math.sqrt(rnd()) * .92
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, r: .4 + rnd() * 1.2, a: .1 + rnd() * .18, c: rnd() > .5 ? '#e8f1b2' : '#315f46' }
  })
  speckCache.set(seed, result)
  return result
}

function drawTree(tree, sx, sy, scale, time, capacity) {
  const sway = Math.sin(time * 1.1 + tree.phase) * 1.1
  const crown = 18 * tree.crown * scale
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(sway * .012)
  ctx.fillStyle = 'rgba(29,52,28,.22)'; ctx.beginPath(); ctx.ellipse(2, 6, crown * .95, crown * .34, -.1, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#66562f'; ctx.lineWidth = 5 * scale; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(sway * .7, -crown * .72); ctx.stroke()
  const blobs = [[-.56,-.68,.72],[.24,-.88,.84],[.62,-.52,.65],[-.04,-1.16,.66],[-.18,-.52,.88]]
  for (const [x,y,s] of blobs) {
    const g = ctx.createRadialGradient(x*crown-4,y*crown-5,1,x*crown,y*crown,crown*s)
    g.addColorStop(0,'#a9d867'); g.addColorStop(.55,'#4f9a58'); g.addColorStop(1,'#256344')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x*crown,y*crown,crown*s,0,Math.PI*2); ctx.fill()
  }
  const count = Math.max(0, Math.floor(tree.fruit))
  const maxVisible = Math.min(10, Math.ceil(capacity))
  for (let i=0; i<Math.min(count,maxVisible); i++) {
    const a = i*2.4+tree.phase, ring=.28+(i%3)*.18
    const fx=Math.cos(a)*crown*ring, fy=-crown*.78+Math.sin(a)*crown*ring*.65
    ctx.strokeStyle='#314d2e'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(fx,fy-4);ctx.lineTo(fx+1,fy-1);ctx.stroke()
    const fg=ctx.createRadialGradient(fx-1,fy-1,.4,fx,fy,3);fg.addColorStop(0,'#f2f99a');fg.addColorStop(.4,'#b9d747');fg.addColorStop(1,'#638b2f')
    ctx.fillStyle=fg;ctx.beginPath();ctx.arc(fx,fy,3,0,Math.PI*2);ctx.fill()
  }
  ctx.restore()
}

function drawBean(blob, sx, sy, scale, time, selected) {
  const isBlue=blob.type==='blue', base=isBlue?'#3aaee8':'#f06355', dark=isBlue?'#146e9e':'#a9312d', light=isBlue?'#a9ebff':'#ffc2ac'
  const action=blob.timer>0, bounce=Math.sin(time*3.6+blob.phase)*1.2+(action?Math.sin(time*9)*1.4:0), lean=Math.max(-.28,Math.min(.28,blob.vx*.22)), size=9.5*scale
  ctx.save();ctx.translate(sx,sy+bounce);ctx.rotate(lean);ctx.scale(1+Math.sin(time*2.5+blob.phase)*.025,1-Math.sin(time*2.5+blob.phase)*.025);ctx.globalAlpha=Math.max(.25,Math.min(1,blob.energy/30))
  ctx.fillStyle='rgba(25,47,33,.22)';ctx.beginPath();ctx.ellipse(0,size*.72,size*.78,size*.3,0,0,Math.PI*2);ctx.fill()
  if(blob.pulse>0||selected){ctx.strokeStyle=selected?'#fff6cf':light;ctx.globalAlpha=selected?.9:blob.pulse*.5;ctx.lineWidth=selected?2:3;ctx.beginPath();ctx.arc(0,0,size*(1.25+blob.pulse*.3),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}
  const gradient=ctx.createLinearGradient(-size,-size,size,size);gradient.addColorStop(0,light);gradient.addColorStop(.35,base);gradient.addColorStop(1,dark);ctx.fillStyle=gradient
  ctx.beginPath();ctx.moveTo(-size*.12,-size);ctx.bezierCurveTo(size*.92,-size*1.05,size*1.08,-size*.12,size*.72,size*.62);ctx.bezierCurveTo(size*.35,size*1.2,-size*.72,size*1.12,-size*.92,size*.28);ctx.bezierCurveTo(-size*1.12,-size*.5,-size*.74,-size*.92,-size*.12,-size);ctx.fill();ctx.strokeStyle=dark;ctx.globalAlpha=.45;ctx.lineWidth=.8;ctx.stroke();ctx.globalAlpha=1
  ctx.fillStyle='rgba(255,255,255,.56)';ctx.beginPath();ctx.ellipse(-size*.4,-size*.5,size*.22,size*.36,-.55,0,Math.PI*2);ctx.fill()
  const eyeY=-size*.05;ctx.strokeStyle='#17342d';ctx.fillStyle='#17342d';ctx.lineWidth=1.25
  if(blob.blink>0){ctx.beginPath();ctx.moveTo(-size*.3,eyeY);ctx.lineTo(-size*.08,eyeY);ctx.moveTo(size*.18,eyeY);ctx.lineTo(size*.4,eyeY);ctx.stroke()}else{ctx.beginPath();ctx.ellipse(-size*.2,eyeY,size*.07,size*.12,0,0,Math.PI*2);ctx.ellipse(size*.3,eyeY,size*.07,size*.12,0,0,Math.PI*2);ctx.fill()}
  ctx.beginPath();if(blob.state==='munching')ctx.arc(size*.08,size*.28,size*.16,0,Math.PI*2);else ctx.arc(size*.06,size*.18,size*.2,.05,Math.PI-.05);ctx.stroke();ctx.restore()
}

function drawGarden(stamp) {
  const rect=canvas.getBoundingClientRect(), dpr=Math.min(2,window.devicePixelRatio||1)
  if(canvas.width!==Math.floor(rect.width*dpr)||canvas.height!==Math.floor(rect.height*dpr)){canvas.width=Math.floor(rect.width*dpr);canvas.height=Math.floor(rect.height*dpr)}
  ctx.setTransform(dpr,0,0,dpr,0,0);const w=rect.width,h=rect.height;ctx.clearRect(0,0,w,h)
  const cx=w*.5,cy=h*.505,radius=Math.min(w*.43,h*.43),scale=radius/simulation.config.worldSize,cos=Math.cos(rotation),sin=Math.sin(rotation)
  const project=(item)=>{const rx=item.x*cos-item.y*sin,ry=item.x*sin+item.y*cos;return{sx:cx+rx*scale,sy:cy+ry*scale*.84,depth:ry}}
  const t=stamp/1000
  ctx.save();ctx.fillStyle='rgba(39,52,35,.16)';ctx.beginPath();ctx.ellipse(cx,cy+radius*.68,radius*.92,radius*.35,0,0,Math.PI*2);ctx.fill()
  const side=ctx.createLinearGradient(0,cy+radius*.5,0,cy+radius);side.addColorStop(0,'#56764d');side.addColorStop(1,'#253d2c');ctx.fillStyle=side;ctx.beginPath();ctx.ellipse(cx,cy+9,radius*1.01,radius*.91,0,0,Math.PI*2);ctx.fill()
  const ground=ctx.createRadialGradient(cx-radius*.35,cy-radius*.42,radius*.1,cx,cy,radius);ground.addColorStop(0,'#b9d485');ground.addColorStop(.58,'#88b46e');ground.addColorStop(1,'#527c55');ctx.fillStyle=ground;ctx.beginPath();ctx.ellipse(cx,cy-4,radius,radius*.9,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(244,255,211,.42)';ctx.lineWidth=2;ctx.stroke();ctx.clip()
  for(const dot of seededSpecks(simulation.config.seed)){ctx.fillStyle=dot.c;ctx.globalAlpha=dot.a;ctx.beginPath();ctx.arc(cx+dot.x*radius,cy-4+dot.y*radius*.9,dot.r,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1
  const drawables=[...simulation.trees.map(item=>({...project(item),kind:'tree',item})),...simulation.blobs.map(item=>({...project(item),kind:'blob',item})),...simulation.particles.map(item=>({...project(item),kind:'particle',item}))].sort((a,b)=>a.depth-b.depth)
  hits=[]
  for(const entry of drawables){const {item,sx,sy}=entry,depthScale=.9+((entry.depth/simulation.config.worldSize)+1)*.08;if(entry.kind==='tree')drawTree(item,sx,sy,depthScale,t,simulation.config.fruitLimit/simulation.trees.length);if(entry.kind==='blob'){drawBean(item,sx,sy,depthScale,t,item.id===selectedId);hits.push({id:item.id,x:sx,y:sy,r:16})}if(entry.kind==='particle'){ctx.globalAlpha=Math.max(0,item.life/item.maxLife);ctx.fillStyle=item.color;ctx.beginPath();ctx.arc(sx,sy,item.size,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}}
  ctx.restore()
}

renderPresets()
renderControls()
updateUI()

let last = performance.now(), paintAt = last, accumulator = 0
function frame(now) {
  const realDt = Math.min(.08, (now-last)/1000); last=now
  if(running){accumulator += realDt*config.simSpeed*2.2;while(accumulator>=.045){simulation.update(.045);accumulator-=.045}}
  if(now-paintAt>120){updateUI();paintAt=now}
  drawGarden(now)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
