import { useMemo, useRef, useState } from "react";
import type { EarthquakeEvent, TimeRangeKey } from "../types/earthquake";
import { buildTimeline, rangeDurationMs, type TimelineBucket } from "../lib/timeline";
import { classifyMagnitude, formatLocalDateTime, formatMagnitude } from "../lib/format";

const MAG_BAR_COLOR: Record<string, string> = {
  micro: "bg-ink-500",
  minor: "bg-ink-300",
  light: "bg-intermediate",
  moderate: "bg-shallow",
  strong: "bg-alert-orange",
  major: "bg-alert-red",
  great: "bg-alert-red",
};

export interface TimeWindow {
  startMs: number;
  endMs: number;
}

export interface TimelineProps {
  events: EarthquakeEvent[];
  range: TimeRangeKey;
  nowMs: number;
  timeWindow: TimeWindow | null;
  onTimeWindowChange: (w: TimeWindow | null) => void;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
}

export function Timeline({ events, range, nowMs, timeWindow, onTimeWindowChange, hoveredId, selectedId }: TimelineProps) {
  const buckets = useMemo(() => buildTimeline(events, range, nowMs), [events, range, nowMs]);
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const duration = rangeDurationMs(range);
  const startMs = nowMs - duration;

  const dragAnchor = useRef<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);
  const [hoverBucket, setHoverBucket] = useState<TimelineBucket | null>(null);

  const selectedRange = useMemo(() => {
    if (dragAnchor.current === null || dragEnd === null) return null;
    return [Math.min(dragAnchor.current, dragEnd), Math.max(dragAnchor.current, dragEnd)] as const;
  }, [dragEnd]);

  function commitDrag(endIndex: number) {
    if (dragAnchor.current === null) return;
    const lo = Math.min(dragAnchor.current, endIndex);
    const hi = Math.max(dragAnchor.current, endIndex);
    const startBucket = buckets[lo];
    const endBucket = buckets[hi];
    onTimeWindowChange({ startMs: startBucket.startMs, endMs: endBucket.endMs });
    dragAnchor.current = null;
    setDragEnd(null);
  }

  function handlePointerDown(i: number) {
    dragAnchor.current = i;
    setDragEnd(i);
  }
  function handlePointerEnter(i: number) {
    if (dragAnchor.current !== null) setDragEnd(i);
    setHoverBucket(buckets[i]);
  }
  function handlePointerUp(i: number) {
    if (dragAnchor.current !== null) commitDrag(i);
  }

  function toggleBucketSelection(b: TimelineBucket) {
    if (timeWindow && timeWindow.startMs === b.startMs && timeWindow.endMs === b.endMs) {
      onTimeWindowChange(null);
    } else {
      onTimeWindowChange({ startMs: b.startMs, endMs: b.endMs });
    }
  }

  const eventPositions = useMemo(() => {
    const relevant = events.filter((e) => e.id === hoveredId || e.id === selectedId);
    return relevant.map((e) => ({
      id: e.id,
      pct: Math.min(100, Math.max(0, ((e.timeMs - startMs) / duration) * 100)),
      isSelected: e.id === selectedId,
    }));
  }, [events, hoveredId, selectedId, startMs, duration]);

  return (
    <div className="w-full select-none">
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-ink-400">
        <span>{formatLocalDateTime(startMs)}</span>
        {timeWindow && (
          <button
            type="button"
            onClick={() => onTimeWindowChange(null)}
            className="flex items-center gap-1 rounded-full border border-ink-600 px-2 py-0.5 font-medium text-ink-100 hover:border-accent hover:text-accent"
          >
            Clear time selection ×
          </button>
        )}
        <span>{formatLocalDateTime(nowMs)} (now)</span>
      </div>

      <div
        role="group"
        aria-label="Earthquake activity timeline. Select a bar or drag across bars to focus the map and list on that time period."
        className="relative flex h-16 items-end gap-px rounded-md bg-ink-900/60 p-1"
        onPointerLeave={() => setHoverBucket(null)}
      >
        {eventPositions.map((p) => (
          <div
            key={p.id}
            aria-hidden="true"
            className={`pointer-events-none absolute -top-2 h-2 w-0.5 -translate-x-1/2 ${p.isSelected ? "bg-accent" : "bg-ink-100"}`}
            style={{ left: `${p.pct}%` }}
          />
        ))}

        {buckets.map((b, i) => {
          const heightPct = b.count === 0 ? 3 : Math.max(8, (b.count / maxCount) * 100);
          const cls = classifyMagnitude(b.maxMag);
          const inDragSelection = selectedRange && i >= selectedRange[0] && i <= selectedRange[1];
          const inCommittedWindow = timeWindow && b.startMs >= timeWindow.startMs && b.startMs < timeWindow.endMs;
          const dimmed = timeWindow && !inCommittedWindow && !inDragSelection;
          return (
            <button
              key={b.index}
              type="button"
              className={`group relative flex-1 rounded-[2px] transition-[opacity,transform] duration-150 focus-visible:z-10 ${
                dimmed ? "opacity-30" : "opacity-100"
              } ${inDragSelection || inCommittedWindow ? "ring-1 ring-accent" : ""}`}
              style={{ height: "100%" }}
              onPointerDown={() => handlePointerDown(i)}
              onPointerEnter={() => handlePointerEnter(i)}
              onPointerUp={() => handlePointerUp(i)}
              onFocus={() => setHoverBucket(b)}
              onBlur={() => setHoverBucket(null)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  toggleBucketSelection(b);
                }
              }}
              aria-label={`${b.count} event${b.count === 1 ? "" : "s"} between ${formatLocalDateTime(b.startMs)} and ${formatLocalDateTime(b.endMs)}${
                b.maxMag !== null ? `, strongest magnitude ${formatMagnitude(b.maxMag)}` : ""
              }`}
              aria-pressed={Boolean(inCommittedWindow)}
            >
              <span
                className={`absolute bottom-0 left-0 right-0 rounded-[2px] ${MAG_BAR_COLOR[cls.key]} ${
                  b.count === 0 ? "opacity-25" : "opacity-90 group-hover:opacity-100"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 h-4 text-[11px] text-ink-400" aria-live="polite">
        {hoverBucket
          ? `${hoverBucket.count} event${hoverBucket.count === 1 ? "" : "s"} · ${formatLocalDateTime(hoverBucket.startMs)}${
              hoverBucket.maxMag !== null ? ` · strongest M${formatMagnitude(hoverBucket.maxMag)}` : ""
            }`
          : "Hover, click, or drag across the bars to focus the map and list on a time period."}
      </div>
    </div>
  );
}
