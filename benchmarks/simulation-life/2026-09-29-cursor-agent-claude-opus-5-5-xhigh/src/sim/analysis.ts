import type { Sample } from "./engine";

export function smooth(values: number[], window: number): number[] {
  if (window <= 1) return values.slice();
  const half = Math.floor(window / 2);
  const out = new Array<number>(values.length);
  let sum = 0;
  let count = 0;
  let lo = 0;
  let hi = -1;
  for (let i = 0; i < values.length; i++) {
    const wantLo = Math.max(0, i - half);
    const wantHi = Math.min(values.length - 1, i + half);
    while (hi < wantHi) {
      hi++;
      sum += values[hi];
      count++;
    }
    while (lo < wantLo) {
      sum -= values[lo];
      lo++;
      count--;
    }
    out[i] = sum / count;
  }
  return out;
}

export interface Peak {
  index: number;
  value: number;
}

/** Local maxima whose prominence (drop to the lower neighbouring trough) is at least `minProminence`. */
export function findPeaks(values: number[], minProminence: number): Peak[] {
  const peaks: Peak[] = [];
  const n = values.length;
  if (n < 3) return peaks;
  let lastTrough = values[0];
  let candidate = -1;
  let candidateValue = -Infinity;
  let rising = false;
  for (let i = 1; i < n; i++) {
    const v = values[i];
    if (!rising) {
      if (v < lastTrough) lastTrough = v;
      if (v - lastTrough >= minProminence) {
        rising = true;
        candidate = i;
        candidateValue = v;
      }
    } else {
      if (v > candidateValue) {
        candidateValue = v;
        candidate = i;
      }
      if (candidateValue - v >= minProminence) {
        peaks.push({ index: candidate, value: candidateValue });
        rising = false;
        lastTrough = v;
      }
    }
  }
  return peaks;
}

/** Lag (in samples) at which `lead` best predicts `follow`; positive means `follow` trails `lead`. */
export function bestLag(lead: number[], follow: number[], maxLag: number) {
  const n = Math.min(lead.length, follow.length);
  let best = 0;
  let bestCorr = -Infinity;
  for (let lag = 0; lag <= maxLag; lag++) {
    const m = n - lag;
    if (m < 20) break;
    let ma = 0;
    let mb = 0;
    for (let i = 0; i < m; i++) {
      ma += lead[i];
      mb += follow[i + lag];
    }
    ma /= m;
    mb /= m;
    let num = 0;
    let da = 0;
    let db = 0;
    for (let i = 0; i < m; i++) {
      const a = lead[i] - ma;
      const b = follow[i + lag] - mb;
      num += a * b;
      da += a * a;
      db += b * b;
    }
    const corr = da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
    if (corr > bestCorr) {
      bestCorr = corr;
      best = lag;
    }
  }
  return { lag: best, corr: bestCorr };
}

export function stats(values: number[]) {
  if (!values.length) return { mean: 0, min: 0, max: 0, sd: 0, cv: 0 };
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const mean = sum / values.length;
  let sq = 0;
  for (const v of values) sq += (v - mean) * (v - mean);
  const sd = Math.sqrt(sq / values.length);
  return { mean, min, max, sd, cv: mean > 0 ? sd / mean : 0 };
}

export interface WaveReport {
  bluePeaks: Peak[];
  redPeaks: Peak[];
  /** Red peaks that trail a blue peak, i.e. completed predator-prey waves. */
  pairedWaves: number;
  meanLagSeconds: number | null;
  periodSeconds: number | null;
  dt: number;
}

export function waveReport(history: Sample[]): WaveReport {
  const dt = history.length > 1 ? (history[history.length - 1].t - history[0].t) / (history.length - 1) : 1;
  const w = Math.max(3, Math.round(9 / dt));
  const blue = smooth(
    history.map((s) => s.blue),
    w,
  );
  const red = smooth(
    history.map((s) => s.red),
    w,
  );
  const bs = stats(blue);
  const rs = stats(red);
  const bluePeaks = findPeaks(blue, Math.max(3, (bs.max - bs.min) * 0.18, bs.mean * 0.15));
  const redPeaks = findPeaks(red, Math.max(1.5, (rs.max - rs.min) * 0.18, rs.mean * 0.15));

  const lags: number[] = [];
  let bi = 0;
  for (const rp of redPeaks) {
    while (bi + 1 < bluePeaks.length && bluePeaks[bi + 1].index < rp.index) bi++;
    const bp = bluePeaks[bi];
    if (!bp || bp.index >= rp.index) continue;
    const lag = (rp.index - bp.index) * dt;
    if (lag < 400) lags.push(lag);
  }
  let period: number | null = null;
  if (bluePeaks.length >= 2) {
    period = ((bluePeaks[bluePeaks.length - 1].index - bluePeaks[0].index) * dt) / (bluePeaks.length - 1);
  }
  return {
    bluePeaks,
    redPeaks,
    pairedWaves: lags.length,
    meanLagSeconds: lags.length ? lags.reduce((a, b) => a + b, 0) / lags.length : null,
    periodSeconds: period,
    dt,
  };
}
