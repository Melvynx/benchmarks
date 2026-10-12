import { presetParams, PRESETS, type Params } from "../src/sim/params";
import { createWorld, step } from "../src/sim/world";
import { summarize } from "../src/sim/summary";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const duration = Number(flag("t", "1200"));
const seeds = flag("seeds", "7").split(",").map(Number);
const presetIds = flag("preset", PRESETS.map((p) => p.id).join(",")).split(",");
const every = Number(flag("every", "30"));
const overrides: Partial<Params> = JSON.parse(flag("set", "{}"));
const quiet = args.includes("--quiet");

for (const id of presetIds) {
  for (const seed of seeds) {
    const params = { ...presetParams(id), ...overrides, seed };
    const w = createWorld(params);
    const started = performance.now();
    const rows: string[] = [];
    let nextPrint = 0;
    const steps = Math.round(duration / (1 / 20));
    for (let i = 0; i < steps; i++) {
      step(w);
      w.events.length = 0;
      if (w.time >= nextPrint) {
        rows.push(
          `${w.time.toFixed(0).padStart(5)}s fruit ${String(w.counts.fruit).padStart(4)} blue ${String(w.counts.blue).padStart(4)} red ${String(w.counts.red).padStart(4)}`,
        );
        nextPrint += every;
      }
      if (w.counts.blue === 0 && w.counts.red === 0 && w.time > 30) break;
    }
    const ms = performance.now() - started;
    const s = summarize(w);
    console.log(`\n=== ${id} seed ${seed} (${(ms / 1000).toFixed(1)}s cpu for ${w.time.toFixed(0)}s sim) ===`);
    if (!quiet) console.log(rows.join("\n"));
    console.log(
      `peaks blue ${w.stats.blueMax}@${w.stats.blueMaxAt.toFixed(0)} red ${w.stats.redMax}@${w.stats.redMaxAt.toFixed(0)} | gone blue ${w.stats.blueGoneAt?.toFixed(0) ?? "-"} red ${w.stats.redGoneAt?.toFixed(0) ?? "-"} | contacts ${w.stats.contacts} fruit ${w.stats.fruitEaten}`,
    );
    console.log(`summary: [${s.mood}] ${s.headline}`);
    for (const line of s.lines) console.log(`  - ${line}`);
  }
}
