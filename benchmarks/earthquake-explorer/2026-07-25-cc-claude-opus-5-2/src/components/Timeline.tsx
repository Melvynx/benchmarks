import { useCallback, useMemo, useRef, useState } from "react";

import { RAMPS, sampleStops } from "../lib/color";
import { localTime, relativeTime } from "../lib/format";
import { buildHistogram, maxCount } from "../lib/histogram";
import type { Quake } from "../lib/usgs";

const BIN_COUNT = 110;

export interface TimelineProps {
  /** Every event in the feed, so the shape of the strip never moves. */
  quakes: Quake[];
  from: number;
  to: number;
  /** Current brush, or null when the whole window is selected. */
  selection: [number, number] | null;
  onSelectionChange: (range: [number, number] | null) => void;
  now: number;
  windowLabel: string;
}

/**
 * Activity over the feed window, and the control for narrowing to part of it.
 * Bars are counts; bar colour is the strongest event in that bin, so a quiet
 * hour with one M6 still announces itself.
 */
export function Timeline({
  quakes,
  from,
  to,
  selection,
  onSelectionChange,
  now,
  windowLabel,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ start: number; current: number } | null>(null);

  const bins = useMemo(() => buildHistogram(quakes, from, to, BIN_COUNT), [quakes, from, to]);
  const peak = Math.max(1, maxCount(bins));
  const newest = useMemo(() => {
    let best: number | null = null;
    for (const quake of quakes) if (best === null || quake.time > best) best = quake.time;
    return best;
  }, [quakes]);

  const timeAt = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return from;
      const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return from + fraction * (to - from);
    },
    [from, to],
  );

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const t = timeAt(event.clientX);
    setDrag({ start: t, current: t });
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag) return;
    setDrag({ ...drag, current: timeAt(event.clientX) });
  };

  const onPointerUp = () => {
    if (!drag) return;
    const low = Math.min(drag.start, drag.current);
    const high = Math.max(drag.start, drag.current);
    // A click, not a drag: clear the brush.
    if (high - low < (to - from) / BIN_COUNT) onSelectionChange(null);
    else onSelectionChange([low, high]);
    setDrag(null);
  };

  const live = drag ? ([Math.min(drag.start, drag.current), Math.max(drag.start, drag.current)] as const) : selection;
  const span = to - from || 1;
  const brushLeft = live ? ((live[0] - from) / span) * 100 : 0;
  const brushWidth = live ? ((live[1] - live[0]) / span) * 100 : 0;

  const ticks = useMemo(() => {
    const count = 4;
    return Array.from({ length: count + 1 }, (_, i) => from + (span * i) / count);
  }, [from, span]);

  return (
    <div className="timeline">
      <div className="timeline-head">
        <span className="timeline-title">
          Activity · {windowLabel}
          <span className="timeline-hint">drag to narrow the range</span>
        </span>
        {selection ? (
          <span className="timeline-selection">
            {localTime(selection[0])} → {localTime(selection[1])}
            <button type="button" className="link-btn" onClick={() => onSelectionChange(null)}>
              Clear
            </button>
          </span>
        ) : (
          <span className="timeline-selection timeline-selection-muted">
            {quakes.length.toLocaleString()} events · newest{" "}
            {newest === null ? "—" : relativeTime(newest, now)}
          </span>
        )}
      </div>

      <div
        ref={trackRef}
        className="timeline-track"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        role="group"
        aria-label="Time range brush"
      >
        {bins.map((bin, index) => {
          const height = bin.count === 0 ? 0 : Math.max(3, (bin.count / peak) * 100);
          const inRange = !live || (bin.end > live[0] && bin.start < live[1]);
          return (
            <span
              key={index}
              className={`timeline-bar ${inRange ? "" : "is-dim"}`}
              style={{
                height: `${height}%`,
                background:
                  bin.peakMag === null
                    ? "transparent"
                    : sampleStops(RAMPS.magnitude.stops, bin.peakMag),
              }}
              title={
                bin.count > 0
                  ? `${bin.count} event${bin.count === 1 ? "" : "s"} · peak M${bin.peakMag?.toFixed(1)}\n${localTime(bin.start)}`
                  : undefined
              }
            />
          );
        })}

        {live ? (
          <span
            className="timeline-brush"
            style={{ left: `${brushLeft}%`, width: `${Math.max(brushWidth, 0.4)}%` }}
          />
        ) : null}
      </div>

      <div className="timeline-axis">
        {ticks.map((tick, i) => (
          <span
            key={tick}
            className="timeline-axis-tick"
            style={{ left: `${(i / (ticks.length - 1)) * 100}%` }}
            data-align={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "mid"}
          >
            {i === ticks.length - 1 ? "now" : relativeTime(tick, now)}
          </span>
        ))}
      </div>
    </div>
  );
}
