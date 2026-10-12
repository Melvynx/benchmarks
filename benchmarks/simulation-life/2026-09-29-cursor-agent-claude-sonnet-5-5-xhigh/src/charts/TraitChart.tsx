import type { Sample, World } from '../sim/engine';
import { COLORS, Chart, clockLabel, nearestIndex, timeTicks, tooltip, type DrawArgs } from './Chart';

const PAD = { l: 38, r: 12, t: 10, b: 22 };

interface Line {
  label: string;
  color: string;
  dash: number[];
  value: (s: Sample) => number;
  alive: (s: Sample) => boolean;
}

const LINES: Line[] = [
  { label: 'Blue speed', color: COLORS.blue, dash: [], value: (s) => s.blueSpeed, alive: (s) => s.blue > 0 },
  { label: 'Blue vision', color: COLORS.blue, dash: [4, 3], value: (s) => s.blueVision, alive: (s) => s.blue > 0 },
  { label: 'Red speed', color: COLORS.red, dash: [], value: (s) => s.redSpeed, alive: (s) => s.red > 0 },
  { label: 'Red vision', color: COLORS.red, dash: [4, 3], value: (s) => s.redVision, alive: (s) => s.red > 0 },
];

export function TraitChart({ world }: { world: World }) {
  const samples = world.history.samples;

  const draw = ({ ctx, w, h, hover }: DrawArgs) => {
    const n = samples.length;
    const px = PAD.l;
    const pw = w - PAD.l - PAD.r;
    const py = PAD.t;
    const ph = h - PAD.t - PAD.b;
    const dur = Math.max(60, n ? samples[n - 1].t : 60);

    let lo = 0.9;
    let hi = 1.1;
    for (const s of samples) {
      for (const l of LINES) {
        if (!l.alive(s)) continue;
        const v = l.value(s);
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    lo = Math.floor((lo - 0.02) * 20) / 20;
    hi = Math.ceil((hi + 0.02) * 20) / 20;
    const X = (t: number) => px + (t / dur) * pw;
    const Y = (v: number) => py + ph - ((v - lo) / (hi - lo)) * ph;

    ctx.font = '600 10.5px ui-rounded, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    const rows = 4;
    for (let i = 0; i <= rows; i++) {
      const v = lo + ((hi - lo) * (rows - i)) / rows;
      const y = py + (ph * i) / rows;
      ctx.strokeStyle = i === rows ? 'rgba(90,70,120,0.28)' : COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px + pw, y);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.fillStyle = COLORS.axis;
      ctx.fillText(`×${v.toFixed(2)}`, px - 5, y);
    }
    const y1 = Y(1);
    ctx.strokeStyle = 'rgba(59,51,80,0.4)';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(px, y1);
    ctx.lineTo(px + pw, y1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    for (const t of timeTicks(dur, pw)) {
      ctx.fillStyle = COLORS.axis;
      ctx.fillText(clockLabel(t), Math.min(w - 14, Math.max(px + 8, X(t))), h - 8);
    }

    if (n < 2) {
      ctx.fillStyle = COLORS.axis;
      ctx.fillText('Traits are averaged over living blobs at each sample…', px + pw / 2, py + ph / 2);
      return;
    }

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    for (const l of LINES) {
      ctx.strokeStyle = l.color;
      ctx.setLineDash(l.dash);
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < n; i++) {
        const s = samples[i];
        if (!l.alive(s)) {
          pen = false;
          continue;
        }
        const x = X(s.t);
        const y = Y(l.value(s));
        if (pen) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        pen = true;
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    if (hover && hover.x >= px && hover.x <= px + pw) {
      const idx = nearestIndex(samples.map((s) => s.t), ((hover.x - px) / pw) * dur);
      const s = samples[idx];
      const x = X(s.t);
      ctx.strokeStyle = 'rgba(59,51,80,0.35)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x, py + ph);
      ctx.stroke();
      ctx.setLineDash([]);
      const rows2 = LINES.filter((l) => l.alive(s)).map((l) => ({ color: l.color, text: `${l.label} ×${l.value(s).toFixed(3)}` }));
      for (const l of LINES) {
        if (!l.alive(s)) continue;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, Y(l.value(s)), 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = l.color;
        ctx.beginPath();
        ctx.arc(x, Y(l.value(s)), 3, 0, Math.PI * 2);
        ctx.fill();
      }
      tooltip(ctx, w, x, py + 4, `t = ${clockLabel(s.t)}`, rows2.length ? rows2 : [{ color: COLORS.axis, text: 'nobody alive' }]);
    }
  };

  return (
    <div className="chart-block">
      <div className="chart-head">
        <div className="legend">
          <span className="legend-item">
            <i style={{ background: COLORS.blue }} />
            Blue
          </span>
          <span className="legend-item">
            <i style={{ background: COLORS.red }} />
            Red
          </span>
          <span className="legend-item plain">solid = speed</span>
          <span className="legend-item plain">dashed = vision</span>
        </div>
      </div>
      <Chart height={230} draw={draw} label="Average speed and vision traits over time" />
      <p className="chart-note">Mean trait multiplier of living blobs. Kids inherit their parent with a small random change, so selection shows up here.</p>
    </div>
  );
}
