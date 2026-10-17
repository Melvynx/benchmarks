export const APP_TITLE = "Claude Opus 5.5";

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="4" y="10" width="40" height="29" rx="5" fill="var(--surface)" />
      <path d="M9.5 36.5V18" stroke="#4c8bf5" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M38.5 36.5V18" stroke="#34a853" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M9.5 16.5 24 27.5l14.5-11" stroke="#d97757" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="38.5" cy="16.5" r="3.25" fill="#fbbc04" />
    </svg>
  );
}

export function Brand({ compact }: { compact?: boolean }) {
  return (
    <a href="#inbox" className="flex shrink-0 items-center gap-1.5 rounded-md pr-2" aria-label={`${APP_TITLE} inbox`}>
      <LogoMark size={compact ? 32 : 40} />
      <h1 className={compact ? "whitespace-nowrap font-sans text-lg leading-6 text-fg-2" : "whitespace-nowrap font-sans text-[22px] leading-6 tracking-[-0.01em] text-fg-2 max-[1099px]:text-lg"}>{APP_TITLE}</h1>
    </a>
  );
}
