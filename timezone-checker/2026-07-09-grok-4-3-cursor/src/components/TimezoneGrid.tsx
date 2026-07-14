import type { CSSProperties } from 'react'
import type { CityRow } from '../lib/overlap'
import { formatHour, getUtcOffsetLabel } from '../lib/timezone'
import type { TimeFormat } from '../store/useAppStore'

type Props = {
  rows: CityRow[]
  timeFormat: TimeFormat
  onSetReference: (id: string) => void
  onRemove: (id: string) => void
}

const HOURS = Array.from({ length: 24 }, (_, h) => h)

export function TimezoneGrid({ rows, timeFormat, onSetReference, onRemove }: Props) {
  if (rows.length === 0) {
    return (
      <div className="grid-empty">
        <p>Add at least one city to start comparing timezones.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid-desktop" aria-label="Timezone overlap grid">
        <div className="grid-desktop__header">
          <div className="grid-desktop__corner">City</div>
          <div className="grid-desktop__hours">
            {HOURS.map((h) => (
              <div key={h} className="hour-label">
                {formatHour(h, timeFormat)}
              </div>
            ))}
          </div>
          <div className="grid-desktop__action" />
        </div>

        {rows.map((row) => (
          <div
            key={row.city.id}
            className={`grid-desktop__row${row.isReference ? ' is-ref' : ''}`}
          >
            <div className="city-meta">
              <button
                type="button"
                className="city-meta__name"
                onClick={() => onSetReference(row.city.id)}
                title={row.isReference ? 'Reference city' : 'Make reference'}
              >
                {row.isReference && <span className="ref-badge">REF</span>}
                <span>{row.city.name}</span>
              </button>
              <span className="city-meta__sub">
                {row.city.country} · {getUtcOffsetLabel(row.city.timezone)}
              </span>
            </div>

            <div className="grid-desktop__cells">
              {row.cells.map((cell) => (
                <div
                  key={cell.refHour}
                  className={`cell cell--${cell.state}`}
                  title={`${row.city.name}: ${formatHour(cell.localHour, timeFormat)}`}
                >
                  {formatHour(cell.localHour, timeFormat)}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="remove-btn"
              aria-label={`Remove ${row.city.name}`}
              onClick={() => onRemove(row.city.id)}
              disabled={rows.length === 1}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="grid-mobile" aria-label="Timezone overlap grid">
        <div className="grid-mobile__scroll">
          <div
            className="grid-mobile__table"
            style={{ '--city-count': rows.length } as CSSProperties}
          >
            <div className="grid-mobile__corner" />
            {rows.map((row) => (
              <div
                key={row.city.id}
                className={`grid-mobile__city${row.isReference ? ' is-ref' : ''}`}
              >
                <button
                  type="button"
                  className="city-meta__name"
                  onClick={() => onSetReference(row.city.id)}
                >
                  {row.isReference && <span className="ref-badge">REF</span>}
                  <span>{row.city.name}</span>
                </button>
                <span className="city-meta__sub">
                  {getUtcOffsetLabel(row.city.timezone)}
                </span>
                <button
                  type="button"
                  className="remove-btn remove-btn--sm"
                  aria-label={`Remove ${row.city.name}`}
                  onClick={() => onRemove(row.city.id)}
                  disabled={rows.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}

            {HOURS.map((refHour) => (
              <div key={refHour} className="grid-mobile__hour-row">
                <div className="hour-label hour-label--side">
                  {formatHour(refHour, timeFormat)}
                </div>
                {rows.map((row) => {
                  const cell = row.cells[refHour]
                  return (
                    <div
                      key={row.city.id}
                      className={`cell cell--${cell.state}`}
                      title={`${row.city.name}: ${formatHour(cell.localHour, timeFormat)}`}
                    >
                      {formatHour(cell.localHour, timeFormat)}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
