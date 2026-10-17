import {
  CheckIcon,
  CoinsIcon,
  ExternalLinkIcon,
  Maximize2Icon,
  PlusIcon,
  ZapIcon,
} from "lucide-react"

import { LivePreview } from "@/components/compare/live-preview"
import { useCompareMode } from "@/hooks/use-compare-mode"
import type { BenchmarkEntry } from "@/lib/benchmarks.server"
import {
  configLabel,
  formatCost,
  formatDay,
  formatDuration,
  statusDotClassName,
  statusInfo,
  statusTextClassName,
} from "@/lib/format"
import { cn } from "@/lib/utils"

export type TileBadge = "fastest" | "cheapest"

/** Known cost, marked as a floor when some attempts never reported one. */
export function entryCost(entry: BenchmarkEntry) {
  const cost = formatCost(entry.costUsd)
  return entry.accounting?.complete === false && entry.costUsd !== null
    ? `≥${cost}`
    : cost
}

/**
 * One generated app. The body opens it full size; the corner checkbox picks it
 * for a custom comparison. While anything is picked, the body picks too, so a
 * set can be built with plain clicks.
 */
export function AppTile({
  entry,
  variant = "card",
  color,
  picked,
  pickIndex,
  picking,
  pickDisabled,
  badges = [],
  rank,
  onOpen,
  onTogglePick,
}: {
  entry: BenchmarkEntry
  variant?: "cell" | "card"
  color?: string | null
  picked: boolean
  pickIndex: number
  picking: boolean
  pickDisabled: boolean
  badges?: TileBadge[]
  rank?: number
  onOpen: () => void
  onTogglePick: () => void
}) {
  const status = statusInfo(entry.status)
  const label = `${entry.model} on ${entry.task}`
  const compareMode = useCompareMode()
  const bodyPicks = picking || picked || compareMode
  const running = status.tone === "running"

  return (
    <div
      title="Time and cost include every recorded generation and continuation. Costs derived from text alone are excluded."
      className={cn(
        "group/tile relative overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow]",
        "has-[.tile-body:focus-visible]:border-ring has-[.tile-body:focus-visible]:ring-[3px] has-[.tile-body:focus-visible]:ring-ring/50",
        picked
          ? "border-primary/80 ring-2 ring-primary/35"
          : "hover:border-foreground/25",
        bodyPicks && pickDisabled && "opacity-60"
      )}
    >
      <button
        type="button"
        onClick={bodyPicks ? onTogglePick : onOpen}
        disabled={bodyPicks && pickDisabled}
        aria-label={
          bodyPicks ? `${picked ? "Unpick" : "Pick"} ${label}` : `Open ${label}`
        }
        className="tile-body block w-full text-left outline-none disabled:cursor-not-allowed"
      >
        <span className="relative block">
          <LivePreview
            id={entry.id}
            thumbnail={entry.thumbnail}
            url={entry.url}
            label={label}
            canPreview={entry.hasPreview}
          />
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/0 opacity-0 transition-[opacity,background-color] duration-150 group-hover/tile:bg-background/25 group-hover/tile:opacity-100"
            aria-hidden="true"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium shadow-lg ring-1 ring-foreground/10">
              {bodyPicks ? (
                picked ? (
                  <>
                    <CheckIcon className="size-3.5" /> Picked
                  </>
                ) : (
                  <>
                    <PlusIcon className="size-3.5" /> Pick
                  </>
                )
              ) : (
                <>
                  <Maximize2Icon className="size-3.5" /> Open
                </>
              )}
            </span>
          </span>
          {(badges.length > 0 || running || rank !== undefined) && (
            <span className="pointer-events-none absolute bottom-2 left-2 flex flex-wrap gap-1">
              {rank !== undefined && (
                <span className="inline-flex items-center rounded-full bg-background/90 px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums ring-1 ring-foreground/10">
                  #{rank}
                </span>
              )}
              {running && (
                <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-sky-300 ring-1 ring-sky-400/30">
                  <span className="size-1.5 animate-pulse rounded-full bg-sky-400" />
                  Running
                </span>
              )}
              {badges.includes("fastest") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-400/30">
                  <ZapIcon className="size-2.5" aria-hidden="true" />
                  Fastest
                </span>
              )}
              {badges.includes("cheapest") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-400/30">
                  <CoinsIcon className="size-2.5" aria-hidden="true" />
                  Cheapest
                </span>
              )}
            </span>
          )}
        </span>
        {variant === "cell" ? (
          <span className="flex items-center gap-2.5 border-t px-2.5 py-2 font-mono text-xs tabular-nums">
            <span
              className={cn("size-1.5 shrink-0 rounded-full", statusDotClassName[status.tone])}
              title={status.label}
            />
            <span className="sr-only">{status.label}</span>
            <span>{formatDuration(entry.durationMs)}</span>
            <span className="text-muted-foreground">{entryCost(entry)}</span>
            {status.tone !== "success" && (
              <span
                className={cn(
                  "ml-auto truncate font-sans text-[11px]",
                  statusTextClassName[status.tone]
                )}
              >
                {status.label}
              </span>
            )}
          </span>
        ) : (
          <span className="flex flex-col gap-0.5 border-t px-3 py-2.5">
            <span className="flex min-w-0 items-center gap-2">
              {color && (
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
              )}
              <span className="truncate text-sm font-medium" title={entry.model}>
                {entry.model}
              </span>
              <span className="ml-auto shrink-0 font-mono text-xs tabular-nums">
                {formatDuration(entry.durationMs)}
              </span>
            </span>
            <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn("size-1.5 shrink-0 rounded-full", statusDotClassName[status.tone])}
                title={status.label}
              />
              <span className="truncate">
                {status.tone !== "success" && (
                  <span className={statusTextClassName[status.tone]}>
                    {status.label} ·{" "}
                  </span>
                )}
                {configLabel(entry)} · {formatDay(entry.date)}
              </span>
              <span className="ml-auto shrink-0 font-mono tabular-nums">
                {entryCost(entry)}
              </span>
            </span>
          </span>
        )}
      </button>

      <button
        type="button"
        role="checkbox"
        aria-checked={picked}
        aria-label={`Pick ${label} for comparison`}
        disabled={pickDisabled}
        onClick={onTogglePick}
        title={pickDisabled ? "Six apps is the comparison limit" : picked ? "Unpick" : "Pick for comparison"}
        className={cn(
          "absolute top-2 left-2 flex size-6 items-center justify-center rounded-md border font-mono text-[11px] font-semibold shadow-sm transition-[opacity,background-color,border-color] focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed",
          picked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-foreground/25 bg-background/80 text-muted-foreground hover:border-primary hover:text-foreground",
          picked || picking || compareMode
            ? "opacity-100"
            : "opacity-0 group-hover/tile:opacity-100 pointer-coarse:opacity-100"
        )}
      >
        {picked ? pickIndex + 1 : <CheckIcon className="size-3.5 opacity-40" />}
      </button>

      <a
        href={entry.url}
        target="_blank"
        rel="noreferrer"
        title="Open in a new tab"
        aria-label={`Open ${label} in a new tab`}
        className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-md border border-foreground/15 bg-background/80 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover/tile:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ExternalLinkIcon className="size-3.5" />
      </a>
    </div>
  )
}
