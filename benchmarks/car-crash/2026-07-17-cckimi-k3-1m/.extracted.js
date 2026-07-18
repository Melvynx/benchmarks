'use strict';
/* ============================================================================
   Kimi K3 1M — 2D crash-test sandbox
   Custom impulse-based rigid body engine (oriented boxes, sequential impulses,
   warm starting, Baumgarte stabilization, deterministic sleeping).
   ==========================================================================*/

/* ---------------- tiny utils ---------------- */
const clamp = (v,a,b)=> v<a ? a : (v>b ? b : v);
function mulberry32(seed){ let a = seed>>>0; return function(){
  a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a>>>15, 1 | a);
  t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t;
  return ((t ^ t>>>14) >>> 0) / 4294967296; }; }
function hash01(n){ n = Math.imul(n|0, 2654435761); n ^= n>>>13; n = Math.imul(n, 2246822519);
  return ((n ^ n>>>16) >>> 0) / 4294967296; }

/* ---------------- experiment parameters ---------------- */
const DEFAULTS = Object.freeze({
  carSpeed:22, cols:12, rows:8, layers:2, brickMass:2.5,
  brickW:0.50, brickH:0.24, gravity:9.81,
  brickFriction:0.72, brickRestitution:0.18,
  carMass:1250, carW:4.2, carH:1.45, groundFriction:0.85, scale:80
});
const RANGES = {
  carSpeed:{label:'Car speed',       min:5,  max:45, step:0.5, unit:'m/s'},
  cols:    {label:'Wall columns',    min:4,  max:24, step:1,   unit:''},
  rows:    {label:'Wall rows',       min:3,  max:16, step:1,   unit:''},
  layers:  {label:'Wall depth layers',min:1, max:5,  step:1,   unit:''},
  brickMass:{label:'Brick mass',     min:0.5,max:12, step:0.1, unit:'kg'}
};
let params = Object.assign({}, DEFAULTS);

/* ---------------- solver constants ---------------- */
const SLOP=0.004, BETA=0.2, BIAS_MAX=6, REST_VEL=0.8;
const ENGINE_ACC=11, CRUISE_DIST=6;
const WAKE_DV=0.35, WAKE_VN=1.2;
const SLEEP_MOTION=0.22, SLEEP_TIME=0.5, CLAMP_V=0.03, CLAMP_W=0.08;
const ROLL_MU=0.03, AABB_MARGIN=0.012, MAX_RUN_T=45;

/* ============================================================================
   World construction — deterministic, no randomness anywhere.
   ==========================================================================*/
let nextId = 1;
function makeBody(o){
  const m = o.mass || 0;
  const w = o.hw*2, h = o.hh*2;
  const I = m>0 ? m*(w*w+h*h)/12 : 0;
  return { id:o.id, kind:o.kind, x:o.x, y:o.y, a:o.a||0, vx:0, vy:0, w:0,
    hw:o.hw, hh:o.hh, invM: m>0 ? 1/m : 0, invI: I>0 ? 1/I : 0, mass:m,
    mu:o.mu, rest:o.rest, layer:o.layer||0,
    asleep:false, sleepT:0, touched:false, onGround:false,
    nbrs:[], nbrsNew:[], _fin:[],
    ix:o.x, iy:o.y, fill:o.fill||'#b3563f', half:!!o.half };
}

function buildWorld(p){
  nextId = 2;   /* ids must equal array indices: 0=ground, 1=car, 2..=bricks */
  const bodies=[], bricks=[];
  const nBricksGuess = p.cols*p.rows*p.layers + 16;
  const dt    = nBricksGuess <= 560 ? 1/240 : 1/120;
  const iters = nBricksGuess <= 560 ? 10 : 8;

  /* scene geometry */
  const carX0 = 1.0 + p.carW/2;                       // car centre, rear bumper at x=1
  const runup = (p.carSpeed*p.carSpeed)/(2*ENGINE_ACC) + CRUISE_DIST;
  const wallFront = carX0 + p.carW/2 + runup;         // front face of layer 0
  const gapX = 0.005, gapL = 0.004;
  const layerPitch = p.brickW + gapL;
  const wallThick = p.layers*p.brickW + (p.layers-1)*gapL;
  const wallH = p.rows * p.brickH;
  const sceneLen = wallFront + wallThick + 26;

  /* ground as a static box, top surface exactly y=0 */
  const ground = makeBody({id:0, kind:'ground', x:sceneLen/2 - 10, y:-5,
    hw:sceneLen/2 + 60, hh:5, mass:0, mu:p.groundFriction, rest:0.02});
  bodies.push(ground);

  /* car */
  const car = makeBody({id:1, kind:'car', x:carX0, y:p.carH/2 + 0.001,
    hw:p.carW/2, hh:p.carH/2, mass:p.carMass, mu:0.5, rest:0.1});
  car.asleep = true;
  bodies.push(car);

  /* brick wall — running bond, odd rows offset half a brick with half
     bricks closing both ends; rows bedded flush (mortar drawn, not gapped) */
  const halfW = p.brickW/2 - gapX/2;
  for (let L=0; L<p.layers; L++){
    const Lx = wallFront + L*layerPitch;
    for (let r=0; r<p.rows; r++){
      const y = p.brickH/2 + r*p.brickH;
      const odd = (r & 1) === 1;
      const shade = 1 - 0.07*L;
      const put = (cx, hw, mass, half)=>{
        const h01 = hash01(nextId*7+3);
        const li = Math.round((40 + h01*11) * shade);
        const sa = Math.round(50 + h01*9);
        const b = makeBody({id:nextId, kind:'brick', x:cx, y, a:0,
          hw, hh:p.brickH/2, mass, mu:p.brickFriction, rest:p.brickRestitution,
          layer:L, half, fill:`hsl(${14+h01*8},${sa}%,${li}%)`});
        b.asleep = true;
        nextId++; bodies.push(b); bricks.push(b);
      };
      if (!odd){
        for (let c=0; c<p.cols; c++)
          put(Lx + p.brickW/2 + c*(p.brickW+gapX), p.brickW/2, p.brickMass, false);
      } else {
        put(Lx + halfW/2, halfW/2, p.brickMass*(halfW/p.brickW), true);
        for (let c=0; c<p.cols-1; c++)
          put(Lx + halfW + gapX + p.brickW/2 + c*(p.brickW+gapX), p.brickW/2, p.brickMass, false);
        put(Lx + halfW + gapX + (p.cols-1)*(p.brickW+gapX) + halfW/2,
            halfW/2, p.brickMass*(halfW/p.brickW), true);
      }
    }
  }

  const w = { p, bodies, bricks, car, ground, dt, iters,
    t:0, stepCount:0, state:'ready', impacted:false, impactSpeed:0,
    braking:false, damage:0, g:p.gravity, acc:ENGINE_ACC,
    wallFront, wallThick, wallH, sceneLen, carX0, startLine:carX0+p.carW/2,
    manifolds:new Map(), frameM:[], pairs:[], order:[],
    events:[], shake:0, shT:0, quietT:0, awakeCount:0, awakeBricks:0 };
  seedNeighbors(w);
  return w;
}

/* one detection pass over every pair (ignoring sleep) to initialise each
   body's neighbour set, so support-loss wake-ups work from frame zero */
function seedNeighbors(w){
  const bs = w.bodies;
  for (let i=0;i<bs.length;i++) bs[i].nbrs.length = 0;
  for (let i=0;i<bs.length;i++){
    const a = bs[i]; aabb(a);
    for (let j=i+1;j<bs.length;j++){
      const b = bs[j]; aabb(b);
      if (a._x1 < b._x0 || b._x1 < a._x0 || a._y1 < b._y0 || b._y1 < a._y0) continue;
      if (a.invM>0) a.nbrs.push(b);
      if (b.invM>0) b.nbrs.push(a);
    }
  }
}

/* ============================================================================
   Collision — SAT for oriented boxes with reference-face clipping
   (Box2D-lite style manifold, feature ids for warm starting).
   ==========================================================================*/
const scratch = { nx:0, ny:0, num:0, c:[{x:0,y:0,sep:0,id:0},{x:0,y:0,sep:0,id:0}] };
const incPts = [{x:0,y:0,id:0},{x:0,y:0,id:0}];
const clipOut = [{x:0,y:0,id:0},{x:0,y:0,id:0}];

function incidentEdge(hw,hh,px,py,R11,R12,R21,R22,nx,ny){
  /* most anti-parallel face, local frame */
  const lx = -(R11*nx + R21*ny), ly = -(R12*nx + R22*ny);
  let v1, v2;
  if (Math.abs(lx) > Math.abs(ly)){
    if (lx >= 0){ v1=0; v2=1; } else { v1=2; v2=3; }
  } else {
    if (ly >= 0){ v1=1; v2=2; } else { v1=3; v2=0; }
  }
  const vxOf = v => (v===0||v===1) ? hw : -hw;
  const vyOf = v => (v===1||v===2) ? hh : -hh;
  const p1x=vxOf(v1), p1y=vyOf(v1), p2x=vxOf(v2), p2y=vyOf(v2);
  incPts[0].x = px + R11*p1x + R12*p1y; incPts[0].y = py + R21*p1x + R22*p1y; incPts[0].id = v1;
  incPts[1].x = px + R11*p2x + R12*p2y; incPts[1].y = py + R21*p2x + R22*p2y; incPts[1].id = v2;
}
function clipSeg(nx,ny,offset){
  /* keep part of incPts with dot(n,p) <= offset; result in clipOut, count returned */
  const d0 = nx*incPts[0].x + ny*incPts[0].y - offset;
  const d1 = nx*incPts[1].x + ny*incPts[1].y - offset;
  let n = 0;
  if (d0 <= 0){ clipOut[n].x=incPts[0].x; clipOut[n].y=incPts[0].y; clipOut[n].id=incPts[0].id; n++; }
  if (d1 <= 0){ clipOut[n].x=incPts[1].x; clipOut[n].y=incPts[1].y; clipOut[n].id=incPts[1].id; n++; }
  if (d0*d1 < 0 && n < 2){
    const t = d0/(d0-d1);
    clipOut[n].x = incPts[0].x + t*(incPts[1].x-incPts[0].x);
    clipOut[n].y = incPts[0].y + t*(incPts[1].y-incPts[0].y);
    clipOut[n].id = (d0 <= 0 ? incPts[0].id : incPts[1].id) | 4;   /* clipped flag keeps ids unique */
    n++;
  }
  /* copy back into incPts for the second clip */
  for (let i=0;i<n;i++){ incPts[i].x=clipOut[i].x; incPts[i].y=clipOut[i].y; incPts[i].id=clipOut[i].id; }
  return n;
}
function collideBoxes(a,b){
  const ca=Math.cos(a.a), sa=Math.sin(a.a), cb=Math.cos(b.a), sb=Math.sin(b.a);
  const RA11=ca, RA12=-sa, RA21=sa, RA22=ca;
  const RB11=cb, RB12=-sb, RB21=sb, RB22=cb;
  const dpx=b.x-a.x, dpy=b.y-a.y;
  const dAx=RA11*dpx+RA21*dpy, dAy=RA12*dpx+RA22*dpy;
  const dBx=RB11*dpx+RB21*dpy, dBy=RB12*dpx+RB22*dpy;
  const RT11=RA11*RB11+RA21*RB21, RT12=RA11*RB12+RA21*RB22;
  const RT21=RA12*RB11+RA22*RB21, RT22=RA12*RB12+RA22*RB22;
  const aT11=Math.abs(RT11), aT12=Math.abs(RT12), aT21=Math.abs(RT21), aT22=Math.abs(RT22);
  const fAx=Math.abs(dAx)-a.hw-(aT11*b.hw+aT12*b.hh);
  const fAy=Math.abs(dAy)-a.hh-(aT21*b.hw+aT22*b.hh);
  if (fAx>0 || fAy>0) return false;
  const fBx=Math.abs(dBx)-(aT11*a.hw+aT21*a.hh)-b.hw;
  const fBy=Math.abs(dBy)-(aT12*a.hw+aT22*a.hh)-b.hh;
  if (fBx>0 || fBy>0) return false;

  let axis=0, sep=fAx;
  let nx = dAx>0 ? RA11 : -RA11, ny = dAx>0 ? RA21 : -RA21;
  if (fAy > 0.95*sep + 0.01*a.hh){ axis=1; sep=fAy; nx = dAy>0?RA12:-RA12; ny = dAy>0?RA22:-RA22; }
  if (fBx > 0.95*sep + 0.01*b.hw){ axis=2; sep=fBx; nx = dBx>0?RB11:-RB11; ny = dBx>0?RB21:-RB21; }
  if (fBy > 0.95*sep + 0.01*b.hh){ axis=3; sep=fBy; nx = dBy>0?RB12:-RB12; ny = dBy>0?RB22:-RB22; }

  let front, sNx, sNy, negS, posS;
  if (axis===0){
    front = nx*a.x + ny*a.y + a.hw; sNx=RA12; sNy=RA22;
    const s = sNx*a.x + sNy*a.y; negS = -s + a.hh; posS = s + a.hh;
    incidentEdge(b.hw,b.hh,b.x,b.y,RB11,RB12,RB21,RB22,nx,ny);
  } else if (axis===1){
    front = nx*a.x + ny*a.y + a.hh; sNx=RA11; sNy=RA21;
    const s = sNx*a.x + sNy*a.y; negS = -s + a.hw; posS = s + a.hw;
    incidentEdge(b.hw,b.hh,b.x,b.y,RB11,RB12,RB21,RB22,nx,ny);
  } else if (axis===2){
    front = nx*b.x + ny*b.y + b.hw; sNx=RB12; sNy=RB22;
    const s = sNx*b.x + sNy*b.y; negS = -s + b.hh; posS = s + b.hh;
    incidentEdge(a.hw,a.hh,a.x,a.y,RA11,RA12,RA21,RA22,nx,ny);
  } else {
    front = nx*b.x + ny*b.y + b.hh; sNx=RB11; sNy=RB21;
    const s = sNx*b.x + sNy*b.y; negS = -s + b.hw; posS = s + b.hw;
    incidentEdge(a.hw,a.hh,a.x,a.y,RA11,RA12,RA21,RA22,nx,ny);
  }
  if (clipSeg(-sNx,-sNy,negS) < 2) return false;
  if (clipSeg( sNx, sNy,posS) < 2) return false;

  scratch.nx=nx; scratch.ny=ny; scratch.num=0;
  for (let i=0;i<2;i++){
    const s = nx*incPts[i].x + ny*incPts[i].y - front;
    if (s <= 0){
      const c = scratch.c[scratch.num];
      c.x=incPts[i].x; c.y=incPts[i].y; c.sep=s; c.id=(axis<<3)|incPts[i].id;
      scratch.num++;
    }
  }
  return scratch.num > 0;
}

/* ---------------- manifolds (persistent, warm-started) ---------------- */
function makeManifold(a,b){
  return { a, b, nx:0, ny:0, num:0, mu:0, e:0, stamp:-1,
    c:[ {x:0,y:0,sep:0,id:-1,Pn:0,Pt:0,PnStart:0,rax:0,ray:0,rbx:0,rby:0,massN:0,massT:0,target:0},
        {x:0,y:0,sep:0,id:-1,Pn:0,Pt:0,PnStart:0,rax:0,ray:0,rbx:0,rby:0,massN:0,massT:0,target:0} ] };
}
function refreshManifold(pm){
  const a=pm.a, b=pm.b;
  if (!collideBoxes(a,b)) return false;
  const o0=PnPt(pm.c[0]), o1=PnPt(pm.c[1]);
  pm.nx=scratch.nx; pm.ny=scratch.ny; pm.num=scratch.num;
  for (let i=0;i<scratch.num;i++){
    const s=scratch.c[i], d=pm.c[i];
    let Pn=0, Pt=0;
    if (o0 && o0.id===s.id){ Pn=o0.Pn; Pt=o0.Pt; }
    else if (o1 && o1.id===s.id){ Pn=o1.Pn; Pt=o1.Pt; }
    d.x=s.x; d.y=s.y; d.sep=s.sep; d.id=s.id; d.Pn=Pn; d.Pt=Pt;
  }
  for (let i=scratch.num;i<2;i++){ pm.c[i].id=-1; pm.c[i].Pn=0; pm.c[i].Pt=0; }
  return true;
}
function PnPt(c){ return c.id===-1 ? null : c; }

/* ============================================================================
   Physics step
   ==========================================================================*/
function aabb(b){
  const c=Math.abs(Math.cos(b.a)), s=Math.abs(Math.sin(b.a));
  const ex = c*b.hw + s*b.hh + AABB_MARGIN, ey = s*b.hw + c*b.hh + AABB_MARGIN;
  b._x0=b.x-ex; b._x1=b.x+ex; b._y0=b.y-ey; b._y1=b.y+ey;
}
const awakeDyn = b => b.invM>0 && !b.asleep;

function pairFriction(w,a,b){
  if ((a===w.car && b===w.ground) || (b===w.car && a===w.ground))
    return w.braking ? w.p.groundFriction : ROLL_MU;
  return Math.sqrt(a.mu*b.mu);
}
function applyJ(bd, jx, jy, rx, ry, sgn){
  if (bd.invM===0 || bd.asleep) return;
  bd.vx += sgn*jx*bd.invM; bd.vy += sgn*jy*bd.invM;
  bd.w  += sgn*bd.invI*(rx*jy - ry*jx);
}

function preStep(w, pm){
  const a=pm.a, b=pm.b, dt=w.dt;
  pm.mu = pairFriction(w,a,b);
  pm.e  = Math.sqrt(a.rest*b.rest);
  const nx=pm.nx, ny=pm.ny;
  for (let i=0;i<pm.num;i++){
    const c=pm.c[i];
    c.rax=c.x-a.x; c.ray=c.y-a.y; c.rbx=c.x-b.x; c.rby=c.y-b.y;
    const ran = c.rax*ny - c.ray*nx, rbn = c.rbx*ny - c.rby*nx;
    const kn = a.invM + b.invM + a.invI*ran*ran + b.invI*rbn*rbn;
    c.massN = kn>0 ? 1/kn : 0;
    const tx=-ny, ty=nx;
    const rat = c.rax*ty - c.ray*tx, rbt = c.rbx*ty - c.rby*tx;
    const kt = a.invM + b.invM + a.invI*rat*rat + b.invI*rbt*rbt;
    c.massT = kt>0 ? 1/kt : 0;
    /* relative normal velocity before any impulse */
    const rvx = (b.vx - b.w*c.rby) - (a.vx - a.w*c.ray);
    const rvy = (b.vy + b.w*c.rbx) - (a.vy + a.w*c.rax);
    const vn0 = rvx*nx + rvy*ny;
    const rest = vn0 < -REST_VEL ? -pm.e*vn0 : 0;
    const bias = Math.min(BIAS_MAX, (BETA/dt)*Math.max(0, -c.sep - SLOP));
    c.target = Math.max(bias, rest);
    c.PnStart = c.Pn;
    /* fast approach wakes a sleeping participant outright */
    if (-vn0 > WAKE_VN){
      if (a.asleep && a.invM>0) wake(a);
      if (b.asleep && b.invM>0) wake(b);
    }
    /* first car↔brick contact = the recorded impact */
    if (!w.impacted && -vn0 > 1.5 &&
        ((a===w.car && b.kind==='brick') || (b===w.car && a.kind==='brick'))){
      w.impacted = true; w.braking = true;
      w.impactSpeed = Math.hypot(w.car.vx, w.car.vy);
      w.events.push({type:'first', x:c.x, y:c.y, mag:600, nx, ny});
      w.shake = Math.min(18, w.shake + 10);
    }
    /* warm start */
    const jx = c.Pn*nx + c.Pt*tx, jy = c.Pn*ny + c.Pt*ty;
    applyJ(a, jx, jy, c.rax, c.ray, -1);
    applyJ(b, jx, jy, c.rbx, c.rby, +1);
  }
}
function wake(b){ b.asleep=false; b.sleepT=0; }

function solveManifold(w, pm){
  const a=pm.a, b=pm.b, nx=pm.nx, ny=pm.ny, tx=-ny, ty=nx;
  for (let i=0;i<pm.num;i++){
    const c=pm.c[i];
    /* normal */
    let rvx = (b.vx - b.w*c.rby) - (a.vx - a.w*c.ray);
    let rvy = (b.vy + b.w*c.rbx) - (a.vy + a.w*c.rax);
    const vn = rvx*nx + rvy*ny;
    let dPn = c.massN*(c.target - vn);
    const Pn0=c.Pn; c.Pn = Math.max(0, Pn0+dPn); dPn = c.Pn-Pn0;
    if (dPn !== 0){
      applyJ(a, dPn*nx, dPn*ny, c.rax, c.ray, -1);
      applyJ(b, dPn*nx, dPn*ny, c.rbx, c.rby, +1);
      if (a.invM>0 && a.asleep && dPn*a.invM > WAKE_DV) wake(a);
      if (b.invM>0 && b.asleep && dPn*b.invM > WAKE_DV) wake(b);
    }
    /* friction */
    rvx = (b.vx - b.w*c.rby) - (a.vx - a.w*c.ray);
    rvy = (b.vy + b.w*c.rbx) - (a.vy + a.w*c.rax);
    const vt = rvx*tx + rvy*ty;
    let dPt = c.massT*(-vt);
    const maxPt = pm.mu*c.Pn;
    const Pt0=c.Pt; c.Pt = clamp(Pt0+dPt, -maxPt, maxPt); dPt = c.Pt-Pt0;
    if (dPt !== 0){
      applyJ(a, dPt*tx, dPt*ty, c.rax, c.ray, -1);
      applyJ(b, dPt*tx, dPt*ty, c.rbx, c.rby, +1);
    }
  }
}

function stepPhysics(w){
  if (w.state !== 'running') return;
  const dt=w.dt, bodies=w.bodies, car=w.car;
  w.t += dt; w.stepCount++;

  /* engine: accelerate to, then hold, the target speed until impact */
  if (!w.impacted){
    if (car.asleep) wake(car);
    if (car.vx < w.p.carSpeed) car.vx = Math.min(car.vx + w.acc*dt, w.p.carSpeed);
  }

  /* integrate gravity, reset per-step flags */
  for (let i=0;i<bodies.length;i++){
    const b=bodies[i];
    b.touched=false; b.onGround=false; b.nbrsNew.length=0;
    if (b.invM===0 || b.asleep) continue;
    b.vy -= w.g*dt;
  }

  /* broadphase: sweep & prune on x (insertion sort, nearly sorted input) */
  const order=w.order;
  if (order.length !== bodies.length){ order.length=0; for (const b of bodies) order.push(b); }
  for (const b of bodies) aabb(b);
  for (let i=1;i<order.length;i++){
    const b=order[i]; let j=i-1;
    while (j>=0 && (order[j]._x0 > b._x0 || (order[j]._x0===b._x0 && order[j].id>b.id))){
      order[j+1]=order[j]; j--;
    }
    order[j+1]=b;
  }
  const pairs=w.pairs; pairs.length=0;
  for (let i=0;i<order.length;i++){
    const bi=order[i];
    for (let j=0;j<i;j++){
      const bj=order[j];
      if (bj._x1 < bi._x0) continue;
      if (bj._y1 < bi._y0 || bi._y1 < bj._y0) continue;
      if (!(awakeDyn(bi)||awakeDyn(bj))) continue;
      const a = bj.id<bi.id ? bj : bi, b = bj.id<bi.id ? bi : bj;
      pairs.push(a.id*100000 + b.id);
    }
  }
  pairs.sort((x,y)=>x-y);

  /* narrowphase + warm-start setup */
  w.frameM.length=0;
  for (let pi=0;pi<pairs.length;pi++){
    const key=pairs[pi];
    const aid=Math.floor(key/100000), bid=key%100000;
    const a=bodies[aid], b=bodies[bid];           /* ids match array indices */
    let pm=w.manifolds.get(key);
    if (!pm){ pm=makeManifold(a,b); w.manifolds.set(key,pm); }
    if (!refreshManifold(pm)){
      w.manifolds.delete(key);
      /* proximity pairs still count as neighbours for support tracking */
      if (a.invM>0) a.nbrsNew.push(b);
      if (b.invM>0) b.nbrsNew.push(a);
      continue;
    }
    pm.stamp=w.stepCount;
    if (awakeDyn(a)) a.touched=true;
    if (awakeDyn(b)) b.touched=true;
    if (a.invM>0) a.nbrsNew.push(b);
    if (b.invM>0) b.nbrsNew.push(a);
    if ((a===car&&b===w.ground)||(b===car&&a===w.ground)) car.onGround=true;
    preStep(w,pm);
    w.frameM.push(pm);
  }
  /* drop stale manifolds (separated pairs) */
  for (const [k,pm] of w.manifolds) if (pm.stamp!==w.stepCount) w.manifolds.delete(k);

  /* velocity solve */
  for (let it=0; it<w.iters; it++)
    for (let mi=0; mi<w.frameM.length; mi++) solveManifold(w, w.frameM[mi]);

  /* integrate positions */
  for (let i=0;i<bodies.length;i++){
    const b=bodies[i];
    if (b.invM===0 || b.asleep) continue;
    b.x += b.vx*dt; b.y += b.vy*dt; b.a += b.w*dt;
    if (!Number.isFinite(b.x+b.y+b.vx+b.vy+b.w)){ b.vx=b.vy=b.w=0; }
  }

  /* sleep bookkeeping: wake on support change, sleep when calm & supported */
  for (let i=0;i<bodies.length;i++){
    const b=bodies[i];
    if (b.invM===0) continue;
    if (b.asleep){
      const fin=b._fin; fin.length=0;
      for (const n of b.nbrs) if (n.asleep || n.invM===0) fin.push(n);
      for (const n of b.nbrsNew) if (fin.indexOf(n)===-1) fin.push(n);
      let changed = fin.length !== b.nbrs.length;
      if (!changed) for (const n of fin) if (b.nbrs.indexOf(n)===-1){ changed=true; break; }
      b._fin = b.nbrs; b.nbrs = fin;
      if (changed) wake(b);
    } else {
      b._fin = b.nbrs; b.nbrs = b.nbrsNew; b.nbrsNew = b._fin; b._fin.length=0;
      if (b.touched){
        const motion = Math.abs(b.vx)+Math.abs(b.vy)+0.8*Math.abs(b.w);
        if (motion < SLEEP_MOTION){
          b.sleepT += dt;
          if (b.sleepT >= SLEEP_TIME){ b.asleep=true; b.vx=b.vy=b.w=0; }
        } else b.sleepT = 0;
        if (!b.asleep && Math.abs(b.vx)<CLAMP_V && Math.abs(b.vy)<CLAMP_V && Math.abs(b.w)<CLAMP_W)
          b.vx=b.vy=b.w=0;
      } else b.sleepT = 0;
    }
  }

  /* impact FX events + car damage + camera shake */
  let awake=0, awakeBricks=0;
  for (let i=0;i<bodies.length;i++){
    const b=bodies[i];
    if (awakeDyn(b)){ awake++; if (b.kind==='brick') awakeBricks++; }
  }
  w.awakeCount = awake; w.awakeBricks = awakeBricks;
  for (let mi=0; mi<w.frameM.length; mi++){
    const pm=w.frameM[mi];
    const involvesCar = pm.a===car || pm.b===car;
    for (let i=0;i<pm.num;i++){
      const c=pm.c[i];
      const dI=c.Pn-c.PnStart;
      if (dI > 12 && w.events.length<48)
        w.events.push({type:'hit', x:c.x, y:c.y, mag:dI, nx:pm.nx, ny:pm.ny});
      if (dI > 15) w.shake = Math.min(16, w.shake + Math.min(2.2, dI*0.004));
      if (involvesCar && dI>4) w.damage = Math.min(1, w.damage + dI*0.00035);
    }
  }

  /* settled? everything dynamic asleep for a moment */
  if (awake===0 && w.t>0.5){ w.quietT+=dt; if (w.quietT>0.3) w.state='settled'; }
  else w.quietT=0;
  if (w.t > MAX_RUN_T) w.state='settled';
}

/* ============================================================================
   FX — dust puffs, masonry chips, skid marks (seeded; never affect physics)
   ==========================================================================*/
let fxRng = mulberry32(0xC0FFEE);
const dust=[], chips=[], skids=[];
function fxReset(seed){ fxRng = mulberry32(seed); dust.length=0; chips.length=0; skids.length=0; }
function spawnHit(ev){
  const n = clamp(Math.round(ev.mag/14), 1, 7);
  for (let i=0;i<n && dust.length<240;i++){
    const ang = Math.atan2(ev.ny, ev.nx) + (fxRng()-0.5)*2.4;
    const sp = 0.6 + fxRng()*2.4;
    dust.push({x:ev.x+(fxRng()-0.5)*0.3, y:Math.max(0.05,ev.y+(fxRng()-0.5)*0.3),
      vx:Math.cos(ang)*sp, vy:Math.abs(Math.sin(ang))*sp*0.7+0.4,
      r:0.06+fxRng()*0.12, life:0, max:0.7+fxRng()*0.9});
  }
  if (ev.mag > 40){
    const m = clamp(Math.round(ev.mag/45), 1, 6);
    for (let i=0;i<m && chips.length<130;i++){
      chips.push({x:ev.x, y:ev.y, vx:(fxRng()-0.2)*6, vy:1+fxRng()*5,
        a:fxRng()*6.3, va:(fxRng()-0.5)*18, s:0.03+fxRng()*0.06,
        life:0, max:1.4+fxRng()*1.2, hue:fxRng()});
    }
  }
}
function updateFx(rdt, w){
  for (let i=dust.length-1;i>=0;i--){ const d=dust[i]; d.life+=rdt;
    d.x+=d.vx*rdt; d.y+=d.vy*rdt; d.vy+=0.7*rdt; d.r+=0.5*rdt;
    if (d.life>d.max) dust.splice(i,1); }
  for (let i=chips.length-1;i>=0;i--){ const c=chips[i]; c.life+=rdt;
    c.x+=c.vx*rdt; c.y+=c.vy*rdt; c.vy-=9.8*rdt; c.a+=c.va*rdt;
    if (c.y<0.03 && c.vy<0){ c.y=0.03; c.vy*=-0.25; c.vx*=0.6; c.va*=0.5; }
    if (c.life>c.max) chips.splice(i,1); }
  for (let i=skids.length-1;i>=0;i--){ skids[i].life+=rdt; if (skids[i].life>8) skids.splice(i,1); }
  /* fresh skid segments while the car slides after impact */
  const car=w.car;
  if (w.braking && car.onGround && Math.abs(car.vx)>0.8 && skids.length<420){
    for (const off of [-1.35, 1.35]){
      const ca=Math.cos(car.a), sa=Math.sin(car.a);
      const wx = car.x + ca*off - sa*(-0.385), wy = car.y + sa*off + ca*(-0.385);
      skids.push({x:wx, y:Math.max(0.01,wy-0.30), life:0});
    }
  }
  w.shake *= Math.exp(-6.5*rdt);
  w.shT += rdt;
}

/* ---------------- audio (procedural thuds, gesture-unlocked) ---------------- */
let actx=null, masterGain=null, noiseBuf=null, lastThud=0, soundOn=true;
function ensureAudio(){
  if (actx || typeof window==='undefined' || !window.AudioContext) return;
  try{
    actx = new window.AudioContext();
    masterGain = actx.createGain(); masterGain.gain.value=0.4; masterGain.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, actx.sampleRate*0.5, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    const r = mulberry32(1234);
    for (let i=0;i<d.length;i++) d[i] = r()*2-1;
  }catch(e){ actx=null; }
}
function thud(mag, big){
  if (!soundOn || !actx) return;
  const now = actx.currentTime;
  if (now-lastThud < 0.05) return;
  lastThud = now;
  const dur = big ? 0.34 : 0.10 + Math.min(0.2, mag*0.0004);
  const src = actx.createBufferSource(); src.buffer=noiseBuf;
  const f = actx.createBiquadFilter(); f.type='lowpass';
  f.frequency.value = big ? 110 : 140 + Math.min(700, mag*0.8);
  const g = actx.createGain();
  const peak = big ? 0.95 : Math.min(0.7, 0.08 + mag*0.004);
  g.gain.setValueAtTime(peak, now);
  g.gain.exponentialRampToValueAtTime(0.001, now+dur);
  src.connect(f); f.connect(g); g.connect(masterGain);
  src.start(now, fxRng()*0.3); src.stop(now+dur+0.05);
}

/* ============================================================================
   Camera + renderer
   ==========================================================================*/
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
let viewW=1280, viewH=720, dpr=1;
function resize(){
  dpr = (typeof window!=='undefined' && window.devicePixelRatio) || 1;
  viewW = window.innerWidth; viewH = window.innerHeight;
  canvas.width = Math.round(viewW*dpr); canvas.height = Math.round(viewH*dpr);
  canvas.style.width = viewW+'px'; canvas.style.height = viewH+'px';
}
window.addEventListener('resize', resize); resize();

const cam = { cx:20, z:40 };
function cameraTarget(w){
  const left = w.car.x - w.p.carW/2 - 2.2;
  const right = w.wallFront + w.wallThick + 3.2;
  const width = Math.max(12, right-left);
  return { cx:(left+right)/2, z:clamp(viewW*0.94/width, 7, w.p.scale) };
}
function snapCamera(){ const t=cameraTarget(world); cam.cx=t.cx; cam.z=t.z; }

let world = buildWorld(params);
snapCamera();

const HILLS1=[0,1.1,0.6,1.6,0.9,2.1,1.2,0.7,1.5,0.8,1.9,1.0,0.5,1.3,0.9,0];
const HILLS2=[0,0.7,1.4,0.5,1.1,0.8,0.4,1.0,0.6,1.3,0.7,0.4,0.9,0.5,0.8,0];
const CLOUDS=[[30,6.4,1.6],[75,7.6,2.2],[120,5.8,1.3],[170,7.0,1.9],[230,6.2,1.5],[290,7.4,2.0]];

function render(rdt){
  const w=world, p=w.p;
  const tgt=cameraTarget(w);
  const k = 1-Math.exp(-5*rdt);
  cam.cx += (tgt.cx-cam.cx)*k; cam.z += (tgt.z-cam.z)*k;
  const z=cam.z, gy=viewH*0.80;
  const shX = w.shake*(Math.sin(w.shT*47.3)+0.6*Math.sin(w.shT*31.7));
  const shY = w.shake*0.7*(Math.sin(w.shT*41.1)+0.6*Math.sin(w.shT*27.9));
  const X = x => viewW/2 + (x-cam.cx)*z + shX;
  const Y = y => gy - y*z + shY;

  ctx.setTransform(dpr,0,0,dpr,0,0);
  /* sky */
  const sky=ctx.createLinearGradient(0,0,0,viewH);
  sky.addColorStop(0,'#8fc7e8'); sky.addColorStop(0.55,'#c6e4f4'); sky.addColorStop(1,'#eef6fa');
  ctx.fillStyle=sky; ctx.fillRect(0,0,viewW,viewH);
  /* sun glow */
  const sun=ctx.createRadialGradient(viewW*0.82,viewH*0.12,10,viewW*0.82,viewH*0.12,viewH*0.5);
  sun.addColorStop(0,'rgba(255,244,200,0.75)'); sun.addColorStop(1,'rgba(255,244,200,0)');
  ctx.fillStyle=sun; ctx.fillRect(0,0,viewW,viewH*0.6);
  /* clouds (far parallax) */
  ctx.fillStyle='rgba(255,255,255,0.85)';
  for (const [cx0,cy0,cs] of CLOUDS){
    let sx = viewW/2 + (cx0 - cam.cx*0.22)*z*0.32;
    sx = ((sx % (viewW+420)) + viewW+420) % (viewW+420) - 210;
    const sy = gy - cy0*z*0.5;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 34*cs, 9*cs, 0, 0, 6.284);
    ctx.ellipse(sx+22*cs, sy+3*cs, 24*cs, 7*cs, 0, 0, 6.284);
    ctx.ellipse(sx-24*cs, sy+4*cs, 20*cs, 6*cs, 0, 0, 6.284);
    ctx.fill();
  }
  /* hills (two ridges, parallax) */
  drawHills(HILLS1, 0.35, '#b9d2c4', 600, 2.6, gy, z);
  drawHills(HILLS2, 0.55, '#9db8a6', 480, 1.7, gy, z);

  /* ground */
  const gg=ctx.createLinearGradient(0,gy,0,viewH);
  gg.addColorStop(0,'#4b5158'); gg.addColorStop(0.12,'#3c4147'); gg.addColorStop(1,'#22262b');
  ctx.fillStyle=gg; ctx.fillRect(0,gy,viewW,viewH-gy);
  ctx.fillStyle='#6d747d'; ctx.fillRect(0,gy-1.5,viewW,3);
  /* expansion joints + ruler ticks */
  const mLeft = cam.cx - viewW*0.6/z, mRight = cam.cx + viewW*0.6/z;
  ctx.strokeStyle='rgba(0,0,0,0.28)'; ctx.lineWidth=1.5; ctx.beginPath();
  for (let m=Math.max(0,Math.floor(mLeft/4)*4); m<=mRight; m+=4){
    const sx=X(m); ctx.moveTo(sx,gy+4); ctx.lineTo(sx,viewH);
  }
  ctx.stroke();
  ctx.font='600 9px ui-monospace,Menlo,monospace'; ctx.textAlign='center';
  const minorStep = z>26 ? 1 : 5, labelStep = z>26 ? 5 : 10;
  for (let m=Math.max(0,Math.floor(mLeft/minorStep)*minorStep); m<=mRight; m+=minorStep){
    const sx=X(m), major = m%labelStep===0;
    ctx.fillStyle = major ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.28)';
    ctx.fillRect(sx-0.5, gy-2, 1, major?9:5);
    if (major){ ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.fillText(m+' m', sx, gy+16); }
  }
  /* start line */
  ctx.fillStyle='rgba(255,255,255,0.5)';
  ctx.fillRect(X(w.startLine)-1.5, gy-2, 3, 10);
  ctx.fillStyle='rgba(255,255,255,0.45)';
  ctx.fillText('START', X(w.startLine), gy+28);

  /* gantry framing the impact zone */
  const gTop = w.wallH + 1.3;
  drawPost(X(w.wallFront-1.4), gy, gTop, z);
  drawPost(X(w.wallFront+w.wallThick+1.4), gy, gTop, z);
  ctx.strokeStyle='#2b3138'; ctx.lineWidth=Math.max(3, 0.14*z);
  ctx.beginPath();
  ctx.moveTo(X(w.wallFront-1.4), Y(gTop)); ctx.lineTo(X(w.wallFront+w.wallThick+1.4), Y(gTop));
  ctx.stroke();
  ctx.fillStyle='#20262d';
  const bW=(w.wallThick+2.8)*z*0.5, bH=Math.max(12,0.34*z);
  ctx.fillRect(X(w.wallFront+w.wallThick/2)-bW/2, Y(gTop)-bH*1.7, bW, bH);
  ctx.fillStyle='#ffb64d'; ctx.font=`800 ${Math.max(9,0.2*z)}px ui-monospace,Menlo,monospace`;
  ctx.fillText('IMPACT TEST BAY', X(w.wallFront+w.wallThick/2), Y(gTop)-bH*1.7+bH*0.68);

  /* skid marks */
  ctx.strokeStyle='rgba(18,19,22,1)'; ctx.lineCap='round';
  for (const s of skids){
    ctx.globalAlpha = 0.34*(1-s.life/8);
    ctx.lineWidth = 0.2*z;
    ctx.beginPath(); ctx.moveTo(X(s.x)-0.3*z, Y(s.y)); ctx.lineTo(X(s.x)+0.05*z, Y(s.y)); ctx.stroke();
  }
  ctx.globalAlpha=1;

  /* wall bricks — back layers first */
  for (let i=w.bricks.length-1;i>=0;i--) drawBrick(w.bricks[i], X, Y, z);
  /* car */
  drawCar(w, X, Y, z);

  /* dust */
  for (const d of dust){
    const a = 0.32*(1-d.life/d.max);
    ctx.fillStyle=`rgba(188,166,134,${a.toFixed(3)})`;
    ctx.beginPath(); ctx.arc(X(d.x), Y(d.y), d.r*z, 0, 6.284); ctx.fill();
  }
  /* chips */
  for (const c of chips){
    const a = 1-c.life/c.max;
    const cs=Math.cos(c.a), sn=Math.sin(c.a);
    ctx.setTransform(dpr*z*cs, -dpr*z*sn, -dpr*z*sn, -dpr*z*cs, dpr*X(c.x), dpr*Y(c.y));
    ctx.fillStyle=`hsla(${14+c.hue*8},48%,${34+c.hue*14}%,${a.toFixed(3)})`;
    ctx.fillRect(-c.s,-c.s*0.6, c.s*2, c.s*1.2);
  }
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
function drawHills(profile, par, color, tileW, maxH, gy, z){
  const off = -cam.cx*z*par;
  const start = ((off % tileW)+tileW)%tileW - tileW;
  ctx.fillStyle=color; ctx.beginPath(); ctx.moveTo(start, gy);
  const n=profile.length;
  for (let x=start, i=0; x<viewW+tileW; i++){
    const px=x, py=gy - profile[i%n]*maxH*z*0.16 - 2;
    ctx.lineTo(px, py); x += tileW/(n-1);
  }
  ctx.lineTo(viewW+tileW, gy); ctx.closePath(); ctx.fill();
}
function drawPost(sx, gy, top, z){
  const wpx=Math.max(4,0.22*z), hpx=top*z;
  ctx.fillStyle='#2b3138'; ctx.fillRect(sx-wpx/2, gy-hpx, wpx, hpx);
  ctx.save(); ctx.beginPath(); ctx.rect(sx-wpx/2, gy-hpx, wpx, hpx); ctx.clip();
  ctx.fillStyle='#e8b93c';
  for (let y=gy-hpx; y<gy; y+=14){ ctx.beginPath();
    ctx.moveTo(sx-wpx/2, y); ctx.lineTo(sx+wpx/2, y+10);
    ctx.lineTo(sx+wpx/2, y+16); ctx.lineTo(sx-wpx/2, y+6); ctx.fill(); }
  ctx.restore();
}
function drawBrick(b, X, Y, z){
  const cs=Math.cos(b.a), sn=Math.sin(b.a);
  /* gentle oblique shear per depth layer, fading to zero at ground level */
  const ox = b.layer*0.05*Math.min(1, b.y/Math.max(0.5, world.wallH));
  const sx=X(b.x+ox), sy=Y(b.y);
  ctx.setTransform(dpr*z*cs, -dpr*z*sn, -dpr*z*sn, -dpr*z*cs, dpr*sx, dpr*sy);
  ctx.fillStyle=b.fill;
  ctx.fillRect(-b.hw+0.003, -b.hh+0.003, b.hw*2-0.006, b.hh*2-0.006);
  ctx.strokeStyle='rgba(46,20,12,0.55)'; ctx.lineWidth=0.011;
  ctx.strokeRect(-b.hw+0.003, -b.hh+0.003, b.hw*2-0.006, b.hh*2-0.006);
  ctx.fillStyle='rgba(255,235,215,0.20)';
  ctx.fillRect(-b.hw+0.008, b.hh-0.032, b.hw*2-0.016, 0.02);
}
function drawCar(w, X, Y, z){
  const car=w.car, cs=Math.cos(car.a), sn=Math.sin(car.a);
  const sx=X(car.x), sy=Y(car.y);
  /* shadow */
  ctx.fillStyle='rgba(15,20,25,0.28)';
  ctx.beginPath(); ctx.ellipse(X(car.x), Y(0)+3, 2.25*z, 0.09*z+3, 0, 0, 6.284); ctx.fill();

  const dmg=w.damage;
  ctx.setTransform(dpr*z*cs, -dpr*z*sn, -dpr*z*sn, -dpr*z*cs, dpr*sx, dpr*sy);
  const cr = x => x>0.5 ? 0.5+(x-0.5)*(1-0.5*dmg) : x;   /* cosmetic crumple */
  /* body silhouette (meters, +x forward, +y up) */
  ctx.beginPath();
  ctx.moveTo(cr(2.02),-0.42); ctx.lineTo(cr(2.10),-0.26); ctx.lineTo(cr(2.06),-0.02);
  ctx.lineTo(cr(1.52), 0.04+0.10*dmg);                    /* hood buckles a touch */
  ctx.lineTo(cr(0.72), 0.12); ctx.lineTo(0.26, 0.52); ctx.lineTo(-0.85, 0.56);
  ctx.lineTo(-1.32, 0.20); ctx.lineTo(-1.95, 0.12); ctx.lineTo(-2.10,-0.10);
  ctx.lineTo(-2.06,-0.42); ctx.closePath();
  const bodyGrad=ctx.createLinearGradient(0,-0.5,0,0.6);
  bodyGrad.addColorStop(0,'#ff8a2a'); bodyGrad.addColorStop(0.6,'#f46f14'); bodyGrad.addColorStop(1,'#d95f0e');
  ctx.fillStyle=bodyGrad; ctx.fill();
  ctx.strokeStyle='rgba(70,25,5,0.6)'; ctx.lineWidth=0.025; ctx.stroke();
  /* windows */
  ctx.fillStyle='#bfe0ee';
  ctx.beginPath();
  ctx.moveTo(0.60,0.16); ctx.lineTo(0.24,0.48); ctx.lineTo(-0.04,0.48); ctx.lineTo(-0.30,0.16);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-0.40,0.16); ctx.lineTo(-0.10,0.48); ctx.lineTo(-0.78,0.50); ctx.lineTo(-1.20,0.18);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.5)';
  ctx.fillRect(0.02,0.18,0.05,0.28);
  /* door cut + handle + checker decal */
  ctx.strokeStyle='rgba(90,35,8,0.55)'; ctx.lineWidth=0.02;
  ctx.beginPath(); ctx.moveTo(-0.06,-0.36); ctx.lineTo(-0.06,0.14); ctx.stroke();
  ctx.fillStyle='#7a3413'; ctx.fillRect(-0.42,-0.02,0.16,0.045);
  for (let r=0;r<2;r++) for (let c=0;c<3;c++){
    ctx.fillStyle=(r+c)%2 ? '#111' : '#f5f5f5';
    ctx.fillRect(-1.05+c*0.13, -0.16-r*0.13, 0.13, 0.13);
  }
  /* bumpers, lights */
  ctx.fillStyle='#2c2f34'; ctx.fillRect(cr(1.86),-0.44,0.22*(1-0.4*dmg),0.10);
  ctx.fillRect(-2.09,-0.44,0.18,0.10);
  ctx.fillStyle='#ffd773'; ctx.beginPath(); ctx.ellipse(cr(2.03),-0.10,0.07,0.05,0,0,6.284); ctx.fill();
  const braking=w.braking && Math.abs(car.vx)+Math.abs(car.vy)>0.5;
  ctx.fillStyle=braking?'#ff2d2d':'#a11f1f';
  ctx.beginPath(); ctx.ellipse(-2.07,-0.02,0.05,0.07,0,0,6.284); ctx.fill();
  if (braking){ ctx.fillStyle='rgba(255,45,45,0.25)';
    ctx.beginPath(); ctx.ellipse(-2.16,-0.02,0.16,0.12,0,0,6.284); ctx.fill(); }
  /* wheels (locked after impact → skid) */
  for (const off of [-1.35,1.35]){
    ctx.save(); ctx.translate(off,-0.385);
    ctx.fillStyle='#15181c'; ctx.beginPath(); ctx.arc(0,0,0.34,0,6.284); ctx.fill();
    ctx.fillStyle='#39404a'; ctx.beginPath(); ctx.arc(0,0,0.20,0,6.284); ctx.fill();
    ctx.rotate(wheelAng);
    ctx.strokeStyle='#cfd6dd'; ctx.lineWidth=0.045;
    for (let s=0;s<5;s++){ ctx.rotate(1.2566); ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,0.17); ctx.stroke(); }
    ctx.restore();
  }
}

/* ============================================================================
   UI — buttons, telemetry, settings, params bar
   ==========================================================================*/
const $ = id => document.getElementById(id);
const els = { test:$('btnTest'), reset:$('btnReset'), settings:$('btnSettings'), sound:$('btnSound'),
  panel:$('panel'), sliders:$('sliders'), paramsBar:$('paramsBar'),
  tStatus:$('tStatus'), tTime:$('tTime'), tSpeed:$('tSpeed'), tImpact:$('tImpact'), tMoving:$('tMoving') };

let acc=0, pendingRebuild=false;
function rebuild(mode){
  world = buildWorld(params);
  if (mode==='running'){
    world.state='running'; wake(world.car);
  }
  acc=0; pendingRebuild=false;
  fxReset(0xC0FFEE);
  snapCamera();
  updateParamsBar();
}
function runTest(){ ensureAudio(); rebuild('running'); }

els.test.addEventListener('click', runTest);
els.reset.addEventListener('click', ()=>rebuild('ready'));
els.settings.addEventListener('click', ()=>els.panel.classList.toggle('open'));
$('btnClosePanel').addEventListener('click', ()=>els.panel.classList.remove('open'));
els.sound.addEventListener('click', ()=>{ soundOn=!soundOn; els.sound.textContent = soundOn?'🔊':'🔇'; if(soundOn) ensureAudio(); });
$('btnDefaults').addEventListener('click', ()=>{ params=Object.assign({},DEFAULTS); syncSliders(); rebuild('ready'); });
window.addEventListener('keydown', e=>{
  if (e.target && (e.target.tagName==='INPUT')) return;
  if (e.code==='Space'){ e.preventDefault(); runTest(); }
  if (e.code==='KeyR') rebuild('ready');
});

/* settings sliders */
const sliderInputs={};
(function buildSliders(){
  let html='';
  for (const key of Object.keys(RANGES)){
    const r=RANGES[key];
    html += `<div class="srow"><div class="slabel"><span>${r.label}</span>`+
      `<span class="val" id="val_${key}"></span></div>`+
      `<input type="range" id="sl_${key}" min="${r.min}" max="${r.max}" step="${r.step}">`+
      `<div class="range-ends"><span>${r.min}</span><span>${r.max}</span></div></div>`;
  }
  els.sliders.innerHTML=html;
  for (const key of Object.keys(RANGES)){
    const inp=$('sl_'+key);
    sliderInputs[key]=inp;
    inp.addEventListener('input', ()=>{
      const v=parseFloat(inp.value);
      if (!Number.isFinite(v)) return;
      params[key]=v;
      paintSlider(key);
      pendingRebuild=true;   /* coalesced into the next frame */
    });
  }
  syncSliders();
})();
function syncSliders(){ for (const key of Object.keys(RANGES)){ sliderInputs[key].value=params[key]; paintSlider(key); } }
function paintSlider(key){
  const r=RANGES[key], v=params[key], inp=sliderInputs[key];
  inp.style.setProperty('--fill', ((v-r.min)/(r.max-r.min)*100)+'%');
  $('val_'+key).innerHTML = (key==='cols'||key==='rows'||key==='layers' ? v : v.toFixed(1)) +
    (r.unit?` <span class="u">${r.unit}</span>`:'');
}
function updateParamsBar(){
  const p=params, nb=world.bricks.length;
  els.paramsBar.innerHTML =
    `<span class="pchip">speed <b>${p.carSpeed.toFixed(1)} m/s</b></span>`+
    `<span class="pchip">wall <b>${p.cols}×${p.rows}×${p.layers}</b> (${nb} bricks)</span>`+
    `<span class="pchip">brick <b>${p.brickMass.toFixed(1)} kg</b></span>`+
    `<span class="pchip">g <b>${p.gravity}</b> · μ <b>${p.brickFriction}/${p.groundFriction}</b> · e <b>${p.brickRestitution}</b></span>`+
    `<span class="pchip">car <b>${p.carMass} kg</b> · <b>${p.carW}×${p.carH} m</b></span>`+
    `<span class="pchip">scale <b>${p.scale} px/m</b></span>`;
}
els.paramsBar.addEventListener('click', ()=>els.panel.classList.add('open'));

/* telemetry */
let hudTick=0;
function updateHud(){
  const w=world;
  let st, cls;
  if (w.state==='ready'){ st='READY'; cls='st-ready'; }
  else if (w.state==='settled'){ st='SETTLED'; cls='st-done'; }
  else if (!w.impacted){ st='DRIVING'; cls='st-run'; }
  else if (w.awakeCount>0){ st='COLLAPSE'; cls='st-impact'; }
  else { st='SETTLING'; cls='st-settle'; }
  els.tStatus.textContent=st; els.tStatus.className=cls;
  els.tTime.innerHTML=w.t.toFixed(2)+'<span class="unit">s</span>';
  const v=Math.hypot(w.car.vx,w.car.vy);
  els.tSpeed.innerHTML=v.toFixed(1)+`<span class="unit">m/s · ${(v*3.6).toFixed(0)} km/h</span>`;
  els.tImpact.innerHTML=w.impacted ? w.impactSpeed.toFixed(1)+'<span class="unit">m/s</span>' : '—';
  els.tMoving.textContent=String(w.state==='ready'?0:w.awakeBricks);
  els.test.classList.toggle('ready-pulse', w.state!=='running');
}

/* ============================================================================
   main loop — fixed-step physics inside a render-rate wrapper
   ==========================================================================*/
let lastTs=-1, wheelAng=0;
function frame(ts){
  requestAnimationFrame(frame);
  const now=ts/1000;
  let rdt = lastTs<0 ? 0.016 : now-lastTs;
  lastTs=now;
  if (!(rdt>0) || rdt>0.25) rdt=0.016;
  if (pendingRebuild) rebuild('ready');
  if (world.state==='running'){
    acc+=rdt;
    let n=0;
    while (acc>=world.dt && n<14){ stepPhysics(world); acc-=world.dt; n++; }
    if (n===14) acc=0;
    if (!world.braking) wheelAng -= world.car.vx/0.34*rdt;
  }
  /* consume FX events (even on the frame the run settles) */
  for (const ev of world.events){
    if (ev.type==='first'){
      for (let i=0;i<26;i++) spawnHit({x:ev.x,y:ev.y,mag:55,nx:ev.nx,ny:ev.ny});
      thud(900,true);
    } else { spawnHit(ev); if (ev.mag>60) thud(ev.mag,false); }
  }
  world.events.length=0;
  updateFx(rdt, world);
  render(rdt);
  updateHud();
}
requestAnimationFrame(frame);
updateParamsBar();

/* ---------------- headless test hooks ---------------- */
if (typeof window!=='undefined'){
  window.__crash = {
    api:1,
    reset:()=>rebuild('ready'),
    test:()=>rebuild('running'),
    setParam:(k,v)=>{ params[k]=v; },
    step:n=>{ for (let i=0;i<(n||1);i++) stepPhysics(world); },
    state:()=>{
      let nan=false, displaced=0;
      for (const b of world.bricks){
        if (!Number.isFinite(b.x+b.y+b.a)) nan=true;
        if (Math.hypot(b.x-b.ix, b.y-b.iy) > 1.0) displaced++;
      }
      let h=0x811c9dc5;
      for (const b of world.bodies){
        const s=b.x.toFixed(6)+','+b.y.toFixed(6)+','+b.a.toFixed(6)+';';
        for (let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,0x01000193); }
      }
      return { state:world.state, t:+world.t.toFixed(4), bodies:world.bodies.length,
        bricks:world.bricks.length, impacted:world.impacted,
        impactSpeed:+world.impactSpeed.toFixed(3), carX:+world.car.x.toFixed(4),
        carV:+Math.hypot(world.car.vx,world.car.vy).toFixed(3),
        awake:world.awakeCount, displaced, nan, hash:(h>>>0).toString(16),
        wallFront:+world.wallFront.toFixed(3), dt:world.dt };
    }
  };
}
