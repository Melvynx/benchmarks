import { useMemo, useState } from 'react'
import { formatMagnitude, formatRelativeTime } from '../lib/earthquakes'
import type { Earthquake } from '../types/earthquake'

interface SeismicTimelineProps {
  events: Earthquake[]
  selectedId: string | null
  hoveredId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

const WIDTH = 1000
const HEIGHT = 152
const PAD_X = 16
const PAD_Y = 18

export function SeismicTimeline({ events, selectedId, hoveredId, onSelect, onHover }: SeismicTimelineProps) {
  const [cursor, setCursor] = useState(1000)
  const ordered = useMemo(() => [...events].sort((a, b) => a.time - b.time), [events])
  const minTime = ordered[0]?.time ?? Date.now() - 1
  const maxTime = ordered.at(-1)?.time ?? Date.now()
  const duration = Math.max(1, maxTime - minTime)
  const points = useMemo(() => ordered.map((event) => ({
    event,
    x: PAD_X + ((event.time - minTime) / duration) * (WIDTH - PAD_X * 2),
    y: HEIGHT - PAD_Y - Math.min(1, Math.max(0, (event.magnitude ?? 0) / 8)) * (HEIGHT - PAD_Y * 2),
    r: Math.max(2.5, Math.min(8, 2 + (event.magnitude ?? 0) * 0.65)),
  })), [ordered, minTime, duration])
  const nearest = ordered.length ? ordered.reduce((best, event) => {
    const target = minTime + (cursor / 1000) * duration
    return Math.abs(event.time - target) < Math.abs(best.time - target) ? event : best
  }, ordered[0]) : null
  const strongest = ordered.reduce<Earthquake | null>((best, event) => !best || (event.magnitude ?? -1) > (best.magnitude ?? -1) ? event : best, null)

  return (
    <section className="timeline" aria-labelledby="timeline-title">
      <header className="timeline__header">
        <div>
          <p className="eyebrow">Connected seismic timeline</p>
          <h2 id="timeline-title">Activity through time</h2>
        </div>
        <p className="timeline__instruction">Scrub to trace an event across the map and stream.</p>
      </header>
      {events.length > 0 ? (
        <>
          <div className="timeline__plot">
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby="timeline-chart-title timeline-chart-desc" preserveAspectRatio="none">
              <title id="timeline-chart-title">Earthquake activity by time and magnitude</title>
              <desc id="timeline-chart-desc">Each point is one earthquake. Position from left to right shows time; height and size show magnitude. {strongest ? `The strongest shown is magnitude ${formatMagnitude(strongest.magnitude)} near ${strongest.place}.` : ''}</desc>
              <line x1={PAD_X} y1={HEIGHT - PAD_Y} x2={WIDTH - PAD_X} y2={HEIGHT - PAD_Y} className="timeline__baseline" />
              {[2, 4, 6].map((magnitude) => {
                const y = HEIGHT - PAD_Y - (magnitude / 8) * (HEIGHT - PAD_Y * 2)
                return <line key={magnitude} x1={PAD_X} y1={y} x2={WIDTH - PAD_X} y2={y} className="timeline__guide" />
              })}
              <path className="timeline__trace" d={points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')} />
              {points.map(({ event, x, y, r }) => (
                <circle
                  key={event.id}
                  cx={x}
                  cy={y}
                  r={event.id === selectedId ? r + 3 : event.id === hoveredId ? r + 2 : r}
                  className={`timeline__point magnitude-${event.magnitude !== null && event.magnitude >= 6 ? 'major' : event.magnitude !== null && event.magnitude >= 5 ? 'strong' : event.magnitude !== null && event.magnitude >= 4 ? 'moderate' : 'minor'}${event.id === selectedId ? ' is-selected' : ''}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`Magnitude ${formatMagnitude(event.magnitude)}, ${event.place}, ${formatRelativeTime(event.time)}`}
                  onMouseEnter={() => onHover(event.id)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(event.id)}
                  onBlur={() => onHover(null)}
                  onClick={() => onSelect(event.id)}
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                      keyEvent.preventDefault()
                      onSelect(event.id)
                    }
                  }}
                />
              ))}
              <line x1={PAD_X + (cursor / 1000) * (WIDTH - PAD_X * 2)} y1="5" x2={PAD_X + (cursor / 1000) * (WIDTH - PAD_X * 2)} y2={HEIGHT - 5} className="timeline__cursor" />
            </svg>
            <input
              className="timeline__scrubber"
              type="range"
              min="0"
              max="1000"
              value={cursor}
              aria-label="Scrub through earthquake activity in time"
              aria-valuetext={nearest ? `${formatRelativeTime(nearest.time)}: magnitude ${formatMagnitude(nearest.magnitude)} near ${nearest.place}` : 'No event'}
              onChange={(event) => {
                const next = Number(event.target.value)
                setCursor(next)
                if (!ordered.length) return
                const target = minTime + (next / 1000) * duration
                const closest = ordered.reduce((best, item) => Math.abs(item.time - target) < Math.abs(best.time - target) ? item : best, ordered[0])
                onHover(closest.id)
              }}
              onPointerUp={() => nearest && onSelect(nearest.id)}
              onKeyUp={() => nearest && onSelect(nearest.id)}
            />
          </div>
          <div className="timeline__labels" aria-hidden="true">
            <span>{formatRelativeTime(minTime)}</span>
            <span>Now</span>
          </div>
          <p className="sr-only" aria-live="polite">{nearest ? `Timeline cursor: ${nearest.place}, magnitude ${formatMagnitude(nearest.magnitude)}, ${formatRelativeTime(nearest.time)}.` : ''}</p>
        </>
      ) : <div className="timeline__empty">No events to plot for the current filters.</div>}
    </section>
  )
}
