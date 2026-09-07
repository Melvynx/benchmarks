import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import trash from "trash"
import { afterEach, describe, expect, it } from "vitest"

import {
  getBenchmarkAsset,
  getBenchmarkEntries,
  getBenchmarkEvidence,
} from "./benchmarks.server"

describe("getBenchmarkEntries", () => {
  const previousRoot = process.env.BENCHMARK_ROOT
  let root = ""

  afterEach(async () => {
    if (root && existsSync(root)) await trash(root)
    root = ""
    if (previousRoot === undefined) delete process.env.BENCHMARK_ROOT
    else process.env.BENCHMARK_ROOT = previousRoot
  })

  it("groups distinct model runs under their shared benchmark ID", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-catalog-"))
    process.env.BENCHMARK_ROOT = root
    const benchmarkId = "benchmark-20260713T120000Z-1234abcd"
    const task = "bouncing-ball"

    for (const model of ["gpt-5.6-terra", "gpt-5.6-luna"]) {
      const result = `2026-07-13-codex-${model}`
      const appPath = join(root, "benchmarks", task, result)
      const runId = `20260713T120000Z-${model}-codex`
      const dataPath = join(root, "runs", runId, "data", task)
      mkdirSync(appPath, { recursive: true })
      mkdirSync(dataPath, { recursive: true })
      writeFileSync(join(appPath, "index.html"), "<!doctype html>")
      writeFileSync(join(dataPath, "app-path.txt"), `${appPath}\n`)
      writeFileSync(
        join(dataPath, "metadata.json"),
        JSON.stringify({
          benchmark_id: benchmarkId,
          effort: "medium",
          harness: "codex",
          model,
          model_timing: { duration_ms: 1_000 },
        })
      )
    }

    const entries = getBenchmarkEntries()

    expect(entries).toHaveLength(2)
    expect(new Set(entries.map((entry) => entry.benchmarkId))).toEqual(
      new Set([benchmarkId])
    )
    expect(new Set(entries.map((entry) => entry.runId)).size).toBe(2)
  })

  it("shows active duration for Cursor while preserving recorded wall time", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-catalog-"))
    process.env.BENCHMARK_ROOT = root
    const task = "earthquake-explorer"
    const result = "2026-08-13-cursor-agent-cursor-grok-4-6-high"
    const appPath = join(root, "benchmarks", task, result)
    const dataPath = join(
      root,
      "runs",
      "20260813T004955Z-cursor-grok-4-6-high-cursor-agent",
      "data",
      task
    )
    mkdirSync(appPath, { recursive: true })
    mkdirSync(dataPath, { recursive: true })
    writeFileSync(join(appPath, "index.html"), "<!doctype html>")
    writeFileSync(join(dataPath, "app-path.txt"), `${appPath}\n`)
    writeFileSync(
      join(dataPath, "transcript.jsonl"),
      [
        JSON.stringify({ type: "system", subtype: "init", timestamp_ms: 0 }),
        JSON.stringify({
          type: "thinking",
          subtype: "completed",
          timestamp_ms: 10_000,
        }),
        JSON.stringify({
          type: "system",
          subtype: "task_notification",
          timestamp_ms: 2_610_000,
        }),
        JSON.stringify({ type: "result", subtype: "success", timestamp_ms: 2_620_000 }),
      ].join("\n")
    )
    writeFileSync(
      join(dataPath, "metadata.json"),
      JSON.stringify({
        benchmark_id: "benchmark-20260813T004955Z-0c1393e6",
        effort: "high",
        harness: "cursor-agent",
        model: "cursor-grok-4.6-high",
        model_timing: { duration_ms: 2_620_000 },
      })
    )

    expect(getBenchmarkEntries()).toEqual([
      expect.objectContaining({ durationMs: 20_000 }),
    ])
  })

  it("loads every resumed transcript in execution order", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-catalog-"))
    process.env.BENCHMARK_ROOT = root
    const task = "simulation-life"
    const result = "2026-08-13-cursor-agent-cursor-grok-4-6-high"
    const appPath = join(root, "benchmarks", task, result)
    const runId = "20260813T025640Z-cursor-grok-4-6-high-cursor-agent"
    const dataPath = join(root, "runs", runId, "data", task)
    mkdirSync(appPath, { recursive: true })
    mkdirSync(dataPath, { recursive: true })
    writeFileSync(join(appPath, "index.html"), "<!doctype html>")
    writeFileSync(join(dataPath, "app-path.txt"), `${appPath}\n`)
    writeFileSync(
      join(dataPath, "transcript.jsonl"),
      [
        JSON.stringify({ type: "system", subtype: "init", timestamp_ms: 0 }),
        JSON.stringify({ type: "assistant", marker: "initial", timestamp_ms: 10_000 }),
      ].join("\n")
    )
    writeFileSync(
      join(dataPath, "transcript-resume-1.jsonl"),
      [
        JSON.stringify({ type: "system", subtype: "init", timestamp_ms: 100_000 }),
        JSON.stringify({ type: "result", marker: "resumed", timestamp_ms: 120_000 }),
      ].join("\n")
    )
    writeFileSync(
      join(dataPath, "metadata.json"),
      JSON.stringify({
        benchmark_id: "benchmark-20260813T004955Z-0c1393e6",
        effort: "high",
        harness: "cursor-agent",
        model: "cursor-grok-4.6-high",
        model_timing: { duration_ms: 120_000 },
      })
    )

    const evidence = getBenchmarkEvidence(`${task}/${result}`)

    expect(evidence?.transcriptPaths).toEqual([
      `runs/${runId}/data/${task}/transcript.jsonl`,
      `runs/${runId}/data/${task}/transcript-resume-1.jsonl`,
    ])
    expect(evidence?.transcript.indexOf('"marker":"initial"')).toBeLessThan(
      evidence?.transcript.indexOf('"marker":"resumed"') ?? -1
    )
    expect(evidence?.activeDurationMs).toBe(30_000)
  })

  it("includes transcript evidence when an SSR app has no static preview", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-catalog-"))
    process.env.BENCHMARK_ROOT = root
    const task = "thumbfast"
    const result = "2026-08-13-cursor-agent-cursor-grok-4-6-high"
    const appPath = join(root, "benchmarks", task, result)
    const runId = "20260813T004955Z-cursor-grok-4-6-high-cursor-agent"
    const dataPath = join(root, "runs", runId, "data", task)
    mkdirSync(join(appPath, ".output", "public"), { recursive: true })
    mkdirSync(dataPath, { recursive: true })
    writeFileSync(join(dataPath, "app-path.txt"), `${appPath}\n`)
    writeFileSync(
      join(dataPath, "transcript.jsonl"),
      [
        JSON.stringify({
          type: "system",
          subtype: "init",
          model: "Cursor Grok 4.6 High",
          timestamp_ms: 0,
        }),
        JSON.stringify({ type: "result", subtype: "success", timestamp_ms: 1_000 }),
      ].join("\n")
    )
    writeFileSync(
      join(dataPath, "metadata.json"),
      JSON.stringify({
        benchmark_id: "benchmark-20260813T004955Z-0c1393e6",
        effort: "high",
        harness: "cursor-agent",
        model: "cursor-grok-4.6-high",
      })
    )

    expect(getBenchmarkEntries()).toEqual([
      expect.objectContaining({
        hasPreview: false,
        hasTranscript: true,
        model: "cursor-grok-4.6-high",
      }),
    ])
  })

  it("does not treat a Vite stub without compiled output as a static preview", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-catalog-"))
    process.env.BENCHMARK_ROOT = root
    const task = "earthquake-explorer"
    const result = "2026-08-20-cursor-agent-gemini-3-7-flash-high-2"
    const appPath = join(root, "benchmarks", task, result)
    const dataPath = join(
      root,
      "runs",
      "20260820T043659Z-gemini-3-7-flash-high-cursor-agent-5",
      "data",
      task
    )
    mkdirSync(appPath, { recursive: true })
    mkdirSync(dataPath, { recursive: true })
    writeFileSync(
      join(appPath, "index.html"),
      '<!doctype html><script type="module" src="/src/main.tsx"></script>'
    )
    writeFileSync(join(dataPath, "app-path.txt"), `${appPath}\n`)
    writeFileSync(
      join(dataPath, "transcript.jsonl"),
      `${JSON.stringify({ type: "system", subtype: "init", timestamp_ms: 0 })}\n`
    )
    writeFileSync(
      join(dataPath, "metadata.json"),
      JSON.stringify({
        benchmark_id: "benchmark-20260820T043659Z-d96a75ee",
        effort: "high",
        harness: "cursor-agent",
        model: "gemini-3.7-flash-high",
        status: "harness-verified",
      })
    )

    expect(getBenchmarkEntries()).toEqual([
      expect.objectContaining({
        hasPreview: false,
        hasTranscript: true,
        source: "standalone",
      }),
    ])
  })

  it("uses the Cursor init event when metadata overstates the model", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-catalog-"))
    process.env.BENCHMARK_ROOT = root
    const task = "simulation-life"
    const result = "2026-08-13-cursor-agent-cursor-grok-4-6-high"
    const appPath = join(root, "benchmarks", task, result)
    const dataPath = join(root, "runs", "overstated-run", "data", task)
    mkdirSync(appPath, { recursive: true })
    mkdirSync(dataPath, { recursive: true })
    writeFileSync(join(appPath, "index.html"), "<!doctype html>")
    writeFileSync(join(dataPath, "app-path.txt"), `${appPath}\n`)
    writeFileSync(
      join(dataPath, "transcript.jsonl"),
      `${JSON.stringify({ type: "system", subtype: "init", model: "Cursor Grok 4.6" })}\n`
    )
    writeFileSync(
      join(dataPath, "metadata.json"),
      JSON.stringify({
        harness: "cursor-agent",
        model: "cursor-grok-4.6-high",
      })
    )

    expect(getBenchmarkEntries()).toEqual([
      expect.objectContaining({ model: "cursor-grok-4.6" }),
    ])
  })

  it("links a numbered cursor-agent run that never wrote metadata", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-catalog-"))
    process.env.BENCHMARK_ROOT = root
    const task = "gmail-clone"
    const result = "2026-09-03-cursor-agent-gemini-3-8-flash-high"
    const appPath = join(root, "benchmarks", task, result)
    const dataPath = join(
      root,
      "runs",
      "20260903T010208Z-gemini-3-8-flash-high-cursor-agent-3",
      "data",
      task
    )
    mkdirSync(appPath, { recursive: true })
    mkdirSync(dataPath, { recursive: true })
    writeFileSync(join(appPath, "index.html"), "<!doctype html>")
    writeFileSync(join(dataPath, "app-path.txt"), `${appPath}\n`)
    writeFileSync(
      join(dataPath, "transcript.jsonl"),
      [
        JSON.stringify({
          type: "system",
          subtype: "init",
          model: "Gemini 3.8 Flash High",
        }),
        JSON.stringify({
          type: "thinking",
          subtype: "delta",
          text: "I will inspect the mailbox seed next.",
        }),
        JSON.stringify({
          type: "tool_call",
          subtype: "started",
          tool_call: {
            readToolCall: {
              path: `${appPath}/src/App.tsx`,
            },
          },
        }),
      ].join("\n")
    )

    expect(getBenchmarkEntries()).toEqual([
      expect.objectContaining({
        hasTranscript: true,
        status: "interrupted",
        model: "gemini-3-8-flash-high",
      }),
    ])
    expect(
      getBenchmarkEvidence(`${task}/${result}`)?.integrityAnalysis?.status
    ).toBe("complete")
  })

  it("recovers one historical group from runs started seconds apart", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-catalog-"))
    process.env.BENCHMARK_ROOT = root
    const task = "earthquake-explorer"
    const runs = [
      {
        id: "20260713T071130Z-gpt-5-6-terra-codex",
        model: "gpt-5.6-terra",
        harness: "codex",
      },
      {
        id: "20260713T071135Z-gpt-5-6-sol-ccx",
        model: "gpt-5.6-sol",
        harness: "ccx",
      },
    ]

    for (const run of runs) {
      const result = `2026-07-13-${run.harness}-${run.model}`
      const appPath = join(root, "benchmarks", task, result)
      const dataPath = join(root, "runs", run.id, "data", task)
      mkdirSync(appPath, { recursive: true })
      mkdirSync(dataPath, { recursive: true })
      writeFileSync(join(appPath, "index.html"), "<!doctype html>")
      writeFileSync(join(dataPath, "app-path.txt"), `${appPath}\n`)
      writeFileSync(
        join(dataPath, "metadata.json"),
        JSON.stringify({
          effort: "medium",
          harness: run.harness,
          model: run.model,
          prompt_source: "/prompts/earthquake-explorer/v2.md",
        })
      )
    }

    const entries = getBenchmarkEntries()

    expect(entries.map((entry) => entry.benchmarkId)).toEqual([
      "legacy-20260713T071130Z-earthquake-explorer",
      "legacy-20260713T071130Z-earthquake-explorer",
    ])
  })

  it("resolves recorded app paths after the repository moves", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-catalog-"))
    process.env.BENCHMARK_ROOT = root
    const task = "car-crash"
    const result = "2026-07-13-codex-gpt-5-6-terra"
    const appPath = join(root, "benchmarks", task, result)
    const dataPath = join(
      root,
      "runs",
      "20260713T120000Z-gpt-5-6-terra-codex",
      "data",
      task
    )
    mkdirSync(appPath, { recursive: true })
    mkdirSync(dataPath, { recursive: true })
    writeFileSync(join(appPath, "index.html"), "<!doctype html>")
    writeFileSync(
      join(dataPath, "app-path.txt"),
      `/previous/machine/benchmarks/${task}/${result}\n`
    )
    writeFileSync(join(dataPath, "transcript.jsonl"), "{}\n")
    writeFileSync(
      join(dataPath, "metadata.json"),
      JSON.stringify({
        benchmark_id: "portable-benchmark",
        effort: "medium",
        harness: "codex",
        model: "gpt-5.6-terra",
      })
    )

    expect(getBenchmarkEntries()).toEqual([
      expect.objectContaining({
        appPath: `benchmarks/${task}/${result}`,
        benchmarkId: "portable-benchmark",
        hasTranscript: true,
      }),
    ])
  })

  it("excludes incomplete artifacts from failed runs", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-catalog-"))
    process.env.BENCHMARK_ROOT = root
    const task = "earthquake-explorer"
    const result = "2026-07-13-cc-claude-fable-5"
    const appPath = join(root, "benchmarks", task, result)
    const dataPath = join(
      root,
      "runs",
      "20260713T120000Z-claude-fable-5-cc",
      "data",
      task
    )
    mkdirSync(appPath, { recursive: true })
    mkdirSync(dataPath, { recursive: true })
    writeFileSync(join(appPath, "index.html"), "<!doctype html>")
    writeFileSync(join(dataPath, "app-path.txt"), `${appPath}\n`)
    writeFileSync(
      join(dataPath, "metadata.json"),
      JSON.stringify({
        app_path: appPath,
        effort: "medium",
        harness: "cc",
        model: "claude-fable-5",
        status: "failed",
      })
    )

    expect(getBenchmarkEntries()).toEqual([])
  })

  it("keeps a failed run that still recorded a transcript", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-catalog-"))
    process.env.BENCHMARK_ROOT = root
    const task = "gmail-clone"
    const result = "2026-09-03-cursor-agent-gemini-3-8-flash-high"
    const appPath = join(root, "benchmarks", task, result)
    const dataPath = join(
      root,
      "runs",
      "20260903T010208Z-gemini-3-8-flash-high-cursor-agent-3",
      "data",
      task
    )
    mkdirSync(appPath, { recursive: true })
    mkdirSync(dataPath, { recursive: true })
    writeFileSync(join(appPath, "index.html"), "<!doctype html>")
    writeFileSync(join(dataPath, "app-path.txt"), `${appPath}\n`)
    writeFileSync(
      join(dataPath, "transcript.jsonl"),
      `${JSON.stringify({ type: "assistant", message: { content: "ok" } })}\n`
    )
    writeFileSync(
      join(dataPath, "metadata.json"),
      JSON.stringify({
        effort: "high",
        harness: "cursor-agent",
        model: "gemini-3.8-flash-high",
        status: "failed",
      })
    )

    expect(getBenchmarkEntries()).toEqual([
      expect.objectContaining({
        id: `${task}/${result}`,
        status: "failed",
        hasTranscript: true,
      }),
    ])
  })

  it("includes a failed run after its application repair is verified", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-catalog-"))
    process.env.BENCHMARK_ROOT = root
    const task = "air-conditioning-understanding"
    const result = "2026-07-14-cc-claude-sonnet-5"
    const appPath = join(root, "benchmarks", task, result)
    const dataPath = join(
      root,
      "runs",
      "20260714T120000Z-claude-sonnet-5-cc",
      "data",
      task
    )
    mkdirSync(appPath, { recursive: true })
    mkdirSync(dataPath, { recursive: true })
    writeFileSync(join(appPath, "index.html"), "<!doctype html>")
    writeFileSync(join(dataPath, "app-path.txt"), `${appPath}\n`)
    writeFileSync(
      join(dataPath, "metadata.json"),
      JSON.stringify({
        app_path: appPath,
        effort: "xhigh",
        harness: "cc",
        model: "claude-sonnet-5",
        status: "failed",
        repair_note: { status: "verified" },
      })
    )

    expect(getBenchmarkEntries()).toEqual([
      expect.objectContaining({
        task,
        model: "claude-sonnet-5",
      }),
    ])
  })

  it("includes a failed run when captured failure evidence exists", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-catalog-"))
    process.env.BENCHMARK_ROOT = root
    const task = "gmail-clone"
    const result = "2026-07-17-cckimi-k3-1m"
    const appPath = join(root, "benchmarks", task, result)
    const dataPath = join(
      root,
      "runs",
      "20260717T052832Z-k3-1m-cckimi",
      "data",
      task
    )
    mkdirSync(appPath, { recursive: true })
    mkdirSync(dataPath, { recursive: true })
    writeFileSync(join(appPath, "index.html"), "<!doctype html>")
    writeFileSync(join(dataPath, "app-path.txt"), `${appPath}\n`)
    writeFileSync(join(dataPath, "screenshot.png"), "captured failure")
    writeFileSync(
      join(dataPath, "metadata.json"),
      JSON.stringify({
        app_path: appPath,
        effort: "xhigh",
        harness: "cckimi",
        model: "k3[1m]",
        status: "failed",
      })
    )

    expect(getBenchmarkEntries()).toEqual([
      expect.objectContaining({ task, model: "k3[1m]", status: "failed" }),
    ])
  })

  it("rewrites absolute asset paths embedded in JavaScript bundles", async () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-assets-"))
    process.env.BENCHMARK_ROOT = root
    const task = "landing-page"
    const result = "2026-07-20-codex-test-model"
    const dist = join(root, "benchmarks", task, result, "dist")
    mkdirSync(join(dist, "assets"), { recursive: true })
    mkdirSync(join(dist, "images"), { recursive: true })
    writeFileSync(join(dist, "index.html"), "<!doctype html>")
    writeFileSync(join(dist, "images", "hero.png"), "image")
    writeFileSync(
      join(dist, "assets", "index.js"),
      'const escaped=value.replace(/"/g,"&quot;"); const image="/images/hero.png"; const route="#/inbox"; const thread=`/t/${id}`; const remote="https://example.com/a.png";'
    )

    const asset = getBenchmarkAsset(`${task}/${result}/assets/index.js`)

    expect(asset).not.toBeNull()
    expect(asset?.body).toBe(
      `const escaped=value.replace(/"/g,"&quot;"); const image="/view/${task}/${result}/images/hero.png"; const route="#/inbox"; const thread=\`/t/\${id}\`; const remote="https://example.com/a.png";`
    )
  })

  it("rewrites asset directory prefixes used for runtime concatenation", async () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-assets-"))
    process.env.BENCHMARK_ROOT = root
    const task = "saveit-now-landing"
    const result = "2026-09-05-codex-gpt-6-astra"
    const dist = join(root, "benchmarks", task, result, "dist")
    mkdirSync(join(dist, "assets"), { recursive: true })
    mkdirSync(join(dist, "images", "landing-v2"), { recursive: true })
    writeFileSync(join(dist, "index.html"), "<!doctype html>")
    writeFileSync(join(dist, "images", "landing-v2", "hero.png"), "image")
    writeFileSync(
      join(dist, "assets", "index.js"),
      'const imagePath="/images/landing-v2/"; const src=`${imagePath}hero.png`; const inbox="#/inbox";'
    )

    const asset = getBenchmarkAsset(`${task}/${result}/assets/index.js`)

    expect(asset?.body).toBe(
      `const imagePath="/view/${task}/${result}/images/landing-v2/"; const src=\`\${imagePath}hero.png\`; const inbox="#/inbox";`
    )
  })

  it("versions viewer scripts and styles to invalidate stale browser caches", async () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-assets-"))
    process.env.BENCHMARK_ROOT = root
    const task = "gmail-clone"
    const result = "2026-08-13-cursor-agent-cursor-grok-4-6-high"
    const dist = join(root, "benchmarks", task, result, "dist")
    mkdirSync(join(dist, "assets"), { recursive: true })
    writeFileSync(
      join(dist, "index.html"),
      '<!doctype html><head><script type="module" src="/assets/index.js"></script><link rel="stylesheet" href="/assets/index.css"></head>'
    )

    const asset = getBenchmarkAsset(`${task}/${result}/`)

    expect(asset).not.toBeNull()
    expect(String(asset?.body)).toMatch(
      new RegExp(
        `/view/${task}/${result}/assets/index\\.js\\?viewer=\\d+(?:\\.\\d+)?`
      )
    )
    expect(String(asset?.body)).toMatch(
      new RegExp(
        `/view/${task}/${result}/assets/index\\.css\\?viewer=\\d+(?:\\.\\d+)?`
      )
    )
  })
})
