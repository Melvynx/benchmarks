import type { OverlapSummary as Summary } from '../lib/overlap'
import { formatHourRange } from '../lib/timezone'
import type { TimeFormat } from '../store/useAppStore'

type Props = {
  summary: Summary | null
  timeFormat: TimeFormat
  referenceName: string
}

export function OverlapSummary({ summary, timeFormat, referenceName }: Props) {
  if (!summary) return null

  if (summary.mode === 'meeting') {
    if (summary.hours.length === 0) {
      return (
        <div className="summary summary--warn" role="status">
          <span className="summary__icon" aria-hidden>
            !
          </span>
          <p>No common awake hours across all cities.</p>
        </div>
      )
    }

    return (
      <div className="summary" role="status">
        <div className="summary__head">
          <span className="summary__count">{summary.hours.length}h</span>
          <p>
            shared overlap in <strong>{referenceName}</strong> time
          </p>
        </div>
        <div className="summary__ranges">
          {summary.ranges.map((r) => (
            <span key={`${r.start}-${r.end}`} className="range-badge">
              {formatHourRange(r.start, r.end, timeFormat)}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="summary summary--base" role="status">
      <p className="summary__title">
        Overlap vs <strong>{referenceName}</strong>
      </p>
      <ul className="summary__lines">
        {summary.lines.map((line) => (
          <li key={line.city.id} className="summary__line">
            <span className="summary__city">{line.city.name}</span>
            {line.hours.length === 0 ? (
              <span className="summary__warn-inline">No overlap</span>
            ) : (
              <>
                <span className="summary__count-sm">{line.hours.length}h</span>
                <div className="summary__ranges">
                  {line.ranges.map((r) => (
                    <span key={`${r.start}-${r.end}`} className="range-badge">
                      {formatHourRange(r.start, r.end, timeFormat)}
                    </span>
                  ))}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
