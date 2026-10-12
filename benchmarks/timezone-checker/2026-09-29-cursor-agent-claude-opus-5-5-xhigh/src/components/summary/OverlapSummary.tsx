import { ArrowRight, TriangleAlert } from 'lucide-react';
import { formatHour, formatHourCount, formatRange, type TimeFormat } from '../../lib/format';
import type { GridRow, OverlapModel } from '../../lib/overlap';
import { buildSummaryText } from '../../lib/summary-text';
import { useAppStore } from '../../store/app-store';
import { CopyButton } from '../ui/CopyButton';
import { RefBadge } from '../ui/RefBadge';
import { RangeBadge } from './RangeBadge';

interface SummaryProps {
  model: OverlapModel;
  format: TimeFormat;
}

export function OverlapSummary({ model, format }: SummaryProps) {
  if (!model.reference || !model.isComparing) return null;
  return (
    <section aria-labelledby="overlap-summary-title" className="card overflow-hidden">
      {model.mode === 'meeting' ? (
        <MeetingSummary model={model} reference={model.reference} format={format} />
      ) : (
        <BaseSummary model={model} reference={model.reference} format={format} />
      )}
    </section>
  );
}

interface ModeSummaryProps extends SummaryProps {
  reference: GridRow;
}

function MeetingSummary({ model, reference, format }: ModeSummaryProps) {
  const hours = model.sharedHours.length;
  const ranges = model.sharedRanges;

  if (hours === 0) return <NoMeetingOverlap model={model} reference={reference} format={format} />;

  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <HoursTile hours={hours} />
          <div className="min-w-0">
            <h2 id="overlap-summary-title" className="text-lg font-semibold tracking-tight text-ink">
              {formatHourCount(hours)} when everyone is awake
            </h2>
            <p className="text-sm text-ink-3">
              {ranges.length === 1 ? 'One window' : `${ranges.length} separate windows`} · shown in{' '}
              {reference.city.name} time
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ranges.map((range) => (
            <RangeBadge key={range.start} range={range} format={format} />
          ))}
          <CopyButton text={buildSummaryText(model, format)} />
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="mb-2.5 text-[0.6875rem] font-semibold tracking-wider text-ink-3 uppercase">
          Same windows, in each city’s local time
        </h3>
        <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(16rem,1fr))]">
          {model.rows.map((row) => (
            <div key={row.city.id} className="min-w-0 rounded-xl border border-line bg-sunken px-3.5 py-2.5">
              <dt className="flex items-center gap-1.5 text-xs text-ink-3">
                {row.isReference && <RefBadge />}
                <span className="truncate">{row.city.name}</span>
              </dt>
              <dd className="mt-1 font-mono text-sm font-medium text-ink">
                {ranges.map((range) => formatRange(range, format, row.diffMinutes)).join(' · ')}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function NoMeetingOverlap({ model, reference, format }: ModeSummaryProps) {
  const setMode = useAppStore((state) => state.setMode);
  const { wakeHour, sleepHour } = model.window;

  return (
    <div className="flex flex-col gap-4 bg-warn-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-warn-line bg-surface text-warn-text">
          <TriangleAlert className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id="overlap-summary-title" className="font-semibold text-warn-text">
            No hour when everyone is awake
          </h2>
          <p className="mt-0.5 text-sm text-pretty text-warn-text/80">
            With a {formatHour(wakeHour, format)}–{formatHour(sleepHour, format)} awake window, at least one of these{' '}
            {model.rows.length} cities is always asleep. Widen the window, remove a city, or compare each city with{' '}
            {reference.city.name} individually.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setMode('base')}
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-warn-line bg-surface px-3.5 py-2 text-sm font-medium text-warn-text transition-colors hover:bg-warn-soft"
      >
        Compare with {reference.city.name}
        <ArrowRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function BaseSummary({ model, reference, format }: ModeSummaryProps) {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="overlap-summary-title" className="text-lg font-semibold tracking-tight text-ink">
            Overlap with {reference.city.name}
          </h2>
          <p className="text-sm text-ink-3">Each city is compared only with the reference · {reference.city.name} time</p>
        </div>
        <CopyButton text={buildSummaryText(model, format)} />
      </div>

      <ul className="mt-4 divide-y divide-line border-t border-line">
        {model.rows.slice(1).map((row) => (
          <BaseSummaryRow key={row.city.id} row={row} reference={reference} format={format} />
        ))}
      </ul>
    </div>
  );
}

function BaseSummaryRow({ row, reference, format }: { row: GridRow; reference: GridRow; format: TimeFormat }) {
  const hours = row.overlapHours.length;
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-3 sm:w-56 sm:shrink-0">
        <span
          className={
            hours > 0
              ? 'grid h-7 min-w-11 place-items-center rounded-lg bg-overlap px-2 font-mono text-sm font-bold text-overlap-ink'
              : 'grid h-7 min-w-11 place-items-center rounded-lg border border-warn-line bg-warn-soft px-2 font-mono text-sm font-bold text-warn-text'
          }
        >
          {hours}h
        </span>
        <span className="truncate font-medium text-ink">{row.city.name}</span>
      </div>
      {hours > 0 ? (
        <div className="flex flex-wrap gap-2">
          {row.ranges.map((range) => (
            <RangeBadge
              key={range.start}
              range={range}
              format={format}
              localLabel={formatRange(range, format, row.diffMinutes)}
            />
          ))}
        </div>
      ) : (
        <p className="flex items-start gap-2 text-sm text-warn-text">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          No overlap — {row.city.name} is asleep whenever {reference.city.name} is awake.
        </p>
      )}
    </li>
  );
}

function HoursTile({ hours }: { hours: number }) {
  return (
    <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-overlap text-overlap-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.08)]">
      <span className="font-mono text-2xl leading-none font-bold tracking-tight">
        {hours}
        <span className="text-sm font-semibold">h</span>
      </span>
    </span>
  );
}
