import { useRef, useState } from "react";
import { ctrl, shallowEqual, useSim } from "../sim";
import { C, fmtTick, niceMax, roundRect, timeStep, useCanvas, type Draw } from "./canvas";

type Mode = "dual" | "shared" | "log";
type Range = "all" | "recent";
type Key = "fruit" | "blue" | "red";

const SERIES: { key: Key; label: string; color: string; soft: string }[] = [
  { key: "fruit", label: "Ripe fruit", color: C.fruit, soft: C.fruitSoft },
  { key: "blue", label: "Blue", color: C.blue, soft: C.blueSoft },
  { key: "red", label: "Red", color: C.red, soft: C.redSoft },
];

function nearest(ts: number[], t: number): number {
  let lo = 0;
  let hi = ts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ts[mid] < t) lo = mid;
    else hi = mid;
  }
  return Math.abs(ts[lo] - t) <= Math.abs(ts[hi] - t) ? lo : hi;
}

export function TimelineChart() {
  const [mode, setMode] = useState<Mode>("dual");
  const [range, setRange] = useState<Range>("all");
  const [hidden, setHidden] = useState<Record<Key, boolean>>({ fruit: false, blue: false, red: false });
  const hover = useRef<number | null>(null);
  const s = useSim(
    (x) => ({ hv: x.historyVersion, wv: x.worldVersion, blue: x.counts.blue, red: x.counts.red, fruit: x.counts.fruit }),
    shallowEqual,
  );

  const draw: Draw = (ctx, W, H) => {
    const world = ctrl.world;
    const h = range === "all" ? world.history.full : world.history.recent;
    const n = h.t.length;
    let anyRed = false;
    for (let i = 0; i < n && !anyRed; i++) anyRed = h.red[i] > 0;
    const dual = mode === "dual" && anyRed && !hidden.red && (!hidden.blue || !hidden.fruit);
    const pad = { l: 40, r: dual ? 40 : 16, t: 14, b: 26 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    ctx.font = C.font;

    if (n < 2) {
      ctx.fillStyle = C.muted;
      ctx.textAlign = "center";
      ctx.fillText("The timeline fills in as the garden runs.", W / 2, H / 2);
      return;
    }

    const t0 = range === "all" ? 0 : h.t[0];
    const t1 = Math.max(h.t[n - 1], t0 + (range === "all" ? 60 : 30));
    const X = (t: number) => pad.l + ((t - t0) / (t1 - t0)) * pw;

    let maxL = 0;
    let maxR = 0;
    for (let i = 0; i < n; i++) {
      if (!hidden.blue) maxL = Math.max(maxL, h.blue[i]);
      if (!hidden.fruit) maxL = Math.max(maxL, h.fruit[i]);
      if (!hidden.red) {
        if (dual) maxR = Math.max(maxR, h.red[i]);
        else maxL = Math.max(maxL, h.red[i]);
      }
    }

    const left = niceMax(maxL, 4);
    const right = niceMax(maxR, 4);
    const logTop = Math.log10(1 + Math.max(10, maxL));
    const YL = (v: number) =>
      mode === "log" ? pad.t + ph - (Math.log10(1 + Math.max(0, v)) / logTop) * ph : pad.t + ph - (v / left.max) * ph;
    const YR = (v: number) => pad.t + ph - (v / right.max) * ph;
    const yOf = (k: Key) => (k === "red" && dual ? YR : YL);

    ctx.lineWidth = 1;
    ctx.textBaseline = "middle";
    const leftTicks = mode === "log" ? [0, 1, 10, 100, 1000, 10000].filter((v) => Math.log10(1 + v) <= logTop + 1e-9) : [];
    if (mode !== "log") for (let v = 0; v <= left.max + 1e-9; v += left.step) leftTicks.push(v);
    for (const v of leftTicks) {
      const y = YL(v);
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + pw, y);
      ctx.stroke();
      ctx.fillStyle = dual ? C.blue : C.muted;
      ctx.textAlign = "right";
      ctx.fillText(String(Math.round(v)), pad.l - 7, y);
    }
    if (dual) {
      ctx.textAlign = "left";
      ctx.fillStyle = C.red;
      for (let v = 0; v <= right.max + 1e-9; v += right.step) ctx.fillText(String(Math.round(v)), pad.l + pw + 7, YR(v));
    }

    const step = timeStep(t1 - t0, Math.max(3, Math.floor(pw / 80)));
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = C.muted;
    for (let t = Math.ceil(t0 / step) * step; t <= t1 + 1e-6; t += step) {
      const x = X(t);
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, pad.t + ph);
      ctx.stroke();
      ctx.fillText(fmtTick(t), x, pad.t + ph + 7);
    }
    ctx.strokeStyle = C.axis;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t + ph + 0.5);
    ctx.lineTo(pad.l + pw, pad.t + ph + 0.5);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l, pad.t - 2, pw, ph + 4);
    ctx.clip();
    for (const sr of SERIES) {
      if (hidden[sr.key]) continue;
      const col = h[sr.key];
      const Y = yOf(sr.key);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = X(h.t[i]);
        const y = Y(col[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (sr.key !== "red") {
        ctx.save();
        ctx.lineTo(X(h.t[n - 1]), pad.t + ph);
        ctx.lineTo(X(h.t[0]), pad.t + ph);
        ctx.closePath();
        ctx.fillStyle = sr.soft;
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const x = X(h.t[i]);
          const y = Y(col[i]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = sr.color;
      ctx.lineWidth = sr.key === "fruit" ? 1.6 : 2.4;
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    ctx.restore();

    const st = world.stats;
    const marks: { t: number; label: string; color: string }[] = [];
    if (st.blueGoneAt !== null) marks.push({ t: st.blueGoneAt, label: "blue gone", color: C.blue });
    if (st.redGoneAt !== null) marks.push({ t: st.redGoneAt, label: "red gone", color: C.red });
    for (const m of marks) {
      if (m.t < t0 || m.t > t1) continue;
      const x = X(m.t);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, pad.t + ph);
      ctx.stroke();
      ctx.restore();
      ctx.font = C.fontBold;
      ctx.fillStyle = m.color;
      ctx.textAlign = x > pad.l + pw - 70 ? "right" : "left";
      ctx.textBaseline = "top";
      ctx.fillText(`✕ ${m.label}`, x + (ctx.textAlign === "right" ? -5 : 5), pad.t + 2);
      ctx.font = C.font;
    }

    const hx = hover.current;
    if (hx !== null && hx >= pad.l && hx <= pad.l + pw) {
      const t = t0 + ((hx - pad.l) / pw) * (t1 - t0);
      const i = nearest(h.t, t);
      const x = X(h.t[i]);
      ctx.strokeStyle = "rgba(59, 51, 70, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, pad.t);
      ctx.lineTo(x, pad.t + ph);
      ctx.stroke();
      const rows: { label: string; value: string; color: string }[] = [];
      for (const sr of [...SERIES].reverse()) {
        if (hidden[sr.key]) continue;
        const v = h[sr.key][i];
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = sr.color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(x, yOf(sr.key)(v), 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        rows.push({ label: sr.label, value: String(Math.round(v)), color: sr.color });
      }
      const bw = 124;
      const bh = 24 + rows.length * 17;
      const bx = x + 12 + bw > W - 4 ? x - 12 - bw : x + 12;
      const by = pad.t + 4;
      ctx.shadowColor = "rgba(60, 40, 80, 0.18)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "rgba(255, 252, 247, 0.97)";
      roundRect(ctx, bx, by, bw, bh, 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.font = C.fontBold;
      ctx.fillStyle = C.ink;
      ctx.fillText(fmtTick(h.t[i]), bx + 10, by + 13);
      rows.forEach((r, k) => {
        const y = by + 31 + k * 17;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(bx + 14, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = C.font;
        ctx.fillStyle = C.muted;
        ctx.fillText(r.label, bx + 24, y);
        ctx.font = C.fontBold;
        ctx.fillStyle = C.ink;
        ctx.textAlign = "right";
        ctx.fillText(r.value, bx + bw - 10, y);
        ctx.textAlign = "left";
      });
    }
  };

  const { ref, schedule } = useCanvas(draw, [s.hv, s.wv, mode, range, hidden]);

  const now: Record<Key, number> = { fruit: s.fruit, blue: s.blue, red: s.red };

  return (
    <section className="card chart-card timeline">
      <header className="card-head">
        <div>
          <h2 className="card-title">Timeline</h2>
          <p className="card-sub">
            {mode === "dual" ? "Red uses its own scale on the right so its waves stay readable." : mode === "log" ? "Log scale: small and large groups side by side." : "Everything on one shared scale."}
          </p>
        </div>
        <div className="seg-group">
          <div className="seg" role="group" aria-label="Scale">
            {(
              [
                ["dual", "2 axes"],
                ["shared", "Shared"],
                ["log", "Log"],
              ] as const
            ).map(([k, label]) => (
              <button key={k} className={mode === k ? "is-on" : ""} aria-pressed={mode === k} onClick={() => setMode(k)}>
                {label}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Range">
            {(
              [
                ["all", "Whole run"],
                ["recent", "Last 3 min"],
              ] as const
            ).map(([k, label]) => (
              <button key={k} className={range === k ? "is-on" : ""} aria-pressed={range === k} onClick={() => setRange(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="chart-box tall">
        <canvas
          ref={ref}
          className="chart-canvas"
          onPointerMove={(e) => {
            hover.current = e.clientX - e.currentTarget.getBoundingClientRect().left;
            schedule();
          }}
          onPointerLeave={() => {
            hover.current = null;
            schedule();
          }}
        />
      </div>
      <div className="legend">
        {SERIES.map((sr) => (
          <button
            key={sr.key}
            className={`legend-item ${hidden[sr.key] ? "is-off" : ""}`}
            onClick={() => setHidden((h) => ({ ...h, [sr.key]: !h[sr.key] }))}
            aria-pressed={!hidden[sr.key]}
          >
            <i style={{ background: sr.color }} />
            {sr.label}
            <b>{now[sr.key]}</b>
          </button>
        ))}
      </div>
    </section>
  );
}
