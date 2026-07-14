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

/**
 * Mobile layout: cities as columns, hours as rows.
 * Fully separate from the desktop layout, no fragile responsive tricks.
 */
export function GridMobile({ rows, format12h, onPromote, onRemove }: Props) {
  if (rows.length === 0) return null;
  const cityCount = rows.length;
  // Explicit grid template so the header + each hour row share the exact
  // same column widths. Label column is fixed; city columns flex evenly.
  const gridStyle = {
    gridTemplateColumns: `56px repeat(${cityCount}, minmax(64px, 1fr))`,
  };

  return (
    <div className="scroll-thin overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--panel)]/60 backdrop-blur">
      <div style={{ minWidth: 56 + cityCount * 72 }}>
        {/* Column header = one cell per city */}
        <div
          className="sticky top-0 z-10 grid gap-px border-b border-[var(--border-soft)] bg-[var(--panel)]/95 px-2 pt-2 pb-2 backdrop-blur"
          style={gridStyle}
        >
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            {rows[0].city.name.slice(0, 3)}
            <br />
            hour
          </div>
          {rows.map((row) => (
            <div key={row.city.id} className="flex flex-col gap-0.5 px-0.5">
              <div className="flex items-center gap-1">
                {row.isRef ? (
                  <span
                    aria-label="Reference"
                    className="inline-flex items-center rounded bg-amber-500/15 px-1 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/30"
                  >
                    REF
                  </span>
                ) : (
                  <button
                    onClick={() => onPromote(row.city.id)}
                    title="Set as reference"
                    aria-label={`Set ${row.city.name} as reference`}
                    className="inline-flex h-4 w-4 items-center justify-center rounded text-zinc-600 hover:text-amber-300"
                  >
                    <StarIcon width={10} height={10} />
                  </button>
                )}
                <button
                  onClick={() => onRemove(row.city.id)}
                  disabled={rows.length <= 1}
                  title={`Remove ${row.city.name}`}
                  aria-label={`Remove ${row.city.name}`}
                  className="ml-auto inline-flex h-4 w-4 items-center justify-center rounded text-zinc-600 hover:bg-rose-950/60 hover:text-rose-300 disabled:opacity-20"
                >
                  <XIcon width={10} height={10} />
                </button>
              </div>
              <button
                onClick={() => onPromote(row.city.id)}
                disabled={row.isRef}
                className={
                  "truncate text-left text-[11px] font-semibold " +
                  (row.isRef
                    ? "text-zinc-100"
                    : "text-zinc-200 hover:text-emerald-300")
                }
              >
                {row.city.name}
              </button>
              <span className="font-mono text-[9px] text-zinc-500">
                {formatOffset(row.city.timezone)}
              </span>
            </div>
          ))}
        </div>

        {/* 24 hour rows */}
        <div className="px-2 pb-2">
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="grid items-center gap-px py-0.5"
              style={gridStyle}
            >
              <div
                className={
                  "text-right pr-2 font-mono text-[10px] tabular-nums " +
                  (h % 6 === 0 ? "text-zinc-300" : "text-zinc-500")
                }
              >
                {formatHourLabel(h, format12h)}
              </div>
              {rows.map((row) => {
                const cell = row.cells[h];
                return (
                  <HourCellMobile
                    key={row.city.id}
                    cell={cell}
                    format12h={format12h}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HourCellMobile({
  cell,
  format12h,
}: {
  cell: { localMinutes: number; awake: boolean; overlap: boolean };
  format12h: boolean;
}) {
  const label = formatCellTime(cell.localMinutes, format12h);
  if (cell.overlap) {
    return (
      <div className="flex h-8 items-center justify-center rounded-[5px] bg-emerald-500/85 font-mono text-[11px] font-semibold tabular-nums text-emerald-950">
        {label}
      </div>
    );
  }
  if (cell.awake) {
    return (
      <div className="flex h-8 items-center justify-center rounded-[5px] bg-zinc-800/70 font-mono text-[11px] tabular-nums text-zinc-200 ring-1 ring-inset ring-zinc-700/40">
        {label}
      </div>
    );
  }
  return (
    <div className="flex h-8 items-center justify-center rounded-[5px] bg-zinc-950/60 font-mono text-[11px] tabular-nums text-zinc-600">
      {label}
    </div>
  );
}
