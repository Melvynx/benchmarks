import { useCallback, useEffect, useRef, useState } from "react";
import type { Quake } from "../types";
import { formatDepth, formatLocal, formatMag, magBand, relativeTime } from "../lib/quake";

const ROW_HEIGHT = 74;
const OVERSCAN = 6;

type Props = {
  quakes: Quake[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  now: number;
};

export function EventList({ quakes, selectedId, hoveredId, onSelect, onHover, now }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(480);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewport(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep the selected event reachable: scroll it into the window when selection
  // changes from the map or timeline.
  useEffect(() => {
    if (!selectedId) return;
    const idx = quakes.findIndex((q) => q.id === selectedId);
    if (idx === -1) return;
    const el = scrollRef.current;
    if (!el) return;
    const top = idx * ROW_HEIGHT;
    if (top < el.scrollTop || top + ROW_HEIGHT > el.scrollTop + el.clientHeight) {
      el.scrollTo({ top: Math.max(0, top - el.clientHeight / 2 + ROW_HEIGHT / 2) });
    }
  }, [selectedId, quakes]);

  // Roving focus: arrows browse (and highlight on the map via onFocus→onHover),
  // Enter/Space on the focused row opens the detail.
  const [focusIdx, setFocusIdx] = useState<number | null>(null);

  useEffect(() => {
    if (focusIdx == null) return;
    const el = scrollRef.current?.querySelector<HTMLButtonElement>(`[data-idx="${focusIdx}"]`);
    el?.focus({ preventScroll: true });
    const scroller = scrollRef.current;
    if (!scroller) return;
    const top = focusIdx * ROW_HEIGHT;
    if (top < scroller.scrollTop) scroller.scrollTo({ top });
    else if (top + ROW_HEIGHT > scroller.scrollTop + scroller.clientHeight)
      scroller.scrollTo({ top: top + ROW_HEIGHT - scroller.clientHeight });
  }, [focusIdx, scrollTop]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const current =
        focusIdx ?? (selectedId ? quakes.findIndex((q) => q.id === selectedId) : -1);
      let next = current;
      if (e.key === "ArrowDown") next = Math.min(quakes.length - 1, current + 1);
      else if (e.key === "ArrowUp") next = Math.max(0, current === -1 ? 0 : current - 1);
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = quakes.length - 1;
      if (next >= 0 && next < quakes.length) setFocusIdx(next);
    },
    [quakes, selectedId, focusIdx],
  );

  // A new result set invalidates the remembered position.
  useEffect(() => setFocusIdx(null), [quakes]);

  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const last = Math.min(quakes.length, Math.ceil((scrollTop + viewport) / ROW_HEIGHT) + OVERSCAN);
  const visible = quakes.slice(first, last);

  return (
    <div
      ref={scrollRef}
      className="event-scroll"
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
      onKeyDown={onKeyDown}
      onMouseLeave={() => onHover(null)}
      tabIndex={0}
      role="group"
      aria-label="Event stream. Press the down arrow to browse events, Enter to open one."
    >
      <ol
        className="event-list"
        aria-label={`Event stream, ${quakes.length} events. Use arrow keys to move between events.`}
        style={{ height: quakes.length * ROW_HEIGHT }}
      >
        {visible.map((q, i) => {
          const idx = first + i;
          const band = magBand(q.mag);
          const isNew = now - q.time < 3_600_000;
          const selected = q.id === selectedId;
          return (
            <li
              key={q.id}
              className="event-item"
              style={{ transform: `translateY(${idx * ROW_HEIGHT}px)` }}
            >
              <button
                type="button"
                data-idx={idx}
                tabIndex={-1}
                className={`event-row ${selected ? "is-selected" : ""} ${q.id === hoveredId ? "is-hovered" : ""}`}
                aria-pressed={selected}
                aria-current={selected ? "true" : undefined}
                onClick={() => onSelect(q.id)}
                onMouseEnter={() => onHover(q.id)}
                onFocus={() => onHover(q.id)}
              >
                <span className={`mag-disc band-${band}`} aria-hidden="true">
                  {formatMag(q.mag)}
                </span>
                <span className="event-main">
                  <span className="event-place">
                    <span className="sr-only">Magnitude {formatMag(q.mag)}, </span>
                    {q.place ?? q.title}
                  </span>
                  <span className="event-meta mono">
                    <span title={formatLocal(q.time)}>{relativeTime(q.time, now)}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{q.depth != null ? `${formatDepth(q.depth)} km deep` : "depth n/a"}</span>
                  </span>
                </span>
                <span className="event-tags">
                  {isNew && <span className="tag tag-new">new</span>}
                  {q.tsunami && <span className="tag tag-tsunami">tsunami info</span>}
                  {q.alert && <span className={`tag tag-alert-${q.alert}`}>{q.alert} alert</span>}
                  {q.type !== "earthquake" && <span className="tag">{q.type.replace(/_/g, " ")}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
