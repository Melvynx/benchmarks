const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let base = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')).split('/*__RENDER__*/')[0];
const variants = {
  baseline: s => s,
  noPos: s => s.replace('posIters: 3', 'posIters: 0'),
  noBlock: s => s.replace('if (k11 * k11 < 1000 * det)', 'if (false)'),
  noSpecVel: s => s.replace('let target = p.sep > 0 ? -p.sep * invH : 0;', 'let target = 0;'),
  noSpecPos: s => s.replace('if (p.sep > 0) target = -p.sep * invH;', 'if (p.sep > 0) target = 0;'),
  iters30: s => s.replace('velIters: 8', 'velIters: 30'),
  noWarm: s => s.replace('if (p.sep > 2 * SIM.slop) { p.jn = 0; p.jt = 0; }', 'p.jn = 0; p.jt = 0;'),
};
for (const [name, fn] of Object.entries(variants)) {
  const src = fn(base);
  if (src === base && name !== 'baseline') { console.log(name, 'PATTERN NOT FOUND'); continue; }
  const { World, Body, Shape, SIM, DEFAULTS } = new Function(src + '\nreturn { World, Body, Shape, SIM, DEFAULTS };')();
  const w = new World({ ...DEFAULTS, layers: 1 });
  for (let r = 0; r < 16; r++) { const b = new Body('brick'); b.layer = 0; b.addShape(new Shape([[-.25,-.12],[.25,-.12],[.25,.12],[-.25,.12]], { kind:'brick', friction:.72, restitution:.18 })); b.setMass(2.5, 2.5*(.25+.0576)/12); b.x = 0; b.y = .12 + .24*r; w.add(b); }
  const h = SIM.frameDt / SIM.substeps;
  let maxV = 0;
  for (let s = 0; s < 240; s++) { w.substep(h); for (const b of w.bricks) maxV = Math.max(maxV, Math.abs(b.vy)); }
  const top = w.bricks[15];
  console.log(name.padEnd(10), 'maxV', maxV.toFixed(3), 'topY', top.y.toFixed(4), '(expected 3.72)', 'asleep', w.bricks.filter(b => b.sleeping).length);
}
