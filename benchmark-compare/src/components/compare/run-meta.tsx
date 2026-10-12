import type { BenchmarkGroup } from "@/lib/benchmark-groups"
import { cn } from "@/lib/utils"

/** Lane identity dots; the model names always sit next to them. */
export function LaneDots({
  group,
  max = 6,
  ringClassName = "ring-sidebar",
}: {
  group: BenchmarkGroup
  max?: number
  ringClassName?: string
}) {
  return (
    <span className="flex shrink-0 items-center -space-x-0.5" aria-hidden="true">
      {group.lanes.slice(0, max).map((lane) => (
        <span
          key={lane.key}
          className={cn("size-2 rounded-full ring-2", ringClassName)}
          style={{ backgroundColor: lane.color }}
        />
      ))}
    </span>
  )
}

/**
 * Completed, running, and failed apps as one stacked bar. Status hues are
 * reserved for status and the label beside the bar carries the counts.
 */
export function RunProgress({
  completed,
  running,
  failed,
  total,
  className,
}: {
  completed: number
  running: number
  failed: number
  total: number
  className?: string
}) {
  const segments = [
    { key: "completed", value: completed, className: "bg-emerald-400" },
    { key: "running", value: running, className: "animate-pulse bg-sky-400" },
    { key: "failed", value: failed, className: "bg-red-400" },
  ].filter((segment) => segment.value > 0)
  const label = [
    `${completed} of ${total} completed`,
    running ? `${running} running` : null,
    failed ? `${failed} failed` : null,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn("flex h-1 gap-px overflow-hidden rounded-full bg-muted", className)}
    >
      {total > 0 &&
        segments.map((segment) => (
          <span
            key={segment.key}
            className={cn("h-full first:rounded-l-full", segment.className)}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ))}
    </span>
  )
}

export function LivePill({ count, className }: { count?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-400/10 px-1.5 py-px text-[10px] font-medium text-sky-300 ring-1 ring-sky-400/25",
        className
      )}
    >
      <span className="size-1.5 animate-pulse rounded-full bg-sky-400" aria-hidden="true" />
      Live{count !== undefined && count > 0 ? ` · ${count}` : ""}
    </span>
  )
}
