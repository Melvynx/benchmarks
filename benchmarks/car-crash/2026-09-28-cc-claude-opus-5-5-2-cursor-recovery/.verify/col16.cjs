const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
src = src.split('/*__RENDER__*/')[0];
const { World, Body, Shape, SIM, DEFAULTS } = new Function(src + '\nreturn { World, Body, Shape, SIM, DEFAULTS };')();
const N = +process.argv[2] || 16;
const w = new World({ ...DEFAULTS, layers: 1 });
for (let r = 0; r < N; r++) { const b = new Body('brick'); b.layer = 0; b.addShape(new Shape([[-.25,-.12],[.25,-.12],[.25,.12],[-.25,.12]], { kind:'brick', friction:.72, restitution:.18 })); b.setMass(2.5, 2.5*(.25+.0576)/12); b.x = 0; b.y = .12 + .24*r; w.add(b); }
const h = SIM.frameDt / SIM.substeps;
for (let s = 0; s < 12; s++) {
  w.substep(h);
  let worst = null, wv = 0;
  for (const b of w.bricks) { const v = Math.hypot(b.vx, b.vy) + Math.abs(b.w) * .3; if (v > wv) { wv = v; worst = b; } }
  const flipped = w.active.filter(m => m.sa.body.y > m.sb.body.y).length;
  const blocks = w.active.filter(m => m.block).length;
  console.log(`s${s} active=${w.active.length} block=${blocks} flippedOrder=${flipped} worst#${worst.index} y=${worst.y.toFixed(4)} vx=${worst.vx.toFixed(4)} vy=${worst.vy.toFixed(4)} w=${worst.w.toFixed(4)}`);
  if (s === 0 || s === 11) console.log('  ', w.active.map(m => `${m.sa.id}-${m.sb.id}:n(${m.nx.toFixed(2)},${m.ny.toFixed(2)})c${m.count}` + (m.count ? ` jn=${m.p[0].jn.toFixed(3)}/${m.p[1] ? m.p[1].jn.toFixed(3) : ''}` : '')).join(' '));
}
