import type { Board, HourCell } from '../lib/overlap'
import { formatHour, formatMinutesOfDay, formatUtcOffset, shortCode, type TimeFormat } from '../lib/time'
import { CELL_STATE_CLASS, cx } from './cell-style'
import { RefBadge } from './RefBadge'

export function MobileGrid({
  board,
  timeFormat,
  currentRefHour,
  onPromote,
  onRemove,
}: {
  board: Board
  timeFormat: TimeFormat
  currentRefHour: number
  onPromote: (cityId: string) => void
  onRemove: (cityId: string) => void
}) {
  const template = `3.25rem repeat(${board.rows.length}, minmax(0, 1fr))`
  const canRemove = board.rows.length > 1

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-1.5">
        {board.rows.map((row) => (
          <li
            key={row.city.id}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface py-1 pr-1 pl-2.5"
          >
            <button
              onClick={() => onPromote(row.city.id)}
              disabled={row.isReference}
              className={cx(
                'flex items-center gap-1.5 text-sm font-medium',
                row.isReference ? 'text-ink' : 'text-ink-muted',
              )}
            >
              {row.city.name}
              {row.isReference && <RefBadge compact />}
            </button>
            <span className="tnum font-mono text-[10px] text-ink-faint">
              {formatUtcOffset(row.offsetMinutes)}
            </span>
            {canRemove && (
              <button
                onClick={() => onRemove(row.city.id)}
                aria-label={`Remove ${row.city.name}`}
                className="rounded-md p-1 text-ink-faint transition-colors hover:bg-warn/10 hover:text-warn"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden>
                  <path
                    d="M2 2l8 8M10 2l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="rounded-xl border border-line bg-surface/60 p-2">
        <div
          className="sticky top-0 z-10 grid gap-x-1 rounded-lg bg-surface/95 py-2 backdrop-blur"
          style={{ gridTemplateColumns: template }}
        >
          <div className="text-center text-[9px] font-semibold tracking-[0.1em] text-ink-faint uppercase">
            Ref
          </div>
          {board.rows.map((row) => (
            <button
              key={row.city.id}
              onClick={() => onPromote(row.city.id)}
              disabled={row.isReference}
              title={row.city.name}
              className={cx(
                'truncate text-center text-[11px] font-semibold tracking-wide',
                row.isReference ? 'text-ref' : 'text-ink-muted',
              )}
            >
              {shortCode(row.city)}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-0.5">
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              className="grid items-center gap-x-1"
              style={{ gridTemplateColumns: template }}
            >
              <div
                className={cx(
                  'tnum text-center text-[11px]',
                  hour === currentRefHour ? 'font-semibold text-ref' : 'text-ink-faint',
                )}
              >
                {formatHour(hour, timeFormat)}
              </div>
              {board.rows.map((row) => (
                <Cell
                  key={row.city.id}
                  cell={row.cells[hour]}
                  timeFormat={timeFormat}
                  startsNewDay={hour > 0 && row.cells[hour].dayShift !== row.cells[hour - 1].dayShift}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Cell({
  cell,
  timeFormat,
  startsNewDay,
}: {
  cell: HourCell
  timeFormat: TimeFormat
  startsNewDay: boolean
}) {
  const label = formatMinutesOfDay(cell.localMinutes, timeFormat)
  return (
    <div
      className={cx(
        'tnum relative flex h-8 items-baseline justify-center gap-0.5 rounded-md border',
        CELL_STATE_CLASS[cell.state],
      )}
    >
      {startsNewDay && (
        <span className="absolute inset-x-1 -top-px h-0.5 rounded-full bg-ref/70" />
      )}
      <span className="text-[13px] leading-none">{label.value}</span>
      {label.meridiem && <span className="text-[8px] leading-none opacity-70">{label.meridiem}</span>}
    </div>
  )
}
