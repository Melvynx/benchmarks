import { PRESETS, presetParams, type Params } from "../src/sim/params";
import { BLUE, Simulation } from "../src/sim/simulation";

const [presetId = "balanced", secondsArg = "400", seedArg = "1", set = "{}", everyArg = "10"] = process.argv.slice(2);
const preset = PRESETS.find((p) => p.id === presetId)!;
const overrides: Partial<Params> = JSON.parse(set);
const sim = new Simulation({ ...presetParams(preset, Number(seedArg)), ...overrides });
sim.collectEvents = false;
const every = Number(everyArg);
let lastBirths = [0, 0];
let lastFades = [0, 0];
let lastBoops = 0;
for (let s = 0; s < Number(secondsArg); s += every) {
  for (let i = 0; i < every * 20; i++) sim.step();
  let be = 0;
  let re = 0;
  const acts: Record<string, number> = {};
  for (const b of sim.blobs) {
    if (b.kind === BLUE) be += b.energy;
    else re += b.energy;
    const key = `${b.kind === BLUE ? "b" : "r"}.${b.action}`;
    acts[key] = (acts[key] ?? 0) + 1;
    if (b.sheltered) acts.sheltered = (acts.sheltered ?? 0) + 1;
  }
  const [nb, nr] = sim.counts;
  console.log(
    `t=${Math.round(sim.time)} B=${nb} R=${nr} F=${sim.fruitCount} eB=${nb ? (be / nb).toFixed(0) : "-"} eR=${nr ? (re / nr).toFixed(0) : "-"} births=${sim.stats.births[0] - lastBirths[0]}/${sim.stats.births[1] - lastBirths[1]} fades=${sim.stats.fades[0] - lastFades[0]}/${sim.stats.fades[1] - lastFades[1]} boops=${sim.stats.boops - lastBoops} ${JSON.stringify(acts)}`,
  );
  lastBirths = [...sim.stats.births];
  lastFades = [...sim.stats.fades];
  lastBoops = sim.stats.boops;
  if (nb + nr === 0) break;
}
