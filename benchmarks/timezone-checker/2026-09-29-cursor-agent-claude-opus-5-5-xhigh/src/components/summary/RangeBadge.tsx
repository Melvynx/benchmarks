import { formatRange, type TimeFormat } from '../../lib/format';
import { HOURS_PER_DAY } from '../../lib/math';
import type { HourRange } from '../../lib/overlap';

interface RangeBadgeProps {
  range: HourRange;
  format: TimeFormat;
  /** Same range expressed in another city's local time. */
  localLabel?: string;
}

export function RangeBadge({ range, format, localLabel }: RangeBadgeProps) {
  const endsNextDay = range.length < HOURS_PER_DAY && range.start + range.length > HOURS_PER_DAY;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-overlap/35 bg-overlap-soft py-1 pr-3 pl-2.5 text-sm">
      <span className="size-2 rounded-full bg-overlap" aria-hidden />
      <span className="font-mono font-semibold whitespace-nowrap text-overlap-text">
        {formatRange(range, format)}
        {endsNextDay && (
          <sup className="ml-0.5 text-[0.625rem] font-medium" title="Ends the next day">
            +1
          </sup>
        )}
      </span>
      {localLabel && <span className="font-mono text-xs whitespace-nowrap text-ink-3">{localLabel} local</span>}
    </span>
  );
}
