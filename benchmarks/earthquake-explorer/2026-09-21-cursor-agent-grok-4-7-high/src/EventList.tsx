import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { formatDepth, relativeTime } from './format';
import { magColor } from './magnitude';
import type { Quake } from './types';

const ITEM = 74;

type EventListProps = {
  quakes: Quake[];
  selectedId: string | null;
  hoverId: string | null;
  now: number;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onReset: () => void;
  canReset: boolean;
};

export function EventList({ quakes, selectedId, hoverId, now, onSelect, onHover, onReset, canReset }: EventListProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const quakesRef = useRef(quakes);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(480);
  quakesRef.current = quakes;

  useLayoutEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;
    const measure = () => setHeight(element.clientHeight || 480);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = scrollerRef.current;
    if (!element || !selectedId) return;
    const index = quakesRef.current.findIndex((quake) => quake.id === selectedId);
    if (index < 0) return;
    const top = index * ITEM;
    const bottom = top + ITEM;
    if (top < element.scrollTop || bottom > element.scrollTop + element.clientHeight) {
      element.scrollTop = Math.max(0, top - element.clientHeight / 2 + ITEM / 2);
    }
  }, [selectedId]);

  const start = Math.max(0, Math.floor(scrollTop / ITEM) - 6);
  const count = Math.ceil(height / ITEM) + 12;
  const slice = quakes.slice(start, start + count);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' || quakes.length === 0) return;
    event.preventDefault();
    const current = quakes.findIndex((quake) => quake.id === selectedId);
    const next =
      event.key === 'ArrowDown'
        ? current < 0
          ? 0
          : Math.min(quakes.length - 1, current + 1)
        : current < 0
          ? quakes.length - 1
          : Math.max(0, current - 1);
    onSelect(quakes[next].id);
  }

  if (quakes.length === 0) {
    return (
      <div className="empty">
        <p>{canReset ? 'No earthquakes match these filters.' : 'No earthquakes in this window.'}</p>
        {canReset ? (
          <button type="button" className="text-btn" onClick={onReset}>
            Clear filters
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className="list"
      aria-label="Earthquakes"
      onScroll={(event) => {
        setScrollTop(event.currentTarget.scrollTop);
        onHover(null);
      }}
      onKeyDown={onKeyDown}
      onMouseLeave={() => onHover(null)}
    >
      <div className="list-space" style={{ height: quakes.length * ITEM }}>
        {slice.map((quake, index) => {
          const position = start + index;
          const pressed = quake.id === selectedId;
          return (
            <button
              key={quake.id}
              type="button"
              className={quake.id === hoverId ? 'row is-hover' : 'row'}
              style={{ top: position * ITEM, height: ITEM }}
              aria-pressed={pressed}
              onClick={() => onSelect(quake.id)}
              onMouseEnter={() => onHover(quake.id)}
            >
              <span className="row-mag" style={{ color: magColor(quake.mag) }}>
                {quake.mag.toFixed(1)}
              </span>
              <span className="row-copy">
                <span className="row-place">{quake.place}</span>
                <span className="row-meta">
                  {relativeTime(quake.time, now)} · {formatDepth(quake.depth)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
