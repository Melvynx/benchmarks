import { cx } from '../../lib/cx';

export function RefBadge({ className }: { className?: string }) {
  return (
    <span
      title="Reference city — every column is an hour of its day"
      className={cx(
        'inline-flex h-[1.125rem] shrink-0 items-center rounded-[0.3rem] bg-ink px-1.5 font-mono text-[0.625rem] font-bold tracking-[0.08em] text-canvas',
        className,
      )}
    >
      REF
    </span>
  );
}
