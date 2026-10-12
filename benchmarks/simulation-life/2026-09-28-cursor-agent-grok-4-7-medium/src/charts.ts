import type { Sample } from "./types.ts";

function fit(canvas: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const W = Math.max(1, Math.floor(w * dpr));
  const H = Math.max(1, Math.floor(h * dpr));
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function maxOf(values: number[]) {
  let m = 0;
  for (const v of values) if (v > m) m = v;
  return m;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawTimeline(canvas: HTMLCanvasElement, history: Sample[]) {
  const box = fit(canvas);
  if (!box) return;
  const { ctx, w, h } = box;
  ctx.clearRect(0, 0, w, h);
  const padL = 12;
  const padR = 12;
  const padT = 16;
  const padB = 22;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = Math.max(1, h - padT - padB);
  ctx.fillStyle = "#fff8ec";
  roundRect(ctx, 0, 0, w, h, 12);
  ctx.fill();

  const fruit = history.map((s) => s.fruit);
  const blue = history.map((s) => s.blue);
  const red = history.map((s) => s.red);
  const peaks = [
    { color: "#3d8f3a", max: Math.max(1, maxOf(fruit)) },
    { color: "#2a74d6", max: Math.max(1, maxOf(blue)) },
    { color: "#d24b43", max: Math.max(1, maxOf(red)) },
  ];

  ctx.strokeStyle = "#eadcc4";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i += 1) {
    const y = padT + (plotH * i) / 3;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
  }

  const drawLine = (values: number[], max: number, color: string) => {
    if (values.length < 1) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    values.forEach((v, i) => {
      const x = padL + (values.length === 1 ? plotW / 2 : (i / (values.length - 1)) * plotW);
      const y = padT + 8 + (plotH - 16) * (1 - v / max);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    const last = values[values.length - 1];
    const x = padL + plotW;
    const y = padT + 8 + (plotH - 16) * (1 - last / max);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(values.length === 1 ? padL + plotW / 2 : x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
  };

  drawLine(fruit, peaks[0].max, peaks[0].color);
  drawLine(blue, peaks[1].max, peaks[1].color);
  drawLine(red, peaks[2].max, peaks[2].color);

  ctx.font = "12px Avenir Next, Trebuchet MS, sans-serif";
  ctx.fillStyle = "#6d6256";
  const t0 = history[0]?.t ?? 0;
  const t1 = history[history.length - 1]?.t ?? 0;
  ctx.fillText(formatClock(t0), padL, h - 6);
  const end = formatClock(t1);
  ctx.fillText(end, padL + plotW - ctx.measureText(end).width, h - 6);

  ctx.font = "11px Avenir Next, Trebuchet MS, sans-serif";
  const labels = [
    `fruit ${peaks[0].max.toFixed(peaks[0].max >= 10 ? 0 : 1)}`,
    `blue ${peaks[1].max.toFixed(0)}`,
    `red ${peaks[2].max.toFixed(0)}`,
  ];
  let lx = padL;
  labels.forEach((label, i) => {
    ctx.fillStyle = peaks[i].color;
    ctx.fillText(label, lx, 12);
    lx += ctx.measureText(label).width + 12;
  });
}

export function drawPhase(canvas: HTMLCanvasElement, history: Sample[]) {
  const box = fit(canvas);
  if (!box) return;
  const { ctx, w, h } = box;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff8ec";
  roundRect(ctx, 0, 0, w, h, 12);
  ctx.fill();
  const padL = 36;
  const padB = 28;
  const padT = 12;
  const padR = 12;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = Math.max(1, h - padT - padB);
  const maxB = Math.max(4, maxOf(history.map((s) => s.blue)));
  const maxR = Math.max(4, maxOf(history.map((s) => s.red)));
  const xOf = (v: number) => padL + (v / maxB) * plotW;
  const yOf = (v: number) => padT + plotH - (v / maxR) * plotH;

  ctx.strokeStyle = "#eadcc4";
  ctx.strokeRect(padL, padT, plotW, plotH);

  const recent = history.slice(-280);
  if (recent.length) {
    ctx.beginPath();
    recent.forEach((s, i) => {
      const x = xOf(s.blue);
      const y = yOf(s.red);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "rgba(70, 58, 42, 0.45)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    const last = recent[recent.length - 1];
    ctx.fillStyle = "#2a241c";
    ctx.beginPath();
    ctx.arc(xOf(last.blue), yOf(last.red), 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = "12px Avenir Next, Trebuchet MS, sans-serif";
  ctx.fillStyle = "#6d6256";
  ctx.fillText("Blue blobs", padL, h - 8);
  ctx.save();
  ctx.translate(12, padT + plotH);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Red blobs", 0, 0);
  ctx.restore();
  ctx.fillStyle = "#2a74d6";
  ctx.fillText(String(Math.round(maxB)), padL + plotW - 18, padT + plotH + 14);
  ctx.fillStyle = "#d24b43";
  ctx.fillText(String(Math.round(maxR)), 16, padT + 10);
}

export function drawTraits(canvas: HTMLCanvasElement, history: Sample[]) {
  const box = fit(canvas);
  if (!box) return;
  const { ctx, w, h } = box;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff8ec";
  roundRect(ctx, 0, 0, w, h, 12);
  ctx.fill();
  const padL = 12;
  const padR = 12;
  const padT = 28;
  const padB = 18;
  const plotW = Math.max(1, w - padL - padR);
  const plotH = Math.max(1, h - padT - padB);
  const lo = 0.62;
  const hi = 1.42;
  const yOf = (v: number) => padT + plotH - ((v - lo) / (hi - lo)) * plotH;

  ctx.strokeStyle = "#eadcc4";
  ctx.beginPath();
  ctx.moveTo(padL, yOf(1));
  ctx.lineTo(padL + plotW, yOf(1));
  ctx.stroke();

  const series: { key: keyof Sample; color: string; label: string }[] = [
    { key: "blueSpeed", color: "#2a74d6", label: "Blue speed" },
    { key: "blueVision", color: "#7eb0ea", label: "Blue sense" },
    { key: "redSpeed", color: "#d24b43", label: "Red speed" },
    { key: "redVision", color: "#e59a90", label: "Red sense" },
  ];

  for (const serie of series) {
    ctx.beginPath();
    let pen = false;
    history.forEach((sample, i) => {
      const raw = sample[serie.key];
      const x = padL + (history.length === 1 ? plotW / 2 : (i / (history.length - 1)) * plotW);
      if (typeof raw !== "number") {
        pen = false;
        return;
      }
      const y = yOf(raw);
      if (!pen) {
        ctx.moveTo(x, y);
        pen = true;
      } else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = serie.color;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  ctx.font = "11px Avenir Next, Trebuchet MS, sans-serif";
  let lx = padL;
  for (const serie of series) {
    ctx.fillStyle = serie.color;
    ctx.fillText(serie.label, lx, 14);
    lx += ctx.measureText(serie.label).width + 10;
  }
  ctx.fillStyle = "#6d6256";
  ctx.fillText("1.0", padL, yOf(1) - 4);
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
