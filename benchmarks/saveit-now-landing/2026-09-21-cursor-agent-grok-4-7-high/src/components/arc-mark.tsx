export function ArcMark({ className = "h-4 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 18" className={className} aria-hidden="true">
      <path
        d="M3 16a13 13 0 0 1 26 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
