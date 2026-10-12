import {
  closeSync,
  existsSync,
  fstatSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  statSync,
} from "node:fs"
import { join, normalize, resolve, sep } from "node:path"

import { benchmarkRoot, getBenchmarkEntries } from "@/lib/benchmarks.server"
import type {
  RunActivity,
  RunCover,
  RunGroupDetail,
  RunGroupSummary,
  RunTask,
} from "@/lib/runs"

const SKIP_DIRS = new Set(["node_modules", ".git", ".pnpm-store"])
/** Written by `pnpm build:thumbnails` next to each captured screenshot. */
const THUMBNAIL_FILE = "thumbnail.webp"
/** How many app previews a group card shows before collapsing to a count. */
const COVER_LIMIT = 6
/** Run directories without a benchmark id yet are grouped by creation time. */
const PENDING_CLUSTER_MS = 5 * 60 * 1000
/** An unfinished run whose transcript went quiet this long was abandoned. */
const STALE_AFTER_MS = 10 * 60 * 1000
/** Transcript sizes from the previous poll, used to derive a write rate. */
const growth = new Map<string, { size: number; at: number }>()

/** Runs fanned out together share a directory name up to a `-<index>` suffix. */
function runFamily(runId: string) {
  return runId.replace(/-\d+$/, "")
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T
  } catch {
    return null
  }
}

function readText(file: string) {
  try {
    return readFileSync(file, "utf8")
  } catch {
    return null
  }
}

function countFiles(directory: string, budget = 4000) {
  let total = 0
  const stack = [directory]
  while (stack.length && total < budget) {
    const current = stack.pop()!
    let entries
    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) stack.push(join(current, entry.name))
      } else total += 1
    }
  }
  return total
}

/** Transcripts reach tens of megabytes; only the tail is ever read. */
function tailBytes(file: string, bytes: number) {
  const handle = openSync(file, "r")
  try {
    const { size } = fstatSync(handle)
    const length = Math.min(bytes, size)
    const buffer = Buffer.alloc(length)
    readSync(handle, buffer, 0, length, size - length)
    return buffer.toString("utf8")
  } finally {
    closeSync(handle)
  }
}

export function lastActivity(
  file: string,
  bytes = 96 * 1024
): RunActivity | null {
  let chunk
  try {
    chunk = tailBytes(file, bytes)
  } catch {
    return null
  }

  const lines = chunk.split("\n").filter(Boolean)
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    let record: { message?: { content?: unknown } } | null
    try {
      record = JSON.parse(lines[index])
    } catch {
      continue
    }
    const content = record?.message?.content
    if (!Array.isArray(content)) continue

    for (let position = content.length - 1; position >= 0; position -= 1) {
      const block = content[position] as {
        type?: string
        text?: string
        thinking?: string
        name?: string
        input?: Record<string, unknown>
      }
      if (block.type === "text" && block.text?.trim()) {
        return {
          kind: "text",
          name: null,
          value: block.text.trim().replace(/\s+/g, " ").slice(-260),
        }
      }
      if (block.type === "tool_use") {
        const input = block.input ?? {}
        const detail = input.command ?? input.file_path ?? input.pattern ?? ""
        return {
          kind: "tool",
          name: block.name ?? "tool",
          value: String(detail).replace(/\s+/g, " ").slice(0, 220),
        }
      }
      if (block.type === "thinking" && block.thinking?.trim()) {
        return {
          kind: "thinking",
          name: null,
          value: block.thinking.trim().replace(/\s+/g, " ").slice(-260),
        }
      }
    }
  }

  // A single JSONL record can exceed the window (large tool results); widen once.
  return bytes < 1024 * 1024 ? lastActivity(file, 1024 * 1024) : null
}

type RawTask = {
  key: string
  runId: string
  runDir: string
  task: string
  taskDir: string
  model: string
  harness: string
  effort: string
  done: boolean
  stale: boolean
  verification: string | null
  transcript: string
  transcriptBytes: number
  transcriptMtimeMs: number
  appPath: string | null
  port: number | null
  startedAtMs: number
  durationMs: number
  thumbnail: string | null
}

type RawRun = {
  runId: string
  runDir: string
  createdAtMs: number
  benchmarkId: string | null
  tasks: RawTask[]
}

function scanRuns(root: string, now: number): RawRun[] {
  const runsDir = join(root, "runs")
  if (!existsSync(runsDir)) return []

  const runs: RawRun[] = []
  for (const entry of readdirSync(runsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const runDir = join(runsDir, entry.name)
    const dataDir = join(runDir, "data")
    if (!existsSync(dataDir)) continue

    let createdAtMs = 0
    try {
      createdAtMs = statSync(runDir).birthtimeMs
    } catch {
      continue
    }

    const runRecord = readJson<{ benchmark_id?: string }>(
      join(runDir, "run.json")
    )
    let benchmarkId = runRecord?.benchmark_id ?? null
    const tasks: RawTask[] = []

    for (const taskEntry of readdirSync(dataDir, { withFileTypes: true })) {
      if (!taskEntry.isDirectory()) continue
      const taskDir = join(dataDir, taskEntry.name)
      const transcript = join(taskDir, "transcript.jsonl")
      let stat
      try {
        stat = statSync(transcript)
      } catch {
        continue
      }

      const metadata = readJson<{
        benchmark_id?: string
        model?: string
        harness?: string
        effort?: string
        port?: number | null
        app_path?: string
        model_timing?: { started_at?: string; duration_ms?: number } | null
      }>(join(taskDir, "metadata.json"))
      if (!benchmarkId && metadata?.benchmark_id) {
        benchmarkId = metadata.benchmark_id
      }

      // metadata.json and run.json are written only once a run returns, so the
      // recorded invocation is the source of truth for a task still in flight.
      const command = readText(join(taskDir, "command.sh")) ?? ""
      const model =
        metadata?.model ?? /--model (\S+)/.exec(command)?.[1] ?? "unknown"
      const effort =
        metadata?.effort ?? /--effort (\S+)/.exec(command)?.[1] ?? "unknown"
      const harness =
        metadata?.harness ?? runFamily(entry.name).split("-").pop() ?? "cc"

      const startedAtMs = metadata?.model_timing?.started_at
        ? Date.parse(metadata.model_timing.started_at)
        : stat.birthtimeMs
      const appPath = readText(join(taskDir, "app-path.txt"))?.trim() || null
      // Interrupted runs never get metadata.json; only a transcript that is
      // still growing separates one of those from a run genuinely in flight.
      const done = Boolean(metadata)
      const stale = !done && now - stat.mtimeMs > STALE_AFTER_MS

      tasks.push({
        key: `${entry.name}/${taskEntry.name}`,
        runId: entry.name,
        runDir,
        task: taskEntry.name,
        taskDir,
        model,
        harness,
        effort,
        done,
        stale,
        verification:
          readJson<{ status?: string }>(join(taskDir, "verification.json"))
            ?.status ?? null,
        transcript,
        transcriptBytes: stat.size,
        transcriptMtimeMs: stat.mtimeMs,
        appPath,
        port: metadata?.port ?? null,
        startedAtMs,
        durationMs:
          metadata?.model_timing?.duration_ms ??
          (stale ? stat.mtimeMs : now) - startedAtMs,
        thumbnail: existsSync(join(taskDir, THUMBNAIL_FILE))
          ? `/api/run-thumb/${entry.name}/${taskEntry.name}`
          : null,
      })
    }

    if (tasks.length) runs.push({ runId: entry.name, runDir, createdAtMs, benchmarkId, tasks })
  }

  // The catalog resolves continuations and fresh iterations to one current app.
  // Use that identity for the current group instead of counting old launchers.
  const marker = readJson<{ benchmark_id?: string }>(join(root, ".benchmark-live", "current.json"))
  if (marker?.benchmark_id) {
    const current = new Map(getBenchmarkEntries().filter((entry) => entry.benchmarkId === marker.benchmark_id).map((entry) => [`${entry.runId}/${entry.task}`, entry]))
    for (const run of runs) {
      if (run.benchmarkId !== marker.benchmark_id) continue
      run.tasks = run.tasks.flatMap((task) => {
        const entry = current.get(task.key)
        if (!entry) return []
        const latest = [...(entry.accounting?.transcripts ?? [])].sort((a, b) => (b.completedAt ?? b.startedAt ?? "").localeCompare(a.completedAt ?? a.startedAt ?? ""))[0]
        const transcript = latest ? join(root, "runs", latest.transcript) : task.transcript
        const transcriptStat = existsSync(transcript) ? statSync(transcript) : null
        return [{ ...task, model: entry.model, effort: entry.effort, done: ["harness-verified", "verified", "terminated"].includes(entry.status), stale: false, verification: entry.status, appPath: resolve(root, entry.appPath), durationMs: entry.durationMs ?? task.durationMs, transcript, transcriptBytes: entry.accounting?.transcripts.reduce((sum, item) => sum + item.bytes, 0) ?? task.transcriptBytes, transcriptMtimeMs: transcriptStat?.mtimeMs ?? task.transcriptMtimeMs, thumbnail: entry.thumbnail }]
      })
    }
  }
  return runs.filter((run) => run.tasks.length)
}

/**
 * A benchmark in flight has written neither run.json nor metadata.json, so its
 * identity comes from a sibling of the same fan-out that already finished, then
 * from the marker the harness drops when it starts, and failing both from
 * clustering run directories by start time.
 */
function assignPendingIds(root: string, runs: RawRun[]) {
  const pending = runs
    .filter((run) => !run.benchmarkId)
    .sort((left, right) => left.createdAtMs - right.createdAtMs)
  if (!pending.length) return

  const byFamily = new Map<string, string>()
  for (const run of runs) {
    if (run.benchmarkId) byFamily.set(runFamily(run.runId), run.benchmarkId)
  }

  const marker = readJson<{ benchmark_id?: string; started_at?: string }>(
    join(root, ".benchmark-live", "current.json")
  )
  const markerStartedAt = marker?.started_at
    ? Date.parse(marker.started_at)
    : Number.NaN

  let clusterStart = pending[0].createdAtMs
  for (const run of pending) {
    const sibling = byFamily.get(runFamily(run.runId))
    if (sibling) {
      run.benchmarkId = sibling
      continue
    }
    if (run.createdAtMs - clusterStart > PENDING_CLUSTER_MS) {
      clusterStart = run.createdAtMs
    }
    const matchesMarker =
      Number.isFinite(markerStartedAt) &&
      Math.abs(clusterStart - markerStartedAt) <= PENDING_CLUSTER_MS
    run.benchmarkId =
      matchesMarker && marker?.benchmark_id
        ? marker.benchmark_id
        : `pending-${new Date(clusterStart).toISOString()}`
  }
}

function unique(values: string[]) {
  return [...new Set(values)].sort()
}

/** One preview per distinct task, so a group of 16 runs shows its 8 apps. */
function coverStrip(tasks: RawTask[]): RunCover[] {
  const byTask = new Map<string, string>()
  for (const task of [...tasks].sort((left, right) =>
    left.task.localeCompare(right.task)
  )) {
    if (task.thumbnail && !byTask.has(task.task)) {
      byTask.set(task.task, task.thumbnail)
    }
  }
  const entries = [...byTask.entries()]
  // The overflow chip takes a slot of its own, so the strip stays a full grid.
  const shown = entries.length > COVER_LIMIT ? COVER_LIMIT - 1 : COVER_LIMIT
  return entries
    .slice(0, shown)
    .map(([task, thumbnail]) => ({ task, thumbnail }))
}

function summarize(id: string, runs: RawRun[]): RunGroupSummary {
  const tasks = runs.flatMap((run) => run.tasks)
  const startedAtMs = Math.min(...tasks.map((task) => task.startedAtMs))
  const done = tasks.filter((task) => task.done)

  return {
    id,
    startedAt: new Date(startedAtMs).toISOString(),
    models: unique(tasks.map((task) => task.model)),
    harnesses: unique(tasks.map((task) => task.harness)),
    efforts: unique(tasks.map((task) => task.effort)),
    taskNames: unique(tasks.map((task) => task.task)),
    total: tasks.length,
    done: done.length,
    failed: done.filter(
      (task) => task.verification && !["harness-verified", "verified", "terminated"].includes(task.verification)
    ).length,
    live: tasks.some((task) => !task.done && !task.stale),
    transcriptBytes: tasks.reduce((sum, task) => sum + task.transcriptBytes, 0),
    durationMs: Math.max(...tasks.map((task) => task.durationMs)),
    covers: coverStrip(tasks),
  }
}

function groupRuns(now: number) {
  const root = benchmarkRoot()
  const runs = scanRuns(root, now)
  assignPendingIds(root, runs)

  const groups = new Map<string, RawRun[]>()
  for (const run of runs) {
    const id = run.benchmarkId ?? run.runId
    const bucket = groups.get(id)
    if (bucket) bucket.push(run)
    else groups.set(id, [run])
  }
  return groups
}

export function listRunGroups(): RunGroupSummary[] {
  const now = Date.now()
  return [...groupRuns(now).entries()]
    .map(([id, runs]) => summarize(id, runs))
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
}

export function getRunGroup(id: string): RunGroupDetail | null {
  const now = Date.now()
  const runs = groupRuns(now).get(id)
  if (!runs) return null

  const tasks: RunTask[] = runs
    .flatMap((run) => run.tasks)
    .map((task) => {
      const previous = growth.get(task.key)
      const bytesPerSecond =
        previous && now > previous.at
          ? Math.max(
              0,
              Math.round(
                ((task.transcriptBytes - previous.size) / (now - previous.at)) *
                  1000
              )
            )
          : 0
      growth.set(task.key, { size: task.transcriptBytes, at: now })

      return {
        key: task.key,
        runId: task.runId,
        task: task.task,
        model: task.model,
        harness: task.harness,
        effort: task.effort,
        done: task.done,
        stale: task.stale,
        verification: task.verification,
        transcriptBytes: task.transcriptBytes,
        appFiles: task.appPath ? countFiles(task.appPath) : 0,
        idleSeconds: Math.round((now - task.transcriptMtimeMs) / 1000),
        bytesPerSecond,
        durationMs: task.durationMs,
        activity: task.done ? null : lastActivity(task.transcript),
        port: task.port,
        thumbnail: task.thumbnail,
      }
    })
    .sort(
      (left, right) =>
        left.task.localeCompare(right.task) ||
        left.model.localeCompare(right.model) ||
        left.effort.localeCompare(right.effort)
    )

  return {
    ...summarize(id, runs),
    tasks,
    bytesPerSecond: tasks.reduce(
      (sum, task) => sum + (task.done ? 0 : task.bytesPerSecond),
      0
    ),
  }
}

/**
 * Resolves `<runId>/<task>` to its thumbnail, refusing any segment that escapes
 * the runs directory.
 */
export function getRunThumbnail(runId: string, task: string) {
  const runsDir = join(benchmarkRoot(), "runs")
  const file = resolve(
    runsDir,
    `.${normalize(`/${runId}/data/${task}/${THUMBNAIL_FILE}`)}`
  )
  if (!file.startsWith(`${runsDir}${sep}`) || !existsSync(file)) return null
  return new Blob([readFileSync(file)])
}

/** The group a "watch the current benchmark" entry point should land on. */
export function latestRunGroupId(): string | null {
  const groups = listRunGroups()
  return groups.find((group) => group.live)?.id ?? groups.at(0)?.id ?? null
}
