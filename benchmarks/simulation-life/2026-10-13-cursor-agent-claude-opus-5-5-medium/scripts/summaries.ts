import { Sim } from "../src/sim";
import { PRESETS } from "../src/presets";
import { summarize } from "../src/analysis";

const argv = (globalThis as { process?: { argv: string[] } }).process?.argv ?? [];
const until = Number(argv[2] ?? 900);

for (const preset of PRESETS) {
  const sim = new Sim(preset.params);
  for (const t of [120, until]) {
    while (sim.time < t) {
      sim.step();
      sim.events.length = 0;
    }
    const c = sim.counts();
    const s = summarize(sim.history, sim.stats, sim.p, sim.time);
    console.log(`\n[${preset.id} @${t}s] ${c.blue} blue / ${c.red} red / ${sim.totalFruit()} fruit -> ${s.headline} (${s.mood})`);
    for (const l of s.lines) console.log("  - " + l);
  }
}
