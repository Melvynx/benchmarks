// Living Garden — energy-driven predator/prey/fruit simulation. All chart data is recorded from this sim.
const $ = s => document.querySelector(s);
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let rng = mulberry32(7);
const rand=(a,b)=>a+rng()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

const DEFAULTS = {
  fruitGrowth:1.0, fruitLimit:6, fruitDelay:3.5,
  blueUse:0.8, blueSpeed:28, blueVision:95, blueCopy:66, blueEat:0.9,
  redUse:1.25, redSpeed:23, redVision:78, redContact:14, redCopy:86, redPause:1.7,
  startTrees:9, startBlue:16, startRed:6, worldSize:150, seed:7, simSpeed:1
};
let P = {...DEFAULTS};

const CTRL_GROUPS = [
  ["🌿 Fruit", [
    ["fruitGrowth","Fruit growth speed",0.1,3,0.05], ["fruitLimit","Fruit limit per tree",1,12,1], ["fruitDelay","Fruit return delay (s)",0,10,0.25],
  ]],
  ["🔵 Blue blobs", [
    ["blueUse","Energy use",0.2,2.5,0.05], ["blueSpeed","Speed",8,55,1], ["blueVision","Vision range",30,180,5],
    ["blueCopy","Copy threshold (energy)",45,95,1], ["blueEat","Eating time (s)",0.2,2.5,0.1],
  ]],
  ["🔴 Red blobs", [
    ["redUse","Energy use",0.2,2.5,0.05], ["redSpeed","Speed",8,55,1], ["redVision","Vision range",30,190,5],
    ["redContact","Contact strength",5,40,1], ["redCopy","Copy threshold (energy)",45,98,1], ["redPause","Pause after contact (s)",0.2,3,0.1],
  ]],
  ["🌍 World & start", [
    ["startTrees","Starting fruit trees",1,20,1], ["startBlue","Starting blue blobs",0,40,1], ["startRed","Starting red blobs",0,30,1],
    ["worldSize","World size",90,210,5], ["simSpeed","Simulation speed",0.25,3.5,0.25],
  ]],
];
const PRESETS = {
  balanced:{label:"Balanced garden",desc:"Classic out-of-phase waves",v:{}},
  rich:{label:"Fruit-rich garden",desc:"Fast fruit, blues boom first",v:{fruitGrowth:2.2,fruitLimit:10,fruitDelay:1.2,startTrees:13,startBlue:14,startRed:5}},
  redheavy:{label:"Red-heavy garden",desc:"Blues dip, then reds fade",v:{startRed:16,startBlue:20,redContact:22,redVision:125}},
  fragile:{label:"Fragile balance",desc:"Tight energy, big swings",v:{fruitGrowth:0.65,fruitLimit:4,fruitDelay:5,blueUse:1.25,redUse:1.05,startBlue:14,startRed:7}},
  lowfruit:{label:"Low-fruit garden",desc:"Sparse fruit keeps it small",v:{fruitGrowth:0.4,fruitLimit:3,fruitDelay:7,startTrees:5,startBlue:10,startRed:3}},
};

// ---------- state ----------
let trees=[], blobs=[], particles=[], history=[], simTime=0, playing=true, selected=null, nextId=1, births={blue:0,red:0}, deaths={blue:0,red:0}, eaten=0, contacts=0, histTimer=0, peakBlue=0, peakRed=0;
let rot=0.6, rotVel=0.02, zoom=1, dragging=false, lastX=0;

function spawnTree(x,y){ return {x,y,fruit:Math.floor(rand(2,P.fruitLimit+1)), timer:rand(0,2), sway:rand(0,6.28), id:nextId++}; }
function spawnBlob(kind,x,y,parent){
  const isB=kind==='blue';
  const baseSpeed=isB?P.blueSpeed:P.redSpeed, baseVis=isB?P.blueVision:P.redVision;
  const mutate=v=>parent? clamp(v*rand(0.88,1.12),6,220) : v*rand(0.9,1.1);
  return { id:nextId++, kind, x,y, vx:rand(-8,8), vy:rand(-8,8),
    energy: parent? P[isB?'blueCopy':'redCopy']*0.42 : rand(55,85),
    age:0, born:simTime, parentId:parent?parent.id:null, gen:parent?parent.gen+1:0,
    speed:mutate(parent?parent.speed:baseSpeed), vision:mutate(parent?parent.vision:baseVis),
    state:'wander', stateT:0, birthCd:0, contactCd:0, eatCd:0, target:null, wanderA:rand(0,6.28), blink:rand(1,4), bounce:rand(0,6.28),
    chew:0, flash:0, lean:0 };
}
function randomPos(margin=18){ const a=rand(0,Math.PI*2), r=Math.sqrt(rng())*(P.worldSize-margin); return {x:Math.cos(a)*r, y:Math.sin(a)*r}; }

function reset(randomizeSeed=false){
  if(randomizeSeed) P.seed = Math.floor(Math.random()*99999);
  rng = mulberry32(P.seed|0);
  trees=[]; blobs=[]; particles=[]; history=[]; simTime=0; selected=null; nextId=1;
  births={blue:0,red:0}; deaths={blue:0,red:0}; eaten=0; contacts=0; histTimer=0; peakBlue=0; peakRed=0;
  for(let i=0;i<P.startTrees;i++){ const p=randomPos(30); trees.push(spawnTree(p.x,p.y)); }
  for(let i=0;i<P.startBlue;i++){ const p=randomPos(); blobs.push(spawnBlob('blue',p.x,p.y,null)); }
  for(let i=0;i<P.startRed;i++){ const p=randomPos(); blobs.push(spawnBlob('red',p.x,p.y,null)); }
  recordHistory(); syncControlValues(); updateInspector(); drawCharts();
  toast(`Seed ${P.seed} · ${trees.length} trees, ${P.startBlue} blue, ${P.startRed} red`);
}

// ---------- simulation ----------
function nearest(from, list, maxD){ let best=null,bd=maxD; for(const o of list){ const d=dist(from,o); if(d<bd){bd=d;best=o;} } return best; }
function sparkle(x,y,color,n=6){ for(let i=0;i<n;i++) particles.push({x,y,vx:rand(-22,22),vy:rand(-30,-4),life:rand(.35,.7),t:0,color,r:rand(1.5,3)}); }

function step(dt){
  simTime += dt;
  // fruit regrowth: after a fruit is taken, that slot waits fruitDelay, then regrows at fruitGrowth pace
  for(const t of trees){
    t.sway += dt;
    if(t.fruit < P.fruitLimit){
      t.timer -= dt * P.fruitGrowth;
      if(t.timer <= 0){ t.fruit++; t.timer = Math.max(0.4, P.fruitDelay); }
    }
  }
  const blues = blobs.filter(b=>b.kind==='blue'), reds = blobs.filter(b=>b.kind==='red');
  const newborns = [];
  for(const b of blobs){
    b.age += dt; b.birthCd=Math.max(0,(b.birthCd||0)-dt); b.contactCd=Math.max(0,(b.contactCd||0)-dt); b.eatCd=Math.max(0,(b.eatCd||0)-dt); b.blink -= dt; if(b.blink < -0.12) b.blink = rand(1.8,4.5);
    b.bounce += dt*7; b.flash = Math.max(0, b.flash - dt*2.5);
    const isB = b.kind==='blue';
    const use = isB? P.blueUse : P.redUse;
    // state timers: eating / pause lock the blob in place — this is what stops instant repeats
    if(b.stateT > 0){
      b.stateT -= dt;
      b.vx *= 0.8; b.vy *= 0.8;
      if(b.state==='eating' && b.stateT <= 0 && b.target && b.target.fruit>0){
        b.target.fruit--; b.target.timer = Math.max(b.target.timer, P.fruitDelay);
        b.energy = clamp(b.energy+26, 0, 110); b.eatCd=3.5; eaten++;
        sparkle(b.x,b.y-8,'#7ee787',7); b.flash=1;
      }
      if(b.stateT<=0) b.state='wander';
      b.energy -= dt * 0.25 * use; // waiting is cheap
      continue;
    }
    // --- choose a goal ---
    let gx=null, gy=null, want=0;
    if(isB){
      const threat = nearest(b, reds, b.vision*0.75);
      if(threat && dist(b,threat) < Math.max(26,b.vision*0.42) && b.energy > 28){ const d=Math.max(8,dist(b,threat)); gx=b.x+(b.x-threat.x)/d*60; gy=b.y+(b.y-threat.y)/d*60; want=1.25; b.state='fleeing'; }
      else {
        const tree = nearest(b, trees.filter(t=>t.fruit>0), b.vision);
        if(tree){ gx=tree.x; gy=tree.y; want=1; b.state='seeking fruit'; b.target=tree;
          if(dist(b,tree)<17 && b.energy<102 && b.eatCd<=0){ b.state='eating'; b.stateT=P.blueEat; b.target=tree; } }
        else b.state = b.energy<45 ? 'searching' : 'wander';
      }
    } else {
      const prey = nearest(b, blues.filter(p=>p.contactCd<=0), b.vision);
      if(prey){ gx=prey.x; gy=prey.y; want=1.05; b.state='chasing blue'; b.target=prey;
        if(dist(b,prey)<15){
          const sheltered = trees.some(t=>dist(prey,t)<30); // canopy refuge: blues near trees are harder to catch
          const steal = Math.min(P.redContact, prey.energy*0.35) * (sheltered?0.4:1);
          prey.energy -= steal; b.energy = clamp(b.energy + steal*0.9, 0, 115);
          contacts++; b.state='resting after contact'; b.stateT=P.redPause; b.flash=1; prey.flash=1; prey.contactCd=4;
          prey.vx += (prey.x-b.x)*2.2; prey.vy += (prey.y-b.y)*2.2; prey.state='fleeing';
          sparkle((b.x+prey.x)/2,(b.y+prey.y)/2-8,'#ffb3ab',8);
        }
      } else b.state='wander';
    }
    if(gx===null){ b.wanderA += rand(-1.6,1.6)*dt*3; gx=b.x+Math.cos(b.wanderA)*40; gy=b.y+Math.sin(b.wanderA)*40; want=0.45; if(b.state!=='fleeing'&&b.state!=='searching') b.state='wander'; }
    // separation so blobs don't stack
    let sx=0, sy=0;
    for(const o of blobs){ if(o===b) continue; const d=dist(b,o); if(d>0.01&&d<16){ sx+=(b.x-o.x)/d*(16-d)*2.4; sy+=(b.y-o.y)/d*(16-d)*2.4; } }
    const dx=gx-b.x, dy=gy-b.y, dl=Math.hypot(dx,dy)||1;
    const effSpeed = clamp((isB?P.blueSpeed:P.redSpeed) * b.speed/(isB?DEFAULTS.blueSpeed:DEFAULTS.redSpeed), 4, 95) * (b.state==='fleeing'?1.35:1);
    b.vx += ((dx/dl)*effSpeed*want + sx - b.vx) * Math.min(1, dt*4);
    b.vy += ((dy/dl)*effSpeed*want + sy - b.vy) * Math.min(1, dt*4);
    b.x += b.vx*dt; b.y += b.vy*dt;
    const rr = Math.hypot(b.x,b.y), maxR = P.worldSize-12;
    if(rr>maxR){ b.x*=maxR/rr; b.y*=maxR/rr; b.wanderA+=2.4; }
    b.lean = clamp(b.vx/40,-0.35,0.35);
    const moving = Math.hypot(b.vx,b.vy);
    const crowd = 1 + (isB? blues.length/42 : reds.length/26); // crowding: groups level out instead of growing forever
    b.energy -= dt * use * (0.24 + moving/70) * crowd;
    // reproduction: birth is paid for from stored energy
    const copyT = isB? P.blueCopy : P.redCopy;
    const count = isB? blues.length+newborns.filter(n=>n.kind==='blue').length : reds.length+newborns.filter(n=>n.kind==='red').length;
    if(b.energy>=copyT && b.age>3 && b.birthCd<=0 && count<70){
      b.energy -= copyT*0.55; b.birthCd=5;
      const child = spawnBlob(b.kind, b.x+rand(-9,9), b.y+rand(-9,9), b);
      newborns.push(child); births[b.kind]++; b.flash=1; sparkle(b.x,b.y-10, isB?'#8fc2ff':'#ffb3ab',6);
    }
  }
  blobs.push(...newborns);
  const before = blobs.length;
  blobs = blobs.filter(b=>{
    if(b.energy<=0){ deaths[b.kind]++; sparkle(b.x,b.y,'#c9c9c9',5); if(selected===b) selected=null; return false; }
    return true;
  });
  for(const p of particles){ p.t+=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=40*dt; }
  particles = particles.filter(p=>p.t<p.life);
  peakBlue=Math.max(peakBlue, blobs.filter(b=>b.kind==='blue').length);
  peakRed=Math.max(peakRed, blobs.filter(b=>b.kind==='red').length);
  histTimer-=dt; if(histTimer<=0){ histTimer=0.5; recordHistory(); }
}
function recordHistory(){
  const blues=blobs.filter(b=>b.kind==='blue'), reds=blobs.filter(b=>b.kind==='red');
  const avg=a=>a.length? a.reduce((s,b)=>s+b,0)/a.length : 0;
  history.push({ t:simTime, fruit:trees.reduce((s,t)=>s+t.fruit,0), blue:blues.length, red:reds.length,
    bSpeed:avg(blues.map(b=>b.speed)), rSpeed:avg(reds.map(b=>b.speed)), bVis:avg(blues.map(b=>b.vision)) });
  if(history.length>900) history.shift();
}

// ---------- rendering ----------
const cv = $('#world'), ctx = cv.getContext('2d');
let viewW=0, viewH=0;
function resize(){ const r=cv.getBoundingClientRect(), dpr=Math.min(2,devicePixelRatio||1); viewW=r.width; viewH=r.height; cv.width=r.width*dpr; cv.height=r.height*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); }
addEventListener('resize', resize);
function project(x,y){ const c=Math.cos(rot), s=Math.sin(rot); const rx=x*c-y*s, ry=x*s+y*c; const scale=(Math.min(viewW,viewH*1.55)/2-26)/P.worldSize*zoom; return { x: viewW/2+rx*scale, y: viewH/2+ry*scale*0.60, scale, depth: ry }; }

function drawWorld(){
  ctx.clearRect(0,0,viewW,viewH);
  const cx=viewW/2, cy=viewH/2, R=(Math.min(viewW,viewH*1.55)/2-26)*zoom, Ry=R*0.60;
  // dish shadow + rim
  ctx.fillStyle='rgba(60,90,50,.18)'; ctx.beginPath(); ctx.ellipse(cx,cy+16,R+16,Ry+14,0,0,7); ctx.fill();
  ctx.fillStyle='#8a6844'; ctx.beginPath(); ctx.ellipse(cx,cy+7,R+10,Ry+10,0,0,7); ctx.fill();
  ctx.fillStyle='#9ed07e'; ctx.beginPath(); ctx.ellipse(cx,cy,R,Ry,0,0,7); ctx.fill();
  ctx.fillStyle='#aede8d'; ctx.beginPath(); ctx.ellipse(cx,cy-4,R*0.86,Ry*0.84,0,0,7); ctx.fill();
  // speckles
  ctx.fillStyle='rgba(255,255,255,.25)';
  for(let i=0;i<26;i++){ const a=i*2.399, r=((i*53)%80)/100*R; const p=project(Math.cos(a)*r*0.9,Math.sin(a)*r*0.9); ctx.beginPath(); ctx.arc(p.x,p.y,2,0,7); ctx.fill(); }
  // draw trees + blobs sorted by depth
  const items=[];
  for(const t of trees) items.push({d:project(t.x,t.y).depth, t});
  for(const b of blobs) items.push({d:project(b.x,b.y).depth+1, b});
  items.sort((a,b)=>a.d-b.d);
  for(const it of items){ if(it.t) drawTree(it.t); else drawBlob(it.b); }
  for(const p of particles){ const s=project(p.x,p.y); ctx.globalAlpha=1-p.t/p.life; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(s.x,s.y-8,p.r,0,7); ctx.fill(); ctx.globalAlpha=1; }
  if(!dragging) rot += rotVel*0.016; rotVel*=0.995; if(Math.abs(rotVel)<0.02) rotVel=0.02;
}
function drawTree(t){
  const p=project(t.x,t.y), s=p.scale;
  ctx.fillStyle='rgba(50,80,40,.22)'; ctx.beginPath(); ctx.ellipse(p.x,p.y+3,20*s,6*s,0,0,7); ctx.fill();
  ctx.strokeStyle='#7a4f2a'; ctx.lineWidth=Math.max(2,5*s); ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.quadraticCurveTo(p.x+2*s,p.y-12*s,p.x,p.y-20*s); ctx.stroke();
  const sway=Math.sin(t.sway*1.4)*2*s;
  for(const [ox,oy,r] of [[-11,-26,13],[10,-29,14],[0,-36,16]]){
    ctx.fillStyle='#3f9e4d'; ctx.beginPath(); ctx.arc(p.x+(ox*s)+sway,p.y+oy*s,r*s,0,7); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(p.x+(ox-4)*s+sway,p.y+(oy-5)*s,r*s*0.45,0,7); ctx.fill();
  }
  // fruit attached to canopy — count is the real t.fruit
  const spots=[[-14,-30],[-4,-40],[7,-33],[14,-24],[-8,-22],[3,-27],[11,-40],[-16,-37],[0,-32],[6,-22],[-12,-27],[15,-32]];
  for(let i=0;i<t.fruit && i<spots.length;i++){
    ctx.fillStyle='#ffe14d'; ctx.strokeStyle='#d9a400'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(p.x+spots[i][0]*s+sway,p.y+spots[i][1]*s,Math.max(2,3.4*s),0,7); ctx.fill(); ctx.stroke();
  }
  if(t.fruit===0){ ctx.fillStyle='rgba(60,80,50,.65)'; ctx.font=`${Math.max(9,10*s)}px sans-serif`; ctx.textAlign='center'; ctx.fillText('regrowing…',p.x,p.y-48*s); }
}
function drawBlob(b){
  const p=project(b.x,b.y), s=p.scale, isB=b.kind==='blue';
  const squash = 1+Math.sin(b.bounce)*0.07 + (b.state==='eating'? Math.sin(b.bounce*2)*0.08:0);
  const w=13*s*squash, h=16*s/squash;
  const bob = Math.abs(Math.sin(b.bounce))*2.2*s;
  const x=p.x, y=p.y-bob;
  ctx.fillStyle='rgba(50,80,40,.25)'; ctx.beginPath(); ctx.ellipse(p.x,p.y+3,13*s,4.5*s,0,0,7); ctx.fill();
  if(selected===b){ ctx.strokeStyle='#20301f'; ctx.lineWidth=2; ctx.setLineDash([5,4]); ctx.beginPath(); ctx.ellipse(p.x,p.y+2,20*s,8*s,0,0,7); ctx.stroke(); ctx.setLineDash([]); }
  if(b.flash>0){ ctx.fillStyle=isB?'rgba(120,190,255,.35)':'rgba(255,150,140,.35)'; ctx.beginPath(); ctx.arc(x,y-h*0.5,24*s*b.flash,0,7); ctx.fill(); }
  ctx.save(); ctx.translate(x,y); ctx.rotate(b.lean);
  const grad=ctx.createLinearGradient(0,-h,0,0); if(isB){grad.addColorStop(0,'#7ec3ff');grad.addColorStop(1,'#2470d8');}else{grad.addColorStop(0,'#ff9a8f');grad.addColorStop(1,'#d92f24');}
  ctx.fillStyle=grad; ctx.beginPath(); ctx.ellipse(0,-h/2,w,h/2,0,0,7); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(-w*0.32,-h*0.68,w*0.28,h*0.2,-0.4,0,7); ctx.fill();
  // face
  const blinking=b.blink<0, chew=b.state==='eating'? Math.sin(b.bounce*2)*1.6:0;
  ctx.fillStyle='#16233a';
  if(blinking){ ctx.fillRect(-6*s,-h*0.58,4*s,1.4*s); ctx.fillRect(2*s,-h*0.58,4*s,1.4*s); }
  else { ctx.beginPath(); ctx.arc(-4*s,-h*0.58,1.9*s,0,7); ctx.arc(4*s,-h*0.58,1.9*s,0,7); ctx.fill(); }
  ctx.strokeStyle='#16233a'; ctx.lineWidth=1.3*s; ctx.beginPath();
  if(b.energy<28) ctx.arc(0,-h*0.32+chew,3.4*s,1.15*Math.PI,1.85*Math.PI);
  else ctx.arc(0,-h*0.44+chew,3.6*s,0.15*Math.PI,0.85*Math.PI);
  ctx.stroke();
  // energy pip
  ctx.restore();
  ctx.fillStyle='rgba(255,255,255,.85)'; ctx.fillRect(x-11*s,y-h-8*s,22*s,4*s);
  ctx.fillStyle=b.energy>45?'#57c84a':b.energy>22?'#ffb020':'#e5483f'; ctx.fillRect(x-11*s,y-h-8*s,22*s*clamp(b.energy/100,0,1),4*s);
}

// ---------- charts ----------
function setupCanvas(c){ const r=c.getBoundingClientRect(), dpr=Math.min(2,devicePixelRatio||1); const h=c.height; c.width=r.width*dpr; c.height=h*dpr; const g=c.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); return [g,r.width,h]; }
function axes(g,w,h){ g.strokeStyle='#e7dfc9'; g.fillStyle='#8a967f'; g.font='10px sans-serif'; g.beginPath(); g.moveTo(28,6); g.lineTo(28,h-18); g.lineTo(w-6,h-18); g.stroke(); }
function series(g,data,key,color,w,h,maxV){
  if(data.length<2) return; const max=maxV||Math.max(1,...data.map(d=>d[key])); const t0=data[0].t, t1=Math.max(t0+1,data[data.length-1].t);
  g.strokeStyle=color; g.lineWidth=2; g.beginPath();
  data.forEach((d,i)=>{ const x=28+(d.t-t0)/(t1-t0)*(w-36), y=(h-18)-(d[key]/max)*(h-30); i?g.lineTo(x,y):g.moveTo(x,y); }); g.stroke();
}
function drawCharts(){
  { const [g,w,h]=setupCanvas($('#chartMain')); g.clearRect(0,0,w,h); axes(g,w,h);
    series(g,history,'fruit','#3f9e4d',w,h); series(g,history,'blue','#2f7fe0',w,h); series(g,history,'red','#e5483f',w,h);
    const last=history[history.length-1]; if(last){ g.fillStyle='#6b7a68'; g.fillText(`now  fruit ${last.fruit} · blue ${last.blue} · red ${last.red}   (peaks fruit ${Math.max(...history.map(d=>d.fruit),0)} · B ${Math.max(...history.map(d=>d.blue),0)} · R ${Math.max(...history.map(d=>d.red),0)})`,30,h-4); } }
  { const [g,w,h]=setupCanvas($('#chartPhase')); g.clearRect(0,0,w,h); axes(g,w,h);
    const mx=Math.max(5,...history.map(d=>d.blue)), my=Math.max(5,...history.map(d=>d.red));
    g.strokeStyle='rgba(80,110,70,.55)'; g.lineWidth=1.6; g.beginPath();
    history.forEach((d,i)=>{ const x=28+d.blue/mx*(w-38), y=(h-18)-d.red/my*(h-28); i?g.lineTo(x,y):g.moveTo(x,y); }); g.stroke();
    const last=history[history.length-1]; if(last){ g.fillStyle='#e5483f'; g.beginPath(); g.arc(28+last.blue/mx*(w-38),(h-18)-last.red/my*(h-28),4,0,7); g.fill(); }
    g.fillStyle='#8a967f'; g.fillText('blue →',w-52,h-4); g.save(); g.translate(9,h-30); g.rotate(-Math.PI/2); g.fillText('red →',0,0); g.restore(); }
  { const [g,w,h]=setupCanvas($('#chartTraits')); g.clearRect(0,0,w,h); axes(g,w,h);
    series(g,history,'bSpeed','#2f7fe0',w,h,60); series(g,history,'rSpeed','#e5483f',w,h,60); series(g,history,'bVis','#3f9e4d',w,h,190); }
  updateSummary();
}
function updateSummary(){
  const blues=blobs.filter(b=>b.kind==='blue').length, reds=blobs.filter(b=>b.kind==='red').length, fruit=trees.reduce((s,t)=>s+t.fruit,0);
  $('#lgFruit').textContent=`Fruit ${fruit}`; $('#lgBlue').textContent=`Blue ${blues}`; $('#lgRed').textContent=`Red ${reds}`;
  $('#clock').textContent=`${simTime.toFixed(1)}s · ${history.length} samples`;
  $('#topStats').innerHTML=`<span class="pill">🍎 <b>${fruit}</b> fruit</span><span class="pill">🔵 <b>${blues}</b></span><span class="pill">🔴 <b>${reds}</b></span><span class="pill">🌳 <b>${trees.length}</b> trees</span><span class="pill">✨ <b>${eaten}</b> eaten · <b>${contacts}</b> contacts</span>`;
  let msg;
  if(history.length<12) msg='Just planted. Give it a few seconds — blues need fruit before reds can follow.';
  else if(blues===0 && reds===0) msg='Both groups faded. The garden is quiet now — add fruit or lower energy use and reset.';
  else if(blues===0) msg='Blue blobs faded first. Without blues, red blobs have no energy source and will fade next.';
  else if(reds===0 && blues>0) msg='Red blobs faded and the world settled into a simpler state: blues and fruit alone, levelling at the fruit supply.';
  else {
    // detect lead/lag: did blue peak before red?
    const bi=history.findIndex(d=>d.blue===Math.max(...history.map(x=>x.blue)));
    const ri=history.findIndex(d=>d.red===Math.max(...history.map(x=>x.red)));
    const recent=history.slice(-30); const swing=Math.max(...recent.map(d=>d.blue))-Math.min(...recent.map(d=>d.blue));
    if(fruit<=trees.length*1.2 && blues<12) msg='Low fruit kept the garden small. Fruit is the ceiling — raise growth or the limit to grow the whole web.';
    else if(ri>bi && swing>3) msg='Blue blobs grew first, then red blobs followed — the classic out-of-phase wave. Watch blues dip as reds peak, then reds fade.';
    else if(swing<=3) msg='The garden stayed balanced. Populations are levelling out instead of growing forever, held by fruit and birth costs.';
    else msg='Waves are forming. More fruit lifts blues, more blues lift reds, and too many reds pull blues back down.';
  }
  $('#summary').textContent=msg;
  $('#summaryStats').innerHTML=`<span class="pill">Peak blue <b>${peakBlue}</b></span><span class="pill">Peak red <b>${peakRed}</b></span><span class="pill">Births 🔵 <b>${births.blue}</b> · 🔴 <b>${births.red}</b></span><span class="pill">Faded 🔵 <b>${deaths.blue}</b> · 🔴 <b>${deaths.red}</b></span><span class="pill">Fruit eaten <b>${eaten}</b></span><span class="pill">Contacts <b>${contacts}</b></span>`;
}

// ---------- inspector ----------
function updateInspector(){
  const el=$('#inspector');
  if(!selected || !blobs.includes(selected)){ el.className='inspector empty'; el.textContent='Click any blob in the garden to see its energy, age, action and family.'; return; }
  const b=selected, isB=b.kind==='blue';
  el.className='inspector';
  el.innerHTML=`<h4>${isB?'🔵 Blue':'🔴 Red'} blob #${b.id} <span style="color:#6b7a68;font-weight:600">· generation ${b.gen}${b.parentId?` · parent #${b.parentId}`:' · founder'}</span></h4>
  <div class="bar"><i style="width:${clamp(b.energy,0,100)}%;background:${isB?'#2f7fe0':'#e5483f'}"></i></div>
  <div class="kv"><span><b>Energy</b> ${b.energy.toFixed(1)}</span><span><b>Age</b> ${b.age.toFixed(1)}s</span><span><b>Action</b> ${b.state}</span>
  <span><b>Speed trait</b> ${b.speed.toFixed(1)}</span><span><b>Sensing range</b> ${b.vision.toFixed(0)}</span>
  <span><b>${b.state==='eating'?'Eating time left':b.stateT>0?'Pause left':'Timer'}</b> ${Math.max(0,b.stateT).toFixed(2)}s</span>
  <span><b>Copy threshold</b> ${isB?P.blueCopy:P.redCopy}</span><span><b>Born at</b> ${b.born.toFixed(1)}s</span></div>`;
}

// ---------- controls ----------
const controlsEl=$('#controls');
for(const [title, items] of CTRL_GROUPS){
  const g=document.createElement('div'); g.className='group'; g.innerHTML=`<h3>${title}</h3>`;
  for(const [key,label,min,max,step] of items){
    const d=document.createElement('div'); d.className='ctrl';
    d.innerHTML=`<label>${label}<output id="out-${key}"></output></label><input type="range" id="ctl-${key}" min="${min}" max="${max}" step="${step}">`;
    g.appendChild(d);
  }
  controlsEl.appendChild(g);
}
{ const g=document.createElement('div'); g.className='group'; g.innerHTML=`<h3>🎲 Seed</h3><div class="ctrl"><label>Random seed<output id="out-seed"></output></label><div class="seedrow"><input type="number" id="ctl-seed"><button class="mini" id="btnSeed">Apply & reset</button></div></div>`;
  controlsEl.appendChild(g); }
function syncControlValues(){ for(const k of Object.keys(DEFAULTS)){ const c=$('#ctl-'+k), o=$('#out-'+k); if(c) c.value=P[k]; if(o) o.textContent=P[k]; } }
for(const k of Object.keys(DEFAULTS)){
  const c=$('#ctl-'+k); if(!c) continue;
  c.addEventListener('input',()=>{ P[k]=parseFloat(c.value); const o=$('#out-'+k); if(o) o.textContent=P[k];
    if(k==='worldSize'){ for(const b of blobs){ const r=Math.hypot(b.x,b.y); if(r>P.worldSize-12){ b.x*=(P.worldSize-12)/r; b.y*=(P.worldSize-12)/r; } } }
  });
}
$('#btnSeed').onclick=()=>{ P.seed=parseInt($('#ctl-seed').value||'7',10)||7; reset(false); };
const presetsEl=$('#presets'); let activePreset='balanced';
for(const [key,p] of Object.entries(PRESETS)){
  const btn=document.createElement('button'); btn.className='preset'+(key==='balanced'?' active':''); btn.innerHTML=`<b>${p.label}</b><span>${p.desc}</span>`;
  btn.onclick=()=>{ P={...DEFAULTS,...p.v,seed:P.seed}; activePreset=key; document.querySelectorAll('.preset').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); reset(false); };
  presetsEl.appendChild(btn);
}
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2400); }

// transport
const btnPlay=$('#btnPlay');
function setPlaying(v){ playing=v; btnPlay.textContent=playing?'⏸ Pause':'▶ Play'; }
btnPlay.onclick=()=>setPlaying(!playing);
$('#btnStep').onclick=()=>{ setPlaying(false); for(let i=0;i<6;i++) step(1/30); drawCharts(); updateInspector(); };
$('#btnReset').onclick=()=>reset(false);
$('#btnRandom').onclick=()=>{ P={ fruitGrowth:rand(.3,2.6), fruitLimit:Math.round(rand(3,11)), fruitDelay:rand(.5,8),
  blueUse:rand(.4,1.8), blueSpeed:rand(14,45), blueVision:rand(50,160), blueCopy:Math.round(rand(55,90)), blueEat:rand(.3,2),
  redUse:rand(.35,1.7), redSpeed:rand(14,45), redVision:rand(55,170), redContact:Math.round(rand(10,35)), redCopy:Math.round(rand(58,92)), redPause:rand(.4,2.4),
  startTrees:Math.round(rand(5,16)), startBlue:Math.round(rand(8,28)), startRed:Math.round(rand(2,16)), worldSize:Math.round(rand(110,190)), seed:Math.floor(rand(0,99999)), simSpeed:P.simSpeed };
  document.querySelectorAll('.preset').forEach(x=>x.classList.remove('active')); reset(false); toast('Randomized garden 🎲'); };

// pointer: drag rotate, wheel zoom, click inspect
let downX=0, downY=0, moved=false;
cv.addEventListener('pointerdown',e=>{ dragging=true; moved=false; downX=lastX=e.clientX; downY=e.clientY; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove',e=>{ if(!dragging) return; const dx=e.clientX-lastX; lastX=e.clientX; if(Math.abs(e.clientX-downX)+Math.abs(e.clientY-downY)>5) moved=true; rot+=dx*0.008; rotVel=dx*0.002; });
cv.addEventListener('pointerup',e=>{ dragging=false; if(!moved){
  const r=cv.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
  let best=null,bd=26; for(const b of blobs){ const p=project(b.x,b.y); const d=Math.hypot(p.x-mx,p.y-14-my); if(d<bd){bd=d;best=b;} }
  selected=best; updateInspector(); if(best) toast(`${best.kind==='blue'?'🔵 Blue':'🔴 Red'} #${best.id} · ${best.state} · energy ${best.energy.toFixed(0)}`);
} });
cv.addEventListener('wheel',e=>{ e.preventDefault(); zoom=clamp(zoom*(e.deltaY<0?1.08:0.93),0.65,1.9); },{passive:false});

// ---------- main loop ----------
let lastTs=performance.now(), chartTimer=0;
function loop(ts){
  const realDt=Math.min(0.05,(ts-lastTs)/1000); lastTs=ts;
  if(playing){ const simDt=realDt*P.simSpeed; const sub=Math.max(1,Math.ceil(simDt/0.033)); for(let i=0;i<sub;i++) step(simDt/sub); }
  drawWorld();
  chartTimer-=realDt; if(chartTimer<=0){ chartTimer=0.4; drawCharts(); if(selected) updateInspector(); }
  requestAnimationFrame(loop);
}
resize(); reset(false); setPlaying(true); requestAnimationFrame(loop);



