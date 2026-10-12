import { useEffect, useRef, useState } from 'react';

export interface DrawArgs {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  hover: { x: number; y: number } | null;
}

export const COLORS = {
  blue: '#3f7cf0',
  red: '#ef4d64',
  fruit: '#4aa957',
  grid: 'rgba(90,70,120,0.11)',
  axis: '#8a819c',
  ink: '#3b3350',
  card: '#fffdf8',
};

interface Props {
  height: number;
  draw: (a: DrawArgs) => void;
  label: string;
  interactive?: boolean;
}

/** Sharp, resize-aware canvas that redraws on every render and on pointer hover. */
export function Chart({ height, draw, label, interactive = true }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.floor(el.getBoundingClientRect().width)));
    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || width < 10) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (el.width !== Math.round(width * dpr) || el.height !== Math.round(height * dpr)) {
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
    }
    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    draw({ ctx, w: width, h: height, hover });
  });

  return (
    <canvas
      ref={ref}
      className="chart-canvas"
      role="img"
      aria-label={label}
      style={{ height }}
      onPointerMove={
        interactive
          ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHover({ x: e.clientX - r.left, y: e.clientY - r.top });
            }
          : undefined
      }
      onPointerLeave={interactive ? () => setHover(null) : undefined}
    />
  );
}

export function niceMax(v: number, rows = 4) {
  if (v <= 0) return rows;
  const raw = v / rows;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  const n = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => m <= x + 1e-9) ?? 10;
  return Math.max(rows, n * p * rows);
}

export function clockLabel(sec: number) {
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function timeTicks(duration: number, width: number) {
  const want = Math.max(2, Math.floor(width / 84));
  const raw = duration / want;
  const steps = [10, 15, 30, 60, 120, 180, 300, 600, 900, 1200, 1800, 3600, 7200, 14400];
  const step = steps.find((s) => s >= raw) ?? 14400;
  const out: number[] = [];
  for (let t = 0; t <= duration + 1e-6; t += step) out.push(t);
  return out;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Draws a small floating tooltip box, clamped inside the chart. */
export function tooltip(
  ctx: CanvasRenderingContext2D,
  w: number,
  anchorX: number,
  y: number,
  title: string,
  rows: Array<{ color: string; text: string }>,
) {
  ctx.font = '600 11px ui-rounded, system-ui, sans-serif';
  const pad = 8;
  const lineH = 15;
  let tw = ctx.measureText(title).width;
  for (const r of rows) tw = Math.max(tw, ctx.measureText(r.text).width + 14);
  const bw = tw + pad * 2;
  const bh = pad * 2 + lineH * (rows.length + 1) - 4;
  let x = anchorX + 12;
  if (x + bw > w - 4) x = anchorX - 12 - bw;
  x = Math.max(4, x);
  ctx.save();
  ctx.shadowColor = 'rgba(60,40,90,0.18)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = 'rgba(255,253,248,0.97)';
  roundRect(ctx, x, y, bw, bh, 9);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(90,70,120,0.16)';
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, bw - 1, bh - 1, 9);
  ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.axis;
  ctx.fillText(title, x + pad, y + pad + 5);
  rows.forEach((r, i) => {
    const cy = y + pad + 5 + lineH * (i + 1);
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.arc(x + pad + 3, cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(r.text, x + pad + 14, cy);
  });
}

/** Nearest sample index for a sorted sample list, by time. */
export function nearestIndex(times: ArrayLike<number>, t: number) {
  let lo = 0;
  let hi = times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(times[lo - 1] - t) < Math.abs(times[lo] - t)) return lo - 1;
  return lo;
}
