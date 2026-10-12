import { createHash } from "node:crypto"
import {
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"
import { continuationSource } from "./continuations.server.ts"
import { estimateModelCost, getModelPricing } from "./model-pricing.ts"
import {
  parsePersistedSessionUsage,
  parseSessionUsageTranscript,
} from "./session-usage.ts"
import type { SessionUsage } from "./session-usage.ts"

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
type SerializableUsage = Omit<
  SessionUsage,
  "raw_usage" | "model_usage" | "server_tool_use"
> & { raw_usage: JsonValue; model_usage: JsonValue; server_tool_use: JsonValue }

type Metadata = {
  model?: string
  harness?: string
  effort?: string
  status?: string
  model_timing?: {
    started_at?: string
    completed_at?: string
    duration_ms?: number
  }
  session_usage?: unknown
  transcript_analysis?: unknown
}
export type TranscriptCost = {
  id: string
  runId: string
  task: string
  model: string
  harness: string
  effort: string
  sessionId: string | null
  transcript: string
  aliases: string[]
  sha256: string
  bytes: number
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  usage: SerializableUsage | null
  analysis: JsonValue
  reportedCostUsd: number | null
  /** What the harness claimed when that claim was not priced at list rates. */
  harnessCostUsd: number | null
  estimatedCostUsd: number | null
  costUsd: number | null
  costKind: "reported" | "estimated" | "approximate" | "unknown"
  /** Rough price of an interrupted attempt's persisted estimate; never in costUsd. */
  approximateCostUsd: number | null
  /** Ended without any billing record: its time is not comparable model time. */
  stalled: boolean
  complete: boolean
  pricingSource: string | null
  note: string
}
export type TranscriptAccounting = {
  schemaVersion: 1
  transcripts: TranscriptCost[]
  /** Model time of attempts with a billing record. */
  durationMs: number | null
  /** Time spent in attempts that ended without any billing record. */
  stalledDurationMs: number | null
  wallDurationMs: number | null
  startedAt: string | null
  completedAt: string | null
  costUsd: number | null
  reportedCostUsd: number | null
  estimatedCostUsd: number | null
  /** Rough price of the unknown-cost attempts, excluded from costUsd. */
  approximateCostUsd: number | null
  unknownCosts: number
  partialCosts: number
  complete: boolean
  tokens: number | null
  bytes: number
}

function metadata(directory: string): Metadata {
  try {
    return JSON.parse(readFileSync(join(directory, "metadata.json"), "utf8"))
  } catch {
    try {
      const command = readFileSync(join(directory, "command.sh"), "utf8")
      const model = command.match(/--model (\S+)/)?.[1]
      const harness = command.includes("cursor-agent") ? "cursor-agent" : command.includes("codex exec") ? "codex" : "unknown"
      const effort = command.match(/--effort (\S+)/)?.[1]
        ?? command.match(/model_reasoning_effort=[\\"']*(\w+)/)?.[1]
        ?? model?.match(/-(low|medium|high|xhigh|max|ultra)(?:-fast)?$/)?.[1]
      return { model, harness, effort, status: "running" }
    } catch { return {} }
  }
}

/** Oldest first; a visited set also makes malformed continuation cycles safe. */
function chain(directory: string, seen = new Set<string>()): string[] {
  const canonical = resolve(directory)
  if (seen.has(canonical)) return []
  seen.add(canonical)
  const source = continuationSource(canonical)
  return [...(source ? chain(source, seen) : []), canonical]
}

const familyCache = new Map<
  string,
  { at: number; links: Array<{ directory: string; source: string }> }
>()
function family(directory: string) {
  const ancestors = chain(directory)
  const runs = dirname(dirname(dirname(resolve(directory))))
  let cached = familyCache.get(runs)
  if (!cached || Date.now() - cached.at > 5000) {
    const links: Array<{ directory: string; source: string }> = []
    for (const run of readdirSync(runs, { withFileTypes: true }).filter(
      (item) => item.isDirectory()
    )) {
      const data = join(runs, run.name, "data")
      if (!existsSync(data)) continue
      for (const task of readdirSync(data, { withFileTypes: true }).filter(
        (item) => item.isDirectory()
      )) {
        const candidate = join(data, task.name)
        const source = continuationSource(candidate)
        if (source)
          links.push({ directory: candidate, source: resolve(source) })
      }
    }
    cached = { at: Date.now(), links }
    familyCache.set(runs, cached)
  }
  const selected = new Set(ancestors)
  let grew = true
  while (grew) {
    grew = false
    for (const link of cached.links) {
      if (selected.has(link.source) && !selected.has(link.directory)) {
        selected.add(link.directory)
        grew = true
      }
    }
  }
  return [...selected]
}

function transcripts(directory: string) {
  if (!existsSync(directory)) return []
  const files = readdirSync(directory)
    .filter((name) => /^transcript.*\.jsonl$/.test(name))
    .sort()
    .map((name) => join(directory, name))
  const iterations = join(directory, "iterations")
  if (existsSync(iterations)) {
    for (const name of readdirSync(iterations)
      .filter((name) => /^\d+$/.test(name))
      .sort((a, b) => +a - +b)) {
      files.push(...transcripts(join(iterations, name)))
    }
  }
  return files
}

const parsedCache = new Map<
  string,
  { signature: string; hash: string; usage: SessionUsage | null; sessionId: string | null }
>()
function parseTranscript(file: string) {
  const stat = statSync(file)
  const signature = `${stat.size}:${stat.mtimeMs}`
  const cached = parsedCache.get(file)
  if (cached?.signature === signature) return cached
  const text = readFileSync(file, "utf8")
  const sessionLine = text.match(/^.*"type"\s*:\s*"thread.started".*$/m)?.[0]
  let sessionId: string | null = null
  try { sessionId = sessionLine ? JSON.parse(sessionLine).thread_id ?? null : null } catch {}
  const result = {
    signature,
    hash: createHash("sha256").update(text).digest("hex"),
    usage: parseSessionUsageTranscript(text),
    sessionId,
  }
  parsedCache.set(file, result)
  return result
}

function isCharacterEstimate(usage: SessionUsage | null) {
  return Boolean(
    usage?.source && /estimated|thinking-deltas|scaled-from/.test(usage.source)
  )
}

function reliableUsage(file: string, local: Metadata) {
  const parsed = parseTranscript(file)
  if (parsed.usage) return parsed.usage
  try {
    const evidence = JSON.parse(readFileSync(join(dirname(file), "usage-evidence.json"), "utf8"))
    const recovered = parsePersistedSessionUsage(evidence.session_usage)
    if (recovered && !isCharacterEstimate(recovered) && recovered.status !== "unavailable") return recovered
  } catch { /* No recovered token evidence for this attempt. */ }
  const persisted = parsePersistedSessionUsage(local.session_usage)
  // Character counts are not billing records. Keep them in the original metadata,
  // but never silently price them as measured tokens.
  if (isCharacterEstimate(persisted)) return null
  return persisted?.status === "unavailable" ? null : persisted
}

/**
 * Claude Code prices a model it has no list rate for at its fallback rate and
 * tags it `costBasis: "unknown"` (Sonnet 5.5 comes back at Opus 5.5 prices), so
 * only `costBasis: "list"` totals are trusted as reported costs.
 */
function unlistedReportedCost(usage: SessionUsage | null) {
  if (!usage?.model_usage || typeof usage.model_usage !== "object") return false
  return Object.values(usage.model_usage as Record<string, unknown>).some(
    (entry) =>
      Boolean(entry) &&
      typeof entry === "object" &&
      typeof (entry as Record<string, unknown>).costBasis === "string" &&
      (entry as Record<string, unknown>).costBasis !== "list"
  )
}

/** A session-limit result zeroes `usage` while `modelUsage` keeps the real counters. */
function withModelUsageTotals(usage: SessionUsage | null): SessionUsage | null {
  if (!usage || usage.total_tokens || !usage.model_usage) return usage
  const totals = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 }
  for (const entry of Object.values(usage.model_usage as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue
    const counters = entry as Record<string, unknown>
    const read = (key: string) =>
      typeof counters[key] === "number" ? (counters[key] as number) : 0
    totals.input += read("inputTokens")
    totals.cacheRead += read("cacheReadInputTokens")
    totals.cacheWrite += read("cacheCreationInputTokens")
    totals.output += read("outputTokens")
  }
  const processed = totals.input + totals.cacheRead + totals.cacheWrite
  if (!processed && !totals.output) return usage
  return {
    ...usage,
    // The zeroed block also loses the TTL split; Claude Code writes 1 hour caches.
    raw_usage: {
      cache_creation: {
        ephemeral_5m_input_tokens: 0,
        ephemeral_1h_input_tokens: totals.cacheWrite,
      },
    },
    input_tokens: totals.input,
    processed_input_tokens: processed,
    cached_input_tokens: totals.cacheRead,
    cache_creation_input_tokens: totals.cacheWrite,
    output_tokens: totals.output,
    total_tokens: processed + totals.output,
  }
}

/**
 * Replay coefficients for an interrupted Cursor session (no `result` record):
 * cost in input-token units = calls x 11,080 + output characters x 3.848.
 * Fitted on 26 completed Claude-on-Cursor runs against their billed usage,
 * normalized by the input rate (cache read 0.1x, cache write 1.25x, output 5x);
 * median error 18%, worst 47%.
 */
const CURSOR_UNITS_PER_CALL = 11_080
const CURSOR_UNITS_PER_OUTPUT_CHAR = 3.848

const jsonLength = (value: unknown) =>
  typeof value === "string" ? value.length : (JSON.stringify(value) ?? "").length

/** Model calls and output characters (thinking, text, tool arguments) of a Cursor stream. */
export function replayCursorTranscript(text: string) {
  let calls = 0
  let outputCharacters = 0
  let open = false
  for (const line of text.split("\n")) {
    let record: Record<string, any>
    try {
      record = JSON.parse(line)
    } catch {
      continue
    }
    const { type, subtype } = record
    const generated =
      (type === "thinking" && subtype === "delta") ||
      type === "assistant" ||
      (type === "tool_call" && subtype === "started")
    if (generated && !open) {
      calls += 1
      open = true
    }
    if (type === "thinking" && subtype === "delta") outputCharacters += String(record.text ?? "").length
    else if (type === "assistant")
      for (const part of record.message?.content ?? []) outputCharacters += jsonLength(part?.text ?? "")
    else if (type === "tool_call") {
      const call = record.tool_call ?? {}
      const key = Object.keys(call).find((name) => name.endsWith("ToolCall"))
      if (subtype === "started") outputCharacters += jsonLength(key ? call[key]?.args : call)
      else if (subtype === "completed") open = false
    }
  }
  return { calls, outputCharacters }
}

function cursorReplayCost(file: string, model: string, date: string) {
  const pricing = getModelPricing(model, date)
  if (!pricing?.label.startsWith("Claude")) return null
  const { calls, outputCharacters } = replayCursorTranscript(readFileSync(file, "utf8"))
  if (!calls) return null
  const units = calls * CURSOR_UNITS_PER_CALL + outputCharacters * CURSOR_UNITS_PER_OUTPUT_CHAR
  return { costUsd: (units * pricing.rates.input) / 1_000_000, calls, outputCharacters, pricing }
}

function readCost(file: string, directory: string): TranscriptCost {
  const root = dirname(dirname(dirname(directory)))
  const parent = metadata(directory)
  const canonical = realpathSync(file)
  const own = metadata(dirname(canonical))
  const local = { ...parent, ...own }
  if (dirname(canonical) !== resolve(directory)) {
    // An in-flight iteration must not inherit the previous invocation's bill.
    local.model_timing = own.model_timing
    local.session_usage = own.session_usage
    local.transcript_analysis = own.transcript_analysis
  }
  const usage = withModelUsageTotals(reliableUsage(canonical, local))
  const model = local.model ?? "unknown"
  const timing = local.model_timing
  let recoveredCompletion: string | null = null
  try {
    const evidence = JSON.parse(readFileSync(join(dirname(canonical), "usage-evidence.json"), "utf8"))
    if (typeof evidence.completed_at === "string" && Number.isFinite(Date.parse(evidence.completed_at))) recoveredCompletion = evidence.completed_at
  } catch { /* Original timing remains authoritative when no recovery exists. */ }
  const completedAt = timing?.completed_at ?? recoveredCompletion
  const active = local.status === "running" && !completedAt
  const startedAt =
    timing?.started_at ??
    (active || recoveredCompletion ? statSync(canonical).birthtime.toISOString() : null)
  const durationMs =
    timing?.duration_ms ??
    (startedAt
      ? Math.max(0, (completedAt ? Date.parse(completedAt) : Date.now()) - Date.parse(startedAt))
      : (usage?.duration_ms ?? null))
  const estimate = usage
    ? estimateModelCost(model, startedAt?.slice(0, 10) ?? "", usage)
    : null
  const unlisted = unlistedReportedCost(usage) && estimate !== null
  const harnessCostUsd = unlisted ? (usage?.total_cost_usd ?? null) : null
  const reportedCostUsd = unlisted ? null : (usage?.total_cost_usd ?? null)
  const estimatedCostUsd =
    reportedCostUsd === null ? (estimate?.totalUsd ?? null) : null
  const persisted = usage ? null : parsePersistedSessionUsage(local.session_usage)
  const replay =
    !usage && parent.harness === "cursor-agent"
      ? cursorReplayCost(canonical, model, startedAt?.slice(0, 10) ?? "")
      : null
  // Text-derived guesses must never enter the token-backed subtotal.
  const approximateCostUsd = replay?.costUsd ?? (
    isCharacterEstimate(persisted)
      ? (estimateModelCost(model, startedAt?.slice(0, 10) ?? "", persisted!)
          ?.totalUsd ?? null)
      : null)
  const ownSessionFile = join(dirname(canonical), "session-id.txt")
  const sessionFile = existsSync(ownSessionFile) ? ownSessionFile : join(directory, "session-id.txt")
  return {
    id: canonical,
    runId: basename(dirname(dirname(directory))),
    task: basename(directory),
    model,
    harness: parent.harness ?? "unknown",
    effort: parent.effort ?? "unknown",
    sessionId: parseTranscript(canonical).sessionId ?? (existsSync(sessionFile)
      ? readFileSync(sessionFile, "utf8").trim()
      : null),
    transcript: relative(root, canonical),
    aliases: [relative(root, file)],
    sha256: parseTranscript(canonical).hash,
    bytes: statSync(canonical).size,
    startedAt,
    completedAt,
    durationMs,
    usage: usage as SerializableUsage | null,
    analysis: (local.transcript_analysis ?? null) as JsonValue,
    reportedCostUsd,
    harnessCostUsd,
    estimatedCostUsd,
    costUsd: reportedCostUsd ?? estimatedCostUsd ?? null,
    approximateCostUsd,
    stalled: usage?.source?.startsWith("verified-no-inference.") || (!usage && !replay && !active && Boolean(completedAt)),
    costKind:
      reportedCostUsd !== null
        ? "reported"
        : estimatedCostUsd !== null
          ? "estimated"
          : replay
            ? "approximate"
            : "unknown",
    complete: usage?.status === "complete" && Boolean(completedAt),
    pricingSource:
      reportedCostUsd === null
        ? (estimate?.pricing.sourceUrl ?? replay?.pricing.sourceUrl ?? null)
        : null,
    note:
      usage?.source?.startsWith("verified-no-inference.")
        ? "CLI compatibility before the update: the model was not invoked. Zero model-token API equivalent; not an invoice."
        : reportedCostUsd !== null
        ? "Harness-reported cost; not an invoice."
        : harnessCostUsd !== null
          ? `Harness reported $${harnessCostUsd.toFixed(2)} without a list rate (costBasis unknown); re-priced from its tokens. ${estimate?.pricing.note ?? ""}`
        : estimate
          ? `${usage?.status === "partial" ? "Partial usage. " : ""}${estimate.pricing.note}`
          : replay
            ? `Cursor stopped before reporting usage. Approximated from ${replay.calls} model calls and ${replay.outputCharacters.toLocaleString("en-US")} output characters at API list rates (typical error about 20%, up to 50%).`
            : "No reliable token usage or price available. Unknown is not zero.",
  }
}

function incrementalCodexUsage(items: TranscriptCost[]) {
  const previous = new Map<string, SerializableUsage>()
  const counters = [
    "input_tokens",
    "processed_input_tokens",
    "cached_input_tokens",
    "cache_creation_input_tokens",
    "output_tokens",
    "reasoning_output_tokens",
    "total_tokens",
  ] as const
  return items.map((item) => {
    if (
      item.harness !== "codex" ||
      !item.usage ||
      item.usage.status !== "complete"
    )
      return item
    const key = item.sessionId ?? item.runId
    const before = previous.get(key)
    previous.set(key, item.usage)
    if (!before) return item
    const usage = { ...item.usage, model_usage: null }
    for (const counter of counters) {
      const current = usage[counter]
      if (current !== null)
        usage[counter] = Math.max(0, current - (before[counter] ?? 0))
    }
    const estimate = estimateModelCost(
      item.model,
      item.startedAt?.slice(0, 10) ?? "",
      usage
    )
    return {
      ...item,
      usage,
      estimatedCostUsd: estimate?.totalUsd ?? null,
      costUsd: item.reportedCostUsd ?? estimate?.totalUsd ?? null,
      note: `${item.note} Resumed Codex counters are cumulative; this row uses the incremental difference.`,
    }
  })
}

function sumKnown(values: Array<number | null>) {
  const known = values.filter(
    (value): value is number => value !== null && Number.isFinite(value)
  )
  return known.length ? known.reduce((sum, value) => sum + value, 0) : null
}

export function summarizeTranscripts(
  transcripts: TranscriptCost[]
): TranscriptAccounting {
  const unique = [
    ...new Map(transcripts.map((item) => [item.id, item])).values(),
  ]
  const starts = unique
    .flatMap((item) => (item.startedAt ? [Date.parse(item.startedAt)] : []))
    .filter(Number.isFinite)
  const ends = unique
    .flatMap((item) =>
      item.completedAt
        ? [Date.parse(item.completedAt)]
        : item.startedAt
          ? [Date.now()]
          : []
    )
    .filter(Number.isFinite)
  const unknownCosts = unique.filter((item) => item.costUsd === null).length
  const partialCosts = unique.filter(
    (item) => item.costUsd !== null && !item.complete
  ).length
  return {
    schemaVersion: 1,
    transcripts: unique,
    durationMs: sumKnown(
      unique.filter((item) => !item.stalled).map((item) => item.durationMs)
    ),
    stalledDurationMs: sumKnown(
      unique.filter((item) => item.stalled).map((item) => item.durationMs)
    ),
    wallDurationMs:
      starts.length && ends.length
        ? Math.max(...ends) - Math.min(...starts)
        : null,
    startedAt: starts.length
      ? new Date(Math.min(...starts)).toISOString()
      : null,
    completedAt:
      ends.length && unique.every((item) => item.completedAt)
        ? new Date(Math.max(...ends)).toISOString()
        : null,
    costUsd: sumKnown(unique.map((item) => item.costUsd)),
    reportedCostUsd: sumKnown(unique.map((item) => item.reportedCostUsd)),
    estimatedCostUsd: sumKnown(unique.map((item) => item.estimatedCostUsd)),
    approximateCostUsd: sumKnown(
      unique.map((item) => item.approximateCostUsd)
    ),
    unknownCosts,
    partialCosts,
    complete: unique.length > 0 && !unknownCosts && !partialCosts,
    tokens: sumKnown(unique.map((item) => item.usage?.total_tokens ?? null)),
    bytes: unique.reduce((sum, item) => sum + item.bytes, 0),
  }
}

/**
 * Read-only ledger: retain every attempt, count each transcript once. Copies
 * (an iteration snapshot of the top-level transcript) are the same bill, so
 * identity is the content hash, not the path.
 */
export function readTranscriptAccounting(
  directory: string
): TranscriptAccounting {
  const items = new Map<string, TranscriptCost>()
  // Resume transcripts share their directory's timing: count it once.
  const timed = new Set<string>()
  for (const attempt of family(directory)) {
    for (const file of transcripts(attempt)) {
      if (!existsSync(file)) continue
      const canonical = realpathSync(file)
      const key = statSync(canonical).size
        ? parseTranscript(canonical).hash
        : canonical
      const previous = items.get(key)
      if (previous) {
        const root = dirname(dirname(dirname(attempt)))
        previous.aliases.push(relative(root, file))
      } else {
        const cost = readCost(file, attempt)
        const owner = dirname(canonical)
        if (metadata(owner).model_timing?.duration_ms !== undefined) {
          if (timed.has(owner)) cost.durationMs = null
          timed.add(owner)
        }
        items.set(key, cost)
      }
    }
  }
  const ordered = [...items.values()].sort(
    (a, b) =>
      (a.startedAt ?? "").localeCompare(b.startedAt ?? "") ||
      a.transcript.localeCompare(b.transcript)
  )
  return summarizeTranscripts(incrementalCodexUsage(ordered))
}
