import { ECO, Simulation } from "../src/sim/engine";
import { presetParams, type Params } from "../src/sim/params";
import { stats, waveReport } from "../src/sim/analysis";

/**
 * Usage: tsx scripts/sweep.ts --preset balanced --secs 2400 --seeds 6 "redPauseTime=3,4 redEnergyUse=2.5,2.7"
 * Every combination of the comma-separated values is run across the seeds.
 */
const argv = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
};
const preset = flag("preset", "balanced");
const secs = Number(flag("secs", "2400"));
const seeds = Number(flag("seeds", "6"));
const seed0 = Number(flag("seed", "1"));

const axes: [string, number[]][] = [];
for (const a of argv.flatMap((x) => x.split(/\s+/))) {
  const m = /^(\w+)=([-\d.,]+)$/.exec(a);
  if (m) axes.push([m[1], m[2].split(",").map(Number)]);
}
const eco = ECO as Record<string, number>;
const params = (combo: Record<string, number>) => {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(combo)) {
    if (k in eco) eco[k] = v;
    else out[k] = v;
  }
  return out as Partial<Params>;
};

function* combos(i = 0, acc: Record<string, number> = {}): Generator<Record<string, number>> {
  if (i === axes.length) {
    yield { ...acc };
    return;
  }
  const [k, vals] = axes[i];
  for (const v of vals) yield* combos(i + 1, { ...acc, [k]: v });
}

const [shard, shards] = flag("shard", "0/1").split("/").map(Number);
let comboIndex = -1;
for (const combo of combos()) {
  comboIndex++;
  if (comboIndex % shards !== shard) continue;
  let redAlive = 0;
  let blueAlive = 0;
  let waves = 0;
  const lates: string[] = [];
  const extinctions: string[] = [];
  let peakBlue = 0;
  for (let k = 0; k < seeds; k++) {
    const p: Params = { ...presetParams(preset), ...params(combo), seed: seed0 + k };
    const sim = new Simulation(p);
    for (let t = 0; t < secs; t++) {
      sim.advance(1);
      const c = sim.counts();
      if (c.blue === 0 && c.red === 0) break;
    }
    const c = sim.counts();
    if (c.red > 0) redAlive++;
    if (c.blue > 0) blueAlive++;
    const wr = waveReport(sim.history);
    waves += wr.pairedWaves;
    peakBlue += sim.peakBlue;
    const late = sim.history.slice(Math.floor(sim.history.length / 2));
    const bl = stats(late.map((s) => s.blue));
    const rd = stats(late.map((s) => s.red));
    lates.push(`${bl.mean.toFixed(0)}/${rd.mean.toFixed(0)}`);
    if (sim.extinctAt.red !== null || sim.extinctAt.blue !== null)
      extinctions.push(`s${p.seed}:${sim.extinctAt.blue !== null ? "B" + sim.extinctAt.blue : ""}${sim.extinctAt.red !== null ? "R" + sim.extinctAt.red : ""}`);
  }
  console.log(
    `${JSON.stringify(combo)} | red alive ${redAlive}/${seeds} blue alive ${blueAlive}/${seeds} | waves/seed ${(waves / seeds).toFixed(1)} | peakBlue ${(peakBlue / seeds).toFixed(0)} | late b/r ${lates.join(" ")} | ${extinctions.join(" ")}`,
  );
}
