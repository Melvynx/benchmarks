export function Header() {
  return (
    <header className="mx-auto max-w-6xl px-4 pt-10 pb-6 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-overlap-500/15 ring-1 ring-overlap-500/30">
          <GlobeIcon />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-base-100 md:text-3xl">
            Claude Sonnet 5
          </h1>
          <p className="text-sm text-base-400">Timezone overlap checker for distributed teams</p>
        </div>
      </div>
    </header>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" className="text-overlap-400">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3v18M3 12h18M5.2 7.2c2 1.5 4.4 2.3 6.8 2.3s4.8-.8 6.8-2.3M5.2 16.8c2-1.5 4.4-2.3 6.8-2.3s4.8.8 6.8 2.3"
        stroke="currentColor"
        strokeWidth="1.1"
        opacity="0.6"
      />
      <ellipse cx="12" cy="12" rx="4.2" ry="9" stroke="currentColor" strokeWidth="1.1" opacity="0.6" />
    </svg>
  );
}
