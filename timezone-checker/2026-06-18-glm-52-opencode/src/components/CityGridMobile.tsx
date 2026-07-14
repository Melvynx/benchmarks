import type { Settings } from '../lib/types';
import type { CityRowData } from '../lib/overlap';
import { formatOffset } from '../lib/timezones';
import { formatCellTime } from '../lib/format';
import { HourCell } from './HourCell';

interface CityGridMobileProps {
  rows: CityRowData[];
  settings: Settings;
  onPromote: (cityId: string) => void;
  onRemove: (cityId: string) => void;
}

export function CityGridMobile({
  rows,
  settings,
  onPromote,
  onRemove,
}: CityGridMobileProps) {
  if (rows.length === 0) return null;

  const colCount = rows.length;
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `2.75rem repeat(${colCount}, minmax(3.25rem, 1fr))`,
  };

  return (
    <div className="scrollbar-thin max-h-[72vh] overflow-auto rounded-2xl border border-ink-800 bg-ink-900/40">
      <div style={gridStyle} className="grid">
        {/* header row: sticky */}
        <div
          className="sticky top-0 z-20 col-span-full grid border-b border-ink-800 bg-ink-900/95 backdrop-blur"
          style={gridStyle}
        >
          <div className="px-1 py-2 text-[10px] font-medium uppercase tracking-wide text-slate-600">
            Hr
          </div>
          {rows.map((row) => (
            <MobileCityHeader
              key={row.city.id}
              row={row}
              canRemove={rows.length > 1}
              onPromote={onPromote}
              onRemove={onRemove}
            />
          ))}
        </div>

        {/* hour rows */}
        {Array.from({ length: 24 }, (_, h) => (
          <FragmentRow key={h} hour={h} rows={rows} format={settings.format} />
        ))}
      </div>
    </div>
  );
}

function MobileCityHeader({
  row,
  canRemove,
  onPromote,
  onRemove,
}: {
  row: CityRowData;
  canRemove: boolean;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { city, isRef, offsetMinutes } = row;
  return (
    <div
      className={[
        'flex flex-col gap-0.5 px-1 py-2',
        isRef ? 'bg-accent-500/[0.06]' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-1">
        {isRef && (
          <span className="rounded bg-accent-500/20 px-1 py-0.5 text-[8px] font-bold tracking-wide text-accent-200 ring-1 ring-inset ring-accent-400/30">
            REF
          </span>
        )}
        <button
          type="button"
          onClick={() => onPromote(city.id)}
          title={isRef ? 'Reference city' : `Make ${city.name} the reference`}
          className={[
            'min-w-0 flex-1 truncate text-left text-xs font-semibold transition-colors hover:text-accent-200',
            isRef ? 'text-accent-100' : 'text-slate-100',
          ].join(' ')}
        >
          {city.name}
        </button>
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(city.id)}
            aria-label={`Remove ${city.name}`}
            title={`Remove ${city.name}`}
            className="shrink-0 text-slate-600 hover:text-rose-300"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <span className="text-[9px] tabular-nums text-slate-500">
        {formatOffset(offsetMinutes)}
      </span>
    </div>
  );
}

function FragmentRow({
  hour,
  rows,
  format,
}: {
  hour: number;
  rows: CityRowData[];
  format: '12h' | '24h';
}) {
  return (
    <>
      <div className="flex items-center justify-center px-1 py-1 text-[11px] tabular-nums text-slate-500">
        {formatCellTime(hour * 60, format)}
      </div>
      {rows.map((row) => {
        const cell = row.cells[hour];
        return (
          <div key={row.city.id} className="px-0.5 py-1">
            <HourCell
              localMinutes={cell.localMinutes}
              dayShift={cell.dayShift}
              awake={cell.awake}
              overlap={cell.overlap}
              format={format}
            />
          </div>
        );
      })}
    </>
  );
}
