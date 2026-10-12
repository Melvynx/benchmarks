const fs = require('fs');
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
let src = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
src = src.split('/* =====================================================================\n   6.')[0];
const { sinCos, expDet } = new Function(src + '\nreturn { sinCos, expDet };')();
let es = 0, ec = 0, ee = 0;
for (let i = 0; i <= 400000; i++) {
  const a = -200 + i * 0.001;
  const [s, c] = sinCos(a, [0, 0]);
  es = Math.max(es, Math.abs(s - Math.sin(a)));
  ec = Math.max(ec, Math.abs(c - Math.cos(a)));
}
for (let i = 0; i <= 100000; i++) {
  const x = -40 + i * 0.0004;
  ee = Math.max(ee, Math.abs(expDet(x) - Math.exp(x)) / Math.exp(x));
}
console.log(JSON.stringify({ maxAbsErrSin: es, maxAbsErrCos: ec, maxRelErrExp: ee }));
