import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import trash from "trash"
import { afterEach, describe, expect, it } from "vitest"

import { getPromptCatalog, getPromptVersion } from "./prompts.server"

describe("prompt catalog", () => {
  const previousRoot = process.env.BENCHMARK_ROOT
  let root = ""

  afterEach(async () => {
    if (root && existsSync(root)) await trash(root)
    root = ""
    if (previousRoot === undefined) delete process.env.BENCHMARK_ROOT
    else process.env.BENCHMARK_ROOT = previousRoot
  })

  it("sorts numeric versions and links matching benchmark results", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-prompts-"))
    process.env.BENCHMARK_ROOT = root
    const promptDirectory = join(root, "prompts", "earthquake-explorer")
    const appDirectory = join(
      root,
      "earthquake-explorer",
      "2026-07-14-codex-gpt-5-6-terra"
    )
    const evidenceDirectory = join(
      root,
      "runs",
      "20260714T120000Z-gpt-5-6-terra-codex",
      "data",
      "earthquake-explorer"
    )
    mkdirSync(promptDirectory, { recursive: true })
    mkdirSync(appDirectory, { recursive: true })
    mkdirSync(evidenceDirectory, { recursive: true })
    writeFileSync(join(promptDirectory, "v10.md"), "Version ten\n")
    writeFileSync(join(promptDirectory, "v2.md"), "Version two\n")
    writeFileSync(join(appDirectory, "index.html"), "<!doctype html>")
    writeFileSync(join(evidenceDirectory, "app-path.txt"), `${appDirectory}\n`)
    writeFileSync(
      join(evidenceDirectory, "metadata.json"),
      JSON.stringify({
        benchmark_id: "benchmark-20260714T120000Z-1234abcd",
        effort: "medium",
        harness: "codex",
        model: "gpt-5.6-terra",
        prompt_source: join(promptDirectory, "v10.md"),
      })
    )

    expect(getPromptCatalog()[0]).toMatchObject({
      slug: "earthquake-explorer",
      latestVersion: "v10",
      versions: [{ version: "v2" }, { version: "v10" }],
    })
    expect(getPromptVersion("earthquake-explorer", "v10")).toMatchObject({
      content: "Version ten\n",
      repositoryPath: "prompts/earthquake-explorer/v10.md",
      results: [
        expect.objectContaining({
          model: "gpt-5.6-terra",
          promptUrl: "/prompts/earthquake-explorer/v10",
        }),
      ],
    })
  })

  it("rejects invalid prompt paths", () => {
    root = mkdtempSync(join(tmpdir(), "benchmark-prompts-"))
    process.env.BENCHMARK_ROOT = root

    expect(getPromptVersion("../runs", "v1")).toBeNull()
    expect(getPromptVersion("earthquake-explorer", "latest")).toBeNull()
  })
})
