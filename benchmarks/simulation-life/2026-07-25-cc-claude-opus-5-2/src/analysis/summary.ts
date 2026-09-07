import type { HistorySample } from "../sim/types";
import type { RunStats } from "../sim/world";

export interface Summary {
  headline: string;
  notes: string[];
  /** Small keyword chips shown under the headline. */
  tags: string[];
}

const mean = (a: number[]) =>
  a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

function stdev(a: number[]) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map((v) => (v - m) * (v - m))));
}

/** Moving average, used to keep step-to-step jitter from reading as a wave. */
export function smooth(series: number[], window = 9) {
  if (series.length < window) return series.slice();
  const out: number[] = [];
  const half = Math.floor(window / 2);
  for (let i = 0; i < series.length; i++) {
    let sum = 0;
    let n = 0;
    for (let k = -half; k <= half; k++) {
      const j = i + k;
      if (j < 0 || j >= series.length) continue;
      sum += series[j];
      n++;
    }
    out.push(sum / n);
  }
  return out;
}

/**
 * Counts full rise-and-fall cycles: the smoothed series must climb well above
 * its mean and then fall well below it before the next rise counts.
 */
export function countWaves(series: number[]) {
  const s = smooth(series);
  const m = mean(s);
  if (m <= 0.5) return 0;
  const hi = m * 1.15;
  const lo = m * 0.85;
  let above = s.length > 0 && s[0] > hi;
  let count = 0;
  for (const v of s) {
    if (!above && v > hi) {
      above = true;
      count++;
    } else if (above && v < lo) {
      above = false;
    }
  }
  return count;
}

export function correlation(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (n < 4) return 0;
  const ma = mean(a.slice(0, n));
  const mb = mean(b.slice(0, n));
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
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

/** Seconds by which red trails blue, found by sliding red back over blue. */
export function phaseLag(blue: number[], red: number[], dtPerSample: number) {
  const maxLag = Math.min(200, Math.floor(blue.length / 3));
  let best = 0;
  let bestC = -2;
  for (let lag = 0; lag <= maxLag; lag++) {
    const c = correlation(blue.slice(0, blue.length - lag), red.slice(lag));
    if (c > bestC) {
      bestC = c;
      best = lag;
    }
  }
  return { seconds: best * dtPerSample, strength: bestC };
}

export function summarize(history: HistorySample[], stats: RunStats): Summary {
  const notes: string[] = [];
  const tags: string[] = [];
  if (history.length < 8) {
    return {
      headline: "The garden is still warming up.",
      notes: ["Press play and let a minute or two of garden time go by."],
      tags: [],
    };
  }

  const last = history[history.length - 1];
  const tail = history.slice(Math.floor(history.length * 0.3));
  const blue = tail.map((s) => s.blue);
  const red = tail.map((s) => s.red);
  const fruit = tail.map((s) => s.fruit);
  const blueAvg = mean(blue);
  const redAvg = mean(red);
  const fruitAvg = mean(fruit);
  const dtPerSample = history.length > 1 ? history[1].t - history[0].t : 0.5;

  const blueWaves = countWaves(blue);
  const redWaves = countWaves(red);
  const lag = phaseLag(blue, red, dtPerSample);
  const corr = correlation(blue, red);

  // Trend: does the second half of the run sit near the first half?
  const half = Math.floor(tail.length / 2);
  const earlyTotal = mean(tail.slice(0, half).map((s) => s.blue + s.red));
  const lateTotal = mean(tail.slice(half).map((s) => s.blue + s.red));
  const drift = earlyTotal > 0 ? (lateTotal - earlyTotal) / earlyTotal : 0;

  let headline: string;

  if (last.blue === 0 && last.red === 0) {
    headline = "Both groups faded and the garden went quiet.";
    tags.push("collapse");
    if (stats.blueExtinctAt !== null && stats.redExtinctAt !== null) {
      const first =
        stats.blueExtinctAt < stats.redExtinctAt ? "Blue" : "Red";
      notes.push(
        `${first} blobs went first, at ${Math.min(
          stats.blueExtinctAt,
          stats.redExtinctAt,
        ).toFixed(0)}s of garden time.`,
      );
    }
  } else if (last.red === 0 && last.blue > 0) {
    headline = "Red blobs faded and the world settled into a simpler state.";
    tags.push("red gone", "blue only");
    notes.push(
      stats.redExtinctAt !== null
        ? `The last red blob went at ${stats.redExtinctAt.toFixed(0)}s. Blue blobs now sit around ${blueAvg.toFixed(0)}, held back only by fruit.`
        : `Blue blobs now sit around ${blueAvg.toFixed(0)}, held back only by fruit.`,
    );
  } else if (last.blue === 0 && last.red > 0) {
    headline = "Blue blobs ran out, and the red group is running on empty.";
    tags.push("blue gone");
    notes.push(
      "With nothing to make contact with, the remaining reds burn energy until they fade too.",
    );
  } else if (blueWaves >= 2 && redWaves >= 2 && lag.seconds > dtPerSample) {
    headline = "Blue blobs grew first, then red blobs followed — over and over.";
    tags.push("waves", "out of phase");
    notes.push(
      `${blueWaves} blue rises and ${redWaves} red rises, with red trailing blue by about ${lag.seconds.toFixed(
        0,
      )}s.`,
    );
  } else if (blueWaves >= 2 || redWaves >= 2) {
    headline = "The garden pulsed a few times without settling into a rhythm.";
    tags.push("uneven");
    notes.push(
      `${blueWaves} blue rises and ${redWaves} red rises so far. Longer runs usually sharpen the pattern.`,
    );
  } else if (fruitAvg < stats.peakFruit * 0.35 && blueAvg < 12) {
    headline = "Low fruit kept the garden small.";
    tags.push("scarce", "small");
  } else if (Math.abs(drift) < 0.18 && stdev(blue) < blueAvg * 0.45) {
    headline = "The garden stayed balanced.";
    tags.push("steady");
  } else if (drift > 0.18) {
    headline = "The garden is still filling up.";
    tags.push("growing");
  } else {
    headline = "The garden is thinning out.";
    tags.push("shrinking");
  }

  if (last.blue > 0 || last.red > 0) {
    notes.push(
      `Averages over the recorded run: ${blueAvg.toFixed(1)} blue, ${redAvg.toFixed(
        1,
      )} red, ${fruitAvg.toFixed(0)} fruit on the trees.`,
    );
  }

  if (fruitAvg < stats.peakFruit * 0.3 && stats.peakFruit > 0) {
    notes.push(
      "Trees are picked nearly bare — fruit growth is the limit on the whole garden.",
    );
    if (!tags.includes("scarce")) tags.push("fruit-limited");
  } else if (fruitAvg > stats.peakFruit * 0.75) {
    notes.push("Fruit sits mostly untouched, so something other than food is capping the blue group.");
  }

  if (stats.blueDeaths > 0) {
    const takenPct = Math.round((stats.blueTaken / stats.blueDeaths) * 100);
    notes.push(
      `${takenPct}% of blue blobs ended after red contact; the rest ran out of energy or reached old age.`,
    );
  }

  if (corr < -0.15 && last.blue > 0 && last.red > 0) {
    notes.push(
      `Blue and red counts move against each other (correlation ${corr.toFixed(2)}), the signature of a predator-prey loop.`,
    );
    if (!tags.includes("out of phase")) tags.push("out of phase");
  }

  if (Math.abs(drift) < 0.15 && last.blue > 0) {
    notes.push("Group sizes have levelled off rather than growing without limit.");
    if (!tags.includes("steady")) tags.push("levelled off");
  }

  if (stats.maxGeneration > 2) {
    notes.push(
      `The garden is ${stats.maxGeneration} generations deep, with ${
        stats.blueBirths + stats.redBirths
      } copies made and ${stats.meals} fruit eaten.`,
    );
  }

  return { headline, notes, tags };
}
