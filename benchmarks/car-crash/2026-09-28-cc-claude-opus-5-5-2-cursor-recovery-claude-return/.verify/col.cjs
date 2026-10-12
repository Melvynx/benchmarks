const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
src = src.split('/*__RENDER__*/')[0];
const X = new Function(src + '\nreturn { World, Body, Shape, SIM, DEFAULTS };')();
const { World, Body, Shape, SIM, DEFAULTS } = X;
const N = +process.argv[2] || 3;
const w = new World({ ...DEFAULTS, layers: 1 });
for (let r = 0; r < N; r++) { const b = new Body('brick'); b.layer = 0; b.addShape(new Shape([[-.25,-.12],[.25,-.12],[.25,.12],[-.25,.12]], { kind:'brick', friction:.72, restitution:.18 })); b.setMass(2.5, 2.5*(.25+.0576)/12); b.x = 0; b.y = .12 + .24*r; w.add(b); }
const h = SIM.frameDt / SIM.substeps;
for (let s = 0; s < 6; s++) {
  w.substep(h);
  console.log('step', s, w.active.map(m => `[${m.sa.id}-${m.sb.id} n=(${m.nx.toFixed(2)},${m.ny.toFixed(2)}) c=${m.count} ` + m.p.slice(0, m.count).map(p => `id${p.id} sep=${p.sep.toFixed(5)} jn=${p.jn.toFixed(4)} jt=${p.jt.toFixed(4)} x=${p.x.toFixed(3)}`).join(' ; ') + ']').join('\n    '));
  console.log('   bodies', w.bricks.map(b => `y=${b.y.toFixed(5)} vy=${b.vy.toFixed(4)} vx=${b.vx.toFixed(4)} w=${b.w.toFixed(4)}`).join(' | '));
}
