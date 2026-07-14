import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { getBenchmarkEntries } from "./benchmarks.server"

describe("getBenchmarkEntries", () => {
  const previousRoot = process.env.BENCHMARK_ROOT
  let root = ""

  afterEach(() => {
    if (root && existsSync(root)) execFileSync("/usr/bin/trash", [root])
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
      const appPath = join(root, task, result)
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
      const appPath = join(root, task, result)
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
    const appPath = join(root, task, result)
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
        appPath: `${task}/${result}`,
        benchmarkId: "portable-benchmark",
        hasTranscript: true,
      }),
    ])
  })
})
