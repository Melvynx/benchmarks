import type { SeriesKey } from "../../sim/history";
import { ctrl, shallowEqual, useSim } from "../sim";
import { C, fmtTick, timeStep, useCanvas, type Draw } from "./canvas";

const LINES: { key: SeriesKey; label: string; color: string; dash: number[] }[] = [
  { key: "blueSpeed", label: "Blue speed", color: C.blue, dash: [] },
  { key: "blueVision", label: "Blue vision", color: C.blue, dash: [5, 4] },
  { key: "redSpeed", label: "Red speed", color: C.red, dash: [] },
  { key: "redVision", label: "Red vision", color: C.red, dash: [5, 4] },
];

const SMOOTH_SECONDS = 12;

/** Centered mean over ±`half` samples; gaps (no blobs of that group) stay gaps and are never bridged. */
function rollingMean(v: number[], half: number): Float64Array {
  const out = new Float64Array(v.length).fill(NaN);
  let i = 0;
  while (i < v.length) {
    if (!Number.isFinite(v[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < v.length && Number.isFinite(v[j])) j++;
    const prefix = new Float64Array(j - i + 1);
    for (let k = i; k < j; k++) prefix[k - i + 1] = prefix[k - i] + v[k];
    for (let k = i; k < j; k++) {
      const a = Math.max(i, k - half);
      const b = Math.min(j, k + half + 1);
      out[k] = (prefix[b - i] - prefix[a - i]) / (b - a);
    }
    i = j;
  }
  return out;
}

export function TraitChart() {
  const s = useSim((x) => ({ hv: x.historyVersion, wv: x.worldVersion, drift: x.params.traitDrift }), shallowEqual);
  const h = ctrl.world.history.full;
  const n = h.t.length;
  const lastOf = (k: SeriesKey) => {
    for (let i = n - 1; i >= 0; i--) if (Number.isFinite(h[k][i])) return h[k][i];
    return NaN;
  };

  const draw: Draw = (ctx, W, H) => {
    const pad = { l: 38, r: 12, t: 12, b: 26 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    ctx.font = C.font;
    if (n < 2) {
      ctx.fillStyle = C.muted;
      ctx.textAlign = "center";
      ctx.fillText("Gene averages appear once blobs start copying.", W / 2, H / 2);
      return;
    }
    let lo = 0.9;
    let hi = 1.1;
    for (const l of LINES) {
      for (const v of h[l.key]) {
        if (!Number.isFinite(v)) continue;
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    const span = hi - lo;
    lo = Math.max(0.5, lo - span * 0.12);
    hi = Math.min(2, hi + span * 0.12);
    const t1 = Math.max(60, h.t[n - 1]);
    const X = (t: number) => pad.l + (t / t1) * pw;
    const Y = (v: number) => pad.t + ph - ((v - lo) / (hi - lo)) * ph;

    const stepV = hi - lo > 0.5 ? 0.2 : hi - lo > 0.2 ? 0.1 : 0.05;
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.lineWidth = 1;
    for (let v = Math.ceil(lo / stepV) * stepV; v <= hi + 1e-9; v += stepV) {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(pad.l, Y(v));
      ctx.lineTo(pad.l + pw, Y(v));
      ctx.stroke();
      ctx.fillStyle = C.muted;
      ctx.fillText(`×${v.toFixed(stepV < 0.1 ? 2 : 1)}`, pad.l - 6, Y(v));
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const ts = timeStep(t1, Math.max(2, Math.floor(pw / 70)));
    for (let t = 0; t <= t1 + 1e-6; t += ts) ctx.fillText(fmtTick(t), X(t), pad.t + ph + 6);

    ctx.save();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = C.axis;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(pad.l, Y(1));
    ctx.lineTo(pad.l + pw, Y(1));
    ctx.stroke();
    ctx.restore();

    const stroke = (col: ArrayLike<number>) => {
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < n; i++) {
        const v = col[i];
        if (!Number.isFinite(v)) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(X(h.t[i]), Y(v));
        else ctx.moveTo(X(h.t[i]), Y(v));
        pen = true;
      }
      ctx.stroke();
    };
    const win = Math.max(1, Math.round(SMOOTH_SECONDS / ctrl.world.history.interval / 2));
    for (const l of LINES) {
      ctx.save();
      ctx.setLineDash(l.dash);
      ctx.strokeStyle = l.color;
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1.2;
      stroke(h[l.key]);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2.2;
      stroke(rollingMean(h[l.key], win));
      ctx.restore();
    }
  };

  const { ref } = useCanvas(draw, [s.hv, s.wv]);

  return (
    <section className="card chart-card">
      <header className="card-head">
        <div>
          <h2 className="card-title">Trait trends</h2>
          <p className="card-sub">Average genes of each group (faint: raw, bold: {SMOOTH_SECONDS}s mean)</p>
        </div>
      </header>
      <div className="chart-box square">
        <canvas ref={ref} className="chart-canvas" />
      </div>
      <div className="trait-legend">
        {LINES.map((l) => {
          const v = lastOf(l.key);
          return (
            <span key={l.key} className="trait-item">
              <i className={l.dash.length ? "dashed" : ""} style={{ color: l.color }} />
              {l.label}
              <b>{Number.isFinite(v) ? `×${v.toFixed(2)}` : "—"}</b>
            </span>
          );
        })}
      </div>
      <p className="card-note">
        {s.drift === 0
          ? "Trait drift is off, so copies are perfect clones and these lines stay flat."
          : "Faster blobs catch or escape more but burn more; sharper eyes cost energy even at rest."}
      </p>
    </section>
  );
}
