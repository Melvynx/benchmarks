import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import trash from "trash"
import { afterEach, describe, expect, it } from "vitest"

import { getBenchmarkEntries } from "./benchmarks.server"

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
})
