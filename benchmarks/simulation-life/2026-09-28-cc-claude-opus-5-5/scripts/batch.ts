import { Simulation, setTune } from '../src/sim.ts';
import { presetParams } from '../src/params.ts';
const args = (globalThis as any).process.argv.slice(2);
const preset = args[0] ?? 'balanced';
const secs = Number(args[1] ?? 900);
const overrides = args[2] ? JSON.parse(args[2]) : {};
if (args[3]) { const [a, b] = args[3].split(",").map(Number); setTune(a, b); }
let survive = 0;
const rows: string[] = [];
for (let seed = 1; seed <= 8; seed++) {
  const sim = new Simulation({ ...presetParams(preset, seed), ...overrides });
  let redGone = -1, blueGone = -1;
  let bmax = 0, rmax = 0, peaks = 0, last = 0, rising = true;
  while (sim.t < secs) {
    sim.step();
    if (redGone < 0 && sim.redCount === 0) redGone = Math.round(sim.t);
    if (blueGone < 0 && sim.blueCount === 0) blueGone = Math.round(sim.t);
    bmax = Math.max(bmax, sim.blueCount); rmax = Math.max(rmax, sim.redCount);
  }
  const h = sim.history.filter((_, i) => i % 20 === 0).map((s) => s.red);
  for (const v of h) { if (rising && v < last - 3) { peaks++; rising = false; } else if (!rising && v > last + 3) rising = true; last = v; }
  if (redGone < 0 && blueGone < 0) survive++;
  const tail = sim.history.slice(-400);
  const avg = (k: 'blue' | 'red' | 'fruit') => Math.round(tail.reduce((a, s) => a + s[k], 0) / tail.length);
  rows.push(`s${seed}: redGone=${redGone} blueGone=${blueGone} bmax=${bmax} rmax=${rmax} redPeaks~${peaks} tail b/r/f=${avg('blue')}/${avg('red')}/${avg('fruit')}`);
}
console.log(preset, JSON.stringify(overrides), `both alive ${survive}/8`);
console.log(rows.join('\n'));
