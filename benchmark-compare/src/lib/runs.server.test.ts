import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import trash from "trash"
import { afterEach, describe, expect, it } from "vitest"

import { getRunGroup, getRunThumbnail, listRunGroups } from "./runs.server"

const BENCHMARK_ID = "benchmark-20260725T100316Z-0233e979"

function writeTask(
  root: string,
  runId: string,
  task: string,
  { thumbnail }: { thumbnail: boolean }
) {
  const dataPath = join(root, "runs", runId, "data", task)
  mkdirSync(dataPath, { recursive: true })
  writeFileSync(join(dataPath, "transcript.jsonl"), "{}\n")
  writeFileSync(
    join(dataPath, "metadata.json"),
    JSON.stringify({
      benchmark_id: BENCHMARK_ID,
      effort: "high",
      harness: "cc",
      model: "claude-opus-5",
      model_timing: {
        started_at: "2026-07-25T10:03:16Z",
        duration_ms: 60_000,
      },
    })
  )
  if (thumbnail) writeFileSync(join(dataPath, "thumbnail.webp"), "RIFF-webp")
}

describe("run thumbnails", () => {
  const previousRoot = process.env.BENCHMARK_ROOT
  let root = ""

  afterEach(async () => {
    if (root && existsSync(root)) await trash(root)
    root = ""
    if (previousRoot === undefined) delete process.env.BENCHMARK_ROOT
    else process.env.BENCHMARK_ROOT = previousRoot
  })

  it("exposes a thumbnail URL only for captured tasks", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-thumbs-"))
    process.env.BENCHMARK_ROOT = root
    writeTask(root, "20260725T100320Z-cc", "car-crash", { thumbnail: true })
    writeTask(root, "20260725T100320Z-cc-2", "gmail-clone", { thumbnail: false })

    const tasks = getRunGroup(BENCHMARK_ID)?.tasks ?? []
    expect(tasks.map((task) => task.thumbnail)).toEqual([
      "/api/run-thumb/20260725T100320Z-cc/car-crash",
      null,
    ])
  })

  it("covers a group with one preview per distinct task", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-thumbs-"))
    process.env.BENCHMARK_ROOT = root
    // The same task run at two efforts must contribute a single cover.
    writeTask(root, "20260725T100320Z-cc", "car-crash", { thumbnail: true })
    writeTask(root, "20260725T100320Z-cc-2", "car-crash", { thumbnail: true })
    writeTask(root, "20260725T100320Z-cc-3", "gmail-clone", { thumbnail: true })

    const [group] = listRunGroups()
    expect(group.covers).toEqual([
      {
        task: "car-crash",
        thumbnail: "/api/run-thumb/20260725T100320Z-cc/car-crash",
      },
      {
        task: "gmail-clone",
        thumbnail: "/api/run-thumb/20260725T100320Z-cc-3/gmail-clone",
      },
    ])
  })

  it("reads a thumbnail and refuses a path that escapes the runs directory", async () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-thumbs-"))
    process.env.BENCHMARK_ROOT = root
    writeTask(root, "20260725T100320Z-cc", "car-crash", { thumbnail: true })
    writeFileSync(join(root, "thumbnail.webp"), "secret")

    const found = getRunThumbnail("20260725T100320Z-cc", "car-crash")
    expect(await found?.read().text()).toBe("RIFF-webp")
    expect(found?.etag).toMatch(/^"[0-9a-z]+-[0-9a-z]+"$/)
    expect(getRunThumbnail("..", "..")).toBeNull()
    expect(getRunThumbnail("20260725T100320Z-cc", "../../..")).toBeNull()
  })
})
