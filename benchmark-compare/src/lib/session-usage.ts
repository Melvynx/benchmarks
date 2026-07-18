export type SessionUsage = {
  status: "complete" | "partial" | "unavailable"
  schema_version: number
  source?: string
  reason?: string
  input_tokens: number | null
  processed_input_tokens: number | null
  cached_input_tokens: number | null
  cache_creation_input_tokens: number | null
  output_tokens: number | null
  reasoning_output_tokens: number | null
  total_tokens: number | null
  total_cost_usd: number | null
  duration_ms: number | null
  duration_api_ms: number | null
  num_turns: number | null
  service_tier: string | null
  speed: string | null
  inference_geo: string | null
  server_tool_use: unknown
  model_usage: unknown
  raw_usage: unknown
}

type JsonRecord = Record<string, unknown>

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function stringValue(value: unknown) {
  return typeof value === "string" && value ? value : null
}

function numberFrom(record: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = finiteNumber(record[key])
    if (value !== null) return value
  }
  return null
}

export function normalizeSessionUsage(
  record: JsonRecord | null
): SessionUsage | null {
  if (!record || typeof record.usage !== "object" || !record.usage) return null
  const usage = record.usage as JsonRecord
  const codex = record.type === "turn.completed"
  const input = numberFrom(usage, "input_tokens", "inputTokens")
  const output = numberFrom(usage, "output_tokens", "outputTokens")
  const cached = numberFrom(
    usage,
    "cached_input_tokens",
    "cache_read_input_tokens",
    "cacheReadTokens"
  )
  const cacheCreation = numberFrom(
    usage,
    "cache_creation_input_tokens",
    "cacheWriteTokens"
  )
  const processedInput = codex
    ? (input ?? 0)
    : (input ?? 0) + (cached ?? 0) + (cacheCreation ?? 0)

  return {
    status: "complete",
    schema_version: 1,
    source: `${String(record.type)}.usage`,
    input_tokens: input,
    processed_input_tokens: processedInput,
    cached_input_tokens: cached,
    cache_creation_input_tokens: cacheCreation,
    output_tokens: output,
    reasoning_output_tokens: numberFrom(usage, "reasoning_output_tokens"),
    total_tokens: processedInput + (output ?? 0),
    total_cost_usd: finiteNumber(record.total_cost_usd),
    duration_ms: finiteNumber(record.duration_ms),
    duration_api_ms: finiteNumber(record.duration_api_ms),
    num_turns: finiteNumber(record.num_turns),
    service_tier: stringValue(usage.service_tier),
    speed: stringValue(usage.speed),
    inference_geo: stringValue(usage.inference_geo),
    server_tool_use: usage.server_tool_use ?? null,
    model_usage: record.modelUsage ?? null,
    raw_usage: usage,
  }
}

export function parseSessionUsageTranscript(transcript: string) {
  let lastResult: JsonRecord | null = null
  let lastCompleted: JsonRecord | null = null
  for (const line of transcript.split("\n")) {
    if (!line.trim()) continue
    try {
      const record = JSON.parse(line) as JsonRecord
      if (!record.usage || typeof record.usage !== "object") continue
      if (record.type === "result") lastResult = record
      if (record.type === "turn.completed") lastCompleted = record
    } catch {
      // Ignore non-JSON diagnostic lines in otherwise useful transcripts.
    }
  }
  return normalizeSessionUsage(lastResult || lastCompleted)
}

export function parsePersistedSessionUsage(value: unknown) {
  if (!value || typeof value !== "object") return null
  const candidate = value as Partial<SessionUsage>
  if (
    (candidate.status !== "complete" && candidate.status !== "partial") ||
    candidate.schema_version !== 1
  )
    return null
  return candidate as SessionUsage
}
