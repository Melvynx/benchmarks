import { DEFAULT_PARAMS, type Params } from '../src/sim/params';
import { Engine } from '../src/sim/engine';
import { computeMetrics } from '../src/sim/analysis';
import { RULES } from '../src/sim/world';

const DEFAULT_RULES = { ...RULES };

const minutes = Number(process.env.MINUTES ?? 6);
const seeds = (process.env.SEEDS ?? '1,2,3').split(',').map(Number);
const overrides: (Partial<Params> & { rules?: Partial<typeof RULES> })[] = JSON.parse(process.argv[2] ?? '[{}]');

for (const ov of overrides) {
  Object.assign(RULES, DEFAULT_RULES, ov.rules ?? {});
  const { rules: _r, ...pov } = ov;
  let ext = 0, bothAlive = 0, cyc = 0, swing = 0, swingN = 0, mb = 0, mr = 0, mf = 0, pb = 0, pr = 0, endB = 0, endR = 0;
  const lags: number[] = [];
  let minB = 0, minR = 0, xing = 0, cvB = 0, cvR = 0;
  for (const seed of seeds) {
    const e = new Engine({ ...DEFAULT_PARAMS, ...pov, seed });
    e.playing = true;
    const steps = Math.round(minutes * 60); // stepSecond() = 1 sim second
    for (let i = 0; i < steps; i++) e.stepSecond();
    const m = computeMetrics(e.history);
    const tail = e.history.slice(Math.floor(e.history.length / 3));
    const sm = (arr: number[]) => arr.map((_, i) => { let a = 0; let n = 0; for (let j = Math.max(0, i - 19); j <= i; j++) { a += arr[j]; n++; } return a / n; });
    const bl = sm(e.history.map((x) => x.blue));
    const mB = bl.reduce((a, b) => a + b, 0) / bl.length;
    for (let i = 1; i < bl.length; i++) if ((bl[i - 1] - mB) * (bl[i] - mB) < 0) xing++;
    const tb = tail.map((x) => x.blue), tr = tail.map((x) => x.red);
    const sd = (a: number[]) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / (m || 1); };
    cvB += sd(tb); cvR += sd(tr);
    minB += Math.min(...tail.map((x) => x.blue));
    minR += Math.min(...tail.map((x) => x.red));
    if (m.blueExtinctAt !== null || m.redExtinctAt !== null) ext++;
    else bothAlive++;
    cyc += m.blueCycles;
    if (m.swingTrend !== null) { swing += m.swingTrend; swingN++; }
    mb += m.meanBlueLate; mr += m.meanRedLate; mf += m.meanFruit; pb += m.peakBlue; pr += m.peakRed;
    const last = e.history[e.history.length - 1];
    endB += last.blue; endR += last.red;
    if (m.firstBluePeakAt !== null && m.firstRedPeakAt !== null) lags.push(m.firstRedPeakAt - m.firstBluePeakAt);
  }
  const n = seeds.length;
  console.log(
    JSON.stringify(ov).padEnd(60),
    `ext ${ext}/${n} alive ${bothAlive}/${n} | cyc ${(cyc / n).toFixed(1)} swing ${(swingN ? swing / swingN : NaN).toFixed(2)} | late blue ${(mb / n).toFixed(1)} red ${(mr / n).toFixed(1)} fruit ${(mf / n).toFixed(1)} | peak b ${(pb / n).toFixed(0)} r ${(pr / n).toFixed(0)} | end b ${(endB / n).toFixed(0)} r ${(endR / n).toFixed(0)} | min late b ${(minB / n).toFixed(1)} r ${(minR / n).toFixed(1)} | xings ${(xing / n).toFixed(0)} cv b ${(cvB / n).toFixed(2)} r ${(cvR / n).toFixed(2)}`,
  );
}
