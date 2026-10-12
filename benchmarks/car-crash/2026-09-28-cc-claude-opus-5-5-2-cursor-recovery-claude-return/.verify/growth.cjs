const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>')).split('/*__RENDER__*/')[0];
if (process.argv[2] === 'nosleep') src = src.replace('if (b.canSleep && v2 < sl2 && w2 < sa2)', 'if (false)');
const { World, Body, Shape, SIM, DEFAULTS } = new Function(src + '\nreturn { World, Body, Shape, SIM, DEFAULTS };')();
for (const N of [2, 4, 6, 8, 12, 16]) {
  const w = new World({ ...DEFAULTS, layers: 1 });
  for (let r = 0; r < N; r++) { const b = new Body('brick'); b.layer = 0; b.addShape(new Shape([[-.25,-.12],[.25,-.12],[.25,.12],[-.25,.12]], { kind:'brick', friction:.72, restitution:.18 })); b.setMass(2.5, 2.5*(.25+.0576)/12); b.x = 0; b.y = .12 + .24*r; w.add(b); }
  const h = SIM.frameDt / SIM.substeps;
  const rows = [];
  let firstSleep = -1;
  for (let s = 0; s < 1200; s++) {
    w.substep(h);
    if (firstSleep < 0 && w.bricks.some(b => b.sleeping)) firstSleep = s;
    if (s % 200 === 199) { let mv = 0; for (const b of w.bricks) mv = Math.max(mv, Math.abs(b.vy)); rows.push(`s${s + 1}:v${mv.toFixed(3)} sl${w.bricks.filter(b => b.sleeping).length}`); }
  }
  console.log(`N=${N} firstSleepStep=${firstSleep}`, rows.join(' '));
}
