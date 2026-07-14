/* Headless check: run each preset and report whether real waves emerge. */
const { createSimulation, PRESETS, DEFAULTS } = require('../js/sim.js');

const SPARK = '▁▂▃▄▅▆▇█';
function spark(arr, n = 60) {
  if (!arr.length) return '';
  // resample to n buckets
  const out = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.min(arr.length - 1, Math.floor((i / n) * arr.length));
    out.push(arr[idx]);
  }
  const lo = Math.min(...out), hi = Math.max(...out);
  return out.map((v) => SPARK[Math.round(((v - lo) / (hi - lo || 1)) * 7)]).join('');
}

// count local maxima that stand out above local troughs (prominence filter)
function countPeaks(arr, minProm) {
  // smooth a little
  const s = arr.map((_, i) => {
    let a = 0, c = 0;
    for (let k = -2; k <= 2; k++) { const j = i + k; if (j >= 0 && j < arr.length) { a += arr[j]; c++; } }
    return a / c;
  });
  let peaks = 0, lastMin = s[0], rising = true, lastPeak = -Infinity;
  for (let i = 1; i < s.length; i++) {
    if (rising) {
      if (s[i] < s[i - 1]) { // just crested
        if (s[i - 1] - lastMin > minProm) { peaks++; lastPeak = s[i - 1]; }
        rising = false; lastMin = s[i - 1];
      }
    } else {
      if (s[i] < lastMin) lastMin = s[i];
      if (s[i] > s[i - 1]) rising = true;
    }
  }
  return peaks;
}

// cross-correlation lag: positive => blue leads red
function leadLag(a, b, maxLag) {
  const norm = (x) => { const m = x.reduce((s, v) => s + v, 0) / x.length; return x.map((v) => v - m); };
  const A = norm(a), B = norm(b);
  let best = 0, bestC = -Infinity;
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let c = 0, n = 0;
    for (let i = 0; i < A.length; i++) {
      const j = i + lag;
      if (j < 0 || j >= B.length) continue;
      c += A[i] * B[j]; n++;
    }
    c /= (n || 1);
    if (c > bestC) { bestC = c; best = lag; }
  }
  return best; // in samples (0.5s each)
}

function run(name, preset, seconds) {
  const sim = createSimulation(Object.assign({}, preset.config));
  const stepReal = 0.1; // advance in 0.1s real chunks at simSpeed=1-ish
  // force simSpeed to 1 for deterministic wall-time mapping regardless of preset
  sim.config.simSpeed = 1;
  let acc = 0;
  while (sim.time < seconds) { sim.advance(0.2); acc++; if (acc > seconds * 20) break; }
  const h = sim.history;
  const bluePeaks = countPeaks(h.blue, Math.max(3, Math.max(...h.blue) * 0.12));
  const redPeaks = countPeaks(h.red, Math.max(2, Math.max(...h.red) * 0.12));
  // analyse tail half for steady behaviour
  const half = Math.floor(h.blue.length / 2);
  const lag = leadLag(h.blue.slice(half), h.red.slice(half), 60);
  const stats = (a) => ({ min: Math.min(...a), max: Math.max(...a), last: a[a.length - 1],
                          avg: +(a.reduce((s, v) => s + v, 0) / a.length).toFixed(1) });
  const b = stats(h.blue), r = stats(h.red), f = stats(h.fruit);
  console.log(`\n━━ ${name}  (${preset.label}) ━━  t=${sim.time.toFixed(0)}s`);
  console.log(`  fruit ${spark(h.fruit)}  min ${f.min.toFixed(0)} max ${f.max.toFixed(0)} last ${f.last.toFixed(0)}`);
  console.log(`  blue  ${spark(h.blue)}  min ${b.min} max ${b.max} avg ${b.avg} last ${b.last}  peaks≈${bluePeaks}`);
  console.log(`  red   ${spark(h.red)}  min ${r.min} max ${r.max} avg ${r.avg} last ${r.last}  peaks≈${redPeaks}`);
  console.log(`  blue leads red by ${(lag * 0.5).toFixed(1)}s   final blob totals: blue ${b.last} / red ${r.last}`);
  const alive = b.last > 0 && r.last > 0;
  console.log(`  => ${alive ? 'both groups alive' : 'a group faded'};  waves: blue ${bluePeaks} / red ${redPeaks}`);
  return { name, bluePeaks, redPeaks, alive, b, r, f, lag };
}

const seconds = parseInt(process.argv[3] || '600', 10);
const only = process.argv[2];
const keys = only && PRESETS[only] ? [only] : Object.keys(PRESETS);
const results = keys.map((k) => run(k, PRESETS[k], seconds));

console.log('\n──────── verdict ────────');
for (const r of results) {
  const tag = r.name === 'balanced' || r.name === 'fragile'
    ? (r.alive && r.bluePeaks >= 2 && r.redPeaks >= 2 ? 'OK waves' : 'CHECK')
    : 'info';
  console.log(`  ${r.name.padEnd(12)} blue[max ${String(r.b.max).padStart(3)} avg ${String(r.b.avg).padStart(5)}] red[max ${String(r.r.max).padStart(3)} avg ${String(r.r.avg).padStart(5)}] fruit[max ${r.f.max.toFixed(0)}] ${tag}`);
}
