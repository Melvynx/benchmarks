import { BLUE, RED, type Simulation } from "./simulation";

export interface Summary {
  tone: "start" | "wave" | "calm" | "fade" | "empty" | "meadow";
  headline: string;
  lines: string[];
  chips: { label: string; value: string }[];
}

export interface Turn {
  i: number;
  t: number;
  v: number;
  peak: boolean;
}

export function smooth(xs: number[], w: number): number[] {
  const out = new Array<number>(xs.length);
  let sum = 0;
  const q: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    q.push(xs[i]);
    sum += xs[i];
    if (q.length > w) sum -= q.shift()!;
    out[i] = sum / q.length;
  }
  const half = Math.floor(w / 2);
  return out.map((_, i) => out[Math.min(out.length - 1, i + half)]);
}

/** Zig-zag turning points: a peak counts once the series has fallen `threshold` below it (and vice versa). */
export function turningPoints(t: number[], xs: number[], threshold: number): Turn[] {
  const turns: Turn[] = [];
  if (xs.length < 3) return turns;
  let hiI = 0;
  let loI = 0;
  let dir = 0;
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] > xs[hiI]) hiI = i;
    if (xs[i] < xs[loI]) loI = i;
    if (dir >= 0 && xs[hiI] - xs[i] >= threshold && (dir === 1 || hiI > 0)) {
      turns.push({ i: hiI, t: t[hiI], v: xs[hiI], peak: true });
      dir = -1;
      loI = i;
    } else if (dir <= 0 && xs[i] - xs[loI] >= threshold && (dir === -1 || loI > 0)) {
      turns.push({ i: loI, t: t[loI], v: xs[loI], peak: false });
      dir = 1;
      hiI = i;
    }
  }
  return turns;
}

function range(xs: number[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const x of xs) {
    if (x < lo) lo = x;
    if (x > hi) hi = x;
  }
  return [lo, hi];
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function fmtT(s: number): string {
  const total = Math.round(s);
  if (total < 90) return `${total}s`;
  return `${Math.floor(total / 60)}m${(total % 60).toString().padStart(2, "0")}s`;
}

export interface WaveStats {
  bluePeaks: Turn[];
  redPeaks: Turn[];
  waves: number;
  lag: number | null;
  period: number | null;
}

export function waveStats(sim: Simulation): WaveStats {
  const h = sim.history;
  const blue = smooth(h.blue, 9);
  const red = smooth(h.red, 9);
  const [, bHi] = range(blue);
  const [, rHi] = range(red);
  const bTurns = turningPoints(h.t, blue, Math.max(4, bHi * 0.18));
  const rTurns = turningPoints(h.t, red, Math.max(2, rHi * 0.18));
  const bluePeaks = bTurns.filter((x) => x.peak);
  const redPeaks = rTurns.filter((x) => x.peak);
  const lags: number[] = [];
  for (let k = 0; k < bluePeaks.length; k++) {
    const from = bluePeaks[k].t;
    const until = k + 1 < bluePeaks.length ? bluePeaks[k + 1].t : from + 400;
    const rp = redPeaks.find((r) => r.t > from + 20 && r.t <= until);
    if (rp) lags.push(rp.t - from);
  }
  const gaps: number[] = [];
  for (let k = 1; k < bluePeaks.length; k++) gaps.push(bluePeaks[k].t - bluePeaks[k - 1].t);
  return {
    bluePeaks,
    redPeaks,
    waves: lags.length,
    lag: lags.length ? mean(lags) : null,
    period: gaps.length ? mean(gaps) : null,
  };
}

export function summarize(sim: Simulation): Summary {
  const h = sim.history;
  const n = h.t.length;
  const T = sim.time;
  const nb = sim.counts[BLUE];
  const nr = sim.counts[RED];
  const start = sim.startParams;
  const chips: Summary["chips"] = [
    { label: "Time", value: fmtT(T) },
    { label: "Peak blue", value: String(sim.stats.peak[BLUE]) },
    { label: "Peak red", value: String(sim.stats.peak[RED]) },
    { label: "Births", value: String(sim.stats.births[BLUE] + sim.stats.births[RED]) },
    { label: "Boops", value: String(sim.stats.boops) },
    { label: "Fruit eaten", value: String(sim.stats.fruitsEaten) },
  ];

  if (T < 25 || n < 10) {
    return {
      tone: "start",
      headline: "The garden is just waking up.",
      lines: [
        `${start.trees} trees, ${start.blueStart} blues and ${start.redStart} reds were placed in the dish.`,
        "Give it a moment: blues are heading for fruit, reds are looking around.",
      ],
      chips,
    };
  }

  const w = waveStats(sim);
  if (w.waves > 0) chips.splice(1, 0, { label: "Waves", value: String(w.waves) });
  if (w.period && w.waves >= 2) chips.splice(2, 0, { label: "Wave length", value: `~${fmtT(w.period)}` });
  if (w.lag) chips.splice(w.waves >= 2 ? 3 : 2, 0, { label: "Red lag", value: `~${fmtT(w.lag)}` });

  const lines: string[] = [];
  const recent = Math.max(0, n - 150);
  const recentBlue = h.blue.slice(recent);
  const recentRed = h.red.slice(recent);
  const [rbLo, rbHi] = range(recentBlue);
  const [rrLo, rrHi] = range(recentRed);
  const blueSteady = rbHi - rbLo <= Math.max(8, mean(recentBlue) * 0.35);
  const redSteady = rrHi - rrLo <= Math.max(4, mean(recentRed) * 0.4);
  const capacity = sim.fruitCapacity;
  const peakBlue = sim.stats.peak[BLUE];
  const blueVanished = sim.markers.find((m) => m.kind === BLUE && m.type === "vanished");
  const redVanished = sim.markers.find((m) => m.kind === RED && m.type === "vanished");
  const firstBlueTrough = turningPoints(h.t, smooth(h.blue, 9), Math.max(4, peakBlue * 0.18)).find((x) => !x.peak);
  const firstRedTrough = turningPoints(h.t, smooth(h.red, 9), Math.max(2, sim.stats.peak[RED] * 0.18)).find(
    (x) => !x.peak,
  );

  const redHeavy = start.redStart > 0 && start.redStart >= start.blueStart * 0.5;
  const redHeavyStory =
    redHeavy && !!firstBlueTrough && firstBlueTrough.t < 200 && (!firstRedTrough || firstRedTrough.t > firstBlueTrough.t);
  const small = peakBlue < 60 || capacity < 45;

  let tone: Summary["tone"];
  let headline: string;

  if (nb === 0 && nr === 0) {
    tone = "empty";
    headline = "Everyone faded and the dish went quiet.";
    if (blueVanished && redVanished && blueVanished.t <= redVanished.t) {
      lines.push(
        `Blues vanished at ${fmtT(blueVanished.t)}; with nothing left to boop, reds ran out of energy by ${fmtT(redVanished.t)}.`,
      );
    }
    lines.push("Only the trees remain, and their fruit grows back untouched.");
  } else if (nb === 0) {
    tone = "fade";
    headline = "Blue blobs are gone and the reds are running on empty.";
    lines.push(`The last blue disappeared at ${fmtT(blueVanished?.t ?? T)}. Reds can only wander and fade now.`);
  } else if (nr === 0) {
    const hadReds = start.redStart > 0 || sim.stats.births[RED] > 0;
    tone = hadReds ? "fade" : "meadow";
    headline = hadReds
      ? "Red blobs faded and the world settled into a simpler state."
      : "A quiet blue meadow with no reds at all.";
    if (redVanished) {
      lines.push(`Reds disappeared at ${fmtT(redVanished.t)} when boops became too rare to keep them going.`);
    }
    if (blueSteady && T > 120) {
      lines.push(
        `Blues leveled out around ${Math.round(mean(recentBlue))}, held there by the fruit supply (${capacity} fruit spots).`,
      );
    } else {
      lines.push("With no reds around, only fruit limits how many blues the garden can feed.");
    }
  } else if (redHeavyStory && T < 500) {
    tone = "wave";
    headline = "Blues dipped first, then the hungry reds faded.";
  } else if (w.waves >= 2) {
    tone = "wave";
    headline = `The garden stayed balanced: ${w.waves} waves so far.`;
    lines.push(
      `Each time blues boomed, reds followed about ${fmtT(w.lag ?? 0)} later, then blues dipped and reds faded back.`,
    );
  } else if (w.waves === 1) {
    tone = "wave";
    headline = "Blue blobs grew first, then red blobs followed.";
    lines.push(`Reds peaked about ${fmtT(w.lag ?? 0)} after blues, as boops got easier to find.`);
  } else if (blueSteady && redSteady && T > 150) {
    tone = "calm";
    headline = "The garden settled into a calm balance.";
    lines.push(`Blues hover around ${Math.round(mean(recentBlue))} and reds around ${Math.round(mean(recentRed))}.`);
  } else {
    tone = "wave";
    headline = "The garden is still finding its rhythm.";
  }

  if (redHeavyStory && firstBlueTrough) {
    const redLow = firstRedTrough ? ` to ${Math.round(firstRedTrough.v)} by ${fmtT(firstRedTrough.t)}` : "";
    lines.push(
      `Reds started strong (${start.redStart} vs ${start.blueStart} blues): blues dipped first to ${Math.round(firstBlueTrough.v)} at ${fmtT(firstBlueTrough.t)}, then reds faded${redLow} as boops grew rare.`,
    );
  } else if (w.bluePeaks[0] && w.redPeaks[0] && w.bluePeaks[0].t < w.redPeaks[0].t && tone === "wave" && w.waves >= 2) {
    lines.push("Blue blobs grew first, then red blobs followed.");
  }

  const growthWindow = h.blue.slice(0, Math.min(n, 61));
  const blueStart = Math.max(1, h.blue[0]);
  const blueMax60 = range(growthWindow)[1];
  if (blueMax60 >= blueStart * 2.2 && !small) {
    const ti = growthWindow.indexOf(blueMax60);
    const story = `${h.blue[0]} → ${blueMax60} in ${fmtT(h.t[ti])}`;
    lines.push(
      blueMax60 >= blueStart * 4
        ? `Plenty of fruit let blues multiply fast: ${story}.`
        : `Blues multiplied quickly while the trees were full: ${story}.`,
    );
  }

  if (small && nb > 0) {
    lines.push(`Low fruit kept the garden small: blues never topped ${peakBlue}.`);
  }

  const [fLo, fHi] = range(h.fruit.slice(recent));
  if (nb > 0 && fHi - fLo > Math.max(10, capacity * 0.3)) {
    lines.push("Fruit piles up while blues are scarce and gets stripped bare when they boom.");
  }

  if (nb > 0 && T > 200 && rbHi < peakBlue * 0.95 && (tone === "wave" || tone === "calm")) {
    lines.push(
      blueSteady
        ? `Group sizes level off instead of growing forever: blues stayed between ${rbLo} and ${rbHi} lately.`
        : `The waves stay bounded instead of growing forever: blues ranged ${rbLo}–${rbHi} lately (peak ${peakBlue}).`,
    );
  }

  return { tone, headline, lines: lines.slice(0, 5), chips };
}
