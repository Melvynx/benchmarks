import type { Sample, World } from './sim/engine';

export type Tone = 'info' | 'good' | 'warn' | 'bad';
export type Mark = 'blue' | 'red' | 'fruit' | 'wave' | 'info';

export interface StoryLine {
  mark: Mark;
  text: string;
}

export interface Fact {
  label: string;
  value: string;
  sub?: string;
}

export interface Analysis {
  ready: boolean;
  tone: Tone;
  title: string;
  lead: string;
  story: StoryLine[];
  facts: Fact[];
}

export function fmtClock(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function fmtSpan(sec: number) {
  const s = Math.abs(Math.round(sec));
  if (s < 90) return `${s}s`;
  const m = s / 60;
  return `${m < 10 ? m.toFixed(1) : Math.round(m)} min`;
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function stdev(a: number[]) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map((v) => (v - m) * (v - m))));
}

/** Bucket-average a series down to at most `n` points. */
function resample(v: number[], n: number) {
  if (v.length <= n) return v.slice();
  const out: number[] = [];
  const size = v.length / n;
  for (let i = 0; i < n; i++) {
    const a = Math.floor(i * size);
    const b = Math.max(a + 1, Math.floor((i + 1) * size));
    let s = 0;
    for (let j = a; j < b; j++) s += v[j];
    out.push(s / (b - a));
  }
  return out;
}

function smooth(v: number[], radius: number) {
  return v.map((_, i) => {
    let s = 0;
    let c = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(v.length - 1, i + radius); j++) {
      s += v[j];
      c++;
    }
    return s / c;
  });
}

/** Indices of confirmed peaks: a peak counts once the series has fallen by at least `swing` after it. */
function findPeaks(v: number[], swing: number) {
  const peaks: number[] = [];
  if (v.length < 3) return peaks;
  let dir = 0;
  let hi = v[0];
  let hiI = 0;
  let lo = v[0];
  for (let i = 1; i < v.length; i++) {
    const x = v[i];
    if (dir === 0) {
      if (x > hi) {
        hi = x;
        hiI = i;
      }
      if (x < lo) lo = x;
      if (x - lo >= swing) {
        dir = 1;
        hi = x;
        hiI = i;
      } else if (hi - x >= swing) {
        dir = -1;
        lo = x;
      }
    } else if (dir === 1) {
      if (x > hi) {
        hi = x;
        hiI = i;
      } else if (hi - x >= swing) {
        peaks.push(hiI);
        dir = -1;
        lo = x;
      }
    } else if (x < lo) {
      lo = x;
    } else if (x - lo >= swing) {
      dir = 1;
      hi = x;
      hiI = i;
    }
  }
  return peaks;
}

/**
 * Lag (in buckets) at which `b` best follows `a`, positive when b trails a.
 * Periodic series correlate at many lags, so we take the local maximum closest to zero.
 */
function bestLag(a: number[], b: number[], maxLag: number) {
  const ma = mean(a);
  const mb = mean(b);
  const da = a.map((v) => v - ma);
  const db = b.map((v) => v - mb);
  const rs: number[] = [];
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let num = 0;
    let sa = 0;
    let sb = 0;
    for (let i = Math.max(0, -lag); i < Math.min(da.length, da.length - lag); i++) {
      const x = da[i];
      const y = db[i + lag];
      num += x * y;
      sa += x * x;
      sb += y * y;
    }
    const den = Math.sqrt(sa * sb);
    rs.push(den < 1e-6 ? 0 : num / den);
  }
  let pick = -1;
  for (let i = 1; i < rs.length - 1; i++) {
    if (rs[i] < 0.3 || rs[i] < rs[i - 1] || rs[i] < rs[i + 1]) continue;
    if (pick < 0 || Math.abs(i - maxLag) < Math.abs(pick - maxLag) || (Math.abs(i - maxLag) === Math.abs(pick - maxLag) && i > pick)) pick = i;
  }
  if (pick < 0) pick = rs.indexOf(Math.max(...rs));
  return { lag: pick - maxLag, r: rs[pick] };
}

function firstReach(v: number[], target: number) {
  for (let i = 0; i < v.length; i++) if (v[i] >= target) return i;
  return -1;
}

function lastAlive(samples: Sample[], key: 'blue' | 'red') {
  for (let i = samples.length - 1; i >= 0; i--) if (samples[i][key] > 0) return i;
  return -1;
}

const EMPTY: Analysis = {
  ready: false,
  tone: 'info',
  title: 'Just planted',
  lead: 'Press play and let a few minutes of garden time pass. The summary is written from the recorded history, not guessed.',
  story: [],
  facts: [],
};

export function analyze(world: World): Analysis {
  const samples = world.history.samples;
  const stats = world.stats;
  if (samples.length < 12) return EMPTY;

  const n = samples.length;
  const duration = samples[n - 1].t;
  const step = duration / Math.max(1, n - 1);
  const blue = samples.map((s) => s.blue);
  const red = samples.map((s) => s.red);
  const fruit = samples.map((s) => s.fruit);
  const cap = Math.max(1, world.fruitCapacity);

  const bluePeak = Math.max(...blue);
  const redPeak = Math.max(...red);
  const bluePeakAt = samples[blue.indexOf(bluePeak)].t;
  const redPeakAt = samples[red.indexOf(redPeak)].t;

  const lateFrom = Math.floor(n * 0.6);
  const lateBlue = blue.slice(lateFrom);
  const lateRed = red.slice(lateFrom);
  const lateFruit = fruit.slice(lateFrom).map((f) => f / cap);
  const lateFruitFrac = mean(lateFruit);
  const meanFruitFrac = mean(fruit) / cap;

  const blueNow = world.blueCount;
  const redNow = world.redCount;
  const blueIdx = lastAlive(samples, 'blue');
  const redIdx = lastAlive(samples, 'red');
  const blueGone = blueNow === 0;
  const redGone = redNow === 0;
  const blueFadedAt = blueGone && blueIdx >= 0 ? samples[Math.min(n - 1, blueIdx + 1)].t : -1;
  const redFadedAt = redGone && redIdx >= 0 ? samples[Math.min(n - 1, redIdx + 1)].t : -1;

  const bins = 240;
  const rb = smooth(resample(blue, bins), 2);
  const rr = smooth(resample(red, bins), 2);
  const bucket = duration / rb.length;
  const bSwing = Math.max(3, bluePeak * 0.22);
  const rSwing = Math.max(2, redPeak * 0.22);
  const bluePeaks = findPeaks(rb, bSwing);
  const redPeaks = findPeaks(rr, rSwing);

  const blueT80 = firstReach(rb, 0.8 * Math.max(...rb));
  const redT80 = firstReach(rr, 0.8 * Math.max(...rr));

  const both = !blueGone && !redGone;
  let lagSec = 0;
  let lagR = 0;
  if (both && rb.length > 30 && redPeak >= 2) {
    const res = bestLag(rb, rr, Math.floor(rb.length * 0.4));
    lagSec = res.lag * bucket;
    lagR = res.r;
  }

  const cvBlue = lateBlue.length ? stdev(lateBlue) / Math.max(1, mean(lateBlue)) : 0;
  const cvRed = lateRed.length ? stdev(lateRed) / Math.max(1, mean(lateRed)) : 0;
  const waves = bluePeaks.length >= 2 && redPeaks.length >= 2;
  const period = bluePeaks.length >= 2 ? ((bluePeaks[bluePeaks.length - 1] - bluePeaks[0]) / (bluePeaks.length - 1)) * bucket : 0;
  const founders = Math.max(1, stats.blueFounders);
  const stayedSmall = bluePeak <= founders * 1.3 && duration >= 240;
  const scarce = lateFruitFrac < 0.28;
  const early = duration < 90;
  const blueFirst = blueT80 >= 0 && redT80 >= 0 && blueT80 < redT80;

  const story: StoryLine[] = [];
  let tone: Tone = 'info';
  let title = '';
  let lead = '';

  if (early) {
    return {
      ...EMPTY,
      title: 'Warming up',
      lead: `Only ${fmtClock(duration)} recorded so far. Waves take several minutes of garden time, so let it run (higher sim speed helps).`,
      facts: baseFacts(),
    };
  }

  if (blueGone && redGone) {
    tone = 'bad';
    title = 'Everything faded';
    lead = `Blue disappeared at ${fmtClock(blueFadedAt)} and red at ${fmtClock(redFadedAt)}. Nothing is left in the dish.`;
  } else if (blueGone) {
    tone = 'bad';
    title = 'Blue faded, red followed';
    lead = `Blue ran out at ${fmtClock(blueFadedAt)}. The reds have nothing to feed on and are on their way out.`;
  } else if (redGone) {
    tone = 'warn';
    title = 'Red faded, blue took over';
    lead = `Red disappeared at ${fmtClock(redFadedAt)}. Blue is now limited only by fruit${scarce ? ', and fruit is running short' : ''}.`;
  } else if (waves && lagR > 0.3 && lagSec > bucket * 1.5) {
    tone = 'good';
    title = 'Out-of-phase waves';
    lead = `Blue booms, then red follows about ${fmtSpan(lagSec)} later and pulls blue back down. ${bluePeaks.length} blue waves so far${period ? `, roughly ${fmtSpan(period)} apart` : ''}.`;
  } else if (waves) {
    tone = 'info';
    title = 'Waves, but not neatly out of phase';
    lead = `${bluePeaks.length} blue and ${redPeaks.length} red waves so far, but red does not cleanly trail blue yet.`;
  } else if (stayedSmall && scarce) {
    tone = 'warn';
    title = 'Low fruit kept the garden small';
    lead = `Only ${Math.round(lateFruitFrac * 100)}% of fruit is ripe on average, so blue never got past ${bluePeak} blobs.`;
  } else if (duration >= 420 && cvBlue < 0.18 && cvRed < 0.3) {
    tone = 'good';
    title = 'Stayed balanced';
    lead = `Both groups levelled out: blue holds near ${Math.round(mean(lateBlue))} and red near ${Math.round(mean(lateRed))}.`;
  } else {
    tone = 'info';
    title = 'Still finding its rhythm';
    lead = 'Both groups are alive but no clear wave has formed yet. Give it more time or a faster sim speed.';
  }

  if (both && blueFirst && (redT80 - blueT80) * bucket > 15) {
    story.push({
      mark: 'wave',
      text: `Blue grew first (reached 80% of its peak at ${fmtClock(blueT80 * bucket)}), then red followed at ${fmtClock(redT80 * bucket)}.`,
    });
  }
  if (waves && both) {
    story.push({
      mark: 'wave',
      text: `${bluePeaks.length} blue and ${redPeaks.length} red waves recorded${lagText()}.`,
    });
  } else if (both && bluePeaks.length + redPeaks.length > 0) {
    story.push({ mark: 'wave', text: `One rise so far (blue ${bluePeaks.length}, red ${redPeaks.length}). More time will show whether it repeats.` });
  }
  if (scarce && !blueGone) {
    story.push({
      mark: 'fruit',
      text: `Fruit is the bottleneck: ${Math.round(lateFruitFrac * 100)}% ripe lately, ${Math.round(meanFruitFrac * 100)}% over the whole run.`,
    });
  } else if (!scarce && lateFruitFrac > 0.65) {
    story.push({ mark: 'fruit', text: `Fruit is plentiful (${Math.round(lateFruitFrac * 100)}% ripe). Blue is held back by reds, not by food.` });
  }
  if (!blueGone && redGone) {
    story.push({ mark: 'red', text: `Red peaked at ${redPeak} (${fmtClock(redPeakAt)}) and then faded. Blue peaked at ${bluePeak}.` });
  }
  if (blueGone) {
    story.push({ mark: 'blue', text: `Blue peaked at ${bluePeak} (${fmtClock(bluePeakAt)}) before dying out.` });
  }
  const starved = stats.blueStarved;
  const drained = stats.blueDrained;
  if (starved + drained + stats.blueOld > 0) {
    story.push({
      mark: 'blue',
      text: `Blue: ${stats.blueBorn} born; lost ${drained} to red contact, ${starved} to hunger, ${stats.blueOld} to old age.`,
    });
  }
  if (stats.redBorn + stats.redStarved + stats.redOld > 0) {
    story.push({
      mark: 'red',
      text: `Red: ${stats.redBorn} born; lost ${stats.redStarved} to hunger, ${stats.redOld} to old age.`,
    });
  }

  const last = samples[n - 1];
  const first = samples[0];
  const drift = (a: number, b: number) => Math.round((a / Math.max(0.01, b) - 1) * 100);
  const bs = blueNow ? drift(last.blueSpeed, first.blueSpeed) : 0;
  const bv = blueNow ? drift(last.blueVision, first.blueVision) : 0;
  const rs = redNow ? drift(last.redSpeed, first.redSpeed) : 0;
  const rv = redNow ? drift(last.redVision, first.redVision) : 0;
  const notable: string[] = [];
  if (Math.abs(bs) >= 4) notable.push(`blue speed ${bs > 0 ? '+' : ''}${bs}%`);
  if (Math.abs(bv) >= 4) notable.push(`blue vision ${bv > 0 ? '+' : ''}${bv}%`);
  if (Math.abs(rs) >= 4) notable.push(`red speed ${rs > 0 ? '+' : ''}${rs}%`);
  if (Math.abs(rv) >= 4) notable.push(`red vision ${rv > 0 ? '+' : ''}${rv}%`);
  if (notable.length) story.push({ mark: 'info', text: `Traits drifted since the start: ${notable.join(', ')}.` });

  return { ready: true, tone, title, lead, story, facts: baseFacts() };

  function lagText() {
    if (lagR <= 0.3) return '';
    if (Math.abs(lagSec) < bucket * 1.5) return '; red moves almost in step with blue';
    const who = lagSec > 0 ? 'red trails blue' : 'blue trails red';
    return `; ${who} by ${fmtSpan(lagSec)} (match ${lagR.toFixed(2)})`;
  }

  function baseFacts(): Fact[] {
    const facts: Fact[] = [
      { label: 'Time', value: fmtClock(duration), sub: `${n} samples · ${step.toFixed(1)}s each` },
      { label: 'Blue peak', value: `${bluePeak}`, sub: `at ${fmtClock(bluePeakAt)}` },
      { label: 'Red peak', value: `${redPeak}`, sub: `at ${fmtClock(redPeakAt)}` },
      { label: 'Fruit eaten', value: `${stats.fruitEaten}`, sub: `${Math.round(meanFruitFrac * 100)}% ripe on average` },
      { label: 'Contacts', value: `${stats.contacts}`, sub: `${stats.blueDrained} blues drained` },
    ];
    if (both && lagR > 0.3) facts.push({ label: 'Red lag', value: `${lagSec >= 0 ? '+' : '-'}${fmtSpan(lagSec)}`, sub: `match ${lagR.toFixed(2)}` });
    return facts;
  }
}
