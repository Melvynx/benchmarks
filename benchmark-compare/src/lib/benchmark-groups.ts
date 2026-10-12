import type { BenchmarkEntry } from "./benchmarks.server"

/**
 * Dark-surface categorical slots, assigned in fixed order to the lanes of one
 * run. Identity always ships with a text label, never color alone.
 */
export const LANE_COLORS = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
]

/** Panels one comparison shows side by side. */
export const MAX_COMPARED = 4

export type Lane = {
  key: string
  /** The model name most runs in this lane recorded. */
  model: string
  /** Other names the same lane recorded, e.g. context-window variants. */
  modelVariants: string[]
  harness: string
  effort: string
  color: string
  entries: BenchmarkEntry[]
  completed: number
  failed: number
  running: number
  totalCostUsd: number | null
  totalDurationMs: number | null
  /** Killed or stalled attempts with no billing record, excluded from totalDurationMs. */
  stalledDurationMs: number
  /** Rough price of attempts whose cost is unknown; never part of totalCostUsd. */
  approximateCostUsd: number
  unknownCosts: number
}

export type BenchmarkGroup = {
  id: string
  /** Epoch milliseconds of the earliest recorded start, null when undated. */
  startedAtMs: number | null
  day: string
  tasks: string[]
  lanes: Lane[]
  entries: BenchmarkEntry[]
  completed: number
  failed: number
  /** Apps whose model invocation is still in progress. */
  running: number
  totalCostUsd: number | null
  totalDurationMs: number | null
  /** Longest single run: a concurrent group finishes when its slowest does. */
  wallDurationMs: number | null
  thumbnails: Array<{ task: string; src: string }>
}

/**
 * A lane is one model/harness/effort configuration inside a run. Run IDs carry
 * `-2`, `-3` suffixes per task, so stripping the suffix recovers the lane even
 * when the recorded model name drifts between tasks.
 */
export function laneKey(entry: BenchmarkEntry) {
  const model = (entry.accounting?.transcripts[0]?.model ?? entry.model).replace(/-(?:256k|1m)(?=-|$)/g, "").replace(/-(?:extra-high|medium|xhigh|high|low)$/, "")
  return `${entry.benchmarkId}|${model}|${entry.harness}|${entry.effort}`
}

function sumOrNull(values: Array<number | null>) {
  const known = values.filter((value): value is number => value !== null)
  return known.length ? known.reduce((total, value) => total + value, 0) : null
}

function isFailure(status: string) {
  return status === "failed" || status === "interrupted"
}

function isSuccess(status: string) {
  return status === "harness-verified" || status === "verified" || status === "terminated"
}

function isRunning(status: string) {
  return status === "running"
}

export function buildLanes(entries: BenchmarkEntry[]): Lane[] {
  const byKey = new Map<string, BenchmarkEntry[]>()
  for (const entry of entries) {
    const key = laneKey(entry)
    byKey.set(key, [...(byKey.get(key) ?? []), entry])
  }

  return [...byKey.entries()]
    .map(([key, laneEntries]) => {
      const modelCounts = new Map<string, number>()
      for (const entry of laneEntries)
        modelCounts.set(entry.model, (modelCounts.get(entry.model) ?? 0) + 1)
      const models = [...modelCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([model]) => model)
      return {
        key,
        model: models[0],
        modelVariants: models.slice(1),
        harness: laneEntries[0].harness,
        effort: laneEntries[0].effort,
        color: "",
        entries: laneEntries,
        completed: laneEntries.filter((entry) => isSuccess(entry.status)).length,
        failed: laneEntries.filter((entry) => isFailure(entry.status)).length,
        running: laneEntries.filter((entry) => isRunning(entry.status)).length,
        totalCostUsd: sumOrNull(laneEntries.map((entry) => entry.costUsd)),
        totalDurationMs: sumOrNull(laneEntries.map((entry) => entry.durationMs)),
        stalledDurationMs: laneEntries.reduce((sum, entry) => sum + (entry.accounting?.stalledDurationMs ?? 0), 0),
        approximateCostUsd: laneEntries.reduce((sum, entry) => sum + (entry.accounting?.approximateCostUsd ?? 0), 0),
        unknownCosts: laneEntries.reduce((sum, entry) => sum + (entry.accounting?.unknownCosts ?? 0), 0),
      }
    })
    .sort(
      (left, right) =>
        left.model.localeCompare(right.model) ||
        left.harness.localeCompare(right.harness)
    )
    .map((lane, index) => ({
      ...lane,
      color: LANE_COLORS[index % LANE_COLORS.length],
    }))
}

function timestampFromId(id: string) {
  const match = /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/.exec(id)
  if (!match) return null
  const [, year, month, day, hour, minute, second] = match.map(Number)
  return Date.UTC(year, month - 1, day, hour, minute, second)
}

export function buildBenchmarkGroups(entries: BenchmarkEntry[]) {
  const byId = new Map<string, BenchmarkEntry[]>()
  for (const entry of entries) {
    byId.set(entry.benchmarkId, [...(byId.get(entry.benchmarkId) ?? []), entry])
  }

  const groups: BenchmarkGroup[] = [...byId.entries()].map(([id, groupEntries]) => {
    const starts = groupEntries
      .map((entry) => (entry.startedAt ? Date.parse(entry.startedAt) : NaN))
      .filter((value) => Number.isFinite(value))
    const startedAtMs = timestampFromId(id) ?? (starts.length ? Math.min(...starts) : null)
    const dayFromEntries = groupEntries.find((entry) => entry.date !== "unknown")?.date
    const durations = groupEntries
      .map((entry) => entry.durationMs)
      .filter((value): value is number => value !== null)
    const thumbnails = new Map<string, string>()
    for (const entry of groupEntries) {
      if (entry.thumbnail && !thumbnails.has(entry.task))
        thumbnails.set(entry.task, entry.thumbnail)
    }
    return {
      id,
      startedAtMs,
      day:
        startedAtMs !== null
          ? new Date(startedAtMs).toISOString().slice(0, 10)
          : dayFromEntries ?? "unknown",
      tasks: [...new Set(groupEntries.map((entry) => entry.task))].sort(),
      lanes: buildLanes(groupEntries),
      entries: groupEntries,
      completed: groupEntries.filter((entry) => isSuccess(entry.status)).length,
      failed: groupEntries.filter((entry) => isFailure(entry.status)).length,
      running: groupEntries.filter((entry) => isRunning(entry.status)).length,
      totalCostUsd: sumOrNull(groupEntries.map((entry) => entry.costUsd)),
      totalDurationMs: sumOrNull(groupEntries.map((entry) => entry.durationMs)),
      wallDurationMs: (() => {
        const ledgers = groupEntries.flatMap((entry) => entry.accounting ? [entry.accounting] : [])
        const begin = ledgers.flatMap((item) => item.startedAt ? [Date.parse(item.startedAt)] : [])
        const end = ledgers.flatMap((item) => item.completedAt ? [Date.parse(item.completedAt)] : item.startedAt ? [Date.now()] : [])
        return begin.length && end.length ? Math.max(...end) - Math.min(...begin) : durations.length ? Math.max(...durations) : null
      })(),
      thumbnails: [...thumbnails.entries()].map(([task, src]) => ({ task, src })),
    }
  })

  return groups.sort(
    (left, right) =>
      (right.startedAtMs ?? 0) - (left.startedAtMs ?? 0) ||
      right.day.localeCompare(left.day) ||
      right.id.localeCompare(left.id)
  )
}

/** A comparison group is only worth listing when it holds more than one run. */
export function isComparable(group: BenchmarkGroup) {
  return group.entries.length > 1
}

export function groupTitle(group: BenchmarkGroup) {
  if (group.tasks.length === 1) return group.tasks[0]
  return `${group.tasks.length} tasks`
}

/** Short model names for chips: drops vendor prefixes a lane label repeats. */
export function shortModel(model: string) {
  return model.replace(/^(claude-|cursor-)/, "")
}

export type TaskSummary = {
  task: string
  entries: BenchmarkEntry[]
  models: number
  /** Newest app first; the entry that represents the task in lists. */
  latest: BenchmarkEntry
  latestDay: string
  thumbnail: string | null
  promptSlug: string | null
  promptVersion: string | null
}

function entryTime(entry: BenchmarkEntry) {
  const parsed = entry.startedAt ? Date.parse(entry.startedAt) : NaN
  if (Number.isFinite(parsed)) return parsed
  const day = Date.parse(`${entry.date}T00:00:00Z`)
  return Number.isFinite(day) ? day : 0
}

/** Newest first, with undated legacy results last. */
export function sortByNewest(entries: BenchmarkEntry[]) {
  return [...entries].sort(
    (left, right) =>
      entryTime(right) - entryTime(left) || left.model.localeCompare(right.model)
  )
}

function promptVersionNumber(version: string | null) {
  return Number(/\d+/.exec(version ?? "")?.[0] ?? -1)
}

/** One row per task, newest activity first: the task navigator's source. */
export function buildTaskSummaries(entries: BenchmarkEntry[]): TaskSummary[] {
  const byTask = new Map<string, BenchmarkEntry[]>()
  for (const entry of entries)
    byTask.set(entry.task, [...(byTask.get(entry.task) ?? []), entry])

  return [...byTask.entries()]
    .map(([task, taskEntries]) => {
      const sorted = sortByNewest(taskEntries)
      const prompt = [...taskEntries]
        .filter((entry) => entry.promptSlug && entry.promptVersion)
        .sort(
          (left, right) =>
            promptVersionNumber(right.promptVersion) -
            promptVersionNumber(left.promptVersion)
        )[0]
      return {
        task,
        entries: sorted,
        models: new Set(taskEntries.map((entry) => entry.model)).size,
        latest: sorted[0],
        latestDay: sorted[0].date,
        thumbnail: sorted.find((entry) => entry.thumbnail)?.thumbnail ?? null,
        promptSlug: prompt?.promptSlug ?? null,
        promptVersion: prompt?.promptVersion ?? null,
      }
    })
    .sort(
      (left, right) =>
        entryTime(right.latest) - entryTime(left.latest) ||
        left.task.localeCompare(right.task)
    )
}

/** Lane models, shortened and joined: what a run actually compares. */
export function groupModels(group: BenchmarkGroup) {
  return group.lanes.map((lane) => shortModel(lane.model)).join(" · ")
}
