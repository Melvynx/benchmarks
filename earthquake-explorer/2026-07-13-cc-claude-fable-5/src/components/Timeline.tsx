import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Brush, Period, Quake } from "../types";
import { magBand } from "../lib/quake";

const BAND_COLOR = {
  minor: "#5e695a",
  light: "#8a6110",
  moderate: "#a63e1b",
  major: "#8c1d18",
} as const;

const HEIGHT = 104;
const TOP = 10;
const BASE = 78; // baseline y for ticks
const AXIS = 92;

type Props = {
  quakes: Quake[]; // time-filtered by period, other filters applied, brush NOT applied
  domain: [number, number];
  period: Period;
  brush: Brush;
  onBrush: (brush: Brush) => void;
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
};

function timeFormat(ts: number, period: Period): string {
  if (period === "hour" || period === "day") {
    return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(ts);
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(ts);
}

function brushLabel(brush: Brush, period: Period): string {
  if (!brush) return "";
  const withDay = (ts: number) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(ts);
  if (period === "hour" || period === "day")
    return `${timeFormat(brush.start, period)} – ${timeFormat(brush.end, period)}`;
  return `${withDay(brush.start)} – ${withDay(brush.end)}`;
}

export function Timeline({
  quakes,
  domain,
  period,
  brush,
  onBrush,
  selectedId,
  hoveredId,
  onHover,
  onSelect,
  reducedMotion,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(600);
  const [drag, setDrag] = useState<null | { anchor: number; moved: boolean }>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.max(240, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [t0, t1] = domain;
  const span = Math.max(1, t1 - t0);
  const xOf = useCallback((ts: number) => ((ts - t0) / span) * width, [t0, span, width]);
  const tOf = useCallback((x: number) => t0 + (Math.min(Math.max(x, 0), width) / width) * span, [t0, span, width]);

  // Background activity histogram (event counts per bucket).
  const histogram = useMemo(() => {
    const buckets = 72;
    const counts = new Array<number>(buckets).fill(0);
    for (const q of quakes) {
      const i = Math.min(buckets - 1, Math.max(0, Math.floor(((q.time - t0) / span) * buckets)));
      counts[i]++;
    }
    const max = Math.max(1, ...counts);
    return { counts, max, buckets };
  }, [quakes, t0, span]);

  const axisTicks = useMemo(() => {
    const step =
      period === "hour" ? 15 * 60_000 : period === "day" ? 6 * 3_600_000 : period === "week" ? 86_400_000 : 7 * 86_400_000;
    const ticks: number[] = [];
    for (let ts = Math.ceil(t0 / step) * step; ts <= t1; ts += step) ticks.push(ts);
    return ticks;
  }, [t0, t1, period]);

  // On dense feeds (30 days ≈ 10k events) individual minor ticks become a smear;
  // the histogram already carries the volume, so ticks focus on M 2.5+.
  const dense = quakes.length > 2500;
  const ticks = useMemo(
    () => (dense ? quakes.filter((q) => (q.mag ?? 0) >= 2.5) : quakes),
    [dense, quakes],
  );

  const clientToTime = useCallback(
    (clientX: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return t0;
      return tOf(clientX - rect.left);
    },
    [tOf, t0],
  );

  const minWindow = span / 100;

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDrag({ anchor: clientToTime(e.clientX), moved: false });
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag) {
      const current = clientToTime(e.clientX);
      if (Math.abs(current - drag.anchor) > span / 300) {
        setDrag({ ...drag, moved: true });
        onBrush({ start: Math.min(drag.anchor, current), end: Math.max(drag.anchor, current) });
      }
      return;
    }
    // Hover: nearest tick within 8px.
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    let best: Quake | null = null;
    let bestDist = 8;
    for (const q of ticks) {
      const d = Math.abs(xOf(q.time) - x);
      if (d < bestDist || (best && d === bestDist && (q.mag ?? -10) > (best.mag ?? -10))) {
        best = q;
        bestDist = d;
      }
    }
    onHover(best ? best.id : null);
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    if (!drag.moved) {
      // Treat as a click: select nearest tick, otherwise clear the window.
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const x = e.clientX - rect.left;
        let best: Quake | null = null;
        let bestDist = 8;
        for (const q of ticks) {
          const d = Math.abs(xOf(q.time) - x);
          if (d < bestDist) {
            best = q;
            bestDist = d;
          }
        }
        if (best) onSelect(best.id);
        else if (brush) onBrush(null);
      }
    } else if (brush && brush.end - brush.start < minWindow) {
      onBrush({ start: brush.start, end: brush.start + minWindow });
    }
    setDrag(null);
  };

  const nudge = (edge: "start" | "end", direction: 1 | -1, big: boolean) => {
    const step = (big ? span / 24 : span / 120) * direction;
    const current = brush ?? { start: t0 + span * 0.375, end: t0 + span * 0.625 };
    const next = { ...current };
    next[edge] = Math.min(Math.max(next[edge] + step, t0), t1);
    if (next.end - next.start < minWindow) {
      if (edge === "start") next.start = next.end - minWindow;
      else next.end = next.start + minWindow;
    }
    onBrush(next);
  };

  const handleKey = (edge: "start" | "end") => (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") nudge(edge, -1, e.shiftKey);
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") nudge(edge, 1, e.shiftKey);
    else if (e.key === "Escape") onBrush(null);
    else return;
    e.preventDefault();
  };

  const selected = selectedId ? quakes.find((q) => q.id === selectedId) : null;
  const hovered = hoveredId ? quakes.find((q) => q.id === hoveredId) : null;
  const bw = width / histogram.buckets;

  const sliderProps = (edge: "start" | "end") => {
    const value = brush ? brush[edge] : edge === "start" ? t0 : t1;
    return {
      role: "slider" as const,
      "aria-valuemin": t0,
      "aria-valuemax": t1,
      "aria-valuenow": value,
      "aria-valuetext": `${edge === "start" ? "Window start" : "Window end"}: ${timeFormat(value, period)}`,
      tabIndex: 0,
      onKeyDown: handleKey(edge),
    };
  };

  return (
    <div className="timeline" ref={wrapRef}>
      <div className="timeline-head">
        <span className="timeline-title" id="timeline-label">
          Seismic timeline
        </span>
        {brush ? (
          <span className="timeline-window mono">
            {brushLabel(brush, period)}
            <button type="button" className="timeline-clear" onClick={() => onBrush(null)}>
              Clear window
            </button>
          </span>
        ) : (
          <span className="timeline-hint">
            Drag to focus a time window · click a tick to open the event
            {dense ? " · ticks show M 2.5+, bars show all activity" : ""}
          </span>
        )}
      </div>
      <svg
        ref={svgRef}
        className="timeline-svg"
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        aria-labelledby="timeline-label"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => onHover(null)}
      >
        {/* activity histogram */}
        {histogram.counts.map((c, i) =>
          c === 0 ? null : (
            <rect
              key={i}
              x={i * bw + 0.5}
              y={BASE - (c / histogram.max) * (BASE - TOP)}
              width={Math.max(1, bw - 1)}
              height={(c / histogram.max) * (BASE - TOP)}
              className="timeline-hist"
            />
          ),
        )}
        {/* baseline + axis */}
        <line x1={0} y1={BASE} x2={width} y2={BASE} className="timeline-baseline" />
        {axisTicks.map((ts) => (
          <g key={ts}>
            <line x1={xOf(ts)} y1={BASE} x2={xOf(ts)} y2={BASE + 5} className="timeline-axis-tick" />
            <text x={xOf(ts)} y={AXIS + 6} textAnchor="middle" className="timeline-axis-label">
              {timeFormat(ts, period)}
            </text>
          </g>
        ))}
        {/* event ticks */}
        {ticks.map((q) => {
          const band = magBand(q.mag);
          const h = 4 + Math.max(0, Math.min(9, q.mag ?? 0)) * ((BASE - TOP - 6) / 9);
          const x = xOf(q.time);
          const inWindow = !brush || (q.time >= brush.start && q.time <= brush.end);
          return (
            <line
              key={q.id}
              x1={x}
              y1={BASE}
              x2={x}
              y2={BASE - h}
              stroke={BAND_COLOR[band]}
              strokeWidth={band === "major" ? 2.5 : band === "moderate" ? 2 : 1.25}
              opacity={inWindow ? (band === "minor" ? 0.4 : 0.85) : 0.12}
            />
          );
        })}
        {/* hovered + selected markers */}
        {hovered && (
          <circle cx={xOf(hovered.time)} cy={BASE - (4 + Math.max(0, Math.min(9, hovered.mag ?? 0)) * ((BASE - TOP - 6) / 9))} r={4} className="timeline-hovermark" />
        )}
        {selected && (
          <g className="timeline-selmark" transform={`translate(${xOf(selected.time)}, 0)`}>
            <line x1={0} y1={TOP - 4} x2={0} y2={BASE} />
            <path d={`M -4.5 ${TOP - 8} L 4.5 ${TOP - 8} L 0 ${TOP - 1} Z`} />
          </g>
        )}
        {/* brush window */}
        {brush && (
          <g className={reducedMotion ? "" : "timeline-brush-anim"}>
            <rect x={0} y={0} width={Math.max(0, xOf(brush.start))} height={BASE} className="timeline-shade" />
            <rect x={xOf(brush.end)} y={0} width={Math.max(0, width - xOf(brush.end))} height={BASE} className="timeline-shade" />
            <rect
              x={xOf(brush.start)}
              y={0}
              width={Math.max(0, xOf(brush.end) - xOf(brush.start))}
              height={BASE}
              className="timeline-window-rect"
            />
          </g>
        )}
      </svg>
      {/* Keyboard-accessible brush handles */}
      <div className="timeline-handles">
        <div
          className={`timeline-handle ${brush ? "" : "is-idle"}`}
          style={{ left: `${((brush ? brush.start : t0) - t0) / span * 100}%` }}
          aria-label="Time window start"
          {...sliderProps("start")}
        >
          <span aria-hidden="true">‖</span>
        </div>
        <div
          className={`timeline-handle ${brush ? "" : "is-idle"}`}
          style={{ left: `${((brush ? brush.end : t1) - t0) / span * 100}%` }}
          aria-label="Time window end"
          {...sliderProps("end")}
        >
          <span aria-hidden="true">‖</span>
        </div>
      </div>
    </div>
  );
}
