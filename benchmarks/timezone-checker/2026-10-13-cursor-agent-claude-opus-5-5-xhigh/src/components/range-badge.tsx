import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { formatRange, type TimeFormat } from "@/lib/format";
import { type HourRange, rangeHours } from "@/lib/overlap";
import { useFocus } from "@/state/focus";

interface RangeBadgeProps {
  range: HourRange;
  format: TimeFormat;
  /** Text copied to the clipboard on click. */
  copyText: string;
  tone?: "overlap" | "partial";
}

export function RangeBadge({ range, format, copyText, tone = "overlap" }: RangeBadgeProps) {
  const focus = useFocus((state) => state.focus);
  const clear = useFocus((state) => state.clear);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const label = formatRange(range, format);
  const highlight = () => focus(rangeHours(range));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      onPointerEnter={highlight}
      onPointerLeave={clear}
      onFocus={highlight}
      onBlur={clear}
      title={`Copy this window in every city's local time\n\n${copyText}`}
      aria-label={`${label}, ${range.length} ${range.length === 1 ? "hour" : "hours"}. Copy local times`}
      className={cn(
        "group inline-flex h-8 items-center gap-2 rounded-full pr-1.5 pl-3 text-sm font-semibold whitespace-nowrap transition-colors",
        tone === "overlap"
          ? "bg-overlap-soft text-overlap-text ring-1 ring-overlap/25 ring-inset hover:bg-overlap hover:text-overlap-ink"
          : "bg-sleep text-ink-2 ring-1 ring-line-strong ring-inset hover:bg-ink hover:text-canvas",
      )}
    >
      <span className="tabular font-mono text-[13px]">{label}</span>
      <span
        className={cn(
          "inline-flex h-5 items-center gap-1 rounded-full px-1.5 font-mono text-[11px] font-medium",
          tone === "overlap" ? "bg-overlap/15 group-hover:bg-black/15" : "bg-ink/5 group-hover:bg-white/15",
        )}
      >
        {copied ? (
          <>
            <Check aria-hidden className="size-3" />
            Copied
          </>
        ) : (
          <>
            {range.length}h
            <Copy aria-hidden className="hidden size-3 group-hover:block group-focus-visible:block" />
          </>
        )}
      </span>
    </button>
  );
}
