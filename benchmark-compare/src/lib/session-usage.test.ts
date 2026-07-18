import { describe, expect, it } from "vitest"

import {
  parsePersistedSessionUsage,
  parseSessionUsageTranscript,
} from "./session-usage"

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

  it("accepts usage recovered from completed messages after an interrupted run", () => {
    expect(
      parsePersistedSessionUsage({
        status: "partial",
        schema_version: 1,
        source: "claude-session.assistant.message.usage",
        input_tokens: 10,
        processed_input_tokens: 40,
        cached_input_tokens: 30,
        cache_creation_input_tokens: 0,
        output_tokens: 5,
        reasoning_output_tokens: null,
        total_tokens: 45,
        total_cost_usd: null,
        duration_ms: null,
        duration_api_ms: null,
        num_turns: 2,
        service_tier: "standard",
        speed: "standard",
        inference_geo: null,
        server_tool_use: null,
        model_usage: null,
        raw_usage: null,
      })
    ).toMatchObject({ status: "partial", total_tokens: 45 })
  })
})
