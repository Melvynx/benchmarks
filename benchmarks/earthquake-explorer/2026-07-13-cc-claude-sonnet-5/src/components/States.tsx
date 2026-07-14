export function LoadingSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 p-4" role="status" aria-label="Loading earthquake data">
      <div className="h-16 animate-pulse rounded-md bg-ink-800" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-ink-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 animate-pulse rounded bg-ink-800" />
            <div className="h-2.5 w-1/3 animate-pulse rounded bg-ink-800" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading live earthquake data from USGS…</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center" role="alert">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-alert-red">
        <path
          d="M12 9v4m0 4h.01M10.3 3.8L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.8a2 2 0 00-3.4 0z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="max-w-xs text-[13.5px] text-ink-100">{message}</p>
      <p className="max-w-xs text-[12px] text-ink-400">Your filters and selection have been kept. USGS data may also be viewed directly on their site.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 flex min-h-11 items-center rounded-md border border-ink-600 px-4 text-[13px] font-medium text-ink-50 hover:border-accent hover:text-accent"
      >
        Try again
      </button>
    </div>
  );
}

export function EmptyFilteredState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p className="text-[13.5px] text-ink-100">No earthquakes match the current filters.</p>
      <p className="max-w-xs text-[12px] text-ink-400">
        Try widening the magnitude or depth range, clearing the alert filter, or choosing a longer time period.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-1 flex min-h-11 items-center rounded-md border border-ink-600 px-4 text-[13px] font-medium text-ink-50 hover:border-accent hover:text-accent"
      >
        Reset all filters
      </button>
    </div>
  );
}

export function StaleBanner({ message }: { message: string | null }) {
  return (
    <div role="status" className="flex items-center gap-2 border-b border-ink-800 bg-ink-900 px-4 py-1.5 text-[11.5px] text-ink-300">
      <span className="h-1.5 w-1.5 rounded-full bg-alert-yellow" aria-hidden="true" />
      {message ?? "Showing the last successfully loaded data — a refresh attempt failed."}
    </div>
  );
}
