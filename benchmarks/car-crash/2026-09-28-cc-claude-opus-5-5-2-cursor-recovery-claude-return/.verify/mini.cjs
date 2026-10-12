const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
src = src.split('/*__RENDER__*/')[0];
const X = new Function(src + '\nreturn { World, Body, Shape, SIM, DEFAULTS, collidePolys, CP };')();
const { World, Body, Shape, SIM, DEFAULTS } = X;
function brick(w, layer, x, y, bw = 0.5, bh = 0.24, m = 2.5) {
  const b = new Body('brick'); b.layer = layer;
  const hw = bw / 2, hh = bh / 2;
  b.addShape(new Shape([[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]], { kind: 'brick', friction: 0.72, restitution: 0.18 }));
  b.setMass(m, m * (bw*bw + bh*bh) / 12); b.x = x; b.y = y; w.add(b); return b;
}
function sim(name, build, secs = 2, prestress = true) {
  const w = new World({ ...DEFAULTS, layers: 1 });
  build(w);
  const h = SIM.frameDt / SIM.substeps;
  if (prestress) { w.prestress(h, 40); for (const b of w.bricks) b.wake(); }
  let out = [];
  for (let f = 0; f < secs * 60; f++) {
    for (let i = 0; i < SIM.substeps; i++) w.substep(h);
    if (f === 0 || f === 10 || f === secs * 60 - 1) {
      let maxV = 0, maxDisp = 0;
      for (const b of w.bricks) { maxV = Math.max(maxV, Math.hypot(b.vx, b.vy)); maxDisp = Math.max(maxDisp, Math.hypot(b.x - b.x0, b.y - b.y0)); }
      out.push(`f${f}: maxV=${maxV.toFixed(4)} disp=${maxDisp.toFixed(4)} asleep=${w.bricks.filter(b=>b.sleeping).length}/${w.bricks.length}`);
    }
  }
  console.log(name.padEnd(28), out.join(' | '));
}
sim('single brick', w => brick(w, 0, 0, 0.12));
sim('single brick no prestress', w => brick(w, 0, 0, 0.12), 2, false);
sim('column of 16', w => { for (let r = 0; r < 16; r++) brick(w, 0, 0, 0.12 + 0.24 * r); });
sim('column of 16 no prestress', w => { for (let r = 0; r < 16; r++) brick(w, 0, 0, 0.12 + 0.24 * r); }, 2, false);
sim('row of 4', w => { for (let c = 0; c < 4; c++) brick(w, 0, c * 0.5, 0.12); });
sim('row of 4 gap', w => { for (let c = 0; c < 4; c++) brick(w, 0, c * 0.502, 0.12); });
sim('bond 2 rows', w => { brick(w,0,0,0.12); brick(w,0,0.5,0.12); brick(w,0,0.25,0.36); });
sim('bond 2 rows no prestress', w => { brick(w,0,0,0.12); brick(w,0,0.5,0.12); brick(w,0,0.25,0.36); }, 2, false);
