import { Simulation } from "../src/sim/engine";
import { presetParams, type Params } from "../src/sim/params";
import { stats, waveReport } from "../src/sim/analysis";

const args = process.argv.slice(2).flatMap((a) => a.split(/\s+/).filter(Boolean));
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const preset = flag("preset", "balanced");
const secs = Number(flag("secs", "1200"));
const seeds = Number(flag("seeds", "1"));
const seed0 = Number(flag("seed", "1"));
const every = Number(flag("every", "20"));
const quiet = args.includes("--quiet");

const overrides: Partial<Params> = {};
for (const a of args) {
  const m = /^(\w+)=(-?[\d.]+)$/.exec(a);
  if (m) (overrides as Record<string, number>)[m[1]] = Number(m[2]);
}

const fmtT = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

for (let k = 0; k < seeds; k++) {
  const params: Params = { ...presetParams(preset), ...overrides, seed: seed0 + k };
  const sim = new Simulation(params);
  const started = performance.now();
  const rows: string[] = [];
  let maxBlobs = 0;
  for (let t = 0; t < secs; t += 1) {
    sim.advance(1);
    maxBlobs = Math.max(maxBlobs, sim.blobs.length);
    if (!quiet && Math.round(sim.time) % every === 0) {
      const c = sim.counts();
      rows.push(
        `${fmtT(sim.time).padStart(6)} fruit ${String(sim.ripeFruit()).padStart(4)}  blue ${String(c.blue).padStart(4)} ${"#".repeat(Math.round(c.blue / 4))}`,
      );
      rows.push(`${" ".repeat(18)}red  ${String(c.red).padStart(4)} ${"*".repeat(Math.round(c.red / 1))}`);
    }
    const c = sim.counts();
    if (c.blue === 0 && c.red === 0) break;
  }
  const ms = performance.now() - started;
  const h = sim.history;
  const late = h.slice(Math.floor(h.length / 2));
  const wr = waveReport(h);
  const bl = stats(late.map((s) => s.blue));
  const rd = stats(late.map((s) => s.red));
  if (!quiet) console.log(rows.join("\n"));
  console.log(
    `[${preset} seed ${params.seed}] ${fmtT(sim.time)} in ${ms.toFixed(0)}ms | peak blue ${sim.peakBlue} red ${sim.peakRed} | ` +
      `late blue ${bl.mean.toFixed(0)}±${bl.sd.toFixed(0)} red ${rd.mean.toFixed(1)}±${rd.sd.toFixed(1)} | ` +
      `extinct blue ${sim.extinctAt.blue ?? "-"} red ${sim.extinctAt.red ?? "-"} | ` +
      `waves ${wr.pairedWaves} lag ${wr.meanLagSeconds?.toFixed(0) ?? "-"}s period ${wr.periodSeconds?.toFixed(0) ?? "-"}s | maxBlobs ${maxBlobs} | ` +
      `hugs ${sim.totals.hugs} hugFades ${sim.totals.blueHugFades} blueStarve ${sim.totals.blueHungerFades} redStarve ${sim.totals.redHungerFades}`,
  );
  if (args.includes("--debug")) {
    console.log(`   chases ${sim.chases} success ${((sim.totals.hugs / Math.max(1, sim.chases)) * 100).toFixed(0)}% caughtWhile`, sim.caughtWhile);
  }
}
