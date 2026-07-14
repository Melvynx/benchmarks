import type { HistorySample, RunVerdict } from "./types";

export function summarizeRun(history: HistorySample[]): RunVerdict {
  if (history.length < 8) {
    return {
      label: "Warming up",
      detail: "Not enough history yet — let the dish run a bit longer.",
      tone: "stable",
    };
  }

  const recent = history.slice(-Math.min(200, history.length));
  const early = history.slice(0, Math.min(40, history.length));
  const last = recent[recent.length - 1]!;

  const preyNow = last.prey;
  const predNow = last.predators;
  const foodNow = last.food;

  const preyAvg = mean(recent.map((h) => h.prey));
  const predAvg = mean(recent.map((h) => h.predators));
  const preyEarly = mean(early.map((h) => h.prey));
  const predEarly = mean(early.map((h) => h.predators));

  const preyMax = Math.max(...recent.map((h) => h.prey));
  const preyMin = Math.min(...recent.map((h) => h.prey));
  const predMax = Math.max(...recent.map((h) => h.predators));
  const predMin = Math.min(...recent.map((h) => h.predators));

  const preyCv = preyAvg > 0 ? (preyMax - preyMin) / preyAvg : 0;
  const predCv = predAvg > 0 ? (predMax - predMin) / predAvg : 0;

  const phaseLag = estimatePhaseLag(recent);
  const fullPreyMax = Math.max(...history.map((h) => h.prey));
  const fullPreyMin = Math.min(...history.map((h) => h.prey));
  const fullPredMax = Math.max(...history.map((h) => h.predators));
  const fullPredMin = Math.min(...history.map((h) => h.predators));

  if (preyNow === 0 && predNow === 0) {
    return {
      label: "Extinction event",
      detail: "Both populations reached zero. The dish went quiet.",
      tone: "extinction",
    };
  }

  if (preyNow === 0) {
    return {
      label: "Prey extinction",
      detail:
        predNow > 0
          ? "Prey vanished; predators face starvation pressure next."
          : "Prey vanished from the dish.",
      tone: "extinction",
    };
  }

  if (predNow === 0) {
    if (preyNow > preyEarly * 1.4) {
      return {
        label: "Prey boom",
        detail: "Predators gone — prey expanding toward food carrying capacity.",
        tone: "boom",
      };
    }
    return {
      label: "Predator decline",
      detail: "Predators faded out; prey persist under food limits.",
      tone: "decline",
    };
  }

  if (foodNow < 8 && preyAvg < preyEarly * 0.55) {
    return {
      label: "Low-food collapse",
      detail: "Scarce growth starved the food web — populations contracted hard.",
      tone: "collapse",
    };
  }

  if (preyNow < preyEarly * 0.35 && predNow < predEarly * 0.5) {
    if (preyNow > preyMin * 1.3 || last.t > history[0]!.t + 40) {
      return {
        label: "Recovery",
        detail: "After a crash, numbers are climbing again from a low base.",
        tone: "recovery",
      };
    }
    return {
      label: "Ecosystem collapse",
      detail: "Both populations crashed under combined scarcity and pressure.",
      tone: "collapse",
    };
  }

  const preySwing = Math.max(preyMax - preyMin, fullPreyMax - fullPreyMin);
  const predSwing = Math.max(predMax - predMin, fullPredMax - fullPredMin);
  if (
    preyNow > 0 &&
    predNow > 0 &&
    ((preyCv > 0.4 && predCv > 0.35 && phaseLag > 0.12) ||
      (preySwing > 50 && predSwing > 10 && fullPreyMin < fullPreyMax * 0.4))
  ) {
    return {
      label: "Oscillating equilibrium",
      detail:
        "Prey and predators rise and fall out of phase — classic Lotka–Volterra rhythm.",
      tone: "oscillating",
    };
  }

  if (preyNow > preyEarly * 1.6 && predAvg < predEarly * 0.9) {
    return {
      label: "Prey boom",
      detail: "Food surplus fueled a prey surge; predators haven't caught up yet.",
      tone: "boom",
    };
  }

  if (predNow > predEarly * 1.5 && preyNow < preyEarly * 0.7) {
    return {
      label: "Predator pressure peak",
      detail: "Predators surged; prey are under strong capture pressure.",
      tone: "decline",
    };
  }

  if (Math.abs(preyNow - preyAvg) / (preyAvg + 1) < 0.25 && preyCv < 0.45) {
    return {
      label: "Stable coexistence",
      detail: "Populations holding a workable balance around food capacity.",
      tone: "stable",
    };
  }

  return {
    label: "Dynamic balance",
    detail: "The dish is shifting — watch the charts for the emerging story.",
    tone: "stable",
  };
}

function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Rough lag score: correlation of prey with delayed predators. */
function estimatePhaseLag(samples: HistorySample[]): number {
  if (samples.length < 20) return 0;
  const prey = samples.map((s) => s.prey);
  const pred = samples.map((s) => s.predators);
  let best = 0;
  for (let lag = 3; lag <= 18; lag++) {
    const n = prey.length - lag;
    if (n < 10) break;
    let num = 0;
    let d1 = 0;
    let d2 = 0;
    const pm = mean(prey.slice(0, n));
    const qm = mean(pred.slice(lag));
    for (let i = 0; i < n; i++) {
      const a = prey[i]! - pm;
      const b = pred[i + lag]! - qm;
      num += a * b;
      d1 += a * a;
      d2 += b * b;
    }
    const corr = num / (Math.sqrt(d1 * d2) + 1e-9);
    best = Math.max(best, corr);
  }
  return best;
}
