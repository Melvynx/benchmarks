import { K, World } from '../src/sim/engine';
import { DEFAULT_PARAMS, PRESETS, type Params } from '../src/sim/params';

// usage: tsx .tmp/surv.ts <preset> <duration> <nSeeds> '<grid json>' [k=v ...]
const args = process.argv.slice(2);
const presetId = args[0] ?? 'balanced';
const duration = Number(args[1] ?? 3000);
const nSeeds = Number(args[2] ?? 12);
const grid = JSON.parse(args[3] ?? '{}') as Record<string, number[]>;
const base: Record<string, number> = {};
for (const a of args.slice(4)) {
  const [k, v] = a.split('=');
  base[k] = Number(v);
}
const preset = PRESETS.find((p) => p.id === presetId)!;
const keys = Object.keys(grid);
let combos: Array<Record<string, number>> = [{}];
for (const k of keys) {
  const next: Array<Record<string, number>> = [];
  for (const c of combos) for (const v of grid[k]) next.push({ ...c, [k]: v });
  combos = next;
}
const defaults = { ...K };
for (const combo of combos) {
  Object.assign(K, defaults);
  const p: Record<string, number> = {};
  for (const [k, v] of Object.entries({ ...base, ...combo })) {
    if (k.startsWith('K.')) (K as Record<string, number>)[k.slice(2)] = v;
    else p[k] = v;
  }
  let both = 0;
  let redGone = 0;
  let blueGone = 0;
  let swings = 0;
  let sumB = 0;
  let sumR = 0;
  let nAlive = 0;
  const details: string[] = [];
  for (let seed = 1; seed <= nSeeds; seed++) {
    const params = { ...DEFAULT_PARAMS, ...preset.params, ...p, seed } as Params;
    const w = new World(params);
    w.emitEvents = false;
    let minB = 1e9;
    let minR = 1e9;
    let maxB = 0;
    let lb = 0;
    let lr = 0;
    let ln = 0;
    while (w.time < duration) {
      w.step();
      if (w.time > duration * 0.5 && Math.abs(w.time * 2 - Math.round(w.time * 2)) < 1e-6 && Math.round(w.time) % 10 === 0) {
        lb += w.blueCount;
        lr += w.redCount;
        ln++;
      }
      if (w.time > 300) {
        minB = Math.min(minB, w.blueCount);
        minR = Math.min(minR, w.redCount);
        maxB = Math.max(maxB, w.blueCount);
      }
    }
    const ok = w.blueCount > 0 && w.redCount > 0;
    if (ok) {
      both++;
      sumB += lb / Math.max(1, ln);
      sumR += lr / Math.max(1, ln);
      nAlive++;
    }
    if (ok) void 0;
    else if (w.blueCount === 0) blueGone++;
    else redGone++;
    if (maxB > 0 && maxB / Math.max(1, minB) > 2.2) swings++;
    details.push(`${seed}:${w.blueCount}/${w.redCount}${ok ? '' : '!'}(${minB > 1e8 ? '-' : minB},${minR > 1e8 ? '-' : minR})`);
  }
  console.log(`${JSON.stringify(combo)}  both ${both}/${nSeeds}  lateMean b${(sumB / Math.max(1, nAlive)).toFixed(0)} r${(sumR / Math.max(1, nAlive)).toFixed(0)}  redGone ${redGone} blueGone ${blueGone}  bigSwings ${swings}\n   ${details.join(' ')}`);
}
