import type { SessionUsage } from "./session-usage"

const OPENAI_PRICING_URL = "https://developers.openai.com/api/docs/pricing"
const ANTHROPIC_PRICING_URL =
  "https://platform.claude.com/docs/en/about-claude/pricing"
const GOOGLE_PRICING_URL = "https://ai.google.dev/gemini-api/docs/pricing"
const KIMI_K3_PRICING_URL = "https://platform.kimi.ai/docs/pricing/chat-k3"
const XAI_PRICING_URL = "https://docs.x.ai/developers/pricing"
const CURSOR_GROK_PRICING_URL = "https://cursor.com/grok"
const GEMINI_37_FLASH_INTRO_UNTIL = "2026-12-31"

type TokenRates = {
  input: number
  cacheRead: number
  cacheWrite: number
  /** Anthropic only: the longer cache TTL bills at a higher multiple. */
  cacheWrite1h?: number
  output: number
}

export type ModelPricing = {
  label: string
  sourceLabel: string
  sourceUrl: string
  rates: TokenRates
  note: string
}

export type CostLine = {
  key: "input" | "cacheRead" | "cacheWrite" | "cacheWrite1h" | "output"
  label: string
  tokens: number
  rate: number
  costUsd: number
}

export type ModelCostEstimate = {
  pricing: ModelPricing
  lines: CostLine[]
  totalUsd: number
}

function openAiPricing(label: string, input: number, output: number) {
  return {
    label,
    sourceLabel: "OpenAI official pricing",
    sourceUrl: OPENAI_PRICING_URL,
    rates: {
      input,
      cacheRead: input * 0.1,
      cacheWrite: input * 1.25,
      output,
    },
    note: "Base API rates. Aggregate transcripts cannot reveal per-request long-context multipliers.",
  } satisfies ModelPricing
}

function anthropicPricing(label: string, input: number, output: number) {
  return {
    label,
    sourceLabel: "Anthropic official pricing",
    sourceUrl: ANTHROPIC_PRICING_URL,
    rates: {
      input,
      cacheRead: input * 0.1,
      cacheWrite: input * 1.25,
      cacheWrite1h: input * 2,
      output,
    },
    note: "Standard global API rates. Cache writes are billed at the TTL the run actually requested.",
  } satisfies ModelPricing
}

function claudeFable51Pricing() {
  return {
    label: "Claude Fable 5.1",
    sourceLabel: "Anthropic official pricing",
    sourceUrl: ANTHROPIC_PRICING_URL,
    rates: {
      input: 10,
      cacheRead: 0.25,
      cacheWrite: 12.5,
      cacheWrite1h: 20,
      output: 50,
    },
    note: "Same $10/$50 input/output as Fable 5, but cache reads are 0.025× input ($0.25/MTok). Cache writes use the 5 min rate unless the transcript records a 1 hour TTL split.",
  } satisfies ModelPricing
}

function isClaudeFable51(normalized: string) {
  return (
    normalized === "claude-fable-5-1" ||
    normalized === "claude-fable-5.1" ||
    normalized.startsWith("claude-fable-5-1-") ||
    normalized.startsWith("claude-fable-5.1-")
  )
}

function kimiK3Pricing() {
  return {
    label: "Kimi K3",
    sourceLabel: "Kimi official pricing",
    sourceUrl: KIMI_K3_PRICING_URL,
    rates: {
      input: 3,
      cacheRead: 0.3,
      cacheWrite: 3,
      output: 15,
    },
    note: "Official API-equivalent rates. Kimi Code subscription usage is included in the membership quota, so this is not an additional charge.",
  } satisfies ModelPricing
}

function xAiPricing(
  label: string,
  input: number,
  cacheRead: number,
  output: number
) {
  return {
    label,
    sourceLabel: "xAI official pricing",
    sourceUrl: XAI_PRICING_URL,
    rates: {
      input,
      cacheRead,
      cacheWrite: input,
      output,
    },
    note: "Base API rates from docs.x.ai. Aggregate transcripts cannot reveal long-context (≥200k) multipliers or Cursor reseller margins.",
  } satisfies ModelPricing
}

function cursorGrokPricing(fast: boolean) {
  return {
    label: fast ? "Cursor Grok 4.6 Fast" : "Cursor Grok 4.6",
    sourceLabel: "Cursor official pricing",
    sourceUrl: CURSOR_GROK_PRICING_URL,
    rates: {
      input: fast ? 4 : 2,
      cacheRead: fast ? 1 : 0.5,
      cacheWrite: fast ? 4 : 2,
      output: fast ? 12 : 6,
    },
    note: "Official Cursor on-demand rates. The transcript records aggregate token totals, so this estimate excludes subscription allowances and promotional included usage.",
  } satisfies ModelPricing
}

function geminiFlashPricing(label: string, usageDate: string) {
  const introductory = usageDate <= GEMINI_37_FLASH_INTRO_UNTIL
  const input = introductory ? 0.75 : 1.5
  return {
    label: introductory ? `${label} · introductory pricing` : label,
    sourceLabel: "Google official pricing",
    sourceUrl: GOOGLE_PRICING_URL,
    rates: {
      input,
      cacheRead: introductory ? 0.075 : 0.15,
      cacheWrite: input,
      output: introductory ? 3.75 : 7.5,
    },
    note: introductory
      ? "Introductory Google API rates through December 31, 2026. Cached input is billed at 10% of input. Aggregate transcripts cannot reveal cache-storage hourly fees or Cursor reseller margins."
      : "Standard Google API rates from January 1, 2027. Cached input is billed at 10% of input. Aggregate transcripts cannot reveal cache-storage hourly fees or Cursor reseller margins.",
  } satisfies ModelPricing
}

function isGemini37Flash(normalized: string) {
  return (
    normalized === "gemini-3.7-flash" ||
    normalized === "gemini-3-7-flash" ||
    normalized.startsWith("gemini-3.7-flash-") ||
    normalized.startsWith("gemini-3-7-flash-")
  )
}

function isGemini38Flash(normalized: string) {
  return (
    normalized === "gemini-3.8-flash" ||
    normalized === "gemini-3-8-flash" ||
    normalized.startsWith("gemini-3.8-flash-") ||
    normalized.startsWith("gemini-3-8-flash-")
  )
}

function normalizePricingModel(model: string) {
  let normalized = model.toLowerCase().trim()
  if (normalized.startsWith("cursor-")) {
    normalized = normalized.slice("cursor-".length)
  }
  return normalized.replace(
    /-(?:none|low|medium|high|xhigh|max|ultra)$/,
    ""
  )
}

export function getModelPricing(
  model: string,
  usageDate: string
): ModelPricing | null {
  const rawModel = model.toLowerCase().trim()
  if (rawModel.startsWith("cursor-grok-4.6")) {
    return cursorGrokPricing(rawModel.endsWith("-fast"))
  }

  const normalized = normalizePricingModel(model)

  if (isGemini38Flash(normalized))
    return geminiFlashPricing("Gemini 3.8 Flash", usageDate)
  if (isGemini37Flash(normalized))
    return geminiFlashPricing("Gemini 3.7 Flash", usageDate)
  if (normalized === "gpt-6-astra") return openAiPricing("GPT-6 Astra", 10, 50)
  if (normalized === "gpt-5.6-sol") return openAiPricing("GPT-5.6 Sol", 5, 30)
  if (normalized === "gpt-5.6-terra")
    return openAiPricing("GPT-5.6 Terra", 2.5, 15)
  if (normalized === "gpt-5.6-luna") return openAiPricing("GPT-5.6 Luna", 1, 6)
  if (isClaudeFable51(normalized)) return claudeFable51Pricing()
  if (normalized === "claude-fable-5")
    return anthropicPricing("Claude Fable 5", 10, 50)
  if (normalized === "claude-sonnet-5") {
    const introductory = usageDate <= "2026-08-31"
    return anthropicPricing(
      introductory
        ? "Claude Sonnet 5 · introductory pricing"
        : "Claude Sonnet 5",
      introductory ? 2 : 3,
      introductory ? 10 : 15
    )
  }
  if (normalized === "opus" || normalized === "claude-opus-4.8")
    return anthropicPricing("Claude Opus 4.8", 5, 25)
  if (normalized === "claude-opus-5")
    return anthropicPricing("Claude Opus 5", 5, 25)
  if (
    normalized === "k3" ||
    normalized === "k3[1m]" ||
    normalized === "kimi-k3"
  )
    return kimiK3Pricing()
  if (
    normalized === "grok-4.5" ||
    normalized === "grok-4.5-latest" ||
    normalized === "grok-build-latest"
  )
    return xAiPricing("Grok 4.5", 2, 0.3, 6)
  if (
    normalized === "grok-4.3" ||
    normalized === "grok-4.3-latest" ||
    normalized === "grok-latest"
  )
    return xAiPricing("Grok 4.3", 1.25, 0.2, 2.5)
  if (normalized === "grok-build-0.1" || normalized.startsWith("grok-code-fast"))
    return xAiPricing("Grok Build / Code Fast", 1, 0.2, 2)
  if (normalized.startsWith("grok-4.20"))
    return xAiPricing("Grok 4.20", 1.25, 0.2, 2.5)

  return null
}

function costLine(
  key: CostLine["key"],
  label: string,
  tokens: number,
  rate: number
): CostLine {
  return {
    key,
    label,
    tokens,
    rate,
    costUsd: (tokens * rate) / 1_000_000,
  }
}

/**
 * Anthropic bills a one-hour cache write at twice the input rate against 1.25x
 * for the five-minute one, and the harness reports that split only in the raw
 * payload. A long-lived agent run caches for an hour, so ignoring the split
 * underprices it by roughly eight percent.
 *
 * The split is returned as shares rather than raw counts: it describes the TTL
 * mix of the session, while the tokens actually billed come from the per-model
 * counters, and the two totals differ slightly.
 */
function cacheWriteTtlShares(rawUsage: unknown, sessionTotal: number) {
  if (!rawUsage || typeof rawUsage !== "object") return null
  const creation = (rawUsage as Record<string, unknown>).cache_creation
  if (!creation || typeof creation !== "object") return null
  const record = creation as Record<string, unknown>
  const shortTtl = record.ephemeral_5m_input_tokens
  const longTtl = record.ephemeral_1h_input_tokens
  if (typeof shortTtl !== "number" || typeof longTtl !== "number") return null
  if (shortTtl + longTtl !== sessionTotal || sessionTotal <= 0) return null
  return { short: shortTtl / sessionTotal, long: longTtl / sessionTotal }
}

type BilledTokens = {
  input: number
  cacheRead: number
  cacheWrite: number
  output: number
}

/**
 * The session counters and the per-model counters disagree: the session block
 * drops what sub-agents spent, so billing from it underprices a fan-out run by
 * a few percent. The provider bills per model, so the per-model block wins
 * whenever it covers the model being priced.
 */
function modelUsageTokens(usage: SessionUsage, model: string): BilledTokens | null {
  if (!usage.model_usage || typeof usage.model_usage !== "object") return null
  const entries = Object.entries(usage.model_usage as Record<string, unknown>)
  const normalized = normalizePricingModel(model)
  const match =
    entries.find(([key]) => normalizePricingModel(key) === normalized) ??
    (entries.length === 1 ? entries[0] : undefined)
  if (!match) return null
  const record = match[1]
  if (!record || typeof record !== "object") return null
  const counters = record as Record<string, unknown>
  const read = (key: string) => {
    const value = counters[key]
    return typeof value === "number" && Number.isFinite(value) ? value : null
  }
  const input = read("inputTokens")
  const output = read("outputTokens")
  const cacheRead = read("cacheReadInputTokens")
  const cacheWrite = read("cacheCreationInputTokens")
  if (input === null || output === null) return null
  return {
    input,
    cacheRead: cacheRead ?? 0,
    cacheWrite: cacheWrite ?? 0,
    output,
  }
}

function sessionUsageTokens(usage: SessionUsage): BilledTokens {
  const input = usage.input_tokens ?? 0
  const cacheRead = usage.cached_input_tokens ?? 0
  const cacheWrite = usage.cache_creation_input_tokens ?? 0
  // Some harnesses fold cached tokens into the input count instead of reporting
  // them alongside it; the processed total is what tells the two apart.
  const inputAlreadyIncludesCache =
    usage.processed_input_tokens === usage.input_tokens

  return {
    input: inputAlreadyIncludesCache
      ? Math.max(0, input - cacheRead - cacheWrite)
      : input,
    cacheRead,
    cacheWrite,
    output: usage.output_tokens ?? 0,
  }
}

export function estimateModelCost(
  model: string,
  usageDate: string,
  usage: SessionUsage
): ModelCostEstimate | null {
  const pricing = getModelPricing(model, usageDate)
  if (!pricing) return null

  const billed = modelUsageTokens(usage, model) ?? sessionUsageTokens(usage)

  const longTtlRate = pricing.rates.cacheWrite1h
  const shares = longTtlRate
    ? cacheWriteTtlShares(
        usage.raw_usage,
        usage.cache_creation_input_tokens ?? 0
      )
    : null

  const lines = [
    costLine("input", "Uncached input", billed.input, pricing.rates.input),
    costLine(
      "cacheRead",
      "Cache read",
      billed.cacheRead,
      pricing.rates.cacheRead
    ),
    ...(shares && longTtlRate
      ? [
          costLine(
            "cacheWrite",
            "Cache creation · 5 min",
            Math.round(billed.cacheWrite * shares.short),
            pricing.rates.cacheWrite
          ),
          costLine(
            "cacheWrite1h",
            "Cache creation · 1 hour",
            Math.round(billed.cacheWrite * shares.long),
            longTtlRate
          ),
        ]
      : [
          costLine(
            "cacheWrite",
            "Cache creation",
            billed.cacheWrite,
            pricing.rates.cacheWrite
          ),
        ]),
    costLine(
      "output",
      "Output · reasoning included",
      billed.output,
      pricing.rates.output
    ),
  ]

  return {
    pricing,
    lines,
    totalUsd: lines.reduce((total, line) => total + line.costUsd, 0),
  }
}
