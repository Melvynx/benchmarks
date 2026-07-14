import { useEffect, useRef } from "react";
import type { EarthquakeEvent } from "../types/earthquake";
import { MagnitudeBadge } from "./MagnitudeBadge";
import { AlertBadge, TsunamiBadge } from "./Badges";
import { formatDepth, formatRelativeTime } from "../lib/format";

export interface EventListProps {
  events: EarthquakeEvent[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  nowMs: number;
  emptyMessage?: string;
}

export function EventList({ events, selectedId, hoveredId, onSelect, onHover, nowMs, emptyMessage }: EventListProps) {
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (!selectedId) return;
    itemRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  if (events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center text-ink-300">
        <p className="text-sm">{emptyMessage ?? "No earthquakes match the current filters."}</p>
      </div>
    );
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex = e.key === "ArrowDown" ? Math.min(index + 1, events.length - 1) : Math.max(index - 1, 0);
      const nextEvent = events[nextIndex];
      itemRefs.current.get(nextEvent.id)?.focus();
    }
  }

  return (
    <ul aria-label="Earthquake list" className="divide-y divide-ink-800">
      {events.map((event, i) => {
        const isSelected = event.id === selectedId;
        const isHovered = event.id === hoveredId;
        return (
          <li key={event.id}>
            <button
              ref={(el) => {
                if (el) itemRefs.current.set(event.id, el);
                else itemRefs.current.delete(event.id);
              }}
              type="button"
              onClick={() => onSelect(event.id)}
              onMouseEnter={() => onHover(event.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(event.id)}
              onBlur={() => onHover(null)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              aria-current={isSelected ? "true" : undefined}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                isSelected ? "bg-accent-soft" : isHovered ? "bg-ink-800/70" : "hover:bg-ink-800/40"
              }`}
            >
              <MagnitudeBadge magnitude={event.magnitude} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-ink-50">{event.place}</p>
                <p className="tnum mt-0.5 text-[11.5px] text-ink-400">
                  {formatRelativeTime(event.timeMs, nowMs)} · {formatDepth(event.depthKm)} deep
                </p>
                {(event.alert || event.tsunami) && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <AlertBadge alert={event.alert} />
                    <TsunamiBadge tsunami={event.tsunami} />
                  </div>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
