import { contiguousRanges, formatRange, type Mode, type TimeFormat } from '../lib/time'
import type { City } from '../data/cities'

interface Props {
  mode: Mode
  cities: City[]
  meetingOverlap: number[]
  baseOverlaps: Map<string, number[]>
  timeFormat: TimeFormat
  referenceName: string
}

export default function OverlapSummary({ mode, cities, meetingOverlap, baseOverlaps, timeFormat, referenceName }: Props) {
  if (cities.length < 2) return null

  if (mode === 'meeting') {
    const ranges = contiguousRanges(meetingOverlap)
    return (
      <section className="summary" data-testid="overlap-summary" aria-label="Overlap summary">
        <div className="summary-main">
          <span className="summary-label">Meeting overlap</span>
          <strong className="summary-count">{meetingOverlap.length} {meetingOverlap.length === 1 ? 'hour' : 'hours'}</strong>
          <span className="summary-ref">in {referenceName} time</span>
        </div>
        {meetingOverlap.length === 0 ? (
          <p className="summary-warning" role="alert">⚠ No overlap — no hour when everyone is awake. Try widening the awake window or removing a city.</p>
        ) : (
          <div className="range-badges">
            {ranges.map((r) => (
              <span key={r.start} className="range-badge">{formatRange(r, timeFormat)}</span>
            ))}
          </div>
        )}
      </section>
    )
  }

  const others = cities.slice(1)
  return (
    <section className="summary" data-testid="overlap-summary" aria-label="Overlap summary">
      <div className="summary-main">
        <span className="summary-label">Base overlap</span>
        <span className="summary-ref">each city vs {referenceName}</span>
      </div>
      <ul className="base-lines">
        {others.map((city) => {
          const hours = baseOverlaps.get(city.id) ?? []
          const ranges = contiguousRanges(hours)
          return (
            <li key={city.id} className="base-line">
              <span className="base-line-city">{referenceName} ↔ {city.name}:</span>
              <strong>{hours.length} {hours.length === 1 ? 'hour' : 'hours'}</strong>
              {hours.length === 0 ? (
                <span className="summary-warning inline" role="alert">⚠ No overlap with {city.name}</span>
              ) : (
                <span className="range-badges inline-badges">
                  {ranges.map((r) => (
                    <span key={r.start} className="range-badge">{formatRange(r, timeFormat)}</span>
                  ))}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
