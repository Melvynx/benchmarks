import type { CityRow } from "../lib/overlap";
import {
  formatCellTime,
  formatHourLabel,
  formatOffset,
} from "../lib/timezone";
import { StarIcon, XIcon } from "./Icons";

type Props = {
  rows: CityRow[];
  format12h: boolean;
  onPromote: (cityId: string) => void;
  onRemove: (cityId: string) => void;
};

export function GridDesktop({ rows, format12h, onPromote, onRemove }: Props) {
  if (rows.length === 0) return null;

  return (
    <div className="scroll-thin overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)]/60 backdrop-blur">
      <div className="min-w-[920px]">
        {/* Header row: hour labels anchored to the reference city */}
        <div className="sticky top-0 z-10 grid grid-cols-[minmax(220px,1.3fr)_repeat(24,minmax(30px,1fr))_44px] items-end gap-px border-b border-[var(--border-soft)] bg-[var(--panel)]/90 px-3 py-2 backdrop-blur">
          <div className="flex items-end gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              Hour in {rows[0].city.name}
            </span>
          </div>
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className={
                "text-center font-mono text-[10px] tabular-nums " +
                (h % 6 === 0 ? "text-zinc-300" : "text-zinc-500")
              }
            >
              {formatHourLabel(h, format12h)}
            </div>
          ))}
          <div />
        </div>

        <div className="divide-y divide-[var(--border-soft)]">
          {rows.map((row) => (
            <CityRowDesktop
              key={row.city.id}
              row={row}
              format12h={format12h}
              onPromote={onPromote}
              onRemove={onRemove}
              canRemove={rows.length > 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CityRowDesktop({
  row,
  format12h,
  onPromote,
  onRemove,
  canRemove,
}: {
  row: CityRow;
  format12h: boolean;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(220px,1.3fr)_repeat(24,minmax(30px,1fr))_44px] items-center gap-px px-3 py-2 transition-colors hover:bg-zinc-900/40">
      {/* Left: city label */}
      <div className="flex min-w-0 items-center gap-2 pr-2">
        {row.isRef ? (
          <span
            title="Reference city"
            aria-label="Reference city"
            className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/30"
          >
            <StarIcon width={10} height={10} />
            REF
          </span>
        ) : (
          <button
            onClick={() => onPromote(row.city.id)}
            title="Make this the reference city"
            className="inline-flex h-[20px] w-[26px] items-center justify-center rounded font-mono text-[10px] text-zinc-500 opacity-60 transition-all hover:bg-zinc-800 hover:text-amber-300 hover:opacity-100"
          >
            <StarIcon width={10} height={10} />
          </button>
        )}
        <button
          onClick={() => onPromote(row.city.id)}
          disabled={row.isRef}
          className={
            "truncate text-left text-sm font-medium transition-colors " +
            (row.isRef
              ? "cursor-default text-zinc-100"
              : "text-zinc-200 hover:text-emerald-300")
          }
          title={
            row.isRef ? row.city.name : `Make ${row.city.name} the reference`
          }
        >
          {row.city.name}
        </button>
        <span className="ml-auto shrink-0 rounded bg-[var(--panel-2)] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
          {formatOffset(row.city.timezone)}
        </span>
      </div>

      {/* 24 hour cells */}
      {row.cells.map((cell) => (
        <HourCell key={cell.refHour} cell={cell} format12h={format12h} />
      ))}

      {/* Remove button */}
      <div className="flex justify-end">
        <button
          onClick={() => onRemove(row.city.id)}
          disabled={!canRemove}
          aria-label={`Remove ${row.city.name}`}
          title={
            canRemove
              ? `Remove ${row.city.name}`
              : "At least one city is required"
          }
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 opacity-0 transition-all hover:bg-rose-950/50 hover:text-rose-300 focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-20 [div:hover>&]:opacity-100"
        >
          <XIcon width={14} height={14} />
        </button>
      </div>
    </div>
  );
}

function HourCell({
  cell,
  format12h,
}: {
  cell: { localMinutes: number; awake: boolean; overlap: boolean };
  format12h: boolean;
}) {
  const label = formatCellTime(cell.localMinutes, format12h);

  if (cell.overlap) {
    return (
      <div
        className="flex h-9 items-center justify-center rounded-[5px] bg-emerald-500/85 font-mono text-[11px] font-semibold tabular-nums text-emerald-950 shadow-[0_0_0_1px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.35)]"
        title="Overlap"
      >
        {label}
      </div>
    );
  }
  if (cell.awake) {
    return (
      <div
        className="flex h-9 items-center justify-center rounded-[5px] bg-zinc-800/70 font-mono text-[11px] tabular-nums text-zinc-200 ring-1 ring-inset ring-zinc-700/40"
        title="Awake"
      >
        {label}
      </div>
    );
  }
  return (
    <div
      className="flex h-9 items-center justify-center rounded-[5px] bg-zinc-950/60 font-mono text-[11px] tabular-nums text-zinc-600"
      title="Sleeping"
    >
      {label}
    </div>
  );
}
