import { useEffect, useRef } from 'react'
import { AlertTriangle, ChevronRight, Radio, Waves } from 'lucide-react'
import { depthClass, formatDepth, formatMagnitude, formatRelativeTime, magnitudeLabel, significanceLabel } from '../lib/earthquakes'
import type { Earthquake } from '../types/earthquake'

interface EventStreamProps {
  events: Earthquake[]
  selectedId: string | null
  hoveredId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

export function EventStream({ events, selectedId, hoveredId, onSelect, onHover }: EventStreamProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!selectedId || !selectedRef.current || !listRef.current) return
    const container = listRef.current
    const item = selectedRef.current
    const itemTop = item.offsetTop
    const itemBottom = itemTop + item.offsetHeight
    if (itemTop < container.scrollTop || itemBottom > container.scrollTop + container.clientHeight) {
      item.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
  }, [selectedId])

  return (
    <section className="stream" aria-labelledby="stream-title">
      <header className="stream__header">
        <div>
          <p className="eyebrow">Event stream</p>
          <h2 id="stream-title">{events.length.toLocaleString()} matching events</h2>
        </div>
        <p>Map, timeline, and stream stay linked.</p>
      </header>
      <div className="stream__list" ref={listRef} role="region" aria-label="Filtered earthquake events" tabIndex={0}>
        {events.map((event) => {
          const isSelected = event.id === selectedId
          const isHovered = event.id === hoveredId
          return (
            <button
              key={event.id}
              ref={isSelected ? selectedRef : undefined}
              type="button"
              className={`event-row${isSelected ? ' is-selected' : ''}${isHovered ? ' is-hovered' : ''}`}
              aria-current={isSelected ? 'true' : undefined}
              onClick={() => onSelect(event.id)}
              onMouseEnter={() => onHover(event.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(event.id)}
              onBlur={() => onHover(null)}
            >
              <span className={`event-row__magnitude magnitude-${event.magnitude !== null && event.magnitude >= 6 ? 'major' : event.magnitude !== null && event.magnitude >= 5 ? 'strong' : event.magnitude !== null && event.magnitude >= 4 ? 'moderate' : 'minor'}`}>
                <strong>{formatMagnitude(event.magnitude)}</strong>
                <small>{event.magnitudeType?.toUpperCase() ?? 'MAG'}</small>
              </span>
              <span className="event-row__main">
                <span className="event-row__place">{event.place}</span>
                <span className="event-row__meta">
                  <time dateTime={new Date(event.time).toISOString()}>{formatRelativeTime(event.time)}</time>
                  <span aria-label={`${depthClass(event.depth)} depth`}>{formatDepth(event.depth)} deep</span>
                  <span>Sig {event.significance}</span>
                </span>
                <span className="event-row__status">
                  {event.alert && <span className={`status-tag status-tag--${event.alert}`}><AlertTriangle size={12} aria-hidden="true" /> {event.alert} alert</span>}
                  {event.tsunami && <span className="status-tag status-tag--tsunami"><Waves size={12} aria-hidden="true" /> Tsunami flag</span>}
                  {event.status !== 'reviewed' && <span className="status-tag"><Radio size={12} aria-hidden="true" /> Automatic</span>}
                </span>
              </span>
              <span className="event-row__assessment">
                <span>{magnitudeLabel(event.magnitude)}</span>
                <small>{significanceLabel(event.significance)}</small>
              </span>
              <ChevronRight className="event-row__chevron" size={18} aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </section>
  )
}
