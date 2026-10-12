import { useEffect, useRef, useState } from "react";
import type { HistoryPoint, SimStats } from "../sim/simulation";

const C = {
  blue: "#3f8cff",
  red: "#ff4f63",
  fruit: "#72c043",
  ink: "#3b3350",
  soft: "rgba(59,51,80,0.55)",
  grid: "rgba(59,51,80,0.08)",
};

/** Smallest "round" max that divides evenly into 4 gridlines. */
function niceMax(v: number) {
  const step = Math.max(1, v / 4);
  const p = Math.pow(10, Math.floor(Math.log10(step)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= step) return Math.max(4, m * p * 4);
  return 40 * p;
}

export const fmtTime = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

function useCanvas(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, deps: unknown[]) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el || size.w === 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (el.width !== Math.round(size.w * dpr) || el.height !== Math.round(size.h * dpr)) {
      el.width = Math.round(size.w * dpr);
      el.height = Math.round(size.h * dpr);
    }
    const ctx = el.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    draw(ctx, size.w, size.h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, ...deps]);
  return ref;
}

function visible(history: HistoryPoint[], windowSecs: number | null) {
  if (!history.length) return history;
  if (windowSecs === null) return history;
  const t1 = history[history.length - 1].t;
  const t0 = t1 - windowSecs;
  let i = history.length - 1;
  while (i > 0 && history[i - 1].t >= t0) i--;
  return history.slice(i);
}

function thin(points: HistoryPoint[], max: number) {
  if (points.length <= max) return points;
  const step = points.length / max;
  const out: HistoryPoint[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.floor(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}

// ---------------------------------------------------------------- timeline

export function TimelineChart({ history, version, stats, windowSecs }: { history: HistoryPoint[]; version: number; stats: SimStats; windowSecs: number | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useCanvas(
    (ctx, w, h) => {
      const pts = thin(visible(history, windowSecs), Math.max(60, Math.floor(w)));
      const padL = 34;
      const padR = 36;
      const padT = 10;
      const padB = 20;
      const pw = w - padL - padR;
      const ph = h - padT - padB;
      if (pts.length < 2 || pw <= 0 || ph <= 0) {
        ctx.fillStyle = C.soft;
        ctx.font = "600 12px Nunito, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Press play — the story will draw itself here.", w / 2, h / 2);
        return;
      }
      const t0 = pts[0].t;
      const t1 = Math.max(pts[pts.length - 1].t, t0 + 10);
      let maxBlob = 0;
      let maxFruit = 0;
      for (const p of pts) {
        maxBlob = Math.max(maxBlob, p.blue, p.red);
        maxFruit = Math.max(maxFruit, p.fruit);
      }
      const yMaxL = niceMax(maxBlob * 1.08);
      const yMaxR = niceMax(maxFruit * 1.08);
      const X = (t: number) => padL + ((t - t0) / (t1 - t0)) * pw;
      const YL = (v: number) => padT + ph - (v / yMaxL) * ph;
      const YR = (v: number) => padT + ph - (v / yMaxR) * ph;

      ctx.font = "600 10px Nunito, sans-serif";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padT + (ph * i) / 4;
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + pw, y);
        ctx.stroke();
        ctx.fillStyle = C.soft;
        ctx.textAlign = "right";
        ctx.fillText(String(Math.round(yMaxL * (1 - i / 4))), padL - 6, y + 3);
        ctx.fillStyle = C.fruit;
        ctx.textAlign = "left";
        ctx.fillText(String(Math.round(yMaxR * (1 - i / 4))), padL + pw + 6, y + 3);
      }
      const span = t1 - t0;
      const tick = [10, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600].find((s) => span / s <= 7) ?? 3600;
      ctx.textAlign = "center";
      ctx.fillStyle = C.soft;
      for (let t = Math.ceil(t0 / tick) * tick; t <= t1; t += tick) {
        const x = X(t);
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + ph);
        ctx.stroke();
        ctx.fillText(fmtTime(t), x, h - 5);
      }

      // Extinction markers.
      for (const [kind, at] of [["blue", stats.extinctAt.blue], ["red", stats.extinctAt.red]] as const) {
        if (at === null || at < t0) continue;
        const x = X(at);
        ctx.save();
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = kind === "blue" ? C.blue : C.red;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + ph);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = kind === "blue" ? C.blue : C.red;
        ctx.textAlign = x > padL + pw - 70 ? "right" : "left";
        ctx.fillText(kind === "blue" ? " blues faded " : " reds faded ", x, padT + 10);
      }

      // Fruit area (right axis).
      const grad = ctx.createLinearGradient(0, padT, 0, padT + ph);
      grad.addColorStop(0, "rgba(140,210,90,0.35)");
      grad.addColorStop(1, "rgba(140,210,90,0.04)");
      ctx.beginPath();
      ctx.moveTo(X(pts[0].t), YR(0));
      for (const p of pts) ctx.lineTo(X(p.t), YR(p.fruit));
      ctx.lineTo(X(pts[pts.length - 1].t), YR(0));
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(X(p.t), YR(p.fruit)) : ctx.moveTo(X(p.t), YR(p.fruit))));
      ctx.strokeStyle = C.fruit;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      for (const [key, color] of [["blue", C.blue], ["red", C.red]] as const) {
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(X(p.t), YL(p[key])) : ctx.moveTo(X(p.t), YL(p[key]))));
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.4;
        ctx.lineJoin = "round";
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
        const last = pts[pts.length - 1];
        ctx.beginPath();
        ctx.arc(X(last.t), YL(last[key]), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      }

      if (hover !== null) {
        const tx = t0 + ((hover - padL) / pw) * (t1 - t0);
        if (tx >= t0 && tx <= t1) {
          let best = pts[0];
          for (const p of pts) if (Math.abs(p.t - tx) < Math.abs(best.t - tx)) best = p;
          const x = X(best.t);
          ctx.strokeStyle = "rgba(59,51,80,0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, padT);
          ctx.lineTo(x, padT + ph);
          ctx.stroke();
          for (const [v, y, c] of [[best.blue, YL(best.blue), C.blue], [best.red, YL(best.red), C.red], [best.fruit, YR(best.fruit), C.fruit]] as const) {
            void v;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = "#fff";
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = c;
            ctx.stroke();
          }
          const lines = [`⏱ ${fmtTime(best.t)}`, `🔵 ${best.blue} blue`, `🔴 ${best.red} red`, `🍏 ${best.fruit} fruit`];
          const bw = 92;
          const bh = 68;
          const bx = x + 10 + bw > w ? x - 10 - bw : x + 10;
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.strokeStyle = "rgba(59,51,80,0.12)";
          ctx.beginPath();
          ctx.roundRect(bx, padT + 4, bw, bh, 8);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = C.ink;
          ctx.textAlign = "left";
          ctx.font = "700 11px Nunito, sans-serif";
          lines.forEach((l, i) => ctx.fillText(l, bx + 8, padT + 20 + i * 15));
        }
      }
    },
    [version, hover, windowSecs, history.length],
  );
  return (
    <canvas
      ref={ref}
      className="chart-canvas"
      onMouseMove={(e) => setHover(e.nativeEvent.offsetX)}
      onMouseLeave={() => setHover(null)}
      aria-label="Fruit, blue and red over time"
    />
  );
}

// ---------------------------------------------------------------- phase plot

export function PhaseChart({ history, version }: { history: HistoryPoint[]; version: number }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      const pts = thin(history, 900);
      const pad = { l: 30, r: 10, t: 10, b: 22 };
      const pw = w - pad.l - pad.r;
      const ph = h - pad.t - pad.b;
      if (pts.length < 2 || pw <= 0) return;
      let mb = 0;
      let mr = 0;
      for (const p of pts) {
        mb = Math.max(mb, p.blue);
        mr = Math.max(mr, p.red);
      }
      const xm = niceMax(mb * 1.05);
      const ym = niceMax(mr * 1.05);
      const X = (v: number) => pad.l + (v / xm) * pw;
      const Y = (v: number) => pad.t + ph - (v / ym) * ph;
      ctx.font = "600 10px Nunito, sans-serif";
      for (let i = 0; i <= 4; i++) {
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(pad.l, pad.t + (ph * i) / 4);
        ctx.lineTo(pad.l + pw, pad.t + (ph * i) / 4);
        ctx.moveTo(pad.l + (pw * i) / 4, pad.t);
        ctx.lineTo(pad.l + (pw * i) / 4, pad.t + ph);
        ctx.stroke();
      }
      ctx.fillStyle = C.red;
      ctx.textAlign = "right";
      ctx.fillText(String(ym), pad.l - 5, pad.t + 8);
      ctx.fillText("0", pad.l - 5, pad.t + ph);
      ctx.fillStyle = C.blue;
      ctx.textAlign = "right";
      ctx.fillText(`${xm} blue →`, pad.l + pw, h - 6);
      ctx.save();
      ctx.translate(10, pad.t + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillStyle = C.red;
      ctx.fillText("red →", 0, 0);
      ctx.restore();

      const n = pts.length;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (let i = 1; i < n; i++) {
        const k = i / n;
        const a = 0.08 + 0.92 * k * k;
        const r = Math.round(63 + (255 - 63) * k);
        const g = Math.round(140 - 61 * k);
        const b = Math.round(255 - 156 * k);
        ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
        ctx.beginPath();
        ctx.moveTo(X(pts[i - 1].blue), Y(pts[i - 1].red));
        ctx.lineTo(X(pts[i].blue), Y(pts[i].red));
        ctx.stroke();
      }
      const s = pts[0];
      ctx.fillStyle = C.soft;
      ctx.fillRect(X(s.blue) - 3, Y(s.red) - 3, 6, 6);
      const last = pts[n - 1];
      ctx.beginPath();
      ctx.arc(X(last.blue), Y(last.red), 7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,216,77,0.45)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(X(last.blue), Y(last.red), 4, 0, Math.PI * 2);
      ctx.fillStyle = "#3b3350";
      ctx.fill();
    },
    [version, history.length],
  );
  return <canvas ref={ref} className="chart-canvas" aria-label="Blue versus red phase plot" />;
}

// ---------------------------------------------------------------- traits

export function TraitChart({ history, version }: { history: HistoryPoint[]; version: number }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      const pts = thin(history, Math.max(60, Math.floor(w)));
      const pad = { l: 36, r: 10, t: 10, b: 20 };
      const pw = w - pad.l - pad.r;
      const ph = h - pad.t - pad.b;
      if (pts.length < 2 || pw <= 0) return;
      const keys = [
        ["blueSpeed", C.blue, false],
        ["blueVision", C.blue, true],
        ["redSpeed", C.red, false],
        ["redVision", C.red, true],
      ] as const;
      let lo = 1;
      let hi = 1;
      for (const p of pts) for (const [k] of keys) if (Number.isFinite(p[k])) {
        lo = Math.min(lo, p[k]);
        hi = Math.max(hi, p[k]);
      }
      const spanV = Math.max(0.06, hi - lo);
      lo -= spanV * 0.15;
      hi += spanV * 0.15;
      const t0 = pts[0].t;
      const t1 = Math.max(pts[pts.length - 1].t, t0 + 10);
      const X = (t: number) => pad.l + ((t - t0) / (t1 - t0)) * pw;
      const Y = (v: number) => pad.t + ph - ((v - lo) / (hi - lo)) * ph;
      ctx.font = "600 10px Nunito, sans-serif";
      for (let i = 0; i <= 3; i++) {
        const v = lo + ((hi - lo) * i) / 3;
        const y = Y(v);
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(pad.l, y);
        ctx.lineTo(pad.l + pw, y);
        ctx.stroke();
        ctx.fillStyle = C.soft;
        ctx.textAlign = "right";
        ctx.fillText(`×${v.toFixed(2)}`, pad.l - 4, y + 3);
      }
      ctx.strokeStyle = "rgba(59,51,80,0.25)";
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(pad.l, Y(1));
      ctx.lineTo(pad.l + pw, Y(1));
      ctx.stroke();
      for (const [k, color, dashed] of keys) {
        ctx.setLineDash(dashed ? [5, 4] : []);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;
        for (const p of pts) {
          if (!Number.isFinite(p[k])) {
            started = false;
            continue;
          }
          if (!started) ctx.moveTo(X(p.t), Y(p[k]));
          else ctx.lineTo(X(p.t), Y(p[k]));
          started = true;
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = C.soft;
      ctx.textAlign = "center";
      ctx.fillText(fmtTime(t0), pad.l + 12, h - 5);
      ctx.fillText(fmtTime(t1), pad.l + pw - 14, h - 5);
    },
    [version, history.length],
  );
  return <canvas ref={ref} className="chart-canvas" aria-label="Inherited trait trends" />;
}
