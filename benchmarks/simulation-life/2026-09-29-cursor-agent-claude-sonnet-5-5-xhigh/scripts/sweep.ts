import { K, World } from '../src/sim/engine';
import { DEFAULT_PARAMS, PRESETS, type Params } from '../src/sim/params';

// usage: tsx scripts/sweep.ts <preset> <duration> <seeds> '{"redContact":[0.6,0.8]}' [base overrides k=v ...]
const args = process.argv.slice(2);
const presetId = args[0] ?? 'balanced';
const duration = Number(args[1] ?? 2400);
const seeds = (args[2] ?? '1,2,3').split(',').map(Number);
const grid = JSON.parse(args[3] ?? '{}') as Record<string, number[]>;
const base: Partial<Params> = {};
for (const a of args.slice(4)) {
  const [k, v] = a.split('=');
  if (k.startsWith('K.')) (K as Record<string, number>)[k.slice(2)] = Number(v);
  else (base as Record<string, number>)[k] = Number(v);
}
const preset = PRESETS.find((p) => p.id === presetId)!;

const keys = Object.keys(grid);
const combos: Array<Record<string, number>> = [{}];
for (const k of keys) {
  const next: Array<Record<string, number>> = [];
  for (const c of combos) for (const v of grid[k]) next.push({ ...c, [k]: v });
  combos.length = 0;
  combos.push(...next);
}

function peaks(series: number[], minProm: number) {
  // count local maxima with prominence on a lightly smoothed series
  const sm = series.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let j = Math.max(0, i - 4); j <= Math.min(series.length - 1, i + 4); j++) {
      s += series[j];
      n++;
    }
    return s / n;
  });
  let count = 0;
  let lastMin = sm[0];
  let lastMax = sm[0];
  let dir = 0;
  for (let i = 1; i < sm.length; i++) {
    if (sm[i] > lastMax) lastMax = sm[i];
    if (sm[i] < lastMin) lastMin = sm[i];
    if (dir <= 0 && sm[i] - lastMin > minProm) {
      dir = 1;
      lastMax = sm[i];
      if (count >= 0) count++;
    } else if (dir >= 0 && lastMax - sm[i] > minProm) {
      dir = -1;
      lastMin = sm[i];
    }
  }
  return count;
}

for (const combo of combos) {
  const rows: string[] = [];
  const pcombo: Record<string, number> = {};
  for (const [k, v] of Object.entries(combo)) {
    if (k.startsWith('K.')) (K as Record<string, number>)[k.slice(2)] = v;
    else pcombo[k] = v;
  }
  for (const seed of seeds) {
    const params: Params = { ...DEFAULT_PARAMS, ...preset.params, ...base, ...pcombo, seed } as Params;
    const w = new World(params);
    w.emitEvents = false;
    while (w.time < duration) w.step();
    const s = w.history.samples;
    const late = s.filter((x) => x.t > duration * 0.4);
    const mean = (f: (x: (typeof s)[0]) => number) => (late.length ? late.reduce((a, x) => a + f(x), 0) / late.length : 0);
    const max = (f: (x: (typeof s)[0]) => number) => Math.max(...s.map(f));
    const minLate = (f: (x: (typeof s)[0]) => number) => (late.length ? Math.min(...late.map(f)) : 0);
    const maxLate = (f: (x: (typeof s)[0]) => number) => (late.length ? Math.max(...late.map(f)) : 0);
    const bp = peaks(
      s.map((x) => x.blue),
      6,
    );
    const rp = peaks(
      s.map((x) => x.red),
      3,
    );
    rows.push(
      `seed ${seed}: end b${w.blueCount} r${w.redCount}  | late mean b${mean((x) => x.blue).toFixed(0)} r${mean((x) => x.red).toFixed(0)} fruit ${mean((x) => x.fruit).toFixed(0)}/${w.fruitCapacity}  | late b[${minLate((x) => x.blue)}-${maxLate((x) => x.blue)}] r[${minLate((x) => x.red)}-${maxLate((x) => x.red)}] | peak b${max((x) => x.blue)} r${max((x) => x.red)} | peaks b${bp} r${rp}`,
    );
  }
  console.log(`--- ${JSON.stringify(combo)}`);
  console.log(rows.join('\n'));
}
