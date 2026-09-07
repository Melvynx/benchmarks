/**
 * Headless harness: runs each preset for a long stretch and reports whether the
 * populations actually oscillate. Used to tune the energy rules, not shipped in the UI.
 *
 *   pnpm tune            # all presets, 900 sim-seconds
 *   pnpm tune 1800       # longer horizon
 */
import { PRESETS, DEFAULTS, type Params } from "../src/sim/params";
import { World, DT } from "../src/sim/world";
import { summarize, countWaves } from "../src/analysis/summary";

const horizon = Number(process.argv[2] ?? 900);
const seeds = [1234, 77, 4242];

function run(params: Params, seconds: number) {
  const w = new World(params);
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) w.step();
  return w;
}

function correlation(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  const ma = a.slice(0, n).reduce((x, y) => x + y, 0) / n;
  const mb = b.slice(0, n).reduce((x, y) => x + y, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  return num / (Math.sqrt(da * db) || 1);
}

/** Lag (in samples) that maximises blue→red correlation: red should trail blue. */
function bestLag(blue: number[], red: number[], maxLag: number) {
  let best = 0;
  let bestC = -2;
  for (let lag = 0; lag <= maxLag; lag++) {
    const c = correlation(blue.slice(0, blue.length - lag), red.slice(lag));
    if (c > bestC) {
      bestC = c;
      best = lag;
    }
  }
  return { lag: best, c: bestC };
}

const rows: string[] = [];
for (const preset of PRESETS) {
  for (const seed of seeds) {
    const params: Params = { ...DEFAULTS, ...preset.params, seed };
    const w = run(params, horizon);
    const h = w.history;
    const tail = h.slice(Math.floor(h.length * 0.25));
    const blue = tail.map((s) => s.blue);
    const red = tail.map((s) => s.red);
    const fruit = tail.map((s) => s.fruit);
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
    const lag = bestLag(blue, red, 160);
    rows.push(
      [
        preset.id.padEnd(11),
        `seed ${String(seed).padStart(4)}`,
        `blue ${avg(blue).toFixed(1).padStart(5)} (pk ${w.stats.peakBlue
          .toString()
          .padStart(3)}, waves ${countWaves(blue)})`,
        `red ${avg(red).toFixed(1).padStart(5)} (pk ${w.stats.peakRed
          .toString()
          .padStart(3)}, waves ${countWaves(red)})`,
        `fruit ${avg(fruit).toFixed(0).padStart(4)}`,
        `corr ${correlation(blue, red).toFixed(2).padStart(5)}`,
        `lag ${(lag.lag * 0.5).toFixed(0).padStart(3)}s @${lag.c.toFixed(2)}`,
        `end b/r ${h[h.length - 1].blue}/${h[h.length - 1].red}`,
      ].join("  "),
    );
    if (seed === seeds[0]) {
      rows.push(`             → ${summarize(w.history, w.stats).headline}`);
      for (const line of summarize(w.history, w.stats).notes)
        rows.push(`               · ${line}`);
    }
  }
  rows.push("");
}
console.log(`horizon ${horizon}s\n`);
console.log(rows.join("\n"));
