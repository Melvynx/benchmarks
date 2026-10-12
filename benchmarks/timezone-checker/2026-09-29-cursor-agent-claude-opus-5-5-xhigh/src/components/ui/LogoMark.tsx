import { useId } from 'react';

export function LogoMark({ className }: { className?: string }) {
  const clipId = useId();
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <circle cx="16" cy="20" r="10" />
        </clipPath>
      </defs>
      <rect width="40" height="40" rx="11" fill="var(--ink)" />
      <circle cx="24" cy="20" r="10" fill="var(--overlap)" clipPath={`url(#${clipId})`} />
      <circle cx="16" cy="20" r="10" fill="none" stroke="var(--canvas)" strokeOpacity="0.6" strokeWidth="1.6" />
      <circle cx="24" cy="20" r="10" fill="none" stroke="var(--canvas)" strokeOpacity="0.6" strokeWidth="1.6" />
    </svg>
  );
}
