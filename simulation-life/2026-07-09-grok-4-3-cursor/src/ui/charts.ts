import type { HistorySample } from "../sim/types";

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / p) * p;
}

export function drawPopulationChart(
  canvas: HTMLCanvasElement,
  history: HistorySample[],
): void {
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w < 10 || h < 10) return;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = "#f7fbf9";
  ctx.fillRect(0, 0, w, h);

  const pad = { l: 36, r: 12, t: 18, b: 28 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;

  if (history.length < 2) {
    ctx.fillStyle = "#6a8a80";
    ctx.font = "12px Figtree, sans-serif";
    ctx.fillText("Waiting for history…", pad.l, pad.t + 20);
    return;
  }

  const maxFood = niceMax(Math.max(...history.map((s) => s.food), 1));
  const maxPrey = niceMax(Math.max(...history.map((s) => s.prey), 1));
  const maxPred = niceMax(Math.max(...history.map((s) => s.predators), 1));
  const t0 = history[0]!.t;
  const t1 = history[history.length - 1]!.t;
  const span = Math.max(0.001, t1 - t0);

  // grid
  ctx.strokeStyle = "rgba(42,107,94,0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (ih * i) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + iw, y);
    ctx.stroke();
  }

  const series = [
    { key: "food" as const, max: maxFood, color: "#5bbf3a", label: "Food" },
    { key: "prey" as const, max: maxPrey, color: "#2bb8b8", label: "Prey" },
    {
      key: "predators" as const,
      max: maxPred,
      color: "#e85a7a",
      label: "Predators",
    },
  ];

  for (const s of series) {
    ctx.beginPath();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    for (let i = 0; i < history.length; i++) {
      const sample = history[i]!;
      const x = pad.l + ((sample.t - t0) / span) * iw;
      const norm = sample[s.key] / s.max;
      const y = pad.t + ih - norm * ih;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // axes labels
  ctx.fillStyle = "#5a7a70";
  ctx.font = "10px JetBrains Mono, monospace";
  ctx.fillText("0", pad.l - 14, pad.t + ih + 3);
  ctx.fillText("t", pad.l + iw - 8, pad.t + ih + 16);
  ctx.fillText(`${t1.toFixed(0)}s`, pad.l + iw - 36, pad.t + ih + 16);

  // legend
  let lx = pad.l;
  ctx.font = "11px Figtree, sans-serif";
  for (const s of series) {
    ctx.fillStyle = s.color;
    ctx.fillRect(lx, 4, 10, 10);
    ctx.fillStyle = "#2a4a42";
    ctx.fillText(`${s.label} (÷${s.max})`, lx + 14, 13);
    lx += 100;
  }
}

export function drawPhaseChart(
  canvas: HTMLCanvasElement,
  history: HistorySample[],
): void {
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w < 10 || h < 10) return;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f7fbf9";
  ctx.fillRect(0, 0, w, h);

  const pad = { l: 36, r: 12, t: 16, b: 28 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;

  if (history.length < 2) {
    ctx.fillStyle = "#6a8a80";
    ctx.font = "12px Figtree, sans-serif";
    ctx.fillText("Phase space waits for data…", pad.l, pad.t + 20);
    return;
  }

  const maxX = niceMax(Math.max(...history.map((s) => s.prey), 1));
  const maxY = niceMax(Math.max(...history.map((s) => s.predators), 1));

  ctx.strokeStyle = "rgba(42,107,94,0.1)";
  ctx.strokeRect(pad.l, pad.t, iw, ih);

  ctx.beginPath();
  for (let i = 0; i < history.length; i++) {
    const s = history[i]!;
    const x = pad.l + (s.prey / maxX) * iw;
    const y = pad.t + ih - (s.predators / maxY) * ih;
    const alpha = 0.15 + (i / history.length) * 0.85;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.strokeStyle = `rgba(232, 90, 122, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }

  const last = history[history.length - 1]!;
  const lx = pad.l + (last.prey / maxX) * iw;
  const ly = pad.t + ih - (last.predators / maxY) * ih;
  ctx.fillStyle = "#2bb8b8";
  ctx.beginPath();
  ctx.arc(lx, ly, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5a7a70";
  ctx.font = "10px Figtree, sans-serif";
  ctx.fillText("Prey →", pad.l + iw - 40, pad.t + ih + 18);
  ctx.save();
  ctx.translate(12, pad.t + ih / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Predators →", 0, 0);
  ctx.restore();
}

export function drawTraitChart(
  canvas: HTMLCanvasElement,
  history: HistorySample[],
): void {
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w < 10 || h < 10) return;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f7fbf9";
  ctx.fillRect(0, 0, w, h);

  const pad = { l: 36, r: 12, t: 18, b: 28 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;

  const usable = history.filter((s) => s.prey > 0 || s.predators > 0);
  if (usable.length < 2) {
    ctx.fillStyle = "#6a8a80";
    ctx.font = "12px Figtree, sans-serif";
    ctx.fillText("Traits appear once populations exist…", pad.l, pad.t + 20);
    return;
  }

  const series = [
    { key: "avgPreySpeed" as const, color: "#2bb8b8", label: "Prey speed" },
    { key: "avgPreyVision" as const, color: "#1a8a8a", label: "Prey vision" },
    { key: "avgPredSpeed" as const, color: "#e85a7a", label: "Pred speed" },
    { key: "avgPredVision" as const, color: "#c23055", label: "Pred vision" },
  ];

  let maxV = 1;
  for (const s of usable) {
    for (const ser of series) maxV = Math.max(maxV, s[ser.key]);
  }
  maxV = niceMax(maxV);
  const t0 = usable[0]!.t;
  const t1 = usable[usable.length - 1]!.t;
  const span = Math.max(0.001, t1 - t0);

  for (const ser of series) {
    ctx.beginPath();
    ctx.strokeStyle = ser.color;
    ctx.lineWidth = 1.6;
    let started = false;
    for (const s of usable) {
      const val = s[ser.key];
      if (val <= 0) continue;
      const x = pad.l + ((s.t - t0) / span) * iw;
      const y = pad.t + ih - (val / maxV) * ih;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.font = "10px Figtree, sans-serif";
  let lx = pad.l;
  for (const ser of series) {
    ctx.fillStyle = ser.color;
    ctx.fillRect(lx, 4, 8, 8);
    ctx.fillStyle = "#2a4a42";
    ctx.fillText(ser.label, lx + 12, 12);
    lx += 88;
  }
}

export function drawEnergyHist(
  canvas: HTMLCanvasElement,
  energies: { prey: number[]; predators: number[] },
): void {
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w < 10 || h < 10) return;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#f7fbf9";
  ctx.fillRect(0, 0, w, h);

  const pad = { l: 28, r: 10, t: 16, b: 24 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const bins = 12;
  const maxE = Math.max(
    80,
    ...energies.prey,
    ...energies.predators,
    1,
  );
  const preyBins = new Array(bins).fill(0) as number[];
  const predBins = new Array(bins).fill(0) as number[];
  for (const e of energies.prey) {
    preyBins[Math.min(bins - 1, Math.floor((e / maxE) * bins))]!++;
  }
  for (const e of energies.predators) {
    predBins[Math.min(bins - 1, Math.floor((e / maxE) * bins))]!++;
  }
  const maxCount = Math.max(1, ...preyBins, ...predBins);
  const bw = iw / bins;

  for (let i = 0; i < bins; i++) {
    const ph = (preyBins[i]! / maxCount) * ih;
    const dh = (predBins[i]! / maxCount) * ih;
    ctx.fillStyle = "rgba(43,184,184,0.7)";
    ctx.fillRect(pad.l + i * bw + 1, pad.t + ih - ph, bw * 0.42, ph);
    ctx.fillStyle = "rgba(232,90,122,0.7)";
    ctx.fillRect(pad.l + i * bw + bw * 0.45, pad.t + ih - dh, bw * 0.42, dh);
  }

  ctx.fillStyle = "#5a7a70";
  ctx.font = "10px Figtree, sans-serif";
  ctx.fillText("Energy →", pad.l + iw - 50, pad.t + ih + 16);
  ctx.fillText("0", pad.l, pad.t + ih + 16);
}
