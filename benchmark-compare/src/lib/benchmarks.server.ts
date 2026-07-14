import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
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
import {
  parsePersistedSessionUsage,
  parseSessionUsageTranscript,
} from "@/lib/session-usage"

export type BenchmarkEntry = {
  id: string
  task: string
  result: string
  date: string
  model: string
  harness: string
  effort: string
  durationMs: number | null
  benchmarkId: string
  runId: string
  appPath: string
  hasTranscript: boolean
  promptSlug: string | null
  promptVersion: string | null
  promptUrl: string | null
  source: "build" | "standalone"
  url: string
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
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
}

function benchmarkRoot() {
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
    .sort()
}

type RunEvidence = {
  directory: string
  harness: string
  model: string
  effort: string
  durationMs: number | null
  benchmarkId: string
  runId: string
  promptSlug: string | null
  promptVersion: string | null
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
      ...prompt,
    }
  } catch {
    return {
      effort: "unknown",
      durationMs: null,
      benchmarkId: "",
      promptSlug: null,
      promptVersion: null,
    }
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
  const suffix = `-${normalizeRunToken(identity.model)}-${normalizeRunToken(identity.harness)}`
  const candidates = readdirSync(runs, { withFileTypes: true })
    .filter(
      (run) =>
        run.isDirectory() &&
        run.name.startsWith(dateToken) &&
        run.name.endsWith(suffix)
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
      if (!existsSync(appPathFile) || !existsSync(metadataFile)) continue
      try {
        const appPath = resolveRecordedAppPath(
          root,
          task.name,
          readFileSync(appPathFile, "utf8").trim()
        )
        const value = JSON.parse(readFileSync(metadataFile, "utf8")) as {
          effort?: string
          benchmark_id?: string
          harness?: string
          model?: string
          model_timing?: { duration_ms?: unknown } | null
          prompt_public_url?: unknown
          prompt_source?: unknown
        }
        if (value.harness && value.model) {
          const prompt = promptIdentity(
            value.prompt_source,
            value.prompt_public_url
          )
          const candidate = {
            directory: taskData,
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
            model: value.model,
            runId: run.name,
            ...prompt,
          }
          const previous = metadata.get(appPath)
          const candidateHasTranscript =
            transcriptFiles(candidate.directory).length > 0
          const previousHasTranscript = Boolean(
            previous && transcriptFiles(previous.directory).length > 0
          )
          if (!previous || candidateHasTranscript || !previousHasTranscript) {
            metadata.set(appPath, candidate)
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
  const prefixes = ["cursor-agent", "codex", "ccx", "cc"]
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

export function getBenchmarkEntries(): BenchmarkEntry[] {
  const root = benchmarkRoot()
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
      if (!existsSync(join(outputDirectory, "index.html"))) continue

      const appDirectory = resolve(resultDirectory)
      const date = /^\d{4}-\d{2}-\d{2}/.exec(result.name)?.[0] || "unknown"
      const inferredIdentity = inferIdentity(result.name)
      const runEvidence =
        evidence.get(appDirectory) ||
        historicalEvidence(
          root,
          task.name,
          date,
          inferredIdentity,
          benchmarkIds
        )
      const identity = runEvidence || inferredIdentity
      const id = `${task.name}/${result.name}`
      entries.push({
        id,
        task: task.name,
        result: result.name,
        date,
        model: identity.model,
        harness: identity.harness,
        effort: runEvidence?.effort || "unknown",
        durationMs: runEvidence?.durationMs ?? null,
        benchmarkId:
          runEvidence?.benchmarkId ||
          runEvidence?.runId ||
          `legacy-result-${task.name}-${result.name}`,
        runId: runEvidence?.runId || result.name,
        appPath: repositoryPath(root, appDirectory),
        hasTranscript: Boolean(
          runEvidence && transcriptFiles(runEvidence.directory).length > 0
        ),
        promptSlug: runEvidence?.promptSlug || null,
        promptVersion: runEvidence?.promptVersion || null,
        promptUrl:
          runEvidence?.promptSlug && runEvidence.promptVersion
            ? `/prompts/${encodeURIComponent(runEvidence.promptSlug)}/${encodeURIComponent(runEvidence.promptVersion)}`
            : null,
        source: outputDirectory === distDirectory ? "build" : "standalone",
        url: `/view/${id.split("/").map(encodeURIComponent).join("/")}/`,
      })
    }
  }

  return entries.sort(
    (left, right) =>
      right.result.localeCompare(left.result) ||
      left.task.localeCompare(right.task)
  )
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

function readSessionUsage(directory: string) {
  try {
    const metadata = JSON.parse(
      readFileSync(join(directory, "metadata.json"), "utf8")
    ) as { session_usage?: unknown }
    const persisted = parsePersistedSessionUsage(metadata.session_usage)
    if (persisted) return persisted
  } catch {
    // Historical runs predate persisted usage; derive it from their transcript.
  }

  return parseSessionUsageTranscript(
    readOptional(join(directory, "transcript.jsonl"))
  )
}

function readTranscriptForUi(file: string) {
  const transcript = readOptional(file)
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
  const entry = getBenchmarkEntries().find(
    (candidate) => candidate.task === task && candidate.result === result
  )
  if (!entry) return null
  const evidence =
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
      benchmarkId: entry.benchmarkId,
      prompt: "",
      resumeCommand: "",
      runId: "",
      sessionId: "",
      transcript: "",
      transcriptAnalysis: null,
      transcriptPaths: [],
      transcriptOriginalBytes: 0,
      sessionUsage: null,
    }
  }

  const recordedTranscripts = transcriptFiles(evidence.directory)
  const transcript = readTranscriptForUi(
    join(evidence.directory, "transcript.jsonl")
  )
  return {
    appPath: entry.appPath,
    command: readOptional(join(evidence.directory, "command.sh")),
    evidencePath: repositoryPath(root, evidence.directory),
    final: readOptional(join(evidence.directory, "final.txt")),
    effort: evidence.effort,
    durationMs: evidence.durationMs,
    benchmarkId: evidence.benchmarkId,
    prompt: readOptional(join(evidence.directory, "prompt.md")),
    resumeCommand: readOptional(join(evidence.directory, "resume-command.sh")),
    runId: evidence.runId,
    sessionId: readOptional(join(evidence.directory, "session-id.txt")).trim(),
    transcriptAnalysis: readTranscriptAnalysis(evidence.directory),
    transcriptPaths: recordedTranscripts.map((file) =>
      repositoryPath(root, join(evidence.directory, file))
    ),
    sessionUsage: readSessionUsage(evidence.directory),
    ...transcript,
  }
}

function safeJoin(base: string, requestPath: string) {
  const target = resolve(base, `.${normalize(`/${requestPath}`)}`)
  return target === base || target.startsWith(`${base}${sep}`) ? target : null
}

function rewriteAbsoluteAssetPaths(content: string, prefix: string) {
  return content.replace(
    /(^|[("'=,\s])\/(?=[A-Za-z0-9_.-])/gm,
    (_, boundary: string) => `${boundary}${prefix}`
  )
}

export function getBenchmarkAsset(splat: string) {
  const [task, result, ...assetParts] = splat
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent)
  const entry = getBenchmarkEntries().find(
    (candidate) => candidate.task === task && candidate.result === result
  )
  if (!entry) return null

  const root = benchmarkRoot()
  const outputDirectory =
    entry.source === "build"
      ? join(benchmarkResultsRoot(root), task, result, "dist")
      : join(benchmarkResultsRoot(root), task, result)
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
    ).replace(/<head([^>]*)>/i, `<head$1><base href="${prefix}">`)
  } else if (extension === ".css") {
    const prefix = `/view/${encodeURIComponent(task)}/${encodeURIComponent(result)}/`
    body = rewriteAbsoluteAssetPaths(readFileSync(file, "utf8"), prefix)
  }

  return {
    body,
    contentType: mimeTypes[extension] || "application/octet-stream",
  }
}
