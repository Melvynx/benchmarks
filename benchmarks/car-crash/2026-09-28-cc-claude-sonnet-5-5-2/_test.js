const fs = require('fs');
const src = fs.readFileSync(__dirname + '/_script.js', 'utf8');
const m = { exports: {} };
new Function('module', src)(m);
const { createScene, DEFAULTS, STEP } = m.exports;

function run(over, opts = {}) {
  const P = Object.assign({}, DEFAULTS, over);
  const sc = createScene(P);
  const w = sc.world;
  const seconds = opts.seconds || 12;
  const n = Math.round(seconds / STEP);
  let impactSpeed = null, nan = false, maxV = 0;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < n; i++) {
    const before = sc.car.vx;
    w.step();
    if (w.hit && impactSpeed === null) impactSpeed = before;
    for (const b of w.bodies) {
      if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.c)) nan = true;
      const v = Math.hypot(b.vx, b.vy); if (v > maxV) maxV = v;
    }
    if (nan) break;
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  let disp = 0, maxX = 0, minY = 1e9, maxY = 0, fast = 0;
  for (const b of sc.bricks) {
    if (Math.abs(b.x - b.x0) > 0.12 || Math.abs(b.y - b.y0) > 0.12 || Math.abs(Math.atan2(b.s, b.c)) > 0.12) disp++;
    maxX = Math.max(maxX, b.x); minY = Math.min(minY, b.y);
    if (Math.hypot(b.vx, b.vy) > 0.1) fast++;
  }
  return { impactSpeed, hitT: w.hitTime, carX: sc.car.x, carVx: sc.car.vx, carY: sc.car.y, carAng: Math.atan2(sc.car.s, sc.car.c),
    disp, total: sc.bricks.length, maxX, minY, moving: fast, nan, maxV, msPerStep: ms / n, peakF: w.peakForce, wallRight: sc.wallRight, sig: sc.bricks.slice(0, 6).map(b => b.x.toFixed(9)).join(',') };
}
const fmt = (o) => JSON.stringify(o, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v);

const which = process.argv[2] || 'default';
if (which === 'rest') {
  for (const cfg of [{}, { cols: 24, rows: 16, layers: 5, brickMass: 12 }, { cols: 4, rows: 3, layers: 1, brickMass: 0.5 }, { cols: 24, rows: 16, layers: 1, brickMass: 0.5 }]) {
    const P = Object.assign({}, DEFAULTS, cfg);
    const sc = createScene(P);
    // no car motion: park car far away by disabling tow
    sc.car.tow = false; sc.world.towTarget = 0;
    sc.car.x = -50;
    for (let i = 0; i < 600; i++) sc.world.step();
    let maxDx = 0, maxDy = 0, maxA = 0;
    for (const b of sc.bricks) { maxDx = Math.max(maxDx, Math.abs(b.x - b.x0)); maxDy = Math.max(maxDy, Math.abs(b.y - b.y0)); maxA = Math.max(maxA, Math.abs(Math.atan2(b.s, b.c))); }
    console.log('REST', fmt(cfg), 'maxDx', maxDx.toFixed(4), 'maxDy', maxDy.toFixed(4), 'maxAng', maxA.toFixed(4));
  }
} else if (which === 'default') {
  const a = run({});
  console.log('DEFAULT', fmt(a));
  const b = run({});
  console.log('DETERMINISTIC', a.sig === b.sig && a.carX === b.carX, a.sig);
} else if (which === 'sweep') {
  const cfgs = [
    { speed: 5 }, { speed: 45 }, { speed: 45, brickMass: 12, layers: 5, cols: 24, rows: 16 },
    { speed: 5, brickMass: 12, layers: 5, cols: 24, rows: 16 }, { speed: 45, brickMass: 0.5, layers: 1, cols: 4, rows: 3 },
    { speed: 22, cols: 24, rows: 16, layers: 5 }, { speed: 30, brickMass: 12 }, { speed: 45, cols: 24, rows: 16, layers: 1, brickMass: 0.5 }
  ];
  for (const c of cfgs) console.log('CFG', fmt(c), '\n   ', fmt(run(c, { seconds: 15 })));
}
