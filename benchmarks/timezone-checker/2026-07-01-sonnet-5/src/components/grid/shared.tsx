export function RefBadge() {
  return (
    <span className="rounded-full bg-ref-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ref-400 ring-1 ring-ref-500/40">
      Ref
    </span>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 14 14" width="13" height="13" fill="none">
      <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
