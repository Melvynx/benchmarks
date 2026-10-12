const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let base = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')).split('/*__RENDER__*/')[0];
const R = (a, b) => s => { if (!s.includes(a)) throw new Error('missing ' + a); return s.split(a).join(b); };
const chain = (...fs) => s => fs.reduce((acc, f) => f(acc), s);
const variants = {
  baseline: s => s,
  noRestitution: R('if (vn < -SIM.restitutionThreshold && p.sep < SIM.slop)', 'if (false)'),
  noFriction: R('const maxF = mu * p.jn;', 'const maxF = 0;'),
  sub8: R('substeps: 4,', 'substeps: 8,'),
  softPos: chain(R('beta: 0.3,', 'beta: 0.1,'), R('maxCorrection: 0.05,', 'maxCorrection: 0.004,')),
  noPosIt30: chain(R('posIters: 3', 'posIters: 0'), R('velIters: 8', 'velIters: 30')),
  noSpecAll: chain(R('let target = p.sep > 0 ? -p.sep * invH : 0;', 'let target = 0;'), R('if (p.sep > 0) target = -p.sep * invH;', 'if (p.sep > 0) target = 0;')),
};
const pre = process.argv[2] === 'pre';
for (const [name, fn] of Object.entries(variants)) {
  const src = fn(base);
  const { World, Body, Shape, SIM, DEFAULTS } = new Function(src + '\nreturn { World, Body, Shape, SIM, DEFAULTS };')();
  const w = new World({ ...DEFAULTS, layers: 1 });
  for (let r = 0; r < 16; r++) { const b = new Body('brick'); b.layer = 0; b.addShape(new Shape([[-.25,-.12],[.25,-.12],[.25,.12],[-.25,.12]], { kind:'brick', friction:.72, restitution:.18 })); b.setMass(2.5, 2.5*(.25+.0576)/12); b.x = 0; b.y = .12 + .24*r; w.add(b); }
  const h = SIM.frameDt / SIM.substeps;
  if (pre) { w.prestress(h, 40); for (const b of w.bricks) b.wake(); }
  let maxV = 0;
  for (let s = 0; s < 240 * SIM.substeps / 4; s++) { w.substep(h); for (const b of w.bricks) maxV = Math.max(maxV, Math.abs(b.vy)); }
  console.log(name.padEnd(14), 'maxV', maxV.toFixed(3), 'topY', w.bricks[15].y.toFixed(4));
}
