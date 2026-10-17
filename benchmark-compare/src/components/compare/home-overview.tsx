import { ArrowRightIcon, CalendarDaysIcon, Columns2Icon, FlaskConicalIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { LivePreview } from "@/components/compare/live-preview"
import { LivePill, RunProgress } from "@/components/compare/run-meta"
import { Button } from "@/components/ui/button"
import { MAX_COMPARED, groupTitle, shortModel } from "@/lib/benchmark-groups"
import type { BenchmarkGroup, TaskSummary } from "@/lib/benchmark-groups"
import type { BenchmarkEntry } from "@/lib/benchmarks.server"
import {
  chipEffort,
  formatAbsoluteDay,
  formatCost,
  formatDay,
  formatDuration,
  formatRelative,
  formatShortDay,
  formatTime,
} from "@/lib/format"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 9

/** The task whose apps best represent a run: most previewable, then name. */
function showcaseTask(group: BenchmarkGroup) {
  const counts = new Map<string, number>()
  for (const entry of group.entries) {
    if (entry.hasPreview) counts.set(entry.task, (counts.get(entry.task) ?? 0) + 1)
  }
  return (
    [...counts.entries()].sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    )[0]?.[0] ?? group.tasks[0]
  )
}

/** One app per lane for a task, in lane order. */
function laneEntries(group: BenchmarkGroup, task: string) {
  return group.lanes
    .map((lane) => ({ lane, entry: lane.entries.find((entry) => entry.task === task) }))
    .filter((item): item is { lane: BenchmarkGroup["lanes"][number]; entry: BenchmarkEntry } =>
      Boolean(item.entry)
    )
    .slice(0, MAX_COMPARED)
}

export function HomeOverview({
  groups,
  tasks,
  date,
  appCount,
  onSelectRun,
  onSelectTask,
  onClearDate,
  onOpenApps,
}: {
  groups: BenchmarkGroup[]
  tasks: TaskSummary[]
  date: string
  appCount: number
  onSelectRun: (id: string) => void
  onSelectTask: (task: string) => void
  onClearDate: () => void
  onOpenApps: (ids: string[]) => void
}) {
  const [limit, setLimit] = useState(PAGE_SIZE)
  const filtered = date === "all"
  const dayGroups = useMemo(
    () => (filtered ? groups : groups.filter((group) => group.day === date)),
    [date, filtered, groups]
  )
  const latest = filtered ? dayGroups[0] : undefined
  const rest = latest ? dayGroups.slice(1) : dayGroups
  const models = useMemo(
    () => new Set(groups.flatMap((group) => group.lanes.map((lane) => lane.model))).size,
    [groups]
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-10 px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-8">
        {filtered ? (
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                Benchmarks
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {groups.length} runs · {tasks.length} tasks · {models} models ·{" "}
                {appCount} generated apps
              </p>
            </div>
          </header>
        ) : (
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
                Runs on
              </p>
              <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
                {formatAbsoluteDay(date)}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {dayGroups.length} {dayGroups.length === 1 ? "run" : "runs"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onClearDate}>
              Show every day
            </Button>
          </header>
        )}

        {latest && (
          <LatestRun
            group={latest}
            onSelect={() => onSelectRun(latest.id)}
            onOpenApps={onOpenApps}
          />
        )}

        {rest.length > 0 && (
          <section aria-labelledby="recent-runs" className="flex flex-col gap-3">
            <h2 id="recent-runs" className="text-sm font-semibold">
              {filtered ? "Earlier runs" : "Runs"}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rest.slice(0, limit).map((group) => (
                <RunCard key={group.id} group={group} onSelect={() => onSelectRun(group.id)} />
              ))}
            </div>
            {rest.length > limit && (
              <Button
                variant="outline"
                className="self-center"
                onClick={() => setLimit((value) => value + PAGE_SIZE)}
              >
                Show {Math.min(PAGE_SIZE, rest.length - limit)} older runs
              </Button>
            )}
          </section>
        )}

        {!dayGroups.length && (
          <p className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
            No comparable runs {filtered ? "yet" : "on this day"}.
          </p>
        )}

        {filtered && tasks.length > 0 && (
          <section aria-labelledby="all-tasks" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="all-tasks" className="text-sm font-semibold">
                Tasks
              </h2>
              <p className="text-xs text-muted-foreground">
                Every app ever built for a prompt, across runs
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              {tasks.map((item) => (
                <TaskCard key={item.task} item={item} onSelect={() => onSelectTask(item.task)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function LatestRun({
  group,
  onSelect,
  onOpenApps,
}: {
  group: BenchmarkGroup
  onSelect: () => void
  onOpenApps: (ids: string[]) => void
}) {
  const task = showcaseTask(group)
  const showcase = laneEntries(group, task)
  const total = group.entries.length

  return (
    <section
      aria-labelledby="latest-run"
      className="grid overflow-hidden rounded-2xl border bg-card/60 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]"
    >
      <button
        type="button"
        onClick={() => onOpenApps(showcase.map((item) => item.entry.id))}
        className="group relative grid grid-cols-2 gap-px bg-border text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
        aria-label={`Compare ${task} across ${showcase.length} models`}
      >
        {showcase.map(({ lane, entry }) => (
          <span key={entry.id} className={cn("relative block bg-background", showcase.length === 1 && "col-span-2", showcase.length === 3 && "first:col-span-2")}>
            <LivePreview
              id={entry.id}
            thumbnail={entry.thumbnail}
              url={entry.url}
              label={`${task} by ${entry.model}`}
              canPreview={entry.hasPreview}
            />
            <span className="absolute bottom-2 left-2 inline-flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium ring-1 ring-foreground/10">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: lane.color }} />
              <span className="truncate">{shortModel(entry.model)}</span>
              {chipEffort(lane) && <span className="shrink-0 text-muted-foreground">{chipEffort(lane)}</span>}
            </span>
          </span>
        ))}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/0 opacity-0 transition-[opacity,background-color] group-hover:bg-background/30 group-hover:opacity-100">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xl">
            <Columns2Icon className="size-4" aria-hidden="true" />
            Compare {task}
          </span>
        </span>
      </button>

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-primary">
            Latest run
            {group.running > 0 && <LivePill count={group.running} />}
          </p>
          <h2 id="latest-run" className="mt-1.5 font-heading text-2xl font-semibold tracking-tight">
            {group.startedAtMs !== null ? formatAbsoluteDay(group.startedAtMs) : "Undated run"}
          </h2>
          {group.startedAtMs !== null && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatTime(group.startedAtMs)} · {formatRelative(group.startedAtMs)}
            </p>
          )}
        </div>

        <ul className="flex flex-col divide-y rounded-xl border bg-background/40">
          {group.lanes.map((lane) => (
            <li key={lane.key} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: lane.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate font-medium">
                {shortModel(lane.model)}
                {chipEffort(lane) && <span className="ml-1.5 font-normal text-muted-foreground">{chipEffort(lane)}</span>}
              </span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {lane.completed}/{lane.entries.length}
              </span>
              <span className="w-14 text-right font-mono text-xs tabular-nums">
                {formatCost(lane.totalCostUsd)}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <RunProgress
            completed={group.completed}
            running={group.running}
            failed={group.failed}
            total={total}
            className="h-1.5"
          />
          <p className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground tabular-nums">
            <span>
              <span className="text-foreground">{group.completed}</span>/{total} apps done
            </span>
            <span>
              {group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"}
            </span>
            <span>{formatCost(group.totalCostUsd)} known</span>
            <span>{formatDuration(group.wallDurationMs)} wall</span>
          </p>
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <Button onClick={onSelect}>
            Open run
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button variant="outline" onClick={() => onOpenApps(showcase.map((item) => item.entry.id))}>
            <Columns2Icon data-icon="inline-start" />
            Compare {task}
          </Button>
        </div>
      </div>
    </section>
  )
}

function RunCard({ group, onSelect }: { group: BenchmarkGroup; onSelect: () => void }) {
  const covers = group.thumbnails.slice(0, 3)
  const live = covers.length
    ? null
    : group.entries.find((entry) => entry.hasPreview) ?? null
  const total = group.entries.length

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card/50 text-left transition-[border-color,background-color] outline-none hover:border-foreground/25 hover:bg-card focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="relative grid aspect-[16/7] grid-cols-3 gap-px overflow-hidden border-b bg-border">
        {covers.length ? (
          covers.map((cover) => (
            <img
              key={cover.task}
              src={cover.src}
              alt={cover.task}
              loading="lazy"
              decoding="async"
              className={cn(
                "size-full bg-muted object-cover object-top",
                covers.length === 1 && "col-span-3",
                covers.length === 2 && "first:col-span-2"
              )}
            />
          ))
        ) : live ? (
          <span className="col-span-3 block overflow-hidden bg-background">
            <LivePreview
              id={live.id}
              thumbnail={live.thumbnail}
              url={live.url}
              label={`${live.task} by ${live.model}`}
              canPreview
              className="aspect-auto h-full"
            />
          </span>
        ) : (
          <span className="preview-placeholder col-span-3 flex items-center justify-center text-xs text-muted-foreground/70">
            No app output yet
          </span>
        )}
      </span>
      <span className="flex flex-1 flex-col gap-3 p-4">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="truncate font-medium">{groupTitle(group)}</span>
              {group.running > 0 && <LivePill />}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {group.startedAtMs !== null
                ? `${formatDay(group.startedAtMs)} · ${formatTime(group.startedAtMs)} · ${formatRelative(group.startedAtMs)}`
                : "Undated"}
            </span>
          </span>
          <ArrowRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-[color,translate] group-hover:translate-x-0.5 group-hover:text-primary" />
        </span>
        <span className="flex flex-wrap gap-1.5">
          {group.lanes.slice(0, 5).map((lane) => (
            <span key={lane.key} className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-background/50 px-1.5 py-0.5 text-xs">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: lane.color }} aria-hidden="true" />
              <span className="truncate">{shortModel(lane.model)}</span>
              {chipEffort(lane) && <span className="shrink-0 text-muted-foreground">{chipEffort(lane)}</span>}
            </span>
          ))}
          {group.lanes.length > 5 && (
            <span className="px-1 text-xs text-muted-foreground">+{group.lanes.length - 5}</span>
          )}
        </span>
        <span className="mt-auto flex flex-col gap-2 border-t pt-3">
          <RunProgress completed={group.completed} running={group.running} failed={group.failed} total={total} />
          <span className="flex items-center gap-4 font-mono text-xs text-muted-foreground tabular-nums">
            <span>
              <span className={group.failed ? "text-red-300" : "text-foreground"}>{group.completed}</span>/{total} done
            </span>
            <span>{formatCost(group.totalCostUsd)}</span>
            <span className="ml-auto">{formatDuration(group.wallDurationMs)} wall</span>
          </span>
        </span>
      </span>
    </button>
  )
}

function TaskCard({ item, onSelect }: { item: TaskSummary; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card/50 text-left transition-[border-color,background-color] outline-none hover:border-foreground/25 hover:bg-card focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="relative block aspect-16/10 overflow-hidden border-b bg-muted">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <span className="preview-placeholder flex size-full items-center justify-center text-muted-foreground/70">
            <FlaskConicalIcon className="size-5" aria-hidden="true" />
          </span>
        )}
      </span>
      <span className="flex flex-col gap-0.5 px-3 py-2.5">
        <span className="truncate text-sm font-medium">{item.task}</span>
        <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">
            {item.entries.length} apps · {item.models} models
          </span>
          <span className="shrink-0">{formatShortDay(item.latestDay)}</span>
        </span>
      </span>
    </button>
  )
}
