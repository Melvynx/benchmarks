import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { drawChart, type ChartHover, type ChartKind } from '../render/charts';
import type { Sample } from '../sim/types';

interface ChartCanvasProps {
  kind: ChartKind;
  history: Sample[];
  /** Changes whenever history grows, so the chart redraws without diffing samples. */
  version: number;
  height: number;
  label: string;
}

export function ChartCanvas({ kind, history, version, height, label }: ChartCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<ChartHover | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawChart(ctx, kind, width, height, history, hover);
  }, [kind, history, version, width, height, hover]);

  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setHover({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <div className="chart" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        aria-label={label}
        role="img"
        style={{ width: '100%', height }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      />
    </div>
  );
}
