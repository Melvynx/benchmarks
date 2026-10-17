import { PRESETS, presetParams, type Params } from "../src/sim/params";
import { Simulation, TICKS_PER_SAMPLE } from "../src/sim/simulation";
import { summarize } from "../src/sim/summary";

const args = process.argv.slice(2);
const presetId = args[0] ?? "balanced";
const seconds = Number(args[1] ?? 1500);
const seeds = (args[2] ?? "1,2,3").split(",").map(Number);
const overrides: Partial<Params> = args[3] ? JSON.parse(args[3]) : {};

const preset = PRESETS.find((p) => p.id === presetId);
if (!preset) throw new Error(`unknown preset ${presetId}`);

for (const seed of seeds) {
  const params = { ...presetParams(preset, seed), ...overrides };
  const sim = new Simulation(params);
  sim.collectEvents = false;
  const started = performance.now();
  const ticks = Math.round(seconds / 0.05);
  for (let i = 0; i < ticks; i++) sim.step();
  const ms = performance.now() - started;
  const h = sim.history;
  const every = Math.max(1, Math.round(50 / (TICKS_PER_SAMPLE * 0.05)));
  const line: string[] = [];
  for (let i = 0; i < h.t.length; i += every) line.push(`${h.blue[i]}/${h.red[i]}/${h.fruit[i]}`);
  const s = summarize(sim);
  console.log(
    `\n[${presetId} seed=${seed}] ${seconds}s in ${(ms / 1000).toFixed(1)}s  peakB=${sim.stats.peak[0]} peakR=${sim.stats.peak[1]} cap=${sim.fruitCapacity}`,
  );
  console.log("  b/r/f every 50s:", line.join("  "));
  console.log("  >", s.headline);
  for (const l of s.lines) console.log("   -", l);
  console.log("   chips:", s.chips.map((c) => `${c.label}=${c.value}`).join(", "));
}
