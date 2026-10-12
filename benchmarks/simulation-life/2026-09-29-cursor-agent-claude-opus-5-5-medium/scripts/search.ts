import { DEFAULT_PARAMS, type Params } from "../src/sim/params";
import { Simulation, KIND, TUNING } from "../src/sim/simulation";
import { createRng } from "../src/sim/rng";
import { summarize } from "../src/sim/summary";

const args = process.argv.slice(2);
const get = (k: string, d: string) => args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1] ?? d;
const n = Number(get("n", "20"));
const worker = Number(get("worker", "0"));
const duration = Number(get("t", "1200"));
const rng = createRng(1000 + worker * 7919);

type Space = Record<string, [number, number]>;
const paramSpace: Space = {
  redSpeed: [3.0, 4.2],
  redVision: [4, 6.5],
  redCopy: [80, 180],
  redPause: [2, 6],
  redContact: [30, 70],
  blueCopy: [55, 90],
  blueVision: [5, 8],
  reds: [4, 12],
  worldSize: [16, 20],
  trees: [12, 18],
  fruitGrowth: [0.15, 0.35],
  fruitLimit: [4, 6],
  fruitDelay: [2, 5],
};
const tuneSpace: Space = {
  contactEfficiency: [0.35, 0.7],
  fruitEnergy: [20, 32],
  redIdle: [0.6, 1.4],
  redMove: [1.2, 2.2],
  redMaturity: [10, 30],
  redCooldown: [8, 25],
  hiddenSpotDist: [1.2, 2.2],
  chaseLimit: [3, 6],
  fleeGain: [0.35, 0.6],
};
const ints = new Set(["reds", "worldSize", "trees", "fruitLimit", "redCopy", "blueCopy", "redContact"]);

function sample(space: Space) {
  const out: Record<string, number> = {};
  for (const [k, [a, b]] of Object.entries(space)) {
    const v = rng.range(a, b);
    out[k] = ints.has(k) ? Math.round(v) : +v.toFixed(3);
  }
  return out;
}

export function applyTuning(t: Record<string, number>) {
  TUNING.contactEfficiency = t.contactEfficiency;
  TUNING.fruitEnergy = t.fruitEnergy;
  TUNING.hiddenSpotDist = t.hiddenSpotDist;
  TUNING.chaseLimit = t.chaseLimit;
  TUNING.fleeGain = t.fleeGain;
  KIND.red.idle = t.redIdle;
  KIND.red.move = t.redMove;
  KIND.red.maturity = t.redMaturity;
  KIND.red.cooldown = t.redCooldown;
}

for (let i = 0; i < n; i++) {
  const p = sample(paramSpace);
  const t = sample(tuneSpace);
  applyTuning(t);
  let score = 0;
  const detail: string[] = [];
  for (const seed of [3, 17, 29]) {
    const sim = new Simulation({ ...DEFAULT_PARAMS, ...(p as Partial<Params>), seed });
    let bothUntil = 0;
    while (sim.time < duration) {
      sim.step();
      sim.events.length = 0;
      if (sim.blobs.length > 600) break;
      if (sim.ticks % 30 === 0) {
        const b = sim.count("blue");
        const r = sim.count("red");
        if (b > 0 && r > 0) bothUntil = sim.time;
        else break;
      }
    }
    const s = summarize(sim.history, sim.stats, sim.params);
    const blues = sim.history.map((h) => h.blue);
    const meanB = blues.reduce((a, x) => a + x, 0) / Math.max(1, blues.length);
    score += bothUntil / duration + Math.min(s.waves, 6) * 0.08 + (meanB > 15 ? 0.1 : 0);
    detail.push(`${Math.round(bothUntil)}s/w${s.waves}/b${Math.round(meanB)}`);
  }
  console.log(JSON.stringify({ score: +score.toFixed(3), detail, p, t }));
}
