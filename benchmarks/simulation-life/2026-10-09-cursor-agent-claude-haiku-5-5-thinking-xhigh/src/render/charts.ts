import { fmtTime } from '../sim/analysis';
import type { Sample } from '../sim/types';

export type ChartKind = 'timeline' | 'phase' | 'traits';

export interface ChartHover {
  x: number;
  y: number;
}

const BLUE = '#3f8ffb';
const RED = '#ff5a5f';
const GREEN = '#4fb83a';
const INK = '#2b2233';
const GRID = 'rgba(43,34,51,0.1)';
const PAD = { l: 46, r: 14, t: 12, b: 26 };

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function box(W: number, H: number): Box {
  return { x0: PAD.l, y0: PAD.t, x1: W - PAD.r, y1: H - PAD.b };
}

/** Round up to a tidy axis maximum. */
function niceCeil(v: number): number {
  if (v <= 4) return 4;
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function tooltip(ctx: CanvasRenderingContext2D, W: number, px: number, py: number, lines: string[]): void {
  ctx.save();
  ctx.font = '700 12px ui-rounded, system-ui, sans-serif';
  const width = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
  const height = lines.length * 16 + 10;
  let x = px + 12;
  if (x + width > W - 4) x = px - width - 12;
  const y = Math.max(4, py - height / 2);
  rr(ctx, x, y, width, height, 8);
  ctx.fillStyle = 'rgba(43,34,51,0.92)';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x + 8, y + 6 + i * 16));
  ctx.restore();
}

function axisFrame(
  ctx: CanvasRenderingContext2D,
  b: Box,
  yMax: number,
  yLabel: string,
  yFmt: (v: number) => string,
): void {
  ctx.save();
  ctx.font = '600 11px ui-rounded, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(43,34,51,0.6)';
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const v = (yMax * i) / 4;
    const y = b.y1 - ((b.y1 - b.y0) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(b.x0, y);
    ctx.lineTo(b.x1, y);
    ctx.stroke();
    ctx.fillText(yFmt(v), b.x0 - 6, y);
  }
  ctx.strokeStyle = 'rgba(43,34,51,0.35)';
  ctx.beginPath();
  ctx.moveTo(b.x0, b.y0);
  ctx.lineTo(b.x0, b.y1);
  ctx.lineTo(b.x1, b.y1);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(yLabel, b.x0, 0);
  ctx.restore();
}

function emptyNote(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.save();
  ctx.font = '700 13px ui-rounded, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(43,34,51,0.55)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Press play to start recording.', W / 2, H / 2);
  ctx.restore();
}

function drawPolyline(
  ctx: CanvasRenderingContext2D,
  h: Sample[],
  pick: (s: Sample) => number,
  X: (t: number) => number,
  Y: (v: number) => number,
  color: string,
  dash: number[],
  width: number,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.setLineDash(dash);
  ctx.beginPath();
  let pen = false;
  for (const s of h) {
    const v = pick(s);
    if (!Number.isFinite(v)) {
      pen = false;
      continue;
    }
    const x = X(s.t);
    const y = Y(v);
    if (pen) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
    pen = true;
  }
  ctx.stroke();
  ctx.restore();
}

function sampleIndexAt(hover: ChartHover, b: Box, n: number): number {
  const frac = (hover.x - b.x0) / (b.x1 - b.x0);
  return Math.min(n - 1, Math.max(0, Math.round(frac * (n - 1))));
}

function drawTimeline(ctx: CanvasRenderingContext2D, W: number, H: number, h: Sample[], hover: ChartHover | null): void {
  const b = box(W, H);
  const tMax = Math.max(1, h[h.length - 1].t);
  let top = 1;
  for (const s of h) top = Math.max(top, s.blue, s.red, s.fruit);
  const yMax = niceCeil(top * 1.08);
  axisFrame(ctx, b, yMax, 'count', (v) => String(Math.round(v)));

  const X = (t: number) => b.x0 + (t / tMax) * (b.x1 - b.x0);
  const Y = (v: number) => b.y1 - (v / yMax) * (b.y1 - b.y0);
  drawPolyline(ctx, h, (s) => s.fruit, X, Y, GREEN, [5, 4], 2);
  drawPolyline(ctx, h, (s) => s.blue, X, Y, BLUE, [], 2.8);
  drawPolyline(ctx, h, (s) => s.red, X, Y, RED, [], 2.8);

  ctx.save();
  ctx.font = '600 11px ui-rounded, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(43,34,51,0.6)';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 4; i++) {
    const t = (tMax * i) / 4;
    ctx.textAlign = i === 0 ? 'left' : i === 4 ? 'right' : 'center';
    ctx.fillText(fmtTime(t), X(t), b.y1 + 6);
  }
  ctx.restore();

  if (hover && hover.x >= b.x0 && hover.x <= b.x1) {
    const s = h[sampleIndexAt(hover, b, h.length)];
    const x = X(s.t);
    ctx.save();
    ctx.strokeStyle = 'rgba(43,34,51,0.45)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, b.y0);
    ctx.lineTo(x, b.y1);
    ctx.stroke();
    ctx.restore();
    for (const [v, c] of [
      [s.blue, BLUE],
      [s.red, RED],
      [s.fruit, GREEN],
    ] as const) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, Y(v), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    tooltip(ctx, W, x, b.y0 + 30, [
      `t ${fmtTime(s.t)}`,
      `blue ${s.blue}`,
      `red ${s.red}`,
      `fruit ${s.fruit}`,
    ]);
  }
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function drawPhase(ctx: CanvasRenderingContext2D, W: number, H: number, h: Sample[], hover: ChartHover | null): void {
  const b = box(W, H);
  let bMax = 1;
  let rMax = 1;
  for (const s of h) {
    bMax = Math.max(bMax, s.blue);
    rMax = Math.max(rMax, s.red);
  }
  const xMax = niceCeil(bMax * 1.08);
  const yMax = niceCeil(rMax * 1.08);
  axisFrame(ctx, b, yMax, 'red', (v) => String(Math.round(v)));

  const X = (v: number) => b.x0 + (v / xMax) * (b.x1 - b.x0);
  const Y = (v: number) => b.y1 - (v / yMax) * (b.y1 - b.y0);

  ctx.save();
  ctx.font = '600 11px ui-rounded, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(43,34,51,0.6)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 4; i++) {
    const v = (xMax * i) / 4;
    ctx.fillText(String(Math.round(v)), X(v), b.y1 + 6);
  }
  ctx.restore();

  const early: [number, number, number] = [196, 210, 232];
  const late: [number, number, number] = [116, 60, 230];
  ctx.save();
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  for (let i = 1; i < h.length; i++) {
    const a = h[i - 1];
    const c = h[i];
    ctx.strokeStyle = mixRgb(early, late, i / h.length);
    ctx.beginPath();
    ctx.moveTo(X(a.blue), Y(a.red));
    ctx.lineTo(X(c.blue), Y(c.red));
    ctx.stroke();
  }
  ctx.restore();

  const start = h[0];
  const last = h[h.length - 1];
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(X(start.blue), Y(start.red), 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(X(last.blue), Y(last.red), 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (hover && hover.x >= b.x0 && hover.x <= b.x1 && hover.y >= b.y0 && hover.y <= b.y1) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < h.length; i++) {
      const d = Math.hypot(X(h[i].blue) - hover.x, Y(h[i].red) - hover.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (bestD < 28) {
      const s = h[best];
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(X(s.blue), Y(s.red), 4.5, 0, Math.PI * 2);
      ctx.fill();
      tooltip(ctx, W, X(s.blue), Y(s.red), [`t ${fmtTime(s.t)}`, `blue ${s.blue}`, `red ${s.red}`]);
    }
  }
}

function drawTraits(ctx: CanvasRenderingContext2D, W: number, H: number, h: Sample[], hover: ChartHover | null): void {
  const b = box(W, H);
  const tMax = Math.max(1, h[h.length - 1].t);
  const keys = [
    { label: 'blue speed', pick: (s: Sample) => s.blueSpeedT, color: BLUE, dash: [5, 4] },
    { label: 'blue vision', pick: (s: Sample) => s.blueVisionT, color: BLUE, dash: [] },
    { label: 'red speed', pick: (s: Sample) => s.redSpeedT, color: RED, dash: [5, 4] },
    { label: 'red vision', pick: (s: Sample) => s.redVisionT, color: RED, dash: [] },
  ];
  let lo = 1;
  let hi = 1;
  for (const s of h) {
    for (const k of keys) {
      const v = k.pick(s);
      if (Number.isFinite(v)) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
  }
  const yLo = Math.floor((lo - 0.05) * 10) / 10;
  const yHi = Math.ceil((hi + 0.05) * 10) / 10;
  const span = Math.max(0.2, yHi - yLo);
  const Y = (v: number) => b.y1 - ((v - yLo) / span) * (b.y1 - b.y0);
  const X = (t: number) => b.x0 + (t / tMax) * (b.x1 - b.x0);

  ctx.save();
  ctx.font = '600 11px ui-rounded, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(43,34,51,0.6)';
  ctx.strokeStyle = GRID;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const v = yLo + (span * i) / 4;
    const y = Y(v);
    ctx.beginPath();
    ctx.moveTo(b.x0, y);
    ctx.lineTo(b.x1, y);
    ctx.stroke();
    ctx.fillText(v.toFixed(2), b.x0 - 6, y);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(43,34,51,0.4)';
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(b.x0, Y(1));
  ctx.lineTo(b.x1, Y(1));
  ctx.stroke();
  ctx.restore();

  for (const k of keys) drawPolyline(ctx, h, k.pick, X, Y, k.color, k.dash, 2.2);

  ctx.save();
  ctx.font = '600 11px ui-rounded, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(43,34,51,0.6)';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 4; i++) {
    const t = (tMax * i) / 4;
    ctx.textAlign = i === 0 ? 'left' : i === 4 ? 'right' : 'center';
    ctx.fillText(fmtTime(t), X(t), b.y1 + 6);
  }
  ctx.restore();

  if (hover && hover.x >= b.x0 && hover.x <= b.x1) {
    const s = h[sampleIndexAt(hover, b, h.length)];
    const x = X(s.t);
    ctx.save();
    ctx.strokeStyle = 'rgba(43,34,51,0.45)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, b.y0);
    ctx.lineTo(x, b.y1);
    ctx.stroke();
    ctx.restore();
    tooltip(
      ctx,
      W,
      x,
      b.y0 + 30,
      [`t ${fmtTime(s.t)}`, ...keys.map((k) => `${k.label} ${k.pick(s).toFixed(2)}`)],
    );
  }
}

/** Draws one chart into a W x H area (CSS px). The context must already be scaled for DPR. */
export function drawChart(
  ctx: CanvasRenderingContext2D,
  kind: ChartKind,
  W: number,
  H: number,
  h: Sample[],
  hover: ChartHover | null,
): void {
  ctx.clearRect(0, 0, W, H);
  if (h.length < 2) {
    emptyNote(ctx, W, H);
    return;
  }
  if (kind === 'timeline') drawTimeline(ctx, W, H, h, hover);
  else if (kind === 'phase') drawPhase(ctx, W, H, h, hover);
  else drawTraits(ctx, W, H, h, hover);
}
