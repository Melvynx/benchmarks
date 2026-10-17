import { describe, expect, it } from "vitest"

import { buildBenchmarkGroups } from "./benchmark-groups"
import type { BenchmarkEntry } from "./benchmarks.server"

function entry(id: string, benchmarkId: string, model: string): BenchmarkEntry {
  const [task, result] = id.split("/")
  return {
    id, task, result, date: "2026-10-13", model, harness: "cursor-agent", effort: "high",
    status: "harness-verified", durationMs: 1_000, benchmarkId, runId: benchmarkId,
    appPath: `benchmarks/${id}`, hasPreview: true, hasTranscript: true, promptSlug: null,
    promptVersion: null, promptUrl: null, source: "build", url: `/view/${id}/`, costUsd: 1,
    startedAt: "2026-10-13T00:00:00.000Z", thumbnail: null,
  }
}

describe("buildBenchmarkGroups", () => {
  it("keeps an app in its recorded run and in every comparison that lists it", () => {
    const opus = entry("car-crash/opus", "run-a", "claude-opus-5-5")
    const gemini = entry("car-crash/gemini", "run-b", "gemini-4-argon")
    const groups = buildBenchmarkGroups([opus, gemini], [
      { id: "cmp-1", title: "Opus vs Gemini", createdAt: "2026-10-15T00:00:00.000Z", apps: [opus.id, gemini.id] },
      { id: "cmp-2", title: "Opus only", createdAt: "2026-10-14T00:00:00.000Z", apps: [opus.id, "missing/app"] },
    ])
    const byId = new Map(groups.map((group) => [group.id, group]))

    expect(byId.get("run-a")?.entries.map((item) => item.id)).toEqual([opus.id])
    expect(byId.get("cmp-1")?.lanes).toHaveLength(2)
    expect(byId.get("cmp-1")?.comparison).toBe(true)
    expect(byId.get("cmp-1")?.title).toBe("Opus vs Gemini")
    expect(byId.get("cmp-2")?.entries.map((item) => item.id)).toEqual([opus.id])
    expect(groups[0].id).toBe("cmp-1")
  })
})
