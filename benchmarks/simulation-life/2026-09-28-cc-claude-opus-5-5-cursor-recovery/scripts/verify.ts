import { Simulation } from '../src/sim.ts';
import { PRESETS, presetParams } from '../src/params.ts';
const secs = 900;
for (const pr of PRESETS) {
  for (let seed = 1; seed <= 4; seed++) {
    const sim = new Simulation(presetParams(pr.id, seed));
    while (sim.t < secs) sim.step();
    const h = sim.history;
    const bmax = Math.max(...h.map((s) => s.blue));
    const rmax = Math.max(...h.map((s) => s.red));
    const tBmax = h.find((s) => s.blue === bmax)!.t;
    const tail = h.slice(-600);
    const tb = Math.round(tail.reduce((a, s) => a + s.blue, 0) / tail.length);
    const tr = Math.round(tail.reduce((a, s) => a + s.red, 0) / tail.length);
    const pts = h.filter((_, i) => i % 120 === 0).map((s) => `${s.blue}/${s.red}`).join(' ');
    console.log(`${pr.id.padEnd(9)} s${seed} bmax=${bmax}@${Math.round(tBmax)}s rmax=${rmax} last5min b/r=${tb}/${tr} end=${sim.blueCount}/${sim.redCount} | ${pts}`);
  }
}
