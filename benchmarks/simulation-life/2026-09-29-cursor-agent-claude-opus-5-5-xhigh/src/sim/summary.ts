import { stats, waveReport } from "./analysis";
import type { Sample, Simulation } from "./engine";

export type StoryTone = "blue" | "red" | "fruit" | "neutral";

export interface StoryLine {
  tone: StoryTone;
  text: string;
}

export function fmtTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function fmtDuration(seconds: number) {
  if (seconds < 90) return `${Math.round(seconds)}s`;
  return `${(seconds / 60).toFixed(seconds < 600 ? 1 : 0)} min`;
}

function argMax(h: Sample[], key: "blue" | "red", from = 0, to = h.length) {
  let best = from;
  for (let i = from; i < to; i++) if (h[i][key] > h[best][key]) best = i;
  return best;
}

function argMin(h: Sample[], key: "blue" | "red", from = 0, to = h.length) {
  let best = from;
  for (let i = from; i < to; i++) if (h[i][key] < h[best][key]) best = i;
  return best;
}

/** Plain-language account of the run, derived only from recorded samples and totals. */
export function runStory(sim: Simulation): StoryLine[] {
  const h = sim.history;
  const lines: StoryLine[] = [];
  const now = h[h.length - 1];
  if (!now || now.t < 20) {
    lines.push({ tone: "neutral", text: "The garden just woke up. Give it a minute and the story will write itself." });
    return lines;
  }
  const first = h[0];
  const t = now.t;

  const bPeakI = argMax(h, "blue");
  const rPeakI = argMax(h, "red");
  const arc = (name: string, start: number, peak: Sample, key: "blue" | "red", current: number) =>
    peak[key] <= start
      ? `${name} started at ${start} and never climbed above it; ${current} now.`
      : `${name} started at ${start}, peaked at ${peak[key]} (at ${fmtTime(peak.t)}) and number ${current} now.`;
  lines.push({ tone: "blue", text: arc("Blues", first.blue, h[bPeakI], "blue", now.blue) });
  if (first.red > 0 || sim.peakRed > 0) {
    lines.push({ tone: "red", text: arc("Reds", first.red, h[rPeakI], "red", now.red) });
  }

  const earlyEnd = h.findIndex((s) => s.t >= 180);
  if (earlyEnd > 0 && first.blue > 0) {
    const early = h[argMax(h, "blue", 0, earlyEnd)];
    if (early.blue >= first.blue * 2.5) {
      lines.push({
        tone: "fruit",
        text: `Plenty of fruit: blues multiplied ×${(early.blue / first.blue).toFixed(1)} in the first ${fmtTime(early.t)}.`,
      });
    }
  }

  if (first.red >= first.blue * 0.3 && first.red > 0) {
    const bMinI = argMin(h, "blue", 0, rPeakI + Math.floor((h.length - rPeakI) / 2));
    const rHalfI = h.findIndex((s, i) => i > rPeakI && s.red <= h[rPeakI].red * 0.5);
    if (h[bMinI].blue < first.blue * 0.75 && rHalfI > bMinI) {
      lines.push({
        tone: "red",
        text: `With so many reds, blues dipped first (down to ${h[bMinI].blue} at ${fmtTime(h[bMinI].t)}), then reds ran short of hugs and fell to half by ${fmtTime(h[rHalfI].t)}.`,
      });
    }
  }

  const wr = waveReport(h);
  if (wr.pairedWaves > 0 && wr.meanLagSeconds !== null) {
    const cycle = wr.periodSeconds ? ` A full cycle takes about ${fmtDuration(wr.periodSeconds)}.` : "";
    lines.push({
      tone: "neutral",
      text: `${wr.pairedWaves} blue→red wave${wr.pairedWaves > 1 ? "s" : ""} so far: each red peak trailed a blue peak by about ${fmtDuration(wr.meanLagSeconds)}.${cycle}`,
    });
  } else if (now.red > 0 && now.blue > 0 && t > 600) {
    lines.push({ tone: "neutral", text: "No complete blue→red wave yet. The groups are circling slowly." });
  }

  const blueSorted = h.map((s) => s.blue).sort((a, b) => a - b);
  const lowCut = blueSorted[Math.floor(blueSorted.length * 0.25)];
  const highCut = blueSorted[Math.floor(blueSorted.length * 0.75)];
  if (highCut - lowCut >= 8 && t > 300) {
    const lows = stats(h.filter((s) => s.blue <= lowCut).map((s) => s.fruit)).mean;
    const highs = stats(h.filter((s) => s.blue >= highCut).map((s) => s.fruit)).mean;
    if (lows > highs * 1.3 + 2) {
      lines.push({
        tone: "fruit",
        text: `Fruit piles up when blues are scarce: ~${Math.round(lows)} ripe at blue lows vs ~${Math.round(highs)} at blue highs.`,
      });
    }
  }

  const cap = sim.fruitCapacity();
  if (cap <= 40 || sim.peakBlue <= 40) {
    lines.push({
      tone: "fruit",
      text: `Fruit is the ceiling here: at most ${cap} fruit hang at once, so the garden stays small (blue peak ${sim.peakBlue}).`,
    });
  }

  if (sim.extinctAt.red !== null && now.red === 0) {
    lines.push({
      tone: "red",
      text: `Reds faded out at ${fmtTime(sim.extinctAt.red)}. With no hugs left to find they ran dry${now.blue > 0 ? "; blues now live on fruit alone" : ""}.`,
    });
  }
  if (sim.extinctAt.blue !== null && now.blue === 0) {
    lines.push({
      tone: "blue",
      text: `Blues vanished at ${fmtTime(sim.extinctAt.blue)}.${now.red > 0 ? " Reds have nothing left to hug and will follow." : ""}`,
    });
  }

  const lateFrom = h.findIndex((s) => s.t >= t * 0.66);
  if (t > 600 && lateFrom >= 0) {
    const late = h.slice(lateFrom);
    const b = stats(late.map((s) => s.blue));
    const r = stats(late.map((s) => s.red));
    if (b.mean > 0 && b.cv < 0.15 && (r.mean === 0 || r.cv < 0.25)) {
      lines.push({
        tone: "neutral",
        text: `Numbers have leveled out: about ${Math.round(b.mean)} blues${r.mean > 0 ? ` and ${Math.round(r.mean)} reds` : ""} lately.`,
      });
    } else if (b.mean > 0) {
      lines.push({
        tone: "neutral",
        text: `Still swinging but bounded: blues between ${b.min} and ${b.max}${r.max > 0 ? `, reds between ${r.min} and ${r.max}` : ""} over the last ${fmtDuration(now.t - late[0].t)}.`,
      });
    }
  }

  const tot = sim.totals;
  const blueFades = tot.blueHugFades + tot.blueHungerFades;
  if (blueFades > 0) {
    const share = Math.round((tot.blueHugFades / blueFades) * 100);
    lines.push({
      tone: "blue",
      text: `${blueFades} blues faded: ${tot.blueHugFades} right after a draining hug (${share}%), ${tot.blueHungerFades} from hunger. ${tot.fruitEaten} fruit eaten, ${tot.blueBirths} blue copies budded.`,
    });
  }
  if (tot.hugs > 0 || tot.redHungerFades > 0) {
    lines.push({
      tone: "red",
      text: `${tot.hugs} hugs in total. ${tot.redBirths} red copies budded, ${tot.redHungerFades} reds faded from hunger.`,
    });
  }
  return lines;
}

export interface TraitRow {
  label: string;
  tone: "blue" | "red";
  value: number;
  delta: number;
}

export function traitRows(sim: Simulation): TraitRow[] {
  const h = sim.history;
  const now = h[h.length - 1];
  if (!now) return [];
  const first = h[0];
  const row = (label: string, tone: "blue" | "red", key: keyof Sample): TraitRow => ({
    label,
    tone,
    value: now[key] as number,
    delta: (now[key] as number) - (first[key] as number),
  });
  return [
    row("Blue speed gene", "blue", "blueSpeedGene"),
    row("Blue vision gene", "blue", "blueVisionGene"),
    row("Red speed gene", "red", "redSpeedGene"),
    row("Red vision gene", "red", "redVisionGene"),
  ];
}
