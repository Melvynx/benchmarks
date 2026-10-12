import { Sim, DEFAULTS, K } from '../src/sim.js';
Object.assign(K, JSON.parse(process.argv[2]));
const pv = JSON.parse(process.argv[3]);
const T = Number(process.argv[4] || 2500), seed = Number(process.argv[5] || 1);
const s = new Sim({ ...DEFAULTS, ...pv, seed });
while (s.t < T) { s.step(); s.events.length = 0; }
const h = s.history;
let out = [];
for (let i = 0; i < h.length; i += 25) out.push(`${h[i].blue}/${h[i].red}/${h[i].fruit}`);
console.log(out.join(' '));
