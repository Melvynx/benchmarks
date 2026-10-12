import { useState } from "react";
import type { Sample, Simulation } from "../sim/engine";
import { fmtTime } from "../sim/summary";
import { COLORS, niceMax, useCanvas } from "./useCanvas";

type Scale = "linear" | "log";
type Span = "all" | "10m";

const PAD = { l: 34, r: 34, t: 10, b: 20 };

function visible(h: Sample[], span: Span) {
  if (span === "all" || !h.length) return h;
  const from = h[h.length - 1].t - 600;
  let lo = 0;
  let hi = h.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (h[mid].t < from) lo = mid + 1;
    else hi = mid;
  }
  return h.slice(lo);
}

export function Timeline({ sim, version }: { sim: Simulation; version: number }) {
  const [scale, setScale] = useState<Scale>("linear");
  const [span, setSpan] = useState<Span>("all");
  const [hoverX, setHoverX] = useState<number | null>(null);

  const h = visible(sim.history, span);
  const last = sim.history[sim.history.length - 1];

  let blobMax = 5;
  let fruitMax = Math.max(5, sim.fruitCapacity());
  for (const s of h) {
    if (s.blue > blobMax) blobMax = s.blue;
    if (s.red > blobMax) blobMax = s.red;
    if (s.fruit > fruitMax) fruitMax = s.fruit;
  }
  // Both axes share four evenly spaced gridlines, so each max is four "nice" steps.
  blobMax = 4 * niceMax((blobMax * 1.05) / 4);
  fruitMax = 4 * niceMax(fruitMax / 4);

  const t0 = h.length ? h[0].t : 0;
  const t1 = h.length ? Math.max(h[h.length - 1].t, t0 + 30) : 30;

  const { ref, size } = useCanvas(
    (ctx, w, hgt) => {
      const pw = w - PAD.l - PAD.r;
      const ph = hgt - PAD.t - PAD.b;
      const xOf = (t: number) => PAD.l + ((t - t0) / (t1 - t0)) * pw;
      const yOf = (v: number, max: number) => {
        const f = scale === "log" ? Math.log1p(v) / Math.log1p(max) : v / max;
        return PAD.t + ph - Math.min(1, f) * ph;
      };

      ctx.font = "10px ui-rounded, system-ui, sans-serif";
      ctx.textBaseline = "middle";
      const ticks = scale === "log" ? [0, 1, 3, 10, 30, 100, 300, 1000].filter((v) => v <= blobMax) : [0, 0.25, 0.5, 0.75, 1].map((f) => f * blobMax);
      for (const v of ticks) {
        const y = yOf(v, blobMax);
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD.l, y);
        ctx.lineTo(w - PAD.r, y);
        ctx.stroke();
        ctx.fillStyle = COLORS.muted;
        ctx.textAlign = "right";
        ctx.fillText(String(Math.round(v)), PAD.l - 6, y);
        const fv = scale === "log" ? Math.expm1((Math.log1p(v) / Math.log1p(blobMax)) * Math.log1p(fruitMax)) : (v / blobMax) * fruitMax;
        ctx.fillStyle = COLORS.fruit;
        ctx.textAlign = "left";
        ctx.fillText(String(Math.round(fv)), w - PAD.r + 6, y);
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = COLORS.muted;
      const tickCount = Math.max(2, Math.floor(pw / 90));
      for (let i = 0; i <= tickCount; i++) {
        const t = t0 + ((t1 - t0) * i) / tickCount;
        ctx.fillText(fmtTime(t), xOf(t), hgt - 5);
      }
      if (h.length < 2) return;

      const stride = Math.max(1, Math.floor(h.length / (pw * 1.5)));
      const pts: Sample[] = [];
      for (let i = 0; i < h.length; i += stride) pts.push(h[i]);
      if (pts[pts.length - 1] !== h[h.length - 1]) pts.push(h[h.length - 1]);

      ctx.beginPath();
      ctx.moveTo(xOf(pts[0].t), yOf(0, fruitMax));
      for (const s of pts) ctx.lineTo(xOf(s.t), yOf(s.fruit, fruitMax));
      ctx.lineTo(xOf(pts[pts.length - 1].t), yOf(0, fruitMax));
      ctx.closePath();
      ctx.fillStyle = COLORS.fruitFill;
      ctx.fill();

      const line = (key: "fruit" | "blue" | "red", color: string, max: number, width: number) => {
        ctx.beginPath();
        pts.forEach((s, i) => {
          const x = xOf(s.t);
          const y = yOf(s[key], max);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = "round";
        ctx.stroke();
      };
      line("fruit", COLORS.fruit, fruitMax, 1.5);
      line("blue", COLORS.blue, blobMax, 2.4);
      line("red", COLORS.red, blobMax, 2.4);

      if (hoverX !== null && hoverX >= PAD.l && hoverX <= w - PAD.r) {
        ctx.strokeStyle = "rgba(60,48,40,0.35)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hoverX, PAD.t);
        ctx.lineTo(hoverX, PAD.t + ph);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
    [version, scale, span, hoverX, h.length],
  );

  let hovered: Sample | null = null;
  if (hoverX !== null && h.length > 1 && size.w > 0) {
    const pw = size.w - PAD.l - PAD.r;
    const t = t0 + ((hoverX - PAD.l) / pw) * (t1 - t0);
    let lo = 0;
    let hi = h.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (h[mid].t < t) lo = mid + 1;
      else hi = mid;
    }
    hovered = h[lo];
  }
  const shown = hovered ?? last;

  return (
    <section className="card timeline">
      <header className="card-head">
        <h2>Timeline</h2>
        <div className="legend">
          <span className="chip fruit">Fruit {shown?.fruit ?? 0}</span>
          <span className="chip blue">Blue {shown?.blue ?? 0}</span>
          <span className="chip red">Red {shown?.red ?? 0}</span>
          {hovered && <span className="chip ghost">at {fmtTime(hovered.t)}</span>}
        </div>
        <div className="seg">
          <button className={scale === "linear" ? "on" : ""} onClick={() => setScale("linear")}>
            Linear
          </button>
          <button className={scale === "log" ? "on" : ""} onClick={() => setScale("log")}>
            Log
          </button>
        </div>
        <div className="seg">
          <button className={span === "all" ? "on" : ""} onClick={() => setSpan("all")}>
            All
          </button>
          <button className={span === "10m" ? "on" : ""} onClick={() => setSpan("10m")}>
            10 min
          </button>
        </div>
      </header>
      <div className="axis-notes">
        <span>blobs</span>
        <span className="fruit-note">ripe fruit</span>
      </div>
      <div
        className="canvas-box"
        onPointerMove={(e) => setHoverX(e.clientX - e.currentTarget.getBoundingClientRect().left)}
        onPointerLeave={() => setHoverX(null)}
      >
        <canvas ref={ref} />
      </div>
    </section>
  );
}
