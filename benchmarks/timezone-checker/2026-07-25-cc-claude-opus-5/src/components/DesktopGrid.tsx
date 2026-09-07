import type { Board, CityRow, HourCell } from '../lib/overlap'
import { formatMinutesOfDay, formatUtcOffset, type TimeFormat } from '../lib/time'
import { CELL_STATE_CLASS, cx } from './cell-style'
import { RefBadge } from './RefBadge'

/**
 * Ruler labels stay one or two glyphs wide so they never collide at the
 * narrowest desktop width — noon and midnight get an `a`/`p` marker instead of
 * the full meridiem.
 */
function tickLabel(hour: number, timeFormat: TimeFormat): string {
  if (timeFormat === '24h') return String(hour).padStart(2, '0')
  if (hour === 0) return '12a'
  if (hour === 12) return '12p'
  return String(hour % 12)
}

export function DesktopGrid({
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
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface/60 p-3">
      <div className="min-w-[41rem]">
        <div className="hour-grid items-end pb-2">
          <div className="pl-1 text-[10px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
            City
          </div>
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              className={cx(
                'hour-tick tnum text-center text-[11px] leading-tight',
                hour === currentRefHour ? 'font-semibold text-ref' : 'text-ink-faint',
              )}
            >
              {hour === currentRefHour && (
                <span className="mb-0.5 block text-[8px] tracking-[0.1em] uppercase">now</span>
              )}
              {tickLabel(hour, timeFormat)}
            </div>
          ))}
          <div />
        </div>

        {/* A tight row gap lets a shared overlap window read as one solid column. */}
        <div className="flex flex-col gap-0.5">
          {board.rows.map((row) => (
            <Row
              key={row.city.id}
              row={row}
              timeFormat={timeFormat}
              canRemove={board.rows.length > 1}
              onPromote={onPromote}
              onRemove={onRemove}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function Row({
  row,
  timeFormat,
  canRemove,
  onPromote,
  onRemove,
}: {
  row: CityRow
  timeFormat: TimeFormat
  canRemove: boolean
  onPromote: (cityId: string) => void
  onRemove: (cityId: string) => void
}) {
  return (
    <div className="hour-grid group items-center">
      <div className="min-w-0 pr-3">
        <button
          onClick={() => onPromote(row.city.id)}
          disabled={row.isReference}
          title={
            row.isReference
              ? `${row.city.name} — the reference city`
              : `Make ${row.city.name} the reference city`
          }
          className={cx(
            'flex max-w-full items-center gap-1.5 rounded-md px-1 text-left text-sm font-medium transition-colors',
            row.isReference
              ? 'cursor-default text-ink'
              : 'text-ink-muted hover:text-ink hover:underline hover:decoration-line-strong hover:underline-offset-4',
          )}
        >
          <span className="truncate">{row.city.name}</span>
          {row.isReference && <RefBadge />}
        </button>
        <div className="tnum px-1 font-mono text-[10px] text-ink-faint">
          {formatUtcOffset(row.offsetMinutes)}
        </div>
      </div>

      {row.cells.map((cell, index) => (
        <Cell
          key={cell.refHour}
          cell={cell}
          timeFormat={timeFormat}
          startsNewDay={index > 0 && cell.dayShift !== row.cells[index - 1].dayShift}
        />
      ))}

      <div className="flex justify-end pl-1">
        {canRemove && (
          <button
            onClick={() => onRemove(row.city.id)}
            aria-label={`Remove ${row.city.name}`}
            title={`Remove ${row.city.name}`}
            className="rounded-md p-1.5 text-ink-faint opacity-0 transition-all group-hover:opacity-100 hover:bg-warn/10 hover:text-warn focus-visible:opacity-100"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path
                d="M2 2l8 8M10 2l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
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
      title={cell.dayShift === 0 ? undefined : `${cell.dayShift > 0 ? 'next' : 'previous'} day`}
      className={cx(
        'tnum relative flex h-11 flex-col items-center justify-center rounded-[5px] border transition-colors duration-150',
        CELL_STATE_CLASS[cell.state],
      )}
    >
      {/* Hairline marking where this city's calendar day rolls over. */}
      {startsNewDay && <span className="absolute inset-y-0.5 -left-px w-0.5 rounded-full bg-ref/70" />}
      <span className="hour-cell-value text-[12px] leading-none">{label.value}</span>
      {label.meridiem && (
        <span className="mt-0.5 text-[8px] leading-none opacity-70">{label.meridiem}</span>
      )}
    </div>
  )
}
