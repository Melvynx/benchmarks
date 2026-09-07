import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { quakeColor, type ColorMode } from "../lib/color";
import { compactNumber, depthLabel, magnitudeLabel, relativeTime, splitPlace } from "../lib/format";
import type { Quake } from "../lib/usgs";

const ROW_HEIGHT = 68;
const OVERSCAN = 8;

export interface EventListProps {
  quakes: Quake[];
  selectedId: string | null;
  colorMode: ColorMode;
  now: number;
  onSelect: (quake: Quake) => void;
}

/**
 * Windowed list. The feed can hold ten thousand events and every one of them
 * must stay reachable, so rows are a fixed height and only the visible slice
 * is mounted.
 */
export function EventList({ quakes, selectedId, colorMode, now, onSelect }: EventListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewportHeight(entry.contentRect.height);
    });
    observer.observe(element);
    setViewportHeight(element.clientHeight);
    return () => observer.disconnect();
  }, []);

  const onScroll = useCallback(() => {
    setScrollTop(scrollRef.current?.scrollTop ?? 0);
  }, []);

  // Reset to the top whenever the result set itself changes identity.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setScrollTop(0);
  }, [quakes]);

  // Keep the selected row in view when selection comes from the map.
  useEffect(() => {
    if (!selectedId) return;
    const index = quakes.findIndex((q) => q.id === selectedId);
    const element = scrollRef.current;
    if (index < 0 || !element) return;
    const top = index * ROW_HEIGHT;
    const bottom = top + ROW_HEIGHT;
    if (top < element.scrollTop || bottom > element.scrollTop + element.clientHeight) {
      element.scrollTo({ top: Math.max(0, top - element.clientHeight / 2), behavior: "smooth" });
    }
  }, [selectedId, quakes]);

  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const last = Math.min(
    quakes.length,
    Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN,
  );
  const visible = quakes.slice(first, last);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const index = quakes.findIndex((q) => q.id === selectedId);
    const nextIndex =
      index < 0
        ? 0
        : Math.min(quakes.length - 1, Math.max(0, index + (event.key === "ArrowDown" ? 1 : -1)));
    const next = quakes[nextIndex];
    if (next) onSelect(next);
  };

  if (quakes.length === 0) {
    return (
      <div className="list-empty">
        <div className="list-empty-mark" aria-hidden="true">
          ∅
        </div>
        <p className="list-empty-title">No events match</p>
        <p className="list-empty-body">
          Widen the magnitude or depth range, clear the search, or pick a longer time window.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="list-scroll"
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="listbox"
      aria-label="Earthquake results"
      aria-activedescendant={selectedId ? `row-${selectedId}` : undefined}
    >
      <div style={{ height: quakes.length * ROW_HEIGHT, position: "relative" }}>
        {visible.map((quake, i) => (
          <EventRow
            key={quake.id}
            quake={quake}
            top={(first + i) * ROW_HEIGHT}
            selected={quake.id === selectedId}
            colorMode={colorMode}
            now={now}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function EventRow({
  quake,
  top,
  selected,
  colorMode,
  now,
  onSelect,
}: {
  quake: Quake;
  top: number;
  selected: boolean;
  colorMode: ColorMode;
  now: number;
  onSelect: (quake: Quake) => void;
}) {
  const color = quakeColor(colorMode, quake, now);
  const { prefix, region } = splitPlace(quake.place);
  const felt = quake.felt ?? 0;

  return (
    <button
      type="button"
      id={`row-${quake.id}`}
      role="option"
      aria-selected={selected}
      className={`row ${selected ? "is-selected" : ""}`}
      style={{ top, height: ROW_HEIGHT }}
      onClick={() => onSelect(quake)}
    >
      <span className="row-mag" style={{ color, borderColor: color }}>
        {magnitudeLabel(quake.mag)}
      </span>
      <span className="row-body">
        <span className="row-place">
          {prefix ? <span className="row-prefix">{prefix} of </span> : null}
          {region}
        </span>
        <span className="row-meta">
          <span>{depthLabel(quake.depth)}</span>
          <span className="row-dot" aria-hidden="true">
            ·
          </span>
          <span>{relativeTime(quake.time, now)}</span>
          {felt > 0 ? (
            <>
              <span className="row-dot" aria-hidden="true">
                ·
              </span>
              <span className="row-felt" title={`${felt.toLocaleString()} felt reports`}>
                {compactNumber(felt)} reports
              </span>
            </>
          ) : null}
        </span>
      </span>
      {quake.tsunami ? (
        <span className="row-flag" title="Tsunami evaluation">
          ~
        </span>
      ) : null}
      <span className="row-tick" style={{ background: color }} aria-hidden="true" />
    </button>
  );
}
