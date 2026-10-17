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

  it("maps Cursor Fable 5.1 thinking aliases to the cheaper cache-read rate", () => {
    const pricing = getModelPricing(
      "claude-fable-5-1-thinking-medium",
      "2026-09-02"
    )

    expect(pricing?.label).toBe("Claude Fable 5.1")
    expect(pricing?.rates).toEqual({
      input: 10,
      cacheRead: 0.25,
      cacheWrite: 12.5,
      cacheWrite1h: 20,
      output: 50,
    })
    expect(getModelPricing("claude-fable-5-1", "2026-09-02")?.rates.cacheRead).toBe(
      0.25
    )
    expect(getModelPricing("claude-fable-5", "2026-09-02")?.rates.cacheRead).toBe(1)
  })

  it("estimates the recorded Fable 5.1 timezone cursor-agent run", () => {
    const estimate = estimateModelCost(
      "claude-fable-5-1-thinking-medium",
      "2026-09-02",
      usage({
        input_tokens: 146,
        processed_input_tokens: 6_827_694,
        cached_input_tokens: 6_723_390,
        cache_creation_input_tokens: 104_158,
        output_tokens: 51_622,
      })
    )

    expect(estimate?.pricing.label).toBe("Claude Fable 5.1")
    expect(estimate?.totalUsd).toBeCloseTo(5.5653825, 6)
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

  it("prices every Cursor Haiku 5.5 alias at official rates", () => {
    for (const model of [
      "claude-haiku-5-5-thinking-medium",
      "claude-haiku-5-5-thinking-xhigh",
      "claude-haiku-5.5-300k-extra-high",
    ]) {
      expect(getModelPricing(model, "2026-10-09")?.rates).toMatchObject({
        input: 0.1,
        cacheRead: 0.01,
        cacheWrite: 0.125,
        cacheWrite1h: 0.2,
        output: 0.5,
      })
    }
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

  it("uses official Grok rates for Cursor Grok aliases", () => {
    expect(getModelPricing("cursor-grok-4.6-high", "2026-08-13")?.rates).toEqual({
      input: 2,
      cacheRead: 0.5,
      cacheWrite: 2,
      output: 6,
    })
    expect(
      getModelPricing("cursor-grok-4.6-high-fast", "2026-08-13")?.rates
    ).toEqual({
      input: 4,
      cacheRead: 1,
      cacheWrite: 4,
      output: 12,
    })
    expect(getModelPricing("cursor-grok-4.5-high", "2026-07-20")?.rates).toEqual({
      input: 2,
      cacheRead: 0.3,
      cacheWrite: 2,
      output: 6,
    })
    expect(getModelPricing("cursor-grok-4.3-high", "2026-07-20")?.rates).toEqual({
      input: 1.25,
      cacheRead: 0.2,
      cacheWrite: 1.25,
      output: 2.5,
    })
    expect(getModelPricing("grok-4.20", "2026-07-20")?.rates).toEqual({
      input: 1.25,
      cacheRead: 0.2,
      cacheWrite: 1.25,
      output: 2.5,
    })
    expect(getModelPricing("grok-code-fast-1", "2026-07-20")?.rates).toEqual({
      input: 1,
      cacheRead: 0.2,
      cacheWrite: 1,
      output: 2,
    })
    expect(getModelPricing("cursor-grok-4.5-high", "2026-07-20")?.sourceUrl).toBe(
      "https://docs.x.ai/developers/pricing"
    )
    expect(getModelPricing("cursor-grok-4.6-high", "2026-08-13")?.sourceUrl).toBe(
      "https://cursor.com/grok"
    )
    expect(getModelPricing("grok-4.7-high", "2026-09-22")?.rates).toEqual({
      input: 2,
      cacheRead: 0.5,
      cacheWrite: 2,
      output: 6,
    })
    expect(getModelPricing("grok-4.7-high-fast", "2026-09-22")?.rates).toEqual({
      input: 4,
      cacheRead: 1,
      cacheWrite: 4,
      output: 12,
    })
    expect(getModelPricing("grok-4.7-high", "2026-09-22")?.label).toBe("Grok 4.7")
    expect(getModelPricing("grok-4.7-high", "2026-09-22")?.sourceUrl).toBe(
      "https://docs.x.ai/developers/pricing"
    )
  })

  it("estimates the recorded Grok 4.6 earthquake run at Cursor rates", () => {
    const estimate = estimateModelCost(
      "cursor-grok-4.6-high",
      "2026-08-13",
      usage({
        input_tokens: 617_223,
        processed_input_tokens: 9_186_683,
        cached_input_tokens: 8_506_240,
        cache_creation_input_tokens: 0,
        output_tokens: 63_220,
      })
    )

    expect(estimate?.pricing.label).toBe("Cursor Grok 4.6")
    expect(estimate?.totalUsd).toBeCloseTo(5.866886, 6)
  })

  it("reproduces the cost the harness recorded for an Opus 5 run", () => {
    // runs/20260725T100320Z-claude-opus-5-cc/data/timezone-checker
    const estimate = estimateModelCost(
      "claude-opus-5",
      "2026-07-25",
      usage({
        input_tokens: 204,
        processed_input_tokens: 10_724_396,
        cached_input_tokens: 10_588_205,
        cache_creation_input_tokens: 135_987,
        output_tokens: 74_531,
        raw_usage: {
          cache_creation: {
            ephemeral_5m_input_tokens: 0,
            ephemeral_1h_input_tokens: 135_987,
          },
        },
      })
    )

    expect(estimate?.pricing.label).toBe("Claude Opus 5")
    expect(estimate?.totalUsd).toBeCloseTo(8.5182675, 6)
  })

  it("bills from the per-model counters rather than the session ones", () => {
    // runs/20260725T100320Z-claude-opus-5-cc-11/data/car-crash — the session
    // block drops what sub-agents spent, so it underprices this run by 4%.
    const estimate = estimateModelCost(
      "claude-opus-5",
      "2026-07-25",
      usage({
        input_tokens: 338,
        processed_input_tokens: 19_056_427,
        cached_input_tokens: 18_631_175,
        cache_creation_input_tokens: 424_914,
        output_tokens: 253_435,
        model_usage: {
          "claude-opus-5": {
            inputTokens: 6_327,
            outputTokens: 278_235,
            cacheReadInputTokens: 18_957_442,
            cacheCreationInputTokens: 427_460,
          },
        },
        raw_usage: {
          cache_creation: {
            ephemeral_5m_input_tokens: 0,
            ephemeral_1h_input_tokens: 424_914,
          },
        },
      })
    )

    const recorded = 20.7312835
    expect(estimate?.totalUsd).toBeGreaterThan(recorded * 0.999)
    expect(estimate?.totalUsd).toBeLessThan(recorded * 1.001)
  })

  it("bills a one-hour cache write at twice the input rate", () => {
    const shared = {
      input_tokens: 0,
      processed_input_tokens: 1_000_000,
      cached_input_tokens: 0,
      cache_creation_input_tokens: 1_000_000,
      output_tokens: 0,
    }
    const fiveMinute = estimateModelCost(
      "claude-opus-5",
      "2026-07-25",
      usage(shared)
    )
    const oneHour = estimateModelCost(
      "claude-opus-5",
      "2026-07-25",
      usage({
        ...shared,
        raw_usage: {
          cache_creation: {
            ephemeral_5m_input_tokens: 0,
            ephemeral_1h_input_tokens: 1_000_000,
          },
        },
      })
    )

    expect(fiveMinute?.totalUsd).toBe(6.25)
    expect(oneHour?.totalUsd).toBe(10)
  })

  it("ignores a TTL split that does not account for every cache write", () => {
    const estimate = estimateModelCost(
      "claude-opus-5",
      "2026-07-25",
      usage({
        input_tokens: 0,
        processed_input_tokens: 1_000_000,
        cached_input_tokens: 0,
        cache_creation_input_tokens: 1_000_000,
        output_tokens: 0,
        raw_usage: {
          cache_creation: { ephemeral_1h_input_tokens: 400_000 },
        },
      })
    )

    expect(estimate?.totalUsd).toBe(6.25)
  })

  it("uses Gemini 3.7 Flash introductory pricing only through December 2026", () => {
    expect(
      getModelPricing("gemini-3.7-flash-high", "2026-12-31")?.rates
    ).toEqual({
      input: 0.75,
      cacheRead: 0.075,
      cacheWrite: 0.75,
      output: 3.75,
    })
    expect(
      getModelPricing("gemini-3-7-flash", "2027-01-01")?.rates
    ).toEqual({
      input: 1.5,
      cacheRead: 0.15,
      cacheWrite: 1.5,
      output: 7.5,
    })
    expect(
      getModelPricing("gemini-3.7-flash-high", "2026-08-20")?.sourceUrl
    ).toBe("https://ai.google.dev/gemini-api/docs/pricing")
  })

  it("maps Gemini 3.8 Flash aliases to the same introductory Google rates as 3.7", () => {
    expect(
      getModelPricing("gemini-3.8-flash-high", "2026-09-03")?.rates
    ).toEqual({
      input: 0.75,
      cacheRead: 0.075,
      cacheWrite: 0.75,
      output: 3.75,
    })
    expect(
      getModelPricing("gemini-3.8-flash-high", "2026-09-03")?.label
    ).toBe("Gemini 3.8 Flash · introductory pricing")
    expect(
      getModelPricing("gemini-3-8-flash", "2027-01-01")?.rates
    ).toEqual({
      input: 1.5,
      cacheRead: 0.15,
      cacheWrite: 1.5,
      output: 7.5,
    })
  })

  it("maps Gemini 4 Argon effort IDs to introductory, then standard Google rates", () => {
    for (const model of [
      "gemini-4-argon",
      "gemini-4-argon-medium",
      "gemini-4-argon-high",
    ]) {
      expect(getModelPricing(model, "2026-10-14")?.rates).toEqual({
        input: 2,
        cacheRead: 0.1,
        cacheWrite: 2,
        output: 10,
      })
    }
    expect(getModelPricing("gemini-4-argon-high", "2026-10-14")?.label).toBe(
      "Gemini 4 Argon · introductory pricing"
    )
    expect(getModelPricing("gemini-4-argon-medium", "2026-12-01")?.rates).toEqual({
      input: 4,
      cacheRead: 0.2,
      cacheWrite: 4,
      output: 20,
    })
  })

  it("estimates the recorded Gemini 3.7 Flash runs at introductory Google rates", () => {
    const earthquake = estimateModelCost(
      "gemini-3.7-flash-high",
      "2026-08-20",
      usage({
        input_tokens: 113_459,
        processed_input_tokens: 484_146,
        cached_input_tokens: 370_687,
        cache_creation_input_tokens: 0,
        output_tokens: 16_666,
      })
    )
    const timezone = estimateModelCost(
      "gemini-3.7-flash-high",
      "2026-08-20",
      usage({
        input_tokens: 391_754,
        processed_input_tokens: 6_273_209,
        cached_input_tokens: 5_881_455,
        cache_creation_input_tokens: 0,
        output_tokens: 54_778,
      })
    )

    expect(earthquake?.pricing.label).toBe(
      "Gemini 3.7 Flash · introductory pricing"
    )
    expect(earthquake?.totalUsd).toBeCloseTo(0.175393275, 6)
    expect(timezone?.totalUsd).toBeCloseTo(0.940342125, 6)
  })

  it("uses official Muse Spark 1.3 standard rates", () => {
    expect(getModelPricing("muse-spark-1.3-high", "2026-09-09")?.rates).toEqual({
      input: 1.25,
      cacheRead: 0.15,
      cacheWrite: 1.25,
      output: 4.25,
    })
    expect(getModelPricing("muse-spark-1.3-high", "2026-09-09")?.label).toBe(
      "Muse Spark 1.3"
    )
    expect(getModelPricing("muse-spark-1.3-1m", "2026-09-09")?.label).toBe(
      "Muse Spark 1.3"
    )
    expect(getModelPricing("Muse Spark 1.3 1M", "2026-09-09")?.label).toBe(
      "Muse Spark 1.3"
    )
    expect(getModelPricing("muse-spark-1.3-high", "2026-09-09")?.sourceUrl).toBe(
      "https://ai.developer.meta.com/docs/pricing-rate-limits"
    )
    expect(getModelPricing("muse-spark-1.2", "2026-09-09")?.label).toBe(
      "Muse Spark 1.2"
    )
    expect(
      getModelPricing("muse-spark-1.3-contributor", "2026-09-09")
    ).toBeNull()
  })

  it("uses official Muse Wonder 1.0 standard rates", () => {
    expect(getModelPricing("muse-wonder-1.0", "2026-10-15")?.rates).toEqual({
      input: 4,
      cacheRead: 0.2,
      cacheWrite: 4,
      output: 20,
    })
    expect(getModelPricing("muse-wonder-1-0-xhigh", "2026-10-15")?.label).toBe(
      "Muse Wonder 1.0"
    )
  })

  it("prices Muse Wonder Full at Muse Wonder rates and labels the estimate", () => {
    const pricing = getModelPricing("muse-wonder-full-1.0", "2026-10-15")
    expect(pricing?.rates).toEqual({ input: 4, cacheRead: 0.2, cacheWrite: 4, output: 20 })
    expect(pricing?.label).toContain("estimated")
  })

  it("estimates a Muse Spark run at Meta standard rates", () => {
    const estimate = estimateModelCost(
      "muse-spark-1.3-high",
      "2026-09-09",
      usage({
        input_tokens: 200_000,
        processed_input_tokens: 1_200_000,
        cached_input_tokens: 1_000_000,
        cache_creation_input_tokens: 0,
        output_tokens: 40_000,
      })
    )

    expect(estimate?.pricing.label).toBe("Muse Spark 1.3")
    expect(estimate?.totalUsd).toBeCloseTo(0.57, 6)
    expect(
      estimateModelCost(
        "muse-spark-1.3-high",
        "2026-09-09",
        usage({
          status: "partial",
          input_tokens: 1_681,
          processed_input_tokens: 1_681,
          cached_input_tokens: 0,
          output_tokens: 0,
        })
      )?.totalUsd
    ).toBeCloseTo(0.002101, 6)
    expect(
      estimateModelCost(
        "muse-spark-1.3-high",
        "2026-09-09",
        usage({ status: "unavailable", duration_api_ms: 20_394 })
      )
    ).toBeNull()
  })

  it("uses official GPT-6 Astra rates", () => {
    expect(getModelPricing("gpt-6-astra", "2026-09-05")?.rates).toEqual({
      input: 10,
      cacheRead: 1,
      cacheWrite: 12.5,
      output: 50,
    })
    expect(getModelPricing("gpt-6-astra", "2026-09-05")?.sourceUrl).toBe(
      "https://developers.openai.com/api/docs/pricing"
    )
  })

  it("estimates the recorded GPT-6 Astra timezone-checker run", () => {
    const estimate = estimateModelCost(
      "gpt-6-astra",
      "2026-09-05",
      usage({
        input_tokens: 2_710_133,
        processed_input_tokens: 2_710_133,
        cached_input_tokens: 2_498_560,
        output_tokens: 25_089,
      })
    )

    expect(estimate?.pricing.label).toBe("GPT-6 Astra")
    expect(estimate?.totalUsd).toBeCloseTo(5.86874, 6)
  })

  it("does not invent pricing for an unknown model", () => {
    expect(getModelPricing("unknown-model", "2026-07-13")).toBeNull()
  })
})
