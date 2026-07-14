const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function BrandMark() {
  return (
    <svg width={32} height={32} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 7.94A9 9 0 0 1 16 24.06 9 9 0 0 1 16 7.94Z" fill="var(--green)" opacity="0.9" />
      <circle cx="12" cy="16" r="9" fill="none" stroke="var(--accent)" strokeWidth="2" />
      <circle cx="20" cy="16" r="9" fill="none" stroke="var(--accent-2)" strokeWidth="2" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

export function WarnIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
