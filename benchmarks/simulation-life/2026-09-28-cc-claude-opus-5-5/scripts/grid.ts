import { Simulation } from '../src/sim.ts';
import { presetParams } from '../src/params.ts';
const args = (globalThis as any).process.argv.slice(2);
const base = JSON.parse(args[0] ?? '{}');
const grid: Record<string, number[]> = JSON.parse(args[1]);
const secs = Number(args[2] ?? 1200);
const seeds = Number(args[3] ?? 5);
const keys = Object.keys(grid);
const combos: Record<string, number>[] = [{}];
for (const k of keys) {
  const next: Record<string, number>[] = [];
  for (const c of combos) for (const v of grid[k]) next.push({ ...c, [k]: v });
  combos.splice(0, combos.length, ...next);
}
const out: { s: number; line: string }[] = [];
for (const c of combos) {
  let alive = 0, crossings = 0, bsum = 0, rsum = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const sim = new Simulation({ ...presetParams('balanced', seed), ...base, ...c });
    while (sim.t < secs && (sim.blueCount > 0 && sim.redCount > 0)) sim.step();
    if (sim.blueCount > 0 && sim.redCount > 0) alive++;
    // count red oscillation: crossings of its own mean, smoothed
    const r = sim.history.map((h) => h.red);
    const m = r.reduce((a, v) => a + v, 0) / r.length;
    let above = r[0] > m;
    for (let i = 0; i < r.length; i += 10) { const a = r[i] > m * 1.15 ? true : r[i] < m * 0.85 ? false : above; if (a !== above) crossings++; above = a; }
    const tail = sim.history.slice(-600);
    bsum += tail.reduce((a, h) => a + h.blue, 0) / tail.length;
    rsum += tail.reduce((a, h) => a + h.red, 0) / tail.length;
  }
  out.push({ s: alive * 100 + crossings / seeds, line: `${JSON.stringify(c)} alive ${alive}/${seeds} cross ${(crossings / seeds).toFixed(1)} tail b ${(bsum / seeds).toFixed(0)} r ${(rsum / seeds).toFixed(0)}` });
}
out.sort((a, b) => b.s - a.s);
console.log(out.slice(0, 15).map((o) => o.line).join('\n'));
