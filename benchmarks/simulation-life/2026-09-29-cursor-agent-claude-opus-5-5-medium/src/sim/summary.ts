import type { Params } from "./params";
import type { HistoryPoint, SimStats } from "./simulation";

export type Tone = "calm" | "wavy" | "boom" | "small" | "fade" | "empty" | "early";

export interface RunSummary {
  headline: string;
  tone: Tone;
  lines: string[];
  waves: number;
  lag: number | null;
}

function smooth(values: number[], win: number) {
  const out = new Array<number>(values.length);
  let sum = 0;
  const q: number[] = [];
  for (let i = 0; i < values.length; i++) {
    q.push(values[i]);
    sum += values[i];
    if (q.length > win) sum -= q.shift()!;
    out[i] = sum / q.length;
  }
  const half = Math.floor(win / 2);
  return out.map((_, i) => out[Math.min(out.length - 1, i + half)]);
}

/** Local maxima whose drop on both sides is at least `prominence`. */
function findPeaks(v: number[], prominence: number) {
  const peaks: number[] = [];
  let candidate = -1;
  let lowSinceLast = v[0] ?? 0;
  for (let i = 1; i < v.length; i++) {
    if (candidate < 0) {
      lowSinceLast = Math.min(lowSinceLast, v[i]);
      if (v[i] - lowSinceLast >= prominence) candidate = i;
    } else {
      if (v[i] > v[candidate]) candidate = i;
      else if (v[candidate] - v[i] >= prominence) {
        peaks.push(candidate);
        lowSinceLast = v[i];
        candidate = -1;
      }
    }
  }
  return peaks;
}

function mean(a: number[]) {
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
}

function std(a: number[]) {
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
}

function bestLag(a: number[], b: number[], maxLag: number) {
  const ma = mean(a);
  const mb = mean(b);
  let best = -Infinity;
  let bestK = 0;
  for (let k = 0; k <= maxLag; k++) {
    let s = 0;
    let n = 0;
    for (let i = 0; i + k < a.length; i++) {
      s += (a[i] - ma) * (b[i + k] - mb);
      n++;
    }
    const c = n > 0 ? s / n : -Infinity;
    if (c > best) {
      best = c;
      bestK = k;
    }
  }
  const norm = std(a) * std(b);
  return { lag: bestK, corr: norm > 0 ? best / norm : 0 };
}

const fmtT = (t: number) => (t < 120 ? `${Math.round(t)}s` : `${(t / 60).toFixed(1)} min`);

export function fruitSupply(p: Params) {
  const cycle = p.fruitDelay + 1 / Math.max(0.01, p.fruitGrowth);
  return (p.trees * p.fruitLimit) / cycle;
}

export function summarize(history: HistoryPoint[], stats: SimStats, params: Params): RunSummary {
  const lines: string[] = [];
  const last = history[history.length - 1];
  if (!last || last.t < 25) {
    return { headline: "The garden is just waking up…", tone: "early", lines: ["Press play and give it a little while — stories take a minute to unfold."], waves: 0, lag: null };
  }
  const dt = history.length > 1 ? history[1].t - history[0].t : 0.5;
  const blue = history.map((h) => h.blue);
  const red = history.map((h) => h.red);
  const fruit = history.map((h) => h.fruit);
  const win = Math.max(3, Math.round(8 / dt));
  const sb = smooth(blue, win);
  const sr = smooth(red, win);

  const bRange = Math.max(...sb) - Math.min(...sb);
  const rRange = Math.max(...sr) - Math.min(...sr);
  const bPeaks = findPeaks(sb, Math.max(3, bRange * 0.2));
  const rPeaks = findPeaks(sr, Math.max(2, rRange * 0.2));

  const blueGone = stats.extinctAt.blue;
  const redGone = stats.extinctAt.red;
  const bothAlive = last.blue > 0 && last.red > 0;

  let lag: number | null = null;
  if (bothAlive || (redGone !== null && redGone > 120)) {
    const end = redGone !== null ? history.findIndex((h) => h.t >= redGone) : history.length;
    const from = Math.floor(end * 0.15);
    if (end - from > 60 / dt) {
      const r = bestLag(sb.slice(from, end), sr.slice(from, end), Math.round(90 / dt));
      if (r.corr > 0.25 && r.lag > 0) lag = r.lag * dt;
    }
  }

  const third = Math.floor(history.length * 0.66);
  const tail = history.slice(third);
  const tailB = tail.map((h) => h.blue);
  const tailR = tail.map((h) => h.red);
  const cvB = mean(tailB) > 0 ? std(tailB) / mean(tailB) : 0;
  const cvR = mean(tailR) > 0 ? std(tailR) / mean(tailR) : 0;

  let headline = "";
  let tone: Tone = "calm";

  const firstBluePeak = bPeaks.length ? history[bPeaks[0]] : null;
  const firstRedPeak = rPeaks.length ? history[rPeaks[0]] : null;
  const supply = fruitSupply(params);
  const wavesCount = Math.min(bPeaks.length, rPeaks.length);

  if (blueGone !== null && redGone !== null) {
    headline = "Both blob groups faded — only the fruit trees remain.";
    tone = "empty";
    if (redGone > blueGone) lines.push(`Blue blobs faded at ${fmtT(blueGone)}; the red blobs lost their only food and faded at ${fmtT(redGone)}.`);
    else lines.push(`Red blobs faded at ${fmtT(redGone)}, and blue blobs faded later at ${fmtT(blueGone)}.`);
  } else if (redGone !== null) {
    tone = "fade";
    const minBlueIdx = blue.slice(0, history.findIndex((h) => h.t >= redGone) + 1).reduce((mi, v, i, arr) => (v < arr[mi] ? i : mi), 0);
    const minBlue = history[minBlueIdx];
    if (stats.start.red >= stats.start.blue * 0.6 && minBlue && minBlue.t < redGone) {
      headline = "Blue dipped first, then the reds ran low and faded.";
      lines.push(`So many reds meant blue fell to ${minBlue.blue} by ${fmtT(minBlue.t)}. With few blues left to boop, reds ran out of energy and faded at ${fmtT(redGone)}.`);
    } else if (supply < 4 && mean(blue) < 25) {
      tone = "small";
      headline = "Low fruit kept the garden small — too few blues to feed the reds.";
      lines.push(`The last red faded at ${fmtT(redGone)}, leaving a small blue-and-fruit garden.`);
    } else {
      headline = "Red blobs faded; the world settled into a simpler blue-and-fruit garden.";
      lines.push(`Blue blobs became too rare for the reds, and the last red faded at ${fmtT(redGone)}.`);
    }
    if (last.blue > 0) lines.push(`Without reds, blue settled near what the fruit can feed (${last.blue} now).`);
  } else if (blueGone !== null) {
    tone = "fade";
    headline = "Blue blobs faded — the reds are running on empty.";
    lines.push(`The last blue blob faded at ${fmtT(blueGone)}. Reds have nothing left to boop, so they'll fade too.`);
  }

  const smallGarden = supply < 4 && mean(blue) < 25;
  if (smallGarden) {
    lines.unshift(`Low fruit kept the garden small: trees made only ~${supply.toFixed(1)} fruit/s, so blue averaged just ${mean(blue).toFixed(0)} and red ${mean(red).toFixed(1)}.`);
  }

  if (!headline) {
    if (smallGarden) {
      headline = "Low fruit kept the garden small.";
      tone = "small";
    } else if (last.t < 150) {
      headline = "Blue and red are still finding their rhythm…";
      tone = "early";
    } else if (wavesCount >= 2 && lag !== null) {
      headline = `The garden stayed balanced: ${wavesCount} waves and counting.`;
      tone = "wavy";
    } else if (cvB < 0.18 && cvR < 0.3 && last.t > 300) {
      headline = `The groups leveled out around ${Math.round(mean(tailB))} blue and ${Math.round(mean(tailR))} red.`;
      tone = "calm";
    } else {
      headline = "The garden stayed balanced — both groups keep coming back.";
      tone = "wavy";
    }
  }

  if (firstBluePeak && stats.peak.blue.value > stats.start.blue * 2 && firstBluePeak.t < 120) {
    lines.push(`Blue boomed early, reaching ${Math.round(firstBluePeak.blue)} by ${fmtT(firstBluePeak.t)} on ~${supply.toFixed(1)} fruit/s.`);
    if (tone === "wavy" || tone === "calm") tone = supply > 12 ? "boom" : tone;
  }
  if (firstBluePeak && firstRedPeak && firstBluePeak.t < firstRedPeak.t) {
    lines.push(`Blue blobs grew first (peak ${fmtT(firstBluePeak.t)}), then red blobs followed (peak ${fmtT(firstRedPeak.t)}).`);
  } else if (firstRedPeak && firstBluePeak && firstRedPeak.t < firstBluePeak.t && stats.start.red > 0) {
    lines.push(`Reds peaked first (${fmtT(firstRedPeak.t)}) from their big head start, and blue recovered after.`);
  }
  if (lag !== null && bothAlive) {
    lines.push(`Red waves trail blue waves by about ${fmtT(lag)} — more blues feed more reds, then reds thin the blues.`);
  }
  if (bothAlive && last.t > 300 && cvB < 0.18 && cvR < 0.3 && tone !== "calm") {
    lines.push(`Lately the swings are gentle: around ${Math.round(mean(tailB))} blue and ${Math.round(mean(tailR))} red.`);
  }
  if (bothAlive && mean(fruit.slice(third)) > params.trees * params.fruitLimit * 0.6) {
    lines.push("Lots of fruit hangs uneaten — blues are the bottleneck, not food.");
  } else if (last.blue > 0 && mean(fruit.slice(third)) < params.trees * params.fruitLimit * 0.15) {
    lines.push("Fruit is picked almost as soon as it ripens — food limits the blues.");
  }

  return { headline, tone, lines, waves: wavesCount, lag };
}
