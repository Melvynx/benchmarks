const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
src = src.split('/*__RENDER__*/')[0].split('/* =====================================================================\n   6.')[0];
const api = new Function(src + '\nreturn { Experiment, DEFAULTS, SIM };')();
const { Experiment, DEFAULTS } = api;
function run(over = {}, seconds = 20) {
  const t0 = Date.now();
  const e = new Experiment({ ...DEFAULTS, ...over });
  e.start();
  const frames = Math.round(seconds * 60);
  let maxFrameMs = 0;
  for (let i = 0; i < frames && e.running; i++) { const a = performance.now(); e.stepFrame(); maxFrameMs = Math.max(maxFrameMs, performance.now() - a); }
  const s = e.summary();
  s.wallMs = Date.now() - t0; s.maxFrameMs = +maxFrameMs.toFixed(1); s.avgFrameMs = +(s.wallMs / e.frame).toFixed(2);
  return s;
}
const which = process.argv[2] || 'default';
const cases = {
  default: [{}],
  det: [{}, {}],
  sweep: [{}, { brickMass: 12 }, { carSpeed: 8 }, { carSpeed: 45 }, { brickMass: 0.5, carSpeed: 45 }, { cols: 4, rows: 3, layers: 1 }, { carSpeed: 5, cols: 24, rows: 16, layers: 5, brickMass: 12 }],
  max: [{ carSpeed: 45, cols: 24, rows: 16, layers: 5, brickMass: 0.5 }],
  mid: [{ carSpeed: 12 }, { carSpeed: 15, brickMass: 6 }, { layers: 1 }, { layers: 5 }, { rows: 16 }, { rows: 3 }, { cols: 24 }, { brickMass: 0.5 }, { carSpeed: 5 }, { gravity: 25, brickFriction: 0.05 }, { brickRestitution: 0.8, groundFriction: 0.1 }, { carMass: 4000, carSpeed: 30 }, { carMass: 500 }],
};
for (const c of cases[which]) console.log(JSON.stringify(c), JSON.stringify(run(c)));
