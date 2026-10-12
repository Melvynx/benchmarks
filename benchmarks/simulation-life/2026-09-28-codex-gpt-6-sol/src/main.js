import { Garden, defaults, presets } from './simulation.js';

const app = document.querySelector('#app');
let settings = { ...defaults };
let garden = new Garden(settings);
let playing = true;
let selected = null;
let rotation = -.22;
let activePreset = 'balanced';
let activeTab = 'population';
let lastFrame = performance.now();
let accumulator = 0;
let lastUi = 0;
let hitBlobs = [];

const groups = [
  { title: 'FRUIT & FOLIAGE', icon: '✿', controls: [
    ['fruitGrowth', 'Growth speed', .03, .45, .01, '/ day'], ['fruitLimit', 'Fruit per tree', 2, 12, 1, ''], ['fruitDelay', 'Return delay', .5, 10, .1, ' days']
  ]},
  { title: 'BLUE BLOBS', icon: '●', controls: [
    ['blueUse', 'Energy use', .5, 3, .05, '/ day'], ['blueSpeed', 'Movement speed', .4, 2, .05, '×'], ['blueVision', 'Sensing range', .5, 2, .05, '×'],
    ['blueCopy', 'Copy threshold', 55, 95, 1, ' energy'], ['blueEat', 'Eating time', .3, 3, .1, ' days']
  ]},
  { title: 'RED BLOBS', icon: '●', controls: [
    ['redUse', 'Energy use', .5, 3, .05, '/ day'], ['redSpeed', 'Movement speed', .4, 2, .05, '×'], ['redVision', 'Sensing range', .5, 2, .05, '×'],
    ['redStrength', 'Contact strength', 10, 40, 1, ' energy'], ['redCopy', 'Copy threshold', 55, 95, 1, ' energy'], ['redPause', 'Pause after contact', .3, 4, .1, ' days']
  ]},
  { title: 'STARTING WORLD', icon: '◎', controls: [
    ['trees', 'Fruit trees', 4, 24, 1, ''], ['blue', 'Blue blobs', 2, 45, 1, ''], ['red', 'Red blobs', 0, 25, 1, ''],
    ['worldSize', 'World size', .7, 1.5, .05, '×'], ['seed', 'Random seed', 1, 9999, 1, '']
  ]}
];

const icons = {
  play: '<path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
  step: '<path d="m5 5 10 7-10 7V5Z" fill="currentColor" stroke="none"/><path d="M18 5v14"/>',
  reset: '<path d="M3 11a9 9 0 1 1 2.5 6.2"/><path d="M3 4v7h7"/>',
  shuffle: '<path d="m18 14 4 4-4 4M2 18h3c5 0 6-12 12-12h5m-4-4 4 4-4 4M2 6h3c2 0 3 2 4 4m4 4c1 2 2 4 4 4h5"/>',
  hand: '<path d="M8 13V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v8c0 4-2 7-7 7h-2c-3 0-4-1-6-4l-2-3a2 2 0 0 1 3-2l2 1Z"/>',
  sprout: '<path d="M12 21v-9m0 3C6 15 3 12 3 6c6 0 9 3 9 9Zm0-3c0-6 3-9 9-9 0 6-3 9-9 9Z"/>',
  chart: '<path d="M3 3v18h18M6 15l4-5 4 3 5-7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>'
};
const icon = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const format = (key, value) => key === 'seed' ? String(value) : Number.isInteger(value) ? String(value) : Number(value).toFixed(value < 1 ? 2 : 1).replace(/0$/, '').replace(/\.$/, '');

app.innerHTML = `
  <header class="topbar">
    <div class="brand"><div class="brand-mark"><span></span><span></span><span></span></div><h1>GPT-6</h1><span class="brand-divider"></span><span class="brand-caption">A little world to get lost in</span></div>
    <div class="topbar-right"><span class="live-dot"></span><span>LIVE SIMULATION</span><span class="topbar-divider"></span><span class="topbar-date">THE GARDEN LAB</span></div>
  </header>
  <main class="dashboard">
    <aside class="sidebar card">
      <div class="sidebar-heading"><div><div class="eyebrow">MAKE IT YOURS</div><h2>Garden rules<span class="heading-flower">✳</span></h2></div><span class="tiny-leaf">✦</span></div>
      <div class="preset-label">START WITH A STORY</div>
      <div class="preset-list">
        <button class="preset active" data-preset="balanced"><span class="preset-emoji">🌿</span><span>Balanced garden</span><span class="preset-arrow">↗</span></button>
        <button class="preset" data-preset="rich"><span class="preset-emoji">🍐</span><span>Fruit-rich garden</span><span class="preset-arrow">↗</span></button>
        <button class="preset" data-preset="red"><span class="preset-emoji">🍓</span><span>Red-heavy garden</span><span class="preset-arrow">↗</span></button>
        <button class="preset" data-preset="fragile"><span class="preset-emoji">🫧</span><span>Fragile balance</span><span class="preset-arrow">↗</span></button>
        <button class="preset" data-preset="low"><span class="preset-emoji">🍂</span><span>Low-fruit garden</span><span class="preset-arrow">↗</span></button>
      </div>
      <div class="control-groups">${groups.map((group, gi) => `
        <section class="control-group ${gi === 0 ? 'open' : ''}">
          <button class="group-toggle" aria-expanded="${gi === 0}"><span class="group-symbol group-${gi}">${group.icon}</span><span>${group.title}</span><span class="chevron">⌄</span></button>
          <div class="group-body">${group.controls.map(([key, label, min, max, step, suffix]) => `
            <label class="slider-row"><span class="slider-label"><span>${label}</span><strong id="val-${key}">${format(key, settings[key])}${suffix}</strong></span>
            <input type="range" data-key="${key}" min="${min}" max="${max}" step="${step}" value="${settings[key]}" style="--fill:${(settings[key]-min)/(max-min)*100}%" /></label>
          `).join('')}</div>
        </section>`).join('')}</div>
      <div class="sidebar-note">✦ &nbsp;Changes to starting conditions take effect on reset.</div>
    </aside>
    <section class="main-column">
      <div class="intro"><div><div class="eyebrow green">AN EXPERIMENT IN BALANCE</div><h2>Life finds a little way<span>✳</span></h2><p>Set the rules, then watch a tiny ecosystem make its own story.</p></div><div class="day-pill"><span>DAY</span><strong id="day-count">0</strong></div></div>
      <div class="world-card card"><div class="world-top"><div class="world-title"><span class="world-status"><i></i> GARDEN IS GROWING</span><span class="world-subtitle">a tiny, living tabletop</span></div><div class="world-gesture">${icon('hand', 16)} drag to spin · tap a blob</div></div>
        <div class="canvas-wrap"><canvas id="world-canvas" aria-label="Animated garden simulation"></canvas><div class="world-corner world-corner-a">✳</div><div class="world-corner world-corner-b">✳</div></div>
        <div class="world-bottom"><div class="world-stats"><div class="stat"><span class="stat-icon fruit-icon">✿</span><div><strong id="fruit-count">0</strong><span>fruit</span></div></div><div class="stat"><span class="stat-icon blue-icon">●</span><div><strong id="blue-count">0</strong><span>blue blobs</span></div></div><div class="stat"><span class="stat-icon red-icon">●</span><div><strong id="red-count">0</strong><span>red blobs</span></div></div></div><div class="world-scale"><span>WORLD SPEED</span><select id="speed-select" aria-label="Simulation speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></div></div>
      </div>
      <div class="playbar"><div class="transport"><button id="play-btn" class="play-button" aria-label="Pause simulation">${icon('pause', 21)}<span>Pause</span></button><button id="step-btn" class="icon-button" aria-label="Step simulation" title="Step one day">${icon('step')}</button><button id="reset-btn" class="icon-button" aria-label="Reset simulation" title="Reset">${icon('reset')}</button><button id="random-btn" class="icon-button" aria-label="Randomize seed" title="Randomize seed">${icon('shuffle')}</button></div><div class="playbar-note"><span class="motion-line"></span>Every little choice changes the story.</div></div>
    </section>
    <aside class="insights-column"><div class="story-card card"><div class="story-icon">✦</div><div class="eyebrow green">FIELD NOTES</div><h3 id="story-title">A world in motion</h3><p id="story-text">The garden is waking up. Watch how fruit feeds blue blobs, and blue blobs give red blobs a reason to roam.</p><div class="story-footer"><span class="story-sparkle">✳</span> Generated from this run</div></div>
      <div class="chart-card card"><div class="chart-heading"><div><div class="eyebrow">THE BIG PICTURE</div><h3>Population story</h3></div><span class="chart-icon">${icon('chart')}</span></div><div class="chart-tabs"><button class="chart-tab active" data-tab="population">Over time</button><button class="chart-tab" data-tab="phase">Blue vs red</button></div><div class="chart-container"><canvas id="chart-canvas" aria-label="Population history chart"></canvas></div><div class="chart-key"><span><i class="key-fruit"></i>Fruit</span><span><i class="key-blue"></i>Blue</span><span><i class="key-red"></i>Red</span></div><div class="chart-foot" id="chart-foot">Each line is scaled to its own peak, so every group stays visible.</div></div>
      <div class="inspect-card card" id="inspect-card"><div class="inspect-empty"><div class="inspect-blob"><span>• •</span><i></i></div><div><strong>Meet the locals</strong><p>Tap any blob in the garden to see what it's up to.</p></div></div></div>
    </aside>
  </main>`;

const worldCanvas = document.querySelector('#world-canvas');
const chartCanvas = document.querySelector('#chart-canvas');
const worldCtx = worldCanvas.getContext('2d');
const chartCtx = chartCanvas.getContext('2d');
const $ = selector => document.querySelector(selector);

function sizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  return { w: rect.width, h: rect.height, dpr };
}

function project(x, y, w, h) {
  const c = Math.cos(rotation), s = Math.sin(rotation);
  const rx = Math.min(w * .39, h * .64);
  return { x: w * .5 + (x * c - y * s) / settings.worldSize * rx,
    y: h * .54 + (x * s + y * c) / settings.worldSize * rx * .59,
    depth: x * s + y * c, unit: rx };
}

function circle(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function ellipse(ctx, x, y, rx, ry, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }

function drawDish(ctx, w, h) {
  const rx = Math.min(w * .4, h * .65), ry = rx * .59, cx = w * .5, cy = h * .54;
  ctx.save();
  ctx.shadowColor = 'rgba(63, 80, 56, .22)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 20;
  ellipse(ctx, cx, cy + 34, rx + 12, ry + 8, '#94a67a'); ctx.restore();
  const side = ctx.createLinearGradient(0, cy + ry * .55, 0, cy + ry + 42);
  side.addColorStop(0, '#c4d99c'); side.addColorStop(.65, '#839e6a'); side.addColorStop(1, '#627c5a');
  ellipse(ctx, cx, cy + 25, rx + 6, ry + 4, side);
  const soil = ctx.createRadialGradient(cx - rx * .28, cy - ry * .45, 20, cx, cy, rx * 1.1);
  soil.addColorStop(0, '#e1efbf'); soil.addColorStop(.52, '#c6dc9d'); soil.addColorStop(1, '#a8c781');
  ellipse(ctx, cx, cy, rx + 6, ry + 4, '#e8efca'); ellipse(ctx, cx, cy - 3, rx, ry, soil);
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy - 3, rx - 3, ry - 3, 0, 0, 6.283); ctx.clip();
  const rand = n => { const v = Math.sin(n * 127.1 + settings.seed * 11.3) * 43758.5453; return v - Math.floor(v); };
  for (let i = 0; i < 95; i++) {
    const a = rand(i + 1) * 6.283, r = Math.sqrt(rand(i + 121)) * .94;
    const x = cx + Math.cos(a) * rx * r, y = cy - 3 + Math.sin(a) * ry * r;
    if (i % 5 === 0) { ellipse(ctx, x, y, 8 + rand(i + 40) * 14, 3 + rand(i + 50) * 5, 'rgba(106,153,86,.085)'); }
    else if (i % 3 === 0) { circle(ctx, x, y, 1.4, 'rgba(250,255,224,.55)'); }
    else { ctx.strokeStyle = i % 2 ? 'rgba(72,131,70,.23)' : 'rgba(252,255,220,.5)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x, y + 3); ctx.quadraticCurveTo(x - 2, y, x - 1, y - 3); ctx.stroke(); }
  }
  ctx.restore();
}

function drawTree(ctx, tree, p, time) {
  const u = p.unit / 235, x = p.x, y = p.y;
  const sw = Math.sin(time * .9 + tree.sway) * 2;
  ellipse(ctx, x + 3, y + 8, 24 * u, 7 * u, 'rgba(58,104,48,.18)');
  ctx.strokeStyle = '#7e9a5f'; ctx.lineWidth = 7 * u; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.quadraticCurveTo(x + sw - 5, y - 22 * u, x + sw, y - 37 * u); ctx.stroke();
  const leaves = [[-18,-37,17],[2,-49,19],[19,-35,18],[-4,-29,20],[10,-28,17]];
  for (let i = 0; i < leaves.length; i++) {
    const [ox, oy, r] = leaves[i];
    const gx = x + ox * u + sw, gy = y + oy * u * tree.size;
    const grad = ctx.createRadialGradient(gx - r * .3 * u, gy - r * .4 * u, 1, gx, gy, r * u);
    grad.addColorStop(0, i % 2 ? '#8ec46b' : '#a9d483'); grad.addColorStop(1, i % 2 ? '#4f9160' : '#67a45e');
    circle(ctx, gx, gy, r * u * tree.size, grad);
  }
  const fruitCount = Math.min(Math.floor(tree.fruit + .15), 12);
  const positions = [[-18,-34],[3,-53],[20,-34],[-8,-23],[12,-24],[-25,-42],[15,-48],[-1,-37],[26,-42],[-14,-52],[4,-25],[22,-27]];
  for (let i = 0; i < fruitCount; i++) {
    const [ox, oy] = positions[i], fx = x + ox * u + sw, fy = y + oy * u * tree.size;
    ctx.strokeStyle = '#416f42'; ctx.lineWidth = 1.2 * u; ctx.beginPath(); ctx.moveTo(fx, fy - 5 * u); ctx.lineTo(fx, fy - 2 * u); ctx.stroke();
    const grad = ctx.createRadialGradient(fx - 2*u, fy - 2*u, 1, fx, fy, 5.8*u);
    grad.addColorStop(0, '#f3f8b8'); grad.addColorStop(.4, '#d8ec79'); grad.addColorStop(1, '#95be51');
    circle(ctx, fx, fy, 5.4 * u, grad);
  }
}

function drawBlob(ctx, blob, p, time, isSelected) {
  const u = p.unit / 235, x = p.x, y = p.y;
  const moving = blob.timer <= 0;
  const bounce = moving ? Math.abs(Math.sin(time * 8 + blob.phase)) * 3.5 * u : Math.sin(time * 14 + blob.phase) * 2 * u;
  const size = (blob.age < 3 ? .75 : 1) * u;
  const by = y - 9 * u - bounce;
  ellipse(ctx, x, y + 4 * u, 15 * size, 5 * size, 'rgba(43,74,56,.2)');
  if (isSelected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.ellipse(x, y + 2*u, 20*size, 9*size, 0, 0, 6.283); ctx.stroke(); ctx.setLineDash([]); }
  ctx.save(); ctx.translate(x, by); ctx.rotate((moving ? Math.sin(time * 6 + blob.phase) * .065 : .12) * blob.facing);
  const color = blob.type === 'blue' ? ['#c8f3fa','#5fc2dc','#318ebc'] : ['#ffd6c5','#f0817b','#d85c66'];
  const grad = ctx.createRadialGradient(-6*size,-10*size,1,0,0,19*size);
  grad.addColorStop(0,color[0]); grad.addColorStop(.48,color[1]); grad.addColorStop(1,color[2]);
  ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(-15*size,4*size);
  ctx.bezierCurveTo(-19*size,-10*size,-12*size,-18*size,-2*size,-19*size);
  ctx.bezierCurveTo(10*size,-21*size,18*size,-10*size,17*size,3*size);
  ctx.bezierCurveTo(16*size,13*size,9*size,14*size,0,13*size);
  ctx.bezierCurveTo(-10*size,14*size,-15*size,12*size,-15*size,4*size); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.38)'; ctx.beginPath(); ctx.ellipse(-7*size,-11*size,5*size,2.5*size,-.4,0,6.283); ctx.fill();
  const blink = Math.sin(time * 2.1 + blob.phase * 7) > .995;
  ctx.fillStyle = '#274443';
  if (blink) { ctx.strokeStyle = '#274443'; ctx.lineWidth = 1.4*size; for (const ex of [-5,5]) {ctx.beginPath();ctx.moveTo(ex*size,-3*size);ctx.lineTo((ex+2)*size,-3*size);ctx.stroke();} }
  else { ellipse(ctx,-4.8*size,-3*size,1.45*size,2.1*size,'#244246'); ellipse(ctx,5.5*size,-3*size,1.45*size,2.1*size,'#244246'); }
  ctx.strokeStyle = '#355652'; ctx.lineWidth = 1.2*size; ctx.beginPath(); ctx.arc(.6*size,2*size,2.8*size,.15,Math.PI-.15); ctx.stroke();
  if (blob.pulse > 0) { ctx.strokeStyle = blob.type === 'blue' ? `rgba(67,179,222,${blob.pulse*.5})` : `rgba(238,110,105,${blob.pulse*.5})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0,-2*size,(19 + (1-blob.pulse)*16)*size,0,6.283);ctx.stroke(); }
  ctx.restore();
}

function drawWorld(now) {
  const { w, h, dpr } = sizeCanvas(worldCanvas);
  worldCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  worldCtx.clearRect(0, 0, w, h);
  drawDish(worldCtx, w, h);
  const items = [
    ...garden.trees.map(tree => ({ kind: 'tree', item: tree, p: project(tree.x, tree.y, w, h) })),
    ...garden.blobs.map(blob => ({ kind: 'blob', item: blob, p: project(blob.x, blob.y, w, h) }))
  ].sort((a, b) => a.p.depth - b.p.depth);
  hitBlobs = [];
  for (const {kind, item, p} of items) {
    if (kind === 'tree') drawTree(worldCtx, item, p, now);
    else { drawBlob(worldCtx, item, p, now, selected === item.id); hitBlobs.push({ id: item.id, x: p.x, y: p.y - 11 * p.unit / 235, r: 19 * p.unit / 235 }); }
  }
  for (const event of garden.events) {
    const p = project(event.x, event.y, w, h), age = garden.time - event.time, opacity = Math.max(0, 1 - age / 1.25);
    worldCtx.save(); worldCtx.globalAlpha = opacity; worldCtx.fillStyle = event.type === 'fruit' ? '#f5dc72' : '#fff4bd';
    worldCtx.font = `${20 + age * 12}px Georgia`; worldCtx.textAlign = 'center'; worldCtx.fillText('✦', p.x, p.y - 27 - age * 18); worldCtx.restore();
  }
}

function chartLine(ctx, points, color, width = 2.7) {
  if (points.length < 2) return;
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.stroke();
  const [x,y] = points.at(-1); circle(ctx,x,y,4.2,'#fff'); circle(ctx,x,y,2.7,color);
}

function drawChart() {
  const { w, h, dpr } = sizeCanvas(chartCanvas), ctx = chartCtx;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0,0,w,h);
  const left = 31, right = w - 17, top = 14, bottom = h - 25;
  ctx.strokeStyle = '#e8ece6'; ctx.lineWidth = 1; ctx.font = '10px DM Sans, sans-serif'; ctx.fillStyle = '#a5aea7';
  for (let i = 0; i <= 3; i++) { const y = top + (bottom-top)*i/3; ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke(); if (activeTab === 'population') ctx.fillText(`${100-Math.round(i*100/3)}%`,2,y+3); }
  const data = garden.history;
  if (activeTab === 'population') {
    const recent = data.slice(-320); if (!recent.length) return;
    const maxima = { fruit: Math.max(10, ...recent.map(d=>d.fruit)), blue: Math.max(5,...recent.map(d=>d.blue)), red: Math.max(5,...recent.map(d=>d.red)) };
    const xAt = i => left + (recent.length === 1 ? 0 : i/(recent.length-1))*(right-left);
    for (const [key,color] of [['fruit','#a9bf65'],['blue','#58b8d3'],['red','#ec817c']]) {
      const points = recent.map((d,i)=>[xAt(i), bottom - d[key]/maxima[key]*(bottom-top)]);
      chartLine(ctx,points,color,key==='fruit'?2.4:2.8);
    }
    ctx.fillStyle = '#a5aea7'; ctx.textAlign = 'left'; ctx.fillText(`DAY ${Math.floor(recent[0].t)}`,left,bottom+17); ctx.textAlign = 'right';ctx.fillText(`DAY ${Math.floor(recent.at(-1).t)}`,right,bottom+17);
  } else {
    ctx.fillStyle = '#a5aea7';ctx.fillText('RED →',3,top-2);
    const recent = data.slice(-180), maxBlue = Math.max(8,...recent.map(d=>d.blue)), maxRed = Math.max(8,...recent.map(d=>d.red));
    const points = recent.map(d=>[left+d.blue/maxBlue*(right-left),bottom-d.red/maxRed*(bottom-top)]);
    if (points.length > 1) {
      ctx.strokeStyle = '#dbe9e4'; ctx.lineWidth = 1.5;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
      points.forEach(([x,y],i)=>{if(i%Math.max(1,Math.floor(points.length/22))===0)circle(ctx,x,y,2.2,`rgba(72,164,165,${.22+i/points.length*.55})`)});
      const [x,y]=points.at(-1);circle(ctx,x,y,5,'#ed827e');circle(ctx,x,y,2,'#fff');
    }
    ctx.textAlign='right';ctx.fillStyle='#a5aea7';ctx.fillText('BLUE →',right,bottom+17);
  }
}

function story() {
  const c = garden.counts, h = garden.history, first = h[0], recent = h.slice(-25);
  if (garden.time < 8) return ['A world in motion', 'The garden is waking up. Watch how fruit feeds blue blobs, and blue blobs give red blobs a reason to roam.'];
  if (c.blue === 0 && c.red === 0) return ['A quiet garden', 'The blobs have faded away. The fruit trees are slowly filling the world again.'];
  if (c.blue === 0) return ['Blue blobs faded', 'Red blobs have no blue neighbors to meet. Their energy will gradually run low.'];
  if (c.red === 0) return ['A blue little world', 'With no red blobs nearby, blue blobs can gather fruit and settle into a gentler rhythm.'];
  const bluePeak = Math.max(...recent.map(d=>d.blue));
  const redPeak = Math.max(...recent.map(d=>d.red));
  if (c.blue < bluePeak*.65 && c.red > first.red) return ['The red tide is rising', 'More red blobs are meeting blue ones. The blue group is dipping, and red may follow if food runs short.'];
  if (c.blue > first.blue*1.45 && c.red < c.blue*.45) return ['Blue found their footing', 'Fruit is plentiful. Blue blobs are growing first, giving red blobs more chances to thrive later.'];
  if (c.fruit < garden.trees.length * 1.7) return ['A small, careful garden', 'Fruit is scarce, so new blue blobs arrive slowly. The whole world is finding a smaller balance.'];
  if (c.red < redPeak*.65) return ['A little breathing room', 'The red group is easing back. Blue blobs have a chance to recover among the trees.'];
  return ['A lively little balance', 'Fruit, blue blobs, and red blobs are shaping one another. Keep watching for the next wave.'];
}

function renderInspection() {
  const blob = garden.blobs.find(b=>b.id===selected), box = $('#inspect-card');
  if (!blob) { selected = null; box.innerHTML = `<div class="inspect-empty"><div class="inspect-blob"><span>• •</span><i></i></div><div><strong>Meet the locals</strong><p>Tap any blob in the garden to see what it's up to.</p></div></div>`; return; }
  const s = garden.settings, speed = (blob.type==='blue'?s.blueSpeed:s.redSpeed)*blob.speedTrait;
  const vision = (blob.type==='blue'?s.blueVision:s.redVision)*blob.visionTrait;
  box.innerHTML = `<div class="inspect-heading"><div><div class="eyebrow">MEET THE LOCALS</div><h3><span class="inspect-dot ${blob.type}"></span>${blob.type==='blue'?'Blue':'Red'} blob #${blob.id}</h3></div><span class="generation">GEN ${blob.generation}</span></div>
    <div class="energy-label"><span>Energy</span><strong>${Math.round(blob.energy)} / 100</strong></div><div class="energy-track"><span style="width:${blob.energy}%;background:${blob.type==='blue'?'#5ebed6':'#eb817b'}"></span></div>
    <div class="inspect-grid"><div><span>Age</span><strong>${blob.age.toFixed(1)} days</strong></div><div><span>Doing</span><strong>${blob.action}</strong></div><div><span>Speed</span><strong>${speed.toFixed(2)}×</strong></div><div><span>Sensing</span><strong>${vision.toFixed(2)}×</strong></div><div><span>Pause left</span><strong>${blob.timer.toFixed(1)} days</strong></div><div><span>Family</span><strong>${blob.parent ? `Child of #${blob.parent}` : 'First generation'}</strong></div></div>`;
}

function updateUi() {
  const c = garden.counts; $('#fruit-count').textContent=c.fruit;$('#blue-count').textContent=c.blue;$('#red-count').textContent=c.red;$('#day-count').textContent=Math.floor(garden.time);
  const [title,body] = story();$('#story-title').textContent=title;$('#story-text').textContent=body;
  renderInspection();drawChart();
}

function reset() { garden.reset(settings); selected=null; accumulator=0; updateUi(); }
function updatePlay() { $('#play-btn').innerHTML = `${icon(playing?'pause':'play',21)}<span>${playing?'Pause':'Play'}</span>`;$('#play-btn').setAttribute('aria-label',playing?'Pause simulation':'Play simulation');$('.world-status').innerHTML=`<i></i> GARDEN IS ${playing?'GROWING':'PAUSED'}`; }
function setPreset(name) {
  activePreset=name; settings={...presets[name], speed:settings.speed};
  document.querySelectorAll('.preset').forEach(b=>b.classList.toggle('active',b.dataset.preset===name));
  document.querySelectorAll('input[data-key]').forEach(input=>{const key=input.dataset.key;input.value=settings[key];input.style.setProperty('--fill',`${(settings[key]-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);$(`#val-${key}`).textContent=format(key,settings[key])+(groups.flatMap(g=>g.controls).find(c=>c[0]===key)?.[5]||'');});
  reset();
}

document.querySelectorAll('.preset').forEach(b=>b.addEventListener('click',()=>setPreset(b.dataset.preset)));
document.querySelectorAll('.group-toggle').forEach(b=>b.addEventListener('click',()=>{const group=b.closest('.control-group');group.classList.toggle('open');b.setAttribute('aria-expanded',group.classList.contains('open'));}));
document.querySelectorAll('input[data-key]').forEach(input=>input.addEventListener('input',()=>{
  const key=input.dataset.key;settings[key]=Number(input.value);input.style.setProperty('--fill',`${(input.value-input.min)/(input.max-input.min)*100}%`);
  $(`#val-${key}`).textContent=format(key,settings[key])+(groups.flatMap(g=>g.controls).find(c=>c[0]===key)?.[5]||'');
  garden.settings={...settings};
  document.querySelectorAll('.preset').forEach(b=>b.classList.remove('active'));
}));
$('#play-btn').addEventListener('click',()=>{playing=!playing;updatePlay();});
$('#step-btn').addEventListener('click',()=>{playing=false;updatePlay();for(let i=0;i<9;i++)garden.tick(.12);updateUi();});
$('#reset-btn').addEventListener('click',reset);
$('#random-btn').addEventListener('click',()=>{settings.seed=Math.floor(Math.random()*9999)+1;const input=document.querySelector('[data-key="seed"]');input.value=settings.seed;$('#val-seed').textContent=settings.seed;reset();});
$('#speed-select').addEventListener('change',e=>{settings.speed=Number(e.target.value);garden.settings.speed=settings.speed;});
document.querySelectorAll('.chart-tab').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.tab;document.querySelectorAll('.chart-tab').forEach(t=>t.classList.toggle('active',t===b));$('#chart-foot').textContent=activeTab==='population'?'Each line is scaled to its own peak, so every group stays visible.':'Each dot is a moment. The trail shows how blue and red populations move together.';drawChart();}));

let pointer = null;
worldCanvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY,rotation,moved:false};worldCanvas.setPointerCapture(e.pointerId);});
worldCanvas.addEventListener('pointermove',e=>{if(!pointer)return;const dx=e.clientX-pointer.x;if(Math.abs(dx)>4)pointer.moved=true;if(pointer.moved)rotation=pointer.rotation+dx*.008;});
worldCanvas.addEventListener('pointerup',e=>{
  if(pointer && !pointer.moved){const r=worldCanvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let nearest=null,best=Infinity;for(const hit of hitBlobs){const d=Math.hypot(x-hit.x,y-hit.y);if(d<hit.r*1.25&&d<best){nearest=hit;best=d;}}selected=nearest?.id??null;renderInspection();}
  pointer=null;
});

function frame(now) {
  const elapsed=Math.min(.08,(now-lastFrame)/1000);lastFrame=now;
  if(playing){accumulator+=elapsed*settings.speed*3.2;let iterations=0;while(accumulator>=.12&&iterations<18){garden.tick(.12);accumulator-=.12;iterations++;}}
  drawWorld(now/1000);
  if(now-lastUi>300){updateUi();lastUi=now;}
  requestAnimationFrame(frame);
}
updateUi();requestAnimationFrame(frame);
