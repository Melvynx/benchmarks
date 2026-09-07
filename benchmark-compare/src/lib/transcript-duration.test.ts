import { describe, expect, it } from "vitest"

import { activeTranscriptDurationMs } from "./transcript-duration"

function record(
  timestamp: number,
  type: string,
  subtype: string | null = null
) {
  return JSON.stringify({ type, subtype, timestamp_ms: timestamp })
}

describe("activeTranscriptDurationMs", () => {
  it("excludes prolonged waits for background task notifications", () => {
    const transcript = [
      record(0, "system", "init"),
      record(10_000, "thinking", "completed"),
      record(2_610_000, "system", "task_notification"),
      record(2_620_000, "thinking", "completed"),
      record(3_010_000, "system", "task_notification"),
      record(3_020_000, "result", "success"),
    ].join("\n")

    expect(activeTranscriptDurationMs(transcript)).toBe(30_000)
  })

  it("keeps long tool calls because they are active work", () => {
    const transcript = [
      record(0, "tool_call", "started"),
      record(91_000, "tool_call", "completed"),
    ].join("\n")

    expect(activeTranscriptDurationMs(transcript)).toBe(91_000)
  })
})
