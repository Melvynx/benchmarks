import { PRESETS, presetParams, type Params } from "../src/sim/params";
import { Simulation } from "../src/sim/simulation";
import { waveStats } from "../src/sim/summary";

const [presetId = "balanced", secondsArg = "2000", seedsArg = "1,2,3,4,5", ...sets] = process.argv.slice(2);
const preset = PRESETS.find((p) => p.id === presetId)!;
const seconds = Number(secondsArg);
const seeds = seedsArg.split(",").map(Number);

for (const set of sets.length ? sets : ["{}"]) {
  const overrides: Partial<Params> = JSON.parse(set);
  const rows: string[] = [];
  let both = 0;
  let waves = 0;
  for (const seed of seeds) {
    const sim = new Simulation({ ...presetParams(preset, seed), ...overrides });
    sim.collectEvents = false;
    const ticks = Math.round(seconds / 0.05);
    for (let i = 0; i < ticks; i++) {
      sim.step();
      if (sim.counts[0] === 0 && sim.counts[1] === 0) break;
    }
    const h = sim.history;
    const half = Math.floor(h.t.length / 2);
    const bl = h.blue.slice(half);
    const rd = h.red.slice(half);
    const w = waveStats(sim);
    const alive = sim.counts[0] > 0 && sim.counts[1] > 0;
    if (alive) both++;
    waves += w.waves;
    const ext = sim.markers.map((m) => `${m.kind ? "R" : "B"}@${Math.round(m.t)}`).join(" ");
    rows.push(
      `s${seed}: ${alive ? "ok " : "END"} b[${Math.min(...bl)}-${Math.max(...bl)}] r[${Math.min(...rd)}-${Math.max(...rd)}] pk=${sim.stats.peak[0]}/${sim.stats.peak[1]} waves=${w.waves} per=${w.period?.toFixed(0) ?? "-"} lag=${w.lag?.toFixed(0) ?? "-"} ${ext}`,
    );
  }
  console.log(`\n${presetId} ${set}  -> both alive ${both}/${seeds.length}, waves ${waves}`);
  for (const r of rows) console.log("  ", r);
}
