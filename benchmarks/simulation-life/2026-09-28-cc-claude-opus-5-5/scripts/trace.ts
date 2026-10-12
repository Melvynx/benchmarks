import { Simulation, setTune } from '../src/sim.ts';
import { presetParams } from '../src/params.ts';
const args = (globalThis as any).process.argv.slice(2);
const sim = new Simulation({ ...presetParams(args[0], Number(args[2])), ...(args[3] ? JSON.parse(args[3]) : {}) });
if (args[4]) { const [a, b] = args[4].split(',').map(Number); setTune(a, b); }
let lastBoops = 0, lastEat = 0;
while (sim.t < Number(args[1])) {
  sim.step();
  if (Math.abs(sim.t % 20) < 0.025 || Math.abs((sim.t % 20) - 20) < 0.025) {
    const h = sim.history[sim.history.length - 1];
    const acts: Record<string, number> = {};
    for (const b of sim.blobs) acts[b.action] = (acts[b.action] ?? 0) + 1;
    console.log(`t=${sim.t.toFixed(0)} f=${h.fruit} b=${h.blue} r=${h.red} boops+${sim.totals.boops - lastBoops} eat+${sim.totals.fruitEaten - lastEat} bE=${h.blueEnergy.toFixed(0)} rE=${h.redEnergy.toFixed(0)} bS=${h.blueSpeed.toFixed(2)} rS=${h.redSpeed.toFixed(2)} bV=${h.blueVision.toFixed(2)} ${JSON.stringify(acts)}`);
    lastBoops = sim.totals.boops; lastEat = sim.totals.fruitEaten;
  }
}
