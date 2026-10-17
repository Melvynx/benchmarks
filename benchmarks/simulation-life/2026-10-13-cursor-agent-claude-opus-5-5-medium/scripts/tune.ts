import { Sim, TUNING, IDLE_COST, MOVE_COST, type Params } from "../src/sim";
import { PRESETS } from "../src/presets";

const argv = (globalThis as { process?: { argv: string[] } }).process?.argv ?? [];
const only = argv[2] && argv[2] !== "all" ? argv[2] : undefined;
const over: Partial<Params> = argv[3] ? JSON.parse(argv[3]) : {};
const duration = Number(argv[4] ?? 1500);
if (argv[5]) Object.assign(TUNING, JSON.parse(argv[5]));
if (argv[6]) {
  const c = JSON.parse(argv[6]);
  if (c.idle) Object.assign(IDLE_COST, c.idle);
  if (c.move) Object.assign(MOVE_COST, c.move);
}
const every = Number(argv[7] ?? 50);
const seeds = [7, 11, 23];

for (const preset of PRESETS) {
  if (only && preset.id !== only) continue;
  for (const seed of [...new Set([preset.params.seed, ...seeds])]) {
    const sim = new Sim({ ...preset.params, ...over, seed });
    const rows: string[] = [];
    const t0 = performance.now();
    let tick = 0;
    let maxB = 0;
    let maxR = 0;
    const per = Math.round(every / Sim.DT);
    while (sim.time < duration) {
      sim.step();
      sim.events.length = 0;
      tick++;
      const c = sim.counts();
      maxB = Math.max(maxB, c.blue);
      maxR = Math.max(maxR, c.red);
      if (tick % per === 0) rows.push(`${c.blue}/${c.red}`);
      if (c.blue === 0 && c.red === 0) {
        rows.push(`dead@${sim.time.toFixed(0)}`);
        break;
      }
    }
    const ms = (performance.now() - t0).toFixed(0);
    sim.record();
    const h = sim.history[sim.history.length - 1];
    const tr = `bs${h.bs.toFixed(2)} bv${h.bv.toFixed(2)} rs${h.rs.toFixed(2)} rv${h.rv.toFixed(2)}`;
    console.log(`${preset.id.padEnd(9)} s${seed} ${ms}ms max ${maxB}/${maxR} ${tr} | ${rows.join(" ")}`);
  }
}
