import type { SessionUsage } from "./session-usage"

const OPENAI_PRICING_URL = "https://openai.com/index/gpt-5-6/"
const ANTHROPIC_PRICING_URL =
  "https://platform.claude.com/docs/en/about-claude/pricing"

type TokenRates = {
  input: number
  cacheRead: number
  cacheWrite: number
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
  key: "input" | "cacheRead" | "cacheWrite" | "output"
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
      output,
    },
    note: "Uses standard global API rates and the 5-minute cache-write rate.",
  } satisfies ModelPricing
}

export function getModelPricing(model: string, usageDate: string) {
  const normalized = model.toLowerCase()

  if (normalized === "gpt-5.6-sol") return openAiPricing("GPT-5.6 Sol", 5, 30)
  if (normalized === "gpt-5.6-terra")
    return openAiPricing("GPT-5.6 Terra", 2.5, 15)
  if (normalized === "gpt-5.6-luna") return openAiPricing("GPT-5.6 Luna", 1, 6)
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

export function estimateModelCost(
  model: string,
  usageDate: string,
  usage: SessionUsage
): ModelCostEstimate | null {
  const pricing = getModelPricing(model, usageDate)
  if (!pricing) return null

  const input = usage.input_tokens ?? 0
  const cacheRead = usage.cached_input_tokens ?? 0
  const cacheWrite = usage.cache_creation_input_tokens ?? 0
  const inputAlreadyIncludesCache =
    usage.processed_input_tokens === usage.input_tokens
  const uncachedInput = inputAlreadyIncludesCache
    ? Math.max(0, input - cacheRead - cacheWrite)
    : input

  const lines = [
    costLine("input", "Uncached input", uncachedInput, pricing.rates.input),
    costLine("cacheRead", "Cache read", cacheRead, pricing.rates.cacheRead),
    costLine(
      "cacheWrite",
      "Cache creation",
      cacheWrite,
      pricing.rates.cacheWrite
    ),
    costLine(
      "output",
      "Output · reasoning included",
      usage.output_tokens ?? 0,
      pricing.rates.output
    ),
  ]

  return {
    pricing,
    lines,
    totalUsd: lines.reduce((total, line) => total + line.costUsd, 0),
  }
}
