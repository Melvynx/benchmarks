import { describe, expect, it } from "vitest"

import { parseSessionUsageTranscript } from "./session-usage"

describe("parseSessionUsageTranscript", () => {
  it("normalizes Codex usage without double-counting cached input", () => {
    const usage = parseSessionUsageTranscript(
      JSON.stringify({
        type: "turn.completed",
        usage: {
          input_tokens: 100,
          cached_input_tokens: 80,
          output_tokens: 20,
          reasoning_output_tokens: 5,
        },
      })
    )

    expect(usage).toMatchObject({
      input_tokens: 100,
      processed_input_tokens: 100,
      cached_input_tokens: 80,
      output_tokens: 20,
      reasoning_output_tokens: 5,
      total_tokens: 120,
    })
  })

  it("uses the last Claude-compatible result and includes cache processing", () => {
    const usage = parseSessionUsageTranscript(
      [
        JSON.stringify({ type: "result", usage: { input_tokens: 1 } }),
        JSON.stringify({
          type: "result",
          usage: {
            input_tokens: 10,
            cache_read_input_tokens: 30,
            cache_creation_input_tokens: 5,
            output_tokens: 4,
            service_tier: "standard",
          },
          duration_ms: 2_000,
          total_cost_usd: 1.25,
          num_turns: 3,
          modelUsage: { model: { contextWindow: 200_000 } },
        }),
      ].join("\n")
    )

    expect(usage).toMatchObject({
      input_tokens: 10,
      processed_input_tokens: 45,
      cached_input_tokens: 30,
      cache_creation_input_tokens: 5,
      output_tokens: 4,
      total_tokens: 49,
      duration_ms: 2_000,
      total_cost_usd: 1.25,
      num_turns: 3,
      service_tier: "standard",
    })
  })
})
