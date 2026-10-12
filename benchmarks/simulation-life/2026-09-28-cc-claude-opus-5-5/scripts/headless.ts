import { Simulation } from '../src/sim.ts';
import { presetParams } from '../src/params.ts';

const args = (globalThis as any).process.argv.slice(2);
const preset = args[0] ?? 'balanced';
const secs = Number(args[1] ?? 600);
const seed = Number(args[2] ?? 42);
const overrides = args[3] ? JSON.parse(args[3]) : {};
const sim = new Simulation({ ...presetParams(preset, seed), ...overrides });
const t0 = Date.now();
while (sim.t < secs) sim.step();
const line: string[] = [];
for (const s of sim.history) {
  if (Math.round(s.t * 2) % 20 === 0) line.push(`${s.t.toFixed(0)}:${s.fruit}/${s.blue}/${s.red}`);
}
console.log(preset, 'seed', seed, 'ms', Date.now() - t0);
console.log(line.join('  '));
console.log(sim.totals);
