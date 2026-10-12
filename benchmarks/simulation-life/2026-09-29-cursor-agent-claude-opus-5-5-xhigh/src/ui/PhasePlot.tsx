import type { Simulation } from "../sim/engine";
import { COLORS, niceMax, useCanvas } from "./useCanvas";

const PAD = { l: 30, r: 10, t: 10, b: 24 };

export function PhasePlot({ sim, version }: { sim: Simulation; version: number }) {
  const h = sim.history;
  const { ref } = useCanvas(
    (ctx, w, hgt) => {
      let bMax = 5;
      let rMax = 5;
      for (const s of h) {
        if (s.blue > bMax) bMax = s.blue;
        if (s.red > rMax) rMax = s.red;
      }
      bMax = niceMax(bMax * 1.05);
      rMax = niceMax(rMax * 1.05);
      const pw = w - PAD.l - PAD.r;
      const ph = hgt - PAD.t - PAD.b;
      const xOf = (v: number) => PAD.l + (v / bMax) * pw;
      const yOf = (v: number) => PAD.t + ph - (v / rMax) * ph;

      ctx.font = "10px ui-rounded, system-ui, sans-serif";
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const x = PAD.l + (pw * i) / 4;
        const y = PAD.t + (ph * i) / 4;
        ctx.beginPath();
        ctx.moveTo(x, PAD.t);
        ctx.lineTo(x, PAD.t + ph);
        ctx.moveTo(PAD.l, y);
        ctx.lineTo(PAD.l + pw, y);
        ctx.stroke();
      }
      ctx.fillStyle = COLORS.blue;
      ctx.textAlign = "center";
      ctx.fillText(`blue → ${bMax}`, PAD.l + pw / 2, hgt - 6);
      ctx.save();
      ctx.translate(11, PAD.t + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = COLORS.red;
      ctx.fillText(`red → ${rMax}`, 0, 0);
      ctx.restore();
      if (h.length < 2) return;

      const stride = Math.max(1, Math.floor(h.length / 1500));
      const n = Math.ceil(h.length / stride);
      let prevX = xOf(h[0].blue);
      let prevY = yOf(h[0].red);
      ctx.lineCap = "round";
      for (let k = 1; k < n; k++) {
        const s = h[Math.min(h.length - 1, k * stride)];
        const x = xOf(s.blue);
        const y = yOf(s.red);
        const age = k / n;
        ctx.strokeStyle = `rgba(${Math.round(59 + 196 * age)}, ${Math.round(140 - 50 * age)}, ${Math.round(255 - 149 * age)}, ${0.12 + 0.75 * age * age})`;
        ctx.lineWidth = 1 + age * 1.6;
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(x, y);
        ctx.stroke();
        prevX = x;
        prevY = y;
      }
      const start = h[0];
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = COLORS.muted;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(xOf(start.blue), yOf(start.red), 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const now = h[h.length - 1];
      ctx.fillStyle = COLORS.ink;
      ctx.beginPath();
      ctx.arc(xOf(now.blue), yOf(now.red), 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(xOf(now.blue), yOf(now.red), 2, 0, Math.PI * 2);
      ctx.fill();
    },
    [version, h.length],
  );

  return (
    <section className="card phase">
      <header className="card-head">
        <h2>Blue vs red</h2>
        <span className="card-sub">loops = waves · fading trail = older</span>
      </header>
      <div className="canvas-box">
        <canvas ref={ref} />
      </div>
    </section>
  );
}
