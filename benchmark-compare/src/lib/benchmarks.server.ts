import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  statSync,
} from "node:fs"
import {
  basename,
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
  sep,
} from "node:path"

import type {
  TranscriptAnalysis,
  TranscriptPhaseKey,
} from "@/components/transcript-phase-chart"
import { analyzeIntegrityTranscript } from "@/lib/integrity-analysis"
import { parseModelReview } from "@/lib/model-review"
import {
  type SessionUsage,
  type UsageStep,
} from "@/lib/session-usage"
import { activeTranscriptDurationMs } from "@/lib/transcript-duration"
import { continuationSource } from "@/lib/continuations.server"
import { readTranscriptAccounting } from "./transcript-accounting.server"
import type { TranscriptAccounting } from "./transcript-accounting.server"

export type BenchmarkEntry = {
  id: string
  task: string
  result: string
  date: string
  model: string
  harness: string
  effort: string
  status: string
  durationMs: number | null
  benchmarkId: string
  runId: string
  appPath: string
  hasPreview: boolean
  hasTranscript: boolean
  promptSlug: string | null
  promptVersion: string | null
  promptUrl: string | null
  source: "build" | "standalone"
  url: string
  costUsd: number | null
  accounting?: TranscriptAccounting
  /** ISO timestamp of the model invocation, or the run folder's timestamp. */
  startedAt: string | null
  /** WebP preview of the captured screenshot, when one was built. */
  thumbnail: string | null
}

const ignored = new Set([
  ".agents",
  ".git",
  "benchmark-compare",
  "benchmark-compare-next",
  "build",
  "dist",
  "node_modules",
  "runs",
])

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  // Some builders strip TypeScript while retaining the .ts module extension.
  ".ts": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

export function benchmarkRoot() {
  return resolve(process.env.BENCHMARK_ROOT || join(process.cwd(), ".."))
}

function benchmarkResultsRoot(root: string) {
  return join(root, "benchmarks")
}

function isWithinRoot(root: string, target: string) {
  const pathFromRoot = relative(root, target)
  return (
    pathFromRoot === "" ||
    (pathFromRoot !== ".." &&
      !pathFromRoot.startsWith(`..${sep}`) &&
      !isAbsolute(pathFromRoot))
  )
}

function repositoryPath(root: string, target: string) {
  return relative(root, target).split(sep).join("/")
}

function resolveRecordedAppPath(root: string, task: string, recorded: string) {
  const recordedPath = resolve(recorded)
  if (existsSync(recordedPath) && isWithinRoot(root, recordedPath)) {
    return recordedPath
  }

  return resolve(benchmarkResultsRoot(root), task, basename(recordedPath))
}

function transcriptFiles(directory: string) {
  if (!existsSync(directory)) return []
  return readdirSync(directory)
    .filter((file) => /^transcript(?:-resume-\d+)?\.jsonl$/.test(file))
    .sort((left, right) => {
      if (left === "transcript.jsonl") return -1
      if (right === "transcript.jsonl") return 1
      const leftResume = Number(/resume-(\d+)/.exec(left)?.[1] ?? 0)
      const rightResume = Number(/resume-(\d+)/.exec(right)?.[1] ?? 0)
      return leftResume - rightResume
    })
}

type RunEvidence = {
  superseded?: boolean
  currentDirectory?: string
  directory: string
  harness: string
  model: string
  effort: string
  durationMs: number | null
  benchmarkId: string
  runId: string
  promptSlug: string | null
  promptVersion: string | null
  status: string
  repairStatus: string
}

function promptIdentity(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") continue
    const match = /(?:^|\/)prompts\/([^/]+)\/(v\d+)(?:\.md)?(?:$|[?#])/.exec(
      value
    )
    if (match) return { promptSlug: match[1], promptVersion: match[2] }
  }
  return { promptSlug: null, promptVersion: null }
}

function normalizeRunToken(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

const TRANSCRIPT_HEAD_BYTES = 16 * 1024
const activeDurationCache = new Map<
  string,
  { mtimeMs: number; size: number; durationMs: number | null }
>()

function readFileHead(path: string, maxBytes: number) {
  const fd = openSync(path, "r")
  try {
    const buffer = Buffer.alloc(maxBytes)
    const bytes = readSync(fd, buffer, 0, maxBytes, 0)
    return buffer.toString("utf8", 0, bytes)
  } finally {
    closeSync(fd)
  }
}

function cachedActiveTranscriptDurationMs(path: string) {
  const stats = statSync(path)
  const cached = activeDurationCache.get(path)
  if (
    cached &&
    cached.mtimeMs === stats.mtimeMs &&
    cached.size === stats.size
  ) {
    return cached.durationMs
  }
  const durationMs = activeTranscriptDurationMs(readFileSync(path, "utf8"))
  activeDurationCache.set(path, {
    mtimeMs: stats.mtimeMs,
    size: stats.size,
    durationMs,
  })
  return durationMs
}

function recordedCursorModel(directory: string, fallback: string) {
  const transcript = transcriptFiles(directory)[0]
  if (!transcript) return fallback

  try {
    for (const line of readFileHead(
      join(directory, transcript),
      TRANSCRIPT_HEAD_BYTES
    ).split("\n")) {
      if (!line.trim()) continue
      const event = JSON.parse(line) as {
        type?: unknown
        subtype?: unknown
        model?: unknown
      }
      if (
        event.type !== "system" ||
        event.subtype !== "init" ||
        typeof event.model !== "string"
      )
        continue

      const recorded = event.model
        .replace(/^Cursor\s+/i, "cursor-")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
      return normalizeRunToken(recorded) === normalizeRunToken(fallback)
        ? fallback
        : recorded
    }
  } catch {
    // Partial historical transcripts keep their metadata identity.
  }

  return fallback
}

function runTimestamp(runId: string) {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/.exec(runId)
  if (!match) return null
  const [, year, month, day, hour, minute, second] = match
  return {
    milliseconds: Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ),
    token: `${year}${month}${day}T${hour}${minute}${second}Z`,
  }
}

function benchmarkIdsByRun(root: string) {
  const benchmarkIds = new Map<string, string>()
  const pending = new Map<
    string,
    Array<{
      key: string
      task: string
      milliseconds: number
      timestamp: string
    }>
  >()
  const runs = join(root, "runs")
  if (!existsSync(runs)) return benchmarkIds

  for (const run of readdirSync(runs, { withFileTypes: true })) {
    if (!run.isDirectory()) continue
    const timestamp = runTimestamp(run.name)
    const data = join(runs, run.name, "data")
    if (!existsSync(data)) continue

    for (const task of readdirSync(data, { withFileTypes: true })) {
      if (!task.isDirectory()) continue
      const metadataFile = join(data, task.name, "metadata.json")
      if (!existsSync(metadataFile)) continue
      const key = `${run.name}/${task.name}`
      try {
        const metadata = JSON.parse(readFileSync(metadataFile, "utf8")) as {
          benchmark_id?: unknown
          prompt_public_url?: unknown
          prompt_source?: unknown
        }
        if (
          typeof metadata.benchmark_id === "string" &&
          metadata.benchmark_id
        ) {
          benchmarkIds.set(key, metadata.benchmark_id)
          continue
        }
        if (!timestamp) {
          benchmarkIds.set(key, run.name)
          continue
        }

        const prompt =
          typeof metadata.prompt_source === "string"
            ? metadata.prompt_source
            : typeof metadata.prompt_public_url === "string"
              ? metadata.prompt_public_url
              : "unknown-prompt"
        const groupKey = `${task.name}\u0000${prompt}`
        const candidates = pending.get(groupKey) || []
        candidates.push({
          key,
          task: task.name,
          milliseconds: timestamp.milliseconds,
          timestamp: timestamp.token,
        })
        pending.set(groupKey, candidates)
      } catch {
        benchmarkIds.set(key, run.name)
      }
    }
  }

  for (const candidates of pending.values()) {
    candidates.sort((left, right) => left.milliseconds - right.milliseconds)
    let clusterStart = candidates[0]
    for (const candidate of candidates) {
      if (candidate.milliseconds - clusterStart.milliseconds > 30_000) {
        clusterStart = candidate
      }
      benchmarkIds.set(
        candidate.key,
        `legacy-${clusterStart.timestamp}-${clusterStart.task}`
      )
    }
  }

  return benchmarkIds
}

function recordedMetadata(directory: string) {
  try {
    const metadata = JSON.parse(
      readFileSync(join(directory, "metadata.json"), "utf8")
    ) as {
      effort?: unknown
      benchmark_id?: unknown
      status?: unknown
      repair_note?: { status?: unknown } | null
      model_timing?: { duration_ms?: unknown } | null
      prompt_public_url?: unknown
      prompt_source?: unknown
    }
    const prompt = promptIdentity(
      metadata.prompt_source,
      metadata.prompt_public_url
    )
    return {
      effort:
        typeof metadata.effort === "string" && metadata.effort
          ? metadata.effort
          : "unknown",
      durationMs:
        typeof metadata.model_timing?.duration_ms === "number" &&
        Number.isFinite(metadata.model_timing.duration_ms) &&
        metadata.model_timing.duration_ms >= 0
          ? metadata.model_timing.duration_ms
          : null,
      benchmarkId:
        typeof metadata.benchmark_id === "string" && metadata.benchmark_id
          ? metadata.benchmark_id
          : "",
      status: typeof metadata.status === "string" ? metadata.status : "unknown",
      repairStatus:
        typeof metadata.repair_note?.status === "string"
          ? metadata.repair_note.status
          : "unknown",
      ...prompt,
    }
  } catch {
    return {
      effort: "unknown",
      durationMs: null,
      benchmarkId: "",
      status: "unknown",
      repairStatus: "unknown",
      promptSlug: null,
      promptVersion: null,
    }
  }
}

function runNameMatchesIdentity(
  runName: string,
  dateToken: string,
  identity: { harness: string; model: string }
) {
  if (!runName.startsWith(dateToken)) return false
  const suffix = `-${normalizeRunToken(identity.model)}-${normalizeRunToken(identity.harness)}`
  return runName.endsWith(suffix) || runName.match(new RegExp(`${suffix}-\\d+$`))
}

function identityFromRunDirectory(runName: string) {
  const stripped = runName.replace(/^\d{8}T\d{6}Z-/, "").replace(/-\d+$/, "")
  const harnesses = ["cursor-agent", "opencode", "muse", "codex", "ccx", "cc"]
  const harness = harnesses.find((value) => stripped.endsWith(`-${value}`))
  if (!harness) return null
  return {
    harness,
    model: stripped.slice(0, -(harness.length + 1)),
  }
}

function historicalEvidence(
  root: string,
  task: string,
  date: string,
  identity: { harness: string; model: string },
  benchmarkIds: Map<string, string>
) {
  const runs = join(root, "runs")
  if (!existsSync(runs) || date === "unknown") return undefined
  const dateToken = date.replaceAll("-", "")
  const candidates = readdirSync(runs, { withFileTypes: true })
    .filter(
      (run) =>
        run.isDirectory() && runNameMatchesIdentity(run.name, dateToken, identity)
    )
    .map((run) => {
      const directory = join(runs, run.name, "data", task)
      const metadata = recordedMetadata(directory)
      return {
        directory,
        harness: identity.harness,
        model: identity.model,
        effort: metadata.effort,
        durationMs: metadata.durationMs,
        benchmarkId:
          metadata.benchmarkId ||
          benchmarkIds.get(`${run.name}/${task}`) ||
          run.name,
        runId: run.name,
        status: metadata.status,
        repairStatus: metadata.repairStatus,
        promptSlug: metadata.promptSlug,
        promptVersion: metadata.promptVersion,
      }
    })
    .filter((candidate) => existsSync(candidate.directory))
    .sort((left, right) => {
      const transcriptDifference =
        Number(existsSync(join(right.directory, "transcript.jsonl"))) -
        Number(existsSync(join(left.directory, "transcript.jsonl")))
      return transcriptDifference || right.runId.localeCompare(left.runId)
    })
  return candidates[0]
}

function metadataByAppPath(root: string, benchmarkIds: Map<string, string>) {
  const metadata = new Map<string, RunEvidence>()
  const runs = join(root, "runs")
  if (!existsSync(runs)) return metadata

  const runDirectories = readdirSync(runs, { withFileTypes: true })
    .filter((run) => run.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))
  for (const run of runDirectories) {
    if (!run.isDirectory()) continue
    const data = join(runs, run.name, "data")
    if (!existsSync(data)) continue
    for (const task of readdirSync(data, { withFileTypes: true })) {
      if (!task.isDirectory()) continue
      const taskData = join(data, task.name)
      const appPathFile = join(taskData, "app-path.txt")
      const metadataFile = join(taskData, "metadata.json")
      if (!existsSync(appPathFile)) continue
      if (!existsSync(metadataFile)) {
        if (!transcriptFiles(taskData).length) continue
        const inferred = identityFromRunDirectory(run.name)
        if (!inferred) continue
        try {
          const appPath = resolveRecordedAppPath(
            root,
            task.name,
            readFileSync(appPathFile, "utf8").trim()
          )
          const candidate = {
            directory: taskData,
            effort: "unknown",
            benchmarkId: benchmarkIds.get(`${run.name}/${task.name}`) || run.name,
            durationMs: null,
            harness: inferred.harness,
            model:
              inferred.harness === "cursor-agent"
                ? recordedCursorModel(taskData, inferred.model)
                : inferred.model,
            runId: run.name,
            status: existsSync(join(taskData, "final.txt"))
              ? "unknown"
              : "interrupted",
            repairStatus: "unknown",
            promptSlug: null,
            promptVersion: null,
          }
          const previous = metadata.get(appPath)
          if (!previous || !transcriptFiles(previous.directory).length) {
            metadata.set(appPath, candidate)
          }
        } catch {
          // Partial historical evidence can omit metadata; filename inference remains.
        }
        continue
      }
      try {
        const appPath = resolveRecordedAppPath(
          root,
          task.name,
          readFileSync(appPathFile, "utf8").trim()
        )
        let value = JSON.parse(readFileSync(metadataFile, "utf8")) as {
          effort?: string
          benchmark_id?: string
          harness?: string
          model?: string
          status?: string
          repair_note?: { status?: unknown } | null
          model_timing?: { duration_ms?: unknown } | null
          app_path?: string
          prompt_public_url?: unknown
          prompt_source?: unknown
        }
        let currentDirectory = taskData
        let latestAppPath = appPath
        const iterations = join(taskData, "iterations")
        if (existsSync(iterations)) {
          const latest = readdirSync(iterations).filter((name) => /^\d+$/.test(name)).sort((a, b) => Number(b) - Number(a))[0]
          if (latest) {
            const iteration = join(iterations, latest)
            currentDirectory = iteration
            const latestMetadata = join(iteration, "metadata.json")
            if (existsSync(latestMetadata)) value = { ...value, ...JSON.parse(readFileSync(latestMetadata, "utf8")) }
            if (value.app_path) latestAppPath = resolveRecordedAppPath(root, task.name, value.app_path)
            const latestPath = join(iteration, "app-path.txt")
            if (existsSync(latestPath)) latestAppPath = resolveRecordedAppPath(root, task.name, readFileSync(latestPath, "utf8").trim())
          }
        }
        if (value.harness && value.model) {
          const prompt = promptIdentity(
            value.prompt_source,
            value.prompt_public_url
          )
          const candidate = {
            directory: taskData,
            currentDirectory,
            effort: value.effort || "unknown",
            benchmarkId:
              value.benchmark_id ||
              benchmarkIds.get(`${run.name}/${task.name}`) ||
              run.name,
            durationMs:
              typeof value.model_timing?.duration_ms === "number" &&
              Number.isFinite(value.model_timing.duration_ms) &&
              value.model_timing.duration_ms >= 0
                ? value.model_timing.duration_ms
                : null,
            harness: value.harness,
            model:
              value.harness === "cursor-agent"
                ? recordedCursorModel(taskData, value.model)
                : value.model,
            runId: run.name,
            status: typeof value.status === "string" ? value.status : "unknown",
            repairStatus:
              typeof value.repair_note?.status === "string"
                ? value.repair_note.status
                : "unknown",
            ...prompt,
          }
          const previous = metadata.get(appPath)
          const candidateHasTranscript =
            transcriptFiles(candidate.directory).length > 0
          const previousHasTranscript = Boolean(
            previous && transcriptFiles(previous.directory).length > 0
          )
          if (!previous || candidateHasTranscript || !previousHasTranscript) {
            if (latestAppPath !== appPath) metadata.set(appPath, { ...candidate, superseded: true })
            metadata.set(latestAppPath, candidate)
          }
        }
      } catch {
        // Historical evidence can be partial; filename inference remains available.
      }
    }
  }
  return metadata
}

function inferIdentity(result: string) {
  const name = result.replace(/^\d{4}-\d{2}-\d{2}-?/, "")
  const prefixes = ["cursor-agent", "muse", "codex", "ccx", "cc"]
  const prefix = prefixes.find((value) => name.startsWith(`${value}-`))
  if (prefix) return { harness: prefix, model: name.slice(prefix.length + 1) }

  const suffixes: Array<[string, string]> = [
    ["cursor-agent", "cursor-agent"],
    ["cursor", "cursor-agent"],
    ["opencode", "opencode"],
    ["codex", "codex"],
    ["ccx", "ccx"],
    ["cc", "cc"],
  ]
  const suffix = suffixes.find(([value]) => name.endsWith(`-${value}`))
  if (suffix) {
    return {
      harness: suffix[1],
      model: name.slice(0, -(suffix[0].length + 1)),
    }
  }
  return { harness: "unknown", model: name }
}

let catalogCache: { root: string; at: number; entries: BenchmarkEntry[] } | null = null

export function getBenchmarkEntries(): BenchmarkEntry[] {
  const root = benchmarkRoot()
  if (catalogCache?.root === root && Date.now() - catalogCache.at < 10_000) return catalogCache.entries
  const resultsRoot = benchmarkResultsRoot(root)
  const benchmarkIds = benchmarkIdsByRun(root)
  const evidence = metadataByAppPath(root, benchmarkIds)
  const entries: BenchmarkEntry[] = []

  if (!existsSync(resultsRoot)) return entries

  for (const task of readdirSync(resultsRoot, { withFileTypes: true })) {
    if (
      !task.isDirectory() ||
      task.name.startsWith(".") ||
      ignored.has(task.name)
    )
      continue
    const taskDirectory = join(resultsRoot, task.name)
    for (const result of readdirSync(taskDirectory, { withFileTypes: true })) {
      if (
        !result.isDirectory() ||
        result.name.startsWith(".") ||
        ignored.has(result.name)
      )
        continue
      const resultDirectory = join(taskDirectory, result.name)
      const distDirectory = join(resultDirectory, "dist")
      const outputDirectory = existsSync(join(distDirectory, "index.html"))
        ? distDirectory
        : resultDirectory
      const previewIndex = join(outputDirectory, "index.html")
      const hasPreview =
        existsSync(previewIndex) &&
        (outputDirectory === distDirectory ||
          !usesUncompiledDevSources(previewIndex))

      const appDirectory = resolve(resultDirectory)
      const date = /^\d{4}-\d{2}-\d{2}/.exec(result.name)?.[0] || "unknown"
      const inferredIdentity = inferIdentity(result.name)
      const runEvidence: RunEvidence | undefined =
        evidence.get(appDirectory) ||
        historicalEvidence(
          root,
          task.name,
          date,
          inferredIdentity,
          benchmarkIds
        )
      if (runEvidence?.superseded) continue
      const identity = runEvidence || inferredIdentity
      const hasTranscript = Boolean(
        runEvidence && transcriptFiles(runEvidence.directory).length > 0
      )
      if (!hasPreview && !hasTranscript) continue
      if (
        runEvidence?.status === "failed" &&
        runEvidence.repairStatus !== "verified" &&
        !hasTranscript &&
        !existsSync(join(runEvidence.directory, "screenshot.png"))
      )
        continue
      const id = `${task.name}/${result.name}`
      const activeSegments =
        identity.harness === "cursor-agent" && runEvidence
          ? transcriptFiles(runEvidence.directory)
              .map((file) =>
                cachedActiveTranscriptDurationMs(
                  join(runEvidence.directory, file)
                )
              )
              .filter((duration): duration is number => duration !== null)
          : []
      const activeDuration = activeSegments.length
        ? activeSegments.reduce((total, duration) => total + duration, 0)
        : null
      // The ledger replays every transcript in the attempt chain: build it once.
      const accounting = runEvidence
        ? readTranscriptAccounting(runEvidence.directory)
        : undefined
      entries.push({
        id,
        task: task.name,
        result: result.name,
        date,
        model: identity.model,
        harness: identity.harness,
        effort: runEvidence?.effort || "unknown",
        status: runEvidence?.status || "unknown",
        durationMs:
          accounting?.durationMs ??
          activeDuration ??
          runEvidence?.durationMs ??
          null,
        benchmarkId:
          runEvidence?.benchmarkId ||
          runEvidence?.runId ||
          `legacy-result-${task.name}-${result.name}`,
        runId: runEvidence?.runId || result.name,
        appPath: repositoryPath(root, appDirectory),
        hasPreview,
        hasTranscript,
        promptSlug: runEvidence?.promptSlug || null,
        promptVersion: runEvidence?.promptVersion || null,
        promptUrl:
          runEvidence?.promptSlug && runEvidence.promptVersion
            ? `/prompts/${encodeURIComponent(runEvidence.promptSlug)}/${encodeURIComponent(runEvidence.promptVersion)}`
            : null,
        source: outputDirectory === distDirectory ? "build" : "standalone",
        url: `/view/${id.split("/").map(encodeURIComponent).join("/")}/`,
        costUsd: accounting?.costUsd ?? null,
        accounting,
        startedAt: entryStartedAt(runEvidence),
        thumbnail: existsSync(join(process.cwd(), "public", "thumbs", `${id.replaceAll("/", "__")}.webp`))
          ? `/thumbs/${id.replaceAll("/", "__")}.webp`
          : runEvidence &&
          existsSync(join(runEvidence.directory, "thumbnail.webp"))
            ? `/api/run-thumb/${encodeURIComponent(runEvidence.runId)}/${encodeURIComponent(basename(runEvidence.directory))}`
            : null,
      })
    }
  }

  // One source can be recovered more than once; every recovery's ledger already
  // covers the whole chain, so only the newest stands in for the original.
  const recovered = new Map<string, BenchmarkEntry>()
  for (const recovery of [...entries]) {
    const directory = evidence.get(resolve(root, recovery.appPath))?.directory
    if (!directory) continue
    const source = continuationSource(directory)
    if (!source) continue
    const sourcePath = resolve(readOptional(join(source, "app-path.txt")).trim())
    const previous = recovered.get(sourcePath)
    if (previous) {
      if (recovery.result > previous.result) {
        const merged = { ...recovery, id: previous.id, runId: previous.runId, model: previous.model, harness: previous.harness, effort: previous.effort, benchmarkId: previous.benchmarkId, startedAt: previous.startedAt }
        entries[entries.indexOf(previous)] = merged
        recovered.set(sourcePath, merged)
      }
      entries.splice(entries.indexOf(recovery), 1)
      continue
    }
    const originalIndex = entries.findIndex((entry) => resolve(root, entry.appPath) === sourcePath)
    if (originalIndex < 0) continue
    const original = entries[originalIndex]
    entries[originalIndex] = { ...recovery, id: original.id, runId: original.runId, model: original.model, harness: original.harness, effort: original.effort, benchmarkId: original.benchmarkId, startedAt: original.startedAt }
    recovered.set(sourcePath, entries[originalIndex])
    entries.splice(entries.indexOf(recovery), 1)
  }

  for (const entry of entries) {
    const name = `${entry.id.replaceAll("/", "__")}.webp`
    if (existsSync(join(process.cwd(), "public", "thumbs", name))) entry.thumbnail = `/thumbs/${name}`
  }
  catalogCache = { root, at: Date.now(), entries }
  return entries.sort(
    (left, right) =>
      right.result.localeCompare(left.result) ||
      left.task.localeCompare(right.task)
  )
}

function entryStartedAt(runEvidence: RunEvidence | undefined) {
  if (!runEvidence) return null
  try {
    const metadata = JSON.parse(
      readFileSync(join(runEvidence.directory, "metadata.json"), "utf8")
    ) as { model_timing?: { started_at?: unknown } | null }
    const startedAt = metadata.model_timing?.started_at
    if (typeof startedAt === "string" && !Number.isNaN(Date.parse(startedAt)))
      return new Date(startedAt).toISOString()
  } catch {
    // Historical runs can omit metadata; the folder timestamp remains.
  }
  const timestamp = runTimestamp(runEvidence.runId)
  return timestamp ? new Date(timestamp.milliseconds).toISOString() : null
}

function usesUncompiledDevSources(htmlPath: string) {
  return /(?:src|href)=["'][^"']*\/?src\/[^"']*\.(?:ts|tsx|jsx)(?:[?][^"']*)?["']/i.test(readFileSync(htmlPath, "utf8"))
}

function readOptional(file: string) {
  return existsSync(file) ? readFileSync(file, "utf8") : ""
}

const transcriptPhaseKeys: TranscriptPhaseKey[] = [
  "context_gathering",
  "planning",
  "implementation",
  "verification",
]

function readTranscriptAnalysis(directory: string): TranscriptAnalysis | null {
  try {
    const metadata = JSON.parse(
      readFileSync(join(directory, "metadata.json"), "utf8")
    ) as { transcript_analysis?: unknown }
    const candidate =
      metadata.transcript_analysis as Partial<TranscriptAnalysis>
    if (candidate.status !== "complete" || !candidate.categories) return null

    const isValid = transcriptPhaseKeys.every((key) => {
      const phase = candidate.categories?.[key]
      return (
        phase &&
        typeof phase.percentage === "number" &&
        Number.isFinite(phase.percentage) &&
        phase.percentage >= 0 &&
        phase.percentage <= 100 &&
        typeof phase.activity_characters === "number" &&
        typeof phase.segments === "number"
      )
    })
    return isValid ? (candidate as TranscriptAnalysis) : null
  } catch {
    return null
  }
}

/**
 * Sum model invocation time across the complete recorded attempt chain.
 */
function withIterationDuration(baseMs: number | null, directory: string | undefined) {
  if (!directory) return baseMs
  const ledger = readTranscriptAccounting(directory)
  return ledger.durationMs ?? baseMs
}

const CUMULATIVE_COUNTERS = [
  "input_tokens", "cached_input_tokens", "cache_creation_input_tokens",
  "processed_input_tokens", "output_tokens", "reasoning_output_tokens", "total_tokens",
] as const

function billedUsageSteps(_harness: string, directory: string, _durationMs: number | null): UsageStep[] {
  return readTranscriptAccounting(directory).transcripts.flatMap((step) => step.usage ? [{
    label: `${step.model} · ${step.harness} · ${step.transcript}`,
    durationMs: step.durationMs, usage: step.usage, model: step.model,
    costUsd: step.costUsd,
  }] : [])
}

const SUMMED_COUNTERS = [...CUMULATIVE_COUNTERS, "duration_api_ms", "total_cost_usd"] as const

/** Pricing is linear in tokens, so the summed usage prices to the summed cost. */
function aggregateUsage(steps: UsageStep[]): SessionUsage | null {
  if (!steps.length) return null
  if (steps.length === 1) return steps[0].usage
  const total = { ...steps[0].usage, model_usage: null } as SessionUsage
  const record = total as unknown as Record<string, number | null>
  for (const key of SUMMED_COUNTERS) {
    const values = steps.map((step) => step.usage[key])
    record[key] = values.every((value) => typeof value !== "number")
      ? null
      : values.reduce<number>(
          (sum, value) => sum + (typeof value === "number" ? value : 0),
          0
        )
  }
  return total
}

function readModelReview(directory: string) {
  try {
    return parseModelReview(
      JSON.parse(readFileSync(join(directory, "review.json"), "utf8"))
    )
  } catch {
    return null
  }
}

function readTranscriptForUi(transcript: string) {
  if (transcript.length < 1_000_000) {
    return { transcript, transcriptOriginalBytes: transcript.length }
  }

  const compacted = transcript
    .split("\n")
    .map((line) => {
      if (!line) return line
      try {
        return JSON.stringify(JSON.parse(line), (_key, value: unknown) =>
          typeof value === "string" && value.length > 12_000
            ? `${value.slice(0, 12_000)}\n… [${value.length - 12_000} characters omitted; use Copy path to open the complete transcript]`
            : value
        )
      } catch {
        return line.length > 12_000
          ? `${line.slice(0, 12_000)}\n… [line truncated]`
          : line
      }
    })
    .join("\n")

  return {
    transcript: compacted,
    transcriptOriginalBytes: transcript.length,
  }
}

export function getBenchmarkEvidence(splat: string) {
  const [task, result] = splat
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent)
  if (!task || !result) return null
  const root = benchmarkRoot()
  const benchmarkIds = benchmarkIdsByRun(root)
  const id = `${task}/${result}`
  const entries = getBenchmarkEntries()
  const entry =
    entries.find((candidate) => candidate.id === id) ||
    entries.find(
      (candidate) => candidate.task === task && candidate.result === result
    )
  if (!entry) return null
  const evidence: RunEvidence | undefined =
    metadataByAppPath(root, benchmarkIds).get(resolve(root, entry.appPath)) ||
    historicalEvidence(root, entry.task, entry.date, entry, benchmarkIds)

  if (!evidence) {
    return {
      appPath: entry.appPath,
      command: "",
      evidencePath: "",
      final: "",
      effort: entry.effort,
      durationMs: entry.durationMs,
      activeDurationMs: null,
      benchmarkId: entry.benchmarkId,
      prompt: "",
      resumeCommand: "",
      runId: "",
      sessionId: "",
      transcript: "",
      transcriptAnalysis: null,
      integrityAnalysis: null,
      modelReview: null,
      transcriptPaths: [],
      transcriptOriginalBytes: 0,
      sessionUsage: null,
      usageSteps: [],
    }
  }

  const currentDirectory = evidence.currentDirectory ?? evidence.directory
  const recordedTranscripts = transcriptFiles(currentDirectory)
  const rawTranscriptSegments = recordedTranscripts.map((file) =>
    readOptional(join(currentDirectory, file))
  )
  const rawTranscript = rawTranscriptSegments.filter(Boolean).join("\n")
  const transcript = readTranscriptForUi(rawTranscript)
  const activeSegments = rawTranscriptSegments
    .map(activeTranscriptDurationMs)
    .filter((duration): duration is number => duration !== null)
  const activeDurationMs =
    entry.harness === "cursor-agent" && activeSegments.length
      ? activeSegments.reduce((total, duration) => total + duration, 0)
      : evidence.durationMs
  const usageSteps = billedUsageSteps(
    entry.harness,
    evidence.directory,
    activeDurationMs
  )
  return {
    appPath: entry.appPath,
    command: readOptional(join(currentDirectory, "command.sh")),
    evidencePath: repositoryPath(root, currentDirectory),
    final: readOptional(join(currentDirectory, "final.txt")),
    effort: evidence.effort,
    durationMs: withIterationDuration(evidence.durationMs, evidence.directory),
    activeDurationMs: withIterationDuration(
      activeDurationMs,
      evidence.directory
    ),
    benchmarkId: evidence.benchmarkId,
    prompt: readOptional(join(evidence.directory, "prompt.md")),
    resumeCommand: readOptional(join(currentDirectory, "resume-command.sh")),
    runId: evidence.runId,
    sessionId: readOptional(join(currentDirectory, "session-id.txt")).trim(),
    transcriptAnalysis: readTranscriptAnalysis(currentDirectory),
    integrityAnalysis: analyzeIntegrityTranscript(
      rawTranscript,
      resolve(root, entry.appPath)
    ),
    modelReview: readModelReview(currentDirectory),
    transcriptPaths: recordedTranscripts.map((file) =>
      repositoryPath(root, join(currentDirectory, file))
    ),
    sessionUsage: aggregateUsage(usageSteps),
    usageSteps,
    ...transcript,
  }
}

function safeJoin(base: string, requestPath: string) {
  const target = resolve(base, `.${normalize(`/${requestPath}`)}`)
  return target === base || target.startsWith(`${base}${sep}`) ? target : null
}

function rewriteAbsoluteAssetPaths(content: string, prefix: string) {
  return content.replace(
    // Apps built with a basePath already point inside /view/; prefixing them again 404s.
    /(^|[("'=,\s])\/(?!view\/)(?=[A-Za-z0-9_.-])/gm,
    (_, boundary: string) => `${boundary}${prefix}`
  )
}

function rewriteJavaScriptAbsolutePaths(
  content: string,
  prefix: string,
  outputDirectory: string
) {
  return content.replace(
    /(^|[=(:,\[!&|?{};>\s])(["'`])\/([A-Za-z0-9_.-][A-Za-z0-9_./-]*)\2/gm,
    (
      match: string,
      boundary: string,
      quote: string,
      assetPath: string
    ) => {
      const file = safeJoin(outputDirectory, assetPath)
      if (!file || !existsSync(file)) return match
      const stats = statSync(file)
      return stats.isFile() || stats.isDirectory()
        ? `${boundary}${quote}${prefix}${assetPath}${quote}`
        : match
    }
  )
}

function appendViewerAssetVersion(content: string, version: string) {
  return content.replace(
    /\b(src|href)=(['"])([^'"?#]+\.(?:css|js|mjs))\2/gi,
    (match: string, attribute: string, quote: string, assetPath: string) =>
      // Next chunks are content-hashed, and its runtime keys loaded chunks by exact URL.
      assetPath.includes("/_next/")
        ? match
        : `${attribute}=${quote}${assetPath}?viewer=${version}${quote}`
  )
}

export function getBenchmarkAsset(splat: string) {
  const [task, result, ...assetParts] = splat
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent)
  const id = `${task}/${result}`
  const entries = getBenchmarkEntries()
  const entry =
    entries.find((candidate) => candidate.id === id) ||
    entries.find(
      (candidate) => candidate.task === task && candidate.result === result
    )
  if (!entry) return null

  const root = benchmarkRoot()
  const outputDirectory =
    entry.source === "build"
      ? join(root, entry.appPath, "dist")
      : join(root, entry.appPath)
  const requested = assetParts.length ? assetParts.join("/") : "index.html"
  const file = safeJoin(outputDirectory, requested)
  if (!file || !existsSync(file) || !statSync(file).isFile()) return null

  const extension = extname(file).toLowerCase()
  let body: Blob | string = new Blob([readFileSync(file)])
  if (extension === ".html") {
    const prefix = `/view/${encodeURIComponent(task)}/${encodeURIComponent(result)}/`
    body = rewriteAbsoluteAssetPaths(
      readFileSync(file, "utf8"),
      prefix
    )
      .replace(/<head([^>]*)>/i, `<head$1><base href="${prefix}">`)
      .replace(
        /<\/head>/i,
        `<script>window.__BENCHMARK_VIEWER_VERSION__=${JSON.stringify(String(statSync(file).mtimeMs))}</script></head>`
      )
    body = appendViewerAssetVersion(
      body,
      encodeURIComponent(String(statSync(file).mtimeMs))
    )
  } else if (extension === ".css") {
    const prefix = `/view/${encodeURIComponent(task)}/${encodeURIComponent(result)}/`
    body = rewriteAbsoluteAssetPaths(readFileSync(file, "utf8"), prefix)
  } else if (extension === ".js" || extension === ".mjs") {
    const prefix = `/view/${encodeURIComponent(task)}/${encodeURIComponent(result)}/`
    body = rewriteJavaScriptAbsolutePaths(
      readFileSync(file, "utf8"),
      prefix,
      outputDirectory
    )
  }

  return {
    body,
    contentType: mimeTypes[extension] || "application/octet-stream",
  }
}
