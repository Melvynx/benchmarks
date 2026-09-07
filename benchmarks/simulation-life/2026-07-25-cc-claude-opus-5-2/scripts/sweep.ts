/**
 * Grid-searches the red-blob energy rules for settings that produce long-running,
 * out-of-phase waves instead of a wipe-out. Development tool; not part of the app.
 *
 *   pnpm exec tsx scripts/sweep.ts
 */
import { DEFAULTS, type Params } from "../src/sim/params";
import { World, DT } from "../src/sim/world";
import { countWaves, correlation, phaseLag } from "../src/analysis/summary";

const HORIZON = Number(process.env.HORIZON ?? 1200);
const SEEDS = (process.env.SEEDS ?? '1234,77,4242,909').split(',').map(Number);

interface Score {
  label: string;
  survived: number;
  waves: number;
  blue: number;
  red: number;
  corr: number;
  lag: number;
  amp: number;
  score: number;
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function evaluate(label: string, over: Partial<Params>): Score {
  let survived = 0;
  const waves: number[] = [];
  const blues: number[] = [];
  const reds: number[] = [];
  const corrs: number[] = [];
  const lags: number[] = [];
  const amps: number[] = [];

  for (const seed of SEEDS) {
    const params: Params = { ...DEFAULTS, ...over, seed };
    const w = new World(params);
    const steps = Math.round(HORIZON / DT);
    for (let i = 0; i < steps; i++) w.step();
    const h = w.history;
    const tail = h.slice(Math.floor(h.length * 0.3));
    const blue = tail.map((s) => s.blue);
    const red = tail.map((s) => s.red);
    const last = h[h.length - 1];
    if (last.blue > 0 && last.red > 0) survived++;
    waves.push((countWaves(blue) + countWaves(red)) / 2);
    blues.push(mean(blue));
    reds.push(mean(red));
    corrs.push(correlation(blue, red));
    lags.push(phaseLag(blue, red, 0.5).seconds);
    const mb = mean(blue);
    amps.push(mb > 0 ? (Math.max(...blue) - Math.min(...blue)) / mb : 0);
  }

  const s: Score = {
    label,
    survived,
    waves: mean(waves),
    blue: mean(blues),
    red: mean(reds),
    corr: mean(corrs),
    lag: mean(lags),
    amp: mean(amps),
    score: 0,
  };
  // Reward coexistence first, then visible waves and healthy group sizes.
  s.score =
    s.survived * 100 +
    Math.min(s.waves, 8) * 9 +
    Math.min(s.blue, 40) * 0.8 +
    Math.min(s.red, 20) * 1.6 +
    Math.min(s.amp, 2) * 8 -
    (s.corr > 0.5 ? 20 : 0);
  return s;
}

const results: Score[] = [];
const grid = {
  redEnergyUse: [1.1, 1.3, 1.5],
  redContact: [26, 34, 42],
  redPause: [2.6, 3.6],
};

for (const redEnergyUse of grid.redEnergyUse)
  for (const redContact of grid.redContact)
    for (const redPause of grid.redPause)
      results.push(
        evaluate(
          `use ${redEnergyUse} contact ${redContact} pause ${redPause}`,
          { redEnergyUse, redContact, redPause },
        ),
      );

results.sort((a, b) => b.score - a.score);
console.log(
  `horizon ${HORIZON}s over ${SEEDS.length} seeds — top 18 of ${results.length}\n`,
);
for (const r of results.slice(0, 18)) {
  console.log(
    `${r.label.padEnd(40)} alive ${r.survived}/${SEEDS.length}  waves ${r.waves
      .toFixed(1)
      .padStart(4)}  blue ${r.blue.toFixed(1).padStart(5)}  red ${r.red
      .toFixed(1)
      .padStart(5)}  corr ${r.corr.toFixed(2).padStart(5)}  lag ${r.lag
      .toFixed(0)
      .padStart(3)}s  amp ${r.amp.toFixed(2)}  score ${r.score.toFixed(0)}`,
  );
}
