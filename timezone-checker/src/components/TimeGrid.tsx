import type { City } from "../data/cities";
import {
  formatLocalClock,
  formatRefHourLabel,
  formatUtcOffset,
  type CellState,
  type HourColumn,
} from "../lib/timeEngine";

function Cell({
  cell,
  use12h,
}: {
  cell: CellState;
  use12h: boolean;
}) {
  const label = formatLocalClock(cell.localHour, cell.localMinute, use12h);
  const base =
    "flex min-h-[2.25rem] w-full min-w-[2.25rem] items-center justify-center rounded-md border text-center font-mono text-[11px] font-medium tabular-nums transition-colors md:min-h-[2.5rem] md:text-xs";
  if (!cell.awake) {
    return (
      <div
        className={`${base} border-white/5 bg-surface-1/40 text-slate-600 line-through decoration-slate-600/50`}
        title="Sleeping"
      >
        {label}
      </div>
    );
  }
  if (cell.overlap) {
    return (
      <div
        className={`${base} border-emerald-500/50 bg-emerald-500/25 font-bold text-emerald-100 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.35)]`}
        title="Overlap"
      >
        {label}
      </div>
    );
  }
  return (
    <div
      className={`${base} border-white/10 bg-surface-2/80 text-slate-300`}
      title="Awake"
    >
      {label}
    </div>
  );
}

interface GridProps {
  cities: City[];
  refCity: City;
  columns: HourColumn[];
  use12h: boolean;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

export function TimeGridDesktop({
  cities,
  refCity,
  columns,
  use12h,
  onPromote,
  onRemove,
  canRemove,
}: GridProps) {
  const sampleInstant = columns[0]?.instant ?? null;
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-white/10 bg-surface-1/50 p-3 md:block md:p-4">
      <table className="w-full min-w-[56rem] border-separate border-spacing-x-0.5 border-spacing-y-1">
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 w-[13rem] min-w-[11rem] bg-surface-1/98 px-2 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted backdrop-blur-sm"
            >
              City
            </th>
            {columns.map((col) => (
              <th
                key={col.refHour}
                scope="col"
                className="px-0.5 py-2 text-center font-mono text-[10px] font-medium tabular-nums text-slate-500"
              >
                {formatRefHourLabel(col.refHour, use12h)}
              </th>
            ))}
            <th scope="col" className="w-10" aria-label="Remove" />
          </tr>
        </thead>
        <tbody>
          {cities.map((city) => {
            const isRef = city.id === refCity.id;
            const off =
              sampleInstant != null
                ? formatUtcOffset(sampleInstant, city.timezone)
                : "";
            return (
              <tr key={city.id}>
                <th
                  scope="row"
                  className="sticky left-0 z-20 border-r border-white/5 bg-surface-1/98 px-2 py-1 text-left align-middle backdrop-blur-sm"
                >
                  <button
                    type="button"
                    onClick={() => onPromote(city.id)}
                    className="text-left text-sm font-semibold text-slate-100 hover:text-emerald-300 hover:underline"
                  >
                    {city.name}
                    {isRef && (
                      <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                        REF
                      </span>
                    )}
                  </button>
                  <div className="font-mono text-[10px] text-slate-500">
                    {off}
                  </div>
                </th>
                {columns.map((col) => (
                  <td key={col.refHour} className="p-0 align-middle">
                    <Cell
                      cell={col.cells.get(city.id)!}
                      use12h={use12h}
                    />
                  </td>
                ))}
                <td className="align-middle">
                  <div className="flex justify-center">
                    <button
                      type="button"
                      disabled={!canRemove}
                      onClick={() => onRemove(city.id)}
                      className="rounded-md p-1.5 text-slate-500 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Remove ${city.name}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TimeGridMobile({
  cities,
  refCity,
  columns,
  use12h,
  onPromote,
  onRemove,
  canRemove,
}: GridProps) {
  const col0 = columns[0];
  return (
    <div className="block space-y-3 md:hidden">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {cities.map((city) => {
          const isRef = city.id === refCity.id;
          const off =
            col0 != null ? formatUtcOffset(col0.instant, city.timezone) : "";
          return (
            <div
              key={city.id}
              className="flex min-w-[5.5rem] shrink-0 flex-col rounded-lg border border-white/10 bg-surface-1/80 p-2"
            >
              <button
                type="button"
                onClick={() => onPromote(city.id)}
                className="text-left text-xs font-semibold leading-tight text-slate-100"
              >
                {city.name}
                {isRef && (
                  <span className="mt-0.5 block text-[9px] font-bold uppercase text-emerald-400">
                    REF
                  </span>
                )}
              </button>
              <span className="mt-1 font-mono text-[9px] text-slate-500">
                {off}
              </span>
              <button
                type="button"
                disabled={!canRemove}
                onClick={() => onRemove(city.id)}
                className="mt-2 self-start rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
                aria-label={`Remove ${city.name}`}
              >
                <TrashIcon />
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/10 bg-surface-1/50 p-2">
        {columns.map((col) => (
          <div
            key={col.refHour}
            className="grid gap-1 border-b border-white/5 py-1 last:border-b-0"
            style={{
              gridTemplateColumns: `3.25rem repeat(${cities.length}, minmax(0,1fr))`,
            }}
          >
            <div className="flex items-center font-mono text-[10px] font-medium tabular-nums text-slate-500">
              {formatRefHourLabel(col.refHour, use12h)}
            </div>
            {cities.map((city) => (
              <Cell
                key={`${city.id}-${col.refHour}`}
                cell={col.cells.get(city.id)!}
                use12h={use12h}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
