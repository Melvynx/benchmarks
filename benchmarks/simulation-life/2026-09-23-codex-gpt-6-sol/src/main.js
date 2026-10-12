import { advance, createWorld, defaults, presets, snapshot } from './simulation.js';

const icons = {
  play: '<path d="m7 4 12 8-12 8V4Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 4v16M17 4v16"/>',
  step: '<path d="m5 5 9 7-9 7V5Z"/><path d="M18 5v14"/>',
  reset: '<path d="M4 11a8 8 0 1 1 2.2 6"/><path d="M4 4v7h7"/>',
  shuffle: '<path d="M4 7h3c5 0 5 10 10 10h3"/><path d="m17 14 3 3-3 3"/><path d="M4 17h3c2 0 3-2 4-4M14 8c1-1 2-1 3-1h3"/><path d="m17 4 3 3-3 3"/>',
  rotate: '<path d="M4 12a8 8 0 0 1 14-5"/><path d="m18 3 .5 4.5L14 7"/><path d="M20 12a8 8 0 0 1-14 5"/><path d="m6 21-.5-4.5L10 17"/>',
  spark: '<path d="m12 2 2.1 7.9L22 12l-7.9 2.1L12 22l-2.1-7.9L2 12l7.9-2.1L12 2Z"/>',
  close: '<path d="M5 5 19 19M19 5 5 19"/>',
};
const icon = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const fruitSpots = [[-13,-43],[10,-50],[-25,-58],[25,-42],[-5,-67],[17,-68],[-28,-37],[-30,-51],[30,-55]];
const initialMarkup = `
<div class="app-shell">
  <header class="topbar"><div class="brand"><span class="brand-mark"><span>✿</span></span><div><span class="eyebrow">LIVING SYSTEMS LAB</span><h1>GPT-6</h1></div></div><div class="header-right"><span class="header-note">An interactive little ecology</span><span class="live-pill"><span id="live-dot" class="live-dot pulsing"></span><span id="live-label">SIMULATION LIVE</span></span></div></header>
  <main class="workspace">
    <section class="main-column">
      <div class="intro"><div><span class="section-kicker">${icon('spark',15)} YOUR GARDEN IS GROWING</span><p>Small choices. Surprising ripples. Watch a tiny world find its rhythm.</p></div><div class="day-counter"><span>GARDEN CLOCK</span><strong id="day-clock">Day 00</strong></div></div>
      <div class="world-panel"><div class="world-overlay top-left"><span class="view-dot"></span> TABLETOP VIEW</div><div class="world-overlay top-right">${icon('rotate',16)} Drag to rotate</div>
        <svg id="world-svg" class="world-svg" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice" tabindex="0" role="group" aria-label="Living garden. Use left and right arrows to inspect blobs.">
          <defs><radialGradient id="soil" cx="42%" cy="36%" r="70%"><stop stop-color="#b8d69b"/><stop offset=".7" stop-color="#a6c78b"/><stop offset="1" stop-color="#89b277"/></radialGradient><linearGradient id="dishRim" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#efeee2"/><stop offset="1" stop-color="#c7c8b5"/></linearGradient><radialGradient id="blueBody" cx="30%" cy="18%" r="80%"><stop stop-color="#c9ebfa"/><stop offset=".35" stop-color="#75bce7"/><stop offset="1" stop-color="#4b9bd5"/></radialGradient><radialGradient id="redBody" cx="30%" cy="18%" r="80%"><stop stop-color="#ffd0bc"/><stop offset=".38" stop-color="#f39582"/><stop offset="1" stop-color="#e7726a"/></radialGradient><clipPath id="worldClip"><ellipse cx="500" cy="335" rx="360" ry="255"/></clipPath><filter id="dishShadow" x="-40%" y="-50%" width="180%" height="200%"><feGaussianBlur stdDeviation="18"/></filter></defs>
          <ellipse cx="500" cy="409" rx="386" ry="245" fill="#647e6a" opacity=".13" filter="url(#dishShadow)"/><ellipse cx="500" cy="365" rx="377" ry="267" fill="#c6c8b5"/><path d="M123 335a377 267 0 0 0 754 0v31a377 267 0 0 1-754 0Z" fill="url(#dishRim)"/><ellipse cx="500" cy="335" rx="377" ry="267" fill="#e4e7d3"/><ellipse cx="500" cy="335" rx="360" ry="255" fill="url(#soil)"/>
          <g clip-path="url(#worldClip)"><path d="M161 423q124-73 272-27t335 4M194 255q152 88 285 30t320 37" fill="none" stroke="#dce9b9" stroke-width="35" opacity=".17"/><g id="ground-details"></g><g id="world-items"></g><g id="world-events"></g></g><ellipse cx="500" cy="335" rx="360" ry="255" fill="none" stroke="#e6efc9" stroke-width="4" opacity=".7"/>
        </svg>
        <div class="world-bottom"><div class="transport"><button id="play-button" class="play-button" aria-label="Pause simulation">${icon('pause')}<span>Pause</span></button><button id="step-button" class="icon-button" title="Step forward 2.5 seconds">${icon('step')}</button><span class="transport-divider"></span><button id="reset-button" class="text-button">${icon('reset',16)} Reset</button><button id="randomize-button" class="text-button">${icon('shuffle',16)} Randomize</button></div><span class="world-hint">Tap a blob to meet it</span></div>
      </div>
      <div class="stat-grid"><div class="stat-card"><div class="stat-symbol fruit-icon">✿</div><div class="stat-info"><span>Fruit on trees</span><strong id="fruit-count">0</strong><small>Freshly growing</small></div><div class="stat-bar fruit"></div></div><div class="stat-card"><div class="stat-symbol blue-icon"><span></span></div><div class="stat-info"><span>Blue blobs</span><strong id="blue-count">0</strong><small id="blue-trend">+0 recently</small></div><div class="stat-bar blue"></div></div><div class="stat-card"><div class="stat-symbol red-icon"><span></span></div><div class="stat-info"><span>Red blobs</span><strong id="red-count">0</strong><small id="red-trend">+0 recently</small></div><div class="stat-bar red"></div></div></div>
      <section class="chart-panel"><div class="panel-heading"><div><span class="section-kicker">THE GARDEN JOURNAL</span><h2>Life, over time</h2><p>Every line is drawn from the living simulation.</p></div><div class="segmented"><button class="active" data-chart-mode="timeline">Timeline</button><button data-chart-mode="phase">Blue vs red</button></div></div><div class="chart-legend"><span><i class="legend-dot fruit"></i>Fruit <em id="fruit-scale"></em></span><span><i class="legend-dot blue"></i>Blue <em id="blue-scale"></em></span><span><i class="legend-dot red"></i>Red <em id="red-scale"></em></span><span id="scale-note" class="scale-note">Each line scaled to its own peak</span></div><svg id="chart-svg" class="chart-svg" viewBox="0 0 700 220" preserveAspectRatio="none" role="img"></svg></section>
      <div class="story-panel"><span class="story-icon">✦</span><div><span id="story-day">FIELD NOTE · DAY 00</span><strong id="story-title"></strong><p id="story-body"></p></div><div class="story-counts"><span id="birth-count">0<small>new arrivals</small></span><span id="loss-count">0<small>faded away</small></span></div></div>
    </section>
    <aside class="control-column"><section class="control-panel"><div class="control-head"><div><span class="section-kicker">TUNE THE ECOSYSTEM</span><h2>Garden controls</h2><p>Change a rule and see what unfolds.</p></div><span class="control-spark">✳</span></div><div class="preset-label">START WITH A STORY</div><div id="preset-grid" class="preset-grid"></div><div class="control-tabs"><button class="active" data-control-tab="essentials">Essentials</button><button data-control-tab="advanced">Fine tuning</button></div><div id="control-groups" class="control-groups"></div><div class="control-footer"><span class="tiny-leaf">❧</span> Every arrival costs energy. Every fruit takes time.</div></section><section class="inspector-panel"><div class="inspector-heading"><span class="section-kicker">UP CLOSE</span><h2>Meet a little blob</h2><button id="close-inspector" aria-label="Close inspection" hidden>${icon('close',15)}</button></div><div id="inspector-body"></div></section></aside>
  </main>
</div>`;

document.getElementById('root').innerHTML = initialMarkup;
document.getElementById('ground-details').innerHTML = Array.from({length:28}, (_,i) => { const a=i*2.399, r=Math.sqrt((i+1)/29); return `<g transform="translate(${500+Math.cos(a)*r*316} ${335+Math.sin(a)*r*218})" opacity=".5"><path d="M0 3q-4-4-2-9M0 3q4-5 3-9" stroke="#75ab70" stroke-width="2" fill="none"/></g>`; }).join('');

let config = { ...defaults };
let preset = 'balanced';
let controlTab = 'essentials';
let chartMode = 'timeline';
let selectedId = null;
let playing = true;
let angle = -.25;
let world = createWorld(config);
for (let i=0;i<3100;i++) advance(world,.1);

function project(x,y) {
  const u=x*Math.cos(angle)-y*Math.sin(angle), v=x*Math.sin(angle)+y*Math.cos(angle);
  return {x:500+u*339/world.config.worldSize,y:335+v*239/world.config.worldSize};
}
function treeMarkup(tree,x,y) {
  const spots=fruitSpots.slice(0,tree.fruit).map(([fx,fy],i)=>`<g transform="translate(${fx} ${fy})" class="fruit-piece"><circle r="7.2" fill="#d8f187" opacity=".23"/><circle r="5.3" fill="${i%2?'#9ed65a':'#b3de61'}" stroke="#6fa244" stroke-width="1"/><ellipse cx="-1.6" cy="-2" rx="1.7" ry="1.1" fill="white" opacity=".65"/><path d="M0-5q1-5 4-5" fill="none" stroke="#587d3f" stroke-width="1.2"/></g>`).join('');
  return `<g transform="translate(${x} ${y}) scale(${tree.size})" class="tree"><ellipse cx="3" cy="4" rx="32" ry="12" fill="#426a45" opacity=".17"/><path d="M-5 -10 Q-3 -26 -11 -43 L-4 -44 Q2 -26 5 -13 Q9 -33 17 -39 L20 -35 Q12 -27 10 -10Z" fill="#906948"/><path d="M-7 -21 Q-3 -29 -8 -44" fill="none" stroke="#b18456" stroke-width="2" opacity=".7"/><ellipse cx="-14" cy="-48" rx="25" ry="26" fill="#357751"/><ellipse cx="12" cy="-53" rx="29" ry="30" fill="#438a59"/><ellipse cx="-1" cy="-63" rx="29" ry="25" fill="#55a767"/><ellipse cx="-12" cy="-66" rx="17" ry="12" fill="#77ba78" opacity=".7"/><path d="M-27 -51q6-4 10 1M10-71q7-4 12 2M16-39q5-3 9 1" fill="none" stroke="#8ac582" stroke-width="2" opacity=".55"/>${spots}</g>`;
}
function blobMarkup(blob,x,y) {
  const blue=blob.kind==='blue', selected=blob.id===selectedId, busy=blob.action==='Eating fruit'||blob.action==='Happy pause';
  const color=blue?'#4b9bd5':'#ed7869';
  const bob=Math.sin(world.time*(busy?9:4)+blob.bob)*(busy?4.5:2.2), lean=Math.sin(world.time*2.8+blob.bob)*3+Math.cos(blob.heading)*2;
  const blink=(world.time*.3+blob.id*.173)%1<.035, eyeHeight=blink?.18:2.3;
  const pulse=(world.time*1.4+blob.id*.13)%1;
  return `<g transform="translate(${x} ${y})" class="blob ${blue?'is-blue':'is-red'} ${selected?'selected':''}" data-blob-id="${blob.id}" role="button" aria-label="${blue?'Blue':'Red'} blob ${blob.id}"><ellipse cx="2" cy="7" rx="20" ry="8" fill="${blue?'#376694':'#9d4e48'}" opacity=".17"/>${selected?`<ellipse cy="4" rx="26" ry="12" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="3 3"/>`:''}<g transform="translate(0 ${bob}) rotate(${lean} 0 -5)"><path d="M-16-11C-14-25 0-30 11-22C21-16 19 3 10 8C2 13-13 10-17 1C-19-3-18-8-16-11Z" fill="url(#${blue?'blueBody':'redBody'})" stroke="${blue?'#4a91c4':'#d66b62'}" stroke-width="1.3"/><path d="M-10-17Q-3-24 6-21" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" opacity=".53"/><ellipse cx="-5" cy="-5" rx="1.6" ry="${eyeHeight}" fill="#263b46"/><ellipse cx="6" cy="-5" rx="1.6" ry="${eyeHeight}" fill="#263b46"/><path d="M-2 1q3 3 6 0" fill="none" stroke="#263b46" stroke-width="1.3" stroke-linecap="round"/><ellipse cx="-12" cy="-2" rx="3.1" ry="2" fill="#f59c9b" opacity=".39"/><ellipse cx="12" cy="-2" rx="3.1" ry="2" fill="#f59c9b" opacity=".35"/></g>${busy?`<circle cy="-9" r="${18+pulse*14}" fill="none" stroke="${blue?'#b9d86f':'#f2a392'}" stroke-width="2" opacity="${1-pulse}"/>`:''}</g>`;
}
function renderWorld() {
  const items=[...world.trees.map(item=>({kind:'tree',item,...project(item.x,item.y)})),...world.blobs.map(item=>({kind:'blob',item,...project(item.x,item.y)}))].sort((a,b)=>a.y-b.y);
  document.getElementById('world-items').innerHTML=items.map(({kind,item,x,y})=>kind==='tree'?treeMarkup(item,x,y):blobMarkup(item,x,y)).join('');
  document.getElementById('world-events').innerHTML=world.events.map(event=>{const p=project(event.x,event.y),color=event.type==='contact'?'#ef8d7d':'#c4dc72',age=(world.time-event.time)/1.2;return `<g transform="translate(${p.x} ${p.y-28})" opacity="${1-age}"><circle r="${8+age*18}" fill="none" stroke="${color}" stroke-width="2"/><path d="M0-17v-5M-17 0h-5M17 0h5" stroke="${color}" stroke-width="2"/></g>`;}).join('');
}

let chartRenderedWorld = null;
let chartRenderedTime = -1;
let chartRenderedMode = '';
function renderChart() {
  const latestTime = world.history.at(-1)?.time;
  if (chartRenderedWorld === world && chartRenderedTime === latestTime && chartRenderedMode === chartMode) return;
  chartRenderedWorld = world;
  chartRenderedTime = latestTime;
  chartRenderedMode = chartMode;
  const data=world.history.slice(-180), W=700,H=220,L=35,R=16,T=18,B=26, plotW=W-L-R,plotH=H-T-B;
  if (!data.length) return;
  const max={fruit:Math.max(20,...data.map(p=>p.fruit)),blue:Math.max(10,...data.map(p=>p.blue)),red:Math.max(5,...data.map(p=>p.red))};
  const x=i=>L+(data.length===1?0:i/(data.length-1)*plotW), y=(v,m)=>T+plotH*(1-v/m);
  const line=key=>data.map((p,i)=>`${i?'L':'M'}${x(i).toFixed(1)},${y(p[key],max[key]).toFixed(1)}`).join(' ');
  const grid=[0,.25,.5,.75,1].map(f=>`<g><line x1="${L}" x2="${W-R}" y1="${T+f*plotH}" y2="${T+f*plotH}" stroke="#e9ece7" stroke-dasharray="${f===1?'0':'3 5'}"/><text x="${L-10}" y="${T+f*plotH+4}" text-anchor="end" fill="#9ca8a1" font-size="11">${chartMode==='timeline'?`${Math.round((1-f)*100)}%`:Math.round((1-f)*max.red)}</text></g>`).join('');
  let drawing;
  if(chartMode==='timeline') {
    drawing=`<path d="${line('fruit')} L${x(data.length-1)},${T+plotH} L${x(0)},${T+plotH}Z" fill="#89b86b" opacity=".08"/>`;
    for(const [key,color] of [['fruit','#89b86b'],['blue','#67afe0'],['red','#e98177']]) drawing+=`<path d="${line(key)}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
    drawing+=[0,.25,.5,.75,1].map(f=>`<text x="${L+f*plotW}" y="${H-4}" text-anchor="${f===0?'start':f===1?'end':'middle'}" fill="#9ca8a1" font-size="11">day ${Math.round((data[0].time+f*(data.at(-1).time-data[0].time))/10)}</text>`).join('');
  } else {
    const px=v=>L+v/max.blue*plotW, py=v=>T+plotH*(1-v/max.red);
    drawing=`<path d="${data.map((p,i)=>`${i?'L':'M'}${px(p.blue).toFixed(1)},${py(p.red).toFixed(1)}`).join(' ')}" fill="none" stroke="#e98177" stroke-width="2.5" stroke-linecap="round" opacity=".85"/>`;
    drawing+=data.filter((_,i)=>i%Math.max(1,Math.floor(data.length/22))===0).map((p,i)=>`<circle cx="${px(p.blue)}" cy="${py(p.red)}" r="3" fill="#e98177" opacity="${.2+i/26*.7}"/>`).join('');
    drawing+=`<circle cx="${px(data.at(-1).blue)}" cy="${py(data.at(-1).red)}" r="6" fill="#e98177" stroke="white" stroke-width="2"/>`;
    drawing+=[0,.5,1].map(f=>`<text x="${L+f*plotW}" y="${H-4}" text-anchor="${f===0?'start':f===1?'end':'middle'}" fill="#9ca8a1" font-size="11">${Math.round(f*max.blue)}</text>`).join('');
    drawing+=`<text x="${W-R}" y="${T+9}" text-anchor="end" fill="#9ca8a1" font-size="11">blue blobs →</text>`;
  }
  const svg=document.getElementById('chart-svg'); svg.innerHTML=grid+drawing; svg.setAttribute('aria-label',chartMode==='timeline'?'Recorded fruit, blue, and red populations over time':'Blue versus red population phase plot');
  for(const key of ['fruit','blue','red']) document.getElementById(`${key}-scale`).textContent=`0–${max[key]}`;
  document.getElementById('scale-note').textContent=chartMode==='timeline'?'Recent history · each line has its own scale':'Each dot is a recent recorded moment';
}

function summary(stats) {
  if(!stats.blue&&!stats.red) return ['A quiet garden','Both groups faded. Try more fruit or gentler energy use to bring the garden back.'];
  if(!stats.blue) return ['Blue blobs faded first','With no blue neighbors to meet, the red blobs are now running out of energy.'];
  if(world.config.fruitGrowth <= .35 && stats.blue < 10) return ['A small, patient garden','Fruit returns slowly here, so blue blobs have less energy to share with the red group.'];
  if(!stats.red) return ['A calmer chapter','Red blobs faded away. The blue group now follows the pace of fruit returning to the trees.'];
  if(stats.red>stats.blue*1.5) return ['A red wave is passing through','Red blobs found plenty of blue neighbors. Watch whether blue blobs recover as red energy runs low.'];
  if(stats.blue>stats.red*2.8&&stats.trend.blue>0) return ['Blue blobs are blooming','Fruit is turning into stored energy and new blue blobs. Red blobs may follow soon.'];
  if(stats.fruit<world.trees.length*1.4) return ['The fruit is in demand','Blue blobs are gathering near the trees. Fruit will return after each plant rests.'];
  return ['The garden has a rhythm','Fruit feeds blue blobs, blue blobs energize red blobs, and both groups respond to what remains.'];
}
function renderInspector() {
  const blob=world.blobs.find(b=>b.id===selectedId), body=document.getElementById('inspector-body');
  document.getElementById('close-inspector').hidden=!blob;
  if(!blob) {body.innerHTML='<div class="empty-inspector"><span class="empty-face">◡</span><p>Tap any blue or red blob in the garden to see its energy, habits, and little life story.</p></div>';return;}
  const blue=blob.kind==='blue', speed=(blue?config.blueSpeed:config.redSpeed)*blob.speedTrait, vision=(blue?config.blueVision:config.redVision)*blob.visionTrait;
  let statusLabel = 'Copy at';
  let statusValue = `${blue ? config.blueCopy : config.redCopy} energy`;
  if (blob.timer > 0) { statusLabel = 'Action left'; statusValue = `${blob.timer.toFixed(1)}s`; }
  else if (blob.age < 10) { statusLabel = 'Matures in'; statusValue = `${((10-blob.age)/10).toFixed(1)} days`; }
  else if (blob.cooldown > 0) { statusLabel = 'Copy rest'; statusValue = `${blob.cooldown.toFixed(1)}s`; }
  body.innerHTML=`<div class="inspector-content"><div class="inspector-identity"><span class="inspector-avatar ${blob.kind}">●</span><div><strong>${blue?'Blue':'Red'} blob #${blob.id}</strong><small>Generation ${blob.generation+1} · ${blob.action}</small></div></div><div class="energy-heading"><span>Energy</span><strong>${Math.max(0,Math.round(blob.energy))} / 112</strong></div><div class="energy-track"><span style="width:${Math.max(0,blob.energy)/112*100}%;background:${blue?'#6db9e6':'#ef9286'}"></span></div><div class="inspector-grid"><span>Age<strong>${(blob.age/10).toFixed(1)} days</strong></span><span>Speed<strong>${speed.toFixed(2)}×</strong></span><span>Vision<strong>${vision.toFixed(2)}</strong></span><span>${statusLabel}<strong>${statusValue}</strong></span></div></div>`;
}
function render() {
  const stats=snapshot(world), day=Math.floor(stats.time/10), [title,body]=summary(stats);
  document.getElementById('day-clock').textContent=`Day ${String(day).padStart(2,'0')}`;
  for(const key of ['fruit','blue','red']) document.getElementById(`${key}-count`).textContent=stats[key];
  for(const key of ['blue','red']) document.getElementById(`${key}-trend`).textContent=`${stats.trend[key]>=0?'+':''}${stats.trend[key]} recently`;
  document.getElementById('story-day').textContent=`FIELD NOTE · DAY ${day}`;
  document.getElementById('story-title').textContent=title;
  document.getElementById('story-body').textContent=body;
  document.getElementById('birth-count').innerHTML=`${stats.births.blue+stats.births.red}<small>new arrivals</small>`;
  document.getElementById('loss-count').innerHTML=`${stats.losses.blue+stats.losses.red}<small>faded away</small>`;
  renderWorld();renderChart();renderInspector();
}

const controls = {
  fruitGrowth:['Fruit growth speed',.15,1.6,.05,'×'],fruitLimit:['Fruit per tree',2,9,1,''],fruitDelay:['Fruit return delay',1,16,1,'s'],
  blueDrain:['Energy use',.2,1.2,.02,'/s'],blueSpeed:['Moving speed',.5,1.8,.05,'×'],blueVision:['Sensing range',.2,.8,.02,''],blueCopy:['Copy threshold',65,105,1,''],blueEatTime:['Eating time',.5,4,.1,'s'],
  redDrain:['Energy use',.3,1.4,.02,'/s'],redSpeed:['Moving speed',.5,1.8,.05,'×'],redVision:['Sensing range',.2,.95,.02,''],redContact:['Contact strength',10,42,1,''],redCopy:['Copy threshold',65,110,1,''],redPause:['Happy pause',.5,6,.1,'s'],
  trees:['Fruit trees',4,20,1,''],blue:['Blue blobs',2,30,1,''],red:['Red blobs',0,20,1,''],worldSize:['World size',.7,1.4,.05,'×'],simSpeed:['Simulation speed',.5,12,.5,'×'],
};
const resetOnlyControls = new Set(['trees', 'blue', 'red', 'worldSize']);
const format=(value,step)=>Number(value).toFixed(step<1?(step<.1?2:1):0);
function slider(key) {
  const [label,min,max,step,unit]=controls[key],value=config[key],progress=(value-min)/(max-min)*100;
  const hint = key === 'worldSize' ? '<small>More room means longer trips between trees.</small>' : '';
  return `<label class="slider-row"><span class="slider-line"><span>${label}</span><strong data-value="${key}">${format(value,step)}${unit}</strong></span><input type="range" data-slider="${key}" min="${min}" max="${max}" step="${step}" value="${value}" style="--progress:${progress}%"/>${hint}</label>`;
}
function group(kind,title,body,extra='') {
  const symbol=kind==='plant'?'✿':'<span></span>';
  return `<div class="control-group"><div class="group-title"><span class="group-icon ${kind}">${symbol}</span><span>${title}${extra}</span></div>${body}</div>`;
}
function renderControls() {
  document.getElementById('preset-grid').innerHTML=Object.entries(presets).map(([key,p])=>`<button class="preset-button ${preset===key?'active':''}" data-preset="${key}">${p.label}</button>`).join('');
  const content=controlTab==='essentials'
    ? group('plant','Fruit & foliage',['fruitGrowth','fruitLimit','fruitDelay'].map(slider).join(''))+group('blue','Blue blobs',['blueDrain','blueSpeed','blueCopy'].map(slider).join(''))+group('red','Red blobs',['redDrain','redSpeed','redContact'].map(slider).join(''))+slider('simSpeed')
    : group('blue','Blue behavior',['blueVision','blueEatTime'].map(slider).join(''))+group('red','Red behavior',['redVision','redCopy','redPause'].map(slider).join(''))+group('plant','Starting world',['trees','blue','red','worldSize'].map(slider).join('')+`<label class="seed-row">Random seed<input data-seed type="number" value="${config.seed}"/></label>`,' <small>applies on reset</small>');
  document.getElementById('control-groups').innerHTML=content;
  document.querySelectorAll('[data-control-tab]').forEach(button=>button.classList.toggle('active',button.dataset.controlTab===controlTab));
}
function reset(next=config) {
  world=createWorld(next);
  selectedId=null;
  render();
}
function setPlaying(value) {
  playing=value;
  document.getElementById('play-button').innerHTML=`${icon(playing?'pause':'play')}<span>${playing?'Pause':'Play'}</span>`;
  document.getElementById('play-button').setAttribute('aria-label',playing?'Pause simulation':'Play simulation');
  document.getElementById('live-label').textContent=playing?'SIMULATION LIVE':'SIMULATION PAUSED';
  document.getElementById('live-dot').classList.toggle('pulsing',playing);
}

document.getElementById('play-button').addEventListener('click',()=>setPlaying(!playing));
document.getElementById('step-button').addEventListener('click',()=>{setPlaying(false);for(let i=0;i<25;i++)advance(world,.1);render();});
document.getElementById('reset-button').addEventListener('click',()=>reset());
document.getElementById('randomize-button').addEventListener('click',()=>{config={...config,seed:Math.floor(Math.random()*90000)+1000};preset='custom';reset(config);renderControls();});
document.getElementById('close-inspector').addEventListener('click',()=>{selectedId=null;renderInspector();renderWorld();});
document.getElementById('preset-grid').addEventListener('click',event=>{
  const button=event.target.closest('[data-preset]');if(!button)return;
  preset=button.dataset.preset;config={...defaults,...presets[preset].values,simSpeed:config.simSpeed};reset(config);renderControls();
});
document.querySelector('.control-tabs').addEventListener('click',event=>{const button=event.target.closest('[data-control-tab]');if(!button)return;controlTab=button.dataset.controlTab;renderControls();});
document.getElementById('control-groups').addEventListener('input',event=>{
  const input=event.target;
  if(input.dataset.slider){
    const key=input.dataset.slider,[,min,max,step,unit]=controls[key],value=Number(input.value);
    config={...config,[key]:value};
    if (!resetOnlyControls.has(key)) world.config={...world.config,[key]:value};
    preset='custom';
    document.querySelector(`[data-value="${key}"]`).textContent=`${format(value,step)}${unit}`;
    input.style.setProperty('--progress',`${(value-min)/(max-min)*100}%`);
    document.querySelectorAll('[data-preset]').forEach(button=>button.classList.remove('active'));
    render();
  } else if(input.hasAttribute('data-seed')) {const seed=Number(input.value);if(!Number.isFinite(seed))return;config={...config,seed:Math.trunc(seed)};preset='custom';document.querySelectorAll('[data-preset]').forEach(button=>button.classList.remove('active'));}
});
document.querySelector('.segmented').addEventListener('click',event=>{const button=event.target.closest('[data-chart-mode]');if(!button)return;chartMode=button.dataset.chartMode;document.querySelectorAll('[data-chart-mode]').forEach(b=>b.classList.toggle('active',b===button));renderChart();});

const worldSvg=document.getElementById('world-svg');let drag=null,dragged=false;
worldSvg.addEventListener('pointerdown',event=>{drag={x:event.clientX,angle,blobId:Number(event.target.closest('[data-blob-id]')?.dataset.blobId)||null};dragged=false;});
worldSvg.addEventListener('pointermove',event=>{if(!drag)return;const diff=event.clientX-drag.x;if(Math.abs(diff)>6&&!dragged){dragged=true;worldSvg.setPointerCapture(event.pointerId);}if(dragged){angle=drag.angle+diff*.006;renderWorld();}});
worldSvg.addEventListener('pointerup',()=>{if(drag&&!dragged&&drag.blobId){selectedId=drag.blobId;renderInspector();renderWorld();}drag=null;});
worldSvg.addEventListener('pointercancel',()=>{drag=null;});
worldSvg.addEventListener('keydown',event=>{
  if (event.key === 'Escape') { selectedId=null;renderInspector();renderWorld();return; }
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
  event.preventDefault();
  if (!world.blobs.length) return;
  const ids=world.blobs.map(blob=>blob.id);
  const current=ids.indexOf(selectedId);
  const next=event.key === 'ArrowRight' ? (current+1)%ids.length : (current<0?ids.length:current-1+ids.length)%ids.length;
  selectedId=ids[next];renderInspector();renderWorld();
});

renderControls();render();
let last=0,accumulator=0,lastPaint=0;
function frame(now) {
  if(!last)last=now;
  if(playing){accumulator+=Math.min(.05,(now-last)/1000)*config.simSpeed;let steps=0;while(accumulator>=.1&&steps<36){advance(world,.1);accumulator-=.1;steps++;}}
  last=now;
  if(playing&&now-lastPaint>110){render();lastPaint=now;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
