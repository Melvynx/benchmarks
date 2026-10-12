import { Sim, DEFAULTS, K } from '../src/sim.js';
const base = JSON.parse(process.argv[2]);
const kgrid = JSON.parse(process.argv[3]); // array of K overrides
const T = 3500;
const K0 = { ...K };
for (const ko of kgrid) {
  Object.assign(K, K0, ko);
  let out = [];
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const s = new Sim({ ...DEFAULTS, ...base, seed });
    while (s.t < T) { s.step(); s.events.length = 0; }
    const h = s.history.filter((x) => x.t > T / 2);
    const alive = s.stats.red > 0;
    const bs = h.map((x) => x.blue), rs = h.map((x) => x.red);
    out.push(`${alive ? 'R' : 'x'}${s.stats.blue > 0 ? 'B' : 'x'}[b${Math.min(...bs)}-${Math.max(...bs)} r${Math.min(...rs)}-${Math.max(...rs)}]`);
  }
  console.log(JSON.stringify(ko), out.join(' '));
}
