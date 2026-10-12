import { ArrowUpToLine, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { memo, type ReactNode, useRef, useState } from 'react';
import { useScrollOverflow } from '../../hooks/use-scroll-overflow';
import { cx } from '../../lib/cx';
import { formatClock, formatDiff, formatHour, formatOffset, type TimeFormat } from '../../lib/format';
import { HOURS_PER_DAY, MINUTES_PER_DAY } from '../../lib/math';
import { contiguousRuns, type GridRow, joinsAt, type OverlapModel } from '../../lib/overlap';
import { WEEKDAYS } from '../../lib/time';
import { removeCityWithUndo } from '../../store/actions';
import { useAppStore } from '../../store/app-store';
import { RefBadge } from '../ui/RefBadge';
import { HourCell } from './HourCell';

interface GridProps {
  model: OverlapModel;
  reference: GridRow;
  format: TimeFormat;
}

const ROW_TRANSITION = { type: 'spring', stiffness: 520, damping: 42 } as const;
const toPercent = (hours: number) => `${(hours / HOURS_PER_DAY) * 100}%`;

/** Cities as rows, the reference city's 24 hours as columns. */
export function DesktopGrid({ model, reference, format }: GridProps) {
  const [hoverHour, setHoverHour] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canScrollRight } = useScrollOverflow(scrollRef);
  const nowHours = (model.referenceNowMinutes / MINUTES_PER_DAY) * HOURS_PER_DAY;
  const bands = model.mode === 'meeting' ? contiguousRuns(model.sharedHours) : [];

  return (
    <div className="relative">
      <div ref={scrollRef} className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1">
        <div
          role="table"
          aria-label={`Hour-by-hour availability. Columns are hours in ${reference.city.name}.`}
          className="desktop-grid relative"
        >
          <div aria-hidden className="grid h-(--axis-h) grid-cols-(--grid-cols) items-center">
            <div className="sticky left-0 z-20 h-full truncate bg-surface px-2.5 pt-2.5 text-[0.6875rem] font-semibold tracking-wider text-ink-3 uppercase">
              {reference.city.name} time
            </div>
          </div>

          <div className="relative" onPointerLeave={() => setHoverHour(null)}>
            {bands.length > 0 && (
              <div aria-hidden className="pointer-events-none absolute inset-y-0 right-(--action-w) left-(--label-w)">
                {bands.map((band) => (
                  <div
                    key={band.start}
                    className="absolute -inset-y-1 rounded-xl bg-overlap-soft"
                    style={{ left: toPercent(band.start), width: toPercent(band.length) }}
                  />
                ))}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <AnimatePresence initial={false}>
                {model.rows.map((row) => (
                  <DesktopRow key={row.city.id} row={row} format={format} onHover={setHoverHour} />
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-(--action-w) left-(--label-w) z-10">
            {hoverHour !== null && (
              <>
                <div
                  className="absolute top-(--axis-h) bottom-0 rounded-[0.625rem] ring-2 ring-ink/25"
                  style={{ left: toPercent(hoverHour), width: toPercent(1) }}
                />
                <AxisPill position={hoverHour + 0.5} tone="ink">
                  {formatHour(hoverHour, format)}
                </AxisPill>
              </>
            )}
            <div
              className="now-line top-[calc(var(--axis-h)-0.375rem)] bottom-0 w-0.5 -translate-x-1/2"
              style={{ left: toPercent(nowHours) }}
            />
            {hoverHour === null && (
              <AxisPill position={nowHours} tone="now">
                Now · {formatClock(model.referenceNowMinutes, format)}
              </AxisPill>
            )}
          </div>
        </div>
      </div>

      {canScrollRight && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -right-1 z-30 w-14 bg-linear-to-l from-surface via-surface/70 to-transparent"
        />
      )}
    </div>
  );
}

function AxisPill({ position, tone, children }: { position: number; tone: 'now' | 'ink'; children: ReactNode }) {
  const align = position < 1.5 ? 'translate-x-0' : position > HOURS_PER_DAY - 1.5 ? '-translate-x-full' : '-translate-x-1/2';
  return (
    <span
      className={cx(
        'absolute top-1.5 rounded-full px-2 py-0.5 font-mono text-[0.6875rem] font-semibold whitespace-nowrap shadow-sm',
        align,
        tone === 'now' ? 'bg-now text-white' : 'bg-ink text-canvas',
      )}
      style={{ left: toPercent(position) }}
    >
      {children}
    </span>
  );
}

interface DesktopRowProps {
  row: GridRow;
  format: TimeFormat;
  onHover: (refHour: number) => void;
}

const DesktopRow = memo(function DesktopRow({ row, format, onHover }: DesktopRowProps) {
  return (
    <motion.div
      layout="position"
      role="row"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={ROW_TRANSITION}
      className="relative grid grid-cols-(--grid-cols) items-center"
    >
      <CityLabel row={row} format={format} />
      {row.cells.map((cell, index) => (
        <HourCell
          key={cell.refHour}
          cell={cell}
          cityName={row.city.name}
          format={format}
          orientation="row"
          onPointerEnter={onHover}
          {...joinsAt(row.cells, index)}
        />
      ))}
      <div role="cell" className="flex justify-end">
        <button
          type="button"
          aria-label={`Remove ${row.city.name}`}
          title={`Remove ${row.city.name}`}
          onClick={() => removeCityWithUndo(row.city.id)}
          className="grid size-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </motion.div>
  );
});

function CityLabel({ row, format }: { row: GridRow; format: TimeFormat }) {
  const setReference = useAppStore((state) => state.setReference);
  const { city, isReference } = row;

  return (
    <div role="rowheader" className="sticky left-0 z-20 flex h-full items-center bg-surface pr-2">
      <button
        type="button"
        onClick={() => setReference(city.id)}
        disabled={isReference}
        aria-label={isReference ? `${city.name}, reference city` : `Make ${city.name} the reference city`}
        title={isReference ? undefined : `Make ${city.name} the reference`}
        className="group flex w-full min-w-0 items-center gap-3 rounded-xl px-2.5 py-1.5 text-left transition-colors enabled:hover:bg-sunken"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {isReference && <RefBadge />}
            <span className="truncate text-[0.9375rem] font-semibold tracking-tight text-ink">{city.name}</span>
            {!isReference && (
              <ArrowUpToLine
                className="size-3.5 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                aria-hidden
              />
            )}
          </span>
          <span className="mt-0.5 flex gap-1.5 truncate font-mono text-xs text-ink-3">
            <span>{formatOffset(row.offsetMinutes)}</span>
            {!isReference && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{formatDiff(row.diffMinutes)}</span>
              </>
            )}
          </span>
        </span>
        <span className="hidden shrink-0 text-right font-mono text-xs leading-tight xl:block">
          <span className="block font-medium text-ink-2">{formatClock(row.nowMinutes, format)}</span>
          <span className="block text-ink-3">{WEEKDAYS[row.nowWeekday]}</span>
        </span>
      </button>
    </div>
  );
}
