import type { Sample, World } from '../sim/engine';
import { COLORS, Chart, clockLabel, niceMax, tooltip, type DrawArgs } from './Chart';

const PAD = { l: 40, r: 14, t: 12, b: 30 };

function trailColor(k: number, a: number) {
  const hue = 262 + (330 - 262) * k;
  const light = 78 - 30 * k;
  return `hsla(${hue}, 78%, ${light}%, ${a})`;
}

export function PhaseChart({ world }: { world: World }) {
  const samples = world.history.samples;

  const draw = ({ ctx, w, h, hover }: DrawArgs) => {
    const n = samples.length;
    const px = PAD.l;
    const pw = w - PAD.l - PAD.r;
    const py = PAD.t;
    const ph = h - PAD.t - PAD.b;

    let mb = 1;
    let mr = 1;
    for (const s of samples) {
      if (s.blue > mb) mb = s.blue;
      if (s.red > mr) mr = s.red;
    }
    const xMax = niceMax(mb, 4);
    const yMax = niceMax(mr, 4);
    const X = (v: number) => px + (v / xMax) * pw;
    const Y = (v: number) => py + ph - (v / yMax) * ph;

    ctx.font = '600 10.5px ui-rounded, system-ui, sans-serif';
    ctx.lineWidth = 1;
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const gx = px + (pw * i) / 4;
      const gy = py + (ph * i) / 4;
      ctx.strokeStyle = i === 0 ? 'rgba(90,70,120,0.28)' : COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(gx, py);
      ctx.lineTo(gx, py + ph);
      ctx.stroke();
      ctx.strokeStyle = i === 4 ? 'rgba(90,70,120,0.28)' : COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(px, gy);
      ctx.lineTo(px + pw, gy);
      ctx.stroke();
      ctx.fillStyle = COLORS.axis;
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round((xMax * i) / 4 * 10) / 10}`, gx, py + ph + 11);
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round((yMax * (4 - i)) / 4 * 10) / 10}`, px - 6, gy);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.blue;
    ctx.fillText('blue blobs →', px + pw / 2, h - 6);
    ctx.save();
    ctx.translate(11, py + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = COLORS.red;
    ctx.fillText('red blobs →', 0, 0);
    ctx.restore();

    if (n < 2) {
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.axis;
      ctx.fillText('The loop appears once history builds up…', px + pw / 2, py + ph / 2);
      return;
    }

    const stride = Math.max(1, Math.ceil(n / 600));
    const pts: Sample[] = [];
    for (let i = 0; i < n; i += stride) pts.push(samples[i]);
    if (pts[pts.length - 1] !== samples[n - 1]) pts.push(samples[n - 1]);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let arrowAcc = 0;
    for (let i = 1; i < pts.length; i++) {
      const k = i / (pts.length - 1);
      const x0 = X(pts[i - 1].blue);
      const y0 = Y(pts[i - 1].red);
      const x1 = X(pts[i].blue);
      const y1 = Y(pts[i].red);
      ctx.strokeStyle = trailColor(k, 0.25 + 0.75 * k);
      ctx.lineWidth = 1.2 + 1.6 * k;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      const len = Math.hypot(x1 - x0, y1 - y0);
      arrowAcc += len;
      if (arrowAcc > 70 && len > 0.5) {
        arrowAcc = 0;
        const a = Math.atan2(y1 - y0, x1 - x0);
        ctx.fillStyle = trailColor(k, 0.4 + 0.6 * k);
        ctx.beginPath();
        ctx.moveTo(x1 + Math.cos(a) * 5, y1 + Math.sin(a) * 5);
        ctx.lineTo(x1 + Math.cos(a + 2.5) * 5, y1 + Math.sin(a + 2.5) * 5);
        ctx.lineTo(x1 + Math.cos(a - 2.5) * 5, y1 + Math.sin(a - 2.5) * 5);
        ctx.closePath();
        ctx.fill();
      }
    }

    const first = samples[0];
    ctx.strokeStyle = COLORS.ink;
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(X(first.blue), Y(first.red), 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.ink;
    ctx.fillText('start', X(first.blue) + 8, Y(first.red) - 6);

    const last = samples[n - 1];
    const lx = X(last.blue);
    const ly = Y(last.red);
    ctx.fillStyle = 'rgba(122,61,240,0.2)';
    ctx.beginPath();
    ctx.arc(lx, ly, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = trailColor(1, 1);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = lx > px + pw - 40 ? 'right' : 'left';
    ctx.fillStyle = COLORS.ink;
    ctx.fillText('now', lx + (lx > px + pw - 40 ? -10 : 10), ly - 10);

    if (hover) {
      let best: Sample | null = null;
      let bd = 18;
      for (const s of pts) {
        const d = Math.hypot(X(s.blue) - hover.x, Y(s.red) - hover.y);
        if (d < bd) {
          bd = d;
          best = s;
        }
      }
      if (best) {
        const x = X(best.blue);
        const y = Y(best.red);
        ctx.strokeStyle = COLORS.ink;
        ctx.fillStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        tooltip(ctx, w, x, Math.min(py + ph - 60, Math.max(py, y - 30)), `t = ${clockLabel(best.t)}`, [
          { color: COLORS.blue, text: `Blue ${best.blue}` },
          { color: COLORS.red, text: `Red ${best.red}` },
        ]);
      }
    }
  };

  return (
    <div className="chart-block">
      <Chart height={230} draw={draw} label="Blue versus red phase plot" />
      <p className="chart-note">Each dot is a recorded moment. Predator–prey systems trace loops; a spiral inward means the groups are settling.</p>
    </div>
  );
}
