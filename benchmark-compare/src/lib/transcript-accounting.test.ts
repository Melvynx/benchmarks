import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  readFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { readTranscriptAccounting, replayCursorTranscript } from "./transcript-accounting.server"

describe("transcript accounting", () => {
  it("replays an interrupted Cursor stream into model calls and output characters", () => {
    const lines = [
      { type: "system", subtype: "init" },
      { type: "thinking", subtype: "delta", text: "abcd" },
      { type: "assistant", message: { content: [{ type: "text", text: "hi" }] } },
      { type: "tool_call", subtype: "started", tool_call: { editToolCall: { args: { p: 1 } } } },
      { type: "tool_call", subtype: "completed", tool_call: { editToolCall: { args: { p: 1 }, result: "x".repeat(99) } } },
      { type: "thinking", subtype: "delta", text: "ef" },
    ]
    expect(replayCursorTranscript(lines.map((line) => JSON.stringify(line)).join("\n"))).toEqual({
      calls: 2,
      outputCharacters: 4 + 2 + '{"p":1}'.length + 2,
    })
  })

  it("keeps Cursor text approximations outside token-backed costs", () => {
    const directory = join(mkdtempSync(join(tmpdir(), "benchmark-unreported-")), "runs", "run", "data", "task")
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, "metadata.json"), JSON.stringify({
      model: "claude-opus-5-5-medium", harness: "cursor-agent", effort: "medium",
      model_timing: { started_at: "2026-09-30T00:00:00Z", completed_at: "2026-09-30T00:01:00Z", duration_ms: 60000 },
    }))
    writeFileSync(join(directory, "transcript.jsonl"), JSON.stringify({ type: "thinking", subtype: "delta", text: "Actual generated reasoning without a final usage record." }))
    const ledger = readTranscriptAccounting(directory)
    expect(ledger.costUsd).toBeNull()
    expect(ledger.estimatedCostUsd).toBeNull()
    expect(ledger.approximateCostUsd).toBeGreaterThan(0)
    expect(ledger.unknownCosts).toBe(1)
    expect(ledger.complete).toBe(false)
    expect(ledger.durationMs).toBe(60000)
  })

  it("counts every continuation and iteration once, preserves evidence, and leaves missing billing unknown", () => {
    const root = mkdtempSync(join(tmpdir(), "benchmark-accounting-"))
    const first = join(root, "runs", "first", "data", "task")
    const next = join(root, "runs", "next", "data", "task")
    const last = join(root, "runs", "last", "data", "task")
    for (const directory of [
      first,
      next,
      last,
      join(next, "iterations", "1"),
      join(next, "iterations", "2"),
    ])
      mkdirSync(directory, { recursive: true })
    const timing = {
      started_at: "2026-09-29T00:00:00Z",
      completed_at: "2026-09-29T00:00:01Z",
      duration_ms: 1000,
    }
    const meta = (directory: string, extra = {}) =>
      writeFileSync(
        join(directory, "metadata.json"),
        JSON.stringify({
          model: "claude-sonnet-5-5",
          harness: "cc",
          effort: "medium",
          model_timing: timing,
          ...extra,
        })
      )
    const record = (cost: number) =>
      JSON.stringify({
        type: "result",
        total_cost_usd: cost,
        usage: { input_tokens: 10, output_tokens: 10 },
      })
    meta(first)
    meta(next, { continuation_of: first })
    meta(last, { continuation_of: next })
    writeFileSync(join(first, "transcript.jsonl"), record(2))
    writeFileSync(join(next, "iterations", "1", "transcript.jsonl"), record(3))
    meta(join(next, "iterations", "1"))
    meta(join(next, "iterations", "2"))
    writeFileSync(join(next, "iterations", "2", "transcript.jsonl"), record(5))
    symlinkSync(
      join(next, "iterations", "1", "transcript.jsonl"),
      join(next, "transcript.jsonl")
    )
    meta(last, {
      continuation_of: next,
      session_usage: {
        schema_version: 1,
        status: "complete",
        source: "thinking-deltas.scaled-from-resume",
        total_cost_usd: 99,
      },
    })
    writeFileSync(
      join(last, "transcript.jsonl"),
      '{"type":"thinking","text":"unfinished"}'
    )
    const sibling = join(root, "runs", "parallel-recovery", "data", "task")
    mkdirSync(sibling, { recursive: true })
    meta(sibling, { continuation_of: first })
    writeFileSync(join(sibling, "transcript.jsonl"), record(7))
    const before = readFileSync(join(first, "transcript.jsonl"), "utf8")
    const ledger = readTranscriptAccounting(last)
    expect(ledger.transcripts).toHaveLength(5)
    expect(ledger.costUsd).toBe(17)
    expect(ledger.durationMs).toBe(4000)
    expect(ledger.stalledDurationMs).toBe(1000)
    expect(ledger.unknownCosts).toBe(1)
    expect(ledger.complete).toBe(false)
    expect(readFileSync(join(first, "transcript.jsonl"), "utf8")).toBe(before)
    expect(
      ledger.transcripts.find((item) => item.costUsd === 3)?.aliases
    ).toHaveLength(2)
  })

  it("does not bill cumulative Codex tokens again when a session resumes", () => {
    const root = mkdtempSync(join(tmpdir(), "benchmark-codex-"))
    const directory = join(root, "run", "data", "task")
    const iteration = join(directory, "iterations", "1")
    mkdirSync(iteration, { recursive: true })
    writeFileSync(
      join(directory, "metadata.json"),
      JSON.stringify({
        model: "gpt-6-sol",
        harness: "codex",
        model_timing: {
          started_at: "2026-09-29T00:00:00Z",
          completed_at: "2026-09-29T00:01:00Z",
          duration_ms: 60000,
        },
      })
    )
    writeFileSync(
      join(iteration, "metadata.json"),
      JSON.stringify({
        model_timing: {
          started_at: "2026-09-29T00:02:00Z",
          completed_at: "2026-09-29T00:03:00Z",
          duration_ms: 60000,
        },
      })
    )
    writeFileSync(
      join(directory, "transcript.jsonl"),
      JSON.stringify({
        type: "turn.completed",
        usage: {
          input_tokens: 1_000_000,
          cached_input_tokens: 0,
          output_tokens: 0,
        },
      })
    )
    writeFileSync(
      join(iteration, "transcript.jsonl"),
      JSON.stringify({
        type: "turn.completed",
        usage: {
          input_tokens: 1_500_000,
          cached_input_tokens: 0,
          output_tokens: 0,
        },
      })
    )
    const ledger = readTranscriptAccounting(directory)
    expect(ledger.costUsd).toBe(3)
    expect(ledger.tokens).toBe(1_500_000)
    expect(ledger.durationMs).toBe(120000)
  })

  it("prices the actual model on each attempt and uses reported cost in preference to estimates", () => {
    const root = mkdtempSync(join(tmpdir(), "benchmark-pricing-"))
    const directory = join(root, "run", "data", "task")
    mkdirSync(directory, { recursive: true })
    writeFileSync(
      join(directory, "metadata.json"),
      JSON.stringify({
        model: "claude-sonnet-5-5-xhigh",
        harness: "cursor-agent",
        model_timing: {
          started_at: "2026-09-29T00:00:00Z",
          completed_at: "2026-09-29T00:01:00Z",
          duration_ms: 60000,
        },
      })
    )
    const record = {
      type: "result",
      usage: {
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    }
    writeFileSync(join(directory, "transcript.jsonl"), JSON.stringify(record))
    expect(readTranscriptAccounting(directory).estimatedCostUsd).toBe(12)
    writeFileSync(
      join(directory, "transcript.jsonl"),
      JSON.stringify({ ...record, total_cost_usd: 9 })
    )
    const ledger = readTranscriptAccounting(directory)
    expect(ledger.costUsd).toBe(9)
    expect(ledger.estimatedCostUsd).toBeNull()
  })

  it("counts an iteration snapshot that copies the top-level transcript once", () => {
    const root = mkdtempSync(join(tmpdir(), "benchmark-copy-"))
    const directory = join(root, "run", "data", "task")
    const iteration = join(directory, "iterations", "1")
    mkdirSync(iteration, { recursive: true })
    const metadata = JSON.stringify({
      model: "claude-opus-5-5",
      harness: "cursor-agent",
      model_timing: {
        started_at: "2026-09-29T00:00:00Z",
        completed_at: "2026-09-29T00:01:00Z",
        duration_ms: 60000,
      },
    })
    writeFileSync(join(directory, "metadata.json"), metadata)
    writeFileSync(join(iteration, "metadata.json"), metadata)
    const record = JSON.stringify({
      type: "result",
      usage: { inputTokens: 1_000_000, outputTokens: 0 },
    })
    writeFileSync(join(directory, "transcript.jsonl"), record)
    writeFileSync(join(iteration, "transcript.jsonl"), record)
    const ledger = readTranscriptAccounting(directory)
    expect(ledger.transcripts).toHaveLength(1)
    expect(ledger.transcripts[0].aliases).toHaveLength(2)
    expect(ledger.costUsd).toBe(4)
    expect(ledger.durationMs).toBe(60000)
  })

  it("re-prices a Claude Code total reported without a list rate, even when usage was zeroed", () => {
    const root = mkdtempSync(join(tmpdir(), "benchmark-basis-"))
    const directory = join(root, "run", "data", "task")
    mkdirSync(directory, { recursive: true })
    writeFileSync(
      join(directory, "metadata.json"),
      JSON.stringify({
        model: "claude-sonnet-5-5",
        harness: "cc",
        model_timing: {
          started_at: "2026-09-29T00:00:00Z",
          completed_at: "2026-09-29T00:01:00Z",
          duration_ms: 60000,
        },
      })
    )
    const modelUsage = (costBasis: string) => ({
      "claude-sonnet-5-5": {
        inputTokens: 0,
        outputTokens: 1_000_000,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 1_000_000,
        costUSD: 28,
        costBasis,
      },
    })
    const write = (costBasis: string) =>
      writeFileSync(
        join(directory, "transcript.jsonl"),
        JSON.stringify({
          type: "result",
          total_cost_usd: 28,
          usage: { input_tokens: 0, output_tokens: 0 },
          modelUsage: modelUsage(costBasis),
        })
      )
    write("unknown")
    const repriced = readTranscriptAccounting(directory)
    expect(repriced.costUsd).toBe(14)
    expect(repriced.reportedCostUsd).toBeNull()
    expect(repriced.transcripts[0].harnessCostUsd).toBe(28)
    expect(repriced.tokens).toBe(2_000_000)
    write("list")
    expect(readTranscriptAccounting(directory).costUsd).toBe(28)
  })
})
