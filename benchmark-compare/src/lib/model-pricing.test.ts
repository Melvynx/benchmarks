import { describe, expect, it } from "vitest"

import { estimateModelCost, getModelPricing } from "./model-pricing"
import type { SessionUsage } from "./session-usage"

function usage(overrides: Partial<SessionUsage>): SessionUsage {
  return {
    status: "complete",
    schema_version: 1,
    input_tokens: null,
    processed_input_tokens: null,
    cached_input_tokens: null,
    cache_creation_input_tokens: null,
    output_tokens: null,
    reasoning_output_tokens: null,
    total_tokens: null,
    total_cost_usd: null,
    duration_ms: null,
    duration_api_ms: null,
    num_turns: null,
    service_tier: null,
    speed: null,
    inference_geo: null,
    server_tool_use: null,
    model_usage: null,
    raw_usage: null,
    ...overrides,
  }
}

describe("model pricing", () => {
  it("calculates GPT cost without double-counting cached input", () => {
    const estimate = estimateModelCost(
      "gpt-5.6-luna",
      "2026-07-13",
      usage({
        input_tokens: 1_033_794,
        processed_input_tokens: 1_033_794,
        cached_input_tokens: 919_040,
        output_tokens: 27_675,
      })
    )

    expect(estimate?.lines[0].tokens).toBe(114_754)
    expect(estimate?.totalUsd).toBeCloseTo(0.372708)
  })

  it("prices Claude cache reads and writes separately", () => {
    const estimate = estimateModelCost(
      "claude-fable-5",
      "2026-07-13",
      usage({
        input_tokens: 1_000_000,
        processed_input_tokens: 3_000_000,
        cached_input_tokens: 1_000_000,
        cache_creation_input_tokens: 1_000_000,
        output_tokens: 1_000_000,
      })
    )

    expect(estimate?.totalUsd).toBe(73.5)
  })

  it("uses Sonnet 5 introductory pricing only through August 2026", () => {
    expect(
      getModelPricing("claude-sonnet-5", "2026-08-31")?.rates
    ).toMatchObject({ input: 2, output: 10 })
    expect(
      getModelPricing("claude-sonnet-5", "2026-09-01")?.rates
    ).toMatchObject({ input: 3, output: 15 })
  })

  it("uses official Kimi K3 rates for the 1M Claude Code model alias", () => {
    const pricing = getModelPricing("k3[1m]", "2026-07-17")

    expect(pricing?.rates).toEqual({
      input: 3,
      cacheRead: 0.3,
      cacheWrite: 3,
      output: 15,
    })
    expect(pricing?.sourceUrl).toBe(
      "https://platform.kimi.ai/docs/pricing/chat-k3"
    )
  })

  it("does not invent pricing for an unknown model", () => {
    expect(getModelPricing("unknown-model", "2026-07-13")).toBeNull()
  })
})
