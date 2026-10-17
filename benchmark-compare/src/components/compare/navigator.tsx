import { SearchIcon, XIcon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { LaneDots, LivePill, RunProgress } from "@/components/compare/run-meta"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { groupModels, groupTitle } from "@/lib/benchmark-groups"
import type { BenchmarkGroup, TaskSummary } from "@/lib/benchmark-groups"
import {
  formatClock,
  formatCost,
  formatDay,
  formatShortDay,
  harnessLabel,
} from "@/lib/format"
import { cn } from "@/lib/utils"

export type NavigatorTab = "runs" | "tasks"

function includesEvery(haystack: string, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  const text = haystack.toLowerCase()
  return terms.every((term) => text.includes(term))
}

function runHaystack(group: BenchmarkGroup) {
  return [
    group.id,
    group.day,
    formatDay(group.day),
    ...group.tasks,
    ...group.lanes.flatMap((lane) => [
      lane.model,
      ...lane.modelVariants,
      lane.harness,
      harnessLabel(lane.harness),
      lane.effort,
    ]),
  ].join(" ")
}

/**
 * The sidebar: every comparable run by day, and every task. It is the one
 * place to move between contexts; the active row stays in view.
 */
export function Navigator({
  groups,
  tasks,
  tab,
  activeRunId,
  activeTask,
  onTabChange,
  onSelectRun,
  onSelectTask,
}: {
  groups: BenchmarkGroup[]
  tasks: TaskSummary[]
  tab: NavigatorTab
  activeRunId: string | null
  activeTask: string | null
  onTabChange: (tab: NavigatorTab) => void
  onSelectRun: (id: string) => void
  onSelectTask: (task: string) => void
}) {
  const [query, setQuery] = useState("")
  const listRef = useRef<HTMLDivElement>(null)
  const days = useMemo(() => {
    const byDay = new Map<string, BenchmarkGroup[]>()
    for (const group of groups) {
      if (query && !includesEvery(runHaystack(group), query)) continue
      byDay.set(group.day, [...(byDay.get(group.day) ?? []), group])
    }
    return [...byDay.entries()]
  }, [groups, query])
  const visibleTasks = useMemo(
    () => tasks.filter((item) => !query || includesEvery(item.task, query)),
    [query, tasks]
  )

  useEffect(() => {
    const active = listRef.current?.querySelector('[aria-current="true"]')
    active?.scrollIntoView({ block: "nearest" })
  }, [activeRunId, activeTask, tab])

  const empty = tab === "runs" ? days.length === 0 : visibleTasks.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-2 px-3 pb-2">
        <Tabs value={tab} onValueChange={(value) => onTabChange(value as NavigatorTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="runs">
              Runs
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {groups.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks
              <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {tasks.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <label className="relative block">
          <span className="sr-only">
            {tab === "runs" ? "Filter runs" : "Filter tasks"}
          </span>
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.stopPropagation()
                setQuery("")
              }
            }}
            placeholder={tab === "runs" ? "Filter by model, task, day…" : "Filter tasks…"}
            className="h-8 w-full rounded-lg border border-sidebar-border bg-background/40 pr-8 pl-8 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              aria-label="Clear filter"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </label>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto border-t border-sidebar-border pb-3">
        {tab === "runs" &&
          days.map(([day, dayGroups]) => (
            <section key={day} aria-label={formatDay(day)}>
              <h3 className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-sidebar/95 px-4 pt-3 pb-1.5 text-[11px] font-medium text-muted-foreground">
                <span>
                  <span className="text-foreground">{formatDay(day)}</span>
                  {day !== "unknown" && (
                    <span className="ml-1.5 font-mono">{day}</span>
                  )}
                </span>
                <span className="font-mono tabular-nums">{dayGroups.length}</span>
              </h3>
              <ul className="flex flex-col gap-0.5 px-2">
                {dayGroups.map((group) => (
                  <li key={group.id}>
                    <RunRow
                      group={group}
                      active={group.id === activeRunId}
                      onSelect={() => onSelectRun(group.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        {tab === "tasks" && (
          <ul className="flex flex-col gap-0.5 px-2 pt-2">
            {visibleTasks.map((item) => (
              <li key={item.task}>
                <TaskRow
                  item={item}
                  active={item.task === activeTask}
                  onSelect={() => onSelectTask(item.task)}
                />
              </li>
            ))}
          </ul>
        )}
        {empty && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {query ? (
              <>Nothing matches “{query}”.</>
            ) : tab === "runs" ? (
              "No runs yet."
            ) : (
              "No tasks yet."
            )}
          </p>
        )}
      </div>
    </div>
  )
}

function RunRow({
  group,
  active,
  onSelect,
}: {
  group: BenchmarkGroup
  active: boolean
  onSelect: () => void
}) {
  const total = group.entries.length
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      title={`${group.tasks.join(", ")}\n${group.id}`}
      className={cn(
        "relative flex w-full scroll-my-10 flex-col gap-1.5 rounded-lg px-2.5 py-2 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/50"
      )}
    >
      {active && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-primary" aria-hidden="true" />
      )}
      <span className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {group.startedAtMs !== null ? formatClock(group.startedAtMs) : "—"}
        </span>
        <span className="min-w-0 truncate text-sm font-medium">{groupTitle(group)}</span>
        {group.running > 0 && <LivePill />}
        <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
          {formatCost(group.totalCostUsd)}
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <LaneDots group={group} ringClassName={active ? "ring-sidebar-accent" : "ring-sidebar"} />
        <span className="truncate text-xs text-muted-foreground">{groupModels(group)}</span>
      </span>
      <span className="flex items-center gap-2">
        <RunProgress
          completed={group.completed}
          running={group.running}
          failed={group.failed}
          total={total}
          className="flex-1"
        />
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums">
          {group.completed}/{total}
        </span>
      </span>
    </button>
  )
}

function TaskRow({
  item,
  active,
  onSelect,
}: {
  item: TaskSummary
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "relative flex w-full scroll-my-2 items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/50"
      )}
    >
      {active && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-primary" aria-hidden="true" />
      )}
      <span className="relative aspect-16/10 w-14 shrink-0 overflow-hidden rounded-md border bg-muted">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover object-top"
          />
        ) : (
          <span className="preview-placeholder flex size-full items-center justify-center font-mono text-xs font-semibold text-muted-foreground uppercase">
            {item.task.slice(0, 2)}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.task}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {item.entries.length} {item.entries.length === 1 ? "app" : "apps"} ·{" "}
          {item.models} {item.models === 1 ? "model" : "models"}
        </span>
      </span>
      <span className="shrink-0 text-[11px] text-muted-foreground">
        {formatShortDay(item.latestDay)}
      </span>
    </button>
  )
}
