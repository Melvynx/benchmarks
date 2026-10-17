import { Link } from "@tanstack/react-router"
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Columns2Icon,
  CopyIcon,
  FileTextIcon,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { AccountingSummary } from "./accounting-summary"
import { AppTile } from "@/components/compare/app-tile"
import type { TileBadge } from "@/components/compare/app-tile"
import { LivePill, RunProgress } from "@/components/compare/run-meta"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MAX_COMPARED, laneKey } from "@/lib/benchmark-groups"
import type { BenchmarkGroup, Lane } from "@/lib/benchmark-groups"
import type { BenchmarkEntry } from "@/lib/benchmarks.server"
import {
  effortName,
  formatAbsoluteDay,
  formatCost,
  formatDuration,
  formatRelative,
  formatShortDay,
  formatTime,
  harnessLabel,
  statusInfo,
} from "@/lib/format"
import { cn } from "@/lib/utils"

type RunTab = "apps" | "models" | "ledger"

function laneMeta(lane: Pick<Lane, "harness" | "effort">) {
  const effort = effortName(lane.effort)
  return [harnessLabel(lane.harness), effort].filter(Boolean).join(" · ")
}

function minBy<T>(items: T[], value: (item: T) => number | null) {
  let best: T | null = null
  let bestValue = Number.POSITIVE_INFINITY
  for (const item of items) {
    const candidate = value(item)
    if (candidate !== null && candidate < bestValue) {
      best = item
      bestValue = candidate
    }
  }
  return best
}

/**
 * Per-task winners among finished apps; cost only counts apps whose every
 * attempt reported one.
 */
function taskBadges(entries: BenchmarkEntry[]) {
  const present = entries.filter(
    (entry) => entry.hasPreview && statusInfo(entry.status).tone === "success"
  )
  const fastest =
    present.length > 1 ? minBy(present, (entry) => entry.durationMs) : null
  const cheapest =
    present.length > 1
      ? minBy(present, (entry) =>
          entry.accounting?.complete === false ? null : entry.costUsd
        )
      : null
  return (entry: BenchmarkEntry) => {
    const badges: TileBadge[] = []
    if (fastest?.id === entry.id) badges.push("fastest")
    if (cheapest?.id === entry.id) badges.push("cheapest")
    return badges
  }
}

/** A lane's model/harness/effort, independent of the run it happened in. */
function setupOf(key: string) {
  return key.split("|").slice(1).join("|")
}

function entryTime(entry: BenchmarkEntry) {
  const time = Date.parse(entry.startedAt ?? entry.date)
  return Number.isNaN(time) ? 0 : time
}

/**
 * Lanes that skipped a task borrow the same setup's latest finished app from
 * an earlier run, keyed by `${lane.key}|${task}`, so every row stays complete.
 */
function earlierRuns(group: BenchmarkGroup, history: BenchmarkEntry[]) {
  // A comparison shows exactly the apps it lists; gaps stay visible.
  if (group.comparison) return new Map<string, BenchmarkEntry>()
  const lanesBySetup = new Map(
    group.lanes.map((lane) => [setupOf(lane.key), lane])
  )
  const tasks = new Set(group.tasks)
  const before = group.startedAtMs ?? Number.POSITIVE_INFINITY
  const borrowed = new Map<string, BenchmarkEntry>()
  for (const entry of history) {
    if (entry.benchmarkId === group.id || !tasks.has(entry.task)) continue
    if (!entry.hasPreview || statusInfo(entry.status).tone !== "success")
      continue
    const time = entryTime(entry)
    if (time >= before) continue
    const lane = lanesBySetup.get(setupOf(laneKey(entry)))
    if (!lane || lane.entries.some((item) => item.task === entry.task)) continue
    const key = `${lane.key}|${entry.task}`
    const current = borrowed.get(key)
    if (!current || entryTime(current) < time) borrowed.set(key, entry)
  }
  return borrowed
}

type PickProps = {
  picks: string[]
  pickFull: boolean
  onOpen: (id: string) => void
  onTogglePick: (id: string) => void
}

export function RunOverview({
  group,
  picks,
  pickFull,
  onOpen,
  onTogglePick,
  onCompare,
  onSelectTask,
  onOlder,
  onNewer,
  history,
}: PickProps & {
  group: BenchmarkGroup
  /** Every known app, searched for earlier runs of a lane's missing tasks. */
  history: BenchmarkEntry[]
  onCompare: (ids: Array<string>) => void
  onSelectTask: (task: string) => void
  onOlder?: () => void
  onNewer?: () => void
}) {
  const [tab, setTab] = useState<RunTab>("apps")
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const total = group.entries.length
  const hasLedger = group.entries.some(
    (entry) => (entry.accounting?.transcripts.length ?? 0) > 0
  )
  const hasModels = group.lanes.length > 1
  const activeTab =
    (tab === "ledger" && !hasLedger) || (tab === "models" && !hasModels)
      ? "apps"
      : tab
  const promptVersions = new Map<string, BenchmarkEntry>()
  for (const entry of group.entries) {
    if (entry.promptUrl && !promptVersions.has(entry.task))
      promptVersions.set(entry.task, entry)
  }
  const borrowed = useMemo(() => earlierRuns(group, history), [group, history])
  const pickProps = { picks, pickFull, onOpen, onTogglePick }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [group.id])

  const copyId = async () => {
    await navigator.clipboard.writeText(group.id)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_200)
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[112rem] flex-col gap-6 px-4 py-6 pb-28 sm:px-6 lg:py-6 xl:px-8 xl:py-8">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-primary">
              {group.comparison ? "Comparison · reused apps" : "Benchmark run"}
            </span>
            <span aria-hidden="true">·</span>
            {group.startedAtMs !== null && (
              <time dateTime={new Date(group.startedAtMs).toISOString()}>
                {formatRelative(group.startedAtMs)}
              </time>
            )}
            <button
              type="button"
              onClick={copyId}
              className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono transition-colors hover:bg-muted hover:text-foreground"
              title="Copy the benchmark ID"
            >
              <span className="truncate">{group.id}</span>
              {copied ? (
                <CheckIcon className="size-3 shrink-0 text-emerald-400" />
              ) : (
                <CopyIcon className="size-3 shrink-0" />
              )}
            </button>
            <span className="ml-auto flex items-center gap-1">
              <Button
                variant="outline"
                size="xs"
                onClick={onOlder}
                disabled={!onOlder}
                title="Older run ([)"
              >
                <ChevronLeftIcon data-icon="inline-start" />
                Older
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={onNewer}
                disabled={!onNewer}
                title="Newer run (])"
              >
                Newer
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {group.title ??
                (group.startedAtMs !== null
                  ? formatAbsoluteDay(group.startedAtMs)
                  : "Historical run")}
              {group.title === null && group.startedAtMs !== null && (
                <span className="ml-3 font-normal text-muted-foreground">
                  {formatTime(group.startedAtMs)}
                </span>
              )}
            </h1>
            {group.running > 0 && <LivePill count={group.running} />}
          </div>
          <p className="text-sm text-muted-foreground">
            {group.tasks.length} {group.tasks.length === 1 ? "task" : "tasks"} ×{" "}
            {group.lanes.length} {group.lanes.length === 1 ? "model" : "models"}{" "}
            · click an app to open it, tick its corner to build your own
            comparison.
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Completed"
            value={`${group.completed}/${total}`}
            tone={
              group.failed
                ? "danger"
                : group.completed === total
                  ? "success"
                  : "neutral"
            }
          >
            <RunProgress
              completed={group.completed}
              running={group.running}
              failed={group.failed}
              total={total}
              className="mt-2"
            />
          </Stat>
          <Stat
            label="Known cost"
            value={formatCost(group.totalCostUsd)}
            hint="Reported + token estimates; text approximations excluded"
          />
          <Stat
            label="Compute time"
            value={formatDuration(group.totalDurationMs)}
            hint="Sum of every run's model time"
          />
          <Stat
            label="Wall time"
            value={formatDuration(group.wallDurationMs)}
            hint={group.comparison ? "Slowest single app" : "Earliest invocation to latest completion"}
          />
        </dl>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setTab(value as RunTab)}
          className="gap-4"
        >
          <div className="flex items-center justify-between gap-3 border-b">
            <TabsList variant="line" className="h-10">
              <TabsTrigger value="apps" className="px-2.5">
                Apps
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {total}
                </span>
              </TabsTrigger>
              {hasModels && (
                <TabsTrigger value="models" className="px-2.5">
                  Models
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    {group.lanes.length}
                  </span>
                </TabsTrigger>
              )}
              {hasLedger && (
                <TabsTrigger value="ledger" className="px-2.5">
                  Ledger
                </TabsTrigger>
              )}
            </TabsList>
            {activeTab === "apps" && (
              <p className="hidden text-xs text-muted-foreground sm:block">
                {picks.length
                  ? `${picks.length}/${MAX_COMPARED} picked`
                  : "Winners use cumulative model time and token-backed costs"}
              </p>
            )}
          </div>

          <TabsContent value="apps" className="flex flex-col gap-4">
            <Matrix
              group={group}
              borrowed={borrowed}
              promptVersions={promptVersions}
              onCompare={onCompare}
              onSelectTask={onSelectTask}
              {...pickProps}
            />
            <TaskList
              group={group}
              borrowed={borrowed}
              promptVersions={promptVersions}
              onCompare={onCompare}
              onSelectTask={onSelectTask}
              {...pickProps}
            />
          </TabsContent>
          {hasModels && (
            <TabsContent value="models">
              <Leaderboard group={group} />
            </TabsContent>
          )}
          {hasLedger && (
            <TabsContent value="ledger">
              <AccountingSummary entries={group.entries} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  children,
}: {
  label: string
  value: string
  hint?: string
  tone?: "success" | "danger" | "neutral"
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card/50 px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-mono text-xl font-medium tabular-nums",
          tone === "success" && "text-emerald-300",
          tone === "danger" && "text-red-300"
        )}
      >
        {value}
      </dd>
      {hint && (
        <dd className="mt-0.5 text-[11px] leading-snug text-pretty text-muted-foreground">
          {hint}
        </dd>
      )}
      {children}
    </div>
  )
}

function TaskHeader({
  task,
  prompt,
  compareIds,
  onCompare,
  onSelectTask,
}: {
  task: string
  prompt: BenchmarkEntry | undefined
  compareIds: string[]
  onCompare: (ids: string[]) => void
  onSelectTask: (task: string) => void
}) {
  return (
    <>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onSelectTask(task)}
          className="block max-w-full truncate rounded text-left text-sm font-medium underline-offset-4 outline-none hover:text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
          title={`Every ${task} app, across runs`}
        >
          {task}
        </button>
        {prompt?.promptSlug && prompt.promptVersion && (
          <Link
            to="/prompts/$name/$version"
            params={{ name: prompt.promptSlug, version: prompt.promptVersion }}
            className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            <FileTextIcon className="size-3" />
            Prompt {prompt.promptVersion}
          </Link>
        )}
      </div>
      {compareIds.length > 1 && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 md:w-full md:justify-start"
          onClick={() => onCompare(compareIds)}
        >
          <Columns2Icon data-icon="inline-start" />
          Compare {compareIds.length}
        </Button>
      )}
    </>
  )
}

type SectionProps = PickProps & {
  group: BenchmarkGroup
  borrowed: Map<string, BenchmarkEntry>
  promptVersions: Map<string, BenchmarkEntry>
  onCompare: (ids: string[]) => void
  onSelectTask: (task: string) => void
}

type Cell = { entry: BenchmarkEntry; lane: Lane; earlier: boolean }

function rowCells(
  group: BenchmarkGroup,
  task: string,
  borrowed: Map<string, BenchmarkEntry>
) {
  const cells = group.lanes.map((lane): Cell | undefined => {
    const own = lane.entries.find((entry) => entry.task === task)
    if (own) return { entry: own, lane, earlier: false }
    const earlier = borrowed.get(`${lane.key}|${task}`)
    return earlier && { entry: earlier, lane, earlier: true }
  })
  const present = cells.filter((cell): cell is Cell => cell !== undefined)
  // Winners are this run's own: an earlier app ran under different conditions.
  const badgesFor = taskBadges(
    present.filter((cell) => !cell.earlier).map((cell) => cell.entry)
  )
  return { cells, present, badgesFor }
}

function EarlierRunNote({ entry }: { entry: BenchmarkEntry }) {
  return (
    <p
      className="mt-1.5 truncate px-0.5 text-[11px] text-amber-300/80"
      title={`Not part of this run: borrowed from ${entry.benchmarkId}`}
    >
      Earlier run · {formatShortDay(entry.startedAt ?? entry.date)}
    </p>
  )
}

/** Desktop: tasks down, models across, so a row reads as one comparison. */
function Matrix({
  group,
  borrowed,
  promptVersions,
  onCompare,
  onSelectTask,
  picks,
  pickFull,
  onOpen,
  onTogglePick,
}: SectionProps) {
  const headRef = useRef<HTMLDivElement>(null)
  const gridStyle = {
    gridTemplateColumns: `minmax(9rem, 12rem) repeat(${group.lanes.length}, minmax(12.5rem, 1fr))`,
    // The grid box must span every track, or the sticky task column loses its anchor.
    minWidth: `calc(9rem + ${group.lanes.length} * 12.5rem)`,
  }
  return (
    // The page scroller owns vertical scrolling so the run header scrolls away;
    // only the model row pins, mirroring the body's horizontal offset.
    <div className="hidden rounded-xl border bg-card/40 md:block">
      <div
        ref={headRef}
        className="sticky top-0 z-30 overflow-hidden rounded-t-xl bg-card"
      >
        <div className="grid w-full" style={gridStyle}>
          <div className="sticky left-0 z-10 border-b bg-card px-3 py-2.5 text-xs font-medium text-muted-foreground shadow-[1px_0_0_var(--border)] xl:px-4 xl:py-3">
            Task
          </div>
          {group.lanes.map((lane) => (
            <div
              key={lane.key}
              className="min-w-0 border-b border-l bg-card px-3 py-2"
            >
              <LaneLabel lane={lane} />
              <p className="mt-1.5 flex gap-3 pl-4 font-mono text-[11px] text-muted-foreground tabular-nums">
                <span>
                  <span
                    className={lane.failed ? "text-red-300" : "text-foreground"}
                  >
                    {lane.completed}
                  </span>
                  /{lane.entries.length}
                </span>
                <span>{formatCost(lane.totalCostUsd)}</span>
                <span>{formatDuration(lane.totalDurationMs)}</span>
              </p>
              <LaneCaveats lane={lane} />
            </div>
          ))}
        </div>
      </div>
      <div
        className="overflow-x-auto overscroll-x-contain rounded-b-xl"
        onScroll={(event) => {
          if (headRef.current)
            headRef.current.scrollLeft = event.currentTarget.scrollLeft
        }}
      >
        <div className="grid w-full" style={gridStyle}>
          {group.tasks.map((task) => {
            const { cells, present, badgesFor } = rowCells(
              group,
              task,
              borrowed
            )
            return (
              <div key={task} className="contents">
                <div className="sticky left-0 z-10 flex flex-col justify-between gap-3 border-b bg-card px-3 py-3 shadow-[1px_0_0_var(--border)] xl:px-4 xl:py-4">
                  <TaskHeader
                    task={task}
                    prompt={promptVersions.get(task)}
                    compareIds={present
                      .slice(0, MAX_COMPARED)
                      .map((cell) => cell.entry.id)}
                    onCompare={onCompare}
                    onSelectTask={onSelectTask}
                  />
                </div>
                {cells.map((cell, index) => {
                  const entry = cell?.entry
                  const pickIndex = entry ? picks.indexOf(entry.id) : -1
                  return (
                    <div
                      key={group.lanes[index].key}
                      className="min-w-0 border-b border-l p-2"
                    >
                      {entry ? (
                        <>
                          <AppTile
                            entry={entry}
                            variant="cell"
                            picked={pickIndex !== -1}
                            pickIndex={pickIndex}
                            picking={picks.length > 0}
                            pickDisabled={pickFull && pickIndex === -1}
                            badges={badgesFor(entry)}
                            onOpen={() => onOpen(entry.id)}
                            onTogglePick={() => onTogglePick(entry.id)}
                          />
                          {cell.earlier && <EarlierRunNote entry={entry} />}
                        </>
                      ) : (
                        <div className="flex aspect-16/10 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground/60">
                          Not run
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Phones: one section per task, apps stacked with their model named. */
function TaskList({
  group,
  borrowed,
  promptVersions,
  onCompare,
  onSelectTask,
  picks,
  pickFull,
  onOpen,
  onTogglePick,
}: SectionProps) {
  return (
    <div className="flex flex-col gap-6 md:hidden">
      {group.tasks.map((task) => {
        const { present, badgesFor } = rowCells(group, task, borrowed)
        return (
          <section
            key={task}
            aria-label={task}
            className="flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <TaskHeader
                task={task}
                prompt={promptVersions.get(task)}
                compareIds={present
                  .slice(0, MAX_COMPARED)
                  .map((cell) => cell.entry.id)}
                onCompare={onCompare}
                onSelectTask={onSelectTask}
              />
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {present.map(({ entry, lane, earlier }) => {
                const pickIndex = picks.indexOf(entry.id)
                return (
                  <div key={entry.id}>
                    <AppTile
                      entry={entry}
                      color={lane.color}
                      picked={pickIndex !== -1}
                      pickIndex={pickIndex}
                      picking={picks.length > 0}
                      pickDisabled={pickFull && pickIndex === -1}
                      badges={badgesFor(entry)}
                      onOpen={() => onOpen(entry.id)}
                      onTogglePick={() => onTogglePick(entry.id)}
                    />
                    {earlier && <EarlierRunNote entry={entry} />}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function LaneLabel({ lane }: { lane: Lane }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span
        className="mt-1.5 size-2 shrink-0 rounded-full"
        style={{ backgroundColor: lane.color }}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p
          className="truncate text-sm font-medium"
          title={[lane.model, ...lane.modelVariants].join(" / ")}
        >
          {lane.model}
          {lane.modelVariants.length > 0 && (
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              +{lane.modelVariants.length}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {laneMeta(lane)}
        </p>
      </div>
    </div>
  )
}

function Leaderboard({ group }: { group: BenchmarkGroup }) {
  const maxCost = Math.max(...group.lanes.map((lane) => lane.totalCostUsd ?? 0))
  const maxTime = Math.max(
    ...group.lanes.map((lane) => lane.totalDurationMs ?? 0)
  )
  const cheapest = minBy(group.lanes, (lane) =>
    lane.entries.some((entry) => entry.accounting?.complete === false)
      ? null
      : lane.totalCostUsd
  )
  const fastest = minBy(group.lanes, (lane) => lane.totalDurationMs)

  return (
    <section aria-label="Models in this run" className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Totals across {group.tasks.length}{" "}
        {group.tasks.length === 1 ? "task" : "tasks"}
      </p>
      <div className="overflow-x-auto rounded-xl border bg-card/40">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Model</th>
              <th className="px-4 py-2.5 font-medium">Completed</th>
              <th className="w-[28%] px-4 py-2.5 font-medium">
                Known cost subtotal
              </th>
              <th className="w-[28%] px-4 py-2.5 font-medium">Model time</th>
              <th className="px-4 py-2.5 text-right font-medium">Avg / task</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {group.lanes.map((lane) => (
              <tr
                key={lane.key}
                className="transition-colors hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <LaneLabel lane={lane} />
                </td>
                <td className="px-4 py-3 font-mono text-sm tabular-nums">
                  <span className={lane.failed ? "text-red-300" : undefined}>
                    {lane.completed}
                  </span>
                  <span className="text-muted-foreground">
                    /{lane.entries.length}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <MeterCell
                    value={formatCost(lane.totalCostUsd)}
                    ratio={maxCost ? (lane.totalCostUsd ?? 0) / maxCost : 0}
                    color={lane.color}
                    best={cheapest?.key === lane.key ? "Cheapest" : null}
                  />
                </td>
                <td className="px-4 py-3">
                  <LaneCaveats lane={lane} />
                  <MeterCell
                    value={formatDuration(lane.totalDurationMs)}
                    ratio={maxTime ? (lane.totalDurationMs ?? 0) / maxTime : 0}
                    color={lane.color}
                    best={fastest?.key === lane.key ? "Fastest" : null}
                  />
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground tabular-nums">
                  <span className="block">
                    {formatCost(
                      lane.totalCostUsd === null
                        ? null
                        : lane.totalCostUsd / lane.entries.length
                    )}
                  </span>
                  <span className="block">
                    {formatDuration(
                      lane.totalDurationMs === null
                        ? null
                        : lane.totalDurationMs / lane.entries.length
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MeterCell({
  value,
  ratio,
  color,
  best,
}: {
  value: string
  ratio: number
  color: string
  best: string | null
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 font-mono text-sm tabular-nums">
        {value}
      </span>
      <span className="relative h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-muted/60">
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${Math.max(ratio * 100, 2)}%`,
            backgroundColor: color,
          }}
        />
      </span>
      <span
        className={cn(
          "w-16 shrink-0 text-[11px] font-medium text-emerald-300",
          !best && "invisible"
        )}
      >
        {best ?? "—"}
      </span>
    </div>
  )
}

/** What a lane total leaves out: killed attempts' time and unpriced attempts. */
function LaneCaveats({ lane }: { lane: Lane }) {
  const parts = [
    lane.stalledDurationMs > 0
      ? `+${formatDuration(lane.stalledDurationMs)} stalled`
      : null,
    lane.unknownCosts > 0
      ? `${lane.unknownCosts} unpriced${lane.approximateCostUsd > 0 ? ` (~${formatCost(lane.approximateCostUsd)})` : ""}`
      : null,
  ].filter(Boolean)
  if (!parts.length) return null
  return (
    <p
      className="mt-0.5 pl-4 font-mono text-[10px] text-amber-300/80 tabular-nums"
      title="Stalled attempts ended without any billing record and are excluded from model time. Unpriced attempts are excluded from cost; the approximation comes from persisted character-count estimates."
    >
      {parts.join(" · ")}
    </p>
  )
}
