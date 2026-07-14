import { formatRelativeTime } from "../lib/format";
import { usePrefersReducedMotion } from "../hooks/useNow";

export interface HeaderProps {
  fetchedAtMs: number | null;
  isRefreshing: boolean;
  isStale: boolean;
  nowMs: number;
  onRefresh: () => void;
}

export function Header({ fetchedAtMs, isRefreshing, isStale, nowMs, onRefresh }: HeaderProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <header className="flex items-center justify-between gap-3 border-b border-ink-800 bg-ink-950 px-3 py-2.5 sm:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="shrink-0 text-accent">
          <path
            d="M2 20h4l3-9 4 15 3-11 2 5h12"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold leading-tight text-ink-50">Seismograph</h1>
          <p className="hidden truncate text-[11px] leading-tight text-ink-400 sm:block">
            A live earthquake observatory, built on USGS data
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <div className="hidden text-right text-[11px] leading-tight text-ink-400 sm:block" aria-live="polite">
          <span className="flex items-center justify-end gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${isStale ? "bg-ink-500" : "bg-alert-green"} ${
                !isStale && !reducedMotion ? "animate-pulse" : ""
              }`}
              aria-hidden="true"
            />
            {isStale ? "Data may be stale" : "Live"}
          </span>
          <span className="tnum">
            {fetchedAtMs ? `Updated ${formatRelativeTime(fetchedAtMs, nowMs)}` : "Not yet loaded"}
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex min-h-11 items-center gap-1.5 rounded-md border border-ink-600 bg-ink-900 px-3 text-[12.5px] font-medium text-ink-100 hover:border-accent hover:text-accent disabled:opacity-60"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={isRefreshing && !reducedMotion ? "animate-spin" : ""}
          >
            <path
              d="M20 12a8 8 0 10-2.6 5.9M20 5v6h-6"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </header>
  );
}
