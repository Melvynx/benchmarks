import type { Params, Sample, Stats } from "./sim";
import { fmtTime } from "./charts";

export interface Summary {
  headline: string;
  mood: "balanced" | "wavy" | "boom" | "small" | "faded" | "empty" | "early";
  lines: string[];
}

interface Peak {
  t: number;
  v: number;
}

function smooth(h: Sample[], key: "blue" | "red", seconds: number): number[] {
  if (h.length < 2) return h.map((s) => s[key]);
  const dt = Math.max(1e-6, (h[h.length - 1].t - h[0].t) / (h.length - 1));
  const win = Math.max(1, Math.round(seconds / dt / 2));
  const out: number[] = [];
  let sum = 0;
  let lo = 0;
  let hi = -1;
  for (let i = 0; i < h.length; i++) {
    while (hi < Math.min(h.length - 1, i + win)) sum += h[++hi][key];
    while (lo < i - win) sum -= h[lo++][key];
    out.push(sum / (hi - lo + 1));
  }
  return out;
}

/** Local maxima that stand out from the surrounding troughs. */
function peaks(h: Sample[], ys: number[], minGap: number): Peak[] {
  const m = mean(ys);
  const sd = Math.sqrt(mean(ys.map((y) => (y - m) ** 2)));
  const prom = Math.max(4, sd * 0.9);
  const found: Peak[] = [];
  let lastLow = ys[0];
  let cand: Peak | null = null;
  for (let i = 1; i < ys.length; i++) {
    const v = ys[i];
    if (cand) {
      if (v > cand.v) cand = { t: h[i].t, v };
      else if (cand.v - v >= prom) {
        if (!found.length || cand.t - found[found.length - 1].t >= minGap) found.push(cand);
        cand = null;
        lastLow = v;
      }
    } else {
      if (v < lastLow) lastLow = v;
      if (v - lastLow >= prom) cand = { t: h[i].t, v };
    }
  }
  return found;
}

function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function cv(xs: number[]) {
  const m = mean(xs);
  if (m <= 0) return 0;
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))) / m;
}

export function summarize(h: Sample[], stats: Stats, p: Params, now: number): Summary {
  const last = h[h.length - 1];
  if (!last || now < 25) {
    return {
      headline: "The garden is waking up",
      mood: "early",
      lines: ["Press play and let it run for a minute or two. The story builds from the recorded history."],
    };
  }

  const lines: string[] = [];
  const blueS = smooth(h, "blue", 12);
  const redS = smooth(h, "red", 12);
  const bp = peaks(h, blueS, 40);
  const rp = peaks(h, redS, 40);
  const maxBlue = Math.max(...h.map((s) => s.blue));
  const maxRed = Math.max(...h.map((s) => s.red));
  const fruitCap = Math.max(1, p.trees * p.fruitLimit);
  const startBlue = h[0].blue;
  const startRed = h[0].red;

  // Pair each blue peak with the next red peak to measure the chase lag.
  const lags: number[] = [];
  let j = 0;
  for (const b of bp) {
    while (j < rp.length && rp[j].t < b.t) j++;
    if (j < rp.length && rp[j].t - b.t < 150) lags.push(rp[j].t - b.t);
  }
  const lag = mean(lags);

  const recent = h.filter((s) => s.t >= now - Math.min(300, now * 0.5));
  const recentBlue = recent.map((s) => s.blue);
  const recentRed = recent.map((s) => s.red);
  const blueNow = last.blue;
  const redNow = last.red;

  // Opening act.
  const early = h.filter((s) => s.t <= 90);
  const earlyMaxBlue = Math.max(...early.map((s) => s.blue));
  const earlyMinBlue = Math.min(...early.map((s) => s.blue));
  const redHeavyStart = startRed >= startBlue * 0.5 && startRed > 0;
  if (redHeavyStart && earlyMinBlue < startBlue * 0.6) {
    const dip = early.find((s) => s.blue === earlyMinBlue)!;
    lines.push(
      `Lots of reds at the start: blues dipped first (down to ${earlyMinBlue} by ${fmtTime(dip.t)}), then reds ran short of blues to boop and faded back.`,
    );
  } else if (bp.length && rp.length && rp[0].t > bp[0].t) {
    lines.push(
      `Blue blobs grew first (peak ${Math.round(bp[0].v)} at ${fmtTime(bp[0].t)}), then red blobs followed (peak ${Math.round(rp[0].v)} at ${fmtTime(rp[0].t)}).`,
    );
  }
  if (earlyMaxBlue >= startBlue * 2.5 && startBlue > 0) {
    const t = early.find((s) => s.blue >= startBlue * 2.5)!.t;
    lines.push(`Plenty of fruit: blues multiplied fast, from ${startBlue} to ${startBlue * 2.5 | 0}+ in ${fmtTime(t)}.`);
  }

  // Waves.
  if (lags.length >= 2) {
    lines.push(`${lags.length} waves so far: each red peak trailed a blue peak by about ${Math.round(lag)}s.`);
  }

  // Endings and states.
  let headline = "";
  let mood: Summary["mood"] = "balanced";
  const smallGarden = fruitCap < 30 || p.fruitGrowth < 0.6;
  const steady = (xs: number[]) => {
    const m = mean(xs);
    const sd = Math.sqrt(mean(xs.map((v) => (v - m) ** 2)));
    return sd / Math.max(1, m) < 0.15 || sd < 4;
  };
  if (smallGarden && maxBlue < 40 && blueNow > 0) {
    headline = "Small and steady";
    mood = "small";
    lines.push(`Low fruit kept the garden small: blues never passed ${maxBlue}, and reds peaked at ${maxRed}.`);
    if (redNow === 0 && p.redStart > 0)
      lines.push(
        `Red blobs faded at ${fmtTime(stats.redExtinctAt ?? now)}: there were never enough blues to keep them fed. Blues hover near ${Math.round(mean(recentBlue))}, the most this fruit can carry.`,
      );
  } else if (blueNow === 0 && redNow === 0) {
    headline = "Everyone faded";
    mood = "empty";
    if (stats.blueExtinctAt !== null) lines.push(`Blue blobs vanished at ${fmtTime(stats.blueExtinctAt)}. Without them, the reds ran out of energy.`);
    lines.push("Only fruit is left. The trees fill back up to their limit.");
  } else if (redNow === 0 && p.redStart > 0) {
    headline = "Reds faded, blues settled";
    mood = "faded";
    const t = stats.redExtinctAt ?? now;
    lines.push(`Red blobs faded at ${fmtTime(t)}, after blues got too rare to find.`);
    const tail = h.filter((s) => s.t >= t + 40);
    if (tail.length > 20) {
      const late = tail.slice(-Math.floor(tail.length / 2)).map((s) => s.blue);
      const avg = Math.round(mean(late));
      lines.push(
        steady(late)
          ? `The world settled into a simpler blue-and-fruit state, leveling out near ${avg} blues. Fruit is the only limit now.`
          : `Blues are climbing back without predators and will level out once fruit runs short.`,
      );
    } else lines.push("The world is settling into a simpler blue-and-fruit state.");
  } else if (blueNow === 0 && p.blueStart > 0) {
    headline = "Blues gone, reds fading";
    mood = "empty";
    lines.push(`Blue blobs vanished at ${fmtTime(stats.blueExtinctAt ?? now)}. The reds can only fade from here.`);
  } else if (lags.length >= 2) {
    const amp = (Math.max(...recentBlue) - Math.min(...recentBlue)) / Math.max(1, mean(recentBlue));
    const deep = Math.min(...recentBlue) <= 3 || Math.min(...recentRed) <= 3;
    headline = deep ? "Boom and bust" : amp > 1 ? "Big swinging waves" : "Balanced waves";
    mood = deep ? "boom" : "wavy";
    lines.push(
      deep
        ? "The swings run deep. Each crash nearly empties one group, so a single unlucky dip could end a side."
        : amp > 1
          ? "Neither side wins for long: each group keeps crashing and coming back, out of step with the other."
          : "The garden stayed balanced: both groups keep falling and coming back.",
    );
  } else if (cv(recentBlue) < 0.15 && cv(recentRed) < 0.25 && redNow > 0) {
    headline = "Calm balance";
    mood = "balanced";
    lines.push(`The garden stayed balanced near ${Math.round(mean(recentBlue))} blues and ${Math.round(mean(recentRed))} reds.`);
  } else {
    headline = "Still finding its rhythm";
    mood = "wavy";
  }

  // Fruit read-out.
  const avgFruit = mean(recent.map((s) => s.fruit)) / fruitCap;
  if (avgFruit < 0.25 && blueNow > 0) lines.push(`Fruit is mostly picked clean (${Math.round(avgFruit * 100)}% ripe lately). Blues are food-limited.`);
  else if (avgFruit > 0.75 && blueNow > 0 && redNow > 0)
    lines.push(`Fruit is piling up (${Math.round(avgFruit * 100)}% ripe). Reds, not food, are keeping blues down.`);

  return { headline, mood, lines };
}
