import type { Sample } from './types';

export interface RunMetrics {
  duration: number;
  peakBlue: number;
  peakBlueAt: number;
  peakRed: number;
  peakRedAt: number;
  peakFruit: number;
  meanFruit: number;
  meanBlueLate: number;
  meanRedLate: number;
  cvBlueLate: number;
  blueExtinctAt: number | null;
  redExtinctAt: number | null;
  blueCycles: number;
  firstBluePeakAt: number | null;
  firstRedPeakAt: number | null;
  /** Late-run swing vs mid-run swing. <0.6 fading, >1.4 growing, else steady. */
  swingTrend: number | null;
}

export interface RunSummary {
  headline: string;
  lines: string[];
  metrics: RunMetrics;
}

export function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function smooth(vals: number[], win: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < vals.length; i++) {
    let s = 0;
    let n = 0;
    for (let j = Math.max(0, i - win + 1); j <= i; j++) {
      s += vals[j];
      n++;
    }
    out.push(s / n);
  }
  return out;
}

interface Pivot {
  i: number;
  kind: 'peak' | 'trough';
}

/** Zig-zag pivots: a turn only counts once the series has moved `th` away from it. */
function pivots(vals: number[], th: number): Pivot[] {
  const res: Pivot[] = [];
  if (vals.length === 0) return res;
  let trend: 0 | 1 | -1 = 0;
  let hi = vals[0];
  let hiI = 0;
  let lo = vals[0];
  let loI = 0;
  for (let i = 1; i < vals.length; i++) {
    const v = vals[i];
    if (trend >= 0) {
      if (v > hi) {
        hi = v;
        hiI = i;
      }
      if (hi - v >= th) {
        res.push({ i: hiI, kind: 'peak' });
        trend = -1;
        lo = v;
        loI = i;
        continue;
      }
    }
    if (trend <= 0) {
      if (v < lo) {
        lo = v;
        loI = i;
      }
      if (v - lo >= th) {
        res.push({ i: loI, kind: 'trough' });
        trend = 1;
        hi = v;
        hiI = i;
      }
    }
  }
  return res;
}

function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function cv(xs: number[]): number {
  const m = mean(xs);
  if (!m) return 0;
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) / m;
}

export function computeMetrics(h: Sample[]): RunMetrics {
  const duration = h.length ? h[h.length - 1].t : 0;
  const blue = h.map((s) => s.blue);
  const red = h.map((s) => s.red);
  const fruit = h.map((s) => s.fruit);
  const n = h.length;
  const third = Math.max(1, Math.floor(n / 3));
  const midB = blue.slice(third, 2 * third);
  const midR = red.slice(third, 2 * third);
  const lateB = blue.slice(2 * third);
  const lateR = red.slice(2 * third);

  let peakBlue = 0;
  let peakBlueAt = 0;
  let peakRed = 0;
  let peakRedAt = 0;
  for (const s of h) {
    if (s.blue > peakBlue) {
      peakBlue = s.blue;
      peakBlueAt = s.t;
    }
    if (s.red > peakRed) {
      peakRed = s.red;
      peakRedAt = s.t;
    }
  }

  const extinct = (arr: number[]): number | null => {
    let seen = false;
    for (let i = 0; i < n; i++) {
      if (arr[i] > 0) seen = true;
      else if (seen) return h[i].t;
    }
    return null;
  };

  const sb = smooth(blue, 10);
  const sr = smooth(red, 10);
  const pb = pivots(sb, Math.max(2, 0.25 * mean(blue))).filter((p) => p.kind === 'peak');
  const pr = pivots(sr, Math.max(1.5, 0.25 * mean(red))).filter((p) => p.kind === 'peak');

  const midCv = (cv(midB) + cv(midR)) / 2;
  const lateCv = (cv(lateB) + cv(lateR)) / 2;

  return {
    duration,
    peakBlue,
    peakBlueAt,
    peakRed,
    peakRedAt,
    peakFruit: Math.max(0, ...fruit),
    meanFruit: mean(fruit),
    meanBlueLate: mean(lateB),
    meanRedLate: mean(lateR),
    cvBlueLate: cv(lateB),
    blueExtinctAt: extinct(blue),
    redExtinctAt: extinct(red),
    blueCycles: pb.length,
    firstBluePeakAt: pb.length ? h[pb[0].i].t : null,
    firstRedPeakAt: pr.length ? h[pr[0].i].t : null,
    swingTrend: midCv > 0.02 ? lateCv / midCv : null,
  };
}

export function summarize(h: Sample[]): RunSummary {
  const m = computeMetrics(h);
  const lines: string[] = [];
  const bothAlive = m.blueExtinctAt === null && m.redExtinctAt === null;

  let headline: string;
  if (m.blueExtinctAt !== null && m.redExtinctAt !== null) {
    headline = `Both groups died out by ${fmtTime(Math.max(m.blueExtinctAt, m.redExtinctAt))}.`;
  } else if (m.redExtinctAt !== null) {
    headline = `Red blobs faded out at ${fmtTime(m.redExtinctAt)}. The world settled into a simpler, blue-only state.`;
  } else if (m.blueExtinctAt !== null) {
    headline = `Blue blobs died out at ${fmtTime(m.blueExtinctAt)}, and the red blobs had nothing left to touch.`;
  } else if (m.duration < 60) {
    headline = 'Run for a minute or two to see the waves.';
  } else if (m.peakBlue < 12) {
    headline = 'Low fruit kept the garden small.';
  } else if (m.swingTrend !== null && m.swingTrend < 0.6) {
    headline = 'The waves are fading. Blue and red are settling toward a steady balance.';
  } else if (m.swingTrend !== null && m.swingTrend > 1.4) {
    headline = 'The swings are growing. Blue and red keep overshooting each other.';
  } else if (m.blueCycles >= 2) {
    headline = 'The garden stayed balanced. Blue and red keep rising and falling out of phase.';
  } else {
    headline = 'Still settling. Give the garden more time.';
  }

  if (m.firstBluePeakAt !== null && m.firstRedPeakAt !== null) {
    const lag = m.firstRedPeakAt - m.firstBluePeakAt;
    if (lag > 3) lines.push(`Blue blobs grew first. Red blobs followed ${Math.round(lag)} s later.`);
    else if (lag < -3) lines.push(`Red blobs peaked first, ${Math.round(-lag)} s before blue.`);
    else lines.push('Blue and red peaked almost together.');
  }
  lines.push(
    `Peaks: ${m.peakBlue} blue at ${fmtTime(m.peakBlueAt)}, ${m.peakRed} red at ${fmtTime(m.peakRedAt)}.`,
  );
  if (m.meanFruit >= 5) lines.push(`Fruit stayed plentiful, averaging ${m.meanFruit.toFixed(1)} on the trees.`);
  else if (m.meanFruit < 1.5) lines.push('Blue blobs ate fruit as fast as it ripened.');
  else lines.push(`Fruit averaged ${m.meanFruit.toFixed(1)} on the trees.`);
  if (bothAlive && m.cvBlueLate < 0.12 && m.meanBlueLate > 5) {
    lines.push(`Blue levelled out near ${Math.round(m.meanBlueLate)}, red near ${Math.round(m.meanRedLate)}.`);
  }
  return { headline, lines, metrics: m };
}
