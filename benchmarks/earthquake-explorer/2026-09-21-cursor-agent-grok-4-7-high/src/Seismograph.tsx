import { useMemo } from 'react';
import { magColor } from './magnitude';
import type { Quake } from './types';

type SeismographProps = {
  quakes: Quake[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

function buildTrace(quakes: Quake[], selectedId: string | null) {
  const sorted = [...quakes].sort((a, b) => a.time - b.time);
  if (sorted.length <= 180) return { points: sorted, binned: false };
  const buckets = 150;
  const start = sorted[0].time;
  const span = Math.max(1, sorted[sorted.length - 1].time - start);
  const chosen: Array<Quake | null> = Array.from({ length: buckets }, () => null);
  for (const quake of sorted) {
    const index = Math.min(buckets - 1, Math.floor(((quake.time - start) / span) * buckets));
    const current = chosen[index];
    if (!current || quake.mag > current.mag) chosen[index] = quake;
  }
  const points = chosen.filter((quake): quake is Quake => quake !== null);
  if (selectedId && !points.some((quake) => quake.id === selectedId)) {
    const selected = sorted.find((quake) => quake.id === selectedId);
    if (selected) {
      points.push(selected);
      points.sort((a, b) => a.time - b.time);
    }
  }
  return { points, binned: true };
}

export function Seismograph({ quakes, selectedId, onSelect, onHover }: SeismographProps) {
  const trace = useMemo(() => buildTrace(quakes, selectedId), [quakes, selectedId]);
  const width = 320;
  const height = 78;
  const pad = 8;
  const maxMag = Math.max(6, ...trace.points.map((quake) => quake.mag), 0);
  const start = trace.points[0]?.time ?? 0;
  const span = Math.max(1, (trace.points[trace.points.length - 1]?.time ?? start) - start);
  const yFor = (mag: number) => pad + (height - pad * 2) * (1 - mag / maxMag);
  const placed = trace.points.map((quake) => {
    const x = trace.points.length === 1 ? width / 2 : pad + ((quake.time - start) / span) * (width - pad * 2);
    return { quake, x, y: yFor(quake.mag) };
  });
  const path = placed.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');

  return (
    <div className="trace-wrap">
      <svg className="trace" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        {[2, 4, 6]
          .filter((mag) => mag < maxMag)
          .map((mag) => (
            <line key={mag} className="trace-grid" x1={pad} x2={width - pad} y1={yFor(mag)} y2={yFor(mag)} />
          ))}
        {placed.length > 1 ? <path className="trace-line" d={path} /> : null}
        {placed.map((point) => {
          const active = point.quake.id === selectedId;
          return (
            <g
              key={point.quake.id}
              className="trace-hit"
              onClick={() => onSelect(point.quake.id)}
              onMouseEnter={() => onHover(point.quake.id)}
              onMouseLeave={() => onHover(null)}
            >
              <circle cx={point.x} cy={point.y} r={8} fill="transparent" />
              <circle
                cx={point.x}
                cy={point.y}
                r={active ? 5.2 : 3.3}
                fill={magColor(point.quake.mag)}
                stroke={active ? '#f4efe4' : '#041018'}
                strokeWidth={1.2}
              />
            </g>
          );
        })}
      </svg>
      {placed.length === 0 ? <p className="trace-empty">The trace fills in as events arrive.</p> : null}
      <p className="trace-caption">
        {trace.binned
          ? 'Older on the left. Each peak is the largest event in that slice of time.'
          : 'Older on the left. Height is magnitude. Select a peak.'}
      </p>
    </div>
  );
}
