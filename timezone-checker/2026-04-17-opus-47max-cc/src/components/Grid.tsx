import { type City } from "../data/cities";
import {
  formatLocalTime,
  formatUtcOffset,
  localMinutesForRefHour,
} from "../lib/timezone";

export type CityRow = {
  city: City;
  offsetMin: number;
  awake: boolean[];
  overlap: boolean[];
};

type Props = {
  rows: CityRow[]; // index 0 = reference
  refOffsetMin: number;
  format12h: boolean;
  currentRefHour: number | null;
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
};

function cellAppearance(isAwake: boolean, isOverlap: boolean) {
  if (isOverlap) {
    return "bg-emerald-500/90 text-emerald-950 font-semibold";
  }
  if (isAwake) {
    return "bg-zinc-800/60 text-zinc-200";
  }
  return "bg-zinc-900/40 text-zinc-600";
}

export function Grid(props: Props) {
  return (
    <>
      <GridDesktop {...props} />
      <GridMobile {...props} />
    </>
  );
}

/* ------------------------- DESKTOP (≥ md) ------------------------- */

function GridDesktop({
  rows,
  refOffsetMin,
  format12h,
  currentRefHour,
  onPromote,
  onRemove,
}: Props) {
  const gridTemplate = "grid-cols-[minmax(220px,260px)_minmax(0,1fr)_auto]";
  const hourGrid = "grid-cols-[repeat(24,minmax(0,1fr))]";

  return (
    <div className={`hidden md:grid ${gridTemplate} gap-x-3 gap-y-1.5`}>
      {/* Header row */}
      <div />
      <div className={`grid ${hourGrid} gap-1 px-1 mb-1`}>
        {Array.from({ length: 24 }, (_, h) => {
          const strong = h === 0 || h === 12;
          const label = formatLocalTime(h * 60, format12h).compact;
          const isCurrent = currentRefHour === h;
          return (
            <div
              key={h}
              className={`text-center text-[10px] font-mono tracking-tight ${
                isCurrent
                  ? "text-emerald-400 font-semibold"
                  : strong
                    ? "text-zinc-300"
                    : "text-zinc-500"
              }`}
            >
              {strong ? label : String(h).padStart(2, "0")}
            </div>
          );
        })}
      </div>
      <div />

      {rows.map((row, idx) => {
        const isRef = idx === 0;
        const { city, offsetMin, awake, overlap } = row;
        return (
          <div key={city.id} className="contents fade-in">
            {/* City info */}
            <div className="flex items-center gap-3 min-w-0 py-1">
              <button
                onClick={() => onPromote(city.id)}
                disabled={isRef}
                className={`flex items-center gap-2.5 min-w-0 text-left group ${
                  isRef ? "cursor-default" : "cursor-pointer"
                }`}
                title={isRef ? "Reference city" : `Make ${city.name} the reference`}
              >
                <span className="text-xl leading-none">{city.flag}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className={`font-semibold truncate ${
                        isRef
                          ? "text-zinc-50"
                          : "text-zinc-200 group-hover:text-emerald-300 transition-colors"
                      }`}
                    >
                      {city.name}
                    </span>
                    {isRef && <RefBadge />}
                  </span>
                  <span className="block text-[11px] text-zinc-500 font-mono truncate">
                    {city.country} · {formatUtcOffset(offsetMin)}
                  </span>
                </span>
              </button>
            </div>

            {/* Hour cells */}
            <div className={`relative grid ${hourGrid} gap-1`}>
              {currentRefHour !== null && (
                <div
                  className="pointer-events-none absolute inset-y-[-2px] w-[2px] rounded-full bg-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.55)]"
                  style={{
                    left: `calc((100% / 24) * ${currentRefHour} + (100% / 48) - 1px)`,
                  }}
                  aria-hidden
                />
              )}
              {Array.from({ length: 24 }, (_, h) => {
                const local = localMinutesForRefHour(h, refOffsetMin, offsetMin);
                const { compact, hour, suffix } = formatLocalTime(local, format12h);
                return (
                  <div
                    key={h}
                    className={`h-11 rounded-md flex flex-col items-center justify-center ${cellAppearance(awake[h], overlap[h])}`}
                    title={`${compact} in ${city.name}`}
                  >
                    {format12h ? (
                      <div className="flex items-baseline leading-none">
                        <span className="text-[13px] font-mono">{hour}</span>
                        <span className="text-[8px] ml-0.5 opacity-75">
                          {suffix}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[13px] font-mono leading-none">
                        {hour}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Remove */}
            <div className="flex items-center justify-end pr-1">
              {!isRef ? (
                <button
                  onClick={() => onRemove(city.id)}
                  className="text-zinc-500 hover:text-red-400 transition p-2 rounded-lg hover:bg-red-500/10"
                  aria-label={`Remove ${city.name}`}
                >
                  <TrashIcon />
                </button>
              ) : (
                <div className="w-8" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------- MOBILE (< md) ------------------------- */

function GridMobile({
  rows,
  refOffsetMin,
  format12h,
  currentRefHour,
  onPromote,
  onRemove,
}: Props) {
  const colsTemplate = `grid-cols-[64px_repeat(${rows.length},minmax(0,1fr))]`;

  return (
    <div
      className={`md:hidden rounded-2xl border border-white/10 bg-zinc-900/40 p-2 overflow-x-auto`}
    >
      <div
        className={`grid ${colsTemplate} gap-1 min-w-max`}
        style={{
          gridTemplateColumns: `64px repeat(${rows.length}, minmax(72px, 1fr))`,
        }}
      >
        {/* Header: empty corner + city names */}
        <div />
        {rows.map((row, idx) => {
          const isRef = idx === 0;
          return (
            <div
              key={row.city.id}
              className="flex flex-col items-center gap-1 pt-2 pb-3 relative"
            >
              <button
                onClick={() => onPromote(row.city.id)}
                disabled={isRef}
                className="flex flex-col items-center gap-0.5 min-w-0"
              >
                <span className="text-xl leading-none">{row.city.flag}</span>
                <span className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`font-semibold text-[11px] truncate max-w-[90px] ${
                      isRef ? "text-zinc-50" : "text-zinc-200"
                    }`}
                  >
                    {row.city.name}
                  </span>
                  {isRef && <RefBadge small />}
                </span>
                <span className="text-[9px] font-mono text-zinc-500">
                  {formatUtcOffset(row.offsetMin)}
                </span>
              </button>
              {!isRef && (
                <button
                  onClick={() => onRemove(row.city.id)}
                  className="absolute top-1 right-1 text-zinc-600 hover:text-red-400 transition"
                  aria-label={`Remove ${row.city.name}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}

        {/* 24 rows — each row = 1 reference hour */}
        {Array.from({ length: 24 }, (_, h) => {
          const refLabel = formatLocalTime(h * 60, format12h).compact;
          const isCurrent = currentRefHour === h;
          const strong = h === 0 || h === 12;
          return (
            <div key={`row-${h}`} className="contents">
              <div
                className={`h-9 flex items-center justify-end pr-2 text-[11px] font-mono ${
                  isCurrent
                    ? "text-emerald-400 font-semibold"
                    : strong
                      ? "text-zinc-300"
                      : "text-zinc-500"
                }`}
              >
                {refLabel}
              </div>
              {rows.map((row) => {
                const local = localMinutesForRefHour(h, refOffsetMin, row.offsetMin);
                const { compact } = formatLocalTime(local, format12h);
                return (
                  <div
                    key={`${row.city.id}-${h}`}
                    className={`h-9 rounded-md flex items-center justify-center text-[12px] font-mono ${cellAppearance(row.awake[h], row.overlap[h])} ${isCurrent ? "ring-1 ring-emerald-400/40" : ""}`}
                  >
                    {compact}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RefBadge({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`font-bold tracking-wider uppercase rounded bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 ${
        small ? "text-[8px] px-1 py-[1px]" : "text-[9px] px-1.5 py-0.5"
      }`}
    >
      REF
    </span>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
