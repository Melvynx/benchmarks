import { PRESETS, presetParams, DEFAULT_PARAMS, type Params } from "../src/sim/params";
import { Simulation, DT, TUNING } from "../src/sim/simulation";
import { summarize } from "../src/sim/summary";

const args = process.argv.slice(2);
const duration = Number(args.find((a) => a.startsWith("--t="))?.slice(4) ?? 900);
const only = args.find((a) => a.startsWith("--preset="))?.slice(9);
const seeds = (args.find((a) => a.startsWith("--seeds="))?.slice(8) ?? "7").split(",").map(Number);
const every = Number(args.find((a) => a.startsWith("--every="))?.slice(8) ?? 30);
const quiet = args.includes("--quiet");
const overrides: Partial<Params> = Object.fromEntries(
  (args.find((a) => a.startsWith("--set="))?.slice(6) ?? "")
    .split(",")
    .filter(Boolean)
    .map((kv) => {
      const [k, v] = kv.split("=");
      return [k, Number(v)];
    }),
);

for (const kv of (args.find((a) => a.startsWith("--tune="))?.slice(7) ?? "").split(",").filter(Boolean)) {
  const [k, v] = kv.split("=");
  (TUNING as unknown as Record<string, number>)[k] = Number(v);
}

for (const preset of PRESETS) {
  if (only && preset.id !== only) continue;
  for (const seed of seeds) {
    const params: Params = { ...presetParams(preset.id, DEFAULT_PARAMS), ...overrides, seed };
    const sim = new Simulation(params);
    const rows: string[] = [];
    const t0 = performance.now();
    let maxBlobs = 0;
    while (sim.time < duration) {
      sim.step();
      sim.events.length = 0;
      maxBlobs = Math.max(maxBlobs, sim.blobs.length);
      if (sim.ticks % Math.round(every / DT) === 0) {
        rows.push(`${sim.time.toFixed(0).padStart(4)}s  fruit ${String(sim.countFruit()).padStart(3)}  blue ${String(sim.count("blue")).padStart(3)}  red ${String(sim.count("red")).padStart(3)}`);
      }
      if (sim.blobs.length === 0) break;
    }
    const ms = performance.now() - t0;
    console.log(`\n=== ${preset.name} seed=${seed}  (${ms.toFixed(0)}ms, max blobs ${maxBlobs})`);
    if (!quiet) console.log(rows.join("\n"));
    else console.log(sim.history.filter((_, i) => i % Math.round(every / sim.historyInterval) === 0).map((h) => `${h.blue}/${h.red}`).join(" "));
    const d = sim.stats.deaths;
    console.log(`  deaths blue starve/old/contact ${d.blue.starved}/${d.blue.old}/${d.blue.contact}  red starve/old ${d.red.starved}/${d.red.old}  births b/r ${sim.stats.births.blue}/${sim.stats.births.red}  contacts ${sim.stats.contacts} fruit ${sim.stats.fruitEaten}`);
    const s = summarize(sim.history, sim.stats, sim.params);
    console.log(s.lines.map((l) => ` • ${l}`).join("\n"));
  }
}
