import { useEffect, useMemo, useState } from 'react'
import type { EarthquakeFeature, TimeRange } from './types'
import { RANGE_LABELS, RANGE_MS, formatDateTime } from './data'

interface TimelineProps {
  events: EarthquakeFeature[]
  range: TimeRange
  selectedEvent: EarthquakeFeature | null
  onHighlight: (ids: Set<string> | null) => void
}

const BIN_COUNT = 48

export function Timeline({ events, range, selectedEvent, onHighlight }: TimelineProps) {
  const [activeBin, setActiveBin] = useState<number | null>(null)
  const now = useMemo(() => Date.now(), [events, range])
  const start = now - RANGE_MS[range]
  const binWidth = RANGE_MS[range] / BIN_COUNT

  const bins = useMemo(() => {
    const result = Array.from({ length: BIN_COUNT }, (_, index) => ({ index, count: 0, maxMagnitude: -1, ids: [] as string[] }))
    events.forEach((event) => {
      const index = Math.min(BIN_COUNT - 1, Math.max(0, Math.floor((event.properties.time - start) / binWidth)))
      const bin = result[index]
      bin.count += 1
      bin.maxMagnitude = Math.max(bin.maxMagnitude, event.properties.mag ?? -1)
      bin.ids.push(event.id)
    })
    return result
  }, [events, start, binWidth])

  const maxCount = Math.max(1, ...bins.map((bin) => bin.count))
  const selectedBin = selectedEvent
    ? Math.min(BIN_COUNT - 1, Math.max(0, Math.floor((selectedEvent.properties.time - start) / binWidth)))
    : null
  const shownBin = activeBin ?? selectedBin

  useEffect(() => setActiveBin(null), [range])

  useEffect(() => {
    if (activeBin == null) onHighlight(null)
    else onHighlight(new Set(bins[activeBin]?.ids ?? []))
  }, [activeBin, bins, onHighlight])

  const describeBin = (index: number) => {
    const from = start + index * binWidth
    const to = from + binWidth
    const bin = bins[index]
    return `${bin.count} earthquake${bin.count === 1 ? '' : 's'} between ${formatDateTime(from)} and ${formatDateTime(to)}${bin.maxMagnitude >= 0 ? `; strongest magnitude ${bin.maxMagnitude.toFixed(1)}` : ''}`
  }

  return (
    <section className="timeline" aria-labelledby="timeline-title">
      <div className="timeline-heading">
        <div>
          <p className="eyebrow">Connected seismic timeline</p>
          <h2 id="timeline-title">Activity through {RANGE_LABELS[range].toLowerCase()}</h2>
        </div>
        <div className="timeline-readout" aria-live="polite">
          {activeBin == null ? (
            <span>Slide the time lens to isolate a moment</span>
          ) : (
            <>
              <strong>{bins[activeBin].count}</strong>
              <span>events in focus</span>
              <button type="button" onClick={() => setActiveBin(null)}>Show all</button>
            </>
          )}
        </div>
      </div>
      <div className="seismic-ribbon" aria-hidden="true">
        {bins.map((bin) => {
          const height = 6 + (bin.count / maxCount) * 42
          return (
            <span
              key={bin.index}
              className={`${shownBin === bin.index ? 'is-active' : ''} ${bin.maxMagnitude >= 5 ? 'has-notable' : ''}`}
              style={{ height: `${height}px` }}
            />
          )
        })}
        {shownBin != null && <i className="timeline-needle" style={{ left: `${((shownBin + 0.5) / BIN_COUNT) * 100}%` }} />}
      </div>
      <label className="timeline-slider-label" htmlFor="time-lens">
        <span>Earlier</span>
        <span className="sr-only">Time lens. {activeBin == null ? 'All events are visible.' : describeBin(activeBin)}</span>
        <input
          id="time-lens"
          type="range"
          min="0"
          max={BIN_COUNT - 1}
          value={activeBin ?? selectedBin ?? BIN_COUNT - 1}
          onChange={(event) => setActiveBin(Number(event.target.value))}
          aria-valuetext={describeBin(activeBin ?? selectedBin ?? BIN_COUNT - 1)}
        />
        <span>Now</span>
      </label>
      <div className="timeline-axis" aria-hidden="true">
        <span>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: range === 'hour' || range === 'day' ? 'numeric' : undefined }).format(start)}</span>
        <span>{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric' }).format(now)}</span>
      </div>
      <details className="timeline-table">
        <summary>Read activity as text</summary>
        <ol>
          {bins.filter((bin) => bin.count > 0).map((bin) => <li key={bin.index}>{describeBin(bin.index)}</li>)}
        </ol>
      </details>
    </section>
  )
}
