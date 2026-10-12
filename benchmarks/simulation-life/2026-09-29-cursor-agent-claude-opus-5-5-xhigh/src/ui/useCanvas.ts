import { useEffect, useRef, useState } from "react";

/** Canvas sized to its parent box at device pixel ratio; `draw` gets CSS-pixel coordinates. */
export function useCanvas(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const ro = new ResizeObserver(() => {
      const r = parent.getBoundingClientRect();
      setSize({ w: Math.max(1, Math.floor(r.width)), h: Math.max(1, Math.floor(r.height)) });
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || size.w < 2 || size.h < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== size.w * dpr || canvas.height !== size.h * dpr) {
      canvas.width = size.w * dpr;
      canvas.height = size.h * dpr;
      canvas.style.width = `${size.w}px`;
      canvas.style.height = `${size.h}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    draw(ctx, size.w, size.h);
  }, [size, ...deps]);

  return { ref, size };
}

export const COLORS = {
  blue: "#3b8cff",
  red: "#ff5a6a",
  fruit: "#86b81f",
  fruitFill: "rgba(170, 214, 60, 0.22)",
  ink: "#3b3029",
  muted: "#9a8b7c",
  grid: "rgba(90, 70, 50, 0.09)",
};

export function niceMax(v: number) {
  if (v <= 5) return 5;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
