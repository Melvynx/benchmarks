import { Link } from "@tanstack/react-router"
import { Columns2Icon, FileTextIcon, SearchIcon, XIcon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { AppTile } from "@/components/compare/app-tile"
import type { TileBadge } from "@/components/compare/app-tile"
import { Button } from "@/components/ui/button"
import { MAX_COMPARED } from "@/lib/benchmark-groups"
import type { TaskSummary } from "@/lib/benchmark-groups"
import type { BenchmarkEntry } from "@/lib/benchmarks.server"
import { formatAbsoluteDay, formatDay, harnessLabel, statusInfo } from "@/lib/format"
import { cn } from "@/lib/utils"

type TaskSort = "newest" | "fastest" | "cheapest"

const SORTS: Array<[TaskSort, string]> = [
  ["newest", "Newest"],
  ["fastest", "Fastest"],
  ["cheapest", "Cheapest"],
]

function knownCost(entry: BenchmarkEntry) {
  return entry.accounting?.complete === false ? null : entry.costUsd
}

/** Ascending by a metric; apps without one go last, keeping their order. */
function rankBy(entries: BenchmarkEntry[], value: (entry: BenchmarkEntry) => number | null) {
  return [...entries].sort((left, right) => {
    const a = value(left)
    const b = value(right)
    if (a === null) return b === null ? 0 : 1
    if (b === null) return -1
    return a - b
  })
}

/** The winner among finished apps: an app that produced nothing can't be fastest. */
function minId(entries: BenchmarkEntry[], value: (entry: BenchmarkEntry) => number | null) {
  const finished = entries.filter((entry) => entry.hasPreview && statusInfo(entry.status).tone === "success")
  if (finished.length < 2) return null
  return rankBy(finished, value).find((entry) => value(entry) !== null)?.id ?? null
}

/** The apps a day's comparison should open: finished, viewable ones first. */
function compareSet(entries: BenchmarkEntry[]) {
  const score = (entry: BenchmarkEntry) =>
    (statusInfo(entry.status).tone === "success" ? 0 : 2) + (entry.hasPreview ? 0 : 1)
  return [...entries]
    .sort((left, right) => score(left) - score(right))
    .slice(0, MAX_COMPARED)
    .map((entry) => entry.id)
}

function matches(entry: BenchmarkEntry, query: string) {
  const text = [entry.model, entry.harness, harnessLabel(entry.harness), entry.effort, entry.date]
    .join(" ")
    .toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => text.includes(term))
}

/**
 * Every app ever built for one prompt, across runs: the place to answer "who
 * made the best one?" Sorting by speed or cost ranks them; by date, each day
 * compares in one click.
 */
export function TaskOverview({
  summary,
  query,
  onQueryChange,
  picks,
  pickFull,
  onOpen,
  onTogglePick,
  onOpenApps,
}: {
  summary: TaskSummary
  query: string
  onQueryChange: (query: string) => void
  picks: string[]
  pickFull: boolean
  onOpen: (id: string) => void
  onTogglePick: (id: string) => void
  onOpenApps: (ids: string[]) => void
}) {
  const [sort, setSort] = useState<TaskSort>("newest")
  const [completedOnly, setCompletedOnly] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const picking = picks.length > 0

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [summary.task])

  const visible = useMemo(
    () =>
      summary.entries.filter(
        (entry) =>
          (!query || matches(entry, query)) &&
          (!completedOnly || statusInfo(entry.status).tone === "success")
      ),
    [completedOnly, query, summary.entries]
  )
  const sections = useMemo(() => {
    if (sort !== "newest") {
      const ranked = rankBy(visible, sort === "fastest" ? (entry) => entry.durationMs : knownCost)
      return [{ key: sort, day: null, entries: ranked }]
    }
    const byDay = new Map<string, BenchmarkEntry[]>()
    for (const entry of visible) byDay.set(entry.date, [...(byDay.get(entry.date) ?? []), entry])
    return [...byDay.entries()].map(([day, entries]) => ({ key: day, day, entries }))
  }, [sort, visible])

  const completed = summary.entries.filter(
    (entry) => statusInfo(entry.status).tone === "success"
  ).length
  const firstDay = summary.entries.at(-1)?.date
  const rankMetric = sort === "fastest" ? (entry: BenchmarkEntry) => entry.durationMs : knownCost

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[112rem] flex-col gap-6 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium text-primary">
              Task
              {summary.promptSlug && summary.promptVersion && (
                <Link
                  to="/prompts/$name/$version"
                  params={{ name: summary.promptSlug, version: summary.promptVersion }}
                  className="inline-flex items-center gap-1 rounded-md px-1 font-normal text-muted-foreground transition-colors hover:text-primary"
                >
                  <FileTextIcon className="size-3" aria-hidden="true" />
                  Prompt {summary.promptVersion}
                </Link>
              )}
            </p>
            <h1 className="mt-1 truncate font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              {summary.task}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {summary.entries.length} {summary.entries.length === 1 ? "app" : "apps"} ·{" "}
              {summary.models} {summary.models === 1 ? "model" : "models"} · {completed} completed
              {firstDay && firstDay !== "unknown" && <> · since {formatAbsoluteDay(firstDay)}</>}
            </p>
          </div>
        </header>

        <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b bg-background/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <label className="relative min-w-0 flex-1 sm:max-w-72">
            <span className="sr-only">Filter by model or harness</span>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.stopPropagation()
                  onQueryChange("")
                }
              }}
              placeholder="Filter by model or harness…"
              className="h-8 w-full rounded-lg border bg-card/60 pr-8 pl-8 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                aria-label="Clear filter"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </label>
          <div role="radiogroup" aria-label="Sort apps" className="flex items-center rounded-lg border bg-card/60 p-0.5">
            {SORTS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={sort === value}
                onClick={() => setSort(value)}
                className={cn(
                  "h-7 rounded-md px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  sort === value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-pressed={completedOnly}
            onClick={() => setCompletedOnly((value) => !value)}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              completedOnly ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "bg-card/60 text-muted-foreground hover:text-foreground"
            )}
          >
            <span className={cn("size-1.5 rounded-full", completedOnly ? "bg-emerald-400" : "bg-muted-foreground/60")} aria-hidden="true" />
            Completed only
          </button>
          <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {visible.length}/{summary.entries.length}
          </span>
        </div>

        {sections.map((section) => {
          const fastest = sort === "newest" ? minId(section.entries, (entry) => entry.durationMs) : null
          const cheapest = sort === "newest" ? minId(section.entries, knownCost) : null
          return (
            <section key={section.key} aria-label={section.day ? formatDay(section.day) : `Sorted by ${sort}`} className="flex flex-col gap-3">
              {section.day && (
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">
                    {section.day === "unknown" ? "Undated" : formatDay(section.day)}
                    {section.day !== "unknown" && (
                      <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">{section.day}</span>
                    )}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {section.entries.length} {section.entries.length === 1 ? "app" : "apps"}
                    </span>
                  </h2>
                  {section.entries.length > 1 && (
                    <Button variant="outline" size="sm" onClick={() => onOpenApps(compareSet(section.entries))}>
                      <Columns2Icon data-icon="inline-start" />
                      Compare this day
                    </Button>
                  )}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {section.entries.map((entry, index) => {
                  const pickIndex = picks.indexOf(entry.id)
                  const badges: TileBadge[] = []
                  if (entry.id === fastest) badges.push("fastest")
                  if (entry.id === cheapest) badges.push("cheapest")
                  return (
                    <AppTile
                      key={entry.id}
                      entry={entry}
                      picked={pickIndex !== -1}
                      pickIndex={pickIndex}
                      picking={picking}
                      pickDisabled={pickFull && pickIndex === -1}
                      badges={badges}
                      rank={sort !== "newest" && rankMetric(entry) !== null ? index + 1 : undefined}
                      onOpen={() => onOpen(entry.id)}
                      onTogglePick={() => onTogglePick(entry.id)}
                    />
                  )
                })}
              </div>
            </section>
          )
        })}

        {!visible.length && (
          <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
            No app matches these filters.{" "}
            <button
              type="button"
              className="text-foreground underline-offset-4 hover:underline"
              onClick={() => {
                onQueryChange("")
                setCompletedOnly(false)
              }}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
