const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
src = src.split('/*__RENDER__*/')[0];
const { Experiment, DEFAULTS, SIM } = new Function(src + '\nreturn { Experiment, DEFAULTS, SIM };')();
const over = JSON.parse(process.argv[2] || '{}');
const secs = +(process.argv[3] || 5);
const e = new Experiment({ ...DEFAULTS, ...over });
const w = e.world;
for (const b of w.bricks) b.wake();
const h = SIM.frameDt / SIM.substeps;
for (let f = 0; f < secs * 60; f++) {
  const a = performance.now();
  for (let i = 0; i < SIM.substeps; i++) w.substep(h);
  const ms = performance.now() - a;
  if (f % 30 === 0 || ms > 50) {
    let maxV = 0, awake = 0, maxDisp = 0, minY = 9;
    for (const b of w.bricks) { if (!b.sleeping) awake++; maxV = Math.max(maxV, Math.hypot(b.vx, b.vy)); maxDisp = Math.max(maxDisp, Math.hypot(b.x - b.x0, b.y - b.y0)); minY = Math.min(minY, b.minY); }
    console.log(`t=${(f/60).toFixed(2)} ms=${ms.toFixed(1)} awake=${awake} maxV=${maxV.toFixed(3)} maxDisp=${maxDisp.toFixed(4)} minY=${minY.toFixed(4)} manifolds=${w.manifolds.size} active=${w.active.length}`);
  }
}
