import type { Settings } from '../lib/types';
import type { CityRowData } from '../lib/overlap';
import { formatOffset, getCurrentTimeInZone } from '../lib/timezones';
import { formatCellTime } from '../lib/format';
import { HourCell } from './HourCell';

interface CityGridDesktopProps {
  rows: CityRowData[];
  settings: Settings;
  onPromote: (cityId: string) => void;
  onRemove: (cityId: string) => void;
}

const GRID_STYLE: React.CSSProperties = {
  gridTemplateColumns: '14rem repeat(24, minmax(2.25rem, 1fr)) 2.75rem',
  columnGap: '0.125rem',
};

export function CityGridDesktop({
  rows,
  settings,
  onPromote,
  onRemove,
}: CityGridDesktopProps) {
  if (rows.length === 0) return null;

  return (
    <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-ink-800 bg-ink-900/40">
      <div className="min-w-[71rem]">
        <HourHeader format={settings.format} />
        <div className="flex flex-col">
          {rows.map((row) => (
            <DesktopRow
              key={row.city.id}
              row={row}
              settings={settings}
              canRemove={rows.length > 1}
              onPromote={onPromote}
              onRemove={onRemove}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function HourHeader({ format }: { format: '12h' | '24h' }) {
  return (
    <div
      className="grid border-b border-ink-800 px-2 pb-1.5 pt-2"
      style={GRID_STYLE}
    >
      <div className="px-1 text-[11px] font-medium uppercase tracking-wide text-slate-600">
        Hour →
      </div>
      {Array.from({ length: 24 }, (_, h) => (
        <div
          key={h}
          className="flex items-center justify-center text-[11px] tabular-nums text-slate-500"
        >
          {formatCellTime(h * 60, format)}
        </div>
      ))}
      <div />
    </div>
  );
}

function DesktopRow({
  row,
  settings,
  canRemove,
  onPromote,
  onRemove,
}: {
  row: CityRowData;
  settings: Settings;
  canRemove: boolean;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { city, isRef, offsetMinutes, cells } = row;
  const overlapCount = row.overlapHours.length;

  return (
    <div
      className={[
        'group grid items-center px-2 py-1.5 border-b border-ink-800/70 last:border-b-0',
        isRef ? 'bg-accent-500/[0.04]' : 'hover:bg-ink-800/30',
      ].join(' ')}
      style={GRID_STYLE}
    >
      <div className="flex flex-col gap-0.5 px-1 py-1">
        <div className="flex items-center gap-1.5">
          {isRef && (
            <span className="rounded bg-accent-500/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-accent-200 ring-1 ring-inset ring-accent-400/30">
              REF
            </span>
          )}
          <button
            type="button"
            onClick={() => onPromote(city.id)}
            title={isRef ? 'Reference city' : `Make ${city.name} the reference`}
            className="truncate text-left text-sm font-semibold text-slate-100 transition-colors hover:text-accent-200"
          >
            {city.name}
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="tabular-nums">{formatOffset(offsetMinutes)}</span>
          <span className="text-slate-700">•</span>
          <span className="tabular-nums">
            now {getCurrentTimeInZone(city.tz, settings.format)}
          </span>
        </div>
      </div>

      {cells.map((cell) => (
        <HourCell
          key={cell.refHour}
          localMinutes={cell.localMinutes}
          dayShift={cell.dayShift}
          awake={cell.awake}
          overlap={cell.overlap}
          format={settings.format}
        />
      ))}

      <div className="flex items-center justify-center px-1">
        {canRemove ? (
          <button
            type="button"
            onClick={() => onRemove(city.id)}
            aria-label={`Remove ${city.name}`}
            title={`Remove ${city.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-rose-500/15 hover:text-rose-300 group-hover:text-slate-400"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-4 w-4"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : (
          overlapCount > 0 && (
            <span className="text-[10px] font-semibold tabular-nums text-accent-300/70">
              {overlapCount}h
            </span>
          )
        )}
      </div>
    </div>
  );
}
