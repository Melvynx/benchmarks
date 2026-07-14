export function Header() {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400/25 to-accent-600/10 ring-1 ring-inset ring-accent-400/30"
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6 text-accent-300"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
            <path d="M3 12h2M19 12h2M12 3v2M12 19v2" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            GLM-5.2
          </h1>
          <p className="text-sm text-slate-400">
            Timezone Overlap Checker · find meeting windows across the world
          </p>
        </div>
      </div>
    </header>
  );
}
