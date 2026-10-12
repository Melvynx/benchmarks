import { Sim, BASE, PRESETS } from '../src/sim.js';

const T = Number(process.argv[2] || 1200);
const only = process.argv[3];
for (const [name, over] of Object.entries(PRESETS)) {
  if (only && !name.toLowerCase().includes(only)) continue;
  for (const seed of [1234, 7, 99]) {
    const p = { ...BASE, ...over, seed };
    const s = new Sim(p);
    const line = [];
    let minB = 1e9, maxB = 0, minR = 1e9, maxR = 0;
    let n = 0;
    while (s.t < T) {
      s.step(0.05);
      if (++n % 1200 === 0) {
        line.push(`${s.blues.length}/${s.reds.length}/${s.totalFruit()}`);
        if (s.t > T / 3) { minB = Math.min(minB, s.blues.length); maxB = Math.max(maxB, s.blues.length); minR = Math.min(minR, s.reds.length); maxR = Math.max(maxR, s.reds.length); }
      }
    }
    console.log(`${name} seed ${seed}: blue[${minB}-${maxB}] red[${minR}-${maxR}]  ${line.filter((_, i) => i % 1 === 0).join(' ')}`);
  }
}
