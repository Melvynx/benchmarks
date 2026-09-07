import { useMemo, useRef } from "react";

import type { Quake } from "../lib/types";

type Props = {
  quakes: Quake[];
  from: number;
  to: number;
  brush: [number, number] | null;
  onBrush: (range: [number, number] | null) => void;
};

const BINS = 64;

export function Timeline({ quakes, from, to, brush, onBrush }: Props) {
  const dragging = useRef(false);
  const span = Math.max(1, to - from);

  const bins = useMemo(() => {
    const counts = new Array<number>(BINS).fill(0);
    let max = 1;
    for (const quake of quakes) {
      const t = (quake.time - from) / span;
      if (t < 0 || t > 1) continue;
      const i = Math.min(BINS - 1, Math.floor(t * BINS));
      counts[i] += 1;
      if (counts[i] > max) max = counts[i];
    }
    return { counts, max };
  }, [quakes, from, span]);

  const setFromClient = (el: HTMLElement, clientX: number, extend: boolean) => {
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const t = from + x * span;
    if (!extend || !brush) {
      const pad = span * 0.04;
      onBrush([Math.max(from, t - pad), Math.min(to, t + pad)]);
      return;
    }
    const mid = (brush[0] + brush[1]) / 2;
    if (t < mid) onBrush([t, brush[1]]);
    else onBrush([brush[0], t]);
  };

  const left = brush ? ((brush[0] - from) / span) * 100 : 0;
  const right = brush ? ((brush[1] - from) / span) * 100 : 100;

  return (
    <section className="timeline" aria-label="Activity over time">
      <div className="timeline-head">
        <span>Activity</span>
        {brush ? (
          <button type="button" className="text-btn" onClick={() => onBrush(null)}>
            Clear time filter
          </button>
        ) : (
          <span className="hint">Drag to isolate a stretch of time</span>
        )}
      </div>
      <div
        className="timeline-track"
        role="slider"
        aria-valuemin={from}
        aria-valuemax={to}
        aria-valuenow={brush ? brush[0] : from}
        tabIndex={0}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setFromClient(e.currentTarget, e.clientX, false);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          setFromClient(e.currentTarget, e.clientX, true);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        <svg viewBox={`0 0 ${BINS} 32`} preserveAspectRatio="none" aria-hidden="true">
          {bins.counts.map((count, i) => {
            const h = (count / bins.max) * 28;
            return (
              <rect
                key={i}
                x={i + 0.12}
                y={32 - h}
                width={0.76}
                height={h}
                rx={0.12}
                fill="currentColor"
                opacity={count === 0 ? 0.18 : 0.85}
              />
            );
          })}
        </svg>
        {brush ? (
          <>
            <div className="brush-dim" style={{ width: `${left}%` }} />
            <div className="brush-dim right" style={{ width: `${100 - right}%` }} />
            <div className="brush" style={{ left: `${left}%`, width: `${Math.max(1.2, right - left)}%` }} />
          </>
        ) : null}
      </div>
    </section>
  );
}
