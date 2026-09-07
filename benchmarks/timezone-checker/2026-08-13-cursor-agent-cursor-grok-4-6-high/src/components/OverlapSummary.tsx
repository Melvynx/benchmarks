import type { Board, Mode } from '../lib/overlap'
import { formatRange, hourLabel } from '../lib/format'
import type { TimeFormat } from '../lib/time'

type Props = {
  board: Board
  mode: Mode
  format: TimeFormat
  referenceName: string
}

export function OverlapSummary({ board, mode, format, referenceName }: Props) {
  if (board.rows.length < 2) return null

  if (mode === 'meeting') {
    if (board.meeting.hours === 0) {
      return (
        <section className="summary summary-warn" aria-live="polite">
          <p>No shared awake hours. Widen the window or drop a city.</p>
        </section>
      )
    }

    return (
      <section className="summary" aria-live="polite">
        <p>
          <strong>{hourLabel(board.meeting.hours)}</strong>
          <span className="summary-quiet"> when everyone is awake, {referenceName} time</span>
        </p>
        <div className="range-row">
          {board.meeting.ranges.map((range) => (
            <span key={`${range.start}-${range.end}`} className="range-badge">
              {formatRange(range, format)}
            </span>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="summary summary-stack" aria-live="polite">
      {board.perCity.map((entry) =>
        entry.hours === 0 ? (
          <p key={entry.city.id} className="summary-line summary-warn-line">
            No overlap with {entry.city.name}.
          </p>
        ) : (
          <div key={entry.city.id} className="summary-line">
            <p>
              <strong>{entry.city.name}</strong>
              <span className="summary-quiet"> · {hourLabel(entry.hours)} with {referenceName}</span>
            </p>
            <div className="range-row">
              {entry.ranges.map((range) => (
                <span key={`${entry.city.id}-${range.start}-${range.end}`} className="range-badge">
                  {formatRange(range, format)}
                </span>
              ))}
            </div>
          </div>
        ),
      )}
    </section>
  )
}
