import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

export const C = {
  blue: "#3f8cf5",
  blueSoft: "rgba(77, 155, 255, 0.14)",
  red: "#f0474d",
  redSoft: "rgba(255, 90, 95, 0.12)",
  fruit: "#7fb539",
  fruitSoft: "rgba(140, 198, 63, 0.12)",
  ink: "#3b3346",
  muted: "#8d8499",
  grid: "rgba(90, 70, 110, 0.09)",
  axis: "rgba(90, 70, 110, 0.22)",
  font: '600 11px "Nunito Variable", system-ui, sans-serif',
  fontBold: '800 11px "Nunito Variable", system-ui, sans-serif',
};

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** DPR-aware canvas that redraws at most once per animation frame. */
export function useCanvas(draw: Draw, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const drawRef = useRef(draw);
  const raf = useRef(0);

  useLayoutEffect(() => {
    drawRef.current = draw;
  });

  const schedule = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const c = ref.current;
      const { w, h, dpr } = size.current;
      if (!c || w < 2 || h < 2) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      drawRef.current(ctx, w, h);
    });
  }, []);

  useEffect(() => {
    const c = ref.current!;
    const ro = new ResizeObserver(() => {
      const r = c.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      size.current = { w: r.width, h: r.height, dpr };
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      schedule();
    });
    ro.observe(c);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [schedule]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(schedule, deps);

  return { ref, schedule };
}

export function niceStep(span: number, target: number): number {
  const raw = span / Math.max(1, target);
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))));
  const n = raw / mag;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * mag;
}

export function niceMax(v: number, ticks = 4): { max: number; step: number } {
  const step = niceStep(Math.max(v, 1), ticks);
  return { max: Math.max(step, Math.ceil((v * 1.05) / step) * step), step };
}

const TIME_STEPS = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400];

export function timeStep(span: number, target: number): number {
  return TIME_STEPS.find((s) => span / s <= target) ?? TIME_STEPS[TIME_STEPS.length - 1];
}

export function fmtTick(t: number): string {
  if (t < 60) return `${Math.round(t)}s`;
  const m = Math.floor(t / 60);
  const s = Math.round(t % 60);
  if (m < 60) return s ? `${m}m${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h${m % 60}m` : `${h}h`;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
