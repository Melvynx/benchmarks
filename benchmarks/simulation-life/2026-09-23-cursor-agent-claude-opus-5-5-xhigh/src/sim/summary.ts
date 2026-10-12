import { RULES } from "./params";
import type { World } from "./world";

export type Mood =
  | "waking"
  | "balanced"
  | "swinging"
  | "booming"
  | "small"
  | "steady"
  | "settled"
  | "collapsing"
  | "empty";

export const MOOD_LABEL: Record<Mood, string> = {
  waking: "Waking up",
  balanced: "Balanced",
  swinging: "Swinging",
  booming: "Booming",
  small: "Small & steady",
  steady: "Levelled out",
  settled: "Simpler state",
  collapsing: "Collapsing",
  empty: "Empty",
};

export interface Summary {
  mood: Mood;
  headline: string;
  lines: string[];
  waves: number;
  lagSeconds: number | null;
  capacity: number;
  fruitPerMinute: number;
}

const fmtT = (t: number) => {
  if (t < 90) return `${Math.round(t)}s`;
  const m = Math.floor(t / 60);
  const s = Math.round(t % 60);
  return `${m}m${s ? ` ${String(s).padStart(2, "0")}s` : ""}`;
};

function smooth(v: number[], win: number): number[] {
  if (win <= 1) return v.slice();
  const out = new Array<number>(v.length);
  let acc = 0;
  const half = Math.floor(win / 2);
  const prefix = new Array<number>(v.length + 1);
  prefix[0] = 0;
  for (let i = 0; i < v.length; i++) {
    acc += v[i];
    prefix[i + 1] = acc;
  }
  for (let i = 0; i < v.length; i++) {
    const a = Math.max(0, i - half);
    const b = Math.min(v.length, i + half + 1);
    out[i] = (prefix[b] - prefix[a]) / (b - a);
  }
  return out;
}

/** Indices of peaks whose prominence clears `minProm`, at least `minSep` samples apart. */
export function findPeaks(v: number[], minProm: number, minSep: number): number[] {
  const cands: { i: number; prom: number }[] = [];
  for (let i = 1; i < v.length - 1; i++) {
    if (!(v[i] > v[i - 1] && v[i] >= v[i + 1])) continue;
    let leftMin = v[i];
    for (let j = i - 1; j >= 0 && v[j] <= v[i]; j--) leftMin = Math.min(leftMin, v[j]);
    let rightMin = v[i];
    let j = i + 1;
    for (; j < v.length && v[j] <= v[i]; j++) rightMin = Math.min(rightMin, v[j]);
    // A peak still climbing at the end of the record isn't a finished wave yet.
    if (j >= v.length && v[v.length - 1] > v[i] - minProm) continue;
    const prom = v[i] - Math.max(leftMin, rightMin);
    if (prom >= minProm) cands.push({ i, prom });
  }
  cands.sort((a, b) => b.prom - a.prom);
  const kept: number[] = [];
  for (const c of cands) if (kept.every((k) => Math.abs(k - c.i) >= minSep)) kept.push(c.i);
  return kept.sort((a, b) => a - b);
}

function crossLag(a: number[], b: number[], maxLag: number): { lag: number; corr: number } | null {
  const n = a.length;
  if (n < 20) return null;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  const sa = Math.sqrt(a.reduce((s, x) => s + (x - ma) ** 2, 0) / n);
  const sb = Math.sqrt(b.reduce((s, x) => s + (x - mb) ** 2, 0) / n);
  if (sa < 1e-6 || sb < 1e-6) return null;
  const corrs: number[] = [];
  for (let k = 0; k <= Math.min(maxLag, n - 10); k++) {
    let s = 0;
    for (let i = 0; i + k < n; i++) s += (a[i] - ma) * (b[i + k] - mb);
    corrs.push(s / (n - k) / (sa * sb));
  }
  let best = -1;
  for (let k = 1; k < corrs.length - 1; k++) {
    if (corrs[k] >= corrs[k - 1] && corrs[k] >= corrs[k + 1] && (best < 0 || corrs[k] > corrs[best])) best = k;
  }
  if (best < 0) return null;
  return { lag: best, corr: corrs[best] };
}

function cv(v: number[]): number {
  if (v.length === 0) return 0;
  const m = v.reduce((s, x) => s + x, 0) / v.length;
  if (m < 1e-6) return 0;
  const sd = Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / v.length);
  return sd / m;
}

const mean = (v: number[]) => (v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0);

export function fruitSupply(w: World) {
  const p = w.params;
  const cycle = p.fruitDelay + 1 / Math.max(1e-6, p.fruitGrowth) + p.blueEatTime;
  const perSecond = (w.trees.length * Math.round(p.fruitLimit)) / cycle;
  // Food-limited blues spend most of their time waiting under trees, so they burn close to the idle rate.
  const blueBurn = p.blueEnergyUse * (RULES.idleShare + (1 - RULES.idleShare) * 0.08);
  const capacity = (perSecond * RULES.fruitEnergy * (1 - RULES.copyOverhead)) / Math.max(0.05, blueBurn);
  return { perMinute: perSecond * 60, capacity };
}

export function summarize(w: World): Summary {
  const h = w.history.full;
  const st = w.stats;
  const ip = w.initParams;
  const t = w.time;
  const blueNow = w.counts.blue;
  const redNow = w.counts.red;
  const { perMinute, capacity } = fruitSupply(w);
  const lines: string[] = [];
  const supplyLine = `The trees regrow about ${Math.round(perMinute)} fruit a minute, food for roughly ${Math.round(capacity)} blue blobs.`;

  if (t < 20) {
    return {
      mood: "waking",
      headline: "The garden is waking up.",
      lines: [
        `Started with ${ip.blueStart} blue and ${ip.redStart} red blobs around ${w.trees.length} fruit trees.`,
        supplyLine,
      ],
      waves: 0,
      lagSeconds: null,
      capacity,
      fruitPerMinute: perMinute,
    };
  }

  const dtS = w.history.interval;
  const win = Math.max(1, Math.round(6 / dtS));
  const blueS = smooth(h.blue, win);
  const redS = smooth(h.red, win);
  const redRange = Math.max(...redS) - Math.min(...redS);
  const blueRange = Math.max(...blueS) - Math.min(...blueS);
  const minSep = Math.max(3, Math.round(25 / dtS));
  const redPeaks = findPeaks(redS, Math.max(2.5, redRange * 0.22), minSep);
  const bluePeaks = findPeaks(blueS, Math.max(4, blueRange * 0.22), minSep);
  const waves = redPeaks.length;

  let lagSeconds: number | null = null;
  if (redNow > 0 && blueNow > 0 && waves >= 2) {
    const start = Math.floor(h.t.length * 0.15);
    const lag = crossLag(blueS.slice(start), redS.slice(start), Math.round(200 / dtS));
    if (lag && lag.corr > 0.25) lagSeconds = lag.lag * dtS;
  }

  const tailFrom = h.t.findIndex((x) => x >= t * 0.7);
  const tailBlue = tailFrom >= 0 ? h.blue.slice(tailFrom) : [];
  const tailRed = tailFrom >= 0 ? h.red.slice(tailFrom) : [];
  const levelled =
    t > 150 && tailBlue.length > 10 && cv(tailBlue) < 0.14 && (mean(tailRed) < 0.5 || cv(tailRed) < 0.22);

  let mood: Mood = "swinging";
  let headline = "";

  const redGone = st.redGoneAt !== null && redNow === 0;
  const blueGone = st.blueGoneAt !== null && blueNow === 0;
  const neverRed = ip.redStart === 0 && st.bornRed === 0;
  const neverBlue = ip.blueStart === 0 && st.bornBlue === 0;

  if ((blueGone || neverBlue) && (redGone || neverRed || redNow === 0)) {
    mood = "empty";
    if (blueGone && redGone) {
      headline = "Both groups faded. Only the trees remain.";
      if (st.blueGoneAt! <= st.redGoneAt!) {
        lines.push(
          `Blue blobs ran out at ${fmtT(st.blueGoneAt!)}; without them, red blobs lost their energy and faded at ${fmtT(st.redGoneAt!)}.`,
        );
      } else {
        lines.push(
          `Red faded first (${fmtT(st.redGoneAt!)}), then blue ran out too (${fmtT(st.blueGoneAt!)}), so fruit piles up untouched.`,
        );
      }
    } else {
      headline = "The garden is quiet.";
      lines.push("No blobs are left. The trees keep regrowing fruit for nobody.");
    }
  } else if (blueGone || (neverBlue && redNow > 0)) {
    mood = "collapsing";
    headline = "Blue blobs are gone, so red blobs are running on empty.";
    if (st.blueGoneAt !== null) lines.push(`The last blue blob faded at ${fmtT(st.blueGoneAt)}. Red can only wander now.`);
  } else if (redGone || neverRed) {
    mood = "settled";
    if (redGone) {
      headline = "Red faded, and the world settled into a simpler state.";
      lines.push(
        `Red blobs faded at ${fmtT(st.redGoneAt!)}. Blue now lives on fruit alone${levelled ? `, levelling out near ${Math.round(mean(tailBlue))}` : ""}.`,
      );
    } else {
      headline = "A red-free garden: fruit is the only limit.";
      lines.push(`Without red blobs, blue grows until the trees can't keep up${levelled ? ` — about ${Math.round(mean(tailBlue))} blobs` : ""}.`);
    }
  } else if (waves >= 2) {
    mood = "balanced";
    headline = "The garden stayed balanced.";
    lines.push(
      `${waves} red waves so far, and both groups are still here${lagSeconds !== null ? `. Red peaks trail blue peaks by about ${Math.round(lagSeconds)}s` : ""}.`,
    );
  } else if (levelled) {
    mood = "steady";
    headline = "Group sizes levelled out.";
  } else if (st.blueMax > Math.max(ip.blueStart * 2.5, 60) && blueNow > st.blueMax * 0.6) {
    mood = "booming";
    headline = "Blue blobs are booming.";
  } else {
    mood = "swinging";
    headline = "The groups are still finding their rhythm.";
  }

  if (bluePeaks.length > 0 && redPeaks.length > 0) {
    const bp = bluePeaks[0];
    const rp = redPeaks.find((i) => i > bp);
    if (rp !== undefined && h.t[bp] < h.t[rp]) {
      lines.push(
        `Blue blobs grew first (peak ${Math.round(h.blue[bp])} at ${fmtT(h.t[bp])}), then red blobs followed (peak ${Math.round(h.red[rp])} at ${fmtT(h.t[rp])}).`,
      );
    }
  }

  const heavyRed = ip.blueStart > 0 && ip.redStart / ip.blueStart >= 0.6;
  if (heavyRed) {
    const early = h.t.findIndex((x) => x > 240);
    const end = early < 0 ? h.t.length : early;
    let minI = 0;
    for (let i = 0; i < end; i++) if (h.blue[i] < h.blue[minI]) minI = i;
    if (h.blue[minI] < ip.blueStart * 0.7) {
      let redMinI = minI;
      for (let i = minI; i < h.t.length; i++) if (h.red[i] < h.red[redMinI]) redMinI = i;
      const faded =
        st.redGoneAt !== null
          ? `gone at ${fmtT(st.redGoneAt)}`
          : h.red[redMinI] < st.redMax * 0.4
            ? `down to ${h.red[redMinI]} by ${fmtT(h.t[redMinI])}`
            : null;
      lines.push(
        `Red started strong: blue dipped first (down to ${h.blue[minI]} at ${fmtT(h.t[minI])})${faded ? `, then red faded later (${faded})` : ", and red is still holding on"}.`,
      );
    }
  }

  const at60 = h.t.findIndex((x) => x >= 60);
  if (at60 > 0 && ip.blueStart > 0) {
    const growth = h.blue[at60] / ip.blueStart;
    if (growth >= 1.8) lines.push(`Plenty of fruit: blue grew ×${growth.toFixed(1)} in the first minute.`);
  }

  if (st.blueMax < 30 || capacity < 30) {
    lines.push(`Low fruit kept the garden small: blue never passed ${st.blueMax}.`);
    if (mood === "steady" || mood === "swinging") mood = "small";
  }

  if (levelled && mood !== "steady") {
    lines.push(
      `Sizes levelled out instead of growing forever: about ${Math.round(mean(tailBlue))} blue${mean(tailRed) >= 0.5 ? ` and ${Math.round(mean(tailRed))} red` : ""}.`,
    );
  } else if (levelled) {
    lines.push(
      `About ${Math.round(mean(tailBlue))} blue${mean(tailRed) >= 0.5 ? ` and ${Math.round(mean(tailRed))} red` : ""}, with only small ups and downs.`,
    );
  }

  const blueFades = st.fadedBlueContact + st.fadedBlueHungry;
  if (blueFades >= 10) {
    const share = st.fadedBlueContact / blueFades;
    if (share > 0.6) lines.push(`${Math.round(share * 100)}% of blue fades came from red contact; red is the main pressure.`);
    else if (share < 0.3) lines.push(`${Math.round((1 - share) * 100)}% of blue fades were hunger; fruit is the main limit.`);
  }

  lines.push(supplyLine);
  if (st.capped) lines.push("The garden hit its crowd limit, so some copies had to wait.");

  return { mood, headline, lines, waves, lagSeconds, capacity, fruitPerMinute: perMinute };
}
