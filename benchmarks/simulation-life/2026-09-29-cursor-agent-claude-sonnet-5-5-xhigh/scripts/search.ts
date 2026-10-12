import { World } from '../src/sim/engine';
import { DEFAULT_PARAMS, type Params } from '../src/sim/params';
import { Rng } from '../src/sim/rng';

const worker = Number(process.argv[2] ?? 0);
const trials = Number(process.argv[3] ?? 20);
const seedsPer = Number(process.argv[4] ?? 4);
const duration = Number(process.argv[5] ?? 3000);
const rng = new Rng(1000 + worker * 7919);

const ranges: Array<[keyof Params, number, number, boolean?]> = [
  ['fruitGrowth', 0.6, 1.4],
  ['fruitLimit', 3, 6, true],
  ['fruitDelay', 4, 16, true],
  ['trees', 7, 11, true],
  ['blueSpeed', 2.2, 3.2],
  ['blueVision', 7, 11],
  ['blueCopy', 80, 105, true],
  ['blueEat', 1, 2.5],
  ['blueUse', 0.8, 1.2],
  ['redSpeed', 2.6, 3.6],
  ['redVision', 5, 11],
  ['redContact', 0.5, 1.3],
  ['redCopy', 80, 120, true],
  ['redPause', 2, 8],
  ['redUse', 0.7, 1.3],
  ['blueStart', 25, 45, true],
  ['redStart', 3, 8, true],
];

function evaluate(params: Params) {
  let good = 0;
  let cycles = 0;
  const notes: string[] = [];
  for (let k = 0; k < seedsPer; k++) {
    const w = new World({ ...params, seed: 11 + k });
    w.emitEvents = false;
    while (w.time < duration) {
      w.step();
      if (w.blueCount === 0 || (w.redCount === 0 && w.time > 200)) break;
    }
    const alive = w.blueCount > 0 && w.redCount > 0 && w.time >= duration;
    const late = w.history.samples.filter((s) => s.t > 600);
    const minB = Math.min(...late.map((s) => s.blue));
    const minR = Math.min(...late.map((s) => s.red));
    const maxB = Math.max(...late.map((s) => s.blue));
    const maxR = Math.max(...late.map((s) => s.red));
    // crude cycle counting: blue crossings of its mean
    const mean = late.reduce((a, s) => a + s.blue, 0) / (late.length || 1);
    let cross = 0;
    for (let i = 1; i < late.length; i++) if ((late[i - 1].blue - mean) * (late[i].blue - mean) < 0) cross++;
    const ok = alive && minB >= 2 && minR >= 1;
    if (ok) {
      good++;
      cycles += cross / 2;
    }
    notes.push(`${alive ? 'A' : 'x'}${ok ? '+' : ''} b${minB}-${maxB} r${minR}-${maxR} c${(cross / 2).toFixed(0)}`);
  }
  return { good, cycles: cycles / Math.max(1, good), notes };
}

for (let t = 0; t < trials; t++) {
  const params = { ...DEFAULT_PARAMS } as Params;
  for (const [k, lo, hi, int] of ranges) {
    const v = rng.range(lo, hi);
    (params as unknown as Record<string, number>)[k] = int ? Math.round(v) : Math.round(v * 100) / 100;
  }
  const r = evaluate(params);
  console.log(JSON.stringify({ good: r.good, cycles: Math.round(r.cycles), notes: r.notes.join(' | '), params }));
}
