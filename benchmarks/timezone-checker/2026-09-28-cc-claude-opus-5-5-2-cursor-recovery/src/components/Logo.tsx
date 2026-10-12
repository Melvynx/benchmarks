/** Two overlapping days; the shared lens is the overlap. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className}>
      <defs>
        <clipPath id="logo-left">
          <circle cx="15" cy="20" r="11" />
        </clipPath>
      </defs>
      <rect width="40" height="40" rx="11" className="fill-ink" />
      <circle cx="15" cy="20" r="10.25" fill="none" strokeWidth="1.5" className="stroke-surface/55" />
      <circle cx="25" cy="20" r="10.25" fill="none" strokeWidth="1.5" className="stroke-surface/55" />
      <circle cx="25" cy="20" r="11" clipPath="url(#logo-left)" className="fill-overlap" />
    </svg>
  );
}
