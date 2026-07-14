import type { City, Mode, SummaryLine, TimeFormat } from '../lib/types'
import { formatWindow } from '../lib/timezone'

interface OverlapSummaryProps {
  mode: Mode
  referenceCity: City
  timeFormat: TimeFormat
  meetingSummary: SummaryLine
  baseSummaries: SummaryLine[]
}

function renderCount(count: number) {
  return count === 1 ? '1 hour' : `${count} hours`
}

export function OverlapSummary({
  mode,
  referenceCity,
  timeFormat,
  meetingSummary,
  baseSummaries,
}: OverlapSummaryProps) {
  return (
    <section className="summary panel">
      <div className="panel__heading">
        <p className="panel__eyebrow">Overlap summary</p>
        <h2>Anchored to {referenceCity.name}</h2>
      </div>

      {mode === 'meeting' ? (
        <div className="summary__line">
          <div>
            <strong>{renderCount(meetingSummary.count)}</strong>
            <p>Shared overlap across every selected city.</p>
          </div>

          {meetingSummary.windows.length > 0 ? (
            <div className="summary__badges">
              {meetingSummary.windows.map((window) => (
                <span key={`${window.start}-${window.end}`} className="summary__badge">
                  {formatWindow(window, timeFormat)}
                </span>
              ))}
            </div>
          ) : (
            <p className="summary__warning">No common awake hours in the current setup.</p>
          )}
        </div>
      ) : (
        <div className="summary__stack">
          {baseSummaries.map((summary) => (
            <div key={summary.city?.id} className="summary__line">
              <div>
                <strong>
                  {summary.city?.name}: {renderCount(summary.count)}
                </strong>
                <p>Overlap between {referenceCity.name} and {summary.city?.name}.</p>
              </div>

              {summary.windows.length > 0 ? (
                <div className="summary__badges">
                  {summary.windows.map((window) => (
                    <span
                      key={`${summary.city?.id}-${window.start}-${window.end}`}
                      className="summary__badge"
                    >
                      {formatWindow(window, timeFormat)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="summary__warning">No overlap for this pairing.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
