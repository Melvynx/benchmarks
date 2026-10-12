const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('index.html', 'utf8');
const src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
vm.runInThisContext(src);
const L = globalThis.__crashlab;
function run(cfg, label, T = 12) {
  const w = L.createWorld(cfg);
  const t0 = Date.now();
  // pre-impact stability: settle wall for 1s without launching
  w.phase = 'dynamic';
  w.car.x = -100; w.car.vx = 0; w.car.sleepT = 1;
  let maxDrift = 0;
  const start = w.bricks.map(b => [b.x, b.y, b.z]);
  for (let i = 0; i < 480; i++) L.step(w, L.DT);
  for (let i = 0; i < w.bricks.length; i++) {
    const b = w.bricks[i];
    maxDrift = Math.max(maxDrift, Math.hypot(b.x - start[i][0], b.y - start[i][1], b.z - start[i][2]));
  }
  const idle = { drift: maxDrift.toFixed(4), awake: w.stats.awake };
  const w2 = L.createWorld(cfg);
  w2.phase = 'launch';
  let impactT = null;
  const n = Math.round(T / L.DT);
  let nan = false;
  for (let i = 0; i < n && w2.phase !== 'settled'; i++) {
    L.step(w2, L.DT);
    if (impactT == null && w2.phase === 'dynamic') impactT = w2.simTime;
    if (i % 480 === 0 && !Number.isFinite(w2.car.x)) { nan = true; break; }
  }
  let toppled = 0, maxX = 0, maxY = 0, standing = 0;
  for (const b of w2.bricks) {
    if (!Number.isFinite(b.x + b.y + b.z + b.a)) nan = true;
    maxX = Math.max(maxX, b.x); maxY = Math.max(maxY, b.y);
    if (b.y > 0.1 && Math.abs(b.a) < 0.15) standing++;
  }
  console.log(label, JSON.stringify({ idle, phase: w2.phase, simT: w2.simTime.toFixed(2), impactT: impactT && impactT.toFixed(2),
    carX: w2.car.x.toFixed(2), carV: w2.car.vx.toFixed(2), bricks: w2.bricks.length, moving: w2.moving, maxX: maxX.toFixed(2), maxY: maxY.toFixed(2),
    maxPen: w2.stats.maxPen.toFixed(3), nan, wallMs: Date.now() - t0 }));
  return L.snapshotPhysics(w2);
}
const D = L.DEFAULTS;
const a = run(D, 'default');
const b = run(D, 'default-repeat');
let same = a.length === b.length; for (let i = 0; i < a.length && same; i++) if (a[i] !== b[i]) same = false;
console.log('deterministic:', same);
run({ ...D, speed: 5 }, 'slow5');
run({ ...D, speed: 45 }, 'fast45');
run({ ...D, mass: 12 }, 'heavy12');
run({ ...D, mass: 0.5 }, 'light0.5');
run({ ...D, columns: 24, rows: 16, layers: 5 }, 'max-wall');
run({ ...D, columns: 4, rows: 3, layers: 1 }, 'min-wall');
