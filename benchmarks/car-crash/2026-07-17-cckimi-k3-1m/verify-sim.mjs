/* Headless verification for the car-crash sandbox.
   Stubs the DOM, drives the physics via window.__crash, asserts behaviour. */
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: no <script> block found'); process.exit(1); }
const code = m[1];

/* ---------- deep permissive proxy for canvas ctx / elements ---------- */
function deepProxy(){
  return new Proxy(function(){}, {
    get:(t,p)=> p===Symbol.toPrimitive ? ()=>0 : deepProxy(),
    set:()=>true,
    apply:()=>deepProxy(),
  });
}
const elements = new Map();
const el = id => { if (!elements.has(id)) elements.set(id, deepProxy()); return elements.get(id); };

const windowStub = {
  innerWidth:1440, innerHeight:900, devicePixelRatio:1,
  addEventListener(){}, AudioContext:undefined,
};
const documentStub = { getElementById: el };
let rafCb = null;
const raf = cb => { rafCb = cb; };

const fn = new Function('window','document','requestAnimationFrame', code);
fn(windowStub, documentStub, raf);
const api = windowStub.__crash;
if (!api) { console.error('FAIL: __crash hook missing'); process.exit(1); }

/* ---------- assertion helpers ---------- */
let failures = 0;
function check(name, cond, detail=''){
  const ok = !!cond;
  console.log(`${ok?'PASS':'FAIL'}  ${name}${detail?`  [${detail}]`:''}`);
  if (!ok) failures++;
}

/* ---------- 1. initial scene ---------- */
api.reset();
let s = api.state();
check('initial state ready', s.state==='ready', s.state);
check('default brick count 200', s.bricks===200, `bricks=${s.bricks}`);
check('default body count 202', s.bodies===202, `bodies=${s.bodies}`);
check('default dt is 1/240', Math.abs(s.dt-1/240)<1e-9, `dt=${s.dt}`);
check('car parked at start', Math.abs(s.carX-3.1)<1e-6, `carX=${s.carX}`);
check('wall front at 33.2', Math.abs(s.wallFront-33.2)<1e-6, `wf=${s.wallFront}`);
check('no NaN at build', !s.nan);
check('no displacement at build', s.displaced===0);

/* ---------- 2. default run to settlement ---------- */
api.test();
api.step(240);                       // t = 1.0s
s = api.state();
check('car accelerating at t=1s', !s.impacted && s.carV>9 && s.carV<12, `v=${s.carV}`);
api.step(240);                       // t = 2.0s
s = api.state();
check('car nearly at target at t=2s', !s.impacted && s.carV>20.5 && s.carV<=22, `v=${s.carV}`);
let guard = 0;
while (api.state().state!=='settled' && guard < 240*60){ api.step(240); guard += 240; }
s = api.state();
check('run settles', s.state==='settled', `t=${s.t}`);
check('impact recorded', s.impacted);
check('impact speed ~22 m/s', Math.abs(s.impactSpeed-22)<0.3, `impact=${s.impactSpeed}`);
check('car reached the wall', s.carX > s.wallFront-8, `carX=${s.carX} wf=${s.wallFront}`);
check('car did not fly away', s.carX < s.wallFront+35, `carX=${s.carX}`);
check('car stopped', s.carV < 0.5, `carV=${s.carV}`);
check('massive wall damage at 22 m/s', s.displaced>40, `displaced=${s.displaced}/${s.bricks}`);
check('all bodies asleep at settle', s.awake===0, `awake=${s.awake}`);
check('no NaN after default run', !s.nan);
check('settled before timeout', s.t < 44, `t=${s.t}`);
const hash1 = s.hash, carX1 = s.carX, disp1 = s.displaced;

/* ---------- 3. determinism: identical repeat ---------- */
api.test();
guard = 0;
while (api.state().state!=='settled' && guard < 240*60){ api.step(240); guard += 240; }
s = api.state();
check('repeat run settles', s.state==='settled');
check('deterministic hash', s.hash===hash1, `${s.hash} vs ${hash1}`);
check('deterministic car position', s.carX===carX1, `${s.carX} vs ${carX1}`);
check('deterministic damage count', s.displaced===disp1, `${s.displaced} vs ${disp1}`);

/* ---------- 4. same settings via reset path are also identical ---------- */
api.reset();
api.test();
guard = 0;
while (api.state().state!=='settled' && guard < 240*60){ api.step(240); guard += 240; }
check('hash stable across reset+test', api.state().hash===hash1);

/* ---------- 5. gentle crash: 5 m/s into heaviest bricks ---------- */
for (const [k,v] of [['carSpeed',5],['cols',12],['rows',8],['layers',2],['brickMass',12]]) api.setParam(k,v);
api.test();
guard = 0;
while (api.state().state!=='settled' && guard < 240*60){ api.step(240); guard += 240; }
s = api.state();
check('gentle run settles', s.state==='settled', `t=${s.t}`);
check('gentle impact speed ~5', Math.abs(s.impactSpeed-5)<0.3, `impact=${s.impactSpeed}`);
check('heavy wall mostly survives', s.displaced < 60, `displaced=${s.displaced}`);
check('car stopped short of deep penetration', s.carX < s.wallFront+12, `carX=${s.carX} wf=${s.wallFront}`);
check('no NaN in gentle run', !s.nan);
const gentleDisp = s.displaced;
check('heavier wall resists better than default', gentleDisp < disp1, `${gentleDisp} < ${disp1}`);

/* ---------- 6. fast crash: 45 m/s, light bricks ---------- */
for (const [k,v] of [['carSpeed',45],['brickMass',0.5]]) api.setParam(k,v);
api.test();
guard = 0;
while (api.state().state!=='settled' && guard < 240*60){ api.step(240); guard += 240; }
s = api.state();
check('fast run settles', s.state==='settled', `t=${s.t}`);
check('fast impact speed ~45', Math.abs(s.impactSpeed-45)<0.4, `impact=${s.impactSpeed}`);
check('fast crash devastates wall', s.displaced>100, `displaced=${s.displaced}`);
check('no NaN in fast run', !s.nan);

/* ---------- 7. extreme settings stress (1960 bricks, dt 1/120) ---------- */
for (const [k,v] of [['carSpeed',45],['cols',24],['rows',16],['layers',5],['brickMass',12]]) api.setParam(k,v);
api.test();
s = api.state();
check('extreme brick count 1960', s.bricks===1960, `bricks=${s.bricks}`);
check('extreme dt is 1/120', Math.abs(s.dt-1/120)<1e-9, `dt=${s.dt}`);
api.step(120*14);                  // 14 simulated seconds
s = api.state();
check('extreme run impacted', s.impacted);
check('car slowed by mega wall', s.carV < 45, `carV=${s.carV}`);
check('car did not tunnel past scene', s.carX < s.wallFront+60, `carX=${s.carX}`);
check('no NaN in extreme run', !s.nan);

/* ---------- 8. min wall, min speed ---------- */
for (const [k,v] of [['carSpeed',5],['cols',4],['rows',3],['layers',1],['brickMass',0.5]]) api.setParam(k,v);
api.test();
guard = 0;
while (api.state().state!=='settled' && guard < 240*60){ api.step(240); guard += 240; }
s = api.state();
check('tiny wall run settles', s.state==='settled', `t=${s.t}`);
check('no NaN in tiny run', !s.nan);

console.log(failures===0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures===0 ? 0 : 1);
