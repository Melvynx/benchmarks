import { useState } from 'react';
import type { Sample, World } from '../sim/engine';
import { COLORS, Chart, clockLabel, nearestIndex, niceMax, timeTicks, tooltip, type DrawArgs } from './Chart';

type Mode = 'relative' | 'counts' | 'lanes';
type Key = 'fruit' | 'blue' | 'red';

const MODES: Array<{ id: Mode; label: string; hint: string }> = [
  { id: 'relative', label: 'Relative', hint: 'Every line is scaled to its own peak so all three waves are easy to compare. Hover for real counts.' },
  { id: 'counts', label: 'Counts', hint: 'All three share one raw axis. Honest, but red can look small next to blue.' },
  { id: 'lanes', label: 'Lanes', hint: 'Three stacked lanes with their own real axes.' },
];

const SERIES: Array<{ key: Key; label: string; color: string }> = [
  { key: 'fruit', label: 'Ripe fruit', color: COLORS.fruit },
  { key: 'blue', label: 'Blue', color: COLORS.blue },
  { key: 'red', label: 'Red', color: COLORS.red },
];

const PAD = { l: 38, r: 12, t: 10, b: 22 };

function peakOf(samples: Sample[], key: Key) {
  let m = 0;
  for (const s of samples) if (s[key] > m) m = s[key];
  return m;
}

export function TimelineChart({ world }: { world: World }) {
  const [mode, setMode] = useState<Mode>('relative');
  const samples = world.history.samples;
  const peaks: Record<Key, number> = { fruit: peakOf(samples, 'fruit'), blue: peakOf(samples, 'blue'), red: peakOf(samples, 'red') };
  const now: Record<Key, number> = { fruit: world.fruitCount, blue: world.blueCount, red: world.redCount };

  const draw = ({ ctx, w, h, hover }: DrawArgs) => {
    const n = samples.length;
    const dur = Math.max(60, n ? samples[n - 1].t : 60);
    const px = PAD.l;
    const pw = w - PAD.l - PAD.r;
    const py = PAD.t;
    const ph = h - PAD.t - PAD.b;
    const X = (t: number) => px + (t / dur) * pw;

    ctx.font = '600 10.5px ui-rounded, system-ui, sans-serif';
    ctx.textBaseline = 'middle';

    const lanes = mode === 'lanes';
    const gap = 8;
    const laneH = lanes ? (ph - gap * 2) / 3 : ph;
    const laneTop = (i: number) => py + (lanes ? i * (laneH + gap) : 0);

    const scaleFor = (key: Key) => {
      if (mode === 'relative') return Math.max(1, peaks[key]);
      if (mode === 'counts') return niceMax(Math.max(1, peaks.fruit, peaks.blue, peaks.red));
      return niceMax(Math.max(1, peaks[key]), 2);
    };
    const Y = (key: Key, v: number, lane: number) => {
      const top = laneTop(lane);
      const max = mode === 'relative' ? scaleFor(key) * 1.06 : scaleFor(key);
      return top + laneH - (v / max) * laneH;
    };

    // grid + y labels
    ctx.lineWidth = 1;
    if (lanes) {
      SERIES.forEach((s, i) => {
        const top = laneTop(i);
        ctx.fillStyle = 'rgba(120,100,160,0.045)';
        ctx.beginPath();
        ctx.roundRect(px, top, pw, laneH, 6);
        ctx.fill();
        const max = scaleFor(s.key);
        ctx.strokeStyle = COLORS.grid;
        ctx.beginPath();
        ctx.moveTo(px, top + laneH / 2);
        ctx.lineTo(px + pw, top + laneH / 2);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.fillStyle = COLORS.axis;
        ctx.fillText(`${max}`, px - 6, top + 6);
        ctx.fillText('0', px - 6, top + laneH - 5);
        ctx.textAlign = 'left';
        ctx.fillStyle = s.color;
        ctx.fillText(s.label, px + 8, top + 9);
      });
    } else {
      const rows = 4;
      for (let i = 0; i <= rows; i++) {
        const y = py + (ph * i) / rows;
        ctx.strokeStyle = i === rows ? 'rgba(90,70,120,0.28)' : COLORS.grid;
        ctx.beginPath();
        ctx.moveTo(px, y);
        ctx.lineTo(px + pw, y);
        ctx.stroke();
        ctx.textAlign = 'right';
        ctx.fillStyle = COLORS.axis;
        if (mode === 'relative') {
          const frac = (rows - i) / rows;
          ctx.fillText(`${Math.round((frac / 1.06) * 100)}%`, px - 6, y);
        } else {
          const max = scaleFor('blue');
          ctx.fillText(`${Math.round(((rows - i) / rows) * max * 10) / 10}`, px - 6, y);
        }
      }
    }

    // x ticks
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.axis;
    ctx.strokeStyle = COLORS.grid;
    for (const t of timeTicks(dur, pw)) {
      const x = X(t);
      if (!lanes) {
        ctx.beginPath();
        ctx.moveTo(x, py);
        ctx.lineTo(x, py + ph);
        ctx.stroke();
      }
      ctx.fillText(clockLabel(t), Math.min(w - 14, Math.max(px + 8, x)), h - 8);
    }

    if (n < 2) {
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.axis;
      ctx.fillText('Waiting for the first samples…', px + pw / 2, py + ph / 2);
      return;
    }

    // series
    const order: Array<{ key: Key; lane: number }> = [
      { key: 'fruit', lane: 0 },
      { key: 'blue', lane: 1 },
      { key: 'red', lane: 2 },
    ];
    for (const { key, lane } of order) {
      const s = SERIES.find((x) => x.key === key)!;
      const L = lanes ? lane : 0;
      const base = laneTop(L) + laneH;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = X(samples[i].t);
        const y = Y(key, samples[i][key], L);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (key === 'fruit' || lanes) {
        ctx.save();
        ctx.lineTo(X(samples[n - 1].t), base);
        ctx.lineTo(X(samples[0].t), base);
        ctx.closePath();
        ctx.globalAlpha = key === 'fruit' ? 0.16 : 0.1;
        ctx.fillStyle = s.color;
        ctx.fill();
        ctx.restore();
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const x = X(samples[i].t);
          const y = Y(key, samples[i][key], L);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.lineWidth = key === 'fruit' ? 1.6 : 2.2;
      ctx.strokeStyle = s.color;
      ctx.stroke();
      const last = samples[n - 1];
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(X(last.t), Y(key, last[key], L), 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // hover
    if (hover && hover.x >= px && hover.x <= px + pw) {
      const t = ((hover.x - px) / pw) * dur;
      const idx = nearestIndex(samples.map((s) => s.t), t);
      const s = samples[idx];
      const x = X(s.t);
      ctx.strokeStyle = 'rgba(59,51,80,0.35)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x, py + ph);
      ctx.stroke();
      ctx.setLineDash([]);
      for (const { key, lane } of order) {
        const c = SERIES.find((q) => q.key === key)!.color;
        const y = Y(key, s[key], lanes ? lane : 0);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      tooltip(ctx, w, x, py + 4, `t = ${clockLabel(s.t)}`, [
        { color: COLORS.fruit, text: `Ripe fruit ${s.fruit}${Math.round(s.growing) > 0 ? `  (+${Math.round(s.growing)} growing)` : ''}` },
        { color: COLORS.blue, text: `Blue ${s.blue}` },
        { color: COLORS.red, text: `Red ${s.red}` },
      ]);
    }
  };

  const hint = MODES.find((m) => m.id === mode)!.hint;

  return (
    <div className="chart-block">
      <div className="chart-head">
        <div className="legend">
          {SERIES.map((s) => (
            <span key={s.key} className="legend-item">
              <i style={{ background: s.color }} />
              {s.label}
              <b>{now[s.key]}</b>
              <em>peak {peaks[s.key]}</em>
            </span>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Timeline scaling">
          {MODES.map((m) => (
            <button key={m.id} className={m.id === mode ? 'on' : ''} onClick={() => setMode(m.id)} title={m.hint}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <Chart height={230} draw={draw} label="Fruit, blue and red counts over time" />
      <p className="chart-note">{hint}</p>
    </div>
  );
}
