import { useEffect, useRef, useState, useCallback } from 'react'

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)

const DEFAULTS={fruitGrowth:1.1,fruitLimit:6,fruitDelay:3,blueEnergyUse:0.85,blueSpeed:36,blueVision:110,blueCopy:82,blueEatTime:1.0,redEnergyUse:1.2,redSpeed:34,redVision:88,redContact:15,redCopy:88,redPause:1.6,startTrees:9,startBlue:14,startRed:5,worldSize:100,seed:7,simSpeed:1}
const PRESETS={
  balanced:{...DEFAULTS,label:'Balanced Garden'},
  fruitRich:{...DEFAULTS,fruitGrowth:2.6,fruitLimit:9,fruitDelay:1.2,startTrees:12,startBlue:16,startRed:6,seed:11,label:'Fruit-Rich Garden'},
  redHeavy:{...DEFAULTS,startRed:15,startBlue:16,redContact:22,redVision:125,redSpeed:40,fruitGrowth:1.2,seed:21,label:'Red-Heavy Garden'},
  fragile:{...DEFAULTS,fruitGrowth:0.65,fruitLimit:4,fruitDelay:6,blueCopy:86,redCopy:86,startBlue:10,startRed:5,startTrees:7,seed:33,label:'Fragile Balance'},
  lowFruit:{...DEFAULTS,fruitGrowth:0.32,fruitLimit:3,fruitDelay:9,startTrees:6,startBlue:10,startRed:4,seed:44,label:'Low-Fruit Garden'},
}
let NEXT_ID=1
function makeBlob(type,x,y,rng,parent){
  return {id:NEXT_ID++,type,x,y,vx:(rng()-0.5)*10,vy:(rng()-0.5)*10,heading:rng()*Math.PI*2,
    energy:parent?42+rng()*8:52+rng()*22,age:0,state:type==='blue'?'seek fruit':'wander',stateTimer:0,targetTree:null,targetId:null,
    reproCooldown:parent?5:2+rng()*3,invuln:0,contactCooldown:0,wanderTimer:rng()*2,blink:1+rng()*3,blinkPhase:0,bounce:rng()*Math.PI*2,
    speedFactor:parent?clamp(parent.speedFactor+(rng()-0.5)*0.14,0.78,1.32):0.88+rng()*0.28,
    visionFactor:parent?clamp(parent.visionFactor+(rng()-0.5)*0.14,0.78,1.32):0.88+rng()*0.28,
    generation:parent?parent.generation+1:1,parentId:parent?parent.id:null,eaten:0,contacts:0,sx:0,sy:0}
}
function createSim(p){
  NEXT_ID=1
  const rng=mulberry32(p.seed*1000+17)
  const R=p.worldSize
  const trees=[]
  for(let i=0;i<p.startTrees;i++){
    const a=rng()*Math.PI*2, rr=Math.sqrt(rng())*(R*0.78)
    trees.push({id:i+1,x:Math.cos(a)*rr,y:Math.sin(a)*rr,fruit:2+Math.floor(rng()*Math.min(4,p.fruitLimit)),delay:0,phase:rng()*Math.PI*2,slots:Array.from({length:12},(_,k)=>{const aa=k/12*Math.PI*2+ rng()*0.4;return{dx:Math.cos(aa)*(10+rng()*9),dy:Math.sin(aa)*(7+rng()*6)-6}})})
  }
  const blobs=[]
  const spawn=(type,n)=>{for(let i=0;i<n;i++){const a=rng()*Math.PI*2,rr=Math.sqrt(rng())*(R*0.75);blobs.push(makeBlob(type,Math.cos(a)*rr,Math.sin(a)*rr,rng,null))}}
  spawn('blue',p.startBlue); spawn('red',p.startRed)
  return {time:0,trees,blobs,particles:[],rng,history:[],histTimer:0,births:0,deaths:0,eatenTotal:0,contactsTotal:0,rot:0.4}
}

function stepSim(sim,p,dt){
  sim.time+=dt
  // fruit regrowth: slow return after delay, capped by limit -> levels out
  for(const t of sim.trees){
    if(t.delay>0){t.delay-=dt}
    else if(t.fruit<p.fruitLimit){t.fruit=Math.min(p.fruitLimit,t.fruit+0.20*p.fruitGrowth*dt)}
  }
  const blues=sim.blobs.filter(b=>b.type==='blue'), reds=sim.blobs.filter(b=>b.type==='red')
  const R=p.worldSize
  const toAdd=[]
  for(const b of sim.blobs){
    b.age+=dt; b.bounce+=dt*6; b.blink-=dt; if(b.blink<-0.12)b.blink=2+sim.rng()*3.5
    b.reproCooldown=Math.max(0,b.reproCooldown-dt); b.invuln=Math.max(0,b.invuln-dt); b.contactCooldown=Math.max(0,b.contactCooldown-dt)
    const isBlue=b.type==='blue'
    const eUse=isBlue?p.blueEnergyUse:p.redEnergyUse
    const baseSpeed=(isBlue?p.blueSpeed:p.redSpeed)*b.speedFactor
    const vision=(isBlue?p.blueVision:p.redVision)*b.visionFactor
    let desiredX=0,desiredY=0,moving=false

    if(b.state==='eat'||b.state==='pause'){
      b.stateTimer-=dt
      b.energy-=0.85*eUse*dt // waiting uses a little energy
      if(b.stateTimer<=0){
        if(b.state==='eat'&&b.targetTree){
          const t=sim.trees.find(x=>x.id===b.targetTree)
          if(t&&t.fruit>=1){t.fruit-=1;t.delay=p.fruitDelay;b.energy=clamp(b.energy+40,0,100);b.eaten++;sim.eatenTotal++;burst(sim,b.x,b.y,'#7ac74f')}
          b.state='seek fruit'
        }else{b.state=isBlue?'seek fruit':'chase blue'}
        b.targetTree=null
      }
    }else{
      // --- sensing ---
      let fleeX=0,fleeY=0,threat=null
      if(isBlue){
        const danger=Math.min(46,vision*0.45)
        for(const r of reds){const d=dist(b,r);if(d<danger&&(!threat||d<dist(b,threat)))threat=r}
        if(threat){const d=Math.max(8,dist(b,threat));fleeX=(b.x-threat.x)/d;fleeY=(b.y-threat.y)/d;b.state='flee red'}
      }
      // separation / avoid crowded areas
      let sepX=0,sepY=0,crowd=0
      for(const o of sim.blobs){if(o===b)continue;const d=dist(b,o);if(d<24&&d>0.01){sepX+=(b.x-o.x)/d*(24-d)*0.06;sepY+=(b.y-o.y)/d*(24-d)*0.06;if(o.type===b.type)crowd++}}

      let target=null
      if(isBlue&&!threat){
        let best=1e9
        for(const t of sim.trees){if(t.fruit<1)continue;const d=dist(b,t);const effVision=b.energy<55?vision*3:vision;if(d<effVision&&d<best){best=d;target=t}}
        if(target){
          b.state='seek fruit';b.targetTree=target.id
          if(best<20){b.state='eat';b.stateTimer=p.blueEatTime;burst(sim,b.x,b.y,'#b7e39a');continue}
          desiredX=(target.x-b.x)/best;desiredY=(target.y-b.y)/best;moving=true
        }else{b.state='wander'}
      }
      if(!isBlue){
        let best=1e9,prey=null
        for(const bl of blues){const d=dist(b,bl);if(d<vision&&d<best){best=d;prey=bl}}
        if(prey){
          b.state='chase blue';b.targetId=prey.id
          desiredX=(prey.x-b.x)/Math.max(1,best);desiredY=(prey.y-b.y)/Math.max(1,best);moving=true
          if(best<17&&prey.invuln<=0&&b.contactCooldown<=0){
            // gentle contact: red gains, blue loses, both pause/flee - cooldown prevents instant repeat
            // blues sheltering near a tree/bush are harder to boop, letting rare blues recover
            const sheltered=sim.trees.some(t=>dist(prey,t)<28)
            prey.energy-=p.redContact*(sheltered?0.28:0.55); prey.invuln=sheltered?4.2:3.0; prey.state='flee red'
            prey.vx+=(prey.x-b.x)*2.2; prey.vy+=(prey.y-b.y)*2.2
            b.energy=clamp(b.energy+p.redContact*0.95,0,100); b.contacts++; sim.contactsTotal++
            b.state='pause'; b.stateTimer=p.redPause; b.contactCooldown=p.redPause+2.6
            burst(sim,(b.x+prey.x)/2,(b.y+prey.y)/2,'#f6a08c'); continue
          }
        }else b.state='wander'
      }
      if(threat){desiredX=fleeX*1.5;desiredY=fleeY*1.5;moving=true}
      if(!moving){
        b.wanderTimer-=dt
        if(b.wanderTimer<=0){b.wanderTimer=1+sim.rng()*2.2;b.heading+=(sim.rng()-0.5)*1.8}
        desiredX=Math.cos(b.heading);desiredY=Math.sin(b.heading)
        // gentle drift toward centre / trees when wandering so blues eventually find food
        if(isBlue&&sim.rng()<0.02){const t=sim.trees[Math.floor(sim.rng()*sim.trees.length)];if(t){desiredX=(t.x-b.x)/Math.max(20,dist(b,t));desiredY=(t.y-b.y)/Math.max(20,dist(b,t))}}
        moving=true
      }
      desiredX+=sepX;desiredY+=sepY
      // stay in round world
      const dc=Math.hypot(b.x,b.y)
      if(dc>R*0.82){desiredX+=( -b.x/dc)*1.6;desiredY+=( -b.y/dc)*1.6}
      const dl=Math.hypot(desiredX,desiredY)||1
      const sp= b.state==='flee red'?baseSpeed*1.38:baseSpeed
      b.vx+=(desiredX/dl*sp-b.vx)*Math.min(1,dt*4)
      b.vy+=(desiredY/dl*sp-b.vy)*Math.min(1,dt*4)
      b.x+=b.vx*dt; b.y+=b.vy*dt
      if(Math.hypot(b.x,b.y)>R-8){const a=Math.atan2(b.y,b.x);b.x=Math.cos(a)*(R-8);b.y=Math.sin(a)*(R-8)}
      b.heading=Math.atan2(b.vy,b.vx)
      b.energy-=(moving?1.55:0.6)*eUse*(0.75+b.speedFactor*0.35)*dt // moving uses energy
    }
    // reproduction costs stored energy -> cannot grow for free
    const thresh=isBlue?p.blueCopy:p.redCopy
    if(b.energy>=thresh&&b.reproCooldown<=0&&sim.blobs.length+toAdd.length<110){
      const cost=thresh*0.58; b.energy-=cost; b.reproCooldown=4
      const child=makeBlob(b.type,b.x+(sim.rng()-0.5)*14,b.y+(sim.rng()-0.5)*14,sim.rng,b)
      child.energy=cost*0.88; toAdd.push(child); sim.births++; burst(sim,b.x,b.y,isBlue?'#7db8ff':'#ff9a8a')
    }
  }
  sim.blobs.push(...toAdd)
  const before=sim.blobs.length
  sim.blobs=sim.blobs.filter(b=>{if(b.energy<=0){burst(sim,b.x,b.y,'#d8d8c8');return false}return true})
  sim.deaths+=before-sim.blobs.length
  for(const pt of sim.particles){pt.x+=pt.vx*dt;pt.y+=pt.vy*dt;pt.life-=dt}
  sim.particles=sim.particles.filter(pt=>pt.life>0)
  sim.histTimer-=dt
  if(sim.histTimer<=0){
    sim.histTimer=0.6
    const bl=sim.blobs.filter(b=>b.type==='blue'), rd=sim.blobs.filter(b=>b.type==='red')
    const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0
    sim.history.push({t:+sim.time.toFixed(1),fruit:Math.round(sim.trees.reduce((s,t)=>s+t.fruit,0)),blue:bl.length,red:rd.length,
      bSpeed:+avg(bl.map(b=>b.speedFactor)).toFixed(3),bVision:+avg(bl.map(b=>b.visionFactor)).toFixed(3),
      rSpeed:+avg(rd.map(b=>b.speedFactor)).toFixed(3),rVision:+avg(rd.map(b=>b.visionFactor)).toFixed(3),
      bEnergy:+avg(bl.map(b=>b.energy)).toFixed(1),rEnergy:+avg(rd.map(b=>b.energy)).toFixed(1)})
    if(sim.history.length>900)sim.history.shift()
  }
}
function burst(sim,x,y,color){for(let i=0;i<7;i++){const a=Math.random()*Math.PI*2;sim.particles.push({x,y,vx:Math.cos(a)*(8+Math.random()*18),vy:Math.sin(a)*(8+Math.random()*18)-6,life:0.55,color})}}

function drawWorld(ctx,sim,p,selectedId,W,H){
  ctx.clearRect(0,0,W,H)
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#cfeaf7'); g.addColorStop(1,'#eaf6e8'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H)
  const cx=W/2, cy=H/2+14
  const pixR=clamp(p.worldSize*2.7,200,300)
  const tilt=0.62, scale=pixR/p.worldSize
  const rot=sim.rot, cos=Math.cos(rot), sin=Math.sin(rot)
  const proj=(x,y)=>{const xr=x*cos-y*sin, yr=x*sin+y*cos; return {x:cx+xr*scale, y:cy+yr*scale*tilt, yr}}
  // dish shadow + rim
  ctx.fillStyle='rgba(70,90,50,.18)'; ctx.beginPath(); ctx.ellipse(cx,cy+pixR*tilt*0.92+18,pixR*1.04,pixR*0.20,0,0,Math.PI*2); ctx.fill()
  ctx.fillStyle='#8a6844'; ctx.beginPath(); ctx.ellipse(cx,cy+8,pixR+14,(pixR+14)*tilt,0,0,Math.PI*2); ctx.fill()
  ctx.fillStyle='#a67c52'; ctx.beginPath(); ctx.ellipse(cx,cy,pixR+8,(pixR+8)*tilt,0,0,Math.PI*2); ctx.fill()
  ctx.fillStyle='#8fbf6b'; ctx.beginPath(); ctx.ellipse(cx,cy-4,pixR,pixR*tilt,0,0,Math.PI*2); ctx.fill()
  ctx.fillStyle='#9ccc74'; ctx.beginPath(); ctx.ellipse(cx,cy-10,pixR*0.82,pixR*0.82*tilt,0,0,Math.PI*2); ctx.fill()
  // grass speckles
  ctx.fillStyle='rgba(70,140,60,.22)'
  for(let i=0;i<70;i++){const a=i*2.39, rr=((i*47)%90)/100*pixR*0.92; const pt=proj(Math.cos(a)*rr* (p.worldSize/100),Math.sin(a)*rr*(p.worldSize/100)); ctx.beginPath(); ctx.ellipse(pt.x,pt.y,3,1.6,0,0,Math.PI*2); ctx.fill()}
  // rotation hint ring
  ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.setLineDash([4,7]); ctx.beginPath(); ctx.ellipse(cx,cy-4,pixR-5,(pixR-5)*tilt,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([])
  const items=[]
  for(const t of sim.trees)items.push({kind:'tree',o:t,...proj(t.x,t.y)})
  for(const b of sim.blobs){const pt=proj(b.x,b.y); b.sx=pt.x; b.sy=pt.y-10; b.sr=15; items.push({kind:'blob',o:b,...pt})}
  items.sort((a,b)=>a.yr-b.yr)
  for(const it of items){
    if(it.kind==='tree'){
      const t=it.o, x=it.x, y=it.y
      ctx.fillStyle='rgba(60,80,40,.25)'; ctx.beginPath(); ctx.ellipse(x,y+4,20,6,0,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='#7a4f2a'; ctx.fillRect(x-3,y-14,6,16)
      ctx.fillStyle='#3e8e3a'; ctx.beginPath(); ctx.arc(x,y-24,20,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='#4fa84a'; ctx.beginPath(); ctx.arc(x-13,y-17,13,0,Math.PI*2); ctx.arc(x+13,y-17,13,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='rgba(255,255,255,.18)'; ctx.beginPath(); ctx.arc(x-7,y-30,7,0,Math.PI*2); ctx.fill()
      const n=Math.floor(t.fruit)
      t.slots.slice(0,Math.max(p.fruitLimit,n)).forEach((s,i)=>{
        const fx=x+s.dx, fy=y-18+s.dy
        if(i<n){ctx.fillStyle='#69c24a'; ctx.beginPath(); ctx.arc(fx,fy,4.6,0,Math.PI*2); ctx.fill(); ctx.fillStyle='rgba(255,255,255,.75)'; ctx.beginPath(); ctx.arc(fx-1.5,fy-1.5,1.4,0,Math.PI*2); ctx.fill()}
        else{ctx.strokeStyle='rgba(40,90,30,.28)'; ctx.beginPath(); ctx.arc(fx,fy,3.6,0,Math.PI*2); ctx.stroke()}
      })
      if(t.delay>0){ctx.fillStyle='rgba(90,110,70,.75)'; ctx.font='700 9px Nunito,sans-serif'; ctx.fillText('growing…',x-16,y+16)}
    }else{
      const b=it.o, x=it.x, y=it.y
      const isBlue=b.type==='blue'
      const bounceY=Math.abs(Math.sin(b.bounce))* -3
      const squash=1+Math.sin(b.bounce)*0.07
      const lean=clamp(b.vx*0.004,-0.18,0.18)
      ctx.fillStyle='rgba(50,70,40,.24)'; ctx.beginPath(); ctx.ellipse(x,y+5,14,4.5,0,0,Math.PI*2); ctx.fill()
      ctx.save(); ctx.translate(x,y-11+bounceY); ctx.rotate(lean); ctx.scale(1/squash,squash)
      if(b.id===selectedId){ctx.strokeStyle='#ffcf3f'; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(0,0,17,15,0,0,Math.PI*2); ctx.stroke()}
      const grad=ctx.createRadialGradient(-5,-7,2,0,0,18); grad.addColorStop(0,isBlue?'#bfe0ff':( '#ffd2c2')); grad.addColorStop(0.35,isBlue?'#5aa7ff':'#ff7a66'); grad.addColorStop(1,isBlue?'#256fd6':'#d63a2e')
      ctx.fillStyle=grad; ctx.beginPath(); ctx.ellipse(0,0,13.5,12.5,0,0,Math.PI*2); ctx.fill()
      ctx.fillStyle='rgba(255,255,255,.65)'; ctx.beginPath(); ctx.ellipse(-5,-6,4.2,2.6,-0.5,0,Math.PI*2); ctx.fill()
      // face
      const blink=b.blink<0, lookX=clamp(b.vx*0.04,-2,2), lookY=clamp(b.vy*0.03,-1.5,1.5)
      ctx.fillStyle='#1e2b1a'
      if(blink){ctx.fillRect(-6.5,-2.5,4,1.4); ctx.fillRect(2.5,-2.5,4,1.4)}
      else{ctx.beginPath(); ctx.arc(-4.5+lookX,-2+lookY,1.9,0,Math.PI*2); ctx.arc(4.5+lookX,-2+lookY,1.9,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-5+lookX,-2.7+lookY,0.7,0,Math.PI*2); ctx.arc(4+lookX,-2.7+lookY,0.7,0,Math.PI*2); ctx.fill()}
      ctx.strokeStyle='#20301e'; ctx.lineWidth=1.4; ctx.beginPath()
      if(b.state==='eat'){const o=2+Math.abs(Math.sin(b.bounce*2))*2; ctx.arc(0,3.5,o,0,Math.PI*2)}
      else if(b.state==='pause'){ctx.arc(0,2.5,3.4,0.15*Math.PI,0.85*Math.PI)}
      else if(b.energy<25){ctx.arc(0,6,2.6,1.15*Math.PI,1.85*Math.PI)}
      else ctx.arc(0,2.2,3.2,0.15*Math.PI,0.85*Math.PI)
      ctx.stroke()
      if(b.invuln>0&&isBlue){ctx.strokeStyle='rgba(255,210,60,.8)'; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.ellipse(0,0,16,14,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([])}
      ctx.restore()
      if(b.id===selectedId||b.energy<26){ctx.fillStyle='rgba(255,255,255,.85)'; ctx.fillRect(x-14,y-34,28,5); ctx.fillStyle=isBlue?'#2f7de1':'#e84a3a'; ctx.fillRect(x-14,y-34,28*clamp(b.energy,0,100)/100,5)}
      if(b.state==='eat'||b.state==='pause'){ctx.font='11px sans-serif'; ctx.fillText(b.state==='eat'?'🍏':'✦',x+10,y-30)}
    }
  }
  for(const pt of sim.particles){const sp=proj(pt.x,pt.y); ctx.globalAlpha=clamp(pt.life*1.8,0,1); ctx.fillStyle=pt.color; ctx.beginPath(); ctx.arc(sp.x,sp.y-12,2.6,0,Math.PI*2); ctx.fill()}
  ctx.globalAlpha=1
}

function Chart({history}){
  const w=560,h=190,pad=30
  if(history.length<2)return <p className="hint">Press Play — data will appear here from the live simulation.</p>
  const maxV=Math.max(20,...history.map(d=>Math.max(d.fruit,d.blue,d.red)))*1.12
  const maxT=Math.max(10,history[history.length-1].t)
  const pts=(k)=>history.map(d=>`${(pad+d.t/maxT*(w-pad-8)).toFixed(1)},${(h-22-d[k]/maxV*(h-42)).toFixed(1)}`).join(' ')
  return <svg viewBox={`0 0 ${w} ${h}`} style={{width:'100%',height:'auto'}} role="img" aria-label="Population and fruit over time">
    {[0,0.5,1].map(f=><g key={f}><line x1={pad} x2={w-8} y1={22+f*(h-44)} y2={22+f*(h-44)} stroke="#e2ead6"/><text x={4} y={26+f*(h-44)} fontSize="10" fill="#7a8a6e">{Math.round(maxV*(1-f))}</text></g>)}
    <polyline points={pts('fruit')} fill="none" stroke="#58a832" strokeWidth="2.5"/>
    <polyline points={pts('blue')} fill="none" stroke="#2f7de1" strokeWidth="2.5"/>
    <polyline points={pts('red')} fill="none" stroke="#e84a3a" strokeWidth="2.5"/>
    <text x={w-70} y={h-4} fontSize="10" fill="#7a8a6e">{maxT.toFixed(0)}s →</text>
  </svg>
}
function Phase({history}){
  const w=280,h=190,pad=26
  if(history.length<2)return <p className="hint">The phase plot traces blue (x) against red (y) as the garden cycles.</p>
  const maxV=Math.max(15,...history.map(d=>Math.max(d.blue,d.red)))*1.15
  const pts=history.map(d=>`${(pad+d.blue/maxV*(w-pad-10)).toFixed(1)},${(h-22-d.red/maxV*(h-42)).toFixed(1)}`).join(' ')
  const last=history[history.length-1]
  return <svg viewBox={`0 0 ${w} ${h}`} style={{width:'100%',height:'auto'}} role="img" aria-label="Blue versus red phase plot">
    <line x1={pad} x2={w-10} y1={h-22} y2={h-22} stroke="#cbd8bd"/><line x1={pad} x2={pad} y1={10} y2={h-22} stroke="#cbd8bd"/>
    <text x={w-70} y={h-6} fontSize="10" fill="#2f7de1" fontWeight="700">blue →</text><text x={2} y={14} fontSize="10" fill="#e84a3a" fontWeight="700">red ↑</text>
    <polyline points={pts} fill="none" stroke="#8a9a7a" strokeWidth="1.6" opacity="0.75"/>
    <circle cx={pad+last.blue/maxV*(w-pad-10)} cy={h-22-last.red/maxV*(h-42)} r="5" fill="#ffcf3f" stroke="#8a6d00" strokeWidth="1.5"/>
  </svg>
}
function TraitChart({history}){
  const w=280,h=150,pad=26
  if(history.length<2)return <p className="hint">Inherited speed and vision averages appear once blobs reproduce.</p>
  const maxT=Math.max(10,history[history.length-1].t)
  const Y=v=>h-20-((v-0.7)/0.7)*(h-36)
  const pts=k=>history.map(d=>`${(pad+d.t/maxT*(w-pad-8)).toFixed(1)},${Y(d[k]).toFixed(1)}`).join(' ')
  return <svg viewBox={`0 0 ${w} ${h}`} style={{width:'100%',height:'auto'}} role="img" aria-label="Trait trends over time">
    <line x1={pad} x2={w-8} y1={Y(1)} y2={Y(1)} stroke="#e2ead6"/><text x={2} y={Y(1)+3} fontSize="9" fill="#7a8a6e">1.0×</text>
    <polyline points={pts('bSpeed')} fill="none" stroke="#2f7de1" strokeWidth="2"/><polyline points={pts('bVision')} fill="none" stroke="#2f7de1" strokeWidth="1.4" strokeDasharray="4 3"/>
    <polyline points={pts('rSpeed')} fill="none" stroke="#e84a3a" strokeWidth="2"/><polyline points={pts('rVision')} fill="none" stroke="#e84a3a" strokeWidth="1.4" strokeDasharray="4 3"/>
  </svg>
}
function Slider({label,value,min,max,step,onChange,fmt}){
  return <div className="slider"><div className="sliderTop"><span>{label}</span><span>{fmt?fmt(value):value}</span></div>
  <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)} aria-label={label}/></div>
}
function summarize(history,sim){
  if(!sim||history.length<4)return 'Run the garden for a while and the story of this run will be written here.'
  const last=history[history.length-1]
  const peakBlue=Math.max(...history.map(d=>d.blue)), peakRed=Math.max(...history.map(d=>d.red))
  const tBlue=history.find(d=>d.blue===peakBlue)?.t, tRed=history.find(d=>d.red===peakRed)?.t
  const avgFruit=history.reduce((s,d)=>s+d.fruit,0)/history.length
  let lead='The garden stayed balanced, with blue and red blobs rising and falling around each other.'
  if(last.blue===0&&last.red===0)lead='Both groups faded and the garden fell quiet — fruit alone remains.'
  else if(last.blue===0)lead='Blue blobs faded first, and without them the red blobs have lost their energy source.'
  else if(last.red===0)lead='Red blobs faded and the world settled into a simpler state of fruit and blue blobs.'
  else if(peakRed>peakBlue*1.2)lead='Red blobs surged past the blue group — watch for a blue dip, then a red fade to follow.'
  let order=(tRed>tBlue+3)?'Blue blobs grew first, then red blobs followed — the classic out-of-phase wave.':(tBlue>tRed+3?'Red blobs peaked early, before the blue group built up.':'Both groups peaked close together.')
  let fruitNote=avgFruit<12?'Low fruit kept the garden small, limiting how large either group could grow.':avgFruit>45?'Plentiful fruit supported a large, busy garden.':'Fruit supply was moderate, keeping growth in check.'
  return `${lead} ${order} ${fruitNote}`
}

export default function App(){
  const [params,setParams]=useState(DEFAULTS)
  const [playing,setPlaying]=useState(true)
  const [selectedId,setSelectedId]=useState(null)
  const [snap,setSnap]=useState({blue:0,red:0,fruit:0,time:0,births:0,deaths:0,eaten:0,contacts:0})
  const [history,setHistory]=useState([])
  const [selected,setSelected]=useState(null)
  const paramsRef=useRef(params); paramsRef.current=params
  const playingRef=useRef(playing); playingRef.current=playing
  const selectedRef=useRef(selectedId); selectedRef.current=selectedId
  const simRef=useRef(null); if(!simRef.current)simRef.current=createSim(DEFAULTS)
  const canvasRef=useRef(null)
  const dragRef=useRef(null)

  const reset=useCallback((p=paramsRef.current)=>{simRef.current=createSim(p); setSelectedId(null); setHistory([])},[])
  const setP=(k,v)=>setParams(prev=>({...prev,[k]:v}))

  useEffect(()=>{
    let raf, last=performance.now()
    const loop=(now)=>{
      const raw=Math.min(0.05,(now-last)/1000); last=now
      const sim=simRef.current, p=paramsRef.current
      if(playingRef.current){
        let remaining=raw*p.simSpeed
        while(remaining>0){const dt=Math.min(0.033,remaining); stepSim(sim,p,dt); remaining-=dt}
      }
      const cv=canvasRef.current
      if(cv){const ctx=cv.getContext('2d'); drawWorld(ctx,sim,p,selectedRef.current,cv.width,cv.height)}
      raf=requestAnimationFrame(loop)
    }
    raf=requestAnimationFrame(loop)
    const iv=setInterval(()=>{
      const sim=simRef.current
      const blue=sim.blobs.filter(b=>b.type==='blue').length, red=sim.blobs.length-blue
      setSnap({blue,red,fruit:Math.round(sim.trees.reduce((s,t)=>s+t.fruit,0)),time:sim.time,births:sim.births,deaths:sim.deaths,eaten:sim.eatenTotal,contacts:sim.contactsTotal})
      setHistory([...sim.history])
      const sel=sim.blobs.find(b=>b.id===selectedRef.current)
      setSelected(sel?{id:sel.id,type:sel.type,energy:sel.energy,age:sel.age,state:sel.state,stateTimer:sel.stateTimer,speed:(sel.type==='blue'?paramsRef.current.blueSpeed:paramsRef.current.redSpeed)*sel.speedFactor,vision:(sel.type==='blue'?paramsRef.current.blueVision:paramsRef.current.redVision)*sel.visionFactor,speedFactor:sel.speedFactor,visionFactor:sel.visionFactor,generation:sel.generation,parentId:sel.parentId,eaten:sel.eaten,contacts:sel.contacts,invuln:sel.invuln}:null)
    },240)
    return ()=>{cancelAnimationFrame(raf); clearInterval(iv)}
  },[])

  const onPointerDown=e=>{dragRef.current={x:e.clientX,rot:simRef.current.rot,moved:false}}
  const onPointerMove=e=>{if(!dragRef.current)return; const dx=e.clientX-dragRef.current.x; if(Math.abs(dx)>4)dragRef.current.moved=true; simRef.current.rot=dragRef.current.rot+dx*0.008}
  const onPointerUp=e=>{
    const wasDrag=dragRef.current?.moved; dragRef.current=null
    if(wasDrag)return
    const cv=canvasRef.current, rect=cv.getBoundingClientRect()
    const mx=(e.clientX-rect.left)*(cv.width/rect.width), my=(e.clientY-rect.top)*(cv.height/rect.height)
    let best=null,bd=30
    for(const b of simRef.current.blobs){const d=Math.hypot(b.sx-mx,b.sy-my); if(d<bd){bd=d;best=b}}
    setSelectedId(best?best.id:null)
  }
  const doStep=()=>{const sim=simRef.current,p=paramsRef.current; for(let i=0;i<18;i++)stepSim(sim,p,1/30)}
  const randomize=()=>{
    const r=(a,b)=>+(a+Math.random()*(b-a)).toFixed(2)
    const np={...params,fruitGrowth:r(0.3,2.8),fruitLimit:Math.round(r(3,10)),fruitDelay:r(1,9),blueEnergyUse:r(0.6,1.8),blueSpeed:Math.round(r(24,48)),blueVision:Math.round(r(60,140)),blueCopy:Math.round(r(68,90)),blueEatTime:r(0.6,2.2),redEnergyUse:r(0.6,1.8),redSpeed:Math.round(r(26,50)),redVision:Math.round(r(70,150)),redContact:Math.round(r(10,28)),redCopy:Math.round(r(68,92)),redPause:r(0.8,2.6),seed:Math.floor(Math.random()*9999)}
    setParams(np); setTimeout(()=>reset(np),30)
  }
  const applyPreset=(key)=>{const np={...PRESETS[key]}; delete np.label; setParams(np); setTimeout(()=>reset(np),30); setPlaying(true)}

  return <div className="app">
    <header className="header">
      <div><h1>Muse Code powered by muse-wonder-1.0</h1><p>A tiny living garden: green fruit feeds blue blobs, gentle contact feeds red blobs, and every birth costs stored energy — so the three groups rise and fall in real waves. Drag the dish to spin it, click any blob to meet it.</p></div>
      <div className="pills">
        <span className="pill"><span className="dot" style={{background:'#58a832'}}/>Fruit <b>{snap.fruit}</b></span>
        <span className="pill"><span className="dot" style={{background:'#2f7de1'}}/>Blue <b>{snap.blue}</b></span>
        <span className="pill"><span className="dot" style={{background:'#e84a3a'}}/>Red <b>{snap.red}</b></span>
        <span className="pill">⏱ {snap.time.toFixed(0)}s</span>
      </div>
    </header>

    <div className="layout">
      <section className="card">
        <h2>🌱 The Garden Dish</h2>
        <p className="hint">Drag to rotate · click a blob to inspect · blue blobs chew fruit on the trees, red blobs pause after a gentle boop. Fruit slots empty when eaten and refill after the return delay.</p>
        <div className="worldWrap">
          <canvas ref={canvasRef} className="world" width={720} height={560} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} aria-label="Living garden world"/>
        </div>
        <div className="toolbar">
          <button className="btn primary" onClick={()=>setPlaying(!playing)}>{playing?'⏸ Pause':'▶ Play'}</button>
          <button className="btn" onClick={doStep}>⏭ Step</button>
          <button className="btn" onClick={()=>reset()}>↺ Reset</button>
          <button className="btn warn" onClick={randomize}>🎲 Randomize</button>
          <span className="pill">Births {snap.births} · Deaths {snap.deaths}</span>
          <span className="pill">Fruit eaten {snap.eaten} · Boops {snap.contacts}</span>
        </div>
        <div className="presets" aria-label="Presets">
          {Object.entries(PRESETS).map(([k,v])=><button key={k} className="preset" onClick={()=>applyPreset(k)}>{v.label}</button>)}
        </div>
        <div className="statGrid">
          <div className="stat"><small>Fruit now</small><b>{snap.fruit}</b></div>
          <div className="stat"><small>Blue blobs</small><b>{snap.blue}</b></div>
          <div className="stat"><small>Red blobs</small><b>{snap.red}</b></div>
        </div>
      </section>

      <aside className="card controls">
        <h2>🎛 Tune the Garden</h2>
        <p className="hint">Most sliders act live. Starting counts, world size and seed apply on Reset (or pick a preset).</p>
        <h3>Fruit</h3>
        <Slider label="Fruit growth speed" value={params.fruitGrowth} min={0.1} max={3} step={0.05} onChange={v=>setP('fruitGrowth',v)} fmt={v=>v.toFixed(2)+'×'}/>
        <Slider label="Fruit limit / tree" value={params.fruitLimit} min={1} max={12} step={1} onChange={v=>setP('fruitLimit',v)}/>
        <Slider label="Fruit return delay" value={params.fruitDelay} min={0} max={12} step={0.5} onChange={v=>setP('fruitDelay',v)} fmt={v=>v.toFixed(1)+'s'}/>
        <h3>Blue blobs — fruit eaters</h3>
        <Slider label="Blue energy use" value={params.blueEnergyUse} min={0.3} max={2.5} step={0.05} onChange={v=>setP('blueEnergyUse',v)} fmt={v=>v.toFixed(2)+'×'}/>
        <Slider label="Blue speed" value={params.blueSpeed} min={15} max={60} step={1} onChange={v=>setP('blueSpeed',v)}/>
        <Slider label="Blue vision" value={params.blueVision} min={40} max={180} step={5} onChange={v=>setP('blueVision',v)}/>
        <Slider label="Blue copy threshold" value={params.blueCopy} min={55} max={98} step={1} onChange={v=>setP('blueCopy',v)} fmt={v=>v+' energy'}/>
        <Slider label="Blue eating time" value={params.blueEatTime} min={0.4} max={3} step={0.1} onChange={v=>setP('blueEatTime',v)} fmt={v=>v.toFixed(1)+'s'}/>
        <h3>Red blobs — gentle boopers</h3>
        <Slider label="Red energy use" value={params.redEnergyUse} min={0.3} max={2.5} step={0.05} onChange={v=>setP('redEnergyUse',v)} fmt={v=>v.toFixed(2)+'×'}/>
        <Slider label="Red speed" value={params.redSpeed} min={15} max={60} step={1} onChange={v=>setP('redSpeed',v)}/>
        <Slider label="Red vision" value={params.redVision} min={40} max={180} step={5} onChange={v=>setP('redVision',v)}/>
        <Slider label="Red contact strength" value={params.redContact} min={6} max={34} step={1} onChange={v=>setP('redContact',v)}/>
        <Slider label="Red copy threshold" value={params.redCopy} min={55} max={98} step={1} onChange={v=>setP('redCopy',v)} fmt={v=>v+' energy'}/>
        <Slider label="Red pause time" value={params.redPause} min={0.4} max={3.5} step={0.1} onChange={v=>setP('redPause',v)} fmt={v=>v.toFixed(1)+'s'}/>
        <h3>World &amp; start</h3>
        <Slider label="Starting fruit trees" value={params.startTrees} min={3} max={16} step={1} onChange={v=>setP('startTrees',v)}/>
        <Slider label="Starting blue blobs" value={params.startBlue} min={0} max={30} step={1} onChange={v=>setP('startBlue',v)}/>
        <Slider label="Starting red blobs" value={params.startRed} min={0} max={24} step={1} onChange={v=>setP('startRed',v)}/>
        <Slider label="World size" value={params.worldSize} min={70} max={130} step={5} onChange={v=>setP('worldSize',v)}/>
        <Slider label="Simulation speed" value={params.simSpeed} min={0.25} max={3.5} step={0.25} onChange={v=>setP('simSpeed',v)} fmt={v=>v.toFixed(2)+'×'}/>
        <div className="seedRow"><label style={{fontSize:12.5,fontWeight:800}}>Random seed</label><input type="number" value={params.seed} onChange={e=>setP('seed',+e.target.value||0)} aria-label="Random seed"/><button className="btn" onClick={()=>reset()}>Apply &amp; Reset</button></div>
        <p className="hint">Try this: crank fruit growth and watch blues boom, then reds follow; then slide fruit growth to minimum and see the whole garden stay small.</p>
      </aside>
    </div>

    <div className="bottom">
      <section className="card">
        <h2>📈 Garden Story — Fruit, Blue &amp; Red</h2>
        <div className="legend"><span style={{color:'#58a832'}}>— Fruit</span><span style={{color:'#2f7de1'}}>— Blue blobs</span><span style={{color:'#e84a3a'}}>— Red blobs</span></div>
        <Chart history={history}/>
        <div className="summary"><span className="badge">Run summary</span><p>{summarize(history,simRef.current)}</p>
        <p className="hint">Peaks: blue {history.length?Math.max(...history.map(d=>d.blue)):0} · red {history.length?Math.max(...history.map(d=>d.red)):0} · fruit {history.length?Math.max(...history.map(d=>d.fruit)):0}. All curves are recorded live from the energy simulation — nothing is scripted.</p></div>
      </section>
      <section className="card">
        <h2>🌀 Blue-vs-Red Phase</h2>
        <p className="hint">Loops mean the groups chase each other out of phase. A line collapsing to an axis means one group faded.</p>
        <Phase history={history}/>
        <h3>Trait trends (inherited)</h3>
        <TraitChart history={history}/>
        <div className="legend"><span style={{color:'#2f7de1'}}>— blue speed · ┄ vision</span><span style={{color:'#e84a3a'}}>— red speed · ┄ vision</span></div>
        <p className="hint">Children inherit speed/vision with small mutations, so these averages drift as fitter lineages spread.</p>
      </section>
      <section className="card">
        <h2>🔍 Blob Inspector</h2>
        {!selected ? <div className="inspectorEmpty">Click any blue or red blob in the dish to see its energy, age, current action, traits and family. Selected blobs get a yellow ring and an energy bar.</div> :
        <div>
          <span className="badge" style={{background:selected.type==='blue'?'#dbeafe':'#ffe0d6'}}>{selected.type==='blue'?'🔵 Blue blob':'🔴 Red blob'} #{selected.id}</span>
          <div className={selected.type==='blue'?'bar':'bar red'}><i style={{width:clamp(selected.energy,0,100)+'%'}}/></div>
          <dl className="kv">
            <dt>Energy</dt><dd>{selected.energy.toFixed(1)} / 100</dd>
            <dt>Age</dt><dd>{selected.age.toFixed(1)}s</dd>
            <dt>Current action</dt><dd>{selected.state}{selected.state==='eat'?' (chewing 🍏)':selected.state==='pause'?' (happy pause ✦)':''}</dd>
            <dt>Action time left</dt><dd>{(selected.state==='eat'||selected.state==='pause')?Math.max(0,selected.stateTimer).toFixed(2)+'s':'—'}</dd>
            <dt>Speed</dt><dd>{selected.speed.toFixed(1)} (trait {selected.speedFactor.toFixed(2)}×)</dd>
            <dt>Sensing range</dt><dd>{selected.vision.toFixed(0)} (trait {selected.visionFactor.toFixed(2)}×)</dd>
            <dt>Generation</dt><dd>Gen {selected.generation}{selected.parentId?` · parent #${selected.parentId}`:' · founder'}</dd>
            <dt>Lifetime</dt><dd>{selected.type==='blue'?`Fruit eaten: ${selected.eaten}`:`Gentle boops: ${selected.contacts}`}{selected.invuln>0?` · shield ${selected.invuln.toFixed(1)}s`:''}</dd>
          </dl>
          <p className="hint">{selected.type==='blue'?'Blue blobs gain +40 energy per fruit, lose energy by moving, flee red blobs, shelter near trees, and spend energy to copy themselves.':'Red blobs gain energy from gentle contact with blue blobs, then must pause — so they cannot boop again instantly.'}</p>
        </div>}
        <h3>How the waves happen</h3>
        <p className="summary">More fruit → blue energy rises → blues copy → more targets for reds → reds copy → blue energy is drained by boops → blues fall → reds run low and fade → fruit recovers → the cycle turns again. Reproduction costs the parent stored energy, and populations level out when fruit or blue prey run short.</p>
      </section>
    </div>
  </div>
}


