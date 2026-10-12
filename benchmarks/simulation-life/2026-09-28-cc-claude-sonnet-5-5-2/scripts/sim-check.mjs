import { Sim, DEFAULTS, PRESETS } from '../src/sim.js';
const only = process.argv[2];
const T = Number(process.argv[3] || 1500);
for (const [k, pr] of Object.entries(PRESETS)) {
  if (only && only !== k) continue;
  for (const seed of only ? [1, 2, 3] : [7]) {
    const s = new Sim({ ...DEFAULTS, ...pr.p, seed });
    let line = [];
    const t0 = Date.now();
    while (s.t < T) {
      s.step();
      s.events.length = 0;
      if (Math.abs((s.t % 100)) < 0.03) line.push(`${s.stats.blue}/${s.stats.red}/${s.stats.fruit}`);
    }
    const h = s.history;
    const max = (k) => Math.max(...h.map((x) => x[k]));
    console.log(k, 'seed', seed, `end b${s.stats.blue} r${s.stats.red} f${s.stats.fruit}`, `peak b${max('blue')} r${max('red')}`, `${Date.now() - t0}ms`);
    console.log('  ', line.join(' '));
  }
}
