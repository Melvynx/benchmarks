import { ctrl, shallowEqual, useSim } from "../sim";
import { C, niceMax, useCanvas, type Draw } from "./canvas";

/** Signed area of the recent loop: >0 counter-clockwise (red lagging blue). */
function turning(xs: number[], ys: number[]): number {
  let a = 0;
  for (let i = 1; i < xs.length; i++) a += xs[i - 1] * ys[i] - xs[i] * ys[i - 1];
  return a / 2;
}

export function PhasePlot() {
  const s = useSim((x) => ({ hv: x.historyVersion, wv: x.worldVersion }), shallowEqual);

  const h = ctrl.world.history.full;
  const n = h.t.length;
  let note = "Each point is one moment: how many blue (across) and red (up) were alive.";
  if (n > 40) {
    const from = Math.floor(n * 0.4);
    const xs = h.blue.slice(from);
    const ys = h.red.slice(from);
    const mx = Math.max(1, ...xs);
    const my = Math.max(1, ...ys);
    const area = turning(
      xs.map((v) => v / mx),
      ys.map((v) => v / my),
    );
    if (area > 0.02) note = "Loops turn counter-clockwise ↺ : blue rises, red follows, blue falls, then red falls.";
    else if (area < -0.02) note = "Loops turn clockwise here, so red is leading blue for now.";
    else if (h.red[n - 1] === 0 || h.blue[n - 1] === 0) note = "The trail ran into an axis: one group is gone.";
    else note = "The trail is tightening toward a resting point.";
  }

  const draw: Draw = (ctx, W, H) => {
    const pad = { l: 34, r: 12, t: 12, b: 26 };
    const pw = W - pad.l - pad.r;
    const ph = H - pad.t - pad.b;
    ctx.font = C.font;
    if (n < 2) {
      ctx.fillStyle = C.muted;
      ctx.textAlign = "center";
      ctx.fillText("Waiting for the garden to start…", W / 2, H / 2);
      return;
    }
    let mb = 0;
    let mr = 0;
    for (let i = 0; i < n; i++) {
      mb = Math.max(mb, h.blue[i]);
      mr = Math.max(mr, h.red[i]);
    }
    const bx = niceMax(mb, 3);
    const ry = niceMax(mr, 3);
    const X = (v: number) => pad.l + (v / bx.max) * pw;
    const Y = (v: number) => pad.t + ph - (v / ry.max) * ph;

    ctx.lineWidth = 1;
    ctx.textBaseline = "middle";
    for (let v = 0; v <= ry.max + 1e-9; v += ry.step) {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(pad.l, Y(v));
      ctx.lineTo(pad.l + pw, Y(v));
      ctx.stroke();
      ctx.fillStyle = C.red;
      ctx.textAlign = "right";
      ctx.fillText(String(Math.round(v)), pad.l - 6, Y(v));
    }
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    for (let v = 0; v <= bx.max + 1e-9; v += bx.step) {
      ctx.strokeStyle = C.grid;
      ctx.beginPath();
      ctx.moveTo(X(v), pad.t);
      ctx.lineTo(X(v), pad.t + ph);
      ctx.stroke();
      ctx.fillStyle = C.blue;
      ctx.fillText(String(Math.round(v)), X(v), pad.t + ph + 6);
    }

    const segs = 48;
    const per = Math.max(1, Math.ceil((n - 1) / segs));
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (let s0 = 0; s0 < n - 1; s0 += per) {
      const s1 = Math.min(n - 1, s0 + per);
      const age = s1 / (n - 1);
      ctx.strokeStyle = `rgba(122, 86, 196, ${0.08 + 0.82 * age * age})`;
      ctx.lineWidth = 1.2 + age * 1.6;
      ctx.beginPath();
      ctx.moveTo(X(h.blue[s0]), Y(h.red[s0]));
      for (let i = s0 + 1; i <= s1; i++) ctx.lineTo(X(h.blue[i]), Y(h.red[i]));
      ctx.stroke();
    }

    ctx.strokeStyle = C.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(X(h.blue[0]), Y(h.red[0]), 4, 0, Math.PI * 2);
    ctx.stroke();

    const cx = X(h.blue[n - 1]);
    const cy = Y(h.red[n - 1]);
    ctx.fillStyle = "rgba(122, 86, 196, 0.18)";
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7a56c4";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = C.fontBold;
    ctx.fillStyle = C.blue;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText("blue →", pad.l + pw, pad.t + ph - 4);
    ctx.save();
    ctx.translate(pad.l + 6, pad.t + 4);
    ctx.fillStyle = C.red;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("↑ red", 0, 0);
    ctx.restore();
  };

  const { ref } = useCanvas(draw, [s.hv, s.wv]);

  return (
    <section className="card chart-card">
      <header className="card-head">
        <div>
          <h2 className="card-title">Blue vs red</h2>
          <p className="card-sub">Phase plot, faded trail is older</p>
        </div>
      </header>
      <div className="chart-box square">
        <canvas ref={ref} className="chart-canvas" />
      </div>
      <p className="card-note">{note}</p>
    </section>
  );
}
