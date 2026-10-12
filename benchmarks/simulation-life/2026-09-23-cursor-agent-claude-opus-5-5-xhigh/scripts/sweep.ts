import { presetParams, RULES, type Params } from "../src/sim/params";
import { summarize } from "../src/sim/summary";
import { createWorld, step } from "../src/sim/world";

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const duration = Number(flag("t", "1500"));
const seeds = flag("seeds", "1,2,3,4").split(",").map(Number);
const preset = flag("preset", "balanced");
const configs: (Partial<Params> & { rules?: Record<string, number> })[] = JSON.parse(flag("configs", "[{}]"));

for (const cfg of configs) {
  const res: string[] = [];
  const ruleKeys = Object.keys(cfg).filter((k) => k.startsWith("R_"));
  for (const k of ruleKeys) (RULES as unknown as Record<string, number>)[k.slice(2)] = (cfg as Record<string, number>)[k];
  let survived = 0;
  let cpu = 0;
  for (const seed of seeds) {
    const w = createWorld({ ...presetParams(preset), ...cfg, seed });
    const t0 = performance.now();
    const steps = Math.round(duration * 20);
    let blueSum = 0;
    let redSum = 0;
    let blueSq = 0;
    let redSq = 0;
    let n = 0;
    for (let i = 0; i < steps; i++) {
      step(w);
      w.events.length = 0;
      if (i % 20 === 0 && w.time > duration / 3) {
        blueSum += w.counts.blue;
        redSum += w.counts.red;
        blueSq += w.counts.blue ** 2;
        redSq += w.counts.red ** 2;
        n++;
      }
      if (w.counts.red === 0 && w.time > 5 && !args.includes("--full")) break;
    }
    cpu += performance.now() - t0;
    const s = summarize(w);
    const alive = w.counts.red > 0 && w.counts.blue > 0;
    if (alive) survived++;
    const cv = (sum: number, sq: number) => {
      const m = sum / Math.max(1, n);
      return m > 0 ? Math.sqrt(Math.max(0, sq / Math.max(1, n) - m * m)) / m : 0;
    };
    res.push(
      alive
        ? `ok w${s.waves} b${Math.round(blueSum / Math.max(1, n))} r${Math.round(redSum / Math.max(1, n))} cv${cv(blueSum, blueSq).toFixed(2)}/${cv(redSum, redSq).toFixed(2)} pk${w.stats.blueMax}/${w.stats.redMax}${s.lagSeconds ? ` lag${Math.round(s.lagSeconds)}` : ""}`
        : `${(w.stats.blueGoneAt ?? 1e9) < (w.stats.redGoneAt ?? 1e9) ? "B" : "R"}x@${Math.round(Math.min(w.stats.redGoneAt ?? 1e9, w.stats.blueGoneAt ?? 1e9))} w${s.waves} pk${w.stats.blueMax}/${w.stats.redMax}`,
    );
  }
  console.log(`${survived}/${seeds.length} ${JSON.stringify(cfg)} | ${res.join(" | ")} | ${(cpu / 1000).toFixed(1)}s`);
}
