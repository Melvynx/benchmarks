import { Sim, DEFAULTS, PRESETS, K } from '../src/sim.js';
const kv = JSON.parse(process.argv[2] || '{}');
const pv = JSON.parse(process.argv[3] || '{}');
const T = Number(process.argv[4] || 2000);
Object.assign(K, kv);
for (const seed of [1, 2, 3, 4]) {
  const s = new Sim({ ...DEFAULTS, ...pv, seed });
  const line = [];
  let nextS = 100;
  while (s.t < T) { s.step(); s.events.length = 0; if (s.t >= nextS) { nextS += 100; line.push(`${s.stats.blue}/${s.stats.red}`); } }
  console.log(seed, line.join(' '));
}
